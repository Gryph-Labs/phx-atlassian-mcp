# AGENTS.md

## Project Overview

MCP server for Jira, Bitbucket, and Confluence — supports Atlassian Cloud and Data Center / Server. Built with the [Model Context Protocol (MCP) TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk).

## Tech Stack

- **Runtime**: Node.js >= 20.12.0, ESM (`"type": "module"`)
- **Language**: TypeScript 5.7+, strict mode, target ES2022, module Node16
- **MCP SDK**: `@modelcontextprotocol/sdk` ^1.27
- **Validation**: Zod ^3.25
- **Tests**: Vitest ^4.1
- **Build**: `tsc` → `build/`

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run build` | Compile TypeScript to `build/` |
| `npm start` | Start the MCP server on stdio |
| `npm test` | Run integration tests (vitest) |
| `npm run test:watch` | Run tests in watch mode |

## Project Structure

```
src/
├── index.ts              # Entry point (stdio) — creates McpServer, connects StdioServerTransport
├── http-server.ts        # Entry point (HTTP) — Streamable HTTP transport for remote hosting
├── config.ts             # Env var loading, cloud detection, auth resolution
├── http-client.ts         # AtlassianClient + IAtlassianClient interface — typed fetch wrapper per service
├── session-client.ts      # SessionClient — AsyncLocalStorage proxy for per-session Atlassian clients
├── types/
│   ├── jira.ts           # Jira API response interfaces
│   ├── bitbucket.ts      # Bitbucket API response interfaces
│   └── confluence.ts     # Confluence API response interfaces
└── tools/
    ├── jira/
    │   ├── index.ts       # registerJiraTools() — aggregates all Jira tool registrations
    │   ├── search.ts      # atlassian_jira_search
    │   ├── get-issue.ts   # atlassian_jira_get_issue
    │   ├── create-issue.ts
    │   ├── update-issue.ts
    │   ├── transition-issue.ts
    │   ├── add-comment.ts
    │   ├── list-projects.ts
    │   ├── get-confluence-links.ts
    │   └── create-issue-link.ts
    ├── bitbucket/
    │   ├── index.ts       # registerBitbucketTools()
    │   ├── list-repos.ts  # atlassian_bb_list_repos
    │   ├── get-repo.ts
    │   ├── list-branches.ts
    │   ├── list-prs.ts
    │   ├── get-pr.ts
    │   ├── create-pr.ts
    │   ├── add-pr-comment.ts
    │   ├── merge-pr.ts
    │   ├── get-file-content.ts
    │   ├── get-pr-diff.ts
    │   ├── get-pr-comments.ts
    │   ├── resolve-pr-comment.ts
    │   └── add-pr-comment-reaction.ts
    └── confluence/
        ├── index.ts       # registerConfluenceTools()
        ├── get-page.ts    # atlassian_confluence_get_page
        ├── search.ts
        ├── get-page-children.ts
        ├── create-page.ts
        ├── update-page.ts
        ├── update-page-diff.ts
        ├── get-page-comments.ts
        └── add-page-comment.ts
tests/
└── integration/
    ├── setup.ts           # HTTP mock server, stub API, getClient()
    ├── mock-mcp-server.ts # MockMcpServer — mimics McpServer.tool() for testing
    ├── jira.test.ts
    ├── bitbucket.test.ts
    └── confluence.test.ts
```

## Architecture

### Configuration (`src/config.ts`)

- Services are **plug-n-play** — only configured services register tools.
- Cloud detection via hostname: `*.atlassian.net`, `*.jira.com`, `*.atlassian.com` → Basic auth (email:api-token). Everything else → Bearer auth (PAT).
- `ATLASSIAN_BASE_URL` is a shared base; per-service `*_BASE_URL` overrides take precedence.
- Confluence Cloud auto-appends `/wiki` if missing.

### HTTP Client (`src/http-client.ts`)

- `IAtlassianClient` — interface defining the client contract (used by tool registrations)
- `AtlassianClient` implements `IAtlassianClient` — wraps `fetch` with per-service methods:
  - `.jira<T>(method, path, body?)` — Cloud uses `/rest/api/3`, Server/DC uses `/rest/api/2`
  - `.confluence<T>(method, path, body?)` — Always `/rest/api`
  - `.bitbucket<T>(method, path, body?)` — Always `/rest/api/1.0`
  - `.bitbucketRaw(method, path)` — Returns raw text (no JSON parse)
  - `.bitbucketCommentLikes<T>(method, path, body?)` — Uses `/rest/comment-likes/latest`
- Auth header derived from `AuthConfig` (Basic or Bearer).
- HTTP errors throw with `HTTP {status}: {body}` message; tool handlers catch and return `isError: true`.

### Session Client (`src/session-client.ts`)

- `sessionClient` — singleton implementing `IAtlassianClient` that proxies calls via `AsyncLocalStorage`.
- For **stdio** (single-user): `setDefaultClient()` sets the static client; `sessionClient` delegates to it.
- For **HTTP** (multi-user): `enterWith(client)` sets the per-session client before `transport.handleRequest()`. Each tool call resolves to the correct user's AtlassianClient.
- Tool handlers use `sessionClient` directly — no code changes needed to switch between single-user and multi-user modes.

### API Version Mapping

| Service | Cloud | Server / DC |
|---------|-------|-------------|
| Jira | `/rest/api/3` | `/rest/api/2` |
| Confluence | `/rest/api` | `/rest/api` |
| Bitbucket | Not supported | `/rest/api/1.0` |

### Tool Pattern

Every tool follows the same pattern:

```typescript
export function registerXxx(server: McpServer, client: IAtlassianClient) {
  server.tool(
    "atlassian_xxx",           // tool name — prefixed with atlassian_{service}_
    "Description of the tool",  // description
    {
      // Zod schema for parameters — every param must have .describe()
      param: z.string().describe("What this param is"),
    },
    async ({ param }) => {
      try {
        const data = await client.jira<SomeType>("GET", `/path?param=${param}`);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,  // LLM can self-correct on errors
        };
      }
    }
  );
}
```

Key conventions:
- Tool names: `atlassian_{service}_{action}` (e.g. `atlassian_jira_search`, `atlassian_bb_list_pull_requests`, `atlassian_confluence_get_page`)
- All params use `.describe()` for LLM-friendly descriptions
- Error responses always set `isError: true`
- Content type is always `"text" as const`
- Response is `JSON.stringify(data, null, 2)` for readability

### Atlassian API References

- **Jira Cloud REST API v3**: https://developer.atlassian.com/cloud/jira/platform/rest/v3/
- **Jira Server/DC REST API**: https://developer.atlassian.com/server/jira/platform/rest-apis/
- **Confluence Cloud REST API v2**: https://developer.atlassian.com/cloud/confluence/rest/v2/
- **Confluence Server/DC REST API**: https://developer.atlassian.com/server/confluence/rest-api/
- **Bitbucket Server/DC REST API**: https://developer.atlassian.com/server/bitbucket/rest-apis/

## Adding a New Tool

1. **Add types** (if needed): Define response interfaces in `src/types/{service}.ts`.

2. **Create the tool file** in `src/tools/{service}/{action}.ts`:
   - Import `McpServer`, `z`, `IAtlassianClient`, and relevant types
   - Export a `registerXxx(server, client)` function
   - Follow the tool pattern above (zod schema with `.describe()`, try/catch with `isError: true`)

3. **Register in the service index**: Import and call the registration function in `src/tools/{service}/index.ts`.

4. **Add tests** in `tests/integration/{service}.test.ts`:
   - Use `stubRequest(method, urlPath, responseBody, status)` to mock API responses
   - Use `getClient()` to get a configured client
   - Create a `MockMcpServer`, call `registerXxx(mockServer, client)`, then `mockServer.callTool(name, args)`
   - Assert on the response content and `isError`

5. **Build and test**: `npm run build; if ($?) { npm test }`

## Testing

- Tests use a built-in Node.js HTTP mock server (no Docker or real Atlassian instances).
- The mock server runs on a random port and accepts stub registrations via `POST /__admin/mappings`.
- `stubRequest(method, urlPath, body, status)` registers a stub that returns `body` for matching requests.
- `MockMcpServer` mimics `McpServer.tool()` so tools can be tested without running a real MCP server.
- Use `beforeEach(() => resetStubs())` to clear stubs between tests.

## Self-Agent Note

When you make changes to this codebase (new code or modifications to existing code), update this `AGENTS.md` file if your changes affect the architecture, patterns, or conventions documented here. Keep it accurate as a reference for future agents and contributors.

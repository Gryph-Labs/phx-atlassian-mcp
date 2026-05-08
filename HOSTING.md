# Hosting the MCP Server Remotely

By default, the Atlassian MCP server runs on **stdio** for local use (Claude Desktop, VS Code Copilot, etc.). To host it on a remote server for network access, use one of the HTTP-based transports provided by the MCP SDK.

The SDK provides two HTTP transport options:

| Transport | Status | When to use |
|-----------|--------|-------------|
| **Streamable HTTP** | Recommended | New deployments, stateful or stateless sessions |
| **SSE (Server-Sent Events)** | Deprecated | Existing codebases, backward compatibility |

Both are available from `@modelcontextprotocol/sdk/server`.

---

## Streamable HTTP (Recommended)

Streamable HTTP is a modern, unified transport that handles requests via a single HTTP endpoint. It supports both SSE streaming (for long-lived responses) and direct JSON responses.

### Server Implementation

The HTTP server entry point is included at `src/http-server.ts`. It uses Node.js's built-in `http` module with the SDK's `StreamableHTTPServerTransport` — no external web framework required.

Run it with:

```bash
npm run build
node build/http-server.js
```

Or via environment variables:

```bash
HOST=0.0.0.0 PORT=3000 \
JIRA_BASE_URL=https://your-site.atlassian.net \
JIRA_EMAIL=you@co.com JIRA_TOKEN=... \
node build/http-server.js
```
```

### Client Connection

Clients connect to the `/mcp` endpoint:

**Claude Desktop (via `claude_desktop_config.json`):**
```json
{
  "mcpServers": {
    "atlassian": {
      "type": "http",
      "url": "http://your-server:3000/mcp"
    }
  }
}
```

**OpenCode (`opencode.json`):**
```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "atlassian": {
      "type": "http",
      "url": "http://your-server:3000/mcp"
    }
  }
}
```

**VS Code Copilot (`settings.json`):**
```json
{
  "mcp": {
    "servers": {
      "atlassian": {
        "type": "http",
        "url": "http://your-server:3000/mcp"
      }
    }
  }
}
```

### Stateless vs Stateful

- **Stateful** (`sessionIdGenerator` provided): Sessions persist across requests. Clients reconnect to the same session. Good for long-running interactions.
- **Stateless** (`sessionIdGenerator: undefined`): Each request is independent. Simpler to deploy, no in-memory state. New in MCP Streamable HTTP spec.

For multi-process deployments (PM2 cluster, load-balanced), use **stateless** mode.

---

## SSE Transport (Legacy)

SSE transport uses two endpoints — a **GET** for the SSE stream and a **POST** for client requests. It is deprecated in favor of Streamable HTTP but still works.

```typescript
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

const app = express();
// ... server setup ...

const transports = new Map<string, SSEServerTransport>();

app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  transports.set(transport.sessionId, transport);
  await server.connect(transport);
  res.on("close", () => transports.delete(transport.sessionId));
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).json({ error: "Unknown session" });
  }
});
```

---

## Multi-User Hosting

By default, the server uses credentials from environment variables — one set of tokens for all users. The HTTP server also supports **per-session credentials** so each client can supply their own Atlassian email + API token while sharing the same server URL.

### How It Works

The server uses [Node.js `AsyncLocalStorage`](https://nodejs.org/api/async_hooks.html#class-asynclocalstorage) to associate each MCP session with its own `AtlassianClient`:

1. **Client connects** (GET `/mcp`) and sends credentials as HTTP headers
2. **Server stores** credentials by session ID when the transport initializes the session
3. **Tool calls** (POST `/mcp`) resolve the per-session AtlassianClient via AsyncLocalStorage — no changes to tool handler code needed

```
┌─────────────┐       GET /mcp + headers        ┌──────────────────┐
│  AI Client  │ ──────────────────────────────────▶│  MCP HTTP Server │
│  (OpenCode, │                                    │  (Node.js)       │
│   Claude)   │◀── Mcp-Session-Id: abc123 ────────│                  │
│             │                                    │  sessionClients  │
│             │       POST /mcp                    │  abc123 → client │
│             │  Mcp-Session-Id: abc123            │                  │
│             │  → tool call resolved with         │                  │
│             │    user's AtlassianClient          │                  │
└─────────────┘                                    └──────────────────┘
```

### Client Headers

Clients send their Atlassian credentials as HTTP headers on the initial connection. The `http-server.ts` reads these headers and creates a per-session AtlassianClient:

| Header | Description |
|--------|-------------|
| `X-Atlassian-Email` | Atlassian account email (required) |
| `X-Atlassian-Token` | Atlassian API token (required) |
| `X-Atlassian-Jira-Url` | Jira instance URL (e.g. `https://your-site.atlassian.net`) |
| `X-Atlassian-Confluence-Url` | Confluence instance URL |
| `X-Atlassian-Bitbucket-Url` | Bitbucket instance URL |

Example request:

```http
GET /mcp HTTP/1.1
X-Atlassian-Email: user@company.com
X-Atlassian-Token: ATATT3xFfGF0...
X-Atlassian-Jira-Url: https://myteam.atlassian.net
X-Atlassian-Confluence-Url: https://myteam.atlassian.net/wiki
```

The server builds a per-session `AtlassianClient` from these headers. Subsequent tool calls for that session use the stored client.

### Client Configuration

Most MCP clients support custom headers via their configuration. Here are examples for common clients:

**OpenCode (`opencode.json`):**
```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "atlassian": {
      "type": "http",
      "url": "https://mcp.example.com/mcp",
      "headers": {
        "X-Atlassian-Email": "you@company.com",
        "X-Atlassian-Token": "your-api-token",
        "X-Atlassian-Jira-Url": "https://your-site.atlassian.net",
        "X-Atlassian-Confluence-Url": "https://your-site.atlassian.net/wiki"
      }
    }
  }
}
```

**VS Code Copilot (`settings.json`):**
```json
{
  "mcp": {
    "servers": {
      "atlassian": {
        "type": "http",
        "url": "https://mcp.example.com/mcp",
        "headers": {
          "X-Atlassian-Email": "you@company.com",
          "X-Atlassian-Token": "your-api-token",
          "X-Atlassian-Jira-Url": "https://your-site.atlassian.net"
        }
      }
    }
  }
}
```

For clients that **do not support custom headers**, run the server in single-user mode (env vars) or use a local stdio instance.

### Server-Side Fallback

If the server has `JIRA_BASE_URL`, `JIRA_TOKEN`, etc. set via environment variables at startup, it creates a **default AtlassianClient** used as a fallback for sessions that do not supply their own credentials. This supports a hybrid model:

- **Single-user**: Only use env vars (no client headers needed)
- **Multi-user**: Only use client headers (no env vars needed)  
- **Hybrid**: Server has a shared account, but some clients bring their own

### Production Notes for Multi-User

- **In-memory only**: Session → client mappings are stored in a `Map` and lost on restart. Clients must reconnect and re-send headers.
- **No authentication on headers**: The custom header approach trusts the client. For production, use a reverse proxy (nginx/Caddy) with TLS and API key validation on the `/mcp` endpoint.
- **Stateless mode**: Multi-user works best with stateful sessions (`sessionIdGenerator: () => crypto.randomUUID()`). Stateless mode requires credentials on every request and may need additional implementation.
- **Concurrent sessions**: The `pendingCreds` pattern in `http-server.ts` is designed for low concurrency. For high-traffic deployments, consider replacing it with a request-scoped store or extracting the session ID from the transport's response via a middleware wrapper.

---

## Production Considerations

### Authentication & TLS

Streamable HTTP servers should run behind a **reverse proxy** (nginx, Caddy) that handles TLS termination.

- **Bind to `127.0.0.1`** (default) and use a reverse proxy to expose externally
- **Add authentication** — the Streamable HTTP transport supports OAuth via the SDK's auth middleware. See the [MCP Authorization docs](https://modelcontextprotocol.io/specification/draft/server/auth).
- **Set `HOST=0.0.0.0`** only if binding directly (not behind a proxy)

### Docker

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/package*.json ./
COPY --from=build /app/build/ ./build/
RUN npm ci --omit=dev
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000
CMD ["node", "build/http-server.js"]
```

Run with:
```bash
docker build -t atlassian-mcp .
docker run -p 3000:3000 \
  -e JIRA_BASE_URL=https://your-site.atlassian.net \
  -e JIRA_EMAIL=you@company.com \
  -e JIRA_TOKEN=your-token \
  atlassian-mcp
```

### Process Manager (PM2)

```bash
pm2 start build/http-server.js --name atlassian-mcp
```

### Health Check

`/health` returns a JSON status endpoint (built into `http-server.ts`):

---

## Client Compatibility

| Client | Streamable HTTP | SSE |
|--------|:---:|:---:|
| Claude Desktop | ✅ (type: "http") | ❌ |
| VS Code Copilot | ✅ (type: "http") | ❌ |
| OpenCode | ✅ (type: "http") | ❌ |
| Cursor | ✅ (type: "http") | ❌ |
| Zed | ✅ (type: "http") | ❌ |

Most modern MCP clients support Streamable HTTP. SSE support is being phased out across the ecosystem.

---

## Port Mapping Reference

| Transport | Scheme | Default path |
|-----------|--------|-------------|
| Stdio (local) | n/a | n/a |
| Streamable HTTP | `http`/`https` | `/mcp` |
| SSE (legacy) | `http`/`https` | GET `/sse`, POST `/messages` |

---

## References

- [MCP Transport Specification](https://modelcontextprotocol.io/specification/draft/server/transports)
- [MCP TypeScript SDK - Streamable HTTP](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Server Auth (OAuth)](https://modelcontextprotocol.io/specification/draft/server/auth)

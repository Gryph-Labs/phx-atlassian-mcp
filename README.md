# phx-atlassian-mcp

A constrained Atlassian MCP adapter for JetBrains AI assistants.

This repository is a fork of `xleepy/atlassian-mcp`, reduced for a narrow developer-assistant use case: let an AI assistant read Jira and Confluence context while allowing only tightly controlled Jira workflow transitions.

## Security model

The server exposes a deliberately small tool surface.

### Jira

Allowed read operations:

- Search issues with JQL
- Read an issue
- List projects
- Read Confluence links attached to an issue

Allowed write operation:

- Move an issue only to one of these statuses:
  - `Backlog`
  - `To Do`
  - `In Progress`
  - `Ready for Review`

The generic upstream Jira transition tool is not registered.

The server rejects every other target status, including `Done`, `Closed`, `Cancelled`, and `Rejected`.

Jira writes are also project-scoped. By default only `PHX` issues may be moved. Override the allowlist with:

```text
JIRA_ALLOWED_PROJECTS=PHX,LAB
```

### Confluence

Confluence is read-only. Exposed operations are limited to:

- Search
- Read page
- Read page children
- Read page comments

No Confluence create, update, or comment tool is registered.

### Bitbucket

Bitbucket is intentionally not exposed by this fork.

## Why the restriction is server-side

The permission boundary is implemented in code rather than relying on model instructions. Even if an AI assistant requests an unauthorized transition, the MCP server refuses it before sending a write request to Jira.

The workflow tool also verifies that Jira actually offers the requested transition from the current state and re-reads the issue after the transition to verify the resulting status.

## Configuration

This fork runs over stdio for local MCP clients such as JetBrains AI Assistant.

Typical Jira Cloud configuration:

```text
JIRA_BASE_URL=https://your-site.atlassian.net
JIRA_EMAIL=you@example.com
JIRA_TOKEN=your-api-token
JIRA_ALLOWED_PROJECTS=PHX
```

Typical Confluence Cloud configuration:

```text
CONFLUENCE_BASE_URL=https://your-site.atlassian.net
CONFLUENCE_EMAIL=you@example.com
CONFLUENCE_TOKEN=your-api-token
```

You may configure Jira, Confluence, or both.

## Development

```text
npm ci
npm run build
npm test
```

CI runs the build and test suite for pull requests and pushes to `main`.

## Upstream and license

This project is derived from `xleepy/atlassian-mcp` and preserves the upstream license and Git history. See `LICENSE` for terms.

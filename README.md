# Atlassian MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that connects AI assistants to **Jira**, **Confluence**, and **Bitbucket** — supporting both **Atlassian Cloud** and self-hosted **Data Center / Server**.

It uses a **plug-n-play** model: configure only the services you use, and the corresponding tools register automatically. Cloud instances are auto-detected from the base URL.

---

## Features

| Service | Cloud | Server / DC | Tools |
|---------|:-----:|:-----------:|-------|
| **Jira** | ✅ | ✅ | Search issues (JQL), create/update/transition issues, add comments, list projects, link issues, get Confluence page links |
| **Confluence** | ✅ | ✅ | Search pages (CQL), get page content & children, create/update pages, diff-based updates |
| **Bitbucket** | ❌ | ✅ | List repos/branches/PRs, get PR diffs/comments, create/merge PRs, resolve comment threads, add reactions |

> **Bitbucket Cloud** (bitbucket.org) uses a completely different REST API from Bitbucket Server/DC and is not yet supported.

---

## Requirements

- Node.js 20+
- At least one of: Jira, Bitbucket, or Confluence
- **Cloud**: email + API token ([generate one here](https://id.atlassian.com/manage-profile/security/api-tokens))
- **Server / DC**: Personal Access Token (PAT) with Bearer auth

---

## Installation

```bash
git clone https://github.com/your-org/atlassian-mcp-server.git
cd atlassian-mcp-server
npm install
npm run build
```

---

## Configuration

Set environment variables for **only the services you use**. Cloud instances are auto-detected from `*.atlassian.net` URLs — when detected, you must also provide the corresponding `*_EMAIL` variable.

### Option A: Atlassian Cloud

```bash
export JIRA_BASE_URL="https://your-site.atlassian.net"
export CONFLUENCE_BASE_URL="https://your-site.atlassian.net/wiki"

export JIRA_EMAIL="you@company.com"
export CONFLUENCE_EMAIL="you@company.com"

export JIRA_TOKEN="your-jira-api-token"
export CONFLUENCE_TOKEN="your-confluence-api-token"
```

Cloud detection rules:
- URLs on `*.atlassian.net`, `*.atlassian.com`, or `*.jira.com` are treated as Cloud
- Cloud uses **Basic auth** (`email:api-token`) instead of Bearer tokens
- Jira Cloud uses REST API v3; Confluence Cloud auto-appends `/wiki` if missing
- `JIRA_EMAIL` / `CONFLUENCE_EMAIL` are **required** for Cloud — the server will error without them

### Option B: Per-app base URLs (Data Center / Server)

```bash
export JIRA_BASE_URL="https://jira.mycompany.com/jira"
export BITBUCKET_BASE_URL="https://git.mycompany.com/bitbucket"
export CONFLUENCE_BASE_URL="https://wiki.mycompany.com/confluence"

export JIRA_TOKEN="your-jira-pat"
export BITBUCKET_TOKEN="your-bitbucket-pat"
export CONFLUENCE_TOKEN="your-confluence-pat"
```

### Option C: Shared hostname (legacy style)

If all apps live under one hostname:

```bash
export ATLASSIAN_BASE_URL="https://atlas.mycompany.com"

export JIRA_TOKEN="your-jira-pat"
export BITBUCKET_TOKEN="your-bitbucket-pat"
export CONFLUENCE_TOKEN="your-confluence-pat"
```

This derives:
- Jira → `https://atlas.mycompany.com/jira/rest/api/2`
- Bitbucket → `https://atlas.mycompany.com/bitbucket/rest/api/1.0`
- Confluence → `https://atlas.mycompany.com/confluence/rest/api`

### Plug-n-Play Examples

**Jira Cloud only:**
```bash
JIRA_BASE_URL=https://myteam.atlassian.net JIRA_EMAIL=me@co.com JIRA_TOKEN=... npm start
```

**Jira Cloud + Confluence Cloud:**
```bash
JIRA_BASE_URL=https://myteam.atlassian.net \
CONFLUENCE_BASE_URL=https://myteam.atlassian.net/wiki \
JIRA_EMAIL=me@co.com CONFLUENCE_EMAIL=me@co.com \
JIRA_TOKEN=... CONFLUENCE_TOKEN=... npm start
```

**Jira Server + Confluence Cloud (mixed):**
```bash
JIRA_BASE_URL=https://jira.mycompany.com/jira JIRA_TOKEN=... \
CONFLUENCE_BASE_URL=https://myteam.atlassian.net/wiki \
CONFLUENCE_EMAIL=me@co.com CONFLUENCE_TOKEN=... npm start
```

**All three (Server/DC):**
```bash
# Set all six env vars
npm start
```

---

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

**Cloud:**
```json
{
  "mcpServers": {
    "atlassian": {
      "command": "node",
      "args": ["/absolute/path/to/atlassian-mcp-server/build/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://your-site.atlassian.net",
        "CONFLUENCE_BASE_URL": "https://your-site.atlassian.net/wiki",
        "JIRA_EMAIL": "you@company.com",
        "CONFLUENCE_EMAIL": "you@company.com",
        "JIRA_TOKEN": "your-jira-api-token",
        "CONFLUENCE_TOKEN": "your-confluence-api-token"
      }
    }
  }
}
```

**Server / DC:**
```json
{
  "mcpServers": {
    "atlassian": {
      "command": "node",
      "args": ["/absolute/path/to/atlassian-mcp-server/build/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://jira.mycompany.com/jira",
        "CONFLUENCE_BASE_URL": "https://wiki.mycompany.com/confluence",
        "JIRA_TOKEN": "your-jira-pat",
        "CONFLUENCE_TOKEN": "your-confluence-pat"
      }
    }
  }
}
```

---

## Usage with VS Code Copilot

Add to your workspace or user `settings.json` under the `mcp` key (VS Code 1.99+):

**Cloud:**
```json
{
  "mcp": {
    "servers": {
      "atlassian": {
        "type": "stdio",
        "command": "node",
        "args": ["/absolute/path/to/atlassian-mcp-server/build/index.js"],
        "env": {
          "JIRA_BASE_URL": "https://your-site.atlassian.net",
          "CONFLUENCE_BASE_URL": "https://your-site.atlassian.net/wiki",
          "JIRA_EMAIL": "you@company.com",
          "CONFLUENCE_EMAIL": "you@company.com",
          "JIRA_TOKEN": "your-jira-api-token",
          "CONFLUENCE_TOKEN": "your-confluence-api-token"
        }
      }
    }
  }
}
```

**Server / DC:**
```json
{
  "mcp": {
    "servers": {
      "atlassian": {
        "type": "stdio",
        "command": "node",
        "args": ["/absolute/path/to/atlassian-mcp-server/build/index.js"],
        "env": {
          "JIRA_BASE_URL": "https://jira.mycompany.com/jira",
          "CONFLUENCE_BASE_URL": "https://wiki.mycompany.com/confluence",
          "JIRA_TOKEN": "your-jira-pat",
          "CONFLUENCE_TOKEN": "your-confluence-pat"
        }
      }
    }
  }
}
```

> Restart VS Code or reload the window after saving. Copilot will detect the server and expose its tools in agent mode.

---

## Usage with Zed

Add to your `~/.config/zed/settings.json` or project `.zed/settings.json`:

**Cloud:**
```json
{
  "context_servers": {
    "atlassian": {
      "command": {
        "path": "node",
        "args": ["/absolute/path/to/atlassian-mcp-server/build/index.js"],
        "env": {
          "JIRA_BASE_URL": "https://your-site.atlassian.net",
          "CONFLUENCE_BASE_URL": "https://your-site.atlassian.net/wiki",
          "JIRA_EMAIL": "you@company.com",
          "CONFLUENCE_EMAIL": "you@company.com",
          "JIRA_TOKEN": "your-jira-api-token",
          "CONFLUENCE_TOKEN": "your-confluence-api-token"
        }
      }
    }
  }
}
```

**Server / DC:**
```json
{
  "context_servers": {
    "atlassian": {
      "command": {
        "path": "node",
        "args": ["/absolute/path/to/atlassian-mcp-server/build/index.js"],
        "env": {
          "JIRA_BASE_URL": "https://jira.mycompany.com/jira",
          "CONFLUENCE_BASE_URL": "https://wiki.mycompany.com/confluence",
          "JIRA_TOKEN": "your-jira-pat",
          "CONFLUENCE_TOKEN": "your-confluence-pat"
        }
      }
    }
  }
}
```

> Restart Zed after updating settings.

---

## Usage with OpenCode

Add to your `opencode.json` config:

**Cloud:**
```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "atlassian": {
      "type": "local",
      "command": ["node", "/absolute/path/to/atlassian-mcp-server/build/index.js"],
      "environment": {
        "JIRA_BASE_URL": "https://your-site.atlassian.net",
        "CONFLUENCE_BASE_URL": "https://your-site.atlassian.net/wiki",
        "JIRA_EMAIL": "you@company.com",
        "CONFLUENCE_EMAIL": "you@company.com",
        "JIRA_TOKEN": "your-jira-api-token",
        "CONFLUENCE_TOKEN": "your-confluence-api-token"
      }
    }
  }
}
```

**Server / DC:**
```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "atlassian": {
      "type": "local",
      "command": ["node", "/absolute/path/to/atlassian-mcp-server/build/index.js"],
      "environment": {
        "JIRA_BASE_URL": "https://jira.mycompany.com/jira",
        "CONFLUENCE_BASE_URL": "https://wiki.mycompany.com/confluence",
        "JIRA_TOKEN": "your-jira-pat",
        "CONFLUENCE_TOKEN": "your-confluence-pat"
      }
    }
  }
}
```

> The key is `environment` (not `env`). See [OpenCode MCP docs](https://opencode.ai/docs/mcp-servers/) for all options.

---

## Running

```bash
npm start
```

The server runs on stdio and logs which services are active on stderr:
```
Atlassian MCP server running on stdio [Jira (Cloud), Confluence (Cloud)]
```

---

## Tests

```bash
npm test
```

Tests use a built-in Node.js HTTP mock server — no Docker or real Atlassian instances required.

---

## Notes

- **Atlassian Cloud** is auto-detected from `*.atlassian.net` / `*.atlassian.com` / `*.jira.com` URLs. Cloud requires `*_EMAIL` + `*_TOKEN` (API token) for Basic auth.
- **Bitbucket Cloud** (bitbucket.org) is **not yet supported** — it uses a completely different REST API from Bitbucket Server/DC.
- **Bamboo is not supported** — Atlassian ended Bamboo support in 2026.
- All tool handlers return `isError: true` on HTTP failures so the LLM can self-correct.

---

## License

MIT

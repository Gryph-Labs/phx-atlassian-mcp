#!/usr/bin/env node

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { loadConfig, ServiceConfig } from "./config.js";
import { AtlassianClient, IAtlassianClient } from "./http-client.js";
import { registerJiraTools } from "./tools/jira/index.js";
import { registerBitbucketTools } from "./tools/bitbucket/index.js";
import { registerConfluenceTools } from "./tools/confluence/index.js";
import { enterWith, setDefaultClient, sessionClient } from "./session-client.js";

// Server-side credentials (optional — can be empty if clients supply their own)
const config = loadConfig();
const hasServerCreds = !!(config.jira || config.bitbucket || config.confluence);

// Session → AtlassianClient (for multi-user: populated from client headers)
const sessionClients = new Map<string, AtlassianClient>();

// Temporary storage for credentials from GET requests before session ID is known.
// For concurrent safety in production, use a session-scoped store or JWT tokens.
let pendingCreds: { email: string; token: string; jiraUrl?: string; confluenceUrl?: string; bitbucketUrl?: string } | null = null;

function buildClientFromCreds(creds: {
  email: string; token: string; jiraUrl?: string; confluenceUrl?: string; bitbucketUrl?: string;
}): AtlassianClient {
  const svc = (baseUrl?: string): ServiceConfig | undefined =>
    baseUrl ? { baseUrl: baseUrl.replace(/\/$/, ""), auth: { type: "basic", username: creds.email, token: creds.token }, cloud: true } : undefined;

  return new AtlassianClient({
    jira: svc(creds.jiraUrl),
    bitbucket: svc(creds.bitbucketUrl),
    confluence: svc(creds.confluenceUrl),
  });
}

function extractCreds(headers: Record<string, string | string[] | undefined>) {
  const h = (name: string) => {
    const v = headers[name.toLowerCase()];
    return Array.isArray(v) ? v[0] : v;
  };
  const email = h("x-atlassian-email");
  const token = h("x-atlassian-token");
  if (!email || !token) return null;
  return {
    email,
    token,
    jiraUrl: h("x-atlassian-jira-url") || undefined,
    confluenceUrl: h("x-atlassian-confluence-url") || undefined,
    bitbucketUrl: h("x-atlassian-bitbucket-url") || undefined,
  };
}

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => crypto.randomUUID(),
  onsessioninitialized: (sessionId) => {
    if (pendingCreds) {
      sessionClients.set(sessionId, buildClientFromCreds(pendingCreds));
      pendingCreds = null;
    }
  },
  onsessionclosed: (sessionId) => {
    sessionClients.delete(sessionId);
  },
});

const activeServices: string[] = [];
if (config.jira) activeServices.push(`Jira${config.jira.cloud ? " (Cloud)" : ""}`);
if (config.bitbucket && !config.bitbucket.cloud) activeServices.push("Bitbucket");
if (config.confluence) activeServices.push(`Confluence${config.confluence.cloud ? " (Cloud)" : ""}`);

const server = new McpServer({ name: "atlassian", version: "1.0.0" });

// Register tools with the session-aware proxy. Each request resolves
// to its own AtlassianClient via AsyncLocalStorage.
registerJiraTools(server, sessionClient);
registerBitbucketTools(server, sessionClient);
registerConfluenceTools(server, sessionClient);

await server.connect(transport);

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "127.0.0.1";

// If server-side credentials are configured, make them the default fallback
if (hasServerCreds) {
  setDefaultClient(new AtlassianClient(config));
}

const httpServer = createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", services: activeServices }));
      return;
    }

    if (req.url === "/mcp") {
      const sessionId = (req.headers["mcp-session-id"] as string) || undefined;

      // Resolve the per-session AtlassianClient:
      // 1. If session already has a stored client, use it
      // 2. Otherwise, if client sent credentials on this request, build one now
      // 3. Otherwise, fall back to server-side default (if configured)
      let client: AtlassianClient | undefined;
      if (sessionId) {
        client = sessionClients.get(sessionId);
      }
      if (!client) {
        const creds = extractCreds(req.headers as Record<string, string | string[] | undefined>);
        if (creds) {
          client = buildClientFromCreds(creds);
          if (sessionId) sessionClients.set(sessionId, client);
        }
      }
      if (client) {
        enterWith(client);
      }

      // For initial GET (no session yet), stash credentials for session init hook
      if (!sessionId && req.method === "GET") {
        pendingCreds = extractCreds(req.headers as Record<string, string | string[] | undefined>);
      }

      await transport.handleRequest(req, res);
      return;
    }

    res.writeHead(404);
    res.end("Not Found");
  },
);

httpServer.listen(PORT, HOST, () => {
  console.error(`Atlassian MCP server: http://${HOST}:${PORT}/mcp [${activeServices.join(", ") || "no services"}]`);
  if (!hasServerCreds) {
    console.error("Server-side credentials not configured — clients must supply their own via HTTP headers.");
  }
});

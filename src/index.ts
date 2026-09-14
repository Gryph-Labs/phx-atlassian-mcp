#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { AtlassianClient } from "./http-client.js";
import { registerConfluenceTools } from "./tools/confluence/index.js";
import { registerJiraTools } from "./tools/jira/index.js";

const config = loadConfig();
const client = new AtlassianClient(config);

const server = new McpServer({
  name: "phx-atlassian-mcp",
  version: "1.0.0",
});

const activeServices: string[] = [];

if (config.jira) {
  registerJiraTools(server, client);
  activeServices.push(`Jira${config.jira.cloud ? " (Cloud)" : ""}`);
}

if (config.confluence) {
  registerConfluenceTools(server, client);
  activeServices.push(`Confluence${config.confluence.cloud ? " (Cloud)" : ""}`);
}

if (activeServices.length === 0) {
  console.error(
    "WARNING: No services configured. Set JIRA_BASE_URL and/or CONFLUENCE_BASE_URL with matching credentials.",
  );
}

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(
  `PHX Atlassian MCP running on stdio [${activeServices.join(", ") || "no services"}]`,
);

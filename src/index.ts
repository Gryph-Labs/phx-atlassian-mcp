#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { AtlassianClient, IAtlassianClient } from "./http-client.js";
import { registerJiraTools } from "./tools/jira/index.js";
import { registerBitbucketTools } from "./tools/bitbucket/index.js";
import { registerConfluenceTools } from "./tools/confluence/index.js";

const config = loadConfig();
const client = new AtlassianClient(config);

const server = new McpServer({
  name: "atlassian",
  version: "1.0.0",
});

const activeServices: string[] = [];

if (config.jira) {
  registerJiraTools(server, client);
  activeServices.push(`Jira${config.jira.cloud ? " (Cloud)" : ""}`);
}

if (config.bitbucket) {
  if (config.bitbucket.cloud) {
    console.error("WARNING: Bitbucket Cloud is not yet supported. Skipping Bitbucket. This server works with Bitbucket Data Center / Server only.");
  } else {
    registerBitbucketTools(server, client);
    activeServices.push("Bitbucket");
  }
}

if (config.confluence) {
  registerConfluenceTools(server, client);
  activeServices.push(`Confluence${config.confluence.cloud ? " (Cloud)" : ""}`);
}

if (activeServices.length === 0) {
  console.error("WARNING: No services configured. Set at least one of JIRA_BASE_URL, BITBUCKET_BASE_URL, or CONFLUENCE_BASE_URL (or use ATLASSIAN_BASE_URL).");
}

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`Atlassian MCP server running on stdio [${activeServices.join(", ") || "no services"}]`);

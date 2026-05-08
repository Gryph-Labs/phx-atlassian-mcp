import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { IAtlassianClient } from "../../http-client.js";
import { JiraSearchResponse } from "../../types/jira.js";

export function registerJiraSearch(server: McpServer, client: IAtlassianClient) {
  server.tool(
    "atlassian_jira_search",
    "Search for Jira issues using JQL",
    {
      jql: z.string().describe("JQL query string"),
      maxResults: z.number().optional().describe("Max results to return (default 50)"),
      fields: z.string().optional().describe("Comma-separated list of fields to include (e.g. summary,status,assignee). Defaults to a compact set of essential fields. Use '*' for all fields."),
    },
    async ({ jql, maxResults, fields }) => {
      try {
        const params = new URLSearchParams({ jql });
        if (maxResults !== undefined) params.set("maxResults", String(maxResults));
        params.set("fields", fields ?? "summary,status,assignee,description,issuetype,priority,reporter,created,updated,labels,components,fixVersions");

        const data = await client.jira<JiraSearchResponse>("GET", `/search?${params}`);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    }
  );
}

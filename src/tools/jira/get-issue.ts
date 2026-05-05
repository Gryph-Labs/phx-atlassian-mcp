import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AtlassianClient } from "../../http-client.js";
import { JiraIssue } from "../../types/jira.js";

export function registerJiraGetIssue(server: McpServer, client: AtlassianClient) {
  server.tool(
    "atlassian_jira_get_issue",
    "Get details of a specific Jira issue by key",
    {
      issueKey: z.string().describe("Issue key (e.g. PROJ-123)"),
      fields: z.string().optional().describe("Comma-separated list of fields to include (e.g. summary,status,assignee). Defaults to a compact set of essential fields. Use '*' for all fields."),
      expand: z.string().optional().describe("Comma-separated list of fields to expand"),
    },
    async ({ issueKey, fields, expand }) => {
      try {
        const queryParams = new URLSearchParams();
        if (fields) {
          queryParams.append("fields", fields);
        } else {
          queryParams.append("fields", "summary,status,assignee,description,issuetype,priority,reporter,created,updated,labels,components,fixVersions");
        }
        if (expand) {
          queryParams.append("expand", expand);
        }
        const params = queryParams.toString() ? `?${queryParams.toString()}` : "";
        const data = await client.jira<JiraIssue>("GET", `/issue/${issueKey}${params}`);
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

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { IAtlassianClient } from "../../http-client.js";

export function registerJiraUpdateIssue(server: McpServer, client: IAtlassianClient) {
  server.tool(
    "atlassian_jira_update_issue",
    "Update fields on an existing Jira issue",
    {
      issueKey: z.string().describe("Issue key (e.g. PROJ-123)"),
      fields: z.record(z.string(), z.unknown()).describe("Fields to update as key-value pairs"),
    },
    async ({ issueKey, fields }) => {
      try {
        await client.jira("PUT", `/issue/${issueKey}`, { fields });
        return {
          content: [{ type: "text" as const, text: `Issue ${issueKey} updated successfully.` }],
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

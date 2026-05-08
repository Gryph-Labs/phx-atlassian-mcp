import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { IAtlassianClient } from "../../http-client.js";
import { JiraComment } from "../../types/jira.js";

export function registerJiraAddComment(server: McpServer, client: IAtlassianClient) {
  server.tool(
    "atlassian_jira_add_comment",
    "Add a comment to a Jira issue",
    {
      issueKey: z.string().describe("Issue key (e.g. PROJ-123)"),
      body: z.string().describe("Comment body text"),
    },
    async ({ issueKey, body }) => {
      try {
        const data = await client.jira<JiraComment>("POST", `/issue/${issueKey}/comment`, { body });
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

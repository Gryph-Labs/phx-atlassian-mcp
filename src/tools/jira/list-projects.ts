import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { IAtlassianClient } from "../../http-client.js";
import { JiraProject } from "../../types/jira.js";

export function registerJiraListProjects(server: McpServer, client: IAtlassianClient) {
  server.tool(
    "atlassian_jira_list_projects",
    "List all Jira projects accessible to the authenticated user",
    async () => {
      try {
        const data = await client.jira<JiraProject[]>("GET", "/project");
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

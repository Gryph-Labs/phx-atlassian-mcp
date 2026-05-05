import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AtlassianClient } from "../../http-client.js";

export function registerJiraTransitionIssue(server: McpServer, client: AtlassianClient) {
  server.tool(
    "atlassian_jira_transition_issue",
    "Transition a Jira issue to a new status. Use atlassian_jira_get_issue with expand=transitions to find available transition IDs.",
    {
      issueKey: z.string().describe("Issue key (e.g. PROJ-123)"),
      transitionId: z.string().describe("Transition ID"),
      comment: z.string().optional().describe("Comment to add with the transition"),
    },
    async ({ issueKey, transitionId, comment }) => {
      try {
        const body: Record<string, unknown> = {
          transition: { id: transitionId },
        };
        if (comment) {
          body.update = {
            comment: [{ add: { body: comment } }],
          };
        }

        await client.jira("POST", `/issue/${issueKey}/transitions`, body);
        return {
          content: [{ type: "text" as const, text: `Issue ${issueKey} transitioned successfully.` }],
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

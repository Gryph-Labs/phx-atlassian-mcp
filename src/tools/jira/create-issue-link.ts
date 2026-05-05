import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AtlassianClient } from "../../http-client.js";

export function registerJiraCreateIssueLink(server: McpServer, client: AtlassianClient) {
  server.tool(
    "atlassian_jira_create_issue_link",
    "Create a link between two Jira issues",
    {
      inwardIssueKey: z.string().describe("The issue key of the inward/source issue (e.g. AP-42651)"),
      outwardIssueKey: z.string().describe("The issue key of the outward/target issue (e.g. AP-42187)"),
      linkType: z.string().describe("The link type name (e.g. Relates, Blocks, Is Blocked by)"),
    },
    async ({ inwardIssueKey, outwardIssueKey, linkType }) => {
      try {
        const body = {
          type: { name: linkType },
          inwardIssue: { key: inwardIssueKey },
          outwardIssue: { key: outwardIssueKey },
        };

        await client.jira("POST", "/issueLink", body);
        return {
          content: [
            {
              type: "text" as const,
              text: `Created ${linkType} link from ${inwardIssueKey} to ${outwardIssueKey}.`,
            },
          ],
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

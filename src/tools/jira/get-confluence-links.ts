import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AtlassianClient } from "../../http-client.js";
import { JiraRemoteLink } from "../../types/confluence.js";

export function registerJiraGetConfluenceLinks(
  server: McpServer,
  client: AtlassianClient,
) {
  server.tool(
    "atlassian_jira_get_confluence_links",
    "Get Confluence pages linked to a Jira issue. Returns remote links that point to Confluence pages, with their titles, URLs, and extracted page IDs.",
    {
      issueKey: z.string().describe("Jira issue key (e.g. PROJ-123)"),
    },
    async ({ issueKey }) => {
      try {
        const links = await client.jira<JiraRemoteLink[]>(
          "GET",
          `/issue/${issueKey}/remotelink`,
        );

        const confluenceLinks = links.filter((link) => {
          const url = link.object.url ?? "";
          const appType = link.application?.type ?? "";
          return (
            url.includes("/confluence/") ||
            url.includes("/wiki/") ||
            appType.includes("confluence")
          );
        });

        const result = confluenceLinks.map((link) => {
          const url = link.object.url;
          // Try to extract page ID from the URL (e.g. /pages/viewpage.action?pageId=12345)
          const pageIdMatch = url.match(/pageId=(\d+)/);
          return {
            title: link.object.title,
            url,
            pageId: pageIdMatch?.[1] ?? null,
            relationship: link.relationship ?? null,
          };
        });

        if (result.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No Confluence pages linked to ${issueKey}`,
              },
            ],
          };
        }

        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (e) {
        return {
          content: [
            { type: "text" as const, text: `Error: ${(e as Error).message}` },
          ],
          isError: true,
        };
      }
    },
  );
}

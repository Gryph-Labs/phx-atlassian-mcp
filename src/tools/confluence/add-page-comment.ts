import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { IAtlassianClient } from "../../http-client.js";
import { ConfluenceComment } from "../../types/confluence.js";

export function registerConfluenceAddPageComment(
  server: McpServer,
  client: IAtlassianClient,
) {
  server.tool(
    "atlassian_confluence_add_page_comment",
    "Add a comment to a Confluence page. Supports mentioning users with @accountId in the content (e.g., '@712020:abc123' will be converted to a user mention).",
    {
      pageId: z
        .string()
        .describe("The numeric ID of the Confluence page to comment on"),
      content: z
        .string()
        .describe(
          "The comment content in Confluence storage format (HTML). Use @accountId to mention users."
        ),
    },
    async ({ pageId, content }) => {
      try {
        const processedContent = content.replace(
          /@([0-9a-f:]+)/g,
          '<ac:link><ri:user ri:account-id="$1" /></ac:link>',
        );

        const body = {
          type: "comment",
          container: { id: pageId, type: "page", status: "current" },
          body: {
            storage: {
              value: processedContent,
              representation: "storage",
            },
          },
        };

        const data = await client.confluence<ConfluenceComment>(
          "POST",
          "/content",
          body,
        );
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(data, null, 2) },
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

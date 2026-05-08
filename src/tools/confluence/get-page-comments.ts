import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { IAtlassianClient } from "../../http-client.js";
import { ConfluenceCommentsResponse } from "../../types/confluence.js";

export function registerConfluenceGetPageComments(
  server: McpServer,
  client: IAtlassianClient,
) {
  server.tool(
    "atlassian_confluence_get_page_comments",
    "Get comments on a Confluence page, including inline comments and mentions",
    {
      pageId: z
        .string()
        .describe("The numeric ID of the Confluence page"),
      expand: z
        .string()
        .optional()
        .describe(
          "Comma-separated list of fields to expand (default: body.storage,version,extensions.inlineProperties)",
        ),
      limit: z
        .number()
        .optional()
        .describe("Max results to return (default 25)"),
      start: z
        .number()
        .optional()
        .describe("Start index for pagination (default 0)"),
    },
    async ({ pageId, expand, limit, start }) => {
      try {
        const params = new URLSearchParams();
        params.set(
          "expand",
          expand ?? "body.storage,version,extensions.inlineProperties",
        );
        params.set("limit", String(limit ?? 25));
        params.set("start", String(start ?? 0));

        const data = await client.confluence<ConfluenceCommentsResponse>(
          "GET",
          `/content/${pageId}/child/comment?${params}`,
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

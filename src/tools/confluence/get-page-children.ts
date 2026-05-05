import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AtlassianClient } from "../../http-client.js";
import { ConfluenceChildrenResponse } from "../../types/confluence.js";

export function registerConfluenceGetPageChildren(
  server: McpServer,
  client: AtlassianClient,
) {
  server.tool(
    "atlassian_confluence_get_page_children",
    "List child pages of a given Confluence page",
    {
      pageId: z
        .string()
        .describe("The numeric ID of the parent Confluence page"),
      limit: z
        .number()
        .optional()
        .describe("Max results to return (default 25)"),
      expand: z
        .string()
        .optional()
        .describe(
          "Comma-separated list of fields to expand (default: version,space)",
        ),
    },
    async ({ pageId, limit, expand }) => {
      try {
        const params = new URLSearchParams();
        params.set("limit", String(limit ?? 25));
        params.set("expand", expand ?? "version,space");

        const data = await client.confluence<ConfluenceChildrenResponse>(
          "GET",
          `/content/${pageId}/child?${params}`,
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

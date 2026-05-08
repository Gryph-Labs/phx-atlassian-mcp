import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { IAtlassianClient } from "../../http-client.js";
import { ConfluencePage } from "../../types/confluence.js";

export function registerConfluenceGetPage(
  server: McpServer,
  client: IAtlassianClient,
) {
  server.tool(
    "atlassian_confluence_get_page",
    "Get a Confluence page by ID, including its content",
    {
      pageId: z.string().describe("The numeric ID of the Confluence page"),
      expand: z
        .string()
        .optional()
        .describe(
          "Comma-separated list of fields to expand (default: body.storage,version,space,ancestors)",
        ),
    },
    async ({ pageId, expand }) => {
      try {
        const expandFields = expand ?? "body.storage,version,space,ancestors";
        const data = await client.confluence<ConfluencePage>(
          "GET",
          `/content/${pageId}?expand=${encodeURIComponent(expandFields)}`,
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

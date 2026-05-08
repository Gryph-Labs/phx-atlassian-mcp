import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { IAtlassianClient } from "../../http-client.js";
import { ConfluencePage, ConfluenceWriteResponse } from "../../types/confluence.js";

export function registerConfluenceUpdatePage(
  server: McpServer,
  client: IAtlassianClient,
) {
  server.tool(
    "atlassian_confluence_update_page",
    "Update the title and/or content of an existing Confluence page",
    {
      pageId: z.string().describe("Numeric ID of the page to update"),
      title: z.string().describe("New title (required even if unchanged)"),
      content: z.string().describe("New body content"),
      versionMessage: z.string().optional().describe("Optional version comment"),
      representation: z
        .enum(["wiki", "storage"])
        .optional()
        .describe("Content format — defaults to wiki"),
    },
    async ({ pageId, title, content, versionMessage, representation }) => {
      try {
        const current = await client.confluence<ConfluencePage>(
          "GET",
          `/content/${pageId}?expand=version`,
        );

        const nextVersion = (current.version?.number ?? 0) + 1;
        const fmt = representation ?? "wiki";

        const versionObj: Record<string, unknown> = { number: nextVersion };
        if (versionMessage) {
          versionObj.message = versionMessage;
        }

        const body = {
          id: pageId,
          type: "page",
          title,
          version: versionObj,
          body: {
            [fmt]: { value: content, representation: fmt },
          },
        };

        const data = await client.confluence<ConfluenceWriteResponse>(
          "PUT",
          `/content/${pageId}`,
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

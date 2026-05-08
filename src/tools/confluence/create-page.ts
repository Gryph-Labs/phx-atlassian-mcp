import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { IAtlassianClient } from "../../http-client.js";
import { ConfluenceWriteResponse } from "../../types/confluence.js";

export function registerConfluenceCreatePage(
  server: McpServer,
  client: IAtlassianClient,
) {
  server.tool(
    "atlassian_confluence_create_page",
    "Create a new Confluence page under a given parent or at the space root",
    {
      spaceKey: z.string().describe("Space key (e.g. AP)"),
      title: z.string().describe("Page title"),
      content: z.string().describe("Page body content"),
      parentId: z
        .string()
        .optional()
        .describe("Numeric ID of parent page; creates at space root if omitted"),
      representation: z
        .enum(["wiki", "storage"])
        .optional()
        .describe("Content format — defaults to wiki"),
    },
    async ({ spaceKey, title, content, parentId, representation }) => {
      try {
        const fmt = representation ?? "wiki";
        const body: Record<string, unknown> = {
          type: "page",
          title,
          space: { key: spaceKey },
          body: {
            [fmt]: { value: content, representation: fmt },
          },
        };

        if (parentId) {
          body.ancestors = [{ id: parentId }];
        }

        const data = await client.confluence<ConfluenceWriteResponse>(
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

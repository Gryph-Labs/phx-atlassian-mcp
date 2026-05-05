import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AtlassianClient } from "../../http-client.js";
import { ConfluencePage, ConfluenceWriteResponse } from "../../types/confluence.js";

export function registerConfluenceUpdatePageDiff(
  server: McpServer,
  client: AtlassianClient,
) {
  server.tool(
    "atlassian_confluence_update_page_diff",
    "Apply surgical search-and-replace edits to an existing Confluence page without rewriting the entire body",
    {
      pageId: z.string().describe("Numeric ID of the page to update"),
      replacements: z
        .array(
          z.object({
            search: z.string().describe("Exact text to find in the current page content"),
            replace: z.string().describe("Text to substitute"),
          }),
        )
        .describe("Ordered list of search/replace pairs applied sequentially"),
      title: z
        .string()
        .optional()
        .describe("New page title; omit to keep the existing title"),
      versionMessage: z.string().optional().describe("Optional version comment"),
    },
    async ({ pageId, replacements, title, versionMessage }) => {
      try {
        const current = await client.confluence<ConfluencePage>(
          "GET",
          `/content/${pageId}?expand=body.storage,version`,
        );

        const currentTitle = current.title;
        let content = current.body?.storage?.value ?? "";

        for (const { search, replace } of replacements) {
          if (!content.includes(search)) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Error: search text not found in page content.\n\nSearch:\n${search}`,
                },
              ],
              isError: true,
            };
          }
          content = content.split(search).join(replace);
        }

        const nextVersion = (current.version?.number ?? 0) + 1;
        const versionObj: Record<string, unknown> = { number: nextVersion };
        if (versionMessage) {
          versionObj.message = versionMessage;
        }

        const body = {
          id: pageId,
          type: "page",
          title: title ?? currentTitle,
          version: versionObj,
          body: {
            storage: { value: content, representation: "storage" },
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

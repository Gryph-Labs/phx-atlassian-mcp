import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { IAtlassianClient } from "../../http-client.js";
import { ConfluenceSearchResponse } from "../../types/confluence.js";

export function registerConfluenceSearch(
  server: McpServer,
  client: IAtlassianClient,
) {
  server.tool(
    "atlassian_confluence_search",
    'Search for Confluence pages using CQL (Confluence Query Language). Example CQL: type=page AND space=MYSPACE AND title~"search term"',
    {
      cql: z
        .string()
        .describe("CQL query string (e.g. type=page AND space=MYSPACE)"),
      limit: z
        .number()
        .optional()
        .describe("Max results to return (default 10)"),
      expand: z
        .string()
        .optional()
        .describe(
          "Comma-separated list of fields to expand (default: space,version). Use 'body.storage' to include page content.",
        ),
    },
    async ({ cql, limit, expand }) => {
      try {
        const params = new URLSearchParams({ cql });
        params.set("limit", String(limit ?? 10));
        if (expand) {
          params.set("expand", expand);
        } else {
          params.set("expand", "space,version");
        }

        const data = await client.confluence<ConfluenceSearchResponse>(
          "GET",
          `/content/search?${params}`,
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

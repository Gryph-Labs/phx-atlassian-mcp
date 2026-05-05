import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AtlassianClient } from "../../http-client.js";
import { BitbucketPagedResponse, BitbucketBranch } from "../../types/bitbucket.js";

export function registerBbListBranches(server: McpServer, client: AtlassianClient) {
  server.tool(
    "atlassian_bb_list_branches",
    "List branches in a Bitbucket repository",
    {
      projectKey: z.string().describe("Project key"),
      repoSlug: z.string().describe("Repository slug"),
      filterText: z.string().optional().describe("Filter branches by name"),
      limit: z.number().optional().describe("Max results (default 25)"),
    },
    async ({ projectKey, repoSlug, filterText, limit }) => {
      try {
        const params = new URLSearchParams();
        if (filterText) params.set("filterText", filterText);
        if (limit !== undefined) params.set("limit", String(limit));
        const qs = params.toString() ? `?${params}` : "";

        const data = await client.bitbucket<BitbucketPagedResponse<BitbucketBranch>>(
          "GET",
          `/projects/${projectKey}/repos/${repoSlug}/branches${qs}`
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
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

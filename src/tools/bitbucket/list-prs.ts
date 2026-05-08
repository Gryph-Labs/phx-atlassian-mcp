import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { IAtlassianClient } from "../../http-client.js";
import { BitbucketPagedResponse, BitbucketPullRequest } from "../../types/bitbucket.js";

export function registerBbListPullRequests(server: McpServer, client: IAtlassianClient) {
  server.tool(
    "atlassian_bb_list_pull_requests",
    "List pull requests in a Bitbucket repository",
    {
      projectKey: z.string().describe("Project key"),
      repoSlug: z.string().describe("Repository slug"),
      state: z.enum(["OPEN", "MERGED", "DECLINED", "ALL"]).optional().describe("PR state filter (default OPEN)"),
      limit: z.number().optional().describe("Max results (default 25)"),
    },
    async ({ projectKey, repoSlug, state, limit }) => {
      try {
        const params = new URLSearchParams();
        if (state) params.set("state", state);
        if (limit !== undefined) params.set("limit", String(limit));
        const qs = params.toString() ? `?${params}` : "";

        const data = await client.bitbucket<BitbucketPagedResponse<BitbucketPullRequest>>(
          "GET",
          `/projects/${projectKey}/repos/${repoSlug}/pull-requests${qs}`
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

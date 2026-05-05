import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AtlassianClient } from "../../http-client.js";

export function registerBbGetPrDiff(server: McpServer, client: AtlassianClient) {
  server.tool(
    "atlassian_bb_get_pr_diff",
    "Get the diff of a Bitbucket pull request in unified diff format (.diff). " +
      "Returns standard git diff output, which is much more compact than the raw JSON API response. " +
      "Use bb_get_pr_comments to get inline code review comments separately.",
    {
      projectKey: z.string().describe("Project key"),
      repoSlug: z.string().describe("Repository slug"),
      prId: z.number().describe("Pull request ID"),
      contextLines: z.number().optional().describe("Number of context lines around changes"),
    },
    async ({ projectKey, repoSlug, prId, contextLines }) => {
      try {
        const params = contextLines !== undefined ? `?contextLines=${contextLines}` : "";
        const diff = await client.bitbucketRaw(
          "GET",
          `/projects/${projectKey}/repos/${repoSlug}/pull-requests/${prId}.diff${params}`,
        );
        return {
          content: [{ type: "text" as const, text: diff }],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    },
  );
}

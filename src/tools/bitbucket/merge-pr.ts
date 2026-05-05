import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AtlassianClient } from "../../http-client.js";
import { BitbucketPullRequest } from "../../types/bitbucket.js";

export function registerBbMergePullRequest(server: McpServer, client: AtlassianClient) {
  server.tool(
    "atlassian_bb_merge_pull_request",
    "Merge a Bitbucket pull request",
    {
      projectKey: z.string().describe("Project key"),
      repoSlug: z.string().describe("Repository slug"),
      prId: z.number().describe("Pull request ID"),
      version: z.number().optional().describe("Expected PR version for optimistic locking"),
    },
    async ({ projectKey, repoSlug, prId, version }) => {
      try {
        const params = version !== undefined ? `?version=${version}` : "";
        const data = await client.bitbucket<BitbucketPullRequest>(
          "POST",
          `/projects/${projectKey}/repos/${repoSlug}/pull-requests/${prId}/merge${params}`
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

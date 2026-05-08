import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { IAtlassianClient } from "../../http-client.js";
import { BitbucketPullRequest } from "../../types/bitbucket.js";

export function registerBbGetPullRequest(server: McpServer, client: IAtlassianClient) {
  server.tool(
    "atlassian_bb_get_pull_request",
    "Get details of a specific Bitbucket pull request",
    {
      projectKey: z.string().describe("Project key"),
      repoSlug: z.string().describe("Repository slug"),
      prId: z.number().describe("Pull request ID"),
    },
    async ({ projectKey, repoSlug, prId }) => {
      try {
        const data = await client.bitbucket<BitbucketPullRequest>(
          "GET",
          `/projects/${projectKey}/repos/${repoSlug}/pull-requests/${prId}`
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

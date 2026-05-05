import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AtlassianClient } from "../../http-client.js";
import { BitbucketRepo } from "../../types/bitbucket.js";

export function registerBbGetRepo(server: McpServer, client: AtlassianClient) {
  server.tool(
    "atlassian_bb_get_repo",
    "Get details of a specific Bitbucket repository",
    {
      projectKey: z.string().describe("Project key"),
      repoSlug: z.string().describe("Repository slug"),
    },
    async ({ projectKey, repoSlug }) => {
      try {
        const data = await client.bitbucket<BitbucketRepo>(
          "GET",
          `/projects/${projectKey}/repos/${repoSlug}`
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

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { IAtlassianClient } from "../../http-client.js";
import { BitbucketPagedResponse, BitbucketRepo } from "../../types/bitbucket.js";

export function registerBbListRepos(server: McpServer, client: IAtlassianClient) {
  server.tool(
    "atlassian_bb_list_repos",
    "List repositories in a Bitbucket project",
    {
      projectKey: z.string().describe("Project key"),
      limit: z.number().optional().describe("Max results (default 25)"),
    },
    async ({ projectKey, limit }) => {
      try {
        const params = limit !== undefined ? `?limit=${limit}` : "";
        const data = await client.bitbucket<BitbucketPagedResponse<BitbucketRepo>>(
          "GET",
          `/projects/${projectKey}/repos${params}`
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

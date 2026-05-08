import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { IAtlassianClient } from "../../http-client.js";
import { BitbucketPullRequest } from "../../types/bitbucket.js";

export function registerBbCreatePullRequest(server: McpServer, client: IAtlassianClient) {
  server.tool(
    "atlassian_bb_create_pull_request",
    "Create a new pull request in a Bitbucket repository",
    {
      projectKey: z.string().describe("Project key"),
      repoSlug: z.string().describe("Repository slug"),
      title: z.string().describe("Pull request title"),
      fromBranch: z.string().describe("Source branch name"),
      toBranch: z.string().describe("Target branch name"),
      description: z.string().optional().describe("Pull request description"),
      reviewers: z.array(z.string()).optional().describe("List of reviewer usernames"),
    },
    async ({ projectKey, repoSlug, title, fromBranch, toBranch, description, reviewers }) => {
      try {
        const body: Record<string, unknown> = {
          title,
          fromRef: { id: `refs/heads/${fromBranch}`, repository: { slug: repoSlug, project: { key: projectKey } } },
          toRef: { id: `refs/heads/${toBranch}`, repository: { slug: repoSlug, project: { key: projectKey } } },
        };
        if (description) body.description = description;
        if (reviewers) body.reviewers = reviewers.map((name) => ({ user: { name } }));

        const data = await client.bitbucket<BitbucketPullRequest>(
          "POST",
          `/projects/${projectKey}/repos/${repoSlug}/pull-requests`,
          body
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

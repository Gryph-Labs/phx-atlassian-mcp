import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { IAtlassianClient } from "../../http-client.js";
import { BitbucketThreadedComment } from "../../types/bitbucket.js";

export function registerBbAddPrCommentReaction(server: McpServer, client: IAtlassianClient) {
  server.tool(
    "atlassian_bb_add_pr_comment_reaction",
    "Add an emoji reaction to a Bitbucket pull request comment. " +
      "Available emoticon keys: eyes, heart, pray, sweat_smile, thinking_face, thumbsdown, thumbsup, white_check_mark.",
    {
      projectKey: z.string().describe("Project key"),
      repoSlug: z.string().describe("Repository slug"),
      prId: z.number().describe("Pull request ID"),
      commentId: z.number().describe("Comment ID to react to"),
      emoticon: z.string().describe("Emoticon key, e.g. 'thumbs-up', 'check', 'white_check_mark'"),
    },
    async ({ projectKey, repoSlug, prId, commentId, emoticon }) => {
      try {
        const data = await client.bitbucketCommentLikes<BitbucketThreadedComment>(
          "PUT",
          `/projects/${projectKey}/repos/${repoSlug}/pull-requests/${prId}/comments/${commentId}/reactions/${emoticon}`,
          {}
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

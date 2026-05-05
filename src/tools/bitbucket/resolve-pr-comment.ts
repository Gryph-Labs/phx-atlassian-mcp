import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AtlassianClient } from "../../http-client.js";
import { BitbucketThreadedComment } from "../../types/bitbucket.js";

export function registerBbResolvePrComment(server: McpServer, client: AtlassianClient) {
  server.tool(
    "atlassian_bb_resolve_pr_comment",
    "Resolve or reopen a comment thread on a Bitbucket pull request. " +
      "When a reviewer's concern has been addressed, mark the thread as resolved. " +
      "Pass resolved=false to reopen a thread if further discussion is needed.",
    {
      projectKey: z.string().describe("Project key"),
      repoSlug: z.string().describe("Repository slug"),
      prId: z.number().describe("Pull request ID"),
      commentId: z.number().describe("ID of the root comment of the thread to resolve or reopen"),
      resolved: z.boolean().describe("true to resolve the thread, false to reopen it"),
      version: z
        .number()
        .optional()
        .describe(
          "Current comment version for optimistic locking. " +
            "If omitted, the tool fetches the comment first to get the latest version."
        ),
    },
    async ({ projectKey, repoSlug, prId, commentId, resolved, version }) => {
      try {
        let currentVersion = version;
        if (currentVersion === undefined) {
          const comment = await client.bitbucket<BitbucketThreadedComment>(
            "GET",
            `/projects/${projectKey}/repos/${repoSlug}/pull-requests/${prId}/comments/${commentId}`
          );
          // The Bitbucket API uses a 'version' field on comments, but it's not in our base type.
          // Cast to any to read it safely.
          currentVersion = (comment as unknown as { version?: number }).version ?? 0;
        }

        const data = await client.bitbucket<BitbucketThreadedComment>(
          "PUT",
          `/projects/${projectKey}/repos/${repoSlug}/pull-requests/${prId}/comments/${commentId}`,
          { state: resolved ? "RESOLVED" : "OPEN", version: currentVersion }
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

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AtlassianClient } from "../../http-client.js";
import { BitbucketComment } from "../../types/bitbucket.js";

export function registerBbAddPrComment(server: McpServer, client: AtlassianClient) {
  server.tool(
    "atlassian_bb_add_pr_comment",
    "Add a comment to a Bitbucket pull request. Can be a general PR comment or an inline comment on a specific file/line.",
    {
      projectKey: z.string().describe("Project key"),
      repoSlug: z.string().describe("Repository slug"),
      prId: z.number().describe("Pull request ID"),
      text: z.string().describe("Comment text"),
      filePath: z.string().optional().describe("File path for inline comment (e.g. 'src/main/java/Foo.java'). When provided, the comment is placed on the file diff."),
      line: z.number().optional().describe("Line number in the diff for inline comment. Required when filePath is provided."),
      lineType: z.enum(["ADDED", "REMOVED", "CONTEXT"]).optional().describe("Type of line in the diff: ADDED (new file side), REMOVED (old file side), CONTEXT (unchanged)."),
      fileType: z.enum(["FROM", "TO"]).optional().describe("Which version of the file: FROM (source/old) or TO (destination/new)."),
    },
    async ({ projectKey, repoSlug, prId, text, filePath, line, lineType, fileType }) => {
      try {
        const body: Record<string, unknown> = { text };
        if (filePath) {
          const anchor: Record<string, unknown> = { path: filePath };
          if (line !== undefined) anchor.line = line;
          if (lineType !== undefined) anchor.lineType = lineType;
          if (fileType !== undefined) anchor.fileType = fileType;
          body.anchor = anchor;
        }
        const data = await client.bitbucket<BitbucketComment>(
          "POST",
          `/projects/${projectKey}/repos/${repoSlug}/pull-requests/${prId}/comments`,
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

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AtlassianClient } from "../../http-client.js";

export function registerBbGetFileContent(server: McpServer, client: AtlassianClient) {
  server.tool(
    "atlassian_bb_get_file_content",
    "Get raw file content from a Bitbucket repository",
    {
      projectKey: z.string().describe("Project key"),
      repoSlug: z.string().describe("Repository slug"),
      path: z.string().describe("File path within the repository"),
      at: z.string().optional().describe("Branch, tag, or commit to read from"),
      maxLines: z.number().optional().default(500).describe("Max lines to return (default 500). Use 0 for unlimited."),
    },
    async ({ projectKey, repoSlug, path, at, maxLines }) => {
      try {
        const params = at ? `?at=${encodeURIComponent(at)}` : "";
        let content = await client.bitbucketRaw(
          "GET",
          `/projects/${projectKey}/repos/${repoSlug}/raw/${path}${params}`
        );

        if (maxLines > 0) {
          const lines = content.split("\n");
          if (lines.length > maxLines) {
            const truncated = lines.slice(0, maxLines).join("\n");
            const omitted = lines.length - maxLines;
            content = `${truncated}\n... (${omitted} more lines omitted) ...`;
          }
        }

        return {
          content: [{ type: "text" as const, text: content }],
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

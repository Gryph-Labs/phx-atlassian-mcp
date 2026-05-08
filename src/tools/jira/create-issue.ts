import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { IAtlassianClient } from "../../http-client.js";

export function registerJiraCreateIssue(server: McpServer, client: IAtlassianClient) {
  server.tool(
    "atlassian_jira_create_issue",
    "Create a new Jira issue",
    {
      projectKey: z.string().describe("Project key (e.g. PROJ)"),
      issueType: z.string().describe("Issue type name (e.g. Bug, Story, Task)"),
      summary: z.string().describe("Issue summary/title"),
      description: z.string().optional().describe("Issue description"),
      assignee: z.string().optional().describe("Assignee username"),
      priority: z.string().optional().describe("Priority name (e.g. High, Medium, Low)"),
      labels: z.array(z.string()).optional().describe("Labels to apply"),
    },
    async ({ projectKey, issueType, summary, description, assignee, priority, labels }) => {
      try {
        const fields: Record<string, unknown> = {
          project: { key: projectKey },
          issuetype: { name: issueType },
          summary,
        };
        if (description) fields.description = description;
        if (assignee) fields.assignee = { name: assignee };
        if (priority) fields.priority = { name: priority };
        if (labels) fields.labels = labels;

        const data = await client.jira("POST", "/issue", { fields });
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

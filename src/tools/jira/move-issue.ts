import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { IAtlassianClient } from "../../http-client.js";
import {
  ALLOWED_WORKFLOW_STATUSES,
  assertProjectAllowed,
  assertStatusAllowed,
  normalize,
} from "../../policy.js";
import { JiraIssue, JiraTransitionsResponse } from "../../types/jira.js";

export function registerJiraMoveIssue(server: McpServer, client: IAtlassianClient) {
  server.tool(
    "phx_jira_move_issue",
    "Move an allowed Jira issue between approved workflow states only. The server refuses all other target states, including Done, Closed, Cancelled, and Rejected.",
    {
      issueKey: z.string().describe("Issue key, for example PHX-123"),
      targetStatus: z
        .enum(ALLOWED_WORKFLOW_STATUSES)
        .describe("Approved target status"),
    },
    async ({ issueKey, targetStatus }) => {
      try {
        assertProjectAllowed(issueKey);
        const allowedTarget = assertStatusAllowed(targetStatus);

        const issue = await client.jira<JiraIssue>(
          "GET",
          `/issue/${encodeURIComponent(issueKey)}?fields=summary,status,project`,
        );

        const currentStatus = String(
          ((issue.fields.status as { name?: unknown } | undefined)?.name) ?? "",
        );

        if (normalize(currentStatus) === normalize(allowedTarget)) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    issueKey,
                    status: currentStatus,
                    changed: false,
                    message: "Issue is already in the requested status.",
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        const transitions = await client.jira<JiraTransitionsResponse>(
          "GET",
          `/issue/${encodeURIComponent(issueKey)}/transitions`,
        );

        const transition = transitions.transitions.find(
          (candidate) =>
            normalize(candidate.to?.name ?? candidate.name) === normalize(allowedTarget),
        );

        if (!transition) {
          throw new Error(
            `Jira does not offer a transition from ${currentStatus || "the current status"} to ${allowedTarget}.`,
          );
        }

        await client.jira(
          "POST",
          `/issue/${encodeURIComponent(issueKey)}/transitions`,
          { transition: { id: transition.id } },
        );

        const refreshed = await client.jira<JiraIssue>(
          "GET",
          `/issue/${encodeURIComponent(issueKey)}?fields=summary,status,project`,
        );
        const refreshedStatus = String(
          ((refreshed.fields.status as { name?: unknown } | undefined)?.name) ?? "",
        );

        if (normalize(refreshedStatus) !== normalize(allowedTarget)) {
          throw new Error(
            `Jira accepted the transition request but the issue is now ${refreshedStatus || "in an unknown status"}, not ${allowedTarget}.`,
          );
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  issueKey,
                  from: currentStatus,
                  to: refreshedStatus,
                  changed: true,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    },
  );
}

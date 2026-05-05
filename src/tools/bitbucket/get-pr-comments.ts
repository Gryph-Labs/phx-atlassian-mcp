import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { AtlassianClient } from '../../http-client.js';
import {
  BitbucketPagedResponse,
  BitbucketPrActivity,
  BitbucketPullRequest,
  BitbucketThreadedComment,
} from '../../types/bitbucket.js';

interface FormattedComment {
  id: number;
  author: string;
  state: string;
  threadResolved: boolean;
  text: string;
  filePath?: string;
  line?: number;
  lineType?: string;
  replies: Array<{ author: string; text: string }>;
}

function flattenReplies(
  comment: BitbucketThreadedComment,
): Array<{ author: string; text: string }> {
  const replies: Array<{ author: string; text: string }> = [];
  for (const reply of comment.comments ?? []) {
    replies.push({ author: reply.author.displayName, text: reply.text });
    replies.push(...flattenReplies(reply));
  }
  return replies;
}

function formatComment(comment: BitbucketThreadedComment): FormattedComment {
  return {
    id: comment.id,
    author: comment.author.displayName,
    state: comment.state,
    threadResolved: comment.threadResolved ?? false,
    text: comment.text,
    filePath: comment.anchor?.path,
    line: comment.anchor?.line,
    lineType: comment.anchor?.lineType,
    replies: flattenReplies(comment),
  };
}

export function registerBbGetPrComments(server: McpServer, client: AtlassianClient) {
  server.tool(
    'atlassian_bb_get_pr_comments',
    'Get code review comments and discussions on a Bitbucket pull request. ' +
      'Returns inline file comments with file paths and line numbers, as well as general PR comments. ' +
      'Useful for understanding reviewer feedback and fixing code review issues. ' +
      "Use state filter 'OPEN' to see only unresolved review comments that need to be addressed. " +
      'You can look up a PR either by its ID (prId) or by branch name (branchName). At least one must be provided.',
    {
      projectKey: z.string().describe('Project key'),
      repoSlug: z.string().describe('Repository slug'),
      prId: z
        .number()
        .optional()
        .describe('Pull request ID. Required if branchName is not provided.'),
      branchName: z
        .string()
        .optional()
        .describe(
          'Source branch name of the pull request (e.g. "feature/my-branch"). ' +
            'When provided, the tool finds the OPEN pull request from this branch. Required if prId is not provided.',
        ),
      state: z
        .enum(['OPEN', 'RESOLVED', 'ALL'])
        .optional()
        .describe(
          "Filter by comment thread state. Use 'OPEN' to see only unresolved comments (default). 'RESOLVED' for resolved. 'ALL' for everything.",
        ),
      limit: z
        .number()
        .optional()
        .describe('Max number of activity items to fetch per page (default 100)'),
      maxComments: z
        .number()
        .optional()
        .default(50)
        .describe('Max comments to return overall (default 50). Use 0 for unlimited.'),
    },
    async ({ projectKey, repoSlug, prId, branchName, state, limit, maxComments }) => {
      try {
        let resolvedPrId = prId;

        if (!resolvedPrId && !branchName) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Error: Either prId or branchName must be provided.',
              },
            ],
            isError: true,
          };
        }

        if (!resolvedPrId && branchName) {
          const searchParams = new URLSearchParams();
          searchParams.set('state', 'OPEN');
          searchParams.set('limit', '50');
          const searchQs = `?${searchParams}`;

          const prs = await client.bitbucket<BitbucketPagedResponse<BitbucketPullRequest>>(
            'GET',
            `/projects/${projectKey}/repos/${repoSlug}/pull-requests${searchQs}`,
          );

          const match = prs.values.find(
            (pr) =>
              pr.fromRef.displayId === branchName ||
              pr.fromRef.id === branchName ||
              pr.fromRef.id === `refs/heads/${branchName}`,
          );

          if (!match) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `Error: No open pull request found for branch "${branchName}" in ${projectKey}/${repoSlug}.`,
                },
              ],
              isError: true,
            };
          }
          resolvedPrId = match.id;
        }

        const stateFilter = state ?? 'OPEN';
        const pageLimit = limit ?? 100;
        const allComments: FormattedComment[] = [];
        let start = 0;
        let isLastPage = false;

        while (!isLastPage) {
          const params = new URLSearchParams();
          params.set('limit', String(pageLimit));
          params.set('start', String(start));
          const qs = `?${params}`;

          const data = await client.bitbucket<BitbucketPagedResponse<BitbucketPrActivity>>(
            'GET',
            `/projects/${projectKey}/repos/${repoSlug}/pull-requests/${resolvedPrId}/activities${qs}`,
          );

          for (const activity of data.values) {
            if (activity.action !== 'COMMENTED' || !activity.comment) continue;
            const formatted = formatComment(activity.comment);

            let include = false;
            if (stateFilter === 'ALL') {
              include = true;
            } else if (stateFilter === 'RESOLVED' && formatted.threadResolved) {
              include = true;
            } else if (stateFilter === 'OPEN' && !formatted.threadResolved) {
              include = true;
            }

            if (include) {
              allComments.push(formatted);
              if (maxComments > 0 && allComments.length >= maxComments) {
                isLastPage = true;
                break;
              }
            }
          }

          isLastPage = isLastPage || data.isLastPage;
          start = start + data.size;
        }

        const summary = {
          prId: resolvedPrId,
          total: allComments.length,
          stateFilter,
          inline: allComments.filter((c) => c.filePath).length,
          general: allComments.filter((c) => !c.filePath).length,
          comments: allComments,
        };

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(summary, null, 2) }],
        };
      } catch (e) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    },
  );
}

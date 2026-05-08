import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IAtlassianClient } from '../../http-client.js';
import { registerBbListRepos } from './list-repos.js';
import { registerBbGetRepo } from './get-repo.js';
import { registerBbListBranches } from './list-branches.js';
import { registerBbListPullRequests } from './list-prs.js';
import { registerBbGetPullRequest } from './get-pr.js';
import { registerBbCreatePullRequest } from './create-pr.js';
import { registerBbAddPrComment } from './add-pr-comment.js';
import { registerBbMergePullRequest } from './merge-pr.js';
import { registerBbGetFileContent } from './get-file-content.js';
import { registerBbGetPrDiff } from './get-pr-diff.js';
import { registerBbGetPrComments } from './get-pr-comments.js';
import { registerBbResolvePrComment } from './resolve-pr-comment.js';
import { registerBbAddPrCommentReaction } from './add-pr-comment-reaction.js';

export function registerBitbucketTools(server: McpServer, client: IAtlassianClient) {
  registerBbListRepos(server, client);
  registerBbGetRepo(server, client);
  registerBbListBranches(server, client);
  registerBbListPullRequests(server, client);
  registerBbGetPullRequest(server, client);
  registerBbCreatePullRequest(server, client);
  registerBbAddPrComment(server, client);
  registerBbMergePullRequest(server, client);
  registerBbGetFileContent(server, client);
  registerBbGetPrDiff(server, client);
  registerBbGetPrComments(server, client);
  registerBbResolvePrComment(server, client);
  registerBbAddPrCommentReaction(server, client);
}

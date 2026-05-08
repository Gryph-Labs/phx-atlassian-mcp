import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { IAtlassianClient } from "../../http-client.js";
import { registerJiraSearch } from "./search.js";
import { registerJiraGetIssue } from "./get-issue.js";
import { registerJiraCreateIssue } from "./create-issue.js";
import { registerJiraUpdateIssue } from "./update-issue.js";
import { registerJiraTransitionIssue } from "./transition-issue.js";
import { registerJiraAddComment } from "./add-comment.js";
import { registerJiraListProjects } from "./list-projects.js";
import { registerJiraGetConfluenceLinks } from "./get-confluence-links.js";
import { registerJiraCreateIssueLink } from "./create-issue-link.js";

export function registerJiraTools(server: McpServer, client: IAtlassianClient) {
  registerJiraSearch(server, client);
  registerJiraGetIssue(server, client);
  registerJiraCreateIssue(server, client);
  registerJiraUpdateIssue(server, client);
  registerJiraTransitionIssue(server, client);
  registerJiraAddComment(server, client);
  registerJiraListProjects(server, client);
  registerJiraGetConfluenceLinks(server, client);
  registerJiraCreateIssueLink(server, client);
}

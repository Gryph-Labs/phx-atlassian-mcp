import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { IAtlassianClient } from "../../http-client.js";
import { registerJiraGetConfluenceLinks } from "./get-confluence-links.js";
import { registerJiraGetIssue } from "./get-issue.js";
import { registerJiraListProjects } from "./list-projects.js";
import { registerJiraMoveIssue } from "./move-issue.js";
import { registerJiraSearch } from "./search.js";

export function registerJiraTools(server: McpServer, client: IAtlassianClient) {
  registerJiraSearch(server, client);
  registerJiraGetIssue(server, client);
  registerJiraListProjects(server, client);
  registerJiraGetConfluenceLinks(server, client);
  registerJiraMoveIssue(server, client);
}

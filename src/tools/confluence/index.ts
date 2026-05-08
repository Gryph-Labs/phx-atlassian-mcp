import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { IAtlassianClient } from "../../http-client.js";
import { registerConfluenceGetPage } from "./get-page.js";
import { registerConfluenceSearch } from "./search.js";
import { registerConfluenceGetPageChildren } from "./get-page-children.js";
import { registerConfluenceCreatePage } from "./create-page.js";
import { registerConfluenceUpdatePage } from "./update-page.js";
import { registerConfluenceUpdatePageDiff } from "./update-page-diff.js";
import { registerConfluenceGetPageComments } from "./get-page-comments.js";
import { registerConfluenceAddPageComment } from "./add-page-comment.js";

export function registerConfluenceTools(
  server: McpServer,
  client: IAtlassianClient,
) {
  registerConfluenceGetPage(server, client);
  registerConfluenceSearch(server, client);
  registerConfluenceGetPageChildren(server, client);
  registerConfluenceCreatePage(server, client);
  registerConfluenceUpdatePage(server, client);
  registerConfluenceUpdatePageDiff(server, client);
  registerConfluenceGetPageComments(server, client);
  registerConfluenceAddPageComment(server, client);
}

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { IAtlassianClient } from "../../http-client.js";
import { registerConfluenceGetPage } from "./get-page.js";
import { registerConfluenceGetPageChildren } from "./get-page-children.js";
import { registerConfluenceGetPageComments } from "./get-page-comments.js";
import { registerConfluenceSearch } from "./search.js";

export function registerConfluenceTools(
  server: McpServer,
  client: IAtlassianClient,
) {
  registerConfluenceGetPage(server, client);
  registerConfluenceSearch(server, client);
  registerConfluenceGetPageChildren(server, client);
  registerConfluenceGetPageComments(server, client);
}

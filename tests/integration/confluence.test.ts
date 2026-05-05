import { describe, beforeAll, afterAll, beforeEach, it, expect } from "vitest";
import {
  setupWiremock,
  teardownWiremock,
  getClient,
  stubRequest,
  resetStubs,
} from "./setup.js";
import { MockMcpServer } from "./mock-mcp-server.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerConfluenceSearch } from "../../src/tools/confluence/search.js";
import { registerConfluenceGetPage } from "../../src/tools/confluence/get-page.js";
import { registerConfluenceCreatePage } from "../../src/tools/confluence/create-page.js";
import { registerConfluenceGetPageChildren } from "../../src/tools/confluence/get-page-children.js";
import { registerConfluenceUpdatePage } from "../../src/tools/confluence/update-page.js";
import { registerConfluenceUpdatePageDiff } from "../../src/tools/confluence/update-page-diff.js";
import { registerConfluenceGetPageComments } from "../../src/tools/confluence/get-page-comments.js";
import { registerConfluenceAddPageComment } from "../../src/tools/confluence/add-page-comment.js";

describe("Confluence tools integration", () => {
  beforeAll(async () => {
    await setupWiremock();
  });

  afterAll(async () => {
    await teardownWiremock();
  });

  beforeEach(async () => {
    await resetStubs();
  });

  it("confluence_search returns pages", async () => {
    const mockResponse = {
      results: [
        {
          id: "12345",
          type: "page",
          status: "current",
          title: "Hello Page",
          space: { id: 1, key: "TEST", name: "Test", type: "global" },
          version: { by: { username: "alice", displayName: "Alice" }, when: "2024-01-01", number: 1 },
          _links: { webui: "/display/TEST/Hello+Page", self: "http://localhost/rest/api/content/12345" },
        },
      ],
      start: 0,
      limit: 10,
      size: 1,
      totalSize: 1,
    };
    await stubRequest("GET", "/confluence/rest/api/content/search", mockResponse);

    const server = new MockMcpServer();
    registerConfluenceSearch(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_confluence_search", { cql: "type=page AND space=TEST" });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.results[0].title).toBe("Hello Page");
  });

  it("confluence_get_page returns page details", async () => {
    const mockResponse = {
      id: "12345",
      type: "page",
      status: "current",
      title: "Hello Page",
      space: { id: 1, key: "TEST", name: "Test", type: "global" },
      version: { by: { username: "alice", displayName: "Alice" }, when: "2024-01-01", number: 1 },
      body: { storage: { value: "<p>Hello world</p>", representation: "storage" } },
      _links: { webui: "/display/TEST/Hello+Page", self: "http://localhost/rest/api/content/12345" },
    };
    await stubRequest("GET", "/confluence/rest/api/content/12345", mockResponse);

    const server = new MockMcpServer();
    registerConfluenceGetPage(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_confluence_get_page", { pageId: "12345" });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.title).toBe("Hello Page");
    expect(parsed.body.storage.value).toBe("<p>Hello world</p>");
  });

  it("confluence_create_page returns created page", async () => {
    const mockResponse = {
      id: "12346",
      title: "New Page",
      version: { number: 1 },
      _links: { webui: "/display/TEST/New+Page", self: "http://localhost/rest/api/content/12346" },
    };
    await stubRequest("POST", "/confluence/rest/api/content", mockResponse);

    const server = new MockMcpServer();
    registerConfluenceCreatePage(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_confluence_create_page", {
      spaceKey: "TEST",
      title: "New Page",
      content: "<p>Body</p>",
      representation: "storage",
    });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.title).toBe("New Page");
  });

  it("confluence_get_page_children returns child pages", async () => {
    const mockResponse = {
      page: {
        results: [
          {
            id: "12347",
            type: "page",
            status: "current",
            title: "Child Page",
            _links: { webui: "/display/TEST/Child+Page", self: "http://localhost/rest/api/content/12347" },
          },
        ],
        start: 0,
        limit: 25,
        size: 1,
      },
    };
    await stubRequest("GET", "/confluence/rest/api/content/12345/child", mockResponse);

    const server = new MockMcpServer();
    registerConfluenceGetPageChildren(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_confluence_get_page_children", { pageId: "12345" });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.page.results[0].title).toBe("Child Page");
  });

  it("confluence_update_page fetches version and updates page", async () => {
    const getResponse = {
      id: "12345",
      type: "page",
      status: "current",
      title: "Old Title",
      version: { by: { username: "alice", displayName: "Alice" }, when: "2024-01-01", number: 3 },
      _links: { webui: "/display/TEST/Old+Title", self: "http://localhost/rest/api/content/12345" },
    };
    const putResponse = {
      id: "12345",
      title: "New Title",
      version: { number: 4 },
      _links: { webui: "/display/TEST/New+Title", self: "http://localhost/rest/api/content/12345" },
    };
    await stubRequest("GET", "/confluence/rest/api/content/12345", getResponse);
    await stubRequest("PUT", "/confluence/rest/api/content/12345", putResponse);

    const server = new MockMcpServer();
    registerConfluenceUpdatePage(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_confluence_update_page", {
      pageId: "12345",
      title: "New Title",
      content: "<p>Updated body</p>",
      representation: "storage",
    });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.title).toBe("New Title");
    expect(parsed.version.number).toBe(4);
  });

  it("confluence_update_page_diff applies replacements", async () => {
    const getResponse = {
      id: "12345",
      type: "page",
      status: "current",
      title: "My Page",
      version: { by: { username: "alice", displayName: "Alice" }, when: "2024-01-01", number: 2 },
      body: { storage: { value: "<p>old text here</p>", representation: "storage" } },
      _links: { webui: "/display/TEST/My+Page", self: "http://localhost/rest/api/content/12345" },
    };
    const putResponse = {
      id: "12345",
      title: "My Page",
      version: { number: 3 },
      _links: { webui: "/display/TEST/My+Page", self: "http://localhost/rest/api/content/12345" },
    };
    await stubRequest("GET", "/confluence/rest/api/content/12345", getResponse);
    await stubRequest("PUT", "/confluence/rest/api/content/12345", putResponse);

    const server = new MockMcpServer();
    registerConfluenceUpdatePageDiff(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_confluence_update_page_diff", {
      pageId: "12345",
      replacements: [{ search: "old text", replace: "new text" }],
    });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.version.number).toBe(3);
  });

  it("confluence_update_page_diff returns error when search text not found", async () => {
    const getResponse = {
      id: "12345",
      type: "page",
      status: "current",
      title: "My Page",
      version: { by: { username: "alice", displayName: "Alice" }, when: "2024-01-01", number: 2 },
      body: { storage: { value: "<p>existing content</p>", representation: "storage" } },
      _links: { webui: "/display/TEST/My+Page", self: "http://localhost/rest/api/content/12345" },
    };
    await stubRequest("GET", "/confluence/rest/api/content/12345", getResponse);

    const server = new MockMcpServer();
    registerConfluenceUpdatePageDiff(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_confluence_update_page_diff", {
      pageId: "12345",
      replacements: [{ search: "missing text", replace: "new text" }],
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("search text not found");
  });

  it("confluence_get_page_returns_error_on_404" , async () => {
    await stubRequest("GET", "/confluence/rest/api/content/99999", { message: "No content found with id : 99999" }, 404);

    const server = new MockMcpServer();
    registerConfluenceGetPage(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_confluence_get_page", { pageId: "99999" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("404");
  });

  it("confluence_get_page_comments returns comments", async () => {
    const mockResponse = {
      results: [
        {
          id: "111",
          type: "comment",
          status: "current",
          title: "Re: Test Page",
          version: {
            by: { username: "alice", displayName: "Alice" },
            when: "2024-01-01",
            number: 1,
          },
          body: {
            storage: { value: "<p>Great page!</p>", representation: "storage" },
          },
          extensions: {
            location: "footer",
          },
          _links: {
            webui: "/spaces/T/pages/12345?focusedCommentId=111",
            self: "http://localhost/rest/api/content/111",
          },
        },
      ],
      start: 0,
      limit: 25,
      size: 1,
    };
    await stubRequest("GET", "/confluence/rest/api/content/12345/child/comment", mockResponse);

    const server = new MockMcpServer();
    registerConfluenceGetPageComments(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_confluence_get_page_comments", { pageId: "12345" });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.results[0].body.storage.value).toBe("<p>Great page!</p>");
    expect(parsed.size).toBe(1);
  });

  it("confluence_get_page_comments returns inline comments with properties", async () => {
    const mockResponse = {
      results: [
        {
          id: "222",
          type: "comment",
          status: "current",
          title: "Re: Test Page",
          version: {
            by: { username: "bob", displayName: "Bob" },
            when: "2024-02-01",
            number: 1,
          },
          body: {
            storage: { value: "<p>Fix this</p>", representation: "storage" },
          },
          extensions: {
            location: "inline",
            inlineProperties: {
              originalSelection: "Some highlighted text",
              markerRef: "abc-123",
            },
          },
          _links: {
            webui: "/spaces/T/pages/12345?focusedCommentId=222",
            self: "http://localhost/rest/api/content/222",
          },
        },
      ],
      start: 0,
      limit: 25,
      size: 1,
    };
    await stubRequest("GET", "/confluence/rest/api/content/12345/child/comment", mockResponse);

    const server = new MockMcpServer();
    registerConfluenceGetPageComments(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_confluence_get_page_comments", { pageId: "12345" });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.results[0].extensions.location).toBe("inline");
    expect(parsed.results[0].extensions.inlineProperties.originalSelection).toBe("Some highlighted text");
  });

  it("confluence_add_page_comment creates a comment", async () => {
    const mockResponse = {
      id: "333",
      type: "comment",
      status: "current",
      title: "Re: Test Page",
      version: {
        by: { username: "alice", displayName: "Alice" },
        when: "2024-03-01",
        number: 1,
      },
      body: {
        storage: { value: "<p>Hello world</p>", representation: "storage" },
      },
      _links: {
        webui: "/spaces/T/pages/12345?focusedCommentId=333",
        self: "http://localhost/rest/api/content/333",
      },
    };
    await stubRequest("POST", "/confluence/rest/api/content", mockResponse);

    const server = new MockMcpServer();
    registerConfluenceAddPageComment(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_confluence_add_page_comment", {
      pageId: "12345",
      content: "<p>Hello world</p>",
    });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe("333");
    expect(parsed.type).toBe("comment");
  });

  it("confluence_add_page_comment converts @accountId to user mention", async () => {
    const mockResponse = {
      id: "334",
      type: "comment",
      status: "current",
      title: "Re: Test Page",
      version: {
        by: { username: "alice", displayName: "Alice" },
        when: "2024-03-01",
        number: 1,
      },
      body: {
        storage: {
          value: '<p><ac:link><ri:user ri:account-id="712020:abc" /></ac:link> check this</p>',
          representation: "storage",
        },
      },
      _links: {
        webui: "/spaces/T/pages/12345?focusedCommentId=334",
        self: "http://localhost/rest/api/content/334",
      },
    };
    await stubRequest("POST", "/confluence/rest/api/content", mockResponse);

    const server = new MockMcpServer();
    registerConfluenceAddPageComment(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_confluence_add_page_comment", {
      pageId: "12345",
      content: "<p>@712020:abc check this</p>",
    });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe("334");
  });

  it("confluence_add_page_comment returns error on failure", async () => {
    await stubRequest("POST", "/confluence/rest/api/content", { message: "Unauthorized" }, 401);

    const server = new MockMcpServer();
    registerConfluenceAddPageComment(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_confluence_add_page_comment", {
      pageId: "12345",
      content: "<p>Test</p>",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Error:");
  });

  it("confluence_get_page_comments returns error on failure", async () => {
    await stubRequest("GET", "/confluence/rest/api/content/99999/child/comment", { message: "Not found" }, 404);

    const server = new MockMcpServer();
    registerConfluenceGetPageComments(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_confluence_get_page_comments", { pageId: "99999" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Error:");
  });
});

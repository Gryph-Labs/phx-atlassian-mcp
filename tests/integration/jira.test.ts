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
import { registerJiraSearch } from "../../src/tools/jira/search.js";
import { registerJiraListProjects } from "../../src/tools/jira/list-projects.js";
import { registerJiraCreateIssue } from "../../src/tools/jira/create-issue.js";
import { registerJiraGetIssue } from "../../src/tools/jira/get-issue.js";
import { registerJiraUpdateIssue } from "../../src/tools/jira/update-issue.js";
import { registerJiraAddComment } from "../../src/tools/jira/add-comment.js";
import { registerJiraTransitionIssue } from "../../src/tools/jira/transition-issue.js";
import { registerJiraCreateIssueLink } from "../../src/tools/jira/create-issue-link.js";
import { registerJiraGetConfluenceLinks } from "../../src/tools/jira/get-confluence-links.js";

describe("Jira tools integration", () => {
  beforeAll(async () => {
    await setupWiremock();
  });

  afterAll(async () => {
    await teardownWiremock();
  });

  beforeEach(async () => {
    await resetStubs();
  });

  it("jira_search returns issues", async () => {
    const mockResponse = {
      startAt: 0,
      maxResults: 50,
      total: 1,
      issues: [
        {
          id: "10001",
          key: "TEST-1",
          self: "http://localhost/rest/api/2/issue/10001",
          fields: { summary: "Hello world" },
        },
      ],
    };
    await stubRequest("GET", "/jira/rest/api/2/search", mockResponse);

    const server = new MockMcpServer();
    registerJiraSearch(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_jira_search", { jql: "project=TEST" });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.issues[0].key).toBe("TEST-1");
    expect(parsed.issues[0].fields.summary).toBe("Hello world");
  });

  it("jira_list_projects returns projects", async () => {
    const mockResponse = [
      { id: "1", key: "TEST", name: "Test Project", projectTypeKey: "software" },
    ];
    await stubRequest("GET", "/jira/rest/api/2/project", mockResponse);

    const server = new MockMcpServer();
    registerJiraListProjects(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_jira_list_projects", {});
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].key).toBe("TEST");
  });

  it("jira_create_issue returns created issue", async () => {
    const mockResponse = { id: "10002", key: "TEST-2", self: "http://localhost/rest/api/2/issue/10002" };
    await stubRequest("POST", "/jira/rest/api/2/issue", mockResponse);

    const server = new MockMcpServer();
    registerJiraCreateIssue(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_jira_create_issue", {
      projectKey: "TEST",
      issueType: "Task",
      summary: "Do something",
    });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.key).toBe("TEST-2");
  });

  it("jira_get_issue returns issue details", async () => {
    const mockResponse = {
      id: "10001",
      key: "TEST-1",
      self: "http://localhost/rest/api/2/issue/10001",
      fields: { summary: "Hello world", status: { name: "Open" } },
    };
    await stubRequest("GET", "/jira/rest/api/2/issue/TEST-1", mockResponse);

    const server = new MockMcpServer();
    registerJiraGetIssue(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_jira_get_issue", { issueKey: "TEST-1" });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.key).toBe("TEST-1");
  });

  it("jira_get_issue returns error on 404", async () => {
    await stubRequest("GET", "/jira/rest/api/2/issue/TEST-404", { errorMessages: ["Issue does not exist."] }, 404);

    const server = new MockMcpServer();
    registerJiraGetIssue(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_jira_get_issue", { issueKey: "TEST-404" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("404");
  });

  it("jira_update_issue returns success", async () => {
    await stubRequest("PUT", "/jira/rest/api/2/issue/TEST-1", {}, 204);

    const server = new MockMcpServer();
    registerJiraUpdateIssue(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_jira_update_issue", {
      issueKey: "TEST-1",
      fields: { summary: "Updated summary" },
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("updated successfully");
  });

  it("jira_add_comment returns created comment", async () => {
    const mockResponse = {
      id: "10010",
      body: "Nice work",
      author: { name: "alice", displayName: "Alice" },
      created: "2024-01-01T00:00:00.000+0000",
      updated: "2024-01-01T00:00:00.000+0000",
    };
    await stubRequest("POST", "/jira/rest/api/2/issue/TEST-1/comment", mockResponse);

    const server = new MockMcpServer();
    registerJiraAddComment(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_jira_add_comment", {
      issueKey: "TEST-1",
      body: "Nice work",
    });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.body).toBe("Nice work");
  });

  it("jira_transition_issue returns success", async () => {
    await stubRequest("POST", "/jira/rest/api/2/issue/TEST-1/transitions", {}, 204);

    const server = new MockMcpServer();
    registerJiraTransitionIssue(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_jira_transition_issue", {
      issueKey: "TEST-1",
      transitionId: "21",
      comment: "Moving to Done",
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("transitioned successfully");
  });

  it("jira_create_issue_link returns success", async () => {
    await stubRequest("POST", "/jira/rest/api/2/issueLink", {}, 201);

    const server = new MockMcpServer();
    registerJiraCreateIssueLink(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_jira_create_issue_link", {
      inwardIssueKey: "TEST-1",
      outwardIssueKey: "TEST-2",
      linkType: "Relates",
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Created Relates link");
  });

  it("jira_get_confluence_links filters confluence links", async () => {
    const mockResponse = [
      {
        id: 1,
        self: "http://localhost/rest/api/2/issue/TEST-1/remotelink/1",
        globalId: "1",
        object: { url: "http://wiki.example.com/pages/viewpage.action?pageId=12345", title: "Design Doc" },
        application: { type: "confluence", name: "Confluence" },
      },
      {
        id: 2,
        self: "http://localhost/rest/api/2/issue/TEST-1/remotelink/2",
        globalId: "2",
        object: { url: "http://other.example.com/doc", title: "Other Doc" },
        application: { type: "other", name: "Other" },
      },
    ];
    await stubRequest("GET", "/jira/rest/api/2/issue/TEST-1/remotelink", mockResponse);

    const server = new MockMcpServer();
    registerJiraGetConfluenceLinks(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_jira_get_confluence_links", { issueKey: "TEST-1" });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe("Design Doc");
    expect(parsed[0].pageId).toBe("12345");
  });

  it("jira_get_confluence_links returns message when no links found", async () => {
    const mockResponse = [
      {
        id: 1,
        self: "http://localhost/rest/api/2/issue/TEST-1/remotelink/1",
        globalId: "1",
        object: { url: "http://other.example.com/doc", title: "Other Doc" },
        application: { type: "other", name: "Other" },
      },
    ];
    await stubRequest("GET", "/jira/rest/api/2/issue/TEST-1/remotelink", mockResponse);

    const server = new MockMcpServer();
    registerJiraGetConfluenceLinks(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_jira_get_confluence_links", { issueKey: "TEST-1" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("No Confluence pages linked");
  });
});

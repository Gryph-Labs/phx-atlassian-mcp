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
import { registerBbResolvePrComment } from "../../src/tools/bitbucket/resolve-pr-comment.js";
import { registerBbAddPrCommentReaction } from "../../src/tools/bitbucket/add-pr-comment-reaction.js";

describe("Bitbucket tools integration", () => {
  beforeAll(async () => {
    await setupWiremock();
  });

  afterAll(async () => {
    await teardownWiremock();
  });

  beforeEach(async () => {
    await resetStubs();
  });

  it("bb_resolve_pr_comment resolves a thread (fetches version automatically)", async () => {
    const getResponse = {
      id: 3104620,
      text: "Please fix the null pointer issue",
      author: { name: "alice", displayName: "Alice" },
      createdDate: 1710000000000,
      updatedDate: 1710000000000,
      severity: "NORMAL",
      state: "OPEN",
      threadResolved: false,
      version: 0,
      comments: [],
    };
    const putResponse = {
      id: 3104620,
      text: "Please fix the null pointer issue",
      author: { name: "alice", displayName: "Alice" },
      createdDate: 1710000000000,
      updatedDate: 1710000000001,
      severity: "NORMAL",
      state: "RESOLVED",
      threadResolved: true,
      resolvedDate: 1710000000001,
      version: 1,
      comments: [],
    };
    await stubRequest(
      "GET",
      "/bitbucket/rest/api/1.0/projects/AP/repos/my-repo/pull-requests/42/comments/3104620",
      getResponse
    );
    await stubRequest(
      "PUT",
      "/bitbucket/rest/api/1.0/projects/AP/repos/my-repo/pull-requests/42/comments/3104620",
      putResponse
    );

    const server = new MockMcpServer();
    registerBbResolvePrComment(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_bb_resolve_pr_comment", {
      projectKey: "AP",
      repoSlug: "my-repo",
      prId: 42,
      commentId: 3104620,
      resolved: true,
    });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe(3104620);
    expect(parsed.state).toBe("RESOLVED");
    expect(parsed.threadResolved).toBe(true);
  });

  it("bb_resolve_pr_comment uses explicit version when provided", async () => {
    const putResponse = {
      id: 3104620,
      text: "Please fix the null pointer issue",
      author: { name: "alice", displayName: "Alice" },
      createdDate: 1710000000000,
      updatedDate: 1710000000002,
      severity: "NORMAL",
      state: "OPEN",
      threadResolved: false,
      version: 2,
      comments: [],
    };
    await stubRequest(
      "PUT",
      "/bitbucket/rest/api/1.0/projects/AP/repos/my-repo/pull-requests/42/comments/3104620",
      putResponse
    );

    const server = new MockMcpServer();
    registerBbResolvePrComment(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_bb_resolve_pr_comment", {
      projectKey: "AP",
      repoSlug: "my-repo",
      prId: 42,
      commentId: 3104620,
      resolved: false,
      version: 1,
    });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.state).toBe("OPEN");
    expect(parsed.threadResolved).toBe(false);
  });

  it("bb_resolve_pr_comment returns error on failure", async () => {
    await stubRequest(
      "GET",
      "/bitbucket/rest/api/1.0/projects/AP/repos/my-repo/pull-requests/42/comments/3104620",
      { errors: [{ message: "Comment not found" }] },
      404
    );

    const server = new MockMcpServer();
    registerBbResolvePrComment(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_bb_resolve_pr_comment", {
      projectKey: "AP",
      repoSlug: "my-repo",
      prId: 42,
      commentId: 3104620,
      resolved: true,
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("404");
  });

  it("bb_add_pr_comment_reaction adds a reaction", async () => {
    const mockResponse = {
      id: 3104620,
      text: "Great work",
      author: { name: "alice", displayName: "Alice" },
      createdDate: 1710000000000,
      updatedDate: 1710000000001,
      severity: "NORMAL",
      state: "OPEN",
      comments: [],
    };
    await stubRequest(
      "PUT",
      "/bitbucket/rest/comment-likes/latest/projects/AP/repos/my-repo/pull-requests/42/comments/3104620/reactions/thumbsup",
      mockResponse
    );

    const server = new MockMcpServer();
    registerBbAddPrCommentReaction(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_bb_add_pr_comment_reaction", {
      projectKey: "AP",
      repoSlug: "my-repo",
      prId: 42,
      commentId: 3104620,
      emoticon: "thumbsup",
    });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe(3104620);
  });

  it("bb_add_pr_comment_reaction returns error on failure", async () => {
    await stubRequest(
      "PUT",
      "/bitbucket/rest/comment-likes/latest/projects/AP/repos/my-repo/pull-requests/42/comments/3104620/reactions/invalid",
      { errors: [{ message: "Invalid emoticon" }] },
      400
    );

    const server = new MockMcpServer();
    registerBbAddPrCommentReaction(server as unknown as McpServer, getClient());

    const result = await server.callTool("atlassian_bb_add_pr_comment_reaction", {
      projectKey: "AP",
      repoSlug: "my-repo",
      prId: 42,
      commentId: 3104620,
      emoticon: "invalid",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("400");
  });
});

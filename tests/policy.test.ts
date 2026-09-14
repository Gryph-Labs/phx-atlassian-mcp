import { afterEach, describe, expect, it } from "vitest";
import {
  ALLOWED_WORKFLOW_STATUSES,
  assertProjectAllowed,
  assertStatusAllowed,
  projectKeyFromIssueKey,
  resolveAllowedStatus,
} from "../src/policy.js";

const originalAllowedProjects = process.env.JIRA_ALLOWED_PROJECTS;

afterEach(() => {
  if (originalAllowedProjects === undefined) {
    delete process.env.JIRA_ALLOWED_PROJECTS;
  } else {
    process.env.JIRA_ALLOWED_PROJECTS = originalAllowedProjects;
  }
});

describe("Jira workflow policy", () => {
  it("allows only the four approved workflow statuses", () => {
    expect(ALLOWED_WORKFLOW_STATUSES).toEqual([
      "Backlog",
      "To Do",
      "In Progress",
      "Ready for Review",
    ]);

    expect(assertStatusAllowed("Backlog")).toBe("Backlog");
    expect(assertStatusAllowed("todo")).toBe("To Do");
    expect(assertStatusAllowed("in_progress")).toBe("In Progress");
    expect(assertStatusAllowed("ready-for-review")).toBe("Ready for Review");
  });

  it.each(["Done", "Closed", "Cancelled", "Rejected", "QA", "Deploy"])(
    "denies target status %s",
    (status) => {
      expect(() => assertStatusAllowed(status)).toThrow(/Workflow transition denied/);
      expect(resolveAllowedStatus(status)).toBeUndefined();
    },
  );

  it("defaults Jira writes to PHX only", () => {
    delete process.env.JIRA_ALLOWED_PROJECTS;
    expect(() => assertProjectAllowed("PHX-123")).not.toThrow();
    expect(() => assertProjectAllowed("OTHER-123")).toThrow(/Write denied/);
  });

  it("supports an explicit comma-separated project allowlist", () => {
    process.env.JIRA_ALLOWED_PROJECTS = "PHX, LAB";
    expect(() => assertProjectAllowed("PHX-1")).not.toThrow();
    expect(() => assertProjectAllowed("LAB-9")).not.toThrow();
    expect(() => assertProjectAllowed("OPS-2")).toThrow(/Write denied/);
  });

  it("extracts project keys safely", () => {
    expect(projectKeyFromIssueKey("phx-42")).toBe("PHX");
    expect(() => projectKeyFromIssueKey("invalid")).toThrow(/Invalid Jira issue key/);
  });
});

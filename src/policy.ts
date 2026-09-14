export const ALLOWED_WORKFLOW_STATUSES = [
  "Backlog",
  "To Do",
  "In Progress",
  "Ready for Review",
] as const;

export type AllowedWorkflowStatus = (typeof ALLOWED_WORKFLOW_STATUSES)[number];

const NORMALIZED_STATUS_MAP = new Map<string, AllowedWorkflowStatus>(
  ALLOWED_WORKFLOW_STATUSES.map((status) => [normalize(status), status]),
);

export function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

export function resolveAllowedStatus(value: string): AllowedWorkflowStatus | undefined {
  return NORMALIZED_STATUS_MAP.get(normalize(value));
}

export function allowedProjects(): Set<string> {
  const configured = process.env.JIRA_ALLOWED_PROJECTS ?? "PHX";
  return new Set(
    configured
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean),
  );
}

export function projectKeyFromIssueKey(issueKey: string): string {
  const separator = issueKey.indexOf("-");
  if (separator <= 0) {
    throw new Error(`Invalid Jira issue key: ${issueKey}`);
  }
  return issueKey.slice(0, separator).toUpperCase();
}

export function assertProjectAllowed(issueKey: string): void {
  const projectKey = projectKeyFromIssueKey(issueKey);
  if (!allowedProjects().has(projectKey)) {
    throw new Error(
      `Write denied for project ${projectKey}. Allowed projects: ${Array.from(allowedProjects()).join(", ") || "none"}`,
    );
  }
}

export function assertStatusAllowed(status: string): AllowedWorkflowStatus {
  const resolved = resolveAllowedStatus(status);
  if (!resolved) {
    throw new Error(
      `Workflow transition denied. Allowed target statuses: ${ALLOWED_WORKFLOW_STATUSES.join(", ")}`,
    );
  }
  return resolved;
}

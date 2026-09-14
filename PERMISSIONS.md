# Permission Matrix

`phx-atlassian-mcp` is intentionally deny-by-default for mutations.

| System | Capability | Allowed | Enforcement |
| --- | --- | --- | --- |
| Jira | Search issues | Yes | Tool exposed |
| Jira | Read issue details | Yes | Tool exposed |
| Jira | List projects | Yes | Tool exposed |
| Jira | Read linked Confluence pages | Yes | Tool exposed |
| Jira | Move to Backlog | Yes | Server-side allowlist |
| Jira | Move to To Do | Yes | Server-side allowlist |
| Jira | Move to In Progress | Yes | Server-side allowlist |
| Jira | Move to Ready for Review | Yes | Server-side allowlist |
| Jira | Move to Done | No | Server-side rejection |
| Jira | Move to Closed | No | Server-side rejection |
| Jira | Move to Cancelled | No | Server-side rejection |
| Jira | Move to Rejected | No | Server-side rejection |
| Jira | Move to any unlisted status | No | Server-side rejection |
| Jira | Create issue | No | Tool not registered |
| Jira | Edit issue fields | No | Tool not registered |
| Jira | Add/edit comments | No | Tool not registered |
| Jira | Create issue links | No | Tool not registered |
| Jira | Delete issue | No | No tool exists |
| Confluence | Search | Yes | Tool exposed |
| Confluence | Read page | Yes | Tool exposed |
| Confluence | Read child pages | Yes | Tool exposed |
| Confluence | Read page comments | Yes | Tool exposed |
| Confluence | Create page | No | Tool not registered |
| Confluence | Update page | No | Tool not registered |
| Confluence | Add comments | No | Tool not registered |
| Bitbucket | Any operation | No | Bitbucket tools not registered |

## Jira write scope

Jira workflow writes are limited to projects in `JIRA_ALLOWED_PROJECTS`.

Default:

```text
PHX
```

Example expanded allowlist:

```text
JIRA_ALLOWED_PROJECTS=PHX,LAB
```

The server validates the issue project before requesting available transitions from Jira.

## Workflow behavior

The only mutation tool accepts a target status from this fixed set:

```text
Backlog
To Do
In Progress
Ready for Review
```

For an allowed request the server:

1. Verifies the issue belongs to an allowed project.
2. Reads the issue's current status.
3. Reads the transitions Jira currently permits.
4. Resolves the requested target status to a transition Jira actually offers.
5. Sends the transition request.
6. Re-reads the issue and verifies the resulting status.

No model prompt or IDE rule can widen this permission set. Widening it requires a code change to this repository.

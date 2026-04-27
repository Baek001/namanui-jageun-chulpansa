# OpenClaw Integration Plan

## Decision

BookForge should not be built inside OpenClaw.

BookForge should be an independent product with its own Web UI, API, state machine, manuscript files, and quality loop.

OpenClaw should connect through a lightweight BookForge profile or skill.

OpenClaw can have two roles:

1. Remote control surface.
2. Local AI worker provider.

## Why Not Put Everything In OpenClaw?

OpenClaw is useful as an agent runtime and chat control surface.

BookForge needs:

- Long-lived book project state.
- Manuscript editor UI.
- Chapter version history.
- Quality reports.
- Approval gates.
- Export builders.
- Source and evidence management.

These are product-specific workflows that should live in BookForge.

## Integration Shape

```text
OpenClaw Main Chat
  -> BookForge Profile
  -> BookForge API
  -> BookForge Core
  -> Project files and reports
```

The profile acts as a remote control.

## OpenClaw As Local Worker Provider

When the user wants to avoid direct model API costs, BookForge can package tasks for a local OpenClaw environment.

```text
BookForge Core
  -> task bundle
  -> OpenClaw local provider
  -> user's configured AI account/subscription
  -> result bundle
  -> BookForge validation and state update
```

This mode is different from direct API usage.

BookForge still owns:

- Project state.
- File writes.
- Approval gates.
- Quality decisions.

OpenClaw performs assigned work and returns structured outputs.

## BookForge Profile Responsibilities

Allowed:

- List book projects.
- Show current status.
- Trigger approved workflow commands.
- Summarize review results.
- Ask for human approval.
- Send links or IDs back to the Web UI.

Not allowed:

- Directly mutate manuscript files outside BookForge API.
- Bypass quality gates.
- Bypass approval gates.
- Hold raw OAuth tokens.
- Make final publication uploads without explicit approval.

## Example Commands

```text
"Show my current book status."
"Run another quality review for chapter 3."
"Draft the sample chapter."
"Summarize why chapter 2 failed the quality gate."
"Export the approved manuscript as EPUB."
"Open the final outline in the BookForge UI."
```

## API Endpoints For OpenClaw

Initial endpoints:

```text
GET  /api/projects
GET  /api/projects/{project_id}/status
POST /api/projects/{project_id}/spec/generate
POST /api/projects/{project_id}/debate/run
POST /api/projects/{project_id}/outline/generate
POST /api/projects/{project_id}/chapters/{chapter_id}/draft
POST /api/projects/{project_id}/chapters/{chapter_id}/review
POST /api/projects/{project_id}/chapters/{chapter_id}/revise
POST /api/projects/{project_id}/export
```

Approval endpoints:

```text
POST /api/projects/{project_id}/approvals/book_spec
POST /api/projects/{project_id}/approvals/final_outline
POST /api/projects/{project_id}/approvals/sample_chapter
POST /api/projects/{project_id}/approvals/final_manuscript
```

## Authentication

MVP:

- Local token or API key in `.env`.

Self-hosted:

- User login in BookForge.
- OpenClaw profile uses a scoped API token.

Later:

- OAuth/OIDC for user login.
- Scoped service tokens for agent profiles.

## OpenClaw UX

OpenClaw should return concise status.

Example:

```text
Chapter 3 review finished.

Quality score: 7.6
Decision: revise

Blocking issues:
- Unsupported claim in section 3.2
- Repeats chapter 2 introduction

Next suggested action:
Run revision pass or open the report in BookForge.
```

## Integration Milestones

v0.1:

- No OpenClaw dependency.
- Build BookForge Core and Web UI.

v0.2:

- Add BookForge API.
- Add simple OpenClaw profile command set.
- Add local OpenClaw provider spike if the installed OpenClaw exposes a stable CLI, local server, or task interface.

v0.3:

- Add status streaming.
- Add approval prompts.

v0.4:

- Add OAuth-backed external source connectors.

## Safety Rule

OpenClaw is a channel, not the source of truth.

If OpenClaw and BookForge disagree, BookForge project state wins.

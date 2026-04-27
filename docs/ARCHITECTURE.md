# BookForge Architecture

## Overview

BookForge has three main surfaces:

```text
Web UI
  Human author/editor workspace.

API Server
  Commands, project state, agent runs, review reports, exports.

Core Engine
  Workflows, state machine, agents, quality gates, file operations.
```

OpenClaw and CLI are secondary control surfaces.

```text
OpenClaw Profile
  Talks to BookForge API.

CLI
  Talks to BookForge Core or API for development and automation.
```

## Recommended Stack

Target stack:

```text
Web UI:       Next.js or React
API:          FastAPI
Core:         Python
Workflow:     LangGraph
Model Router: LiteLLM
Schema:       Pydantic
Storage:      Files + SQLite
Export:       Quarto + Pandoc
```

AI runtime should be pluggable. Direct API is only one provider mode.

```text
AI Runtime Providers:
  Local OpenClaw provider
  Local Codex provider
  Paperclip/OAuth worker provider
  Direct model API provider
  Mock provider
```

Why this stack:

- Python is strong for agent workflows, document processing, and export automation.
- LangGraph fits stateful, resumable, human-in-the-loop workflows.
- LiteLLM keeps model providers interchangeable.
- Files keep manuscripts portable and Git-friendly.
- SQLite is enough for local/self-hosted state in the first version.
- FastAPI gives a clean API boundary for Web UI, CLI, and OpenClaw.

## Current Implementation Strategy

The current scaffold is Node.js-based and intentionally lightweight.

It proves:

- Local project creation.
- File-based artifacts.
- Approval gates.
- Mock and OpenAI-backed generation path.
- Basic web and CLI control surfaces.

Do not immediately rewrite the scaffold into the target Python stack. First stabilize the product flow and artifact contracts.

Recommended sequence:

```text
v0.1 Node scaffold
  -> modularize Core actions
  -> define stable artifact and quality schemas
  -> add real model routing
  -> then decide whether LangGraph/Python should replace or wrap the Core
```

If the Core moves to Python later, the project file layout and API contracts should remain stable so existing book projects still work.

## High-Level Components

### BookForge Core

Responsibilities:

- Load and validate book projects.
- Manage state transitions.
- Execute workflow phases.
- Run role-based agents.
- Store outputs as files.
- Enforce approval gates.
- Create quality reports.
- Trigger export builders.

### Workflow Engine

Recommended implementation: LangGraph.

Main workflows:

- Spec workflow.
- Debate workflow.
- Outline workflow.
- Chapter brief workflow.
- Draft workflow.
- Quality gate workflow.
- Editing workflow.
- Export workflow.

### Agent Registry

Stores agent definitions:

- Name.
- Role.
- Goal.
- Allowed tools.
- Input schema.
- Output schema.
- Evaluation criteria.

### Quality Gate Engine

Runs the review loop:

```text
draft
  -> parallel review agents
  -> aggregate findings
  -> score
  -> pass / revise / human_review
```

### Project File Store

Manuscript and planning artifacts are stored as plain files.

```text
books/{book_id}/
  book.yaml
  state.json
  book_spec.md
  final_outline.md
  chapter_briefs/
  manuscript/
  reviews/
  quality_reports/
  evidence_cards/
  exports/
```

### API Server

Exposes commands such as:

- Create project.
- Generate spec.
- Run debate.
- Approve outline.
- Draft chapter.
- Review chapter.
- Export book.
- Fetch project status.

### Web UI

Main human workspace:

- Project list.
- Phase status.
- Approval checkpoints.
- Outline editor.
- Chapter editor.
- Review report viewer.
- Quality score panel.
- Export panel.

The Web UI should be phase-guided. It should not present all commands as equal actions. The primary action should be derived from the current project phase and approval state.

### OpenClaw Profile

Thin integration layer:

- Reads BookForge status through API.
- Sends commands to BookForge.
- Summarizes results back to OpenClaw.
- Does not own manuscript state.
- Does not directly rewrite manuscript files unless routed through BookForge API.

OpenClaw can also be used as a local worker provider when the user wants to run BookForge through an existing AI subscription rather than direct API billing.

### AI Runtime Provider Layer

The provider layer abstracts how agent work is executed.

Provider modes:

- Local agent provider: BookForge sends a task bundle to OpenClaw, Codex, or another local runner.
- OAuth/account-connected provider: BookForge sends work to a provider that supports delegated worker access.
- Direct API provider: BookForge calls model APIs through LiteLLM or provider SDKs.
- Mock provider: deterministic output for tests and demos.

This prevents the book workflow from depending on one billing model.

## Control Flow

```text
User
  -> Web UI or OpenClaw or CLI
  -> BookForge API
  -> BookForge Core
  -> Workflow Engine
  -> Agents and Tools
  -> Files, state, reports
  -> UI/API response
```

## Source Of Truth

The project folder is the source of truth for manuscript artifacts.

SQLite is used for:

- Run history.
- Job status.
- Agent logs.
- UI indexing.
- Optional cache.

The manuscript itself should remain recoverable from files.

## Security Boundary

Agents should not receive raw secrets.

Rules:

- API keys live in `.env` or secret storage.
- OAuth refresh tokens are encrypted server-side when implemented.
- Agents call tool functions, not provider APIs directly.
- OpenClaw profile calls BookForge API, not local files.
- Export/upload actions require explicit approval.

## Future Deployment Modes

MVP:

```text
Local dev server + file projects.
```

Self-hosted:

```text
Docker Compose:
  web
  api
  worker
  sqlite/postgres
```

Later SaaS:

```text
Hosted API
Hosted Web UI
Object storage
Postgres
Job queue
Tenant auth
```

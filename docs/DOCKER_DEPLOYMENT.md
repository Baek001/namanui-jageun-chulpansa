# Docker Deployment

## Goal

BookForge should run as a local self-hosted publishing studio:

```text
Docker container:
  web UI
  local API
  file-based book state
  workflow state machine
  quality gates

Host machine:
  books/ volume
  optional local AI tools
  optional export tools
```

## Quick Start

```bash
docker compose up --build
```

Open:

```text
http://localhost:3100
```

The container listens on port `3000`; Docker Compose maps it to host port `3100` by default.

To change the host port:

```bash
BOOKFORGE_PORT=3200 docker compose up --build
```

## Persistent Data

Book projects are stored in:

```text
./books
```

Inside the container, this is mounted as:

```text
/data/books
```

This keeps manuscripts, samples, quality reports, and exports outside the container image.

## Configuration

The project configuration is mounted read-only:

```text
./config -> /app/config
```

Runtime environment:

```text
BOOKFORGE_BOOKS_ROOT=/data/books
BOOKFORGE_CONFIG_ROOT=/app/config
BOOKFORGE_MODEL_PROVIDER=mock
BOOKFORGE_MOCK_MODEL=deterministic-mock
```

## Direct API Mode

Direct model API usage is optional.

```bash
BOOKFORGE_MODEL_PROVIDER=openai \
OPENAI_API_KEY=... \
OPENAI_MODEL=gpt-5 \
docker compose up --build
```

The preferred MVP default remains `mock` until local agent adapters are wired.

## Local Agent Integration Boundary

BookForge in Docker should not own a user's OpenClaw, Codex, or Claude Code session.

The recommended boundary is:

```text
BookForge container
  -> writes task bundle under books/{project}/agent_tasks/{run_id}__{agent_id}__{template}/
  -> exposes local API for run state

Host-side adapter
  -> watches or polls task bundles
  -> calls OpenClaw/Codex/Claude Code/local worker
  -> writes result bundle

BookForge container
  -> validates result bundle
  -> updates project state
```

This lets BookForge connect to different agent tools without embedding their credentials, sessions, or UI automation inside the container.

## Why This Works For OpenClaw, Codex, And Claude Code

The Docker container gives BookForge a stable local server and file contract.

OpenClaw, Codex, or Claude Code can later be attached through one of these adapter shapes:

- CLI adapter: BookForge creates a task bundle; host script invokes a local CLI.
- HTTP adapter: BookForge calls a local worker endpoint exposed by the tool.
- Watch-folder adapter: a host process watches `books/` and writes outputs back.
- Plugin/OAuth adapter: a supported service receives a task and returns a result bundle.

BookForge keeps:

- project state
- manuscript files
- approval gates
- quality reports
- exports

## Export Downloads

After `export`, the web API serves:

```text
/api/projects/{project_id}/exports/book.md
/api/projects/{project_id}/exports/manuscript_full.md
/api/projects/{project_id}/exports/book.html
/api/projects/{project_id}/exports/book.pdf
/api/projects/{project_id}/exports/book.epub
/api/projects/{project_id}/exports/book.docx
/api/projects/{project_id}/exports/metadata.yaml
```

The built-in PDF/EPUB/DOCX builders are dependency-free MVP builders. A later production publishing preset can swap them for Quarto/Pandoc without changing the BookForge project state.

The external agent keeps:

- model account/session
- long-running generation work
- tool-specific execution details

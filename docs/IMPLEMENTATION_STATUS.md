# BookForge Implementation Status

Last updated: 2026-04-25

## Current Stage

```text
Status: v0.2 local product MVP
Primary UI: Docker/local web app
Runtime: Node.js
Default engine: deterministic mock
Optional engines: local-agent task bundles, OpenAI Responses API
```

## Implemented

- Local web app at `http://localhost:3000`.
- Docker web app at `http://localhost:3100`.
- First-run UI for exactly two book types: `전문서적`, `대학교재`.
- Conversation-first book direction flow.
- 3-page sample checkpoint before full production.
- Whole-book production loop after the sample chapter is approved.
- Built-in Markdown, HTML, PDF, EPUB, DOCX, and metadata export artifacts.
- File-based book project creation under `books/`.
- Core workflow actions:
  - `spec`
  - `sample`
  - `harness`
  - `debate`
  - `outline`
  - `briefs`
  - `draft`
  - `review`
  - `revise`
  - `chapter_loop`
  - `book_loop`
  - `collect_agent_results`
  - `export`
- Approval gates:
  - Book spec before debate.
  - Sample direction before harness.
  - Harness plan and final outline before chapter production.
  - Sample chapter before whole-book production.
  - Final manuscript before export.
- Agent definition files under `config/agents/`.
- Prompt templates under `config/prompts/`.
- Adapter presets under `config/adapters/presets.json`.
- Model adapter under `packages/core/modelClient.mjs`.
- OpenAI Responses API integration path behind environment variables.
- Local-agent task bundle path behind `BOOKFORGE_MODEL_PROVIDER=local_agent`.
- Server-backed runtime settings page at `/ai-connections.html`.
- Runtime settings API:
  - `GET /api/runtimes`
  - `PUT /api/runtimes`
  - `POST /api/runtimes/test`
- Local non-secret runtime selection file: `config/runtime.local.json`.
- Host-side result collector for external worker `output/result.md`.
- Generic host adapter in `bin/bookforge-local-agent-adapter.mjs`.
- Mock fallback so the app runs without API keys.
- CLI in `bin/bookforge.mjs`.
- Quality report aggregation from reviewer Markdown in `packages/core/qualityGate.mjs`.
- Run history returned by Core and shown in the Web UI inspector.
- Node test coverage for workflow gates, exports, local-agent bundles, and result collection.

## Remaining Before Calling It Product-Grade

- Real OpenClaw profile or plugin package.
- Real Paperclip OAuth bridge.
- Real source/evidence integrations such as Zotero, OpenAlex, Semantic Scholar, or local PDFs.
- Production-grade typography pipeline with Quarto/Pandoc.
- Human diff editor for accepting/rejecting reviewer changes.
- Persistent database index for multi-user hosted deployments.
- Streaming/progress events for long-running external workers.

## Current Run Command

```bash
npm run dev
```

## Current Docker Command

```bash
docker compose up --build
```

## Current Test Command

```bash
npm test
```

## Optional Local-Agent Mode

```bash
BOOKFORGE_MODEL_PROVIDER=local_agent
BOOKFORGE_ADAPTER_PRESET=codex
npm run dev
```

Collect external results:

```bash
npm run bookforge -- collect_agent_results
```

## Optional OpenAI Mode

```bash
BOOKFORGE_MODEL_PROVIDER=openai
OPENAI_API_KEY="..."
OPENAI_MODEL="gpt-5"
npm run dev
```

## Recommended Next Work

1. Package the OpenClaw/Codex profile that controls BookForge through its API.
2. Add real evidence/source cards and citation checking.
3. Replace the lightweight built-in PDF generator with a Quarto/Pandoc export path.
4. Split the large Core workflow file into smaller workflow modules.
5. Add progress streaming for long-running generation and review loops.

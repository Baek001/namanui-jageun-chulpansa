# BookForge AI Runtime Strategy

## Core Decision

BookForge should not require paid model API usage as the only path.

Default product direction:

```text
Bring Your Own AI / Bring Your Own Agent first.
Direct API second.
OAuth/source connectors third.
```

The reason is practical:

- Many users already pay for AI subscriptions.
- API usage can create double billing.
- Local agent tools can already perform long-form writing and review work.
- BookForge's unique value is orchestration, state, quality gates, and publishing artifacts, not reselling tokens.

## Runtime Modes

### Mode 1: Local Agent Provider

This is the preferred low-cost path.

BookForge delegates work to an installed local agent environment such as:

- OpenClaw.
- Codex CLI/Desktop.
- Claude Code-like local agent tools, when legally available.
- Other local agent runners that expose a CLI, HTTP endpoint, plugin, or task folder.

Flow:

```text
BookForge Core
  -> creates task bundle
  -> calls local agent provider
  -> provider runs with user's existing AI subscription or configured account
  -> provider writes result bundle
  -> BookForge validates output
  -> BookForge updates project state
```

The local agent provider is treated as an external worker. It does not own book state.

### Mode 2: OAuth / Account-Connected Provider

Use this when a tool explicitly supports OAuth or account-based delegation.

Possible uses:

- Connect a user's OpenClaw account or workspace.
- Connect a Paperclip-style agent operations system.
- Connect source tools such as Google Drive, Notion, GitHub, Zotero, or reference managers.

Important boundary:

OAuth is only valid when the upstream service supports that use case. BookForge should not pretend that every AI subscription can be used as a model API through OAuth.

### Mode 3: Direct Model API Provider

This is optional.

Use direct APIs when:

- The user wants reliable automation.
- The user is running BookForge as a hosted/team product.
- The provider's subscription does not allow programmatic agent delegation.
- A phase needs predictable structured output.
- The user accepts API billing.

Direct API providers can include:

- OpenAI API.
- Anthropic API.
- Gemini API.
- Local OpenAI-compatible servers.
- LiteLLM-compatible providers.

## Provider Interface

Every runtime provider should implement the same contract:

```text
prepare(task)
submit(task_bundle)
wait_or_poll(run_id)
collect_outputs(run_id)
cancel(run_id)
```

Task bundle:

```text
books/{project_id}/agent_tasks/{run_id}__{agent_id}__{template}/
  task.json
  instructions.md
  input_artifacts/
    prompt.md
  expected_output_schema.json
  output/
```

Output bundle:

```text
output/result.md
output/result.json
output/notes.md
output/errors.json
```

This lets BookForge use local agents, OAuth-connected workers, or direct APIs without changing the book workflow.

## Docker Boundary

In Docker mode, BookForge owns the web UI, local API, file state, quality gates, and export orchestration.

Local agent tools should normally run on the host machine and connect through an adapter contract:

```text
BookForge Docker container
  -> task bundle in mounted books/ volume or local API
Host adapter
  -> OpenClaw / Codex / Claude Code / Paperclip-style worker
  -> result bundle
BookForge Docker container
  -> validate output
  -> update state
```

This avoids putting user AI sessions, cookies, OAuth tokens, or local developer tools inside the BookForge container.

In the current MVP, the host adapter writes `output/result.md` and BookForge imports it with:

```bash
npm run bookforge -- collect_agent_results
```

The Web UI exposes the same import as `외부 AI 결과 수집`.

## OpenClaw Provider Shape

OpenClaw should be callable as a worker, not just as a chat window.

Preferred integration:

```text
BookForge Core
  -> OpenClaw Provider Adapter
  -> OpenClaw profile/CLI/local server
  -> user's configured AI account
  -> task result
  -> BookForge quality gate
```

Example:

```text
BookForge asks:
  Review chapter 1 against this quality rubric.

OpenClaw worker returns:
  reviews/ch01/v1_editorial.md
  structured findings JSON
```

BookForge then decides whether the chapter passes. OpenClaw does not directly approve the chapter.

## Paperclip-Style Provider Shape

If Paperclip or a similar system provides OAuth/account-connected workers, BookForge can use it as an agent operations layer.

Flow:

```text
BookForge task
  -> Paperclip provider
  -> selected worker/agent account
  -> output bundle
  -> BookForge validation and state update
```

Paperclip-style systems are useful for:

- Agent selection.
- Worker status.
- Task queue.
- OAuth/account connection.
- Long-running runs.

BookForge should still keep:

- Project state.
- Manuscript files.
- Approval gates.
- Quality reports.
- Export artifacts.

## What Not To Do

Do not build the product around hidden browser automation of paid AI chat websites.

Avoid:

- Scraping private web sessions.
- Bypassing provider billing or rate limits.
- Storing user login cookies.
- Pretending consumer subscriptions are official APIs.
- Making a public product depend on brittle UI automation.

For a personal local prototype, a user-controlled browser or local agent session can be an adapter. For a public tool, use only supported integration paths.

## Cost Strategy

Default low-cost execution:

```text
spec/debate/outline:
  local agent provider

draft/review/revise:
  local agent provider

source lookup:
  free/open sources first

export:
  local Quarto/Pandoc

direct API:
  optional fallback
```

Use direct API only when:

- The local provider is unavailable.
- Structured output repeatedly fails.
- The user explicitly switches provider mode.

## UX Requirement

The settings screen should let the user choose:

```text
AI runtime:
  Local OpenClaw
  Local Codex
  Paperclip/OAuth worker
  Direct API
  Mock
```

Each option should show:

- Cost model.
- Reliability level.
- Required setup.
- Privacy implications.
- Whether it can run unattended.

## Implemented Runtime Settings MVP

The local web app now exposes a server-backed runtime connection page:

```text
GET  /api/runtimes
PUT  /api/runtimes
POST /api/runtimes/test
```

The UI is served at:

```text
http://localhost:3000/ai-connections.html
```

Runtime choices are saved to:

```text
config/runtime.local.json
```

This file is intentionally local-only and ignored by git. It may store provider choice, model name, adapter preset, strict-mode preference, and role assignment. It must not store raw API keys, OAuth tokens, cookies, or passwords.

The current provider mapping is:

```text
Demo Runtime        -> BOOKFORGE_MODEL_PROVIDER=mock
OpenAI API          -> BOOKFORGE_MODEL_PROVIDER=openai, OPENAI_MODEL from runtime config, OPENAI_API_KEY from server env
OpenClaw Local      -> BOOKFORGE_MODEL_PROVIDER=local_agent, BOOKFORGE_LOCAL_AGENT_NAME=openclaw-local
Local Agent CLI     -> BOOKFORGE_MODEL_PROVIDER=local_agent, BOOKFORGE_LOCAL_AGENT_NAME=codex-local
Paperclip OAuth     -> BOOKFORGE_MODEL_PROVIDER=local_agent, BOOKFORGE_LOCAL_AGENT_NAME=paperclip-oauth
```

`POST /api/runtimes/test` runs a dry validation by default. OpenAI live tests are opt-in because they make a real API request and can incur cost. Local-agent tests validate the adapter preset and task-bundle path; the external worker still runs outside BookForge.

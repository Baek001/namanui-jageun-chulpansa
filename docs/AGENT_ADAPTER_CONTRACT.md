# Agent Adapter Contract

BookForge does not need to embed OpenClaw, Codex, Claude Code, or Paperclip inside the web app.

Instead, BookForge writes stable task bundles that a host-side adapter can consume.

## Task Bundle Location

```text
books/{project_id}/agent_tasks/{run_id}__{agent_id}__{template}/
  task.json
  instructions.md
  expected_output_schema.json
  input_artifacts/
    prompt.md
  output/
    README.md
```

The external worker should write:

```text
output/result.md
output/result.json    optional
output/notes.md       optional
```

## Provider Mode

```bash
BOOKFORGE_MODEL_PROVIDER=local_agent
BOOKFORGE_LOCAL_AGENT_NAME=openclaw-local
```

By default, BookForge creates the task bundle and continues with deterministic fallback output. This keeps the MVP usable even before an adapter is installed.

For strict adapter mode:

```bash
BOOKFORGE_LOCAL_AGENT_STRICT=1
```

Strict mode creates the task bundle and stops, so the adapter must produce the result before BookForge can continue.

## Adapter Responsibilities

An adapter may be:

- CLI adapter: invoke a local command such as OpenClaw, Codex, or Claude Code.
- Watch-folder adapter: monitor `books/*/agent_tasks`.
- HTTP adapter: bridge BookForge task bundles to a local worker service.
- OAuth worker adapter: send the task to a supported Paperclip-style worker service.

The adapter owns:

- model account/session
- tool-specific execution
- long-running generation details

BookForge owns:

- project state
- approval gates
- manuscript files
- quality reports
- exports

## Minimal Adapter Algorithm

```text
watch books/*/agent_tasks/*
  -> read task.json
  -> read input_artifacts/prompt.md
  -> run external AI worker
  -> write output/result.md
  -> write output/notes.md if needed
```

BookForge imports `output/result.md` into the target artifact with `collect_agent_results`.

## Generic Host Adapter

This repository includes:

```bash
bookforge-local-agent-adapter
```

Run once:

```bash
BOOKFORGE_ADAPTER_PRESET=codex \
npm exec -- bookforge-local-agent-adapter --once
```

Watch continuously:

```bash
BOOKFORGE_ADAPTER_PRESET=codex \
npm exec -- bookforge-local-agent-adapter --watch
```

Available example presets live in:

```text
config/adapters/presets.json
```

Current preset keys:

```text
codex
openclaw
claude-code
paperclip-oauth
```

You can bypass presets with a direct command:

```bash
BOOKFORGE_ADAPTER_COMMAND="your-local-agent-command" \
npm exec -- bookforge-local-agent-adapter --once
```

The command receives environment variables:

```text
BOOKFORGE_TASK_DIR
BOOKFORGE_TASK_JSON
BOOKFORGE_PROMPT_PATH
BOOKFORGE_RESULT_PATH
BOOKFORGE_NOTES_PATH
```

The command must write the main result to:

```text
$BOOKFORGE_RESULT_PATH
```

After the external worker writes `output/result.md`, import the result back into the project:

```bash
npm run bookforge -- collect_agent_results --project {project_id}
```

The Web UI exposes the same action as `외부 AI 결과 수집`.

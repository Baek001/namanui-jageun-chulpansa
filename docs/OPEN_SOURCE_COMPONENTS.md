# Open Source Components Strategy

## Principle

Use open source projects as components, adapters, and references.

Do not copy unclear or leaked proprietary code into BookForge.

## Component Categories

### Direct Dependencies

These can be used as normal project dependencies.

```text
LangGraph
  Stateful agent workflows and human-in-the-loop control.

LiteLLM
  Model provider abstraction and routing.

FastAPI
  API server.

Pydantic
  Schema validation.

SQLite / Postgres
  Local and hosted project state.

Quarto
  Book publishing structure.

Pandoc
  Markdown conversion to EPUB, PDF, DOCX.
```

### Adapter Integrations

These should be connected through APIs or profiles.

```text
OpenClaw
  Chat control surface through BookForge profile.

Paperclip
  Optional external agent operations dashboard later.
  Potential OAuth/account-connected worker provider if it exposes stable task submission and result collection.

Open WebUI
  Optional chat UI integration later.

Zotero
  Reference library and BibTeX workflow.

OpenAlex
  Scholarly metadata lookup.

Semantic Scholar
  Paper search and citation metadata.

Langfuse / Phoenix
  Agent tracing and evaluation observability.
```

### Reference Projects

These should be studied for ideas, not blindly copied.

```text
Novel Engine
  Phase-gated book production and human approval ideas.

OpenDraft
  Academic drafting and citation verification ideas.

OpenWrite
  Writing UI and project workspace ideas.

AI Book Generator
  Export automation and KDP-oriented artifact ideas.

Manubot
  Git-based scholarly manuscript publishing ideas.

Jupyter Book / Quarto
  Textbook and technical book structure.
```

## Claude Code Pattern Use

Claude Code source code should not be copied.

Patterns to reimplement:

- Project instruction files.
- Subagents.
- Slash commands.
- Hooks.
- Permission model.
- MCP-style tool boundaries.
- Session summaries.
- Streaming logs.
- Diff-style review.

BookForge equivalent:

```text
CLAUDE.md                 -> BOOKFORGE.md / book_spec.md / style_guide.md
subagents                 -> editorial role agents
slash commands            -> book workflow commands
hooks                     -> quality and export hooks
tool permissions          -> manuscript and source tool policy
MCP tools                 -> source/export/reference tools
session transcript        -> decision_log.md and run logs
```

## Paperclip Pattern Use

Paperclip should inform:

- Agent team dashboard.
- Task ownership.
- Agent status and heartbeat.
- Budget/cost limits.
- Long-running agent coordination.
- Conflict handling when one agent owns a task.

BookForge should not depend on Paperclip for core book state.

Optional later integration:

```text
BookForge creates tasks
  -> Paperclip manages external agents
  -> Agents return reports
  -> BookForge imports reports into quality loop
```

If Paperclip supports OAuth-style account delegation, treat it as a worker provider rather than the BookForge source of truth.

## License Safety

Before copying code from any open source project:

1. Check license.
2. Check dependency compatibility.
3. Prefer API integration over source copying.
4. Rewrite small ideas from scratch when licensing is unclear.
5. Keep attribution when required.

Recommended project license candidates:

- Apache-2.0 for broad adoption.
- MIT for maximum simplicity.
- AGPL plus commercial license if hosted-service protection is important.

Default recommendation:

```text
Apache-2.0 for the first public version.
```

## Do Not Use

Do not include:

- Leaked proprietary source.
- Decompiled app internals.
- Non-public prompts.
- License-unclear code snippets.
- Secrets or credentials from local tools.

## First Implementation Rule

Build the minimal BookForge Core first.

Integrate OpenClaw, Paperclip, and other external systems only after the book project format and quality loop work locally.

Because direct API cost is a user concern, the first provider roadmap should prioritize a local agent provider before heavy hosted API infrastructure.

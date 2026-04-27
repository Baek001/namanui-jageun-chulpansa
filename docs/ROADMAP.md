# BookForge Roadmap

## Current Product Stage

BookForge is at v0.1 scaffold stage.

It can create local project files and run a deterministic book workflow, but it is not yet a professional publishing product.

## Immediate Direction

The next work should improve clarity before adding more integrations.

Priority order:

1. Make the product understandable.
2. Make the orchestration engine modular.
3. Make the quality loop stricter.
4. Add local agent provider routing.
5. Add export formats and source integrations.
6. Add OpenClaw as a remote control surface.

## v0.1.1: Product Clarity Pass

Goal:

Make the app understandable to a first-time user.

Deliver:

- Replace equal command bar with phase-guided next action.
- Add AI editorial interview instead of fixed sample project title.
- Add 3-page sample preview and feedback loop.
- Add professional/textbook-only book type guardrails.
- Show current gate and next requirement.
- Show files created by each action.
- Fix broken Korean text in UI and docs.
- Add empty states that explain what the user should do next.

Acceptance:

- A user can create a project and understand the next step without reading source code.
- A user can discuss a book idea with the AI editor and approve a 3-page sample before the production harness starts.

## v0.1.2: Core Modularization

Goal:

Make the engine easier to extend.

Deliver:

- Split `bookProject.mjs` into phase modules.
- Add action result objects.
- Add artifact manifest per project.
- Add stricter validation for action inputs and outputs.
- Add tests for every gate and action.

Acceptance:

- Each workflow phase can be tested independently.

## v0.1.3: Quality Loop Upgrade

Goal:

Make revision loops act like an editorial system.

Deliver:

- Structured reviewer output schema.
- Revision plan artifact.
- Stop conditions for repeated failures.
- Chapter version comparison summary.
- Manual override notes for non-blocking issues.

Acceptance:

- A weak chapter produces a clear revision plan and a new version without overwriting the old version.

## v0.2: Bring-Your-Own-Agent Runtime

Goal:

Move beyond deterministic mock output without forcing direct API billing.

Deliver:

- Model settings UI or visible environment status.
- Provider abstraction for local agents, OAuth/account-connected workers, direct APIs, and mock mode.
- Local OpenClaw provider spike.
- Per-agent model policy.
- Budget and iteration limits.
- Run logs with provider/model/cost fields when available.

Acceptance:

- The same project can run with mock mode or a local agent provider.
- Direct API mode remains optional.

## v0.3: Evidence And Source System

Goal:

Support professional and textbook-grade manuscripts.

Deliver:

- Evidence card schema.
- Source library folder.
- Citation requirements per chapter.
- Fact-check gate tied to evidence cards.
- Optional Zotero/OpenAlex/Semantic Scholar adapters.

Acceptance:

- A factual claim can be linked to an evidence card and reviewed by the quality gate.

## v0.4: Export Studio

Goal:

Produce publishing-ready artifacts.

Deliver:

- Quarto/Pandoc integration.
- EPUB, PDF, DOCX export.
- Metadata editor.
- Export validation report.
- Template profiles for professional book, textbook, and ebook.

Acceptance:

- Approved Markdown manuscript can be exported to at least EPUB and PDF with a validation report.

## v0.5: OpenClaw Profile

Goal:

Use OpenClaw as a remote control surface.

Deliver:

- BookForge API command set.
- Project status endpoint.
- Approval prompts.
- Run summary responses.
- OpenClaw profile documentation.

Acceptance:

- A user can ask OpenClaw to show project status, run a review, and summarize why a chapter failed.

## Later

- Paperclip-style agent operations dashboard.
- Multi-project templates.
- Team collaboration.
- Hosted deployment mode.
- KDP or external publishing upload support.

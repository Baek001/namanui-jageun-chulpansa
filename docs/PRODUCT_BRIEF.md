# BookForge Product Brief

## Product Summary

BookForge is a self-hosted AI publishing studio for planning, drafting, reviewing, editing, and exporting professional books, textbooks, and practical ebooks.

The product is not just a chat interface. It is a structured book production system with project state, role-based agents, quality gates, human approvals, manuscript versioning, evidence tracking, and export builders.

## Core Decision

BookForge will be built as a new standalone product.

OpenClaw will not be the main product shell. Instead, OpenClaw will be connected later through a lightweight BookForge-specific profile or skill that talks to the BookForge API.

```text
BookForge Web UI
  - main author/editor workspace

BookForge Core
  - state machine
  - agent orchestration
  - quality loop
  - manuscript files
  - export pipeline

OpenClaw BookForge Profile
  - chat remote control
  - status lookup
  - command execution
  - summary delivery
```

## Target Users

Primary users:

- Independent authors creating professional ebooks.
- Instructors and lecturers creating course material.
- Consultants creating expert guides and white papers.
- Small publishers producing structured non-fiction books.

Initial target:

- Professional non-fiction and university-textbook-style books.
- University major textbooks.
- Graduate-level or professional training material.

Not the first target:

- Fiction writing.
- Fully automated mass-content farms.
- One-click books with no human approval.
- Casual low-rigor ebooks.

## User Pain

Users can ask an LLM to write a chapter, but they do not get a reliable publishing process.

Common failures:

- Loose book concept.
- Weak target-reader definition.
- Repetitive chapters.
- No evidence tracking.
- No chapter-level quality control.
- No approval gates.
- No stable manuscript state.
- No repeatable export process.

BookForge solves this by treating a book like a managed production project.

## Product Principles

1. The system should produce files the user owns.
2. The product should not trap manuscripts inside a database.
3. Agents should have narrow roles and clear outputs.
4. Quality should be enforced by gates, not by vague prompts.
5. Human approval should control important transitions.
6. OpenClaw should be a control surface, not the source of truth.
7. The first version should prove one excellent sample chapter before automating a whole book.
8. Users should be able to bring their own AI subscription or local agent environment instead of being forced into direct API billing.
9. The user should shape the book through an AI editorial conversation before the production harness starts.
10. A 3-page sample should be approved before full book production begins.

## MVP Success Criteria

The first successful MVP can:

- Create a book project.
- Generate `book_spec.md`.
- Run an AI editorial interview.
- Generate and refine a 3-page sample.
- Create a harness plan for writer, reviewer, verifier, and revision agents.
- Run a short multi-agent planning debate.
- Generate `final_outline.md`.
- Generate chapter briefs.
- Draft one sample chapter.
- Run quality review agents.
- Revise the chapter at least once.
- Produce a review report.
- Export a Markdown manuscript.

## Non-Goals For MVP

- SaaS billing.
- Team collaboration.
- Full OAuth integration.
- Full Paperclip integration.
- Full OpenClaw integration.
- Automatic KDP upload.
- Fully automated book completion without human approval.
- Direct API-only execution as the only supported AI runtime.

## Product Positioning

Short version:

```text
Claude Code for publishing.
```

More precise version:

```text
A self-hosted AI editorial studio that turns book ideas into reviewed, versioned, export-ready manuscripts.
```

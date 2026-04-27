# BookForge MVP Plan

## MVP Goal

Build the smallest usable BookForge that proves the core idea:

```text
A serious book idea can become an approved 3-page sample and a reviewed, revised, quality-scored chapter through a repeatable agent workflow.
```

## Default Product Direction

BookForge is a standalone product.

OpenClaw integration comes after the core workflow works.

## v0.1 Scope

### Must Have

- Create book project.
- Store project files.
- Run an AI editorial interview.
- Restrict MVP book type to professional books and university-level textbooks.
- Generate a 3-page sample before full production.
- Let the user discuss and revise the sample direction.
- Generate `book_spec.md`.
- Generate `reader_profile.md`, `style_guide.md`, and `rigor_profile.md`.
- Generate `harness_plan.md`.
- Run planning debate.
- Generate `final_outline.md`.
- Generate chapter briefs.
- Draft one chapter.
- Run multi-agent quality review.
- Generate revision plan.
- Create revised chapter version.
- Generate quality report.
- Export Markdown.

### Should Have

- Minimal Web UI.
- CLI commands for core workflows.
- Basic run logs.
- Manual approval flags.

### Won't Have Yet

- OpenClaw integration.
- Paperclip integration.
- OAuth source connectors.
- Full PDF/EPUB/DOCX export.
- Multi-user auth.
- SaaS deployment.
- Direct API-only execution as the product default.

## v0.1 User Flow

```text
1. User starts a conversation with the AI editor.
2. User describes the professional book or university-level textbook idea.
3. AI editor asks follow-up questions about reader, level, tone, rigor, and use case.
4. BookForge summarizes the book direction.
5. User approves or corrects the direction.
6. BookForge generates a 3-page sample.
7. User discusses tone, density, difficulty, examples, exercises, and structure.
8. BookForge updates style and rigor settings.
9. User approves the sample direction.
10. BookForge creates a harness plan and final outline.
11. User approves the harness and outline.
12. BookForge drafts chapter 1.
13. Review and verifier agents evaluate chapter 1.
14. Quality gate decides pass, revise, blocked, or human review.
15. If revise, BookForge creates the next version and repeats review.
16. User reviews approved chapter and production status.
```

## Revised UX Requirement

The MVP should not feel like a raw automation console.

The current command-list shape is useful for development, but the product UX should become a guided workspace:

```text
current phase
  -> current artifact
  -> next recommended action
  -> gate status
  -> quality status
  -> files written
```

The user should not need to know the internal command sequence before using the product.

Default next-action rules:

```text
created                 -> Start AI editorial interview
interviewing            -> Answer next book-shaping question
direction_summarized    -> Approve or correct book direction
sample_drafting         -> Generate 3-page sample
sample_reviewing        -> Discuss tone, level, density, and structure
sample_revision_needed  -> Regenerate or revise sample
sample_approved         -> Create harness plan and final outline
harness_planning        -> Approve harness and outline
outline_approved        -> Generate chapter briefs
briefing                -> Draft chapter 1
drafted                 -> Run verifier agents
revision_needed         -> Revise chapter 1
reviewing/pass          -> Approve chapter 1
sample chapter approved -> Continue chapter production or export Markdown
```

## CLI Commands

Initial commands:

```text
bookforge init
bookforge spec
bookforge debate
bookforge outline
bookforge approve book_spec
bookforge approve final_outline
bookforge brief ch01
bookforge draft ch01
bookforge review ch01
bookforge revise ch01
bookforge export markdown
bookforge status
```

## Web UI Screens

Minimal screens:

- Project dashboard.
- AI editorial conversation.
- 3-page sample preview.
- Sample feedback and direction lock.
- Book spec viewer/editor.
- Harness plan viewer.
- Debate results.
- Outline viewer/editor.
- Chapter workspace.
- Quality report panel.
- Export panel.

## Technical Milestones

### Milestone 1: Project Format

Deliver:

- `book.yaml`.
- `state.json`.
- File layout creation.
- Project loader.

### Milestone 2: Agent Registry

Deliver:

- Agent role definitions.
- Prompt templates.
- Input/output schemas.

### Milestone 3: Spec And Outline

Deliver:

- Spec generation.
- Debate runner.
- Outline generator.
- Approval gate.

### Milestone 4: Chapter Draft And Review

Deliver:

- Chapter brief generator.
- Draft generator.
- Review agents.
- Aggregated quality report.
- Revision plan.

### Milestone 5: Minimal UI

Deliver:

- Local Web UI.
- Project state view.
- Artifact viewer.
- Approval controls.
- Run status.
- Phase-guided next action.
- Setup form for title, topic, target reader, purpose, and book type.
- Conversational onboarding before the setup form is exposed.
- 3-page sample preview and feedback controls.
- Harness status view showing writer, reviewer, verifier, and revision agents.
- Clear empty states and Korean UI text.

### Milestone 6: Export

Deliver:

- Full Markdown manuscript build.
- Basic export report.

## Acceptance Tests

### Project Creation

Given a topic and book type, BookForge creates a project folder with valid `book.yaml` and `state.json`.

### Conversational Direction

Given a user's rough idea, BookForge captures target reader, level, tone, rigor, and book type before generating the book spec.

### Sample Direction Lock

Given an approved interview summary, BookForge generates a 3-page sample and blocks the production harness until the user approves or revises the sample direction.

### Approval Gate

Given an unapproved outline, BookForge refuses to draft all chapters.

### Quality Loop

Given a weak chapter draft, review agents produce blocking issues and a revision plan.

### Verification Loop

Given a chapter that fails the verifier rubric, BookForge repeats revision until the chapter passes, reaches loop limits, or escalates to human review.

### Revision

Given a revision plan, BookForge creates a new chapter version without overwriting the previous version.

### Export

Given an approved sample chapter, BookForge creates a Markdown export.

## v0.2 Scope

- FastAPI command API.
- OpenClaw BookForge profile.
- Local OpenClaw provider adapter spike.
- Status summaries.
- Trigger commands from chat.
- Better Web UI.

## v0.3 Scope

- Quarto/Pandoc EPUB/PDF/DOCX.
- Evidence cards.
- Zotero/OpenAlex/Semantic Scholar integration.
- Citation quality gate.

## Biggest Risks

### Risk: Agent loops become expensive

Mitigation:

- Max iterations.
- Per-agent budget.
- Human escalation.

### Risk: Output feels generic

Mitigation:

- Strong book spec.
- Style guide.
- Reader profile.
- Human-approved sample chapter.

### Risk: Quality gate becomes subjective

Mitigation:

- Structured criteria.
- Blocking issue definitions.
- Persistent reports.

### Risk: Product becomes too broad

Mitigation:

- Start with one sample chapter.
- Delay OAuth and Paperclip.
- Keep OpenClaw as remote control only.

### Risk: User cannot understand the workflow

Mitigation:

- Use a guided next-action workspace.
- Show the current gate and why the next phase is locked.
- Summarize agent output before showing raw artifacts.
- Make run history and written files visible.

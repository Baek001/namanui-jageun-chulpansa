# BookForge Product UX

## UX Goal

BookForge should feel like an AI editorial studio, not a chat-only toy and not a raw command dashboard.

The user should always understand:

- What book project is open.
- Which phase the project is in.
- What artifact is currently being worked on.
- What the system needs from the human.
- Why an agent run passed, failed, or needs another revision.
- Where the manuscript files are stored.

## Primary Mental Model

BookForge is a guided editorial conversation that turns into a production line:

```text
Idea Conversation
  -> Editorial Interview
  -> 3-Page Sample
  -> Style And Difficulty Agreement
  -> Harness Plan
  -> Outline
  -> Chapter Briefs
  -> Chapter Drafts
  -> Verification And Revision Loop
  -> Full Manuscript
  -> Export
```

The UI should not show every command as equal. It should guide the user through conversation, sample approval, and then the current production phase.

## Product Scope

MVP book types are intentionally limited to exactly two:

- Professional books.
- University textbooks.

Graduate-level course material is treated as a university textbook. Technical manuals and expert guides are treated as professional books.

The product should not present itself as a generic ebook generator.

## Main Screens

### 1. Project Home

Purpose:

- Show all book projects.
- Start or resume an AI editorial conversation.
- Show current phase, last run, and blocking work.

Primary actions:

- Start book interview.
- Open project.
- Continue next step.

Do not make this a marketing page. The first screen is a workspace.

### 2. Editorial Interview

Purpose:

- Help the user decide what serious book they are making before files and agents appear.

The interface should be conversational. It can show structured chips and fields, but the main action is dialogue with the AI editor.

Topics to resolve:

- Title or working title.
- Field or discipline.
- Target reader.
- Reader prerequisite level.
- Desired difficulty.
- Book purpose.
- Use case: self-study, university course, professional reference, workshop material.
- Tone.
- Evidence and citation rigor.
- Example and exercise density.
- Reference materials, optional.

Output:

```text
reader_profile.md
book_intent.md
style_direction.md
rigor_profile.md
book_spec.md
style_guide.md
```

Human checkpoint:

- The user must approve the interview summary before sample generation.

### 3. Three-Page Sample Preview

Purpose:

- Show the user what the book will feel like before the full production harness starts.

Required sample contents:

- Opening section.
- One core concept explanation.
- One example or case.
- One table, diagram description, or structured comparison if relevant.
- One exercise, checklist, or reflection prompt for textbook mode.

Output:

```text
samples/sample_01.md
sample_review.md
```

Human checkpoint:

- The user must discuss and approve the sample direction before full outline and chapter production.

### 4. Sample Discussion And Direction Lock

Purpose:

- Let the user adjust level, tone, density, and teaching style.

The UI should ask:

- Is the level too easy, too hard, or correct?
- Is the tone too academic, too casual, or correct?
- Should the book include exercises, cases, diagrams, citations, checklists, or summaries?
- Should the book be more theoretical or more practical?

Outputs updated:

```text
style_guide.md
rigor_profile.md
reader_profile.md
```

### 5. Planning Board

Purpose:

- Make multi-agent debate understandable.
- Turn the approved sample direction into a production harness.

Layout:

```text
Decision Question
  Market view
  Reader view
  Critic view
  Editor view
  Fact/evidence view

Conflict Summary
Decision
Impact On Outline
```

The user should not read long transcripts by default. The UI should show a compact decision log first, with full debate rounds behind details.

### 6. Harness And Outline Studio

Purpose:

- Confirm the book structure and the agent harness before chapter drafting.

Must show:

- Chapters.
- Sections.
- Chapter objective.
- Reader prerequisite.
- Core message.
- Required examples.
- Required evidence.
- Repetition risk.
- Assigned agents.
- Quality rubric.
- Max revision loop count.

Human checkpoint:

- The user must approve `final_outline.md`.
- The user must approve `harness_plan.md`.

### 7. Chapter Workspace

Purpose:

- Draft, review, revise, and approve one chapter at a time.

Layout:

```text
Left: chapter list and statuses
Center: manuscript / artifact viewer
Right: quality report, issues, approvals
Bottom: run history and generated files
```

After the initial 3-page sample is approved, the first production milestone is one excellent chapter. Whole-book drafting comes after the chapter quality loop feels reliable.

### 8. Quality Review View

Purpose:

- Explain why a chapter is or is not publishable.

Must show:

- Gate decision: pass, revise, blocked, human review.
- Average score.
- Required score thresholds.
- Blocking issues.
- Non-blocking issues.
- Revision plan.
- Version history.
- Which verifier agent raised each issue.
- Whether the same issue has repeated across iterations.

The review view should answer:

```text
What failed?
Why does it matter?
What will the revision pass change?
What should the human approve or override?
```

### 9. Export Studio

Purpose:

- Build and validate publishing artifacts.

Must show:

- Markdown manuscript.
- Metadata.
- Table of contents.
- Export targets.
- Export report.
- Validation warnings.

MVP export target:

```text
Markdown
```

Later export targets:

```text
EPUB
PDF
DOCX
Quarto project
```

## First-Run Flow

The first-time user flow should be:

```text
1. User chooses either professional book or university textbook.
2. AI editor interviews the user about subject, reader, level, tone, and rigor.
3. BookForge summarizes the intended book.
4. User approves or corrects the direction.
5. BookForge generates a 3-page sample.
6. User discusses tone, structure, density, difficulty, and teaching style.
7. BookForge updates the style guide and rigor profile.
8. User approves the sample direction.
9. BookForge creates the harness plan and final outline.
10. User approves the harness and outline.
11. BookForge drafts chapter 1.
12. Verification agents review the chapter.
13. Quality gate decides pass, revise, blocked, or human review.
14. BookForge revises and repeats until the chapter passes or escalates.
15. BookForge continues chapter production under the approved harness.
```

## UI Anti-Patterns To Avoid

- Starting with a row of workflow command buttons.
- Asking users to fill a long form before any useful conversation.
- Showing raw agent output before a summary.
- Making users inspect files to understand project state.
- Hiding approval gates.
- Treating a failed review as an error instead of a normal editorial state.
- Writing a full book before proving a 3-page sample and one chapter.
- Chat-only interaction with no artifact workspace after the conversation phase.

## MVP UX Default

For v0.1, the web UI should become a phase-guided workspace:

```text
Sidebar:
  projects
  current phase
  chapter list

Main:
  AI editor conversation
  current sample or manuscript artifact
  next recommended action
  editable markdown preview

Inspector:
  resolved book direction
  approval gate
  quality report
  verifier agents
  run history
  files written
```

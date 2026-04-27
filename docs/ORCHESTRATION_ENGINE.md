# BookForge Orchestration Engine

## Purpose

The orchestration engine is the product core.

It decides:

- Which phase can run.
- Which agents participate.
- What context each agent receives.
- Where outputs are written.
- Whether an artifact passes a quality gate.
- Whether the next step requires human approval.
- Whether the book direction is mature enough to start the production harness.

Agents do not own project state. The orchestrator owns state transitions.

## Core Objects

### Project

Represents one book.

```text
books/{project_id}/
  book.yaml
  state.json
  book_spec.md
  reader_profile.md
  style_guide.md
  rigor_profile.md
  samples/
  final_outline.md
  harness_plan.md
  chapter_briefs/
  manuscript/
  reviews/
  quality_reports/
  evidence_cards/
  exports/
```

### Artifact

An artifact is a durable file produced by a phase.

Examples:

- `book_spec.md`
- `reader_profile.md`
- `style_guide.md`
- `rigor_profile.md`
- `samples/sample_01.md`
- `harness_plan.md`
- `decision_log.md`
- `final_outline.md`
- `chapter_briefs/ch01.md`
- `manuscript/ch01/v1.md`
- `quality_reports/ch01/v1.json`
- `exports/book.md`

### Run

A run is one execution of one action.

It records:

- Run id.
- Action.
- Agent or workflow.
- Inputs.
- Outputs.
- Model provider.
- Status.
- Start and completion timestamps.
- Error, if any.

### Gate

A gate controls whether the project can advance.

Required gates:

- Book spec approval.
- Final outline approval.
- Sample chapter approval.
- Final manuscript approval.
- Export approval.

## State Machine

Recommended phase states:

```text
created
interviewing
direction_summarized
sample_drafting
sample_reviewing
sample_revision_needed
sample_approved
harness_planning
harness_approved
debating
outline
outline_approved
briefing
drafting
reviewing
revision_needed
sample_chapter_approved
editing
final_manuscript_approved
exported
blocked
```

The state machine should be strict enough to prevent accidental jumps, but forgiving enough for humans to edit files and rerun a phase.

## Action Contract

Every action should follow the same shape:

```text
validate input
validate gate
load project state
load required artifacts
render prompts
run agents
parse structured outputs
write artifacts
write run log
update state
return project snapshot
```

## Agent Execution Pattern

### Planning Debate

```text
orchestrator chooses decision question
  -> role agents answer
  -> critic finds conflicts
  -> orchestrator writes decision
  -> decision_log.md updates
```

Default debate limit:

```text
max_rounds = 3
max_words_per_agent = 250
one decision question per round
```

### Editorial Interview

```text
user idea
  -> AI editor asks targeted questions
  -> direction summary
  -> user approval or correction
  -> reader_profile.md, book_intent.md, style_direction.md, rigor_profile.md
```

The interview should not expose internal agent mechanics to the user.

### Three-Page Sample

```text
approved direction
  -> sample writer
  -> sample verifier
  -> samples/sample_01.md
  -> user discussion
  -> style_guide.md and rigor_profile.md updates
```

The production harness must not start until the sample direction is approved.

### Harness Plan

```text
approved sample direction
  -> orchestrator
  -> agent roster
  -> quality rubric
  -> outline strategy
  -> harness_plan.md
```

The harness plan defines which writer, reviewer, verifier, and revision agents are used for the book.

### Chapter Draft

```text
chapter_brief + book_spec + evidence_cards
  -> chapter_writer
  -> example_builder, optional
  -> manuscript/chXX/v1.md
```

### Quality Loop

```text
manuscript/chXX/vN.md
  -> fact_checker
  -> structural_editor
  -> style_editor
  -> pedagogy_reviewer
  -> quality aggregator
  -> pass | revise | blocked | human_review
```

If revise:

```text
quality_report -> revision_plan -> revision_writer -> manuscript/chXX/vN+1.md
```

## Quality Loop Stop Conditions

Automatic revision should stop when any of these happen:

- Gate passes.
- `max_iterations_per_chapter` is reached.
- The same blocking issue appears twice.
- Average score does not improve after two revisions.
- Required evidence is missing.
- Reviewers disagree on a blocking issue.
- The chapter brief is judged flawed.

Default:

```text
max_iterations_per_chapter = 3
```

## Human Approval Model

Human approval is a first-class state change, not a note in a chat transcript.

Approval should record:

```json
{
  "artifact": "final_outline",
  "status": "approved",
  "approved_by": "human",
  "approved_at": "2026-04-25T12:00:00+09:00",
  "notes": "Approved after editing chapter order."
}
```

## Error Handling

Normal editorial failures are not system errors.

Examples of normal failures:

- Chapter needs revision.
- Fact checker finds unsupported claims.
- Outline repeats the same chapter idea.
- Export validation warns about missing metadata.

System errors include:

- Missing project state.
- Invalid artifact path.
- Model provider failure.
- Parse failure from a required structured output.
- File write failure.

## Current Implementation Gap

The current Node scaffold proves the file lifecycle and UI round trip.

It still needs:

- Workflow modules split by phase.
- Structured action results.
- Real parallel or queued agent execution.
- Stronger schema validation.
- A clearer state machine.
- Better handling of human-edited artifacts.
- A real job runner for long-running tasks.

## Implementation Default

Do not rewrite the whole engine yet.

Next step:

```text
Keep the Node scaffold.
Refactor the current Core into phase modules.
Make action contracts explicit.
Then decide whether to migrate the Core to Python/LangGraph or keep Node with a workflow layer.
```

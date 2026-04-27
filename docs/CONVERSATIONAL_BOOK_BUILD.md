# Conversational Book Build Flow

## Core Product Decision

BookForge starts with one book-type choice, then a conversation. It is not a form and not a dashboard.

The product should feel like meeting a senior editor:

```text
Book type choice
  -> AI editorial interview
  -> professional/textbook scope lock
  -> 3-page sample
  -> user discussion and refinement
  -> outline and harness plan
  -> chapter production loop
  -> verification and revision loop
  -> final manuscript
```

The user should not need to understand subagents, workflow commands, or file structure before starting.

## Supported Book Types

MVP supports exactly two serious non-fiction modes:

- Professional books.
- University textbooks.

Graduate-level teaching material is handled as a university textbook. Technical manuals and expert guides are handled as professional books.

MVP does not support:

- Fiction.
- Poetry.
- Casual blog compilations.
- Low-effort ebooks.
- Generic self-help books with no professional standard.
- Mass-content generation.

The UI should say this clearly.

## First Screen

The first screen should be a two-choice studio.

Main prompt:

```text
어떤 책을 만들까요?

[ 전문서적 ]
[ 대학교재 ]
```

After the user chooses a type, the AI editor starts the interview with type-specific prompts.

Suggested input starters:

- "I want to build a university textbook about..."
- "I want to turn my professional method into a book for..."
- "I have lecture notes about..."
- "I need a technical guide for..."

The UI should also ask for:

- Field or discipline.
- Target reader level.
- Intended depth.
- Book type.
- Desired tone.
- Existing materials.
- Required rigor.

But these should be collected conversationally, not as a long intimidating form.

## Editorial Interview

The AI editor should ask only the questions needed to define the book.

Default interview topics:

1. Subject area.
2. Target reader.
3. Reader prerequisite level.
4. Desired difficulty.
5. Book purpose.
6. Expected use: self-study, university course, professional reference, workshop material.
7. Tone: academic, practical, lecture-like, technical, executive.
8. Evidence expectation: citation-heavy, example-heavy, exercise-heavy.
9. Constraints: length, language, chapter count, deadline.

The interview should end with a summary the user can approve or change.

Output:

```text
reader_profile.md
book_intent.md
style_direction.md
rigor_profile.md
```

## Three-Page Sample First

Before building the full book, BookForge should generate a 3-page sample.

Purpose:

- Show the user how the book will feel.
- Test the writing level.
- Test the density.
- Test the teaching style.
- Test whether the tone is too academic, too shallow, or too generic.

The 3-page sample should include:

- Opening section.
- One core concept explanation.
- One example or case.
- One diagram description or structured table if relevant.
- One short exercise/checklist if textbook mode is selected.

Output:

```text
samples/sample_01.md
sample_review.md
style_guide.md
```

## Sample Discussion Loop

After the sample is generated, the system should ask the user to react.

Questions:

- Is the level too easy, too hard, or correct?
- Is the tone too academic, too casual, or correct?
- Should chapters be lecture-style, manual-style, or textbook-style?
- Should the book include exercises, case studies, checklists, diagrams, or citations?
- Should the book be more theoretical or more practical?

The user can say things like:

```text
Make it more like a university textbook.
Add more examples.
Less motivational, more technical.
Assume the reader knows basic statistics.
Use a professor's lecture style.
```

BookForge updates:

```text
style_guide.md
rigor_profile.md
reader_profile.md
```

Then it can generate a second sample if needed.

## Harness Plan

Once the user approves the sample direction, BookForge creates a production harness.

The harness defines:

- Book phases.
- Agent roster.
- Quality criteria.
- Chapter-by-chapter production plan.
- Verification agents.
- Revision rules.
- Stop conditions.
- Human approval gates.

Output:

```text
harness_plan.md
final_outline.md
chapter_briefs/
quality_rubric.md
```

## Production Loop

Each chapter follows the same loop:

```text
chapter brief
  -> draft
  -> reviewer agents
  -> quality gate
  -> revision plan
  -> revised draft
  -> review again
  -> pass or human escalation
```

The system repeats until:

- The chapter passes quality gates.
- The maximum iteration limit is reached.
- The human changes the brief or standard.
- A verifier blocks progress due to missing evidence or conceptual weakness.

## Verification Agents

The verification agents should be visible in the UI as part of the harness.

Default verifier set:

- Fact verifier.
- Structure verifier.
- Pedagogy verifier.
- Style verifier.
- Reader-level verifier.
- Evidence/citation verifier for citation-heavy books.

Each verifier produces:

- Pass/fail or revise decision.
- Blocking issues.
- Non-blocking issues.
- Required fixes.
- Confidence.

## Frontend Implication

The frontend should not begin with:

```text
Spec / Debate / Outline / Draft / Review / Export
```

It should begin with:

```text
AI editor conversation
  -> sample preview
  -> direction refinement
  -> harness activation
  -> chapter production board
```

The command bar can exist as an advanced developer control, but it should not be the main user experience.

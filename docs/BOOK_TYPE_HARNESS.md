# Book Type Harness

## Product Boundary

BookForge supports exactly two book types:

- `professional_book`: 전문서적
- `university_textbook`: 대학교재

Everything else is mapped into one of these two modes or rejected later.

## References We Borrow From

- Quarto: project-based books, chapter files, `_quarto.yml`, and multi-format render targets.
- Jupyter Book: publication-quality technical/educational books from Markdown or notebook-style content.
- bookdown: long-form technical books with cross references, equations, citations, and PDF/HTML/EPUB/Word outputs.
- Manubot: Markdown-in-Git manuscript workflow with review, versioning, rebuilds, and citation automation.
- Pandoc: final conversion layer from Markdown manuscript to EPUB/PDF/DOCX-like outputs.

BookForge should not clone these tools. It should produce clean Markdown and metadata that can later be handed to Quarto/Pandoc-style builders.

## First User Choice

The first screen asks only:

```text
어떤 책을 만들까요?

[ 전문서적 ]
[ 대학교재 ]
```

No agents, files, approvals, or export details should appear before this choice.

## Shared Flow

```text
book type choice
  -> AI editorial interview
  -> book_spec.md
  -> 3-page sample
  -> sample discussion
  -> harness_plan.md + quality_rubric.md + final_outline.md
  -> chapter brief
  -> draft
  -> verifier reviews
  -> quality report
  -> revision loop
  -> human approval
  -> export markdown
```

## Professional Book Harness

### Purpose

Create a serious professional book that helps a practitioner make better decisions or execute a field-specific method.

### Required Sample

- Field problem.
- Reader decision context.
- Core framework.
- Worked case.
- Professional checklist.
- Claims marked when evidence is required.

### Review Agents

- Fact checker.
- Structural editor.
- Evidence verifier.
- Style verifier.
- Field relevance verifier.

### Pass Criteria

- Average score >= 8.
- Accuracy >= 8.
- Field relevance >= 8.
- Case quality >= 8.
- Actionability >= 8.
- Blocking issues = 0.

## University Textbook Harness

### Purpose

Create a course-ready textbook that teaches a subject through objectives, concepts, examples, and exercises.

### Required Sample

- Course context.
- Learning objectives.
- Prerequisite assumptions.
- Core concept explanation.
- Worked example.
- Practice questions.

### Review Agents

- Fact checker.
- Structural editor.
- Pedagogy verifier.
- Style verifier.
- Reader-level verifier.

### Pass Criteria

- Average score >= 8.
- Accuracy >= 8.
- Pedagogy >= 8.
- Reader fit >= 8.
- Example quality >= 8.
- Practice quality >= 8.
- Blocking issues = 0.

## Repetition Rule

If a chapter fails:

```text
draft -> review -> quality_report -> revision -> review again
```

Stop and ask the human when:

- The same blocking issue appears twice.
- Score does not improve after two revisions.
- Required evidence cannot be supplied.
- The book type no longer matches the approved mode.
- The user changes the approved sample direction.


# BookForge Workflows

## Workflow Philosophy

BookForge should not ask one model to write a full book in one pass.

Each phase creates a specific artifact. Each artifact can be reviewed, edited, approved, and reused by later phases.

## Phase 1: Book Spec

Input:

- Topic.
- Target reader.
- Author goal.
- Book type.
- Optional references.

Process:

1. Generate initial book concept.
2. Define target reader.
3. Define reader transformation.
4. Define scope and non-scope.
5. Define voice and style guide.
6. Define differentiation from similar books.

Output:

```text
book_spec.md
```

Approval:

```text
approved.book_spec = true
```

## Phase 2: Multi-Agent Debate

Input:

- `book_spec.md`.
- Debate questions.
- Agent roster.

Process:

1. Orchestrator selects one decision question.
2. Role agents answer briefly.
3. Critic agents identify conflicts.
4. Orchestrator creates a decision summary.
5. Decision is saved.

Example round questions:

- Who exactly is this book for?
- What makes this book different?
- What should be excluded?
- What would make this book fail?
- What should the table of contents prioritize?

Output:

```text
debate_rounds/round_01.md
debate_rounds/round_02.md
decision_log.md
outline_candidates.md
```

## Phase 3: Final Outline

Input:

- `book_spec.md`.
- `decision_log.md`.
- `outline_candidates.md`.

Process:

1. Generate outline candidates.
2. Compare learning flow.
3. Detect missing prerequisite chapters.
4. Detect weak or repetitive chapters.
5. Produce final outline.

Output:

```text
final_outline.md
```

Approval:

```text
approved.final_outline = true
```

## Phase 4: Chapter Briefs

Input:

- `final_outline.md`.
- `book_spec.md`.

Process:

For each chapter:

1. Define chapter objective.
2. Define required concepts.
3. Define reader prerequisites.
4. Define examples and exercises.
5. Define evidence requirements.
6. Define what not to repeat.

Output:

```text
chapter_briefs/ch01.md
chapter_briefs/ch02.md
```

## Phase 5: Chapter Drafting

Input:

- Chapter brief.
- Book spec.
- Relevant evidence cards.
- Previous approved chapters when available.

Process:

1. Writer creates draft.
2. Example agent adds examples and cases.
3. Exercise agent adds textbook-style exercises when relevant.
4. Draft is saved as versioned manuscript.

Output:

```text
manuscript/ch01/v1.md
```

## Phase 6: Quality Gate Loop

Input:

- Chapter draft.
- Chapter brief.
- Book spec.
- Existing approved chapters.
- Evidence cards.

Process:

1. Review agents run in parallel.
2. Aggregator merges findings.
3. Quality gate scores chapter.
4. If pass, chapter becomes approved candidate.
5. If revise, revision instructions are generated.
6. Revision agent creates a new version.
7. Loop repeats until pass, blocked, or max iterations reached.

Output:

```text
reviews/ch01/v1_fact.md
reviews/ch01/v1_logic.md
reviews/ch01/v1_editorial.md
quality_reports/ch01/v1.json
manuscript/ch01/v2.md
```

## Phase 7: Whole-Manuscript Editing

Input:

- Approved chapter drafts.
- Style guide.
- Quality reports.

Process:

1. Merge chapters.
2. Check cross-chapter repetition.
3. Check term consistency.
4. Check progression.
5. Create transitions between chapters.
6. Normalize tone.

Output:

```text
manuscript_full.md
```

Approval:

```text
approved.final_manuscript = true
```

## Phase 8: Export

Input:

- `manuscript_full.md`.
- Frontmatter.
- Backmatter.
- Metadata.

Process:

1. Generate table of contents.
2. Build Markdown edition.
3. Build EPUB.
4. Build PDF.
5. Build DOCX.
6. Validate output.

Output:

```text
exports/book.md
exports/book.epub
exports/book.pdf
exports/book.docx
exports/metadata.yaml
exports/export_report.md
```

## Human Approval Points

Required approvals:

- Book spec.
- Final outline.
- Sample chapter.
- Final manuscript.
- External publication or upload.

Optional approvals:

- Each chapter.
- Evidence cards.
- Export metadata.

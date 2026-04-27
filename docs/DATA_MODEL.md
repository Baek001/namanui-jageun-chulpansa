# BookForge Data Model

## Storage Strategy

BookForge stores book artifacts as files and operational metadata in SQLite.

Files are the long-term source of truth for manuscripts.

SQLite is used for:

- Run history.
- Job status.
- UI indexing.
- Agent logs.
- Optional cache.

## Book Project Layout

```text
books/{book_id}/
  book.yaml
  state.json
  BOOKFORGE.md
  book_spec.md
  style_guide.md
  decision_log.md
  outline_candidates.md
  final_outline.md
  chapter_briefs/
    ch01.md
    ch02.md
  manuscript/
    ch01/
      v1.md
      v2.md
      approved.md
    ch02/
      v1.md
  reviews/
    ch01/
      v1_fact.md
      v1_logic.md
      v1_editorial.md
  quality_reports/
    ch01/
      v1.json
      v2.json
  evidence_cards/
    ch01.md
  sources/
    sources.bib
  exports/
    book.md
    book.epub
    book.pdf
    book.docx
    metadata.yaml
```

## book.yaml

```yaml
id: ai_publishing_guide
title: "AI Publishing Guide"
book_type: professional_book
language: ko
created_at: "2026-04-24T00:00:00+09:00"
template: professional_book
model_profile: default
```

## state.json

```json
{
  "project_id": "ai_publishing_guide",
  "phase": "drafting",
  "approved": {
    "book_spec": true,
    "final_outline": true,
    "sample_chapter": false,
    "final_manuscript": false,
    "export": false
  },
  "chapters": [
    {
      "id": "ch01",
      "title": "Introduction",
      "status": "reviewing",
      "current_version": "v2",
      "approved_version": null,
      "quality_score": 7.8,
      "blocking_issues": 2
    }
  ],
  "last_run_id": "run_20260424_001"
}
```

## Chapter Status Values

```text
planned
briefed
drafting
drafted
reviewing
revision_needed
approved
blocked
```

## Approval Status

Approval should capture:

```json
{
  "artifact": "final_outline",
  "status": "approved",
  "approved_by": "human",
  "approved_at": "2026-04-24T13:00:00+09:00",
  "notes": "Proceed with this outline."
}
```

## Agent Run Record

Stored in SQLite and optionally exported as JSONL.

```json
{
  "run_id": "run_20260424_001",
  "project_id": "ai_publishing_guide",
  "agent": "fact_checker",
  "phase": "review",
  "target": "ch01:v2",
  "status": "completed",
  "started_at": "2026-04-24T13:01:00+09:00",
  "completed_at": "2026-04-24T13:04:00+09:00",
  "input_artifacts": [
    "manuscript/ch01/v2.md",
    "chapter_briefs/ch01.md"
  ],
  "output_artifacts": [
    "reviews/ch01/v2_fact.md"
  ]
}
```

## Evidence Card

```yaml
id: evidence_ch01_001
claim: "Structured revision loops improve manuscript consistency."
source:
  type: article
  title: "Example Source"
  url: "https://example.com"
  accessed_at: "2026-04-24"
relevance: high
used_in:
  - ch01
notes: "Supports the editing workflow argument."
```

## Quality Report

```json
{
  "chapter": "ch01",
  "version": "v2",
  "decision": "revise",
  "average_score": 7.6,
  "blocking_issues": [
    {
      "id": "FC-001",
      "source_agent": "fact_checker",
      "severity": "high",
      "location": "section 1.2",
      "issue": "Unsupported factual claim.",
      "required_action": "Add evidence or rewrite."
    }
  ],
  "revision_plan_path": "quality_reports/ch01/v2_revision_plan.yaml"
}
```

## Metadata For Export

```yaml
title: "AI Publishing Guide"
subtitle: "A Practical Workflow For Independent Authors"
author: "Author Name"
language: ko
keywords:
  - AI
  - publishing
  - ebook
description: "A practical guide to planning, drafting, editing, and publishing AI-assisted books."
```

## File Mutation Rule

Agents do not write arbitrary files.

All writes should go through BookForge Core so the system can:

- Validate paths.
- Create versions.
- Update state.
- Record run history.
- Prevent accidental overwrite of approved artifacts.

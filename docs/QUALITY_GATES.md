# BookForge Quality Gates

## Goal

Quality gates make BookForge more than an auto-writing tool.

They enforce a repeatable editorial loop:

```text
draft
  -> review
  -> score
  -> revise
  -> review again
  -> approve or escalate
```

## Quality Dimensions

Each chapter is scored on:

- Accuracy.
- Citation quality.
- Clarity.
- Depth.
- Structure.
- Pedagogy.
- Reader fit.
- Style consistency.
- Example quality.
- Cross-chapter coherence.

## Default Scoring

Score range:

```text
1 = unusable
5 = acceptable draft
7 = publishable with edits
8 = strong
9 = excellent
10 = rare, exceptional
```

Default pass rule:

```text
average_score >= 8
accuracy >= 8
clarity >= 8
structure >= 8
blocking_issues = 0
```

For professional or textbook mode:

```text
citation_quality >= 7
pedagogy >= 8
example_quality >= 7
```

## Blocking Issues

A blocking issue prevents approval.

Examples:

- Unsupported factual claim.
- Missing required chapter objective.
- Major contradiction with book spec.
- Severe repetition from previous chapter.
- No examples in a chapter that requires applied learning.
- Export-breaking Markdown structure.

## Non-Blocking Issues

Non-blocking issues can remain if the human approves.

Examples:

- Minor style inconsistency.
- Optional example could be stronger.
- One paragraph could be shorter.
- Citation format needs cleanup but source is identified.

## Quality Gate Loop

Default loop:

```text
1. Draft version is created.
2. Review agents run in parallel.
3. Aggregator merges findings.
4. Quality gate calculates score.
5. If pass, chapter is ready for human approval.
6. If revise, revision instructions are generated.
7. Revision writer creates next version.
8. Repeat.
```

## Loop Limits

Default automatic limits:

```text
max_iterations_per_chapter = 3
max_parallel_review_agents = 5
max_revision_minutes = 20
```

Escalate to human if:

- Same blocking issue appears twice.
- Score does not improve after two revisions.
- Evidence cannot be found.
- Agent outputs conflict strongly.
- The chapter brief itself appears flawed.

## Review Agent Set

Default review agents:

- Fact checker.
- Logic reviewer.
- Structural editor.
- Style editor.
- Pedagogy reviewer.

Optional review agents:

- Market fit reviewer.
- Accessibility reviewer.
- Legal/compliance reviewer.
- Technical reviewer for domain-specific books.

## Aggregated Quality Report

Each quality report should be saved as JSON.

Current implementation:

```text
packages/core/qualityGate.mjs
```

The current parser reads reviewer Markdown sections:

- `Blocking Issues`
- `Non-Blocking Issues`
- `Score`
- `Decision`

Then it aggregates reviewer scores, blocking issues, non-blocking issues, reviewer decisions, and final gate decision.

```json
{
  "chapter": "ch01",
  "version": "v2",
  "iteration": 2,
  "scores": {
    "accuracy": 8,
    "citation_quality": 7,
    "clarity": 8,
    "depth": 8,
    "structure": 9,
    "pedagogy": 8,
    "reader_fit": 8,
    "style_consistency": 8,
    "example_quality": 7,
    "coherence": 8
  },
  "blocking_issues": [],
  "non_blocking_issues": [
    {
      "id": "ST-004",
      "severity": "low",
      "location": "section 1.3",
      "issue": "Paragraph can be shorter."
    }
  ],
  "decision": "pass"
}
```

## Revision Plan

When a draft fails, the orchestrator creates a revision plan.

```yaml
chapter: ch01
from_version: v1
to_version: v2
must_fix:
  - "Add evidence for section 1.2 claim."
  - "Remove repeated explanation from section 1.4."
  - "Add one worked example after concept definition."
should_fix:
  - "Shorten introduction."
do_not_change:
  - "Keep the chapter's central metaphor."
```

## Human Approval

The human can:

- Approve.
- Request another revision.
- Edit manually.
- Change the chapter brief.
- Override non-blocking issues.

The human should not be forced to approve blocking factual issues unless explicitly marked as an intentional editorial decision.

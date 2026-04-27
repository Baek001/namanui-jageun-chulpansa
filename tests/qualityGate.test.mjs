import assert from "node:assert/strict";
import {
  aggregateChapterReviews,
  buildRevisionPassReport,
  parseReviewMarkdown
} from "../packages/core/qualityGate.mjs";

const review = `# Fact Review

## Blocking Issues

- FC-001: Unsupported claim needs evidence.
- Claim without explicit id.

## Non-Blocking Issues

- FC-002: Citation format can be cleaner.

## Score

7.5

## Decision

revise
`;

const parsed = parseReviewMarkdown(review, "fact_checker");
assert.equal(parsed.score, 7.5);
assert.equal(parsed.decision, "revise");
assert.equal(parsed.blocking_issues.length, 2);
assert.equal(parsed.blocking_issues[0].id, "FC-001");
assert.equal(parsed.blocking_issues[1].id, "FC-002");
assert.equal(parsed.non_blocking_issues.length, 1);

const aggregate = aggregateChapterReviews({
  chapter: "ch01",
  version: "v1",
  iteration: 1,
  generatedAt: "2026-04-25T00:00:00.000Z",
  reviews: [
    { sourceAgent: "fact_checker", markdown: review },
    {
      sourceAgent: "structural_editor",
      markdown: `# Structural Review

## Blocking Issues

## Non-Blocking Issues

- ST-001: Add a stronger transition.

## Score

8.5

## Decision

pass
`
    }
  ]
});

assert.equal(aggregate.decision, "revise");
assert.equal(aggregate.average_score, 8);
assert.equal(aggregate.blocking_issues.length, 2);
assert.equal(aggregate.non_blocking_issues.length, 2);
assert.equal(aggregate.scores.fact_checker, 7.5);
assert.equal(aggregate.scores.structural_editor, 8.5);

const passReport = buildRevisionPassReport({
  chapter: "ch01",
  version: "v2",
  iteration: 2,
  generatedAt: "2026-04-25T00:00:00.000Z"
});

assert.equal(passReport.decision, "pass");
assert.equal(passReport.blocking_issues.length, 0);

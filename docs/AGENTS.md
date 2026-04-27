# BookForge Agent Roles

## Agent Design Rules

Each agent should have:

- One clear responsibility.
- A narrow input.
- A structured output.
- Explicit evaluation criteria.
- Limited tools.
- No hidden authority to advance project state.

The orchestrator decides workflow transitions. Agents produce work or findings.

## Core Agents

### Orchestrator

Role:

- Main controller for the book project.

Responsibilities:

- Track current phase.
- Select which agents to run.
- Pass context to agents.
- Aggregate outputs.
- Decide pass, revise, block, or human review.
- Save artifacts.

Should not:

- Write final content without review.
- Skip approval gates.

### Market Analyst

Role:

- Evaluate reader demand and positioning.

Inputs:

- Book topic.
- Target reader.
- Similar books or reference materials.

Outputs:

- Reader pain summary.
- Market angle.
- Differentiation points.
- Weak positioning risks.

### Reader Advocate

Role:

- Represent the actual reader.

Outputs:

- Reader assumptions.
- Confusing parts.
- Missing prerequisites.
- Practical reader questions.

### Outline Architect

Role:

- Create and critique the learning structure.

Outputs:

- Chapter sequence.
- Section sequence.
- Prerequisite flow.
- Missing chapter warnings.

### Author Voice Guardian

Role:

- Preserve the book's core message and style.

Outputs:

- Message consistency notes.
- Voice risks.
- Style guide updates.

### Critic

Role:

- Find weak claims, vague positioning, and structural problems.

Outputs:

- Objections.
- Failure modes.
- Overpromises.
- Contradictions.

### Pedagogy Reviewer

Role:

- Make the book useful as a textbook or professional learning guide.

Outputs:

- Learning objective checks.
- Example quality checks.
- Exercise suggestions.
- Difficulty calibration.

### Researcher

Role:

- Find and summarize sources.

Tools:

- OpenAlex.
- Semantic Scholar.
- Zotero.
- Web search when allowed.

Outputs:

- Evidence cards.
- Source summaries.
- Citation candidates.

### Fact Checker

Role:

- Check factual and citation-sensitive claims.

Outputs:

- Unsupported claims.
- Needs-citation list.
- Outdated claims.
- High-risk claims.

Should not:

- Rewrite the manuscript directly.

### Chapter Writer

Role:

- Write chapter drafts from approved briefs.

Inputs:

- Chapter brief.
- Book spec.
- Evidence cards.
- Prior approved chapter summaries.

Outputs:

- Draft manuscript version.

### Example Builder

Role:

- Add practical examples, analogies, cases, diagrams, and exercises.

Outputs:

- Example inserts.
- Exercise blocks.
- Checklist blocks.

### Structural Editor

Role:

- Improve chapter and whole-manuscript flow.

Outputs:

- Structural issues.
- Reorder suggestions.
- Missing transitions.

### Style Editor

Role:

- Normalize tone and remove AI-like prose.

Outputs:

- Style findings.
- Rewrite suggestions.
- Revised prose when requested by orchestrator.

### Revision Writer

Role:

- Apply orchestrator-approved revision instructions.

Inputs:

- Current draft.
- Revision plan.
- Review reports.

Outputs:

- New manuscript version.

### Export Builder

Role:

- Prepare final outputs.

Tools:

- Quarto.
- Pandoc.

Outputs:

- Markdown.
- EPUB.
- PDF.
- DOCX.
- Export report.

## Review Agent Output Format

Review agents should output:

```yaml
agent: fact_checker
chapter: ch01
version: v1
blocking_issues:
  - id: FC-001
    severity: high
    location: "section 1.2"
    issue: "Claim requires evidence."
    suggested_fix: "Add source or soften claim."
non_blocking_issues:
  - id: FC-002
    severity: medium
    location: "section 1.4"
    issue: "Term should match glossary."
score: 7
decision: revise
```

## Tool Access Policy

Writers:

- Read project files.
- Write only draft artifacts through BookForge Core.

Reviewers:

- Read manuscripts.
- Write review reports.
- Do not directly alter approved files.

Researchers:

- Use source lookup tools.
- Write evidence cards.
- Do not change manuscript text.

Export builders:

- Read final manuscript.
- Write exports.
- Do not change content unless running a formatting-only pass.

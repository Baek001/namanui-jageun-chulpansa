# BookForge Frontend Implementation Brief

## Goal

Rebuild the frontend as a conversation-first AI editorial studio for professional books and university-level textbooks.

Do not build:

- A landing page.
- A generic Notion clone.
- A dashboard made of workflow buttons.
- A broad ebook generator UI.

Build:

```text
AI editorial conversation
  -> 3-page sample preview
  -> sample feedback and direction lock
  -> harness plan
  -> chapter production board
  -> verifier/revision loop
```

## First Screen

The first screen should ask:

```text
What professional book or university-level textbook do you want to build?
```

Show four starter options:

- University textbook.
- Professional expert book.
- Technical manual.
- Course/lecture material.

The user starts by chatting with the AI editor.

## Main Layout

### Left Sidebar

- Project list.
- Current book type.
- Current phase.
- AI runtime.
- Chapter list, only after harness activation.

### Center Workspace

Before harness activation:

- AI editor conversation.
- Interview summary.
- 3-page sample preview.
- Sample feedback prompts.

After harness activation:

- Current artifact viewer/editor.
- Chapter draft.
- Outline.
- Harness plan.
- Next recommended action.

### Right Inspector

- Resolved book direction.
- Difficulty and rigor level.
- Style guide summary.
- Approval gate.
- Verifier agents.
- Blocking issues.
- Revision loop status.
- Generated files.
- Run history.

## Required User Flow

```text
1. User describes book idea in conversation.
2. AI editor asks follow-up questions.
3. System summarizes book direction.
4. User approves or corrects direction.
5. System generates 3-page sample.
6. User discusses tone, difficulty, structure, examples, exercises, and citations.
7. System updates style guide and rigor profile.
8. User approves sample direction.
9. System creates harness plan and final outline.
10. User approves harness and outline.
11. System starts chapter production.
12. Verifier agents review.
13. System revises until pass, blocked, or human escalation.
```

## Main UI States

### Empty State

Focus:

- Conversation input.
- Examples of serious book ideas.
- Clear scope: professional books and university-level textbooks only.

### Interview State

Focus:

- AI editor asks one or two questions at a time.
- Structured chips for book type, level, rigor, and tone.
- Live summary panel.

### Sample State

Focus:

- 3-page sample preview.
- Feedback controls:
  - Too easy / correct / too hard.
  - More academic / balanced / more practical.
  - More examples / more citations / more exercises.
- Regenerate or approve sample direction.

### Harness State

Focus:

- Agent roster.
- Production phases.
- Quality rubric.
- Revision loop limits.
- Outline and chapter plan.

### Production State

Focus:

- Current chapter.
- Draft version.
- Verifier results.
- Blocking issues.
- Revision plan.
- Pass/fail status.

## Visual Direction

Use:

- Notion-like document readability.
- Linear-like phase and issue clarity.
- Overleaf-like manuscript/export seriousness.

Avoid:

- Marketing hero sections.
- Decorative gradients.
- Heavy card grids.
- Equal command-button rows as the primary UI.

The interface should feel like a serious editor's workspace, not a prompt playground.

## Required Documents To Read First

- `docs/CONVERSATIONAL_BOOK_BUILD.md`
- `docs/PRODUCT_UX.md`
- `docs/AI_RUNTIME_STRATEGY.md`
- `docs/ORCHESTRATION_ENGINE.md`
- `docs/MVP_PLAN.md`
- `docs/ROADMAP.md`

## Existing Backend Constraint

Keep the current Core/API mostly intact for the first frontend pass.

If a backend feature is missing, represent it with local UI state or mock data, but make the UI structure match the target product.

## Acceptance Criteria

- A non-technical user can understand what to do first.
- The first action is a book-shaping conversation.
- The product visibly limits itself to professional/textbook books.
- The 3-page sample step is visible before full production.
- The harness/verifier/revision loop is visible after sample approval.
- The old command bar is hidden, demoted, or clearly marked as advanced.
- Korean UI text is not broken.


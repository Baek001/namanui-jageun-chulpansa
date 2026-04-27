export const DEFAULT_TITLE = "BookForge 전문서 프로젝트";

function normalizeBookType(value) {
  return value === "professional_book" || value === "technical_manual" ? "professional_book" : "university_textbook";
}

function bookTypeLabel(value) {
  return normalizeBookType(value) === "university_textbook" ? "대학교재" : "전문서적";
}

function modeProfile(bookType) {
  if (normalizeBookType(bookType) === "university_textbook") {
    return {
      label: "대학교재",
      subjectLabel: "대학교재는",
      readerPromise: "독자가 수업 흐름에 맞춰 개념을 배우고, 예제와 연습문제로 이해를 검증한다.",
      sampleExtra: "짧은 연습문제와 학습 목표를 반드시 포함한다.",
      chapterTitles: [
        "Foundations And Learning Map",
        "Core Concepts And Models",
        "Worked Examples And Practice Problems"
      ],
      qualityFocus: ["learning objectives", "prerequisites", "worked examples", "practice problems", "assessment fit"]
    };
  }

  return {
    label: "전문서적",
    subjectLabel: "전문서적은",
    readerPromise: "독자가 현업 문제를 판단하고 실행할 수 있는 프레임워크와 사례를 얻는다.",
    sampleExtra: "실무 사례, 판단 기준, 체크리스트를 반드시 포함한다.",
    chapterTitles: [
      "Problem Landscape And Decision Context",
      "Core Framework And Operating Principles",
      "Implementation Playbook And Cases"
    ],
    qualityFocus: ["field relevance", "case quality", "decision criteria", "evidence discipline", "actionable checklist"]
  };
}

export function sampleSpec({ title, targetReader, purpose, bookType }) {
  const profile = modeProfile(bookType);

  return `# 책 설계 (Book Spec): ${title}

## 책 종류

${profile.label}

## 독자

${targetReader || (normalizeBookType(bookType) === "university_textbook" ? "해당 과목을 수강하는 학부 또는 대학원 학생." : "해당 분야의 판단과 실행 기준이 필요한 현업자와 전문가.")}

## 책의 목적

${purpose || profile.readerPromise}

## 독자가 얻게 되는 변화

읽기 전에는 지식이 흩어져 있고 무엇이 중요한지 판단하기 어렵다.

읽은 뒤에는 핵심 개념을 설명하고, 현실적인 문제에 적용하며, 방법의 한계를 평가할 수 있다.

## 만들 책의 범위

- ${profile.label} 전용 구조.
- 사용자가 확인한 미리보기 원고.
- 장별 목표와 핵심 메시지.
- 초안, 검토, 수정이 반복되는 품질 제작 방식.
- Markdown 중심의 출판 파일 생성.

## 만들지 않을 것

- 소설이나 가벼운 전자책.
- 검토 없이 한 번에 끝내는 원고.
- 근거가 필요한데 표시되지 않은 주장.

## 문체

명확하고 엄밀하며 구체적으로 쓴다. 동기부여식 문장을 줄이고 설명, 예시, 판단 기준을 우선한다.

## 품질 기준

이 책은 다음 기준을 만족해야 한다: ${profile.qualityFocus.join(", ")}.
`;
}

export function debateRound(title) {
  return `# Debate Round 01

## Decision Question

What must this book prove in the preview manuscript before we continue into full production?

## Reader View

The preview manuscript must make the target reader, difficulty, and practical value obvious within the first page.

## Editor View

The preview manuscript must prove the voice, density, and structure before any chapter-scale generation begins.

## Critic View

The biggest risk is generic fluent prose. The preview must contain a real example, a checkable claim, and a reader action.

## Evidence View

Claims that require external support must be marked before the draft enters the chapter loop.

## Orchestrator Decision

Do not draft the full book until the preview direction is clear enough to continue.

Related book: ${title}
`;
}

export function outline(title, brief = {}) {
  const profile = modeProfile(brief.book_type);
  const topic = brief.topic || title;

  return `# Final Outline

## Book Mode

${profile.label}

## Part 1. Orientation

### Chapter 1. ${profile.chapterTitles[0]}

Goal: Define the reader's current problem, prerequisite knowledge, and the book's core promise for ${topic}.

### Chapter 2. ${profile.chapterTitles[1]}

Goal: Teach the central concepts, framework, vocabulary, and limits the reader needs before applying the material.

### Chapter 3. ${profile.chapterTitles[2]}

Goal: Convert the framework into concrete use through examples, cases, exercises, or checklists.

## Part 2. Expansion Plan

- Add chapters only after chapter 1 passes the quality gate.
- Every chapter must include explicit reader outcome, required evidence, examples, and revision criteria.
- The full outline can expand to 8-12 chapters after the first completed chapter proves the book direction.

## Working Title

${title}
`;
}

export function threePageSample({ title, topic, targetReader, difficulty, bookType, tone }) {
  const profile = modeProfile(bookType);

  return `# 미리보기 원고: ${title}

## 1. 시작 장면

이 책은 ${topic || "선택한 분야"}를 단순히 요약하는 ${profile.label}이 아닙니다. 독자가 실제로 이해하고 판단하고 적용할 수 있는 구조를 갖춘 책입니다.

대상 독자는 ${targetReader || "해당 분야의 기본 지식을 갖춘 독자"}입니다. 난이도는 ${difficulty || "중급"}으로 시작하고, 문체 기준은 ${tone || "정확하고 구체적인 설명"}입니다.

이 샘플에서 먼저 확인할 것은 세 가지입니다.

1. 독자 수준이 맞는가.
2. 설명 밀도가 충분한가.
3. 예제와 검증 기준이 책 유형에 맞는가.

## 2. 핵심 개념

### 핵심 개념: 판단 가능한 지식 구조

좋은 ${profile.subjectLabel} 정보를 많이 나열하지 않습니다. 독자가 무엇을 알아야 하고, 어디에서 실수하기 쉬우며, 어떤 기준으로 판단해야 하는지를 보여줍니다.

| 층위 | 역할 | 검증 질문 |
| --- | --- | --- |
| 개념 | 독자가 반드시 이해해야 하는 원리 | 정의가 명확한가? |
| 절차 | 독자가 따라 할 수 있는 방법 | 순서와 조건이 있는가? |
| 사례 | 개념이 작동하는 장면 | 실제 맥락이 보이는가? |
| 검증 | 설명의 약점을 찾는 기준 | 반례와 한계가 드러나는가? |

${profile.sampleExtra}

## 3. 예시와 독자 과제

### 예시

같은 주제를 설명하더라도 ${profile.label}에서는 문단의 역할이 명확해야 합니다. 개념 문단은 정의와 범위를 잡고, 예시 문단은 독자가 판단할 장면을 만들고, 과제나 체크리스트는 이해가 실제 행동으로 이어지는지 확인합니다.

### 독자 과제

아래 질문에 답하면 이 책의 방향을 더 정확히 고정할 수 있습니다.

1. 독자가 이미 알고 있다고 가정해도 되는 선수 지식은 무엇인가?
2. 너무 쉽게 쓰면 어떤 독자가 실망하는가?
3. 너무 어렵게 쓰면 어떤 독자가 떨어져 나가는가?
4. 사례, 표, 인용, 연습문제, 체크리스트 중 무엇이 가장 중요해야 하는가?

### 다음 논의

이 미리보기 원고를 보고 난이도, 문체, 예제 밀도, 근거 기준을 조정한 뒤 계속 만들지 결정합니다.
`;
}

export function sampleReview() {
  return `# Preview Review

## Decision

discuss

## What To Ask The User

- 난이도가 너무 쉽거나 어렵지 않은가?
- 문체가 전문서적/대학교재 모드에 맞는가?
- 예제와 독자 과제가 충분히 구체적인가?
- 인용과 근거 기준을 더 강하게 요구해야 하는가?
- 미리보기 원고를 다시 만들지, 계속 제작할지 결정할 수 있는가?

## Editorial Note

Full production should not start until the preview direction is clear enough.
`;
}

export function styleGuide({ tone, difficulty, bookType }) {
  const profile = modeProfile(bookType);

  return `# Style Guide

## Book Mode

${profile.label}

## Difficulty

${difficulty || "중급"}

## Tone

${tone || (normalizeBookType(bookType) === "university_textbook" ? "대학교재처럼 명확하고 단계적으로 설명한다." : "전문서적처럼 정확하고 실무적으로 설명한다.")}

## Writing Rules

- Explain concepts before procedures.
- Use examples to test whether the explanation is concrete.
- Mark claims that need evidence.
- Keep chapter endings actionable.
- Avoid motivational filler.
- Respect the mode-specific quality focus: ${profile.qualityFocus.join(", ")}.
`;
}

export function harnessPlan(title, brief = {}) {
  const profile = modeProfile(brief.book_type);

  return `# Harness Plan

## Goal

Produce "${title}" as a ${profile.label} through a conversation-led, preview-tested, verifier-gated production loop.

## Book-Type Harness

### ${profile.label} Requirements

- Reader promise: ${profile.readerPromise}
- Required preview feature: ${profile.sampleExtra}
- Quality focus: ${profile.qualityFocus.join(", ")}

## Agent Roster

- Orchestrator: owns phase transitions, context bundles, and stop conditions.
- Type planner: checks whether the book still matches 전문서적 or 대학교재 mode.
- Chapter writer: drafts from approved briefs.
- Structure verifier: checks chapter logic and repetition.
- Pedagogy verifier: checks reader level, learning flow, examples, and tasks.
- Fact verifier: flags unsupported claims.
- Style verifier: checks tone consistency.
- Evidence verifier: checks citation and source requirements.

## Production Loop

1. Create chapter brief.
2. Draft chapter.
3. Run verifier agents.
4. Aggregate quality report.
5. Revise if blocking issues exist.
6. Repeat until pass, max iterations, or human escalation.

## Stop Conditions

- Quality gate passes.
- Same blocking issue repeats twice.
- Average score does not improve after two revisions.
- Evidence requirements cannot be met.
- Human changes the book direction.
`;
}

export function qualityRubric(brief = {}) {
  const profile = modeProfile(brief.book_type);

  return `# Quality Rubric

## Book Mode

${profile.label}

## Required Scores

- Clarity: 8+
- Structure: 8+
- Reader fit: 8+
- Evidence discipline: 7+
- Example quality: 8+
- Mode fit: 8+

## Mode-Specific Checks

${profile.qualityFocus.map((item) => `- ${item}: 8+`).join("\n")}

## Blocking Issues

- Unsupported factual claim.
- Chapter level does not match agreed difficulty.
- No concrete example.
- No reader action, exercise, or checklist.
- Repeats another chapter's core job.
- Violates approved tone, scope, or book type.
`;
}

export function chapterBrief(chapterId, title, brief = {}) {
  const profile = modeProfile(brief.book_type);

  return `# ${chapterId.toUpperCase()} Brief: ${title}

## Book Mode

${profile.label}

## Chapter Goal

Explain the chapter's role in the book and the reader outcome it must produce.

## Learning Objectives

- Understand the main concept.
- Apply the concept to a realistic ${profile.label} problem.
- Identify weak explanations before they move forward.

## Required Sections

- Opening problem.
- Core concept.
- Worked example or case.
- ${normalizeBookType(brief.book_type) === "university_textbook" ? "Practice problem set." : "Professional checklist."}
- Review questions.

## Evidence Requirements

- Mark claims that require source verification.
- Include at least one concrete example that can be checked by the verifier agents.

## Avoid

- Repeating the book introduction.
- Making broad claims without examples.
- Letting the chapter end without an action step.
`;
}

export function draftChapter(title, brief = {}) {
  const profile = modeProfile(brief.book_type);

  return `# Chapter 1. ${profile.chapterTitles[0]}

## Opening Problem

Many serious book projects fail because they begin with pages before they define the reader, standard, and proof burden. The result is fluent prose that cannot be reliably taught, applied, reviewed, or expanded. [needs evidence]

For "${title}", the first chapter must establish the reader's problem and the quality bar for the rest of the manuscript.

## Core Concept

A ${profile.label} needs a visible production structure:

1. Define the book type and reader.
2. Generate a preview manuscript.
3. Revise the preview direction if needed.
4. Create the internal production plan and outline.
5. Draft one chapter from an approved brief.
6. Review with specialized verifier agents.
7. Revise against a quality report.
8. Approve only after blocking issues are cleared.

## Worked Example

If chapter 1 cannot show the agreed level, tone, and example density, the system should not draft chapter 2. The point is not to produce more pages. The point is to prove the book direction.

## Checklist

- The chapter has a clear reader outcome.
- The chapter matches ${profile.label} mode.
- Claims that need evidence are marked.
- Examples are concrete enough to review.
- The ending tells the reader what to do next.

## Review Questions

1. What must be approved before full chapter production starts?
2. Which verifier should catch unsupported claims?
3. What should happen when the same blocking issue appears twice?
`;
}

export function revisedChapter(title, brief = {}) {
  return `${draftChapter(title, brief).trim()}

## Revision Notes Applied

This version adds clearer production checkpoints, a stronger chapter purpose, and an explicit next action.

## Next Action

Continue only if this chapter demonstrates the quality bar expected for the rest of the manuscript.
`;
}

export function factReview() {
  return `# Fact Review: Chapter 1 v1

## Blocking Issues

- FC-001: The phrase "Many serious book projects fail" is broad and should be softened or supported.

## Non-Blocking Issues

- FC-002: Add a source later for publishing workflow principles.

## Score

7

## Decision

revise
`;
}

export function editorialReview() {
  return `# Editorial Review: Chapter 1 v1

## Blocking Issues

- ED-001: The chapter needs a more explicit next action.

## Non-Blocking Issues

- ED-002: The checklist is useful but should connect more strongly to approval gates.

## Score

7.5

## Decision

revise
`;
}

export function qualityReport(decision, generatedAt) {
  const passed = decision === "pass";
  return {
    chapter: "ch01",
    version: passed ? "v2" : "v1",
    iteration: passed ? 2 : 1,
    decision,
    average_score: passed ? 8.4 : 7.2,
    scores: {
      accuracy: passed ? 8 : 7,
      citation_quality: passed ? 7 : 6,
      clarity: passed ? 9 : 8,
      depth: 8,
      structure: passed ? 9 : 7,
      pedagogy: 8,
      reader_fit: passed ? 9 : 8,
      style_consistency: 8,
      example_quality: passed ? 8 : 7,
      coherence: passed ? 9 : 7
    },
    blocking_issues: passed
      ? []
      : [
          {
            id: "FC-001",
            source_agent: "fact_checker",
            severity: "high",
            location: "opening paragraph",
            issue: "Broad factual claim needs evidence or softer wording.",
            required_action: "Revise claim and mark evidence requirement."
          },
          {
            id: "ED-001",
            source_agent: "structural_editor",
            severity: "medium",
            location: "ending",
            issue: "Chapter ends without a strong next action.",
            required_action: "Add a next-action section."
          }
        ],
    non_blocking_issues: passed
      ? [
          {
            id: "CT-001",
            severity: "low",
            location: "evidence requirements",
            issue: "Add external references before final export."
          }
        ]
      : [],
    generated_at: generatedAt
  };
}

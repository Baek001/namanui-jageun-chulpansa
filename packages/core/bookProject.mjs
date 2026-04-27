import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { collectAgentTaskResults } from "./agentResultCollector.mjs";
import { getAgent } from "./agentRegistry.mjs";
import { buildPublishingArtifacts } from "./exportBuilders.mjs";
import { generateAgentText, getModelRuntime } from "./modelClient.mjs";
import { runtimeEnvForAgent } from "./runtimeConfig.mjs";
import {
  DEFAULT_TITLE,
  chapterBrief,
  debateRound,
  draftChapter,
  editorialReview,
  factReview,
  harnessPlan,
  outline,
  qualityRubric,
  revisedChapter,
  sampleReview,
  sampleSpec,
  styleGuide,
  threePageSample
} from "./mockContent.mjs";
import { renderPrompt } from "./promptRenderer.mjs";
import { aggregateChapterReviews, buildRevisionPassReport } from "./qualityGate.mjs";

const ACTIONS = new Set([
  "spec",
  "debate",
  "sample",
  "harness",
  "outline",
  "briefs",
  "draft",
  "review",
  "revise",
  "chapter_loop",
  "book_loop",
  "collect_agent_results",
  "export"
]);

let runCounter = 0;

const APPROVALS = new Set([
  "book_spec",
  "interview_summary",
  "sample_direction",
  "harness_plan",
  "final_outline",
  "sample_chapter",
  "final_manuscript",
  "export"
]);

const WRITABLE_ARTIFACTS = new Set([
  "book_spec",
  "book_intent",
  "reader_profile",
  "style_direction",
  "rigor_profile",
  "sample",
  "sample_review",
  "style_guide",
  "harness_plan",
  "quality_rubric",
  "final_outline",
  "chapter_brief",
  "draft",
  "export_markdown",
  "manuscript_full",
  "export_report"
]);

function nowIso() {
  return new Date().toISOString();
}

function nextRunId() {
  runCounter = (runCounter + 1) % 100000;
  return `run_${Date.now()}_${String(runCounter).padStart(5, "0")}`;
}

function slugify(value) {
  const ascii = String(value || "")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "-")
    .replace(/^-|-$/g, "");

  return ascii || `book-${Date.now()}`;
}

function assertProjectId(projectId) {
  if (!/^[a-zA-Z0-9_-]+$/.test(projectId)) {
    throw new Error(`Invalid project id: ${projectId}`);
  }
}

async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readOptional(filePath, fallback = "") {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return fallback;
  }
}

async function writeText(filePath, content) {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, content, "utf-8");
}

async function writeJson(filePath, value) {
  await writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf-8"));
}

async function readRunHistory(projectDir) {
  const runsDir = path.join(projectDir, "runs");
  if (!(await fileExists(runsDir))) {
    return [];
  }

  const entries = await readdir(runsDir, { withFileTypes: true });
  const runs = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }

    try {
      runs.push(await readJson(path.join(runsDir, entry.name)));
    } catch {
      // Malformed run logs should not block the workspace.
    }
  }

  return runs
    .sort((a, b) => String(b.completed_at || b.started_at).localeCompare(String(a.completed_at || a.started_at)))
    .slice(0, 20);
}

function projectPath(booksRoot, projectId) {
  assertProjectId(projectId);
  return path.join(booksRoot, projectId);
}

function runtimeSummary(env = process.env) {
  const runtime = getModelRuntime(env);
  return {
    provider: runtime.provider,
    model: runtime.model
  };
}

function initialState(projectId, title, env) {
  return {
    project_id: projectId,
    title,
    phase: "created",
    model_runtime: runtimeSummary(env),
    approved: {
      book_spec: false,
      interview_summary: false,
      sample_direction: false,
      harness_plan: false,
      final_outline: false,
      sample_chapter: false,
      final_manuscript: false,
      export: false
    },
    chapters: [],
    brief: {},
    last_run_id: null,
    updated_at: nowIso()
  };
}

async function loadState(projectDir) {
  return readJson(path.join(projectDir, "state.json"));
}

async function saveState(projectDir, state, env = process.env) {
  state.model_runtime = runtimeSummary(env);
  state.updated_at = nowIso();
  await writeJson(path.join(projectDir, "state.json"), state);
}

async function appendDecision(projectDir, text) {
  const decisionPath = path.join(projectDir, "decision_log.md");
  const previous = await readOptional(decisionPath, "# Decision Log\n\n");
  await writeText(decisionPath, `${previous.trim()}\n\n${text}\n`);
}

function chapterState(id, title) {
  return {
    id,
    title,
    status: "briefed",
    current_version: null,
    approved_version: null,
    quality_score: null,
    blocking_issues: 0
  };
}

function assertArtifactExists(projectDir, relativePath, message) {
  return fileExists(path.join(projectDir, relativePath)).then((exists) => {
    if (!exists) {
      throw new Error(message);
    }
  });
}

function assertApproved(state, artifact, message) {
  if (!state.approved?.[artifact]) {
    throw new Error(message);
  }
}

async function agentText({ configRoot, agentId, templateName, values, fallback, env, runtimeConfig, taskContext }) {
  const agent = await getAgent(configRoot, agentId);
  const prompt = await renderPrompt(configRoot, templateName, values);
  const agentEnv = runtimeConfig ? runtimeEnvForAgent(runtimeConfig, { agentId, templateName }, env) : env;
  return generateAgentText({ agent, prompt, fallback, env: agentEnv, taskContext: { ...taskContext, templateName } });
}

async function writeRunLog(projectDir, run) {
  await writeJson(path.join(projectDir, "runs", `${run.run_id}.json`), run);
}

function normalizeOptions(options = {}) {
  return {
    configRoot: options.configRoot || path.resolve("config"),
    env: options.env || process.env,
    runtimeConfig: options.runtimeConfig || null
  };
}

function normalizeBookType(value) {
  return value === "professional_book" || value === "technical_manual" ? "professional_book" : "university_textbook";
}

function defaultChaptersForBrief(brief = {}) {
  if (normalizeBookType(brief.book_type) === "university_textbook") {
    return [
      chapterState("ch01", "Foundations And Learning Map"),
      chapterState("ch02", "Core Concepts And Models"),
      chapterState("ch03", "Worked Examples And Practice Problems")
    ];
  }

  return [
    chapterState("ch01", "Problem Landscape And Decision Context"),
    chapterState("ch02", "Core Framework And Operating Principles"),
    chapterState("ch03", "Implementation Playbook And Cases")
  ];
}

function defaultProjectBrief(title, input = {}) {
  const bookType = normalizeBookType(input.bookType);

  return {
    topic: input.topic?.trim() || title,
    target_reader:
      input.targetReader?.trim() ||
      (bookType === "university_textbook"
        ? "해당 과목을 수강하는 학부 또는 대학원 학생."
        : "해당 분야의 판단과 실행 기준이 필요한 현업자와 전문가."),
    purpose:
      input.purpose?.trim() ||
      (bookType === "university_textbook"
        ? "학습 목표, 개념 설명, 예제, 연습문제를 갖춘 수업용 교재를 만든다."
        : "전문가가 실제 문제 해결에 사용할 수 있는 체계적인 전문서적을 만든다."),
    book_type: bookType,
    tone:
      input.tone?.trim() ||
      (bookType === "university_textbook"
        ? "대학교재처럼 명확하고 단계적으로 설명하되 예제와 연습문제를 충분히 포함한다."
        : "전문서적처럼 정확하고 실무적이며 사례, 근거, 체크리스트를 중심으로 쓴다."),
    difficulty: input.difficulty?.trim() || "중급",
    reference_notes: input.referenceNotes?.trim() || ""
  };
}

function specValues(title, brief = {}) {
  const bookType = normalizeBookType(brief.book_type);

  return {
    title,
    bookType,
    targetReader:
      brief.target_reader ||
      (bookType === "university_textbook"
        ? "해당 과목을 수강하는 학부 또는 대학원 학생."
        : "해당 분야의 판단과 실행 기준이 필요한 현업자와 전문가."),
    purpose:
      brief.purpose ||
      (bookType === "university_textbook"
        ? "수업, 자기학습, 평가에 사용할 수 있는 대학교재를 만든다."
        : "전문가가 실무 판단에 사용할 수 있는 전문서적을 만든다.")
  };
}

function getChapters(state) {
  return state.chapters?.length ? state.chapters : defaultChaptersForBrief(state.brief);
}

function allChaptersApproved(state) {
  const chapters = getChapters(state);
  return chapters.length > 0 && chapters.every((chapter) => chapter.status === "approved" && chapter.approved_version);
}

function updateChapter(state, chapterId, patch) {
  state.chapters = getChapters(state).map((chapter) =>
    chapter.id === chapterId ? { ...chapter, ...patch } : chapter
  );
}

function yamlScalar(value) {
  return JSON.stringify(String(value ?? ""));
}

async function assertApprovalReady(projectDir, state, artifact) {
  if (artifact === "interview_summary") {
    await assertArtifactExists(projectDir, "book_intent.md", "Create the editorial interview summary before approving it.");
    await assertArtifactExists(projectDir, "reader_profile.md", "Create the reader profile before approving the interview summary.");
    return;
  }

  if (artifact === "book_spec") {
    await assertArtifactExists(projectDir, "book_spec.md", "Generate the book spec before approving it.");
    return;
  }

  if (artifact === "sample_direction") {
    assertApproved(state, "book_spec", "Approve the book spec before approving the sample direction.");
    await assertArtifactExists(projectDir, "samples/sample_01.md", "Generate the 3-page sample before approving its direction.");
    return;
  }

  if (artifact === "harness_plan") {
    assertApproved(state, "sample_direction", "Approve the sample direction before approving the harness plan.");
    await assertArtifactExists(projectDir, "harness_plan.md", "Create the harness plan before approving it.");
    await assertArtifactExists(projectDir, "quality_rubric.md", "Create the quality rubric before approving the harness plan.");
    return;
  }

  if (artifact === "final_outline") {
    assertApproved(state, "harness_plan", "Approve the harness plan before approving the final outline.");
    await assertArtifactExists(projectDir, "final_outline.md", "Generate the final outline before approving it.");
    return;
  }

  if (artifact === "sample_chapter") {
    assertApproved(state, "final_outline", "Approve the final outline before approving the sample chapter.");
    await assertArtifactExists(
      projectDir,
      "manuscript/ch01/approved.md",
      "Revise the sample chapter to an approved version before approving it."
    );
    return;
  }

  if (artifact === "final_manuscript") {
    assertApproved(state, "sample_chapter", "Approve the sample chapter before approving the final manuscript.");
    if (!allChaptersApproved(state)) {
      throw new Error("Run the full book production loop before approving the final manuscript.");
    }
    return;
  }

  if (artifact === "export") {
    assertApproved(state, "final_manuscript", "Approve the final manuscript before approving export.");
    await assertArtifactExists(projectDir, "exports/book.md", "Generate the Markdown export before approving export.");
  }
}

export async function createProject(booksRoot, input = {}, options = {}) {
  const { env } = normalizeOptions(options);
  const title = input.title?.trim() || DEFAULT_TITLE;
  let projectId = slugify(input.projectId || title);
  let projectDir = path.join(booksRoot, projectId);

  if (await fileExists(projectDir)) {
    projectId = `${projectId}-${Date.now()}`;
    projectDir = path.join(booksRoot, projectId);
  }

  await ensureDir(projectDir);
  await ensureDir(path.join(projectDir, "chapter_briefs"));
  await ensureDir(path.join(projectDir, "manuscript"));
  await ensureDir(path.join(projectDir, "reviews"));
  await ensureDir(path.join(projectDir, "quality_reports"));
  await ensureDir(path.join(projectDir, "evidence_cards"));
  await ensureDir(path.join(projectDir, "exports"));
  await ensureDir(path.join(projectDir, "samples"));
  await ensureDir(path.join(projectDir, "harness"));
  await ensureDir(path.join(projectDir, "debate_rounds"));
  await ensureDir(path.join(projectDir, "runs"));

  const runtime = runtimeSummary(env);
  const state = initialState(projectId, title, env);
  state.brief = defaultProjectBrief(title, input);

  await writeText(
    path.join(projectDir, "book.yaml"),
    `id: ${projectId}
title: ${yamlScalar(title)}
book_type: ${yamlScalar(state.brief.book_type)}
language: "ko"
created_at: ${yamlScalar(nowIso())}
template: ${yamlScalar(state.brief.book_type)}
model_profile: ${yamlScalar(runtime.provider)}
model: ${yamlScalar(runtime.model)}
topic: ${yamlScalar(state.brief.topic)}
`
  );

  await writeText(
    path.join(projectDir, "BOOKFORGE.md"),
    `# BookForge Instructions

- Keep manuscript files portable.
- Do not advance major phases without human approval.
- Use quality gates before approving chapters.
- Preserve a practical, professional editorial tone.
`
  );

  await writeText(
    path.join(projectDir, "book_intent.md"),
    `# Book Intent

## Working Title

${title}

## Topic

${state.brief.topic}

## Purpose

${state.brief.purpose}
`
  );

  await writeText(
    path.join(projectDir, "reader_profile.md"),
    `# Reader Profile

## Target Reader

${state.brief.target_reader}

## Difficulty

${state.brief.difficulty}
`
  );

  await writeText(
    path.join(projectDir, "style_direction.md"),
    `# Style Direction

## Tone

${state.brief.tone}

## Book Type

${state.brief.book_type}
`
  );

  await writeText(
    path.join(projectDir, "rigor_profile.md"),
    `# Rigor Profile

## Evidence And Depth

${state.brief.reference_notes || "Evidence requirements will be tightened after the 3-page sample discussion."}
`
  );

  await writeJson(path.join(projectDir, "state.json"), state);

  return getProject(booksRoot, projectId, options);
}

export async function listProjects(booksRoot) {
  await ensureDir(booksRoot);
  const entries = await readdir(booksRoot, { withFileTypes: true });
  const projects = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const statePath = path.join(booksRoot, entry.name, "state.json");
    if (!(await fileExists(statePath))) {
      continue;
    }

    const state = await readJson(statePath);
    projects.push({
      id: state.project_id,
      title: state.title,
      phase: state.phase,
      updated_at: state.updated_at,
      model_runtime: state.model_runtime || null,
      quality_score: state.chapters?.[0]?.quality_score ?? null
    });
  }

  return projects.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
}

export async function getProject(booksRoot, projectId) {
  const projectDir = projectPath(booksRoot, projectId);
  const state = await loadState(projectDir);
  const currentVersion = state.chapters?.[0]?.current_version || "v1";

  return {
    id: projectId,
    state,
    runs: await readRunHistory(projectDir),
    artifacts: {
      book_intent: await readOptional(path.join(projectDir, "book_intent.md")),
      reader_profile: await readOptional(path.join(projectDir, "reader_profile.md")),
      style_direction: await readOptional(path.join(projectDir, "style_direction.md")),
      rigor_profile: await readOptional(path.join(projectDir, "rigor_profile.md")),
      book_spec: await readOptional(path.join(projectDir, "book_spec.md")),
      sample: await readOptional(path.join(projectDir, "samples", "sample_01.md")),
      sample_review: await readOptional(path.join(projectDir, "sample_review.md")),
      style_guide: await readOptional(path.join(projectDir, "style_guide.md")),
      harness_plan: await readOptional(path.join(projectDir, "harness_plan.md")),
      quality_rubric: await readOptional(path.join(projectDir, "quality_rubric.md")),
      decision_log: await readOptional(path.join(projectDir, "decision_log.md")),
      final_outline: await readOptional(path.join(projectDir, "final_outline.md")),
      chapter_brief: await readOptional(path.join(projectDir, "chapter_briefs", "ch01.md")),
      draft: await readOptional(path.join(projectDir, "manuscript", "ch01", `${currentVersion}.md`)),
      approved_draft: await readOptional(path.join(projectDir, "manuscript", "ch01", "approved.md")),
      fact_review: await readOptional(path.join(projectDir, "reviews", "ch01", "v1_fact.md")),
      editorial_review: await readOptional(path.join(projectDir, "reviews", "ch01", "v1_editorial.md")),
      quality_report: await readOptional(
        path.join(projectDir, "quality_reports", "ch01", `${currentVersion}.json`)
      ),
      export_markdown: await readOptional(path.join(projectDir, "exports", "book.md")),
      manuscript_full: await readOptional(path.join(projectDir, "exports", "manuscript_full.md")),
      export_html: await readOptional(path.join(projectDir, "exports", "book.html")),
      export_report: await readOptional(path.join(projectDir, "exports", "export_report.json"))
    }
  };
}

export async function runWorkflowAction(booksRoot, projectId, action, options = {}) {
  if (!ACTIONS.has(action)) {
    throw new Error(`Unknown action: ${action}`);
  }

  const { configRoot, env, runtimeConfig } = normalizeOptions(options);
  const projectDir = projectPath(booksRoot, projectId);
  const state = await loadState(projectDir);
  const title = state.title || DEFAULT_TITLE;
  const runId = nextRunId();
  const startedAt = nowIso();
  const taskContext = { projectId, projectDir, runId, action };

  if (action === "chapter_loop") {
    return runSampleChapterLoop(booksRoot, projectId, options);
  }

  if (action === "book_loop") {
    return runFullBookLoop(booksRoot, projectId, options);
  }

  if (action === "collect_agent_results") {
    const collected = await collectAgentTaskResults({ projectDir, state });
    state.last_run_id = runId;
    await appendDecision(projectDir, `## ${runId}\n\nCollected ${collected.length} external agent result bundle(s).`);
    await saveState(projectDir, state, env);
    await writeRunLog(projectDir, {
      run_id: runId,
      project_id: projectId,
      action,
      provider: state.model_runtime.provider,
      model: state.model_runtime.model,
      started_at: startedAt,
      completed_at: nowIso(),
      collected
    });
    return getProject(booksRoot, projectId, options);
  }

  if (action === "spec") {
    const values = specValues(title, state.brief);
    const result = await agentText({
      configRoot,
      env,
      runtimeConfig,
      agentId: "orchestrator",
      templateName: "spec",
      values,
      fallback: () => sampleSpec(values),
      taskContext
    });

    await writeText(path.join(projectDir, "book_spec.md"), result.text);
    state.phase = "spec";
    await appendDecision(projectDir, `## ${runId}\n\nGenerated initial book spec with ${result.runtime.provider}.`);
  }

  if (action === "debate") {
    assertApproved(state, "book_spec", "Approve the book spec before running debate.");
    const bookSpec = await readOptional(path.join(projectDir, "book_spec.md"));
    const result = await agentText({
      configRoot,
      env,
      runtimeConfig,
      agentId: "critic",
      templateName: "debate",
      values: { bookSpec },
      fallback: () => debateRound(title),
      taskContext
    });

    await writeText(path.join(projectDir, "debate_rounds", "round_01.md"), result.text);
    await appendDecision(projectDir, `## ${runId}\n\nDebate completed with ${result.runtime.provider}.`);
    state.phase = "debate";
  }

  if (action === "sample") {
    await assertArtifactExists(projectDir, "book_spec.md", "Generate the book spec before creating a sample.");
    const sample = threePageSample({
      title,
      topic: state.brief?.topic,
      targetReader: state.brief?.target_reader,
      difficulty: state.brief?.difficulty,
      bookType: state.brief?.book_type,
      tone: state.brief?.tone
    });

    await writeText(path.join(projectDir, "samples", "sample_01.md"), sample);
    await writeText(path.join(projectDir, "sample_review.md"), sampleReview());
    await writeText(
      path.join(projectDir, "style_guide.md"),
      styleGuide({
        tone: state.brief?.tone,
        difficulty: state.brief?.difficulty,
        bookType: state.brief?.book_type
      })
    );
    state.phase = "sample";
    await appendDecision(projectDir, `## ${runId}\n\nGenerated 3-page sample for direction discussion.`);
  }

  if (action === "harness") {
    assertApproved(state, "sample_direction", "Approve the sample direction before creating the harness plan.");
    await assertArtifactExists(projectDir, "samples/sample_01.md", "Generate the 3-page sample before creating the harness plan.");
    const result = outline(title, state.brief);

    await writeText(path.join(projectDir, "harness_plan.md"), harnessPlan(title, state.brief));
    await writeText(path.join(projectDir, "quality_rubric.md"), qualityRubric(state.brief));
    await writeText(path.join(projectDir, "final_outline.md"), result);
    state.chapters = defaultChaptersForBrief(state.brief);
    state.phase = "outline";
    await appendDecision(projectDir, `## ${runId}\n\nCreated harness plan, quality rubric, and final outline draft.`);
  }

  if (action === "outline") {
    await assertArtifactExists(projectDir, "debate_rounds/round_01.md", "Run debate before generating the outline.");
    const bookSpec = await readOptional(path.join(projectDir, "book_spec.md"));
    const decisionLog = await readOptional(path.join(projectDir, "decision_log.md"));
    const result = await agentText({
      configRoot,
      env,
      runtimeConfig,
      agentId: "orchestrator",
      templateName: "outline",
      values: { bookSpec, decisionLog },
      fallback: () => outline(title, state.brief),
      taskContext
    });

    await writeText(path.join(projectDir, "final_outline.md"), result.text);
    state.chapters = defaultChaptersForBrief(state.brief);
    state.phase = "outline";
    await appendDecision(projectDir, `## ${runId}\n\nGenerated final outline candidate with ${result.runtime.provider}.`);
  }

  if (action === "briefs") {
    assertApproved(state, "final_outline", "Approve the final outline before creating chapter briefs.");
    const bookSpec = await readOptional(path.join(projectDir, "book_spec.md"));
    const finalOutline = await readOptional(path.join(projectDir, "final_outline.md"));
    const chapters = state.chapters.length
      ? state.chapters
      : defaultChaptersForBrief(state.brief);

    for (const chapter of chapters.slice(0, 3)) {
      const result = await agentText({
        configRoot,
        env,
        runtimeConfig,
        agentId: "orchestrator",
        templateName: "chapter_brief",
        values: {
          bookSpec,
          finalOutline,
          chapterId: chapter.id,
          chapterTitle: chapter.title
        },
        fallback: () => chapterBrief(chapter.id, chapter.title, state.brief),
        taskContext
      });
      await writeText(path.join(projectDir, "chapter_briefs", `${chapter.id}.md`), result.text);
    }

    state.phase = "briefing";
    state.chapters = chapters.map((chapter) => ({ ...chapter, status: "briefed" }));
  }

  if (action === "draft") {
    assertApproved(state, "final_outline", "Approve the final outline before drafting.");
    await assertArtifactExists(projectDir, "chapter_briefs/ch01.md", "Create chapter briefs before drafting.");

    const bookSpec = await readOptional(path.join(projectDir, "book_spec.md"));
    const chapterBriefText = await readOptional(path.join(projectDir, "chapter_briefs", "ch01.md"));
    const result = await agentText({
      configRoot,
      env,
      runtimeConfig,
      agentId: "chapter_writer",
      templateName: "chapter_draft",
      values: { bookSpec, chapterBrief: chapterBriefText },
      fallback: () => draftChapter(title, state.brief),
      taskContext
    });

    await writeText(path.join(projectDir, "manuscript", "ch01", "v1.md"), result.text);
    state.phase = "drafting";
    state.chapters = state.chapters.length ? state.chapters : defaultChaptersForBrief(state.brief);
    state.chapters[0] = {
      ...state.chapters[0],
      status: "drafted",
      current_version: "v1",
      quality_score: null,
      blocking_issues: null
    };
  }

  if (action === "review") {
    await assertArtifactExists(projectDir, "manuscript/ch01/v1.md", "Draft chapter 1 before review.");
    const bookSpec = await readOptional(path.join(projectDir, "book_spec.md"));
    const chapterBriefText = await readOptional(path.join(projectDir, "chapter_briefs", "ch01.md"));
    const draft = await readOptional(path.join(projectDir, "manuscript", "ch01", "v1.md"));

    const factResult = await agentText({
      configRoot,
      env,
      runtimeConfig,
      agentId: "fact_checker",
      templateName: "review",
      values: {
        bookSpec,
        chapterBrief: chapterBriefText,
        draft,
        reviewDimension: "factual accuracy and citation quality"
      },
      fallback: factReview,
      taskContext
    });

    const editorialResult = await agentText({
      configRoot,
      env,
      runtimeConfig,
      agentId: "structural_editor",
      templateName: "review",
      values: {
        bookSpec,
        chapterBrief: chapterBriefText,
        draft,
        reviewDimension: "structure, pedagogy, examples, and reader action"
      },
      fallback: editorialReview,
      taskContext
    });

    await writeText(path.join(projectDir, "reviews", "ch01", "v1_fact.md"), factResult.text);
    await writeText(path.join(projectDir, "reviews", "ch01", "v1_editorial.md"), editorialResult.text);
    const report = aggregateChapterReviews({
      chapter: "ch01",
      version: "v1",
      iteration: 1,
      generatedAt: nowIso(),
      reviews: [
        { sourceAgent: "fact_checker", markdown: factResult.text },
        { sourceAgent: "structural_editor", markdown: editorialResult.text }
      ]
    });
    await writeJson(path.join(projectDir, "quality_reports", "ch01", "v1.json"), report);
    state.phase = "review";
    state.chapters = state.chapters.length ? state.chapters : defaultChaptersForBrief(state.brief);
    state.chapters[0] = {
      ...state.chapters[0],
      status: "revision_needed",
      current_version: "v1",
      quality_score: report.average_score,
      blocking_issues: report.blocking_issues.length
    };
  }

  if (action === "revise") {
    await assertArtifactExists(projectDir, "quality_reports/ch01/v1.json", "Review chapter 1 before revision.");
    const draft = await readOptional(path.join(projectDir, "manuscript", "ch01", "v1.md"));
    const revisionPlan = await readOptional(path.join(projectDir, "quality_reports", "ch01", "v1.json"));
    const result = await agentText({
      configRoot,
      env,
      runtimeConfig,
      agentId: "chapter_writer",
      templateName: "revision",
      values: { draft, revisionPlan },
      fallback: () => revisedChapter(title, state.brief),
      taskContext
    });

    await writeText(path.join(projectDir, "manuscript", "ch01", "v2.md"), result.text);
    await writeText(path.join(projectDir, "manuscript", "ch01", "approved.md"), result.text);
    const report = buildRevisionPassReport({
      chapter: "ch01",
      version: "v2",
      iteration: 2,
      generatedAt: nowIso()
    });
    await writeJson(path.join(projectDir, "quality_reports", "ch01", "v2.json"), report);
    state.phase = "revision";
    state.chapters = state.chapters.length ? state.chapters : defaultChaptersForBrief(state.brief);
    state.chapters[0] = {
      ...state.chapters[0],
      status: "approved",
      current_version: "v2",
      approved_version: "v2",
      quality_score: report.average_score,
      blocking_issues: report.blocking_issues.length
    };
  }

  if (action === "export") {
    assertApproved(state, "final_manuscript", "Approve the final manuscript before export.");
    await buildPublishingArtifacts({
      projectDir,
      state,
      title,
      generatedAt: nowIso()
    });
    state.phase = "export";
  }

  state.last_run_id = runId;
  await saveState(projectDir, state, env);
  await writeRunLog(projectDir, {
    run_id: runId,
    project_id: projectId,
    action,
    provider: state.model_runtime.provider,
    model: state.model_runtime.model,
    started_at: startedAt,
    completed_at: nowIso()
  });

  return getProject(booksRoot, projectId, options);
}

function artifactWritePath(projectDir, state, artifact) {
  if (artifact === "book_intent") {
    return path.join(projectDir, "book_intent.md");
  }

  if (artifact === "reader_profile") {
    return path.join(projectDir, "reader_profile.md");
  }

  if (artifact === "style_direction") {
    return path.join(projectDir, "style_direction.md");
  }

  if (artifact === "rigor_profile") {
    return path.join(projectDir, "rigor_profile.md");
  }

  if (artifact === "book_spec") {
    return path.join(projectDir, "book_spec.md");
  }

  if (artifact === "sample") {
    return path.join(projectDir, "samples", "sample_01.md");
  }

  if (artifact === "sample_review") {
    return path.join(projectDir, "sample_review.md");
  }

  if (artifact === "style_guide") {
    return path.join(projectDir, "style_guide.md");
  }

  if (artifact === "harness_plan") {
    return path.join(projectDir, "harness_plan.md");
  }

  if (artifact === "quality_rubric") {
    return path.join(projectDir, "quality_rubric.md");
  }

  if (artifact === "final_outline") {
    return path.join(projectDir, "final_outline.md");
  }

  if (artifact === "chapter_brief") {
    return path.join(projectDir, "chapter_briefs", "ch01.md");
  }

  if (artifact === "draft") {
    const currentVersion = state.chapters?.[0]?.current_version || "v1";
    return path.join(projectDir, "manuscript", "ch01", `${currentVersion}.md`);
  }

  if (artifact === "export_markdown") {
    return path.join(projectDir, "exports", "book.md");
  }

  if (artifact === "manuscript_full") {
    return path.join(projectDir, "exports", "manuscript_full.md");
  }

  if (artifact === "export_report") {
    return path.join(projectDir, "exports", "export_report.json");
  }

  throw new Error(`Artifact is not editable: ${artifact}`);
}

export async function updateArtifact(booksRoot, projectId, artifact, input = {}, options = {}) {
  if (!WRITABLE_ARTIFACTS.has(artifact)) {
    throw new Error(`Artifact is not editable: ${artifact}`);
  }

  const { env } = normalizeOptions(options);
  const projectDir = projectPath(booksRoot, projectId);
  const state = await loadState(projectDir);
  const content = typeof input.content === "string" ? input.content : "";

  if (artifact === "draft" && !state.chapters?.length) {
    state.chapters = defaultChaptersForBrief(state.brief).slice(0, 1);
    state.chapters[0].current_version = "v1";
    state.chapters[0].status = "drafted";
  }

  await writeText(artifactWritePath(projectDir, state, artifact), content);
  state.last_manual_edit = {
    artifact,
    edited_at: nowIso()
  };
  await saveState(projectDir, state, env);

  return getProject(booksRoot, projectId, options);
}

async function ensureChapterBrief({ projectDir, state, title, chapter, configRoot, env, runtimeConfig, taskContext }) {
  const briefPath = path.join(projectDir, "chapter_briefs", `${chapter.id}.md`);
  if (await fileExists(briefPath)) {
    return readOptional(briefPath);
  }

  const bookSpec = await readOptional(path.join(projectDir, "book_spec.md"));
  const finalOutline = await readOptional(path.join(projectDir, "final_outline.md"));
  const result = await agentText({
    configRoot,
    env,
    runtimeConfig,
    agentId: "orchestrator",
    templateName: "chapter_brief",
    values: {
      bookSpec,
      finalOutline,
      chapterId: chapter.id,
      chapterTitle: chapter.title
    },
    fallback: () => chapterBrief(chapter.id, chapter.title, state.brief),
    taskContext: { ...taskContext, chapterId: chapter.id }
  });
  await writeText(briefPath, result.text);
  return result.text;
}

async function draftChapterVersion({ projectDir, state, title, chapter, configRoot, env, runtimeConfig, taskContext }) {
  const draftPath = path.join(projectDir, "manuscript", chapter.id, "v1.md");
  if (await fileExists(draftPath)) {
    return readOptional(draftPath);
  }

  const bookSpec = await readOptional(path.join(projectDir, "book_spec.md"));
  const chapterBriefText = await ensureChapterBrief({ projectDir, state, title, chapter, configRoot, env, runtimeConfig, taskContext });
  const result = await agentText({
    configRoot,
    env,
    runtimeConfig,
    agentId: "chapter_writer",
    templateName: "chapter_draft",
    values: { bookSpec, chapterBrief: chapterBriefText },
    fallback: () => draftChapter(`${title}: ${chapter.title}`, state.brief),
    taskContext: { ...taskContext, chapterId: chapter.id }
  });

  await writeText(draftPath, result.text);
  updateChapter(state, chapter.id, {
    status: "drafted",
    current_version: "v1",
    quality_score: null,
    blocking_issues: null
  });
  return result.text;
}

async function reviewChapterVersion({ projectDir, state, title, chapter, configRoot, env, runtimeConfig, taskContext }) {
  const reportPath = path.join(projectDir, "quality_reports", chapter.id, "v1.json");
  if (await fileExists(reportPath)) {
    return readJson(reportPath);
  }

  const bookSpec = await readOptional(path.join(projectDir, "book_spec.md"));
  const chapterBriefText = await ensureChapterBrief({ projectDir, state, title, chapter, configRoot, env, runtimeConfig, taskContext });
  const draft = await draftChapterVersion({ projectDir, state, title, chapter, configRoot, env, runtimeConfig, taskContext });

  const factResult = await agentText({
    configRoot,
    env,
    runtimeConfig,
    agentId: "fact_checker",
    templateName: "review",
    values: {
      bookSpec,
      chapterBrief: chapterBriefText,
      draft,
      reviewDimension: "factual accuracy and citation quality"
    },
    fallback: factReview,
    taskContext: { ...taskContext, chapterId: chapter.id }
  });

  const editorialResult = await agentText({
    configRoot,
    env,
    runtimeConfig,
    agentId: "structural_editor",
    templateName: "review",
    values: {
      bookSpec,
      chapterBrief: chapterBriefText,
      draft,
      reviewDimension: "structure, pedagogy, examples, and reader action"
    },
    fallback: editorialReview,
    taskContext: { ...taskContext, chapterId: chapter.id }
  });

  await writeText(path.join(projectDir, "reviews", chapter.id, "v1_fact.md"), factResult.text);
  await writeText(path.join(projectDir, "reviews", chapter.id, "v1_editorial.md"), editorialResult.text);

  const report = aggregateChapterReviews({
    chapter: chapter.id,
    version: "v1",
    iteration: 1,
    generatedAt: nowIso(),
    reviews: [
      { sourceAgent: "fact_checker", markdown: factResult.text },
      { sourceAgent: "structural_editor", markdown: editorialResult.text }
    ]
  });
  await writeJson(reportPath, report);
  updateChapter(state, chapter.id, {
    status: "revision_needed",
    current_version: "v1",
    quality_score: report.average_score,
    blocking_issues: report.blocking_issues.length
  });
  return report;
}

async function reviseChapterVersion({ projectDir, state, title, chapter, configRoot, env, runtimeConfig, taskContext }) {
  const approvedPath = path.join(projectDir, "manuscript", chapter.id, "approved.md");
  if (await fileExists(approvedPath)) {
    return readOptional(approvedPath);
  }

  const draft = await draftChapterVersion({ projectDir, state, title, chapter, configRoot, env, runtimeConfig, taskContext });
  const revisionPlan = await readOptional(path.join(projectDir, "quality_reports", chapter.id, "v1.json"));
  const result = await agentText({
    configRoot,
    env,
    runtimeConfig,
    agentId: "chapter_writer",
    templateName: "revision",
    values: { draft, revisionPlan },
    fallback: () => revisedChapter(`${title}: ${chapter.title}`, state.brief),
    taskContext: { ...taskContext, chapterId: chapter.id }
  });

  await writeText(path.join(projectDir, "manuscript", chapter.id, "v2.md"), result.text);
  await writeText(approvedPath, result.text);
  const report = buildRevisionPassReport({
    chapter: chapter.id,
    version: "v2",
    iteration: 2,
    generatedAt: nowIso()
  });
  await writeJson(path.join(projectDir, "quality_reports", chapter.id, "v2.json"), report);
  updateChapter(state, chapter.id, {
    status: "approved",
    current_version: "v2",
    approved_version: "v2",
    quality_score: report.average_score,
    blocking_issues: report.blocking_issues.length
  });
  return result.text;
}

async function runChapterProduction({ projectDir, state, title, chapter, configRoot, env, runtimeConfig, taskContext }) {
  await ensureChapterBrief({ projectDir, state, title, chapter, configRoot, env, runtimeConfig, taskContext });
  await draftChapterVersion({ projectDir, state, title, chapter, configRoot, env, runtimeConfig, taskContext });
  const report = await reviewChapterVersion({ projectDir, state, title, chapter, configRoot, env, runtimeConfig, taskContext });

  if (report.decision === "pass" && Number(report.average_score || 0) >= 8 && !report.blocking_issues?.length) {
    const draft = await readOptional(path.join(projectDir, "manuscript", chapter.id, "v1.md"));
    await writeText(path.join(projectDir, "manuscript", chapter.id, "approved.md"), draft);
    updateChapter(state, chapter.id, {
      status: "approved",
      current_version: "v1",
      approved_version: "v1",
      quality_score: report.average_score,
      blocking_issues: 0
    });
    return;
  }

  await reviseChapterVersion({ projectDir, state, title, chapter, configRoot, env, runtimeConfig, taskContext });
}

async function writeFullManuscriptPreview(projectDir, state, title) {
  const chapters = getChapters(state);
  const approved = [];

  for (const chapter of chapters) {
    const markdown = await readOptional(path.join(projectDir, "manuscript", chapter.id, "approved.md"));
    if (markdown.trim()) {
      approved.push({ chapter, markdown: markdown.trim() });
    }
  }

  if (!approved.length) {
    return;
  }

  const toc = approved.map(({ chapter }, index) => `- Chapter ${index + 1}. ${chapter.title}`).join("\n");
  await writeText(
    path.join(projectDir, "exports", "manuscript_full.md"),
    `# ${title}

## Table Of Contents

${toc}

${approved.map(({ markdown }) => markdown).join("\n\n")}
`
  );
}

export async function runSampleChapterLoop(booksRoot, projectId, options = {}) {
  let project = await getProject(booksRoot, projectId, options);
  const approvals = project.state.approved || {};

  if (!approvals.final_outline) {
    throw new Error("Approve the final outline before running the sample chapter quality loop.");
  }

  if (!project.artifacts.chapter_brief?.trim()) {
    project = await runWorkflowAction(booksRoot, projectId, "briefs", options);
  }

  if (!project.artifacts.draft?.trim() && !project.artifacts.approved_draft?.trim()) {
    project = await runWorkflowAction(booksRoot, projectId, "draft", options);
  }

  const maxIterations = Number(options.maxIterations || process.env.BOOKFORGE_MAX_CHAPTER_ITERATIONS || 3);

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    project = await getProject(booksRoot, projectId, options);

    if (project.artifacts.approved_draft?.trim()) {
      return project;
    }

    if (!project.artifacts.quality_report?.trim()) {
      project = await runWorkflowAction(booksRoot, projectId, "review", options);
    }

    let report = null;
    try {
      report = JSON.parse(project.artifacts.quality_report || "{}");
    } catch {
      report = null;
    }

    if (report?.decision === "pass" && Number(report?.average_score || 0) >= 8) {
      return project;
    }

    project = await runWorkflowAction(booksRoot, projectId, "revise", options);
  }

  return getProject(booksRoot, projectId, options);
}

export async function runFullBookLoop(booksRoot, projectId, options = {}) {
  const { configRoot, env, runtimeConfig } = normalizeOptions(options);
  const projectDir = projectPath(booksRoot, projectId);
  const state = await loadState(projectDir);
  const title = state.title || DEFAULT_TITLE;
  const runId = nextRunId();
  const startedAt = nowIso();

  assertApproved(state, "sample_chapter", "Approve the sample chapter before running the full book production loop.");
  assertApproved(state, "final_outline", "Approve the final outline before running the full book production loop.");

  state.chapters = getChapters(state);
  for (const chapter of state.chapters) {
    await runChapterProduction({
      projectDir,
      state,
      title,
      chapter,
      configRoot,
      env,
      runtimeConfig,
      taskContext: {
        projectId,
        projectDir,
        runId,
        action: "book_loop",
        chapterId: chapter.id
      }
    });
  }

  state.phase = "editing";
  state.last_run_id = runId;
  await writeFullManuscriptPreview(projectDir, state, title);
  await appendDecision(projectDir, `## ${runId}\n\nCompleted full book production loop for ${state.chapters.length} chapters.`);
  await saveState(projectDir, state, env);
  await writeRunLog(projectDir, {
    run_id: runId,
    project_id: projectId,
    action: "book_loop",
    provider: state.model_runtime.provider,
    model: state.model_runtime.model,
    started_at: startedAt,
    completed_at: nowIso(),
    chapters: state.chapters.map((chapter) => ({
      id: chapter.id,
      status: chapter.status,
      quality_score: chapter.quality_score,
      blocking_issues: chapter.blocking_issues
    }))
  });

  return getProject(booksRoot, projectId, options);
}

export async function approveArtifact(booksRoot, projectId, artifact, input = {}, options = {}) {
  if (!APPROVALS.has(artifact)) {
    throw new Error(`Unknown approval artifact: ${artifact}`);
  }

  const { env } = normalizeOptions(options);
  const projectDir = projectPath(booksRoot, projectId);
  const state = await loadState(projectDir);

  await assertApprovalReady(projectDir, state, artifact);
  state.approved[artifact] = true;
  await appendDecision(
    projectDir,
    `## Approval: ${artifact}

Approved at: ${nowIso()}

Notes: ${input.notes || "Approved through local UI."}
`
  );
  await saveState(projectDir, state, env);
  return getProject(booksRoot, projectId, options);
}

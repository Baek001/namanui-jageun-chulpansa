import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

function nowIso() {
  return new Date().toISOString();
}

async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf-8"));
}

async function writeText(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf-8");
}

async function writeJson(filePath, value) {
  await writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function chapterIdFor(task) {
  return task.chapter_id || task.output_contract?.chapter_id || "ch01";
}

function ensureChapter(state, chapterId) {
  if (!state.chapters?.length) {
    state.chapters = [{ id: chapterId, title: chapterId, status: "created" }];
  }

  if (!state.chapters.some((chapter) => chapter.id === chapterId)) {
    state.chapters.push({
      id: chapterId,
      title: chapterId,
      status: "created",
      current_version: null,
      approved_version: null,
      quality_score: null,
      blocking_issues: null
    });
  }
}

function updateChapter(state, chapterId, patch) {
  ensureChapter(state, chapterId);
  state.chapters = state.chapters.map((chapter) =>
    chapter.id === chapterId ? { ...chapter, ...patch } : chapter
  );
}

function artifactTargets(projectDir, state, task) {
  const target = task.output_contract?.target_artifact || "external_result";
  const chapterId = chapterIdFor(task);

  if (target === "book_spec") {
    state.phase = "spec";
    return [path.join(projectDir, "book_spec.md")];
  }

  if (target === "debate_round") {
    state.phase = "debate";
    return [path.join(projectDir, "debate_rounds", "round_01.md")];
  }

  if (target === "final_outline") {
    state.phase = "outline";
    return [path.join(projectDir, "final_outline.md")];
  }

  if (target === "chapter_brief") {
    updateChapter(state, chapterId, { status: "briefed" });
    return [path.join(projectDir, "chapter_briefs", `${chapterId}.md`)];
  }

  if (target === "chapter_draft") {
    updateChapter(state, chapterId, {
      status: "drafted",
      current_version: "v1",
      quality_score: null,
      blocking_issues: null
    });
    return [path.join(projectDir, "manuscript", chapterId, "v1.md")];
  }

  if (target === "fact_review") {
    updateChapter(state, chapterId, { status: "reviewed" });
    return [path.join(projectDir, "reviews", chapterId, "v1_fact.md")];
  }

  if (target === "editorial_review") {
    updateChapter(state, chapterId, { status: "reviewed" });
    return [path.join(projectDir, "reviews", chapterId, "v1_editorial.md")];
  }

  if (target === "chapter_revision") {
    updateChapter(state, chapterId, {
      status: "approved",
      current_version: "v2",
      approved_version: "v2",
      blocking_issues: 0
    });
    return [
      path.join(projectDir, "manuscript", chapterId, "v2.md"),
      path.join(projectDir, "manuscript", chapterId, "approved.md")
    ];
  }

  return [path.join(projectDir, "agent_tasks", "collected_results", `${task.bundle_id || Date.now()}.md`)];
}

async function listTaskDirs(projectDir) {
  const taskRoot = path.join(projectDir, "agent_tasks");
  if (!(await fileExists(taskRoot))) {
    return [];
  }

  const entries = await readdir(taskRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && entry.name !== "collected_results")
    .map((entry) => path.join(taskRoot, entry.name));
}

export async function collectAgentTaskResults({ projectDir, state }) {
  const taskDirs = await listTaskDirs(projectDir);
  const collected = [];

  for (const taskDir of taskDirs) {
    const taskPath = path.join(taskDir, "task.json");
    const resultPath = path.join(taskDir, "output", "result.md");
    const markerPath = path.join(taskDir, "collected.json");

    if (!(await fileExists(taskPath)) || !(await fileExists(resultPath)) || (await fileExists(markerPath))) {
      continue;
    }

    const task = await readJson(taskPath);
    const result = await readFile(resultPath, "utf-8");
    const targets = artifactTargets(projectDir, state, task);

    for (const targetPath of targets) {
      await writeText(targetPath, result);
    }

    const marker = {
      collected_at: nowIso(),
      task: task.bundle_id,
      target_artifacts: targets.map((targetPath) => path.relative(projectDir, targetPath).replace(/\\/g, "/"))
    };
    await writeJson(markerPath, marker);
    collected.push(marker);
  }

  return collected;
}

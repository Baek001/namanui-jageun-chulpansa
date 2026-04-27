import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  approveArtifact,
  createProject,
  getProject,
  listProjects,
  runWorkflowAction,
  updateArtifact
} from "../packages/core/bookProject.mjs";

async function withTempBooks(testFn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "bookforge-"));
  try {
    await testFn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

await withTempBooks(async (booksRoot) => {
  const created = await createProject(booksRoot, {
    title: "A \"quoted\" title\nsecond line"
  });
  const bookYaml = await readFile(path.join(booksRoot, created.id, "book.yaml"), "utf-8");

  assert.match(bookYaml, /title: "A \\"quoted\\" title\\nsecond line"/);
  await assert.rejects(
    () => approveArtifact(booksRoot, created.id, "sample_chapter"),
    /Approve the final outline|Approve the sample chapter/
  );
});

await withTempBooks(async (booksRoot) => {
  const created = await createProject(booksRoot, {
    title: "AI 시대의 1인 출판"
  });

  assert.equal(created.state.phase, "created");
  assert.equal(created.state.approved.book_spec, false);

  const projects = await listProjects(booksRoot);
  assert.equal(projects.length, 1);

  let project = await runWorkflowAction(booksRoot, created.id, "spec");
  assert.equal(project.state.phase, "spec");
  assert.match(project.artifacts.book_spec, /Book Spec/);
  assert.equal(project.runs.length, 1);
  assert.equal(project.runs[0].action, "spec");

  project = await updateArtifact(booksRoot, created.id, "book_spec", {
    content: `${project.artifacts.book_spec.trim()}\n\n## Manual Note\n\nEdited in the workspace.`
  });
  assert.match(project.artifacts.book_spec, /Manual Note/);

  await assert.rejects(
    () => runWorkflowAction(booksRoot, created.id, "debate"),
    /Approve the book spec/
  );

  project = await approveArtifact(booksRoot, created.id, "book_spec");
  assert.equal(project.state.approved.book_spec, true);

  project = await runWorkflowAction(booksRoot, created.id, "sample");
  assert.equal(project.state.phase, "sample");
  assert.match(project.artifacts.sample, /미리보기 원고/);

  await assert.rejects(
    () => runWorkflowAction(booksRoot, created.id, "harness"),
    /Approve the sample direction/
  );

  project = await approveArtifact(booksRoot, created.id, "sample_direction");
  assert.equal(project.state.approved.sample_direction, true);

  project = await runWorkflowAction(booksRoot, created.id, "harness");
  assert.equal(project.state.chapters.length, 3);
  assert.match(project.artifacts.final_outline, /Final Outline/);
  assert.match(project.artifacts.harness_plan, /Harness Plan/);

  project = await approveArtifact(booksRoot, created.id, "harness_plan");
  assert.equal(project.state.approved.harness_plan, true);

  await assert.rejects(
    () => runWorkflowAction(booksRoot, created.id, "draft"),
    /Approve the final outline/
  );

  project = await approveArtifact(booksRoot, created.id, "final_outline");
  assert.equal(project.state.approved.final_outline, true);

  project = await runWorkflowAction(booksRoot, created.id, "briefs");
  assert.equal(project.state.phase, "briefing");

  project = await runWorkflowAction(booksRoot, created.id, "draft");
  assert.equal(project.state.chapters[0].current_version, "v1");

  project = await runWorkflowAction(booksRoot, created.id, "review");
  assert.equal(project.state.chapters[0].blocking_issues, 2);
  assert.equal(project.state.chapters[0].quality_score, 7.3);
  assert.match(project.artifacts.quality_report, /fact_checker/);

  await assert.rejects(
    () => approveArtifact(booksRoot, created.id, "sample_chapter"),
    /Revise the sample chapter/
  );

  project = await runWorkflowAction(booksRoot, created.id, "revise");
  assert.equal(project.state.chapters[0].blocking_issues, 0);
  assert.equal(project.state.chapters[0].approved_version, "v2");

  await assert.rejects(
    () => runWorkflowAction(booksRoot, created.id, "export"),
    /Approve the final manuscript/
  );

  project = await approveArtifact(booksRoot, created.id, "sample_chapter");
  assert.equal(project.state.approved.sample_chapter, true);

  project = await runWorkflowAction(booksRoot, created.id, "book_loop");
  assert.equal(project.state.chapters.length, 3);
  assert.equal(project.state.chapters.every((chapter) => chapter.status === "approved"), true);

  await assert.rejects(
    () => runWorkflowAction(booksRoot, created.id, "export"),
    /Approve the final manuscript/
  );

  project = await approveArtifact(booksRoot, created.id, "final_manuscript");
  assert.equal(project.state.approved.final_manuscript, true);

  project = await runWorkflowAction(booksRoot, created.id, "export");
  assert.match(project.artifacts.export_markdown, /Table Of Contents/);
  assert.match(project.artifacts.manuscript_full, /Chapter 3/);
  assert.match(project.artifacts.export_html, /<!doctype html>/);
  assert.match(project.artifacts.export_report, /book\.epub/);

  const loaded = await getProject(booksRoot, created.id);
  assert.equal(loaded.state.phase, "export");
});

await withTempBooks(async (booksRoot) => {
  const created = await createProject(booksRoot, {
    title: "Quality Loop Book",
    bookType: "university_textbook"
  });

  let project = await runWorkflowAction(booksRoot, created.id, "spec");
  project = await approveArtifact(booksRoot, created.id, "book_spec");
  project = await runWorkflowAction(booksRoot, created.id, "sample");
  project = await approveArtifact(booksRoot, created.id, "sample_direction");
  project = await runWorkflowAction(booksRoot, created.id, "harness");
  project = await approveArtifact(booksRoot, created.id, "harness_plan");
  project = await approveArtifact(booksRoot, created.id, "final_outline");

  project = await runWorkflowAction(booksRoot, created.id, "chapter_loop");

  assert.match(project.artifacts.approved_draft, /Revision/);
  assert.equal(project.state.chapters[0].status, "approved");
  assert.equal(project.state.chapters[0].blocking_issues, 0);
});

await withTempBooks(async (booksRoot) => {
  const created = await createProject(booksRoot, {
    title: "Full Book Loop",
    bookType: "professional_book"
  });

  let project = await runWorkflowAction(booksRoot, created.id, "spec");
  project = await approveArtifact(booksRoot, created.id, "book_spec");
  project = await runWorkflowAction(booksRoot, created.id, "sample");
  project = await approveArtifact(booksRoot, created.id, "sample_direction");
  project = await runWorkflowAction(booksRoot, created.id, "harness");
  project = await approveArtifact(booksRoot, created.id, "harness_plan");
  project = await approveArtifact(booksRoot, created.id, "final_outline");
  project = await runWorkflowAction(booksRoot, created.id, "chapter_loop");
  project = await approveArtifact(booksRoot, created.id, "sample_chapter");
  project = await runWorkflowAction(booksRoot, created.id, "book_loop");

  assert.equal(project.state.phase, "editing");
  assert.equal(project.state.chapters.every((chapter) => chapter.status === "approved"), true);

  project = await approveArtifact(booksRoot, created.id, "final_manuscript");
  project = await runWorkflowAction(booksRoot, created.id, "export");

  const pdf = await readFile(path.join(booksRoot, created.id, "exports", "book.pdf"));
  const epub = await readFile(path.join(booksRoot, created.id, "exports", "book.epub"));
  const docx = await readFile(path.join(booksRoot, created.id, "exports", "book.docx"));

  assert.equal(pdf.subarray(0, 4).toString("utf-8"), "%PDF");
  assert.equal(epub.subarray(0, 2).toString("utf-8"), "PK");
  assert.equal(docx.subarray(0, 2).toString("utf-8"), "PK");
  assert.match(project.artifacts.export_report, /book\.pdf/);
});

await withTempBooks(async (booksRoot) => {
  const created = await createProject(
    booksRoot,
    {
      title: "Local Agent Bundle",
      bookType: "professional_book"
    },
    {
      env: {
        ...process.env,
        BOOKFORGE_MODEL_PROVIDER: "local_agent",
        BOOKFORGE_LOCAL_AGENT_NAME: "test-local-worker"
      }
    }
  );

  const project = await runWorkflowAction(booksRoot, created.id, "spec", {
    env: {
      ...process.env,
      BOOKFORGE_MODEL_PROVIDER: "local_agent",
      BOOKFORGE_LOCAL_AGENT_NAME: "test-local-worker"
    }
  });

  assert.match(project.artifacts.book_spec, /Book Spec/);

  const taskJson = await readFile(
    path.join(booksRoot, created.id, "agent_tasks", project.state.last_run_id + "__orchestrator__spec", "task.json"),
    "utf-8"
  );
  const task = JSON.parse(taskJson);

  assert.equal(task.runtime.provider, "local_agent");
  assert.equal(task.agent.id, "orchestrator");
  assert.equal(task.template, "spec");
  assert.equal(task.output_contract.target_artifact, "book_spec");
});

await withTempBooks(async (booksRoot) => {
  const env = {
    ...process.env,
    BOOKFORGE_MODEL_PROVIDER: "local_agent",
    BOOKFORGE_LOCAL_AGENT_NAME: "external-writer"
  };
  const options = { env };
  const created = await createProject(
    booksRoot,
    {
      title: "External Result Collection",
      bookType: "university_textbook"
    },
    options
  );

  let project = await runWorkflowAction(booksRoot, created.id, "spec", options);
  const taskDir = path.join(
    booksRoot,
    created.id,
    "agent_tasks",
    project.state.last_run_id + "__orchestrator__spec"
  );
  const externalSpec = "# External Book Spec\n\nThis was written by a host-side subscribed AI worker.";

  await mkdir(path.join(taskDir, "output"), { recursive: true });
  await writeFile(path.join(taskDir, "output", "result.md"), externalSpec, "utf-8");

  project = await runWorkflowAction(booksRoot, created.id, "collect_agent_results", options);

  assert.equal(project.artifacts.book_spec.trim(), externalSpec);
  assert.equal(project.runs[0].action, "collect_agent_results");

  const marker = JSON.parse(await readFile(path.join(taskDir, "collected.json"), "utf-8"));
  assert.deepEqual(marker.target_artifacts, ["book_spec.md"]);
});

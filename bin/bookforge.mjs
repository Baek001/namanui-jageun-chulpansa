#!/usr/bin/env node
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  approveArtifact,
  createProject,
  getProject,
  listProjects,
  runWorkflowAction
} from "../packages/core/bookProject.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const booksRoot = process.env.BOOKFORGE_BOOKS_ROOT || path.join(repoRoot, "books");
const configRoot = process.env.BOOKFORGE_CONFIG_ROOT || path.join(repoRoot, "config");
const coreOptions = { configRoot };

const workflowActions = new Set([
  "spec",
  "sample",
  "harness",
  "debate",
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

function usage() {
  return `BookForge CLI

Usage:
  bookforge init [title]
  bookforge list
  bookforge status [--project id]
  bookforge <spec|sample|harness|debate|outline|briefs|draft|review|revise|chapter_loop|book_loop|collect_agent_results|export> [--project id]
  bookforge approve <interview_summary|book_spec|sample_direction|harness_plan|final_outline|sample_chapter|final_manuscript|export> [--project id]

Options:
  --project, -p   Project id. Defaults to the most recently updated project.
  --json          Print JSON output.

Environment:
  BOOKFORGE_BOOKS_ROOT   Override books directory.
  BOOKFORGE_CONFIG_ROOT  Override config directory.
  BOOKFORGE_MODEL_PROVIDER=mock|openai|local_agent
`;
}

function parseArgs(argv) {
  const args = [...argv];
  const command = args.shift();
  const options = {
    projectId: null,
    json: false,
    values: []
  };

  while (args.length) {
    const arg = args.shift();
    if (arg === "--project" || arg === "-p") {
      options.projectId = args.shift();
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    options.values.push(arg);
  }

  return { command, options };
}

async function resolveProjectId(explicitProjectId) {
  if (explicitProjectId) {
    return explicitProjectId;
  }

  const projects = await listProjects(booksRoot);
  if (!projects.length) {
    throw new Error("No BookForge project exists yet. Run `bookforge init` first.");
  }

  return projects[0].id;
}

function print(value, json = false) {
  if (json) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }

  if (typeof value === "string") {
    console.log(value);
    return;
  }

  console.log(renderSummary(value));
}

function renderSummary(project) {
  if (Array.isArray(project)) {
    if (!project.length) {
      return "No projects found.";
    }
    return project.map((item) => `${item.id}\t${item.phase}\t${item.title}`).join("\n");
  }

  const state = project.state || project;
  const runtime = state.model_runtime || { provider: "unknown", model: "unknown" };
  const firstChapter = state.chapters?.[0];
  const lines = [
    `${state.title} (${state.project_id})`,
    `phase: ${state.phase}`,
    `engine: ${runtime.provider} / ${runtime.model}`,
    `approvals: ${Object.entries(state.approved || {})
      .map(([key, value]) => `${key}=${value ? "yes" : "no"}`)
      .join(", ")}`
  ];

  if (firstChapter) {
    lines.push(
      `chapter: ${firstChapter.id} ${firstChapter.status}, quality=${firstChapter.quality_score ?? "-"}, blocking=${firstChapter.blocking_issues ?? "-"}`
    );
  }

  return lines.join("\n");
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));

  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log(usage());
    return;
  }

  if (command === "init") {
    const title = options.values.join(" ").trim() || "AI 시대의 1인 출판";
    const project = await createProject(
      booksRoot,
      {
        title,
        bookType: "professional_book"
      },
      coreOptions
    );
    print(project, options.json);
    return;
  }

  if (command === "list") {
    print(await listProjects(booksRoot), options.json);
    return;
  }

  if (command === "status") {
    const projectId = await resolveProjectId(options.projectId);
    print(await getProject(booksRoot, projectId, coreOptions), options.json);
    return;
  }

  if (command === "approve") {
    const artifact = options.values[0];
    if (!artifact) {
      throw new Error("Missing approval artifact.");
    }
    const projectId = await resolveProjectId(options.projectId);
    print(
      await approveArtifact(
        booksRoot,
        projectId,
        artifact,
        { notes: "Approved through BookForge CLI." },
        coreOptions
      ),
      options.json
    );
    return;
  }

  if (workflowActions.has(command)) {
    const projectId = await resolveProjectId(options.projectId);
    print(await runWorkflowAction(booksRoot, projectId, command, coreOptions), options.json);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  if (!existsSync(configRoot)) {
    console.error(`Config directory not found: ${configRoot}`);
  }
  process.exitCode = 1;
});

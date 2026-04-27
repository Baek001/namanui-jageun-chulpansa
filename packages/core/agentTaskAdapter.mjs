import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function nowIso() {
  return new Date().toISOString();
}

function safePart(value, fallback = "task") {
  const normalized = String(value || fallback)
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return normalized || fallback;
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

async function writeText(filePath, value) {
  await writeFile(filePath, value, "utf-8");
}

export async function createAgentTaskBundle({
  agent,
  prompt,
  runtime,
  taskContext = {},
  taskRoot
}) {
  const root =
    taskRoot ||
    (taskContext.projectDir ? path.join(taskContext.projectDir, "agent_tasks") : path.resolve("agent_tasks"));
  const bundleId = [
    safePart(taskContext.runId, `run-${Date.now()}`),
    taskContext.chapterId ? safePart(taskContext.chapterId, "chapter") : null,
    safePart(agent?.id, "agent"),
    safePart(taskContext.templateName || taskContext.action, "task")
  ].filter(Boolean).join("__");
  const bundleDir = path.join(root, bundleId);
  const inputDir = path.join(bundleDir, "input_artifacts");
  const outputDir = path.join(bundleDir, "output");

  await mkdir(inputDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });

  const task = {
    bundle_id: bundleId,
    created_at: nowIso(),
    project_id: taskContext.projectId || null,
    action: taskContext.action || null,
    template: taskContext.templateName || null,
    chapter_id: taskContext.chapterId || null,
    expected_result_path: "output/result.md",
    expected_notes_path: "output/notes.md",
    expected_json_path: "output/result.json",
    runtime: {
      provider: runtime.provider,
      model: runtime.model
    },
    agent: {
      id: agent?.id || null,
      name: agent?.name || null,
      role: agent?.role || null,
      goal: agent?.goal || null,
      output_format: agent?.output_format || null
    }
  };

  const outputContract = {
    target_artifact: taskContext.targetArtifact || inferTargetArtifact(taskContext.templateName, taskContext.agentId || agent?.id),
    chapter_id: taskContext.chapterId || null,
    import_strategy: "replace_artifact_with_output_result_markdown"
  };
  task.output_contract = outputContract;

  await writeJson(path.join(bundleDir, "task.json"), task);
  await writeText(
    path.join(bundleDir, "instructions.md"),
    [
      `# ${agent?.name || "BookForge Agent"} Task`,
      "",
      `Role: ${agent?.role || "BookForge worker"}`,
      "",
      `Goal: ${agent?.goal || "Complete the assigned publishing task."}`,
      "",
      `Output format: ${agent?.output_format || "Markdown"}`,
      "",
      "Write the primary answer to `output/result.md`.",
      "Use `output/result.json` only when structured data is required.",
      "Use `output/notes.md` for caveats, missing evidence, or handoff notes."
    ].join("\n")
  );
  await writeText(path.join(inputDir, "prompt.md"), prompt);
  await writeJson(path.join(bundleDir, "expected_output_schema.json"), {
    type: "object",
    required: ["result_markdown"],
    properties: {
      result_markdown: {
        type: "string",
        description: "Main Markdown artifact to write into output/result.md."
      },
      notes: {
        type: "string",
        description: "Optional implementation or review notes."
      },
      blocking_issues: {
        type: "array",
        items: { type: "string" }
      }
    }
  });
  await writeText(
    path.join(outputDir, "README.md"),
    "External workers should write `result.md` here. BookForge keeps running with fallback output unless strict local-agent mode is enabled.\n"
  );

  return {
    bundle_id: bundleId,
    bundle_dir: bundleDir,
    task_json: path.join(bundleDir, "task.json")
  };
}

function inferTargetArtifact(templateName, agentId) {
  if (templateName === "spec") return "book_spec";
  if (templateName === "debate") return "debate_round";
  if (templateName === "outline") return "final_outline";
  if (templateName === "chapter_brief") return "chapter_brief";
  if (templateName === "chapter_draft") return "chapter_draft";
  if (templateName === "revision") return "chapter_revision";
  if (templateName === "review" && agentId === "fact_checker") return "fact_review";
  if (templateName === "review") return "editorial_review";
  return "external_result";
}

#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function usage() {
  return `BookForge Local Agent Adapter

Usage:
  bookforge-local-agent-adapter --once
  bookforge-local-agent-adapter --watch

Environment:
  BOOKFORGE_BOOKS_ROOT        Defaults to ./books
  BOOKFORGE_CONFIG_ROOT       Defaults to ./config
  BOOKFORGE_ADAPTER_PRESET    Optional preset from config/adapters/presets.json
  BOOKFORGE_ADAPTER_COMMAND  Host command to run for each task bundle

The command receives:
  BOOKFORGE_TASK_DIR
  BOOKFORGE_TASK_JSON
  BOOKFORGE_PROMPT_PATH
  BOOKFORGE_RESULT_PATH
  BOOKFORGE_NOTES_PATH

Example:
  BOOKFORGE_ADAPTER_COMMAND="codex exec --full-auto \\"Write result to $BOOKFORGE_RESULT_PATH after reading $BOOKFORGE_PROMPT_PATH\\""

Preset example:
  BOOKFORGE_ADAPTER_PRESET=codex npm exec -- bookforge-local-agent-adapter --once
`;
}

function parseArgs(argv) {
  return {
    once: argv.includes("--once"),
    watch: argv.includes("--watch"),
    help: argv.includes("--help") || argv.includes("-h")
  };
}

async function findTaskBundles(booksRoot) {
  if (!existsSync(booksRoot)) {
    return [];
  }

  const projects = await readdir(booksRoot, { withFileTypes: true });
  const bundles = [];

  for (const project of projects) {
    if (!project.isDirectory()) {
      continue;
    }

    const taskRoot = path.join(booksRoot, project.name, "agent_tasks");
    if (!existsSync(taskRoot)) {
      continue;
    }

    const tasks = await readdir(taskRoot, { withFileTypes: true });
    for (const task of tasks) {
      if (!task.isDirectory()) {
        continue;
      }

      const taskDir = path.join(taskRoot, task.name);
      const resultPath = path.join(taskDir, "output", "result.md");
      if (!existsSync(resultPath)) {
        bundles.push(taskDir);
      }
    }
  }

  return bundles;
}

function runCommand(command, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd: repoRoot,
      env: { ...process.env, ...env },
      shell: true,
      stdio: "inherit",
      windowsHide: true
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Adapter command exited with code ${code}`));
      }
    });
  });
}

async function readJsonIfExists(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }

  return JSON.parse(await readFile(filePath, "utf-8"));
}

function shellQuote(value) {
  if (process.platform === "win32") {
    return `"${String(value).replace(/"/g, '\\"')}"`;
  }

  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function renderCommandTemplate(template, paths) {
  return template
    .replaceAll("{task_arg}", shellQuote(paths.taskDir))
    .replaceAll("{task_json_arg}", shellQuote(paths.taskJson))
    .replaceAll("{prompt_arg}", shellQuote(paths.promptPath))
    .replaceAll("{result_arg}", shellQuote(paths.resultPath))
    .replaceAll("{notes_arg}", shellQuote(paths.notesPath))
    .replaceAll("{task}", paths.taskDir)
    .replaceAll("{task_json}", paths.taskJson)
    .replaceAll("{prompt}", paths.promptPath)
    .replaceAll("{result}", paths.resultPath)
    .replaceAll("{notes}", paths.notesPath);
}

async function resolveAdapterCommand(paths) {
  if (process.env.BOOKFORGE_ADAPTER_COMMAND) {
    return {
      source: "env",
      command: process.env.BOOKFORGE_ADAPTER_COMMAND
    };
  }

  const presetName = process.env.BOOKFORGE_ADAPTER_PRESET;
  if (!presetName) {
    return { source: "none", command: "" };
  }

  const configRoot = process.env.BOOKFORGE_CONFIG_ROOT || path.join(repoRoot, "config");
  const presetFile = path.join(configRoot, "adapters", "presets.json");
  const config = await readJsonIfExists(presetFile);
  const preset = config?.presets?.[presetName];

  if (!preset) {
    throw new Error(`Unknown adapter preset "${presetName}". Check ${presetFile}.`);
  }

  if (!preset.command_template) {
    throw new Error(`Adapter preset "${presetName}" is missing command_template.`);
  }

  return {
    source: `preset:${presetName}`,
    command: renderCommandTemplate(preset.command_template, paths)
  };
}

async function processBundle(taskDir) {
  const taskJson = path.join(taskDir, "task.json");
  const promptPath = path.join(taskDir, "input_artifacts", "prompt.md");
  const resultPath = path.join(taskDir, "output", "result.md");
  const notesPath = path.join(taskDir, "output", "notes.md");
  const commandInfo = await resolveAdapterCommand({
    taskDir,
    taskJson,
    promptPath,
    resultPath,
    notesPath
  });

  if (!commandInfo.command) {
    const task = JSON.parse(await readFile(taskJson, "utf-8"));
    await writeFile(
      notesPath,
      [
        "# Adapter Pending",
        "",
        "No BOOKFORGE_ADAPTER_COMMAND was configured.",
        "You can also set BOOKFORGE_ADAPTER_PRESET=codex|openclaw|claude-code|paperclip-oauth.",
        "",
        `Task: ${task.bundle_id}`,
        `Agent: ${task.agent?.id || "unknown"}`,
        `Prompt: ${promptPath}`,
        `Expected result: ${resultPath}`
      ].join("\n"),
      "utf-8"
    );
    return { taskDir, status: "pending" };
  }

  await runCommand(commandInfo.command, {
    BOOKFORGE_TASK_DIR: taskDir,
    BOOKFORGE_TASK_JSON: taskJson,
    BOOKFORGE_PROMPT_PATH: promptPath,
    BOOKFORGE_RESULT_PATH: resultPath,
    BOOKFORGE_NOTES_PATH: notesPath
  });

  if (!existsSync(resultPath)) {
    throw new Error(`Adapter command completed but did not create ${resultPath}`);
  }

  return { taskDir, status: "completed", source: commandInfo.source };
}

async function runOnce() {
  const booksRoot = process.env.BOOKFORGE_BOOKS_ROOT || path.join(repoRoot, "books");
  const bundles = await findTaskBundles(booksRoot);
  const results = [];

  for (const bundle of bundles) {
    results.push(await processBundle(bundle));
  }

  console.log(JSON.stringify({ processed: results.length, results }, null, 2));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || (!args.once && !args.watch)) {
    console.log(usage());
    return;
  }

  if (args.once) {
    await runOnce();
    return;
  }

  while (true) {
    await runOnce();
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

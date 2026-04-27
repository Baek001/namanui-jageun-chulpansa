import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adapterPath = path.join(repoRoot, "bin", "bookforge-local-agent-adapter.mjs");

async function withTempBooks(testFn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "bookforge-adapter-"));
  try {
    await testFn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function createTaskBundle(booksRoot) {
  const taskDir = path.join(booksRoot, "project-1", "agent_tasks", "run_1__orchestrator__spec");
  await mkdir(path.join(taskDir, "input_artifacts"), { recursive: true });
  await mkdir(path.join(taskDir, "output"), { recursive: true });
  await writeFile(
    path.join(taskDir, "task.json"),
    JSON.stringify({
      bundle_id: "run_1__orchestrator__spec",
      agent: { id: "orchestrator" },
      output_contract: { target_artifact: "book_spec" }
    }),
    "utf-8"
  );
  await writeFile(path.join(taskDir, "input_artifacts", "prompt.md"), "# Prompt", "utf-8");
  return taskDir;
}

await withTempBooks(async (booksRoot) => {
  const taskDir = await createTaskBundle(booksRoot);
  const command = "node -e \"require('fs').writeFileSync(process.env.BOOKFORGE_RESULT_PATH, 'adapter result')\"";

  const result = await execFileAsync("node", [adapterPath, "--once"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      BOOKFORGE_BOOKS_ROOT: booksRoot,
      BOOKFORGE_ADAPTER_COMMAND: command
    }
  });

  const body = JSON.parse(result.stdout);
  assert.equal(body.processed, 1);
  assert.equal(await readFile(path.join(taskDir, "output", "result.md"), "utf-8"), "adapter result");
});

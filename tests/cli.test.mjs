import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(repoRoot, "bin", "bookforge.mjs");
const configRoot = path.join(repoRoot, "config");

async function runCli(args, env) {
  return execFileAsync("node", [cliPath, ...args], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...env
    }
  });
}

async function withTempBooks(testFn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "bookforge-cli-"));
  try {
    await testFn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

await withTempBooks(async (booksRoot) => {
  const env = {
    BOOKFORGE_BOOKS_ROOT: booksRoot,
    BOOKFORGE_CONFIG_ROOT: configRoot
  };

  const init = await runCli(["init", "CLI Test Book", "--json"], env);
  const project = JSON.parse(init.stdout);
  assert.equal(project.state.title, "CLI Test Book");

  await runCli(["spec", "--project", project.id], env);

  await assert.rejects(
    () => runCli(["debate", "--project", project.id], env),
    /Approve the book spec/
  );

  await runCli(["approve", "book_spec", "--project", project.id], env);
  await runCli(["sample", "--project", project.id], env);

  await assert.rejects(
    () => runCli(["harness", "--project", project.id], env),
    /Approve the sample direction/
  );

  await runCli(["approve", "sample_direction", "--project", project.id], env);
  await runCli(["harness", "--project", project.id], env);

  await assert.rejects(
    () => runCli(["draft", "--project", project.id], env),
    /Approve the final outline/
  );

  await runCli(["approve", "harness_plan", "--project", project.id], env);
  await runCli(["approve", "final_outline", "--project", project.id], env);
  await runCli(["briefs", "--project", project.id], env);
  await runCli(["draft", "--project", project.id], env);
  await runCli(["review", "--project", project.id], env);
  await runCli(["revise", "--project", project.id], env);

  await assert.rejects(
    () => runCli(["export", "--project", project.id], env),
    /Approve the final manuscript/
  );

  await runCli(["approve", "sample_chapter", "--project", project.id], env);
  await runCli(["book_loop", "--project", project.id], env);
  await runCli(["approve", "final_manuscript", "--project", project.id], env);
  const exported = await runCli(["export", "--project", project.id, "--json"], env);
  const exportedProject = JSON.parse(exported.stdout);
  assert.equal(exportedProject.state.phase, "export");
  assert.ok(exportedProject.runs.length >= 8);

  const status = await runCli(["status", "--project", project.id], env);
  assert.match(status.stdout, /phase: export/);
});

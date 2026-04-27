import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  loadRuntimeConfig,
  publicRuntimeConfig,
  runtimeConfigPath,
  runtimeEnvForAgent,
  runtimeEnvFromConfig,
  saveRuntimeConfig,
  testRuntimeConnection
} from "../packages/core/runtimeConfig.mjs";

async function withTempConfig(testFn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "bookforge-runtime-"));
  try {
    await mkdir(path.join(dir, "adapters"), { recursive: true });
    await writeFile(
      path.join(dir, "adapters", "presets.json"),
      JSON.stringify(
        {
          version: 1,
          presets: {
            codex: {
              label: "Codex CLI",
              command_template: "node worker.js"
            },
            openclaw: {
              label: "OpenClaw CLI",
              command_template: "openclaw run --task {task_json_arg}"
            },
            "paperclip-oauth": {
              label: "Paperclip OAuth Worker",
              command_template: "paperclip tasks run --task {task_json_arg}"
            }
          }
        },
        null,
        2
      ),
      "utf-8"
    );
    await testFn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

await withTempConfig(async (configRoot) => {
  const config = await loadRuntimeConfig(configRoot, {});

  assert.equal(config.default_provider, "mock");
  assert.equal(config.providers.openai.model, "gpt-5.5");
  assert.equal(config.assignments.planner, "openclaw");
});

await withTempConfig(async (configRoot) => {
  const saved = await saveRuntimeConfig(
    configRoot,
    {
      default_provider: "openclaw",
      providers: {
        openclaw: {
          local_agent_name: "openclaw-dev",
          adapter_preset: "openclaw",
          strict: true
        }
      },
      assignments: {
        writer: "openai"
      }
    },
    {}
  );

  assert.equal(saved.default_provider, "openclaw");
  assert.equal(saved.providers.openclaw.local_agent_name, "openclaw-dev");
  assert.equal(saved.assignments.writer, "openai");

  const env = runtimeEnvFromConfig(saved, {});
  assert.equal(env.BOOKFORGE_MODEL_PROVIDER, "local_agent");
  assert.equal(env.BOOKFORGE_LOCAL_AGENT_NAME, "openclaw-dev");
  assert.equal(env.BOOKFORGE_ADAPTER_PRESET, "openclaw");
  assert.equal(env.BOOKFORGE_LOCAL_AGENT_STRICT, "1");

  const fileBody = JSON.parse(await readFile(runtimeConfigPath(configRoot), "utf-8"));
  assert.equal(fileBody.default_provider, "openclaw");

  const writerEnv = runtimeEnvForAgent(saved, { agentId: "chapter_writer", templateName: "chapter_draft" }, {});
  assert.equal(writerEnv.BOOKFORGE_MODEL_PROVIDER, "openai");
  assert.equal(writerEnv.OPENAI_MODEL, "gpt-5.5");
});

await withTempConfig(async (configRoot) => {
  await assert.rejects(
    () =>
      saveRuntimeConfig(
        configRoot,
        {
          providers: {
            openai: {
              api_key: "redacted-test-secret"
            }
          }
        },
        {}
      ),
    /Raw secrets/
  );
});

await withTempConfig(async (configRoot) => {
  await saveRuntimeConfig(
    configRoot,
    {
      default_provider: "openai",
      providers: {
        openai: {
          model: "gpt-test",
          api_key_env: "OPENAI_API_KEY"
        }
      }
    },
    {}
  );

  const missing = await testRuntimeConnection({
    configRoot,
    providerId: "openai",
    env: {}
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.status, "missing_api_key");

  const dry = await testRuntimeConnection({
    configRoot,
    providerId: "openai",
    env: { OPENAI_API_KEY: "redacted-test-key" }
  });
  assert.equal(dry.ok, true);
  assert.equal(dry.status, "ready_dry_run");
});

await withTempConfig(async (configRoot) => {
  const result = await testRuntimeConnection({
    configRoot,
    providerId: "openclaw",
    env: {}
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "ready_for_task_bundles");

  const runtime = await publicRuntimeConfig(configRoot, {});
  assert.equal(runtime.providers.openclaw.adapter.ok, true);
  assert.equal(runtime.providers.openai.api_key_present, false);
});

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const RUNTIME_CONFIG_FILENAME = "runtime.local.json";
export const DEFAULT_OPENAI_MODEL = "gpt-5.5";

const PROVIDER_IDS = new Set(["mock", "openclaw", "local_agent", "paperclip_oauth", "openai"]);
const ROLE_IDS = ["planner", "writer", "reviewers", "verifier"];
const SECRET_KEY_PATTERN = /(?:api[_-]?key|token|secret|password|cookie|authorization)/i;

export const SUPPORTED_RUNTIME_PROVIDERS = {
  mock: {
    id: "mock",
    label: "Demo Runtime",
    kind: "mock",
    runtime_provider: "mock",
    default_model: "deterministic-mock",
    description: "Deterministic built-in output for demos, tests, and offline product exploration.",
    cost_model: "Free",
    reliability: "High",
    privacy: "Local only",
    unattended: true
  },
  openclaw: {
    id: "openclaw",
    label: "OpenClaw Local",
    kind: "local_agent",
    runtime_provider: "local_agent",
    default_model: "openclaw-local",
    adapter_preset: "openclaw",
    description: "Creates BookForge task bundles for a host-side OpenClaw worker.",
    cost_model: "Uses user's OpenClaw setup",
    reliability: "Depends on host worker",
    privacy: "Task files stay in the local books folder",
    unattended: true
  },
  local_agent: {
    id: "local_agent",
    label: "Local Agent CLI",
    kind: "local_agent",
    runtime_provider: "local_agent",
    default_model: "codex-local",
    adapter_preset: "codex",
    description: "Creates task bundles for a local CLI worker such as Codex.",
    cost_model: "Uses user's local AI account or tool",
    reliability: "Depends on adapter command",
    privacy: "Task files stay in the local books folder",
    unattended: true
  },
  paperclip_oauth: {
    id: "paperclip_oauth",
    label: "Paperclip OAuth Worker",
    kind: "oauth_worker",
    runtime_provider: "local_agent",
    default_model: "paperclip-oauth",
    adapter_preset: "paperclip-oauth",
    description: "Routes task bundles to a Paperclip-style worker bridge. OAuth is owned by that bridge.",
    cost_model: "Depends on connected worker account",
    reliability: "Requires external bridge",
    privacy: "Secrets stay outside BookForge",
    unattended: true
  },
  openai: {
    id: "openai",
    label: "OpenAI API",
    kind: "direct_api",
    runtime_provider: "openai",
    default_model: DEFAULT_OPENAI_MODEL,
    api_key_env: "OPENAI_API_KEY",
    description: "Calls the OpenAI Responses API from the BookForge server process.",
    cost_model: "API billed",
    reliability: "High when API key is configured",
    privacy: "Prompts are sent to OpenAI API",
    unattended: true
  }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

export function runtimeConfigPath(configRoot) {
  return path.join(configRoot, RUNTIME_CONFIG_FILENAME);
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf-8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function normalizeProviderId(value, fallback = "mock") {
  const id = String(value || fallback).replace(/-/g, "_");
  return PROVIDER_IDS.has(id) ? id : fallback;
}

function defaultProviderFromEnv(env = process.env) {
  const rawProvider = String(env.BOOKFORGE_MODEL_PROVIDER || (env.OPENAI_API_KEY ? "openai" : "mock")).replace(/-/g, "_");
  const provider = rawProvider === "task_bundle" ? "local_agent" : normalizeProviderId(rawProvider);

  if (provider === "local_agent") {
    if (env.BOOKFORGE_ADAPTER_PRESET === "openclaw") return "openclaw";
    if (env.BOOKFORGE_ADAPTER_PRESET === "paperclip-oauth") return "paperclip_oauth";
    return "local_agent";
  }

  return provider;
}

function defaultRuntimeConfig(env = process.env) {
  const providers = {};

  for (const [id, provider] of Object.entries(SUPPORTED_RUNTIME_PROVIDERS)) {
    providers[id] = {
      model:
        id === "openai"
          ? env.OPENAI_MODEL || provider.default_model
          : id === "mock"
            ? env.BOOKFORGE_MOCK_MODEL || provider.default_model
            : env.BOOKFORGE_LOCAL_AGENT_NAME || provider.default_model,
      local_agent_name: provider.default_model,
      adapter_preset: provider.adapter_preset || null,
      api_key_env: provider.api_key_env || null,
      strict: false
    };
  }

  return {
    version: 1,
    default_provider: defaultProviderFromEnv(env),
    providers,
    assignments: {
      planner: "openclaw",
      writer: "openclaw",
      reviewers: "local_agent",
      verifier: "mock"
    },
    updated_at: null
  };
}

function assertNoRawSecrets(value, trail = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoRawSecrets(item, [...trail, String(index)]));
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (SECRET_KEY_PATTERN.test(key) && key !== "api_key_env") {
        throw new Error(`Raw secrets are not accepted in runtime config: ${[...trail, key].join(".")}`);
      }
      assertNoRawSecrets(item, [...trail, key]);
    }
    return;
  }

  if (typeof value === "string" && /^(sk-|Bearer\s+)/i.test(value.trim())) {
    throw new Error("Raw API keys or bearer tokens must be provided through server environment variables.");
  }
}

function normalizeProviderConfig(id, value = {}) {
  const supported = SUPPORTED_RUNTIME_PROVIDERS[id];
  const normalized = {
    ...clone(supported),
    model: typeof value.model === "string" && value.model.trim() ? value.model.trim() : supported.default_model,
    local_agent_name:
      typeof value.local_agent_name === "string" && value.local_agent_name.trim()
        ? value.local_agent_name.trim()
        : supported.default_model,
    adapter_preset:
      typeof value.adapter_preset === "string" && value.adapter_preset.trim()
        ? value.adapter_preset.trim()
        : supported.adapter_preset || null,
    api_key_env:
      typeof value.api_key_env === "string" && value.api_key_env.trim()
        ? value.api_key_env.trim()
        : supported.api_key_env || null,
    strict: Boolean(value.strict)
  };

  if (id === "mock") {
    normalized.model = normalized.model || "deterministic-mock";
  }

  if (id !== "openai") {
    normalized.api_key_env = null;
  }

  return normalized;
}

export function normalizeRuntimeConfig(input = {}, env = process.env) {
  assertNoRawSecrets(input);

  const defaults = defaultRuntimeConfig(env);
  const providers = {};

  for (const id of PROVIDER_IDS) {
    providers[id] = normalizeProviderConfig(id, {
      ...defaults.providers[id],
      ...(input.providers?.[id] || {})
    });
  }

  const assignments = { ...defaults.assignments };
  for (const roleId of ROLE_IDS) {
    assignments[roleId] = normalizeProviderId(input.assignments?.[roleId], assignments[roleId]);
  }

  return {
    version: 1,
    default_provider: normalizeProviderId(input.default_provider, defaults.default_provider),
    providers,
    assignments,
    updated_at: input.updated_at || defaults.updated_at
  };
}

function persistedProviderConfig(provider) {
  return {
    model: provider.model,
    local_agent_name: provider.local_agent_name,
    adapter_preset: provider.adapter_preset,
    api_key_env: provider.api_key_env,
    strict: provider.strict
  };
}

function persistedRuntimeConfig(config) {
  return {
    version: 1,
    default_provider: config.default_provider,
    providers: Object.fromEntries(
      Object.entries(config.providers).map(([id, provider]) => [id, persistedProviderConfig(provider)])
    ),
    assignments: config.assignments,
    updated_at: config.updated_at
  };
}

export async function loadRuntimeConfig(configRoot, env = process.env) {
  const stored = await readJsonIfExists(runtimeConfigPath(configRoot));
  return normalizeRuntimeConfig(stored || {}, env);
}

export async function saveRuntimeConfig(configRoot, input = {}, env = process.env) {
  const current = await loadRuntimeConfig(configRoot, env);
  const normalized = normalizeRuntimeConfig(
    {
      ...current,
      ...input,
      providers: {
        ...current.providers,
        ...(input.providers || {})
      },
      assignments: {
        ...current.assignments,
        ...(input.assignments || {})
      },
      updated_at: nowIso()
    },
    env
  );
  const target = runtimeConfigPath(configRoot);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(persistedRuntimeConfig(normalized), null, 2)}\n`, "utf-8");
  return normalized;
}

export function runtimeForProvider(config, providerId = config.default_provider) {
  const id = normalizeProviderId(providerId, config.default_provider || "mock");
  const provider = config.providers[id] || config.providers.mock;
  const runtimeProvider = provider.runtime_provider || SUPPORTED_RUNTIME_PROVIDERS[id].runtime_provider;

  return {
    source_provider: id,
    provider: runtimeProvider,
    model: runtimeProvider === "local_agent" ? provider.local_agent_name || provider.model : provider.model,
    adapter_preset: provider.adapter_preset || null,
    strict: Boolean(provider.strict),
    api_key_env: provider.api_key_env || null
  };
}

export function runtimeEnvFromConfig(config, env = process.env, providerId = config.default_provider) {
  const runtime = runtimeForProvider(config, providerId);
  const nextEnv = { ...env };

  delete nextEnv.BOOKFORGE_LOCAL_AGENT_STRICT;
  delete nextEnv.BOOKFORGE_ADAPTER_PRESET;

  nextEnv.BOOKFORGE_MODEL_PROVIDER = runtime.provider;

  if (runtime.provider === "mock") {
    nextEnv.BOOKFORGE_MOCK_MODEL = runtime.model || "deterministic-mock";
  }

  if (runtime.provider === "local_agent" || runtime.provider === "task_bundle") {
    nextEnv.BOOKFORGE_LOCAL_AGENT_NAME = runtime.model || "local-agent-task-bundle";
    if (runtime.adapter_preset) {
      nextEnv.BOOKFORGE_ADAPTER_PRESET = runtime.adapter_preset;
    }
    if (runtime.strict) {
      nextEnv.BOOKFORGE_LOCAL_AGENT_STRICT = "1";
    }
  }

  if (runtime.provider === "openai") {
    nextEnv.OPENAI_MODEL = runtime.model || DEFAULT_OPENAI_MODEL;
  }

  return nextEnv;
}

export function runtimeRoleForAgent({ agentId, templateName } = {}) {
  if (templateName === "review") return "verifier";
  if (templateName === "debate" || agentId === "critic") return "reviewers";
  if (agentId === "chapter_writer" || templateName === "chapter_draft" || templateName === "revision") return "writer";
  return "planner";
}

export function runtimeEnvForAgent(config, agentContext = {}, env = process.env) {
  const role = runtimeRoleForAgent(agentContext);
  const providerId = config.assignments?.[role] || config.default_provider;
  return runtimeEnvFromConfig(config, env, providerId);
}

async function adapterPresetStatus(configRoot, presetName) {
  if (!presetName) {
    return { ok: true, preset: null, command_template: null };
  }

  const presetsFile = path.join(configRoot, "adapters", "presets.json");
  const config = await readJsonIfExists(presetsFile);
  const preset = config?.presets?.[presetName];

  return {
    ok: Boolean(preset?.command_template),
    preset: presetName,
    label: preset?.label || presetName,
    description: preset?.description || "",
    command_template: preset?.command_template || null,
    presets_file: presetsFile
  };
}

export async function publicRuntimeConfig(configRoot, env = process.env) {
  const config = await loadRuntimeConfig(configRoot, env);
  const providers = {};

  for (const [id, provider] of Object.entries(config.providers)) {
    providers[id] = {
      id,
      label: provider.label,
      kind: provider.kind,
      description: provider.description,
      cost_model: provider.cost_model,
      reliability: provider.reliability,
      privacy: provider.privacy,
      unattended: provider.unattended,
      model: provider.model,
      local_agent_name: provider.local_agent_name,
      adapter_preset: provider.adapter_preset,
      strict: provider.strict,
      api_key_env: provider.api_key_env,
      api_key_present: provider.api_key_env ? Boolean(env[provider.api_key_env]) : null,
      adapter: await adapterPresetStatus(configRoot, provider.adapter_preset)
    };
  }

  return {
    version: config.version,
    default_provider: config.default_provider,
    active_runtime: runtimeForProvider(config),
    providers,
    assignments: config.assignments,
    updated_at: config.updated_at,
    secrets_policy: "Runtime settings never store raw API keys, OAuth tokens, cookies, or passwords."
  };
}

function extractOutputText(response) {
  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  const chunks = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }
  return chunks.join("\n").trim();
}

export async function testRuntimeConnection({
  configRoot,
  providerId,
  live = false,
  env = process.env,
  fetchFn = globalThis.fetch
}) {
  const config = await loadRuntimeConfig(configRoot, env);
  const id = normalizeProviderId(providerId, config.default_provider);
  const provider = config.providers[id];
  const runtime = runtimeForProvider(config, id);
  const checks = [];

  if (runtime.provider === "mock") {
    checks.push("Mock runtime is available without external setup.");
    return { ok: true, provider: id, runtime, status: "ready", checks };
  }

  if (runtime.provider === "local_agent" || runtime.provider === "task_bundle") {
    const adapter = await adapterPresetStatus(configRoot, runtime.adapter_preset);
    checks.push(adapter.ok ? `Adapter preset "${adapter.preset}" is configured.` : `Adapter preset "${adapter.preset}" is missing or incomplete.`);
    checks.push("BookForge will create task bundles under books/{project_id}/agent_tasks/.");
    checks.push(provider.strict ? "Strict mode is on; workflow actions wait for external worker output." : "Fallback mode is on; BookForge stays usable while external workers are connected.");

    return {
      ok: adapter.ok,
      provider: id,
      runtime,
      status: adapter.ok ? "ready_for_task_bundles" : "adapter_missing",
      checks,
      adapter
    };
  }

  if (runtime.provider === "openai") {
    const apiKeyEnv = provider.api_key_env || "OPENAI_API_KEY";
    const apiKeyPresent = Boolean(env[apiKeyEnv]);
    checks.push(`API key source: ${apiKeyEnv}`);
    checks.push(apiKeyPresent ? "API key is present in the server environment." : "API key is missing from the server environment.");

    if (!apiKeyPresent) {
      return { ok: false, provider: id, runtime, status: "missing_api_key", checks };
    }

    if (!live) {
      checks.push("Dry test only; no paid API request was sent.");
      return { ok: true, provider: id, runtime, status: "ready_dry_run", checks };
    }

    if (!fetchFn) {
      throw new Error("fetch is not available in this Node.js runtime.");
    }

    const response = await fetchFn("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env[apiKeyEnv]}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: runtime.model,
        instructions: "You are a connection tester. Reply with exactly: OK",
        input: "Connection test",
        max_output_tokens: 20,
        store: false
      }),
      signal: AbortSignal.timeout(20000)
    });

    if (!response.ok) {
      const body = await response.text();
      checks.push(`OpenAI request failed with HTTP ${response.status}.`);
      return { ok: false, provider: id, runtime, status: "api_error", checks, error: body.slice(0, 1200) };
    }

    const data = await response.json();
    checks.push(`OpenAI Responses API returned: ${extractOutputText(data) || data.status || "completed"}`);
    return { ok: true, provider: id, runtime, status: "ready_live", checks };
  }

  return { ok: false, provider: id, runtime, status: "unsupported_provider", checks: [`Unsupported provider: ${runtime.provider}`] };
}

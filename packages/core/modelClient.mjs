import { createAgentTaskBundle } from "./agentTaskAdapter.mjs";

function extractTextFromResponse(response) {
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

function providerFromEnv(env = process.env) {
  if (env.BOOKFORGE_MODEL_PROVIDER) {
    return env.BOOKFORGE_MODEL_PROVIDER.replace(/-/g, "_");
  }

  return env.OPENAI_API_KEY ? "openai" : "mock";
}

export function getModelRuntime(env = process.env) {
  const provider = providerFromEnv(env);
  return {
    provider,
    model:
      provider === "openai"
        ? env.OPENAI_MODEL || "gpt-5"
        : provider === "local_agent" || provider === "task_bundle"
          ? env.BOOKFORGE_LOCAL_AGENT_NAME || "local-agent-task-bundle"
        : env.BOOKFORGE_MOCK_MODEL || "deterministic-mock"
  };
}

export async function generateAgentText({ agent, prompt, fallback, env = process.env, taskContext = {} }) {
  const runtime = getModelRuntime(env);

  if (runtime.provider === "mock") {
    return {
      text: typeof fallback === "function" ? fallback() : fallback,
      runtime
    };
  }

  if (runtime.provider === "local_agent" || runtime.provider === "task_bundle") {
    const taskBundle = await createAgentTaskBundle({
      agent,
      prompt,
      runtime,
      taskContext,
      taskRoot: env.BOOKFORGE_AGENT_TASK_ROOT
    });

    if (env.BOOKFORGE_LOCAL_AGENT_STRICT === "1") {
      throw new Error(
        `Local agent task bundle created at ${taskBundle.bundle_dir}. Strict mode requires an external worker result before continuing.`
      );
    }

    return {
      text: typeof fallback === "function" ? fallback() : fallback,
      runtime,
      task_bundle: taskBundle
    };
  }

  if (runtime.provider !== "openai") {
    throw new Error(`Unsupported model provider: ${runtime.provider}`);
  }

  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required when BOOKFORGE_MODEL_PROVIDER=openai.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: runtime.model,
      instructions: [
        `You are ${agent.name}.`,
        `Role: ${agent.role}.`,
        `Goal: ${agent.goal}.`,
        `Output format: ${agent.output_format}.`,
        "Follow the requested artifact format exactly."
      ].join("\n"),
      input: prompt
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  const text = extractTextFromResponse(data);

  if (!text) {
    throw new Error("OpenAI response did not contain text output.");
  }

  return {
    text,
    runtime
  };
}

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export async function loadAgents(configRoot) {
  const agentsDir = path.join(configRoot, "agents");
  const entries = await readdir(agentsDir, { withFileTypes: true });
  const agents = new Map();

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }

    const filePath = path.join(agentsDir, entry.name);
    const agent = JSON.parse(await readFile(filePath, "utf-8"));
    agents.set(agent.id, agent);
  }

  return agents;
}

export async function getAgent(configRoot, agentId) {
  const agents = await loadAgents(configRoot);
  const agent = agents.get(agentId);

  if (!agent) {
    throw new Error(`Unknown agent: ${agentId}`);
  }

  return agent;
}

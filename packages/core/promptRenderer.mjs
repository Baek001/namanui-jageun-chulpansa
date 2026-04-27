import { readFile } from "node:fs/promises";
import path from "node:path";

export async function renderPrompt(configRoot, templateName, values) {
  const templatePath = path.join(configRoot, "prompts", `${templateName}.md`);
  const template = await readFile(templatePath, "utf-8");

  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = values[key];
    if (value === undefined || value === null) {
      return "";
    }
    return String(value);
  });
}

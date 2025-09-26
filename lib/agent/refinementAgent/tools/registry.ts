import type { RegisteredTool, ToolName } from "@/lib/validations/tool.schema";

const ALL_TOOLS: RegisteredTool[] = [
  // TODO: Add refinement agent tools here when needed
];

const byName = new Map<string, RegisteredTool>(
  ALL_TOOLS.map((t) => [t.docs.name, t])
);

export function getAllTools(): RegisteredTool[] {
  return ALL_TOOLS;
}

export function getToolsByNames(names: ToolName[]): RegisteredTool[] {
  return names.map((n) => byName.get(n)).filter(Boolean) as RegisteredTool[];
}

export function getToolsExcept(names: ToolName[]): RegisteredTool[] {
  const exclude = new Set(names);
  return ALL_TOOLS.filter((t) => !exclude.has(t.docs.name));
}

export function buildSystemPrompt(
  base: string,
  tools: RegisteredTool[]
): string {
  const toolLines = tools.map((t) => {
    const usage = t.docs.usage ? `\n${t.docs.usage}` : "";
    return `- ${t.docs.name}: ${t.docs.summary}${usage}`;
  });

  return [base.trim(), "", "# Available Tools", ...toolLines].join("\n");
}

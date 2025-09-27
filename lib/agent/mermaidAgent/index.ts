import { MERMAID_AGENT_PROMPT } from "./prompts";
import {
  getAllTools,
  getToolsByNames,
  getToolsExcept,
  buildSystemPrompt,
} from "./tools/registry";
import type { CreateAgentOptions } from "@/lib/validations/tool.schema";

/**
 * Get tools for mermaid agent based on options
 */
export function getMermaidAgentTools(opts: CreateAgentOptions = {}) {
  let tools = getAllTools();

  if ("include" in opts && opts.include?.length) {
    tools = getToolsByNames(opts.include);
  } else if ("exclude" in opts && opts.exclude?.length) {
    tools = getToolsExcept(opts.exclude);
  }

  return tools;
}

/**
 * Build system prompt for mermaid agent
 */
export function buildMermaidAgentPrompt(opts: CreateAgentOptions = {}) {
  const tools = getMermaidAgentTools(opts);
  return buildSystemPrompt(MERMAID_AGENT_PROMPT, tools);
}

/**
 * Get mermaid agent configuration
 */
export function getMermaidAgentConfig(opts: CreateAgentOptions = {}) {
  const tools = getMermaidAgentTools(opts);
  const systemPrompt = buildSystemPrompt(MERMAID_AGENT_PROMPT, tools);

  return {
    name: "mermaid_agent",
    instructions: systemPrompt,
    tools: tools.map((t) => t.tool),
    response_format: {
      type: "text",
    },
  };
}

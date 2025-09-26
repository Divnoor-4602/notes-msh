import { REFINEMENT_AGENT_PROMPT } from "./prompts";
import {
  getAllTools,
  getToolsByNames,
  getToolsExcept,
  buildSystemPrompt,
} from "./tools/registry";
import type { CreateAgentOptions } from "@/lib/validations/tool.schema";

/**
 * Get tools for refinement agent based on options
 */
export function getRefinementAgentTools(opts: CreateAgentOptions = {}) {
  let tools = getAllTools();

  if ("include" in opts && opts.include?.length) {
    tools = getToolsByNames(opts.include);
  } else if ("exclude" in opts && opts.exclude?.length) {
    tools = getToolsExcept(opts.exclude);
  }

  return tools;
}

/**
 * Build system prompt for refinement agent
 */
export function buildRefinementAgentPrompt(opts: CreateAgentOptions = {}) {
  const tools = getRefinementAgentTools(opts);
  return buildSystemPrompt(REFINEMENT_AGENT_PROMPT, tools);
}

/**
 * Get refinement agent configuration
 */
export function getRefinementAgentConfig(opts: CreateAgentOptions = {}) {
  const tools = getRefinementAgentTools(opts);
  const systemPrompt = buildSystemPrompt(REFINEMENT_AGENT_PROMPT, tools);

  return {
    name: "refinement_agent",
    instructions: systemPrompt,
    tools: tools.map((t) => t.tool) as any,
    // TODO: Add output type configuration when ready
    // TODO: Add model settings when ready
    // TODO: Add guardrails when ready
  };
}

// TODO: Add context extraction utilities for refinement agent
// TODO: Add validation utilities for refinement suggestions
// TODO: Add formatting utilities for refinement output

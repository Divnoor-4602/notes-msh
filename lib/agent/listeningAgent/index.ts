import { RealtimeAgent } from "@openai/agents/realtime";
import { LISTENING_AGENT_PROMPT } from "./prompts";
import {
  getAllTools,
  getToolsByNames,
  getToolsExcept,
  buildSystemPrompt,
} from "./tools/registry";
import type { CreateAgentOptions } from "@/lib/validations/tool.schema";

export function createListeningAgent(
  opts: CreateAgentOptions = {}
): RealtimeAgent {
  let tools = getAllTools();

  if ("include" in opts && opts.include?.length) {
    tools = getToolsByNames(opts.include);
  } else if ("exclude" in opts && opts.exclude?.length) {
    tools = getToolsExcept(opts.exclude);
  }

  const systemPrompt = buildSystemPrompt(LISTENING_AGENT_PROMPT, tools);

  const agent = new RealtimeAgent({
    name: "listening_agent",
    instructions: systemPrompt,
    tools: tools.map((t) => t.tool) as any,
  });

  return agent;
}
s;

// Configure OpenAI agents first
import "@/lib/config/agents-config";

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
  console.log("🏗️ Creating listening agent with options:", opts);

  let tools = getAllTools();
  console.log("🔧 Total tools available:", tools.length);
  console.log(
    "📝 Tool names:",
    tools.map((t) => t.docs.name)
  );

  if ("include" in opts && opts.include?.length) {
    tools = getToolsByNames(opts.include);
    console.log(
      "🎯 Filtered to include tools:",
      tools.map((t) => t.docs.name)
    );
  } else if ("exclude" in opts && opts.exclude?.length) {
    tools = getToolsExcept(opts.exclude);
    console.log(
      "🚫 Filtered to exclude tools:",
      tools.map((t) => t.docs.name)
    );
  }

  const systemPrompt = buildSystemPrompt(LISTENING_AGENT_PROMPT, tools);
  console.log("📋 System prompt built with length:", systemPrompt.length);
  console.log(
    "📋 System prompt preview:",
    systemPrompt.substring(0, 200) + "..."
  );

  const agent = new RealtimeAgent({
    name: "listening_agent",
    instructions: systemPrompt,
    tools: tools.map((t) => t.tool) as any,
  });

  console.log("✅ RealtimeAgent created successfully");
  return agent;
}

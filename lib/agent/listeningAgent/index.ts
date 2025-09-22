import { RealtimeAgent } from "@openai/agents/realtime";
import { LISTENING_AGENT_PROMPT } from "./prompts";
import { addTextToCanvas } from "./tools";

export function createListeningAgent(): RealtimeAgent {
  return new RealtimeAgent({
    name: "listening_agent",
    instructions: LISTENING_AGENT_PROMPT,
    tools: [addTextToCanvas],
  });
}

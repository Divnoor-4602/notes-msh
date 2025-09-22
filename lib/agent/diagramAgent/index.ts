// Configure OpenAI agents first
import "@/lib/config/agents-config";

import { Agent, run } from "@openai/agents";
import { tool } from "@openai/agents/realtime";
import { z } from "zod";
import { DIAGRAM_AGENT_PROMPT } from "./prompts";
import { DrawTool } from "./tools/drawTool";
import type { RegisteredTool } from "@/lib/validations/tool.schema";

// Create the diagram agent (OpenAI SDK properly configured)
const diagramAgent = new Agent({
  name: "DiagramAgent",
  instructions: DIAGRAM_AGENT_PROMPT,
  tools: [DrawTool.tool],
});

// Create custom tool wrapper to handle parameter mapping
const diagramAgentTool = tool({
  name: "create_diagram_from_description",
  description:
    "Create complete diagrams, flowcharts, and visual representations from natural language descriptions using an intelligent diagram agent",
  parameters: z.object({
    userIntent: z
      .string()
      .describe("Natural language description of the diagram to create"),
    context: z
      .string()
      .nullable()
      .describe("Optional context or recent conversation history"),
  }),
  execute: async ({ userIntent, context }) => {
    console.log("🎯 DIAGRAM_AGENT_TOOL called");
    console.log("📝 User intent:", userIntent);
    console.log("🔄 Context:", context);

    try {
      // Combine userIntent and context into a single input for the agent
      const input = userIntent + (context ? `\n\nContext: ${context}` : "");
      console.log("📋 Combined input for agent:", input);

      // Run the diagram agent
      console.log("🤖 Running diagram agent...");
      const result = await run(diagramAgent, input);
      console.log("✅ Diagram agent completed. Result:", result);

      return {
        success: true,
        message: `Successfully created diagram: "${userIntent}"`,
        elementSkeleton: { type: "diagram", userIntent },
        instructions: "Diagram has been created and rendered on the canvas",
      };
    } catch (error) {
      console.error("❌ Diagram agent tool failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      return {
        success: false,
        error: errorMessage,
        message:
          "Failed to create diagram. Please try rephrasing your request.",
      };
    }
  },
});

// Export as RegisteredTool to match your existing pattern
export const DiagramAgentTool: RegisteredTool = {
  tool: diagramAgentTool,
  docs: {
    name: "create_diagram_from_description",
    summary:
      "Create complete diagrams, flowcharts, and visual representations from natural language descriptions",
    usage: `- Use for any request involving diagrams, flowcharts, process flows, system architectures, or visual relationships
- Handles complex multi-step processes, decision trees, user flows, data flows, and organizational charts  
- Supports rectangles, circles, diamonds, arrows, groupings, and labels
- Examples: "create a user login flow", "draw the payment process", "show how data flows through the system"
- Always use for requests with multiple connected elements, relationships, or workflows
- Automatically handles layout, connections, and proper Mermaid/Excalidraw formatting`,
  },
  category: "meta",
};

// Export the agent itself for direct use if needed
export { diagramAgent };

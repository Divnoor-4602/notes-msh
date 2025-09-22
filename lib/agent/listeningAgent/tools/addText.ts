import { tool } from "@openai/agents/realtime";
import { getCanvasStore } from "@/lib/store/canvasStore";
import type { RegisteredTool } from "@/lib/validations/tool.schema";
import {
  AddTextParamsSchema,
  createToolSuccess,
  createToolError,
} from "@/lib/validations/tool.schema";

const addText = tool({
  name: "add_text_to_canvas",
  description:
    "Add a text element to the Excalidraw canvas at specified coordinates",
  parameters: AddTextParamsSchema,
  async execute({ text, x, y, fontSize, strokeColor }) {
    try {
      const xPos = x ?? 100;
      const yPos = y ?? 100;
      console.log("🔧 ADD_TEXT_TO_CANVAS TOOL CALLED!");
      console.log("Tool parameters received:", {
        text,
        x,
        y,
        fontSize,
        strokeColor,
      });

      // Create Excalidraw text element skeleton
      const textElementSkeleton = {
        type: "text",
        x: xPos,
        y: yPos,
        text: text,
        fontSize: fontSize ?? 120,
        strokeColor: strokeColor ?? "#000000",
      };

      // Add the element skeleton to the canvas using the store
      const store = getCanvasStore();
      await store.addElementSkeleton(textElementSkeleton);

      console.log(
        "✅ Element skeleton added to canvas store and synced to Excalidraw"
      );

      const result = createToolSuccess(
        `Added text "${text}" to canvas at position (${xPos}, ${yPos})`,
        textElementSkeleton,
        "Text element has been added to the Excalidraw canvas using the skeleton approach"
      );

      console.log("🔧 Tool execution completed, returning:", result);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("❌ Tool execution failed:", errorMessage);
      return createToolError(
        errorMessage,
        "Failed to add text to canvas. Please try again."
      );
    }
  },
});

export const AddTextTool: RegisteredTool = {
  tool: addText,
  docs: {
    name: "add_text_to_canvas",
    summary: "Add any text/words onto the canvas at specified coordinates",
    usage: `- Always call when user requests to add/write/type/insert text
- Extract exact text content from user speech
- If coordinates missing, defaults to x=100, y=100
- Required for ALL text-related requests regardless of phrasing`,
  },
  category: "text",
};

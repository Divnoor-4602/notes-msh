import { tool } from "@openai/agents/realtime";
import { z } from "zod";
import { getCanvasStore } from "@/lib/store/canvasStore";

// Excalidraw text element tool
export const addTextToCanvas = tool({
  name: "add_text_to_canvas",
  description: "Add a simple text element to the Excalidraw canvas",
  // All fields must be required; use nullable to represent optional inputs
  parameters: z.object({
    text: z.string().describe("The text content to display on the canvas"),
    x: z
      .number()
      .nullable()
      .describe("X position on canvas, set null to use default (100)"),
    y: z
      .number()
      .nullable()
      .describe("Y position on canvas, set null to use default (100)"),
  }),
  async execute({ text, x, y }) {
    const xPos = x ?? 100;
    const yPos = y ?? 100;
    console.log("🔧 ADD_TEXT_TO_CANVAS TOOL CALLED!");
    console.log("Tool parameters received:", { text, x, y });

    // Create Excalidraw text element skeleton (much cleaner!)
    const textElementSkeleton = {
      type: "text",
      x: xPos,
      y: yPos,
      text: text,
      // Optional properties can be omitted - Excalidraw will fill in defaults
      fontSize: 16,
      strokeColor: "#000000",
    };

    // Add the element skeleton to the canvas using the store
    const store = getCanvasStore();
    await store.addElementSkeleton(textElementSkeleton);

    console.log(
      "✅ Element skeleton added to canvas store and synced to Excalidraw"
    );

    // Return the element data that can be used to update the canvas
    const result = {
      success: true,
      message: `Added text "${text}" to canvas at position (${xPos}, ${yPos})`,
      elementSkeleton: textElementSkeleton,
      instructions:
        "Text element has been added to the Excalidraw canvas using the skeleton approach",
    };

    console.log("🔧 Tool execution completed, returning:", result);
    return result;
  },
});

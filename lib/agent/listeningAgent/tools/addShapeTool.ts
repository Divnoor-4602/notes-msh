import { tool } from "@openai/agents/realtime";
import { getCanvasStore } from "@/lib/store/canvasStore";
import type { RegisteredTool } from "@/lib/validations/tool.schema";
import {
  AddShapeParamsSchema,
  createToolSuccess,
  createToolError,
} from "@/lib/validations/tool.schema";

const addShape = tool({
  name: "add_shape_to_canvas",
  description:
    "Add a geometric shape (rectangle, ellipse, or diamond) to the Excalidraw canvas with optional styling and text label",
  parameters: AddShapeParamsSchema,
  async execute({ type, x, y, label }) {
    try {
      console.log("🔧 ADD_SHAPE_TO_CANVAS TOOL CALLED!");
      console.log("Tool parameters received:", { type, x, y, label });

      // Create Excalidraw shape element skeleton - exactly as in your examples
      const shapeElementSkeleton: Record<string, any> = {
        type,
        x,
        y,
      };

      // Add label if provided - simple structure matching your examples
      if (label !== null && label !== undefined) {
        shapeElementSkeleton.label = {
          text: label.text,
        };
        console.log(`📝 Added label to shape: "${label.text}"`);
      }

      // Add the element skeleton to the canvas using the store
      console.log(
        "📐 Final shape skeleton:",
        JSON.stringify(shapeElementSkeleton, null, 2)
      );

      // Verify the shape type is valid
      console.log(`🔍 Shape type: ${type}, valid types: r`);

      const store = getCanvasStore();
      await store.addElementSkeleton(shapeElementSkeleton);

      console.log(
        "✅ Shape element skeleton added to canvas store and synced to Excalidraw"
      );

      const labelText = label ? ` with label "${label.text}"` : "";
      const result = createToolSuccess(
        `Added ${type} shape to canvas at position (${x}, ${y})${labelText}`,
        shapeElementSkeleton,
        `${type} shape has been added to the Excalidraw canvas`
      );

      console.log("🔧 Tool execution completed, returning:", result);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("❌ Tool execution failed:", errorMessage);
      return createToolError(
        errorMessage,
        "Failed to add shape to canvas. Please try again."
      );
    }
  },
});

export const AddShapeTool: RegisteredTool = {
  tool: addShape,
  docs: {
    name: "add_shape_to_canvas",
    summary:
      "Add simple geometric shapes (rectangle, ellipse, diamond) with optional text labels",
    usage: `- Call for requests to add/create/draw basic geometric shapes
- Supports rectangle, ellipse, and diamond types only
- Can include text labels inside shapes for containers/boxes
- Use sensible defaults: coordinates default to reasonable positions, no need to ask for missing details
- Use for simple diagrams, flowcharts, and basic shapes
- Examples: "draw a rectangle", "create a circle", "add a diamond with text 'Decision'"
- Always proceed with defaults rather than asking for coordinates, colors, or sizes`,
  },
  category: "shape",
};

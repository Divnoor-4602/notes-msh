import type { tool } from "@openai/agents/realtime";
import { z } from "zod";

export type ToolName = string;

export type ToolDoc = {
  name: ToolName;
  summary: string; // one-liner for global prompt
  usage?: string; // short usage rules or examples
};

export type RegisteredTool = {
  tool: ReturnType<typeof tool<any, any>>;
  docs: ToolDoc;
  category?: "text" | "shape" | "arrow" | "frame" | "binding" | "meta";
};

export type CreateAgentOptions =
  | { include?: string[]; exclude?: never }
  | { include?: never; exclude?: string[] }
  | {};

// Common validation schemas for tool parameters
export const PositionSchema = z.object({
  x: z.number().nullable().describe("X coordinate on canvas"),
  y: z.number().nullable().describe("Y coordinate on canvas"),
});

export const DimensionsSchema = z.object({
  width: z.number().positive().describe("Width in pixels"),
  height: z.number().positive().describe("Height in pixels"),
});

export const ColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/)
  .describe("Hex color code (e.g., #000000)");

export const StrokeWidthSchema = z
  .number()
  .positive()
  .max(20)
  .describe("Stroke width in pixels (1-20)");

// Tool parameter schemas
export const AddTextParamsSchema = z.object({
  text: z.string().min(1).describe("The text content to display on the canvas"),
  x: z
    .number()
    .nullable()
    .describe("X position on canvas, null for default (100)"),
  y: z
    .number()
    .nullable()
    .describe("Y position on canvas, null for default (100)"),
  fontSize: z
    .number()
    .positive()
    .max(200)
    .nullable()
    .describe("Font size, null for default (120)"),
  strokeColor: ColorSchema.nullable().describe(
    "Text color, null for default (#000000)"
  ),
});

export const AddLineParamsSchema = z.object({
  x1: z.number().describe("Starting X coordinate"),
  y1: z.number().describe("Starting Y coordinate"),
  x2: z.number().describe("Ending X coordinate"),
  y2: z.number().describe("Ending Y coordinate"),
  strokeColor: ColorSchema.nullable().describe(
    "Line color, null for default (#000000)"
  ),
  strokeWidth: StrokeWidthSchema.nullable().describe(
    "Line thickness, null for default (1)"
  ),
});

export const AddRectangleParamsSchema = z.object({
  x: z.number().describe("Top-left X coordinate"),
  y: z.number().describe("Top-left Y coordinate"),
  width: z.number().positive().describe("Rectangle width"),
  height: z.number().positive().describe("Rectangle height"),
  strokeColor: ColorSchema.nullable().describe(
    "Border color, null for default (#000000)"
  ),
  backgroundColor: ColorSchema.nullable().describe(
    "Fill color, null for transparent"
  ),
  strokeWidth: StrokeWidthSchema.nullable().describe(
    "Border thickness, null for default (1)"
  ),
});

export const AddArrowParamsSchema = z.object({
  x1: z.number().describe("Starting X coordinate"),
  y1: z.number().describe("Starting Y coordinate"),
  x2: z.number().describe("Ending X coordinate"),
  y2: z.number().describe("Ending Y coordinate"),
  strokeColor: ColorSchema.nullable().describe(
    "Arrow color, null for default (#000000)"
  ),
  strokeWidth: StrokeWidthSchema.nullable().describe(
    "Arrow thickness, null for default (1)"
  ),
  arrowhead: z
    .enum(["start", "end", "both"])
    .nullable()
    .describe("Arrow direction, null for default (end)"),
});

export const ShapeLabelSchema = z.object({
  text: z.string().min(1).describe("Text content for the shape label"),
});

export const AddShapeParamsSchema = z.object({
  type: z
    .enum(["rectangle", "ellipse", "diamond"])
    .describe("Type of shape to create"),
  x: z.number().describe("X coordinate of the shape"),
  y: z.number().describe("Y coordinate of the shape"),
  label: ShapeLabelSchema.nullable().describe(
    "Optional text label for the shape, null for no label"
  ),
});

// Tool return value schemas
export const ToolExecutionResultSchema = z.object({
  success: z.boolean().describe("Whether the operation completed successfully"),
  message: z.string().describe("Human-readable description of what was done"),
  elementSkeleton: z
    .record(z.any())
    .describe("The created Excalidraw element data"),
  instructions: z
    .string()
    .nullable()
    .describe("Additional context about the operation"),
  error: z.string().nullable().describe("Error message if success is false"),
});

export const ToolErrorResultSchema = z.object({
  success: z.literal(false),
  error: z.string().describe("Error message describing what went wrong"),
  message: z.string().describe("User-friendly error description"),
});

// Union type for all possible tool results
export const ToolResultSchema = z.union([
  ToolExecutionResultSchema,
  ToolErrorResultSchema,
]);

// Helper function to create consistent error responses
export function createToolError(error: string, userMessage?: string) {
  return {
    success: false as const,
    error,
    message:
      userMessage || "An error occurred while performing the canvas operation",
  };
}

// Helper function to create consistent success responses
export function createToolSuccess(
  message: string,
  elementSkeleton: Record<string, any>,
  instructions?: string
) {
  return {
    success: true as const,
    message,
    elementSkeleton,
    instructions,
  };
}

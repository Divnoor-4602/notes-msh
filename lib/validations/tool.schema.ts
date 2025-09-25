import type { tool } from "@openai/agents";
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

// get response from diagram agent tool schema
export const GetResponseFromDiagramAgentParameterSchema = z.object({
  currentChunkText: z.string().nullable(),
  recentContext: z.string().nullable(),
});

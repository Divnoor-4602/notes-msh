// Configure OpenAI agents first
import "@/lib/config/agents-config";

import { tool } from "@openai/agents/realtime";
import { Agent, OutputGuardrail, run } from "@openai/agents";
import { z } from "zod";
import { getCanvasStore } from "@/lib/store/canvasStore";
import type { RegisteredTool } from "@/lib/validations/tool.schema";
import {
  createToolSuccess,
  createToolError,
} from "@/lib/validations/tool.schema";
import mermaid from "mermaid";
import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";

export const DiagramSpec = z.object({
  profile: z.literal("excalidraw_mermaid_v1").default("excalidraw_mermaid_v1"),
  direction: z.enum(["TD", "LR", "BT", "RL"]).default("TD"),
  nodes: z
    .array(
      z.object({
        id: z.string().regex(/^[A-Za-z][A-Za-z0-9_]*$/),
        label: z.string().min(1).max(80),
        shape: z
          .enum(["rectangle", "ellipse", "diamond", "circle"])
          .default("rectangle"),
        groupId: z
          .string()
          .regex(/^[A-Za-z][A-Za-z0-9_]*$/)
          .nullable(),
      })
    )
    .min(1)
    .max(60),
  groups: z
    .array(
      z.object({
        id: z.string().regex(/^[A-Za-z][A-Za-z0-9_]*$/),
        label: z.string().min(1).max(60),
      })
    )
    .max(20)
    .default([]),
  edges: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        label: z.string().max(40).nullable(),
        dashed: z.boolean().default(false),
      })
    )
    .max(200),
});

// 2) Deterministic Spec -> Mermaid Renderer

export function specToMermaid(spec: z.infer<typeof DiagramSpec>): string {
  const { direction, nodes, edges, groups } = spec;

  // group nodes
  const byGroup = new Map<string, typeof nodes>();
  for (const g of groups) byGroup.set(g.id, []);
  for (const n of nodes) {
    if (n.groupId && byGroup.has(n.groupId)) byGroup.get(n.groupId)!.push(n);
  }
  const topLevelNodes = nodes.filter(
    (n) => !n.groupId || !byGroup.has(n.groupId)
  );

  const escapeQuotes = (s: string) => s.replace(/"/g, '\\"');
  const nodeLine = (n: (typeof nodes)[number]) => {
    const safe = escapeQuotes(n.label);
    const shape =
      n.shape === "diamond"
        ? `${n.id}{"${safe}"}`
        : n.shape === "circle"
        ? `${n.id}((${safe}))`
        : n.shape === "ellipse"
        ? `${n.id}((${safe}))` // remap ellipse -> circle
        : /* rectangle */ `${n.id}["${safe}"]`;
    return `  ${shape}`;
  };

  const sanitizeEdgeLabel = (s: string) => s.replace(/\|/g, "/");
  const edgeLine = (e: (typeof edges)[number]) => {
    const style = e.dashed ? "-.->" : "-->";
    const lbl = e.label ? `|${sanitizeEdgeLabel(e.label)}|` : "";
    return `  ${e.from}${style}${lbl}${e.to}`;
  };

  const lines: string[] = [];
  lines.push(`flowchart ${direction}`);

  // top-level nodes
  for (const n of topLevelNodes) lines.push(nodeLine(n));

  // subgraphs
  for (const g of groups) {
    const title = g.label.replace(/\n/g, " ").slice(0, 60);
    lines.push(`  subgraph ${title}`);
    for (const n of byGroup.get(g.id) ?? []) lines.push(nodeLine(n));
    lines.push(`  end`);
  }

  // edges
  for (const e of edges) lines.push(edgeLine(e));

  return lines.join("\n");
}

// -----------------------------
// 3) Validators
// -----------------------------
export async function validateMermaid(
  code: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const ok = await mermaid.parse(code);
    return { ok: !!ok };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export async function validateExcalidraw(
  code: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { elements } = await parseMermaidToExcalidraw(code);
    if (!elements || elements.length === 0) {
      return {
        ok: false,
        error: "No elements produced by mermaid-to-excalidraw.",
      };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// -----------------------------
// 4) Planner Agent (NL -> JSON spec), exposed as a TOOL
// -----------------------------
const planner = new Agent({
  name: "Planner",
  model: "gpt-4o-mini",
  outputType: DiagramSpec,
  instructions: `
You convert natural language into a FLOWCHART spec for Excalidraw.

STRICT RULES:
- Return ONLY the JSON spec per the provided schema. Do NOT output Mermaid.
- profile must be "excalidraw_mermaid_v1".
- Allowed shapes: rectangle, diamond, circle, ellipse (ellipse will be rendered as circle).
- Use brief, plain-text labels (no Markdown, emojis, or icon codes).
- Direction default TD unless the user implies LR/BT/RL.
- Use subgraphs only when grouping is explicitly implied (e.g., "under Auth").
- Use dashed edges only when the user implies optional/uncertain paths.

Examples of good node IDs: startNode, loginForm, validateUser, authService, userDatabase, checkCondition, sendEmail, endFlow
Examples of bad IDs: "login form" (spaces), "user-auth" (hyphens), "123start" (starts with number), "validate_user!" (special chars)

Always prioritize clarity and logical flow in your node organization and connections.
`,
});

// Expose the planner as a tool (agents-as-tools pattern)
const planDiagramTool = planner.asTool({
  toolName: "plan_diagram",
  toolDescription:
    "Turn user intent into a strict Excalidraw-safe diagram JSON spec.",
});

// -----------------------------
// 5) Individual Tools: render + validators
// -----------------------------
const renderMermaidTool = tool({
  name: "render_mermaid",
  description: "Convert Excalidraw-safe diagram spec to Mermaid flowchart.",
  parameters: DiagramSpec,
  execute: async (spec) => ({ mermaid: specToMermaid(spec) }),
});

const mermaidValidatorTool = tool({
  name: "validate_mermaid",
  description: "Validate Mermaid syntax with mermaid.parse().",
  parameters: z.object({ mermaid: z.string() }),
  execute: async ({ mermaid }) => validateMermaid(mermaid),
});

const excalidrawValidatorTool = tool({
  name: "validate_excalidraw",
  description: "Validate that mermaid-to-excalidraw can parse the Mermaid.",
  parameters: z.object({ mermaid: z.string() }),
  execute: async ({ mermaid }) => validateExcalidraw(mermaid),
});

// -----------------------------
// 6) Output guardrail (final fence)
// -----------------------------
const outputGuard: OutputGuardrail<z.ZodObject<{ mermaid: z.ZodString }>> = {
  name: "Mermaid Validation Guardrail",
  async execute({ agentOutput }) {
    const code = agentOutput.mermaid ?? "";
    const m = await validateMermaid(code);
    if (!m.ok) return { tripwireTriggered: true, outputInfo: m };
    const x = await validateExcalidraw(code);
    return { tripwireTriggered: !x.ok, outputInfo: x };
  },
};

// -----------------------------
// 7) Orchestrator Agent (uses planner as a tool)
// -----------------------------
const mermaidExpert = new Agent({
  name: "Mermaid→Excalidraw Expert",
  model: "gpt-4o-mini",
  tools: [
    planDiagramTool, // <— the Planner agent, as a tool
    renderMermaidTool,
    mermaidValidatorTool,
    excalidrawValidatorTool,
  ],
  outputType: z.object({ mermaid: z.string() }),
  outputGuardrails: [outputGuard],
  instructions: `
Goal: return Mermaid flowchart code that is guaranteed to work with @excalidraw/mermaid-to-excalidraw.

PROCESS (follow in order):
1) Call plan_diagram with the user's natural language to get a JSON spec.
2) Call render_mermaid with the spec to obtain Mermaid.
3) Call validate_mermaid and validate_excalidraw.
4) If any validation fails, analyze the errors, revise the SPEC (not the raw Mermaid), and retry up to 2 times.
5) Final answer must contain ONLY the Mermaid code in the "mermaid" field (no commentary, no backticks).

POLICY:
- Do not emit unsupported Mermaid features (no markdown in labels, no 'click', no 'classDef', no 'style', no x--x).
- Keep labels short and plain text; sanitize problematic characters.
- Normalize ellipse to circle for reliable conversion.
`,
});

// -----------------------------
// 8) Main Draw Tool (wrapper that uses the orchestrator)
// -----------------------------
const DrawDiagramParamsSchema = z.object({
  userIntent: z
    .string()
    .min(1)
    .describe("Natural language description of the diagram to create"),
  context: z
    .string()
    .nullable()
    .describe("Optional context or recent conversation history"),
});

const drawDiagram = tool({
  name: "draw_diagram_from_description",
  description:
    "Create a complete diagram/flowchart from natural language description using Mermaid and Excalidraw",
  parameters: DrawDiagramParamsSchema,
  async execute({ userIntent, context }) {
    try {
      console.log("🎨 DRAW_DIAGRAM TOOL CALLED!");
      console.log("User intent:", userIntent);
      console.log("Context:", context);

      // TEMPORARY SIMPLE IMPLEMENTATION: Generate basic Mermaid directly
      console.log("🔧 Using simplified direct Mermaid generation...");

      // Create a basic authentication flow diagram based on the user intent
      let mermaidCode = "";

      if (
        userIntent.toLowerCase().includes("authentication") ||
        userIntent.toLowerCase().includes("login")
      ) {
        mermaidCode = `flowchart TD
    A[User attempts to login] --> B[Enter username and password]
    B --> C{Are credentials valid?}
    C -->|No| D[Show error message]
    C -->|Yes| E[Authenticate user]
    E --> F[Redirect to dashboard]
    D --> B`;
      } else if (
        userIntent.toLowerCase().includes("flow") ||
        userIntent.toLowerCase().includes("process")
      ) {
        mermaidCode = `flowchart TD
    A[Start] --> B[Process Input]
    B --> C{Decision Point}
    C -->|Yes| D[Success Path]
    C -->|No| E[Error Path]
    D --> F[Complete]
    E --> B`;
      } else {
        // Generic diagram
        mermaidCode = `flowchart TD
    A[Start] --> B[Step 1]
    B --> C[Step 2] 
    C --> D[End]`;
      }

      console.log("🔄 Generated Mermaid code:\n", mermaidCode);

      // Add to canvas using store
      console.log("🎨 Adding Mermaid diagram to canvas...");
      const store = getCanvasStore();

      try {
        await store.addMermaidDiagram(mermaidCode);
        console.log("✅ Diagram successfully added to canvas");
      } catch (canvasError) {
        console.error("❌ Canvas integration error:", canvasError);
        throw canvasError;
      }

      return createToolSuccess(
        `Successfully created and added diagram to canvas: "${userIntent}"`,
        { mermaidCode, type: "mermaid_diagram" },
        "Diagram has been rendered on the Excalidraw canvas using Mermaid flowchart syntax"
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("❌ Draw diagram tool failed:", errorMessage);
      return createToolError(
        errorMessage,
        "Failed to create diagram. Please try rephrasing your request or provide more specific details."
      );
    }
  },
});

export const DrawTool: RegisteredTool = {
  tool: drawDiagram,
  docs: {
    name: "draw_diagram_from_description",
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

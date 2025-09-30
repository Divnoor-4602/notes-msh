import { NextRequest, NextResponse } from "next/server";
import { Agent, run } from "@openai/agents";
import { getMermaidAgentConfig } from "@/lib/agent/mermaidAgent";
import {
  extractFilteredCanvasContext,
  validateGeneratedMermaid,
} from "@/lib/agent/mermaidAgent/utils";
import type { CreateAgentOptions } from "@/lib/validations/tool.schema";
import { getToken } from "@/lib/auth/auth-server";
import { fetchAction } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export async function POST(request: NextRequest) {
  try {
    // Get authentication token
    const token = await getToken();

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check Autumn access for collaborative canvas via Convex
    const result = await fetchAction(
      api.autumn.check,
      { featureId: "collaborative_canvas" },
      { token }
    );

    if (result.error || !result.data?.allowed) {
      return NextResponse.json(
        { error: "Pro access required for Mermaid generation" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Extract request parameters
    const {
      elements,
      currentMermaidCode,
      agentOptions = {},
      canvasContext: providedCanvasContext,
    } = body;

    // Use provided canvas context or fallback to extracting from elements
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let canvasContext: any;
    if (providedCanvasContext) {
      canvasContext = providedCanvasContext;
    } else {
      // Fallback for backward compatibility
      if (!elements || !Array.isArray(elements)) {
        return NextResponse.json(
          {
            success: false,
            error: "No canvas context or elements provided",
          },
          { status: 400 }
        );
      }
      canvasContext = extractFilteredCanvasContext(elements);
    }

    // Get agent configuration
    const agentConfig = getMermaidAgentConfig(
      agentOptions as CreateAgentOptions
    );

    // Create the mermaid agent
    const agent = new Agent({
      ...agentConfig,
      model: "gpt-4.1",
    });

    // Filter out empty subgraphs for cleaner output
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nonEmptySubgraphs = canvasContext.subgraphs.filter(
      (sg: any) => sg.nodes.length > 0
    );

    // Prepare input message for the agent
    let inputMessage = `Generate Mermaid flowchart code for the current canvas state.

🚨 CRITICAL: You will receive ONLY node types and labels - NO IDs are provided. 
Create simple, meaningful IDs from the node content:
- "whats this" → start  
- "New change" → process
- Use ONLY simple words: start, end, process, login, check, decide, validate

FORBIDDEN: Any cryptic strings, mixed case with numbers, or long identifiers!

Canvas Context:
- Nodes: ${canvasContext.nodes.length}
- Edges: ${canvasContext.edges.length}
- Non-empty Subgraphs: ${nonEmptySubgraphs.length}

Nodes:
${canvasContext.nodes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .map(
    (node: any, index: number) => `${index + 1}. ${node.type}: "${node.label}"`
  )
  .join("\n")}

Connections:
${canvasContext.edges
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .map((edge: any, edgeIndex: number) => {
    // Edge source/target are now indices, not IDs
    const sourceIndex = edge.source + 1; // Convert 0-based to 1-based
    const targetIndex = edge.target + 1; // Convert 0-based to 1-based

    const sourceNode = canvasContext.nodes[edge.source];
    const targetNode = canvasContext.nodes[edge.target];

    if (!sourceNode || !targetNode) {
      return `- Connection ${edgeIndex + 1}: Invalid node indices${
        edge.label ? ` (label: "${edge.label}")` : ""
      }`;
    }

    return `- "${sourceNode.label}" (Node ${sourceIndex}) connects to "${
      targetNode.label
    }" (Node ${targetIndex})${edge.label ? ` (label: "${edge.label}")` : ""}`;
  })
  .join("\n")}

${
  nonEmptySubgraphs.length > 0
    ? `Subgraphs:
${nonEmptySubgraphs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .map(
    (sg: any, index: number) =>
      `${index + 1}. "${sg.label}" (contains ${sg.nodes.length} nodes)`
  )
  .join("\n")}\n`
    : ""
}
${
  currentMermaidCode
    ? `\nCurrent Mermaid Code (for reference):\n\`\`\`mermaid\n${currentMermaidCode}\n\`\`\`\n`
    : ""
}
Generate complete Mermaid flowchart code that represents this canvas state. Remember to:
1. Create meaningful IDs based on node labels: "whats this" → start, "New change" → updateProcess
2. Use the provided LABELS as the actual text in nodes: (whats this), (New change)
3. Connect nodes using the node numbers provided in the edges section
4. Use process-oriented terms: start, end, process, login_form, maybe_not_login, validate_user
5. Map element types correctly (rectangle → rounded rectangle, diamond → decision, ellipse → circle)

EXAMPLE based on node numbers:
If Node 1 is "whats this" and Node 2 is "New change", and Edge is "Node 1 → Node 2":
flowchart TD
    start(whats this)
    updateProcess(New change)
    start --> updateProcess`;

    // Run the agent with retry logic for ID validation
    let mermaidCode = "";
    let retryCount = 0;
    const maxRetries = 2;
    let validation: any;

    while (retryCount <= maxRetries) {
      // Run the agent
      const result = await run(agent, inputMessage, {
        maxTurns: 3,
      });

      // Extract the generated Mermaid code from the result
      if (typeof result.finalOutput === "string") {
        mermaidCode = result.finalOutput.trim();
      } else {
        // Try to extract from output array
        const outputStrings =
          result.output?.filter((item) => typeof item === "string") || [];
        mermaidCode = outputStrings.join("\n").trim();
      }

      if (!mermaidCode) {
        return NextResponse.json({
          success: false,
          error: "No Mermaid code generated by agent",
        });
      }

      // Clean up the Mermaid code (remove code fences if present)
      mermaidCode = mermaidCode
        .replace(/^```mermaid\s*/gm, "")
        .replace(/^```\s*/gm, "")
        .trim();

      // Validate the generated Mermaid code
      const validation = validateGeneratedMermaid(mermaidCode);

      // Check if we have Excalidraw ID issues
      const hasExcalidrawIds = validation.errors.some((error) =>
        error.includes("Detected Excalidraw element IDs")
      );

      if (!hasExcalidrawIds) {
        // Success! No Excalidraw IDs detected
        if (!validation.isValid) {
          console.warn(
            "Generated Mermaid code has validation issues:",
            validation.errors
          );
          // Return with warnings for other validation issues
          return NextResponse.json({
            success: true,
            mermaidCode,
            validationWarnings: validation.errors,
          });
        }
        break; // Exit retry loop - we have valid code
      }

      // We have Excalidraw IDs - retry with stronger message
      retryCount++;
      console.warn(
        `Attempt ${retryCount}: Agent used Excalidraw IDs, retrying...`,
        validation.errors
      );

      if (retryCount <= maxRetries) {
        // Prepend retry instructions to the original canvas context
        const retryInstructions = `🚨 RETRY ATTEMPT ${retryCount}: You FAILED by using cryptic IDs! 🚨

ABSOLUTELY FORBIDDEN: Using any long, mixed-case, cryptic identifiers!

YOU MUST CREATE SIMPLE IDs LIKE: start, end, process, login, validate, check, decide

CORRECT EXAMPLE for nodes "whats this" and "New change":
flowchart TD
    start(whats this)
    process(New change)  
    start --> process

FORBIDDEN: Any long random strings, mixed case with numbers, or cryptic identifiers!

Now generate Mermaid code for the ACTUAL CANVAS CONTENT below:

---

`;

        // Rebuild the original input message with canvas context
        const originalCanvasInput = `Generate Mermaid flowchart code for the current canvas state.

🚨 CRITICAL: You will receive ONLY node types and labels - NO IDs are provided. 
Create simple, meaningful IDs from the node content:
- "whats this" → start  
- "New change" → process
- Use ONLY simple words: start, end, process, login, check, decide, validate

FORBIDDEN: Any cryptic strings, mixed case with numbers, or long identifiers!

Canvas Context:
- Nodes: ${canvasContext.nodes.length}
- Edges: ${canvasContext.edges.length}
- Non-empty Subgraphs: ${nonEmptySubgraphs.length}

Nodes:
${canvasContext.nodes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .map(
    (node: any, index: number) => `${index + 1}. ${node.type}: "${node.label}"`
  )
  .join("\n")}

Connections:
${canvasContext.edges
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .map((edge: any, edgeIndex: number) => {
    // Edge source/target are now indices, not IDs
    const sourceIndex = edge.source + 1; // Convert 0-based to 1-based
    const targetIndex = edge.target + 1; // Convert 0-based to 1-based

    const sourceNode = canvasContext.nodes[edge.source];
    const targetNode = canvasContext.nodes[edge.target];

    if (!sourceNode || !targetNode) {
      return `- Connection ${edgeIndex + 1}: Invalid node indices${
        edge.label ? ` (label: "${edge.label}")` : ""
      }`;
    }

    return `- "${sourceNode.label}" (Node ${sourceIndex}) connects to "${
      targetNode.label
    }" (Node ${targetIndex})${edge.label ? ` (label: "${edge.label}")` : ""}`;
  })
  .join("\n")}

${
  nonEmptySubgraphs.length > 0
    ? `Subgraphs:
${nonEmptySubgraphs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .map(
    (sg: any, index: number) =>
      `${index + 1}. "${sg.label}" (contains ${sg.nodes.length} nodes)`
  )
  .join("\n")}\n`
    : ""
}
${
  currentMermaidCode
    ? `\nCurrent Mermaid Code (for reference):\n\`\`\`mermaid\n${currentMermaidCode}\n\`\`\`\n`
    : ""
}
Generate complete Mermaid flowchart code that represents this canvas state. Remember to:
1. Create meaningful IDs based on node labels: "whats this" → start, "New change" → updateProcess
2. Use the provided LABELS as the actual text in nodes: (whats this), (New change)
3. Connect nodes using the node numbers provided in the edges section
4. Use process-oriented terms: start, end, process, login_form, maybe_not_login, validate_user
5. Map element types correctly (rectangle → rounded rectangle, diamond → decision, ellipse → circle)

EXAMPLE based on node numbers:
If Node 1 is "whats this" and Node 2 is "New change", and Edge is "Node 1 → Node 2":
flowchart TD
    start(whats this)
    updateProcess(New change)
    start --> updateProcess`;

        inputMessage = retryInstructions + originalCanvasInput;
      }
    }

    if (retryCount > maxRetries) {
      return NextResponse.json({
        success: false,
        error: "Agent repeatedly used Excalidraw element IDs despite retries",
        validationErrors: validation?.errors || [],
      });
    }

    // Return the successful result
    return NextResponse.json({
      success: true,
      mermaidCode,
      canvasStats: {
        nodes: canvasContext.nodes.length,
        edges: canvasContext.edges.length,
        subgraphs: canvasContext.subgraphs.length,
      },
    });
  } catch (error) {
    console.error("Mermaid agent error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate Mermaid code",
      },
      { status: 500 }
    );
  }
}

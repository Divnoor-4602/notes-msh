// Context extraction utilities for LLM integration
import { ParsedNode, ParsedEdge } from "./diagramAgentTools";

export interface NodeInfo {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isSpecial: boolean;
  connections: {
    incoming: string[];
    outgoing: string[];
  };
}

export interface EdgeInfo {
  id: string;
  source: string;
  target: string;
  label?: string;
  type: string;
  points: Array<{ x: number; y: number }>;
}

export interface SubgraphInfo {
  id: string;
  label: string;
  nodes: string[];
  position: { x: number; y: number };
  size: { width: number; height: number };
  level: number;
  parent?: string;
}

export interface TextElementInfo {
  id: string;
  text: string;
  containerId: string;
  position: { x: number; y: number };
  fontSize: number;
  isBound: boolean;
}

export interface CanvasContext {
  nodes: NodeInfo[];
  edges: EdgeInfo[];
  subgraphs: SubgraphInfo[];
  textElements: TextElementInfo[];
  usedNodeIds: string[];
  usedEdgeIds: string[];
  existingLabels: string[];
  specialLabels: string[];
}

// Phase 2: Enhanced subgraph detection and node containment
function detectSubgraphs(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rectangles: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  textElements: any[]
): SubgraphInfo[] {
  const subgraphs: SubgraphInfo[] = [];

  // Identify subgraphs: very large rectangles that are likely containers
  const potentialSubgraphs = rectangles.filter((rect) => {
    const width = rect.width;
    const height = rect.height;

    // Subgraph criteria: much larger than regular nodes
    // Regular nodes are typically ~100-130px wide, ~50px tall
    const isVeryLarge = width > 200 || height > 150;
    const isContainerShaped = width > 150 && height > 100;

    // Additional check: should be significantly larger than average node
    const isSubgraphSize = isVeryLarge || isContainerShaped;

    return isSubgraphSize;
  });

  potentialSubgraphs.forEach((subgraph, index) => {
    // Find bound text for subgraph label
    const boundText = textElements.find(
      (text) => text.containerId === subgraph.id
    );
    const label = boundText?.text || `Subgraph ${index + 1}`;

    subgraphs.push({
      id: subgraph.id,
      label: label,
      nodes: [], // Will be populated below
      position: { x: subgraph.x, y: subgraph.y },
      size: { width: subgraph.width, height: subgraph.height },
      level: 0, // Phase 3: Will implement nested levels
      parent: undefined,
    });
  });

  return subgraphs;
}

function findContainedNodes(
  subgraphs: SubgraphInfo[],
  allNodes: NodeInfo[]
): void {
  subgraphs.forEach((subgraph) => {
    const containedNodes: string[] = [];

    allNodes.forEach((node) => {
      // Check if node is within subgraph bounds
      const nodeX = node.position.x;
      const nodeY = node.position.y;
      const subgraphX = subgraph.position.x;
      const subgraphY = subgraph.position.y;
      const subgraphWidth = subgraph.size.width;
      const subgraphHeight = subgraph.size.height;

      // Node is contained if it's within subgraph bounds
      const isContained =
        nodeX >= subgraphX &&
        nodeY >= subgraphY &&
        nodeX <= subgraphX + subgraphWidth &&
        nodeY <= subgraphY + subgraphHeight;

      if (isContained) {
        containedNodes.push(node.id);
      }
    });

    subgraph.nodes = containedNodes;
  });
}

// Phase 2: Extract nodes, edges, and subgraphs
export function extractCanvasContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  elements: any[]
): CanvasContext {
  // Filter elements by type
  const rectangles = elements.filter((el) => el.type === "rectangle");
  const diamonds = elements.filter((el) => el.type === "diamond");
  const ellipses = elements.filter((el) => el.type === "ellipse");
  const arrows = elements.filter((el) => el.type === "arrow");
  const textElements = elements.filter((el) => el.type === "text");

  // Detect subgraphs first (before filtering regular nodes)
  const subgraphs = detectSubgraphs(rectangles, textElements);

  // Filter out subgraphs from regular rectangles
  const subgraphIds = new Set(subgraphs.map((sg) => sg.id));
  const regularRectangles = rectangles.filter(
    (rect) => !subgraphIds.has(rect.id)
  );

  // Combine all shape types as nodes (excluding subgraphs)
  const allShapes = [...regularRectangles, ...diamonds, ...ellipses];

  // Extract nodes with basic information
  const nodes: NodeInfo[] = allShapes.map((shape) => {
    // Find bound text element for label
    const boundText = textElements.find(
      (text) => text.containerId === shape.id
    );
    const label = boundText?.text || shape.id;

    // Determine if it's a special node (Start, End, Loop) - check if label contains these words
    const isSpecial = ["Start", "End", "Loop"].some((specialWord) =>
      label.toLowerCase().includes(specialWord.toLowerCase())
    );

    return {
      id: shape.id,
      type: shape.type,
      label: label,
      position: { x: shape.x, y: shape.y },
      size: { width: shape.width, height: shape.height },
      isSpecial: isSpecial,
      connections: {
        incoming: [], // Will be populated below
        outgoing: [], // Will be populated below
      },
    };
  });

  // Extract edges with basic information
  const edges: EdgeInfo[] = arrows.map((arrow) => {
    // Find bound text element for edge label
    const boundText = textElements.find(
      (text) => text.containerId === arrow.id
    );
    const label = boundText?.text;

    return {
      id: arrow.id,
      source: arrow.startBinding?.elementId || "",
      target: arrow.endBinding?.elementId || "",
      label: label,
      type: arrow.type,
      points: arrow.points || [],
    };
  });

  // Populate connections for nodes
  nodes.forEach((node) => {
    node.connections.incoming = edges
      .filter((edge) => edge.target === node.id)
      .map((edge) => edge.id);

    node.connections.outgoing = edges
      .filter((edge) => edge.source === node.id)
      .map((edge) => edge.id);
  });

  // Extract text elements
  const textElementInfos: TextElementInfo[] = textElements.map((text) => ({
    id: text.id,
    text: text.text,
    containerId: text.containerId || "",
    position: { x: text.x, y: text.y },
    fontSize: text.fontSize || 20,
    isBound: !!text.containerId,
  }));

  // Get ID information
  const usedNodeIds = nodes.map((n) => n.id);
  const usedEdgeIds = edges.map((e) => e.id);
  const existingLabels = textElementInfos.map((t) => t.text);
  const specialLabels = ["Start", "End", "Loop"];

  // Find which nodes are contained within subgraphs
  findContainedNodes(subgraphs, nodes);

  const context: CanvasContext = {
    nodes,
    edges,
    subgraphs: subgraphs, // Phase 2: Now implemented!
    textElements: textElementInfos,
    usedNodeIds,
    usedEdgeIds,
    existingLabels,
    specialLabels,
  };

  return context;
}

// Keep only the get_current_canvas_context tool for the LLM
export const diagrammingAgentTools = [
  {
    type: "function",
    name: "get_current_canvas_context",
    description:
      "Tool to retrieve the current canvas context including all nodes, edges, subgraphs, and their relationships. This provides the LLM with complete understanding of the existing diagram structure.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
];

/**
 * Simplified tool handler for get_current_canvas_context only.
 * Other validations are now handled locally.
 */
export async function handleToolCalls(
  body: {
    input: Array<{
      type: string;
      call_id?: string;
      name?: string;
      arguments?: string;
      output?: string;
    }>;
  },
  response: {
    error?: string;
    output?: Array<{
      type: string;
      call_id?: string;
      name?: string;
      arguments?: string;
      content?: Array<{ type: string; text: string }>;
    }>;
  },
  addBreadcrumb?: (title: string, data?: unknown) => void
) {
  void addBreadcrumb; // Suppress unused variable warning
  let currentResponse = response;

  while (true) {
    if (currentResponse?.error) {
      return { error: "Something went wrong." };
    }

    const outputItems = currentResponse.output ?? [];

    // Gather all function calls in the output.
    const functionCalls = outputItems.filter(
      (item) => item.type === "function_call"
    );

    if (functionCalls.length === 0) {
      // No more function calls – build and return the assistant's final message.
      const assistantMessages = outputItems.filter(
        (item) => item.type === "message"
      );

      const finalText = assistantMessages
        .map((msg) => {
          const contentArr = msg.content ?? [];
          return contentArr
            .filter((c) => c.type === "output_text")
            .map((c) => c.text)
            .join("");
        })
        .join("\n");

      return finalText;
    }

    // Handle only get_current_canvas_context - other validations are local
    for (const toolCall of functionCalls) {
      const fName = toolCall.name;

      if (fName === "get_current_canvas_context") {
        // This should already be provided in the initial request
        const toolRes = { success: true, message: "Context already provided" };

        body.input.push(
          {
            type: "function_call",
            call_id: toolCall.call_id,
            name: toolCall.name,
            arguments: toolCall.arguments,
          },
          {
            type: "function_call_output",
            call_id: toolCall.call_id,
            output: JSON.stringify(toolRes),
          }
        );
      } else {
        // Unexpected tool call
        const toolRes = {
          error: `Tool ${fName} not supported in local validation mode`,
        };
        body.input.push(
          {
            type: "function_call",
            call_id: toolCall.call_id,
            name: toolCall.name,
            arguments: toolCall.arguments,
          },
          {
            type: "function_call_output",
            call_id: toolCall.call_id,
            output: JSON.stringify(toolRes),
          }
        );
      }
    }

    // Make the follow-up request including the tool outputs.
    currentResponse = await fetchResponsesMessage(body);
  }
}

// Responses and tool calls utils
export async function fetchResponsesMessage(
  body: Record<string, unknown>,
  options?: { signal?: AbortSignal; isNewerTranscript?: boolean }
) {
  const response = await fetch("/api/diagram-responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    // Preserve the previous behaviour of forcing sequential tool calls.
    body: JSON.stringify({
      ...body,
      parallel_tool_calls: false,
      isNewerTranscript: options?.isNewerTranscript || false,
    }),
    signal: options?.signal,
  });

  if (!response.ok) {
    console.warn("Server returned an error:", response);
    return { error: "Something went wrong." };
  }

  const completion = await response.json();
  return completion;
}

/**
 * Generates an alternative ID when there's a collision with existing IDs.
 * Uses the same strategy as mappingIds.ts: append _2, _3, etc.
 */
export function generateAlternativeId(
  originalId: string,
  usedIds: string[]
): string {
  const usedIdsSet = new Set(usedIds);
  let counter = 2;
  let alternativeId = `${originalId}_${counter}`;

  while (usedIdsSet.has(alternativeId)) {
    counter++;
    alternativeId = `${originalId}_${counter}`;
  }

  return alternativeId;
}

/**
 * Parses Mermaid diagram structure to extract nodes and edges.
 * This is a simplified parser focused on ID extraction for validation.
 */
export function parseMermaidStructure(mermaidCode: string): {
  nodes: ParsedNode[];
  edges: ParsedEdge[];
} {
  const lines = mermaidCode
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("%%"));

  const nodes: ParsedNode[] = [];
  const edges: ParsedEdge[] = [];
  const nodeIds = new Set<string>();

  // Skip flowchart header lines
  const contentLines = lines.filter(
    (line) =>
      !line.match(/^(flowchart|graph)\s+(TD|TB|LR|RL|BT)$/i) &&
      !line.match(/^(flowchart|graph)$/i)
  );

  for (const line of contentLines) {
    // Parse node definitions: ID(Label), ID[Label], ID{Label}, etc.
    const nodeMatches = line.matchAll(
      /([A-Za-z][A-Za-z0-9_]*)\s*(\[[^\]]*\]|\([^)]*\)|\{[^}]*\}|\(\([^)]*\)\)|\(\(\([^)]*\)\)\))/g
    );

    for (const match of nodeMatches) {
      const [, id, labelPart] = match;
      if (!nodeIds.has(id)) {
        nodeIds.add(id);

        // Extract label from brackets/parentheses
        let label = labelPart.slice(1, -1); // Remove outer brackets/parentheses
        if (label.startsWith("(") && label.endsWith(")")) {
          label = label.slice(1, -1); // Handle double parentheses
        }
        if (label.startsWith("((") && label.endsWith("))")) {
          label = label.slice(2, -2); // Handle triple parentheses
        }

        // Determine shape based on brackets
        let shape = "rectangle";
        if (labelPart.startsWith("[") && labelPart.endsWith("]")) {
          shape = "rectangle";
        } else if (labelPart.startsWith("(") && labelPart.endsWith(")")) {
          shape = "ellipse";
        } else if (labelPart.startsWith("{") && labelPart.endsWith("}")) {
          shape = "diamond";
        }

        nodes.push({ id, label, shape });
      }
    }

    // Parse edge definitions: A --> B, A --- B, A --Label--> B, etc.
    const edgeMatches = line.matchAll(
      /([A-Za-z][A-Za-z0-9_]*)\s*(-->|---|\-\-[^-]*\-\->)\s*([A-Za-z][A-Za-z0-9_]*)/g
    );

    for (const match of edgeMatches) {
      const [, source, connector, target] = match;

      // Extract edge label if present
      let label: string | undefined;
      const labelMatch = connector.match(/\-\-([^-]*)\-\->/);
      if (labelMatch && labelMatch[1].trim()) {
        label = labelMatch[1].trim();
      }

      edges.push({ source, target, label });
    }

    // Handle multi-target edges: A --> B & C --> D
    const multiEdgeMatches = line.matchAll(
      /([A-Za-z][A-Za-z0-9_]*)\s*(-->|---)\s*([A-Za-z][A-Za-z0-9_]*(?:\s*&\s*[A-Za-z][A-Za-z0-9_]*)*)/g
    );

    for (const match of multiEdgeMatches) {
      const [, source, connector, targetsStr] = match;
      void connector; // Suppress unused variable warning
      const targets = targetsStr.split("&").map((t) => t.trim());

      for (const target of targets) {
        if (target.match(/^[A-Za-z][A-Za-z0-9_]*$/)) {
          edges.push({ source, target });
        }
      }
    }
  }

  // Add any standalone node IDs that appear in edges but weren't explicitly defined
  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      nodeIds.add(edge.source);
      nodes.push({ id: edge.source, shape: "rectangle" });
    }
    if (!nodeIds.has(edge.target)) {
      nodeIds.add(edge.target);
      nodes.push({ id: edge.target, shape: "rectangle" });
    }
  }

  return { nodes, edges };
}

/**
 * Extracts Mermaid code from a markdown code block.
 * @param finalText The text containing the Mermaid code block
 * @returns The extracted Mermaid code or null if not found
 */
export function extractMermaidCode(finalText: string): string | null {
  const mermaidMatch = finalText.match(/```mermaid\n([\s\S]*?)\n```/);
  if (mermaidMatch) {
    return mermaidMatch[1].trim();
  }
  return null;
}

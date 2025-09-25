import { CanvasContext } from "@/lib/agent/listeningAgent/tools/utils";

export interface MermaidNode {
  id: string;
  label: string;
  shape: string;
}

export interface MermaidEdge {
  source: string;
  target: string;
  label?: string;
  id: string;
}

export interface MermaidDiff {
  nodesToAdd: MermaidNode[];
  nodesToRemove: string[];
  edgesToAdd: MermaidEdge[];
  edgesToRemove: string[];
  nodesToUpdate: Array<{ id: string; newLabel: string }>;
}

/**
 * Parses Mermaid code to extract nodes and edges
 */
export function parseMermaidCode(mermaidCode: string): {
  nodes: MermaidNode[];
  edges: MermaidEdge[];
} {
  const nodes: MermaidNode[] = [];
  const edges: MermaidEdge[] = [];
  const lines = mermaidCode.split("\n");

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines, comments, and header
    if (
      !trimmedLine ||
      trimmedLine.startsWith("%%") ||
      trimmedLine.startsWith("flowchart")
    ) {
      continue;
    }

    // Parse node definitions: nodeId(Label) or nodeId[Label] etc.
    const nodeMatch = trimmedLine.match(
      /^([A-Za-z0-9_]+)(\([^)]+\)|\[[^\]]+\]|\{[^}]+\}|\[\[[^\]]+\]\]|\(\([^)]+\)\)|\(\(\([^)]+\)\)\))/
    );
    if (nodeMatch) {
      const id = nodeMatch[1];
      const shapeWithLabel = nodeMatch[2];
      const label = shapeWithLabel.slice(1, -1); // Remove outer brackets
      const shape = getShapeType(shapeWithLabel);

      nodes.push({ id, label, shape });
      continue;
    }

    // Parse edge definitions: nodeA --> nodeB or nodeA ---|Label| nodeB
    const edgeMatch = trimmedLine.match(
      /^([A-Za-z0-9_]+)\s*(-->|---|\|[^|]*\|)\s*([A-Za-z0-9_]+)/
    );
    if (edgeMatch) {
      const source = edgeMatch[1];
      const connector = edgeMatch[2];
      const target = edgeMatch[3];

      let label: string | undefined;
      if (connector.startsWith("|") && connector.endsWith("|")) {
        label = connector.slice(1, -1);
      }

      const edgeId = `${source}_${target}`;
      edges.push({ source, target, label, id: edgeId });
    }
  }

  return { nodes, edges };
}

/**
 * Determines the shape type from Mermaid syntax
 */
function getShapeType(shapeWithLabel: string): string {
  if (shapeWithLabel.startsWith("(") && shapeWithLabel.endsWith(")")) {
    if (shapeWithLabel.startsWith("((") && shapeWithLabel.endsWith("))")) {
      if (shapeWithLabel.startsWith("(((") && shapeWithLabel.endsWith(")))")) {
        return "triple-circle";
      }
      return "circle";
    }
    if (shapeWithLabel.startsWith("([") && shapeWithLabel.endsWith("])")) {
      return "stadium";
    }
    return "rounded-rectangle";
  }
  if (shapeWithLabel.startsWith("[") && shapeWithLabel.endsWith("]")) {
    if (shapeWithLabel.startsWith("[[") && shapeWithLabel.endsWith("]]")) {
      return "subroutine";
    }
    return "rectangle";
  }
  if (shapeWithLabel.startsWith("{") && shapeWithLabel.endsWith("}")) {
    return "diamond";
  }
  return "rectangle";
}

/**
 * Compares current canvas context with new Mermaid code to generate a diff
 */
export function generateMermaidDiff(
  canvasContext: CanvasContext,
  newMermaidCode: string
): MermaidDiff {
  const { nodes: newNodes, edges: newEdges } = parseMermaidCode(newMermaidCode);

  // Extract existing nodes and edges from canvas context
  const existingNodeIds = new Set(canvasContext.usedNodeIds);
  const existingEdgeIds = new Set(canvasContext.usedEdgeIds);

  // Create maps for quick lookup
  const existingNodeLabels = new Map<string, string>();
  canvasContext.nodes.forEach((node) => {
    existingNodeLabels.set(node.id, node.label);
  });

  const existingEdgeMap = new Map<
    string,
    { source: string; target: string; label?: string }
  >();
  canvasContext.edges.forEach((edge) => {
    existingEdgeMap.set(edge.id, {
      source: edge.source,
      target: edge.target,
      label: edge.label,
    });
  });

  // Find nodes to add (new nodes not in existing)
  const nodesToAdd: MermaidNode[] = newNodes.filter(
    (node) => !existingNodeIds.has(node.id)
  );

  // Find nodes to remove (existing nodes not in new)
  const newNodeIds = new Set(newNodes.map((node) => node.id));
  const nodesToRemove: string[] = Array.from(existingNodeIds).filter(
    (id) => !newNodeIds.has(id)
  );

  // Find nodes to update (same ID but different label)
  const nodesToUpdate: Array<{ id: string; newLabel: string }> = [];
  newNodes.forEach((newNode) => {
    if (existingNodeIds.has(newNode.id)) {
      const existingLabel = existingNodeLabels.get(newNode.id);
      if (existingLabel && existingLabel !== newNode.label) {
        nodesToUpdate.push({ id: newNode.id, newLabel: newNode.label });
      }
    }
  });

  // Find edges to add (new edges not in existing)
  const edgesToAdd: MermaidEdge[] = newEdges.filter(
    (edge) => !existingEdgeIds.has(edge.id)
  );

  // Find edges to remove (existing edges not in new)
  const newEdgeIds = new Set(newEdges.map((edge) => edge.id));
  const edgesToRemove: string[] = Array.from(existingEdgeIds).filter(
    (id) => !newEdgeIds.has(id)
  );

  return {
    nodesToAdd,
    nodesToRemove,
    edgesToAdd,
    edgesToRemove,
    nodesToUpdate,
  };
}

/**
 * Generates incremental Mermaid code based on diff
 */
export function generateIncrementalMermaidCode(
  canvasContext: CanvasContext,
  diff: MermaidDiff
): string {
  const lines: string[] = ["flowchart TD"];

  // Add existing nodes that are not being removed
  canvasContext.nodes.forEach((node) => {
    if (!diff.nodesToRemove.includes(node.id)) {
      // Check if node label needs updating
      const updateInfo = diff.nodesToUpdate.find(
        (update) => update.id === node.id
      );
      const label = updateInfo ? updateInfo.newLabel : node.label;
      lines.push(`    ${node.id}(${label})`);
    }
  });

  // Add new nodes
  diff.nodesToAdd.forEach((node) => {
    const shapeWrapper = getShapeWrapper(node.shape);
    lines.push(
      `    ${node.id}${shapeWrapper.start}${node.label}${shapeWrapper.end}`
    );
  });

  // Add existing edges that are not being removed
  canvasContext.edges.forEach((edge) => {
    if (!diff.edgesToRemove.includes(edge.id)) {
      const connector = edge.label ? `---|${edge.label}|` : "-->";
      lines.push(`    ${edge.source} ${connector} ${edge.target}`);
    }
  });

  // Add new edges
  diff.edgesToAdd.forEach((edge) => {
    const connector = edge.label ? `---|${edge.label}|` : "-->";
    lines.push(`    ${edge.source} ${connector} ${edge.target}`);
  });

  return lines.join("\n");
}

/**
 * Gets the appropriate shape wrapper for Mermaid syntax
 */
function getShapeWrapper(shape: string): { start: string; end: string } {
  switch (shape) {
    case "circle":
      return { start: "((", end: "))" };
    case "triple-circle":
      return { start: "(((", end: ")))" };
    case "stadium":
      return { start: "([", end: "])" };
    case "subroutine":
      return { start: "[[", end: "]]" };
    case "diamond":
      return { start: "{", end: "}" };
    case "rectangle":
      return { start: "[", end: "]" };
    case "rounded-rectangle":
    default:
      return { start: "(", end: ")" };
  }
}

/**
 * Analyzes user input to determine if elements should be removed
 */
export function detectRemovalIntent(userInput: string): {
  shouldRemove: boolean;
  removalKeywords: string[];
} {
  const removalKeywords = [
    "remove",
    "delete",
    "eliminate",
    "get rid of",
    "take out",
    "drop",
    "cut",
    "exclude",
    "omit",
    "discard",
    "erase",
    "not needed",
    "no longer need",
    "unnecessary",
    "redundant",
    "disconnect",
    "unlink",
    "break connection",
    "separate",
  ];

  const lowerInput = userInput.toLowerCase();
  const foundKeywords = removalKeywords.filter((keyword) =>
    lowerInput.includes(keyword)
  );

  return {
    shouldRemove: foundKeywords.length > 0,
    removalKeywords: foundKeywords,
  };
}

/**
 * Extracts entity names that should be removed from user input
 */
export function extractRemovalTargets(userInput: string): string[] {
  const targets: string[] = [];
  const lowerInput = userInput.toLowerCase();

  // Pattern to find "remove X" or "delete Y" etc.
  const removalPatterns = [
    /remove\s+([a-zA-Z0-9_\s]+?)(?:\s+(?:node|element|connection|edge|link))?(?:\s|$|\.)/gi,
    /delete\s+([a-zA-Z0-9_\s]+?)(?:\s+(?:node|element|connection|edge|link))?(?:\s|$|\.)/gi,
    /get\s+rid\s+of\s+([a-zA-Z0-9_\s]+?)(?:\s+(?:node|element|connection|edge|link))?(?:\s|$|\.)/gi,
    /eliminate\s+([a-zA-Z0-9_\s]+?)(?:\s+(?:node|element|connection|edge|link))?(?:\s|$|\.)/gi,
  ];

  removalPatterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(lowerInput)) !== null) {
      const target = match[1].trim();
      if (target && !targets.includes(target)) {
        targets.push(target);
      }
    }
  });

  return targets;
}

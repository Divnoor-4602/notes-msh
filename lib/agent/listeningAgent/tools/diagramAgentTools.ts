import mermaid from "mermaid";
import { generateAlternativeId, parseMermaidStructure } from "./utils";

// Polyfill DOM for Node.js environment only
function injectDOMPolyfill(context: Record<string, unknown>) {
  // Only run in Node.js environment, not in browser
  if (typeof window !== "undefined") {
    return; // Browser environment, no polyfill needed
  }

  try {
    // Dynamic import to avoid bundling happy-dom in browser
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Window } = require("happy-dom");
    const window = new Window();

    for (const key of Object.getOwnPropertyNames(window)) {
      if (key in context) continue;
      try {
        context[key] = (window as Record<string, unknown>)[key];
      } catch {
        // Ignore errors for properties that can't be set
      }
    }
  } catch {
    // happy-dom not available, skip polyfill
    console.warn(
      "happy-dom not available, mermaid.parse() may not work in Node.js"
    );
  }
}

// Inject DOM polyfill before using mermaid (only in Node.js)
injectDOMPolyfill(globalThis);

// Type definitions for rule linting
export interface RuleLintInput {
  mermaid: string;
  disallowedFeatures?: string[];
  limits?: { maxNodes?: number; maxEdges?: number };
  directionDefault?: "TD" | "TB" | "LR" | "RL" | "BT";
}

export interface RuleLintViolation {
  code:
    | "NON_FLOWCHART"
    | "ER_OR_GANTT"
    | "MISSING_HEADER"
    | "BAD_DIRECTION"
    | "FORBIDDEN_FEATURE"
    | "BAD_SHAPE"
    | "BAD_LABEL"
    | "UNESCAPED_PIPE"
    | "SUBGRAPH_BLOCK"
    | "INLINE_LINK_SYNTAX"
    | "SIZE_CAP"
    | "EXTRA_TEXT";
  message: string;
  loc?: string;
  hint?: string;
  severity?: "error" | "warn";
}

export interface RuleLintResult {
  ok: boolean;
  violations: RuleLintViolation[];
}

/**
 * Validates Mermaid diagram syntax and structure for correctness.
 * Uses mermaid.parse() to validate the syntax without rendering.
 *
 * @param mermaidCode - The Mermaid diagram code to validate
 * @returns Object with validation result and details
 */
export async function validateMermaid(mermaidCode: string) {
  try {
    // Initialize mermaid with basic configuration
    mermaid.initialize({
      startOnLoad: false,
    });

    // Parse the mermaid code to validate syntax with suppressErrors option
    const parseOptions = { suppressErrors: true };
    const parseResult = await mermaid.parse(mermaidCode, parseOptions);

    if (parseResult) {
      return {
        success: true,
        valid: true,
        diagramType: parseResult.diagramType,
        message: "Mermaid syntax is valid",
      };
    } else {
      return {
        success: true,
        valid: false,
        message: "Mermaid syntax is invalid",
      };
    }
  } catch (error) {
    return {
      success: false,
      valid: false,
      error: error instanceof Error ? error.message : "Unknown parsing error",
      message: "Failed to parse Mermaid diagram",
    };
  }
}

/**
 * Comprehensive Mermaid linter for Excalidraw-safe diagrams.
 * Enforces only what Excalidraw can reliably consume from Mermaid.
 * Catches and reports violations that could break conversion or visual consistency.
 *
 * @param input - The linting input configuration
 * @returns Object with linting result and violations
 */
export function ruleLint(input: RuleLintInput): RuleLintResult {
  const {
    mermaid: mermaidCode,
    disallowedFeatures = [
      "erDiagram",
      "gantt",
      "classDef",
      "class",
      "style",
      "linkStyle",
      "click",
      "accTitle",
      "accDescr",
    ],
    limits,
    directionDefault = "TD",
  } = input;

  const violations: RuleLintViolation[] = [];
  const lines = mermaidCode.trim().split("\n");

  // Check for flowchart header
  checkFlowchartHeader(lines, violations, directionDefault);

  // Check for forbidden diagram types and features
  checkForbiddenFeatures(mermaidCode, violations, disallowedFeatures);

  // Check shapes and labels
  checkShapesAndLabels(lines, violations);

  // Check subgraphs
  checkSubgraphs(lines, violations);

  // Check edge syntax
  checkEdgeSyntax(lines, violations);

  // Check size limits if provided
  if (limits) {
    checkSizeLimits(mermaidCode, violations, limits);
  }

  // Check for extra text outside code blocks
  checkExtraText(mermaidCode, violations);

  return {
    ok: violations.length === 0,
    violations,
  };
}

// Helper function to check flowchart header
function checkFlowchartHeader(
  lines: string[],
  violations: RuleLintViolation[],
  directionDefault: string
): void {
  const validDirections = ["TD", "TB", "LR", "RL", "BT"];
  const firstLine = lines[0]?.trim();

  if (!firstLine) {
    violations.push({
      code: "MISSING_HEADER",
      message: "Flowchart header is missing",
      hint: `Add 'flowchart ${directionDefault}' at the beginning`,
      severity: "error",
    });
    return;
  }

  const flowchartMatch = firstLine.match(/^flowchart\s+(\w+)/);
  if (!flowchartMatch) {
    if (firstLine.startsWith("graph")) {
      violations.push({
        code: "NON_FLOWCHART",
        message:
          "Use 'flowchart' instead of 'graph' for better Excalidraw compatibility",
        loc: firstLine,
        hint: `Replace 'graph' with 'flowchart ${directionDefault}'`,
        severity: "error",
      });
    } else {
      violations.push({
        code: "MISSING_HEADER",
        message: "Missing flowchart header",
        loc: firstLine,
        hint: `Start with 'flowchart ${directionDefault}'`,
        severity: "error",
      });
    }
    return;
  }

  const direction = flowchartMatch[1];
  if (!validDirections.includes(direction)) {
    violations.push({
      code: "BAD_DIRECTION",
      message: `Invalid direction '${direction}'`,
      loc: firstLine,
      hint: `Use one of: ${validDirections.join(", ")}`,
      severity: "error",
    });
  }
}

// Helper function to check for forbidden features
function checkForbiddenFeatures(
  mermaidCode: string,
  violations: RuleLintViolation[],
  disallowedFeatures: string[]
): void {
  // Check for ER diagram or Gantt
  if (mermaidCode.includes("erDiagram") || mermaidCode.includes("gantt")) {
    violations.push({
      code: "ER_OR_GANTT",
      message: "ER diagrams and Gantt charts are not supported",
      hint: "Use flowchart syntax instead",
      severity: "error",
    });
  }

  // Check for other forbidden features
  disallowedFeatures.forEach((feature) => {
    const regex = new RegExp(`\\b${feature}\\b`, "i");
    if (regex.test(mermaidCode)) {
      violations.push({
        code: "FORBIDDEN_FEATURE",
        message: `Feature '${feature}' is not allowed for Excalidraw compatibility`,
        hint: "Remove or replace with basic flowchart elements",
        severity: "error",
      });
    }
  });
}

// Helper function to check shapes and labels
function checkShapesAndLabels(
  lines: string[],
  violations: RuleLintViolation[]
): void {
  const validShapePatterns = [
    /\([^)]*\)/, // rounded rectangle: (Label)
    /\(\[[^\]]*\]\)/, // stadium: ([Label])
    /\[\[[^\]]*\]\]/, // subroutine: [[Label]]
    /\(\([^)]*\)\)/, // circle: ((Label))
    /\{[^}]*\}/, // decision: {Label}
    /\(\(\([^)]*\)\)\)/, // double circle: (((Label)))
  ];

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    // Skip comments and empty lines
    if (
      trimmedLine.startsWith("%%") ||
      trimmedLine === "" ||
      trimmedLine.startsWith("flowchart") ||
      trimmedLine.startsWith("subgraph") ||
      trimmedLine === "end"
    ) {
      return;
    }

    // Check for node definitions with shapes
    const nodeMatch = trimmedLine.match(
      /^([A-Za-z0-9_]+)(\[[^\]]*\]|\([^)]*\)|\{[^}]*\}|\[\[[^\]]*\]\]|\(\([^)]*\)\)|\(\(\([^)]*\)\)\))/
    );
    if (nodeMatch) {
      const shapeText = nodeMatch[2];
      const isValidShape = validShapePatterns.some((pattern) =>
        pattern.test(shapeText)
      );

      if (!isValidShape) {
        violations.push({
          code: "BAD_SHAPE",
          message: `Invalid shape syntax: ${shapeText}`,
          loc: trimmedLine,
          hint: "Use one of: (), ([]), [[ ]], (( )), { }, ((( )))",
          severity: "error",
        });
      }

      // Check for unescaped pipes in labels
      const labelContent = shapeText.slice(1, -1); // Remove outer brackets
      if (
        labelContent.includes("|") &&
        !trimmedLine.includes("---|") &&
        !trimmedLine.includes("==|")
      ) {
        violations.push({
          code: "UNESCAPED_PIPE",
          message: "Unescaped pipe character in label",
          loc: trimmedLine,
          hint: "Replace '|' with '/' or use an edge label instead",
          severity: "error",
        });
      }

      // Check for backticks in labels
      if (labelContent.includes("`")) {
        violations.push({
          code: "BAD_LABEL",
          message: "Backticks in labels are not allowed",
          loc: trimmedLine,
          hint: "Remove backticks from the label",
          severity: "warn",
        });
      }

      // Check label length (max 60 chars)
      if (labelContent.length > 60) {
        violations.push({
          code: "BAD_LABEL",
          message: `Label too long (${labelContent.length} chars, max 60)`,
          loc: trimmedLine,
          hint: "Shorten the label text",
          severity: "warn",
        });
      }
    }
  });
}

// Helper function to check subgraphs
function checkSubgraphs(
  lines: string[],
  violations: RuleLintViolation[]
): void {
  const subgraphStack: string[] = [];
  const validDirections = ["TD", "TB", "LR", "RL", "BT"];

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("subgraph")) {
      const subgraphMatch = trimmedLine.match(/^subgraph\s+(.+)/);
      if (!subgraphMatch || !subgraphMatch[1].trim()) {
        violations.push({
          code: "SUBGRAPH_BLOCK",
          message: "Subgraph must have a name",
          loc: trimmedLine,
          hint: "Add a name after 'subgraph'",
          severity: "error",
        });
      } else {
        subgraphStack.push(subgraphMatch[1].trim());
      }
    } else if (trimmedLine === "end") {
      if (subgraphStack.length === 0) {
        violations.push({
          code: "SUBGRAPH_BLOCK",
          message: "Unexpected 'end' without matching 'subgraph'",
          loc: trimmedLine,
          severity: "error",
        });
      } else {
        subgraphStack.pop();
      }
    } else if (trimmedLine.startsWith("direction ")) {
      const directionMatch = trimmedLine.match(/^direction\s+(\w+)/);
      if (directionMatch && !validDirections.includes(directionMatch[1])) {
        violations.push({
          code: "BAD_DIRECTION",
          message: `Invalid direction '${directionMatch[1]}' in subgraph`,
          loc: trimmedLine,
          hint: `Use one of: ${validDirections.join(", ")}`,
          severity: "error",
        });
      }
    }
  });

  // Check for unclosed subgraphs
  if (subgraphStack.length > 0) {
    violations.push({
      code: "SUBGRAPH_BLOCK",
      message: `Unclosed subgraph(s): ${subgraphStack.join(", ")}`,
      hint: "Add 'end' statements to close all subgraphs",
      severity: "error",
    });
  }
}

// Helper function to check edge syntax
function checkEdgeSyntax(
  lines: string[],
  violations: RuleLintViolation[]
): void {
  lines.forEach((line) => {
    const trimmedLine = line.trim();

    // Check for multi-link inline syntax (a --> b & c --> d)
    if (trimmedLine.includes("&")) {
      // Valid pattern should have spaces around &
      const multiLinkPattern = /\w+\s*-->\s*\w+\s*&\s*\w+\s*-->\s*\w+/;
      if (!multiLinkPattern.test(trimmedLine)) {
        violations.push({
          code: "INLINE_LINK_SYNTAX",
          message: "Malformed inline multi-link syntax",
          loc: trimmedLine,
          hint: "Ensure spaces around & and proper --> syntax: 'a --> b & c --> d'",
          severity: "error",
        });
      }
    }
  });
}

// Helper function to check size limits
function checkSizeLimits(
  mermaidCode: string,
  violations: RuleLintViolation[],
  limits: { maxNodes?: number; maxEdges?: number }
): void {
  if (limits.maxNodes) {
    const nodeCount = (mermaidCode.match(/^[A-Za-z0-9_]+[\(\[\{]/gm) || [])
      .length;
    if (nodeCount > limits.maxNodes) {
      violations.push({
        code: "SIZE_CAP",
        message: `Too many nodes (${nodeCount}, max ${limits.maxNodes})`,
        hint: "Reduce the number of nodes in the diagram",
        severity: "warn",
      });
    }
  }

  if (limits.maxEdges) {
    const edgeCount = (mermaidCode.match(/-->|===|---|\|\|/g) || []).length;
    if (edgeCount > limits.maxEdges) {
      violations.push({
        code: "SIZE_CAP",
        message: `Too many edges (${edgeCount}, max ${limits.maxEdges})`,
        hint: "Reduce the number of connections in the diagram",
        severity: "warn",
      });
    }
  }
}

// Helper function to check for extra text
function checkExtraText(
  mermaidCode: string,
  violations: RuleLintViolation[]
): void {
  // Check if there's text outside mermaid code blocks
  if (
    mermaidCode.includes("```") &&
    !mermaidCode.trim().startsWith("```mermaid")
  ) {
    violations.push({
      code: "EXTRA_TEXT",
      message: "Extra text detected outside code block",
      hint: "Ensure the response contains only a single ```mermaid code block",
      severity: "error",
    });
  }
}

// Types for validate_ids function
export interface ValidateIdsInput {
  mermaid: string;
  usedNodeIds: string[];
  usedEdgeIds?: string[];
  labelToId?: Record<string, string>;
  reservedIds?: string[];
  idPattern?: RegExp;
  generateEdgeIds?: boolean;
}

export interface ValidateIdsError {
  code:
    | "ID_COLLISION_EXISTING"
    | "ID_DUPLICATE_LOCAL"
    | "RESERVED_ID"
    | "INVALID_ID_FORMAT"
    | "MISSING_NODE_FOR_EDGE"
    | "EDGE_ID_COLLISION"
    | "UNRESOLVABLE_ID"
    | "AMBIGUOUS_LABEL_MAPPING";
  message: string;
  loc?: string;
  hint?: string;
}

export interface ValidateIdsResult {
  ok: boolean;
  errors: ValidateIdsError[];
  suggestions?: {
    nodeIdRenames?: Array<{ from: string; to: string }>;
    edgeIds?: Array<{ source: string; target: string; id: string }>;
  };
}

export interface ParsedNode {
  id: string;
  label?: string;
  shape: string;
}

export interface ParsedEdge {
  source: string;
  target: string;
  label?: string;
}

/**
 * Validates Mermaid diagram IDs for safety and consistency.
 * Ensures node and edge IDs won't collide with existing canvas elements
 * and are internally consistent within the Mermaid diagram.
 *
 * @param input - ValidateIdsInput containing mermaid code and validation context
 * @returns ValidateIdsResult with validation status, errors, and suggestions
 */
export function validateIds(input: ValidateIdsInput): ValidateIdsResult {
  const {
    mermaid: mermaidCode,
    usedNodeIds,
    usedEdgeIds = [],
    labelToId = {},
    reservedIds = [],
    idPattern = /^[A-Za-z][A-Za-z0-9_]*$/,
    generateEdgeIds = false,
  } = input;

  const errors: ValidateIdsError[] = [];
  const suggestions: {
    nodeIdRenames?: Array<{ from: string; to: string }>;
    edgeIds?: Array<{ source: string; target: string; id: string }>;
  } = {};

  try {
    // Parse nodes and edges from the Mermaid code
    const { nodes, edges } = parseMermaidStructure(mermaidCode);

    // Track local node IDs for duplicate detection
    const localNodeIds = new Set<string>();
    const nodeIdToLabel: Record<string, string> = {};

    // Validate each node
    for (const node of nodes) {
      const { id, label } = node;

      // Store label mapping for reference
      if (label) {
        nodeIdToLabel[id] = label;
      }

      // Check ID format
      if (!idPattern.test(id)) {
        errors.push({
          code: "INVALID_ID_FORMAT",
          message: `Node ID "${id}" has invalid format`,
          loc: id,
          hint: "IDs must start with a letter; use letters, digits, underscores.",
        });
        continue;
      }

      // Check for local duplicates
      if (localNodeIds.has(id)) {
        errors.push({
          code: "ID_DUPLICATE_LOCAL",
          message: `Node ID "${id}" is defined multiple times in this diagram`,
          loc: id,
          hint: `Use unique node IDs within the diagram`,
        });
        continue;
      }
      localNodeIds.add(id);

      // Check collision with existing canvas nodes
      if (usedNodeIds.includes(id)) {
        errors.push({
          code: "ID_COLLISION_EXISTING",
          message: `Node ID "${id}" already exists on canvas`,
          loc: id,
          hint: `Rename to avoid collision (suggested: ${generateAlternativeId(
            id,
            usedNodeIds
          )})`,
        });
      }

      // Check reserved IDs
      if (reservedIds.includes(id)) {
        errors.push({
          code: "RESERVED_ID",
          message: `Node ID "${id}" is reserved`,
          loc: id,
          hint: `Use a different ID that is not system-reserved`,
        });
      }

      // Check label-to-ID mapping consistency
      if (label && labelToId[label]) {
        const expectedId = labelToId[label];
        if (id !== expectedId && !usedNodeIds.includes(expectedId)) {
          errors.push({
            code: "AMBIGUOUS_LABEL_MAPPING",
            message: `Node with label "${label}" uses ID "${id}" but previous mapping suggests "${expectedId}"`,
            loc: id,
            hint: `Consider using ID "${expectedId}" for consistency across turns`,
          });
        } else if (id !== expectedId && usedNodeIds.includes(expectedId)) {
          errors.push({
            code: "AMBIGUOUS_LABEL_MAPPING",
            message: `Node with label "${label}" conflicts with existing mapping to "${expectedId}"`,
            loc: id,
            hint: `Confirm intended identity or use a different label`,
          });
        }
      }
    }

    // Generate node ID rename suggestions if there are collisions
    if (errors.some((e) => e.code === "ID_COLLISION_EXISTING")) {
      suggestions.nodeIdRenames = [];
      for (const error of errors) {
        if (error.code === "ID_COLLISION_EXISTING" && error.loc) {
          const originalId = error.loc;
          const newId = generateAlternativeId(originalId, usedNodeIds);
          suggestions.nodeIdRenames.push({ from: originalId, to: newId });
        }
      }
    }

    // Validate edges
    for (const edge of edges) {
      const { source, target } = edge;

      // Check that edge endpoints exist (either in local nodes or on canvas)
      if (!localNodeIds.has(source) && !usedNodeIds.includes(source)) {
        errors.push({
          code: "MISSING_NODE_FOR_EDGE",
          message: `Edge source "${source}" is not defined`,
          loc: `${source} -> ${target}`,
          hint: `Define node "${source}" or connect to existing canvas node by exact ID`,
        });
      }

      if (!localNodeIds.has(target) && !usedNodeIds.includes(target)) {
        errors.push({
          code: "MISSING_NODE_FOR_EDGE",
          message: `Edge target "${target}" is not defined`,
          loc: `${source} -> ${target}`,
          hint: `Define node "${target}" or connect to existing canvas node by exact ID`,
        });
      }
    }

    // Generate edge IDs if requested
    if (generateEdgeIds && edges.length > 0) {
      suggestions.edgeIds = [];
      const usedEdgeIdsSet = new Set(usedEdgeIds);
      const edgeIdCounts: Record<string, number> = {};

      for (const edge of edges) {
        const { source, target } = edge;
        let baseEdgeId = `${source}_${target}`;

        // Handle parallel edges
        if (edgeIdCounts[baseEdgeId]) {
          edgeIdCounts[baseEdgeId]++;
          baseEdgeId = `${baseEdgeId}_${edgeIdCounts[baseEdgeId]}`;
        } else {
          edgeIdCounts[baseEdgeId] = 1;
        }

        // Handle collision with existing edge IDs
        let finalEdgeId = baseEdgeId;
        let counter = 2;
        while (usedEdgeIdsSet.has(finalEdgeId)) {
          finalEdgeId = `${baseEdgeId}_${counter}`;
          counter++;
          if (counter > 100) {
            errors.push({
              code: "UNRESOLVABLE_ID",
              message: `Cannot generate unique edge ID for ${source} -> ${target}`,
              loc: `${source} -> ${target}`,
              hint: `Too many edge ID collisions, consider different naming strategy`,
            });
            break;
          }
        }

        if (counter <= 100) {
          usedEdgeIdsSet.add(finalEdgeId);
          suggestions.edgeIds.push({ source, target, id: finalEdgeId });
        }
      }
    }

    return {
      ok: errors.length === 0,
      errors,
      ...(Object.keys(suggestions).length > 0 && { suggestions }),
    };
  } catch (parseError) {
    return {
      ok: false,
      errors: [
        {
          code: "INVALID_ID_FORMAT",
          message: `Failed to parse Mermaid structure: ${
            parseError instanceof Error ? parseError.message : "Unknown error"
          }`,
          hint: "Check Mermaid syntax before validating IDs",
        },
      ],
    };
  }
}

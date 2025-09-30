import type { CreateAgentOptions } from "@/lib/validations/tool.schema";
// import { extractCanvasContext } from "@/lib/agent/listeningAgent/tools/utils"; // unused
import {
  ruleLint,
  validateMermaid,
  type RuleLintInput,
} from "@/lib/agent/listeningAgent/tools/diagramAgentTools";

/**
 * Canonical canvas context types used by the Mermaid agent.
 */
export interface CanvasNode {
  id: number;
  type: string;
  label: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export interface CanvasEdge {
  source: number;
  target: number;
  label: string;
}

export interface CanvasSubgraph {
  label: string;
  nodes: number[];
}

export interface CanvasContext {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  subgraphs: CanvasSubgraph[];
}

/**
 * Request body structure for mermaid agent
 */
export interface MermaidAgentRequest {
  elements: unknown[]; // Excalidraw elements (deprecated, now empty to prevent ID leakage)
  currentMermaidCode: string | null; // Current Mermaid code from canvas store
  agentOptions?: CreateAgentOptions;
  canvasContext?: CanvasContext; // Processed canvas context without raw IDs
}

/**
 * Response structure from mermaid agent
 */
export interface MermaidAgentResponse {
  success: boolean;
  mermaidCode?: string;
  error?: string;
  validationErrors?: string[];
}

/**
 * Filter out deleted elements and free-flowing text elements that aren't bound to shapes
 */
type RawElement = {
  id: string;
  type: string;
  isDeleted?: boolean;
  x: number;
  y: number;
  width?: number;
  height?: number;
  containerId?: string | null;
  startBinding?: { elementId?: string | null } | null;
  endBinding?: { elementId?: string | null } | null;
  text?: string;
  points?: { x: number; y: number }[];
};

export function filterBoundElements(elements: unknown[]): RawElement[] {
  const typed = elements as RawElement[];
  return typed.filter((element) => {
    // Filter out deleted elements first
    if (element.isDeleted) {
      return false;
    }

    // Keep all non-text elements
    if (element.type !== "text") {
      return true;
    }

    // For text elements, only keep those that are bound to other elements
    return element.containerId != null;
  });
}

/**
 * Extract canvas context with filtered elements (no free-flowing text)
 */
export function extractFilteredCanvasContext(elements: unknown[]) {
  const filteredElements = filterBoundElements(elements as RawElement[]);
  return extractIdFreeCanvasContext(filteredElements);
}

/**
 * Local copy of detectSubgraphs to avoid import issues
 */
type RectElement = RawElement & { width: number; height: number };
function detectSubgraphs(
  rectangles: RectElement[],
  textElements: RawElement[]
) {
  const subgraphs: { id: string; label: string; nodes: string[] }[] = [];

  // Identify subgraphs: very large rectangles that are likely containers
  const potentialSubgraphs = rectangles.filter((rect) => {
    const width = rect.width;
    const height = rect.height;

    // Much more restrictive subgraph criteria to avoid false positives
    const isVeryLarge = width > 400 && height > 300;
    const isWideContainer = width > 500 && height > 200;
    const isTallContainer = width > 300 && height > 400;

    const isSubgraphSize = isVeryLarge || isWideContainer || isTallContainer;

    // Additional check: avoid rectangles with short, content-like text
    const boundText = textElements.find((text) => text.containerId === rect.id);
    const textContent = boundText?.text ?? "";
    const hasShortText = textContent.length < 20;
    const lower = textContent.toLowerCase();
    const hasContentLikeText =
      lower.includes("what") ||
      lower.includes("new") ||
      lower.includes("change") ||
      textContent.length < 15;

    // Don't classify as subgraph if it has short or content-like text
    if (hasShortText || hasContentLikeText) {
      return false;
    }

    return isSubgraphSize;
  });

  potentialSubgraphs.forEach((subgraph, index) => {
    // Find bound text for subgraph label
    const boundText = textElements.find(
      (text) => text.containerId === subgraph.id
    );
    const label = boundText?.text || `Subgraph ${index + 1}`;

    // Find nodes contained within this subgraph
    const containedNodes: string[] = [];
    rectangles
      .filter((rect) => rect.id !== subgraph.id)
      .forEach((rect) => {
        if (
          rect.x >= subgraph.x &&
          rect.y >= subgraph.y &&
          rect.x + rect.width <= subgraph.x + subgraph.width &&
          rect.y + rect.height <= subgraph.y + subgraph.height
        ) {
          containedNodes.push(rect.id);
        }
      });

    if (containedNodes.length > 0) {
      subgraphs.push({
        id: subgraph.id,
        label,
        nodes: containedNodes,
      });
    }
  });

  return subgraphs;
}

/**
 * Extract canvas context WITHOUT any Excalidraw element IDs
 * This ensures the LLM cannot access any internal IDs
 */
function extractIdFreeCanvasContext(elements: RawElement[]): CanvasContext {
  // First, filter out deleted elements
  const activeElements = elements.filter((el) => !el.isDeleted);

  // Filter elements by type
  const rectangles = activeElements.filter(
    (el): el is RectElement =>
      el.type === "rectangle" &&
      typeof el.width === "number" &&
      typeof el.height === "number"
  );
  const diamonds = activeElements.filter(
    (el): el is RawElement => el.type === "diamond"
  );
  const ellipses = activeElements.filter(
    (el): el is RawElement => el.type === "ellipse"
  );
  const arrows = activeElements.filter((el) => el.type === "arrow");
  const textElements = activeElements.filter((el) => el.type === "text");

  // Detect subgraphs first (before filtering regular nodes)
  const subgraphs = detectSubgraphs(rectangles, textElements);

  // Filter out subgraphs from regular rectangles
  const subgraphIds = new Set(subgraphs.map((sg) => sg.id));
  const regularRectangles = rectangles.filter(
    (rect) => !subgraphIds.has(rect.id)
  );

  // Combine all shape types as nodes (excluding subgraphs)
  const allShapes = [...regularRectangles, ...diamonds, ...ellipses];

  // Extract nodes WITHOUT IDs - only type and label
  const nodes: CanvasNode[] = allShapes.map((shape, index) => {
    // Find bound text element for label
    const boundText = textElements.find(
      (text) => text.containerId === shape.id
    );
    const label = boundText?.text || `${shape.type}_node`;

    return {
      id: index,
      // NO ID FIELD - this is the critical change
      type: shape.type,
      label: label,
      // Keep position for spatial understanding but no ID references
      position: { x: shape.x, y: shape.y },
      size: { width: shape.width ?? 0, height: shape.height ?? 0 },
    };
  });

  // Create a temporary ID mapping for edge processing (not exposed to LLM)
  const shapeIdToIndex = new Map<string, number>();
  allShapes.forEach((shape, index) => {
    shapeIdToIndex.set(shape.id, index);
  });

  // Extract edges without exposing IDs
  const edges: CanvasEdge[] = arrows
    .map((arrow) => {
      const startId = arrow.startBinding?.elementId ?? null;
      const endId = arrow.endBinding?.elementId ?? null;
      const sourceIndex = startId ? shapeIdToIndex.get(startId) : undefined;
      const targetIndex = endId ? shapeIdToIndex.get(endId) : undefined;

      // Find bound text for edge label
      const boundText = textElements.find(
        (text) => text.containerId === arrow.id
      );

      return {
        // Use indices instead of IDs
        source: sourceIndex !== undefined ? sourceIndex : -1,
        target: targetIndex !== undefined ? targetIndex : -1,
        label: boundText?.text || "",
      };
    })
    .filter((edge) => edge.source >= 0 && edge.target >= 0); // Remove invalid edges

  // Process subgraphs without IDs
  const processedSubgraphs: CanvasSubgraph[] = subgraphs
    .map((sg) => ({
      label: sg.label,
      nodes: sg.nodes
        .map((nodeId: string) => {
          const index = allShapes.findIndex((shape) => shape.id === nodeId);
          return index >= 0 ? index : -1;
        })
        .filter((index: number) => index >= 0),
    }))
    .filter((sg) => sg.nodes.length > 0); // Only include non-empty subgraphs

  return {
    nodes,
    edges,
    subgraphs: processedSubgraphs,
  };
}

/**
 * Validate generated Mermaid code using rule linting and syntax validation
 */
export function validateGeneratedMermaid(mermaidCode: string) {
  const validationErrors: string[] = [];

  // Check for Excalidraw IDs (long alphanumeric strings with mixed case, hyphens, underscores)
  const excalidrawIdPattern = /[a-zA-Z0-9_-]{12,}/g;
  const potentialIds = mermaidCode.match(excalidrawIdPattern);
  if (potentialIds) {
    const suspiciousIds = potentialIds.filter((id) => {
      // Filter out clearly valid semantic IDs
      const validPatterns = [
        "startProcess",
        "validateData",
        "userInputValidation",
        "endProcess",
        "login_form",
        "maybe_not_login",
        "validate_user",
        "user_check",
        "updateProcess",
        "initialStep",
        "changeStep",
        "authenticate",
      ];

      if (validPatterns.includes(id)) return false;

      // Detect Excalidraw ID patterns:
      // - Mixed case with numbers: oPStjtiWcl7dXPuRultvE, vhThT_pVgnjjSun1O9B44
      // - Contains both uppercase and lowercase
      // - Contains numbers mixed with letters
      // - Length > 12 characters
      const hasMixedCase = /[a-z]/.test(id) && /[A-Z]/.test(id);
      const hasNumbers = /\d/.test(id);
      const isLong = id.length > 12;

      return hasMixedCase && hasNumbers && isLong;
    });

    if (suspiciousIds.length > 0) {
      validationErrors.push(
        `Detected Excalidraw element IDs in Mermaid code: ${suspiciousIds.join(
          ", "
        )}. ` + `Use semantic IDs based on node labels instead.`
      );
    }
  }

  try {
    // Rule linting (skip ID validation as requested)
    const lintInput: RuleLintInput = {
      mermaid: mermaidCode,
      disallowedFeatures: [
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
      limits: {
        maxNodes: 100,
        maxEdges: 200,
      },
      directionDefault: "TD",
    };

    const lintResult = ruleLint(lintInput);
    if (!lintResult.ok) {
      validationErrors.push(
        ...lintResult.violations.map((v) => `${v.code}: ${v.message}`)
      );
    }
  } catch (error) {
    validationErrors.push(
      `Rule linting failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  try {
    // Mermaid syntax validation
    validateMermaid(mermaidCode)
      .then((result) => {
        if (!result.valid) {
          validationErrors.push(
            `Mermaid syntax invalid: ${
              result.message || result.error || "Unknown syntax error"
            }`
          );
        }
      })
      .catch((error) => {
        validationErrors.push(
          `Mermaid validation failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      });
  } catch (error) {
    validationErrors.push(
      `Mermaid validation error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  return {
    isValid: validationErrors.length === 0,
    errors: validationErrors,
  };
}

/**
 * Fetch mermaid response from the API
 */
export async function fetchMermaidResponse(
  request: MermaidAgentRequest,
  options?: {
    signal?: AbortSignal;
  }
): Promise<MermaidAgentResponse> {
  try {
    const response = await fetch("/api/mermaid-responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: options?.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Failed to fetch mermaid response:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch mermaid response",
    };
  }
}

/**
 * Process canvas elements and generate Mermaid code
 */
export async function generateMermaidFromCanvas(
  elements: unknown[],
  currentMermaidCode: string | null,
  options?: {
    signal?: AbortSignal;
  }
): Promise<MermaidAgentResponse> {
  try {
    // Filter elements and extract context
    const canvasContext = extractFilteredCanvasContext(elements);

    // Prepare request - only send processed context, no raw elements with IDs
    const request: MermaidAgentRequest = {
      elements: [], // Don't send raw elements to prevent ID leakage
      currentMermaidCode,
      agentOptions: {},
      canvasContext, // Send processed context instead
    };

    // Call the API
    const response = await fetchMermaidResponse(request, options);

    if (!response.success || !response.mermaidCode) {
      return response;
    }

    // Validate the generated Mermaid code
    const validation = validateGeneratedMermaid(response.mermaidCode);

    if (!validation.isValid) {
      return {
        success: false,
        error: "Generated Mermaid code failed validation",
        validationErrors: validation.errors,
      };
    }

    return response;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

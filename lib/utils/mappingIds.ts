export interface IdMapping {
  [randomId: string]: string;
}

/**
 * Detects which elements are new by comparing with previous elements.
 */
export function detectNewElements(
  currentElements: Array<{ id?: string }>,
  previousElements: Array<{ id?: string }>
): Array<{ id?: string }> {
  // Handle edge cases
  if (!currentElements || !previousElements) {
    return currentElements || [];
  }

  if (previousElements.length === 0) {
    return [...currentElements];
  }

  if (currentElements.length === 0) {
    return [];
  }

  const previousIds = new Set(
    previousElements.map((el) => el?.id).filter(Boolean)
  );
  const newElements = currentElements.filter(
    (el) => el?.id && !previousIds.has(el.id)
  );

  return newElements;
}

export function createIdMapping(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  originalSkeletons: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  convertedElements: any[]
): IdMapping {
  const mapping: IdMapping = {};

  const originalIds = originalSkeletons.map((skeleton) => skeleton.id);

  const rectangles = convertedElements.filter((el) => el.type === "rectangle");
  const arrows = convertedElements.filter((el) => el.type === "arrow");
  const textElements = convertedElements.filter((el) => el.type === "text");

  const subgraphContainers = rectangles.filter(
    (rect) =>
      ((rect.width ?? 0) > 80 || (rect.height ?? 0) > 80) &&
      ((rect.width ?? 0) > (rect.height ?? 0) * 2 ||
        (rect.height ?? 0) > (rect.width ?? 0) * 2)
  );
  const nodeRectangles = rectangles.filter(
    (rect) => !subgraphContainers.includes(rect)
  );

  subgraphContainers.forEach((container) => {
    const containerText = textElements.find(
      (text) =>
        text.containerId === container.id &&
        text.text &&
        originalIds.includes(text.text)
    );

    if (containerText && containerText.text) {
      mapping[container.id] = containerText.text;
    }
  });

  const usedIds = new Set<string>();

  nodeRectangles.forEach((nodeRect) => {
    const nodeText = textElements.find(
      (text) =>
        text.containerId === nodeRect.id &&
        text.text &&
        originalIds.includes(text.text)
    );

    if (nodeText && nodeText.text) {
      let finalId = nodeText.text;

      if (usedIds.has(finalId)) {
        let counter = 2;
        while (usedIds.has(`${finalId}_${counter}`)) {
          counter++;
        }
        finalId = `${finalId}_${counter}`;
      }

      usedIds.add(finalId);
      mapping[nodeRect.id] = finalId;
    } else {
      const fallbackText = textElements.find(
        (text) =>
          text.containerId === nodeRect.id &&
          text.text &&
          /^[a-zA-Z][a-zA-Z0-9_]*$/.test(text.text)
      );

      if (fallbackText && fallbackText.text) {
        let finalId = fallbackText.text;

        if (usedIds.has(finalId)) {
          let counter = 2;
          while (usedIds.has(`${finalId}_${counter}`)) {
            counter++;
          }
          finalId = `${finalId}_${counter}`;
        }

        usedIds.add(finalId);
        mapping[nodeRect.id] = finalId;
      }
    }
  });

  const usedArrowIds = new Set<string>();

  arrows.forEach((arrow) => {
    const originalArrow = originalSkeletons.find(
      (skeleton) =>
        skeleton.type === "arrow" &&
        skeleton.start?.id &&
        skeleton.end?.id &&
        mapping[skeleton.start.id] &&
        mapping[skeleton.end.id]
    );

    if (
      originalArrow &&
      originalArrow.id &&
      originalArrow.start &&
      originalArrow.end
    ) {
      const startElement = convertedElements.find(
        (el) => el.id === arrow.startBinding?.elementId
      );
      const endElement = convertedElements.find(
        (el) => el.id === arrow.endBinding?.elementId
      );

      if (
        startElement &&
        endElement &&
        mapping[startElement.id] === originalArrow.start.id &&
        mapping[endElement.id] === originalArrow.end.id
      ) {
        let finalArrowId = originalArrow.id;

        if (usedArrowIds.has(finalArrowId)) {
          let counter = 2;
          while (usedArrowIds.has(`${finalArrowId}_${counter}`)) {
            counter++;
          }
          finalArrowId = `${finalArrowId}_${counter}`;
        }

        usedArrowIds.add(finalArrowId);
        mapping[arrow.id] = finalArrowId;
      }
    }
  });

  textElements.forEach((textEl) => {
    if (textEl.containerId && mapping[textEl.containerId]) {
      const containerOriginalId = mapping[textEl.containerId];
      const textId = `text_${containerOriginalId}`;

      if (originalIds.includes(textId)) {
        mapping[textEl.id] = textId;
      }
    }
  });

  const unmappedElements = convertedElements.filter((el) => !mapping[el.id]);

  unmappedElements.forEach((el) => {
    if (el.type === "text" && el.containerId) {
      const containerMapping = mapping[el.containerId];
      if (containerMapping) {
        const textId = `text_${containerMapping}`;
        mapping[el.id] = textId;
      } else {
        mapping[el.id] = el.id;
      }
    } else if (el.id && /^[a-zA-Z][a-zA-Z0-9_]*$/.test(el.id)) {
      mapping[el.id] = el.id;
    }
  });

  return mapping;
}

export function remapElementsWithOriginalIds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  elements: any[],
  idMapping: IdMapping
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
  const remappedElements = elements.map((element) => {
    const newElement = { ...element };

    if (idMapping[element.id]) {
      newElement.id = idMapping[element.id];
    }

    if (element.type === "arrow") {
      if (
        element.startBinding?.elementId &&
        idMapping[element.startBinding.elementId]
      ) {
        newElement.startBinding = {
          ...element.startBinding,
          elementId: idMapping[element.startBinding.elementId],
        };
      }

      if (
        element.endBinding?.elementId &&
        idMapping[element.endBinding.elementId]
      ) {
        newElement.endBinding = {
          ...element.endBinding,
          elementId: idMapping[element.endBinding.elementId],
        };
      }
    }

    if (element.boundElements) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      newElement.boundElements = element.boundElements.map((boundEl: any) => {
        if (boundEl.id && idMapping[boundEl.id]) {
          return {
            ...boundEl,
            id: idMapping[boundEl.id],
          };
        }
        return boundEl;
      });
    }

    if (
      element.type === "text" &&
      element.containerId &&
      idMapping[element.containerId]
    ) {
      newElement.containerId = idMapping[element.containerId];
    }

    return newElement;
  });

  return remappedElements;
}

function centerElementsOnScreen(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  elements: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
  if (elements.length === 0) return elements;

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  elements.forEach((element) => {
    if (element.x !== undefined && element.y !== undefined) {
      minX = Math.min(minX, element.x);
      minY = Math.min(minY, element.y);
      maxX = Math.max(maxX, element.x + (element.width || 0));
      maxY = Math.max(maxY, element.y + (element.height || 0));
    }
  });

  const currentCenterX = (minX + maxX) / 2;
  const currentCenterY = (minY + maxY) / 2;

  const viewportWidth =
    typeof window !== "undefined" ? window.innerWidth : 1000;
  const viewportHeight =
    typeof window !== "undefined" ? window.innerHeight : 800;

  const targetCenterX = viewportWidth / 2;
  const targetCenterY = viewportHeight / 2;

  const offsetX = targetCenterX - currentCenterX;
  const offsetY = targetCenterY - currentCenterY;

  return elements.map((element) => {
    if (element.x !== undefined && element.y !== undefined) {
      return {
        ...element,
        x: element.x + offsetX,
        y: element.y + offsetY,
      };
    }
    return element;
  });
}

export function mapMermaidToExcalidrawIds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  originalSkeletons: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  convertedElements: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
  const idMapping = createIdMapping(originalSkeletons, convertedElements);
  const remappedElements = remapElementsWithOriginalIds(
    convertedElements,
    idMapping
  );

  const centeredElements = centerElementsOnScreen(remappedElements);

  return centeredElements;
}

/**
 * Creates meaningful IDs for manually added Excalidraw elements based on their labels/text content.
 * This ensures manual elements have semantic IDs similar to voice-generated elements.
 */
export function createManualElementIdMapping(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  elements: any[],
  existingIds: Set<string>
): IdMapping {
  const mapping: IdMapping = {};
  const usedIds = new Set(existingIds);

  // Helper function to check if element needs remapping (has random Excalidraw ID)
  const needsRemapping = (elementId: string): boolean => {
    // Excalidraw generates IDs like: "aziJ5LS4gWkw--KXI2sGZ" or "URE7vbLKBux8PX-eWfr8_"
    // These are typically 15+ chars with mixed case, numbers, hyphens, underscores
    return /^[a-zA-Z0-9_-]{15,}$/.test(elementId);
  };

  // Helper function to generate semantic ID from text
  const generateSemanticId = (
    text: string,
    fallback: string = "element"
  ): string => {
    if (!text || !text.trim()) {
      text = fallback;
    }

    // Convert to camelCase
    let id = text
      .trim()
      .replace(/[^a-zA-Z0-9\s]/g, "") // Remove special chars
      .replace(/\s+/g, " ") // Normalize spaces
      .split(" ")
      .map((word, wordIndex) => {
        if (wordIndex === 0) return word.toLowerCase();
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join("");

    // Ensure ID starts with letter
    if (!/^[a-zA-Z]/.test(id)) {
      id = "element" + (id ? id.charAt(0).toUpperCase() + id.slice(1) : "");
    }

    // Ensure uniqueness
    let finalId = id || "element";
    let counter = 2;
    while (usedIds.has(finalId)) {
      finalId = `${id || "element"}_${counter}`;
      counter++;
    }

    usedIds.add(finalId);
    return finalId;
  };

  // Separate elements by type
  const shapes = elements.filter((el) =>
    ["rectangle", "diamond", "ellipse"].includes(el.type)
  );
  const arrows = elements.filter((el) => el.type === "arrow");
  const textElements = elements.filter((el) => el.type === "text");

  // Process shapes first
  shapes.forEach((shape) => {
    if (!needsRemapping(shape.id)) return;

    // Find text bound to this shape
    const boundText = textElements.find(
      (text) => text.containerId === shape.id
    );

    if (boundText && boundText.text) {
      // Use the text content for semantic ID
      const semanticId = generateSemanticId(boundText.text);
      mapping[shape.id] = semanticId;
      mapping[boundText.id] = `text_${semanticId}`;
    } else {
      // No text, use type-based fallback
      const typeMap = {
        rectangle: "rect",
        diamond: "decision",
        ellipse: "oval",
      };
      const semanticId = generateSemanticId(
        "",
        typeMap[shape.type as keyof typeof typeMap] || "shape"
      );
      mapping[shape.id] = semanticId;
    }
  });

  // Process arrows
  arrows.forEach((arrow) => {
    if (!needsRemapping(arrow.id)) return;

    const boundText = textElements.find(
      (text) => text.containerId === arrow.id
    );

    if (boundText && boundText.text) {
      // Use arrow label text
      const semanticId = generateSemanticId(boundText.text + "Arrow");
      mapping[arrow.id] = semanticId;
      mapping[boundText.id] = `text_${semanticId}`;
    } else {
      // Generic arrow ID
      const semanticId = generateSemanticId("", "arrow");
      mapping[arrow.id] = semanticId;
    }
  });

  // Process standalone text elements (not bound to shapes)
  textElements.forEach((textEl) => {
    if (!needsRemapping(textEl.id) || textEl.containerId) return;

    const semanticId = generateSemanticId(textEl.text, "text");
    mapping[textEl.id] = semanticId;
  });

  return mapping;
}

/**
 * Applies semantic ID remapping to manually added elements.
 * This makes manual elements have meaningful IDs like voice-generated ones.
 */
export function remapManualElements(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  elements: any[],
  existingIds: Set<string>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
  const idMapping = createManualElementIdMapping(elements, existingIds);

  if (Object.keys(idMapping).length === 0) {
    return elements; // No remapping needed
  }

  return remapElementsWithOriginalIds(elements, idMapping);
}

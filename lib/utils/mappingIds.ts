export interface IdMapping {
  [randomId: string]: string;
}

export function createIdMapping(
  originalSkeletons: any[],
  convertedElements: any[]
): IdMapping {
  const mapping: IdMapping = {};

  const originalIds = originalSkeletons.map((skeleton) => skeleton.id);

  const rectangles = convertedElements.filter((el) => el.type === "rectangle");
  const arrows = convertedElements.filter((el) => el.type === "arrow");
  const textElements = convertedElements.filter((el) => el.type === "text");

  const subgraphContainers = rectangles.filter(
    (rect) =>
      (rect.width > 80 || rect.height > 80) &&
      (rect.width > rect.height * 2 || rect.height > rect.width * 2)
  );
  const nodeRectangles = rectangles.filter(
    (rect) => !subgraphContainers.includes(rect)
  );

  subgraphContainers.forEach((container, index) => {
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

    if (originalArrow && originalArrow.id) {
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
  elements: any[],
  idMapping: IdMapping
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

function centerElementsOnScreen(elements: any[]): any[] {
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
  originalSkeletons: any[],
  convertedElements: any[]
): any[] {
  const idMapping = createIdMapping(originalSkeletons, convertedElements);
  const remappedElements = remapElementsWithOriginalIds(
    convertedElements,
    idMapping
  );

  const centeredElements = centerElementsOnScreen(remappedElements);

  return centeredElements;
}

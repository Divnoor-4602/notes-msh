import { create } from "zustand";
import {
  mapMermaidToExcalidrawIds,
  remapManualElements,
} from "@/lib/utils/mappingIds";
import { extractCanvasContext } from "@/lib/agent/listeningAgent/tools/utils";

// Define types based on what we know is available
interface ExcalidrawAPI {
  updateScene: (scene: { elements: ExcalidrawElement[] }) => void;
}

interface ExcalidrawElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  [key: string]: unknown;
}

interface ExcalidrawElementSkeleton {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  [key: string]: unknown;
}

// Dynamic import helper for client-side only
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let convertToExcalidrawElements: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let parseMermaidToExcalidraw: any = null;

const getConvertToExcalidrawElements = async () => {
  if (typeof window === "undefined") {
    // Server-side rendering, return a no-op function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (skeletons: any[]) => skeletons;
  }

  if (!convertToExcalidrawElements) {
    const excalidrawModule = await import("@excalidraw/excalidraw");
    convertToExcalidrawElements = excalidrawModule.convertToExcalidrawElements;
  }

  return convertToExcalidrawElements;
};

const getParseMermaidToExcalidraw = async () => {
  if (typeof window === "undefined") {
    return null;
  }

  if (!parseMermaidToExcalidraw) {
    const mermaidModule = await import("@excalidraw/mermaid-to-excalidraw");
    parseMermaidToExcalidraw = mermaidModule.parseMermaidToExcalidraw;
  }

  return parseMermaidToExcalidraw;
};

interface CanvasState {
  // Core state
  excalidrawAPI: ExcalidrawAPI | null;
  elements: ExcalidrawElement[];
  isProcessingDiagram: boolean;
  isRemappingElements: boolean;
  lastSyncedElements: ExcalidrawElement[]; // Track last synced state for meaningful change detection

  // Actions for API management
  setExcalidrawAPI: (api: ExcalidrawAPI) => void;

  // Actions for element management - using skeleton approach (now async)
  addElementSkeleton: (skeleton: ExcalidrawElementSkeleton) => Promise<void>;
  addElementsSkeleton: (
    skeletons: ExcalidrawElementSkeleton[]
  ) => Promise<void>;
  addMermaidDiagram: (diagramDefinition: string) => Promise<void>;
  updateElements: (elements: ExcalidrawElement[]) => void;
  syncFromExcalidraw: (elements: ExcalidrawElement[]) => void;
  syncFromExcalidrawWithRemapping: (elements: ExcalidrawElement[]) => void;
  syncToExcalidraw: () => void;

  // Utility actions
  clearCanvas: () => void;
  getElementById: (id: string) => ExcalidrawElement | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getCanvasContext: () => any;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  // Initial state
  excalidrawAPI: null,
  elements: [],
  isProcessingDiagram: false,
  isRemappingElements: false,
  lastSyncedElements: [],

  setExcalidrawAPI: (api: ExcalidrawAPI) => {
    set({ excalidrawAPI: api });
  },

  addElementSkeleton: async (skeleton: ExcalidrawElementSkeleton) => {
    try {
      const convert = await getConvertToExcalidrawElements();

      set((state) => {
        try {
          // Convert skeleton to full Excalidraw elements (shape + bound text)
          const convertedElements = convert([skeleton], {
            regenerateIds: false,
          });

          // Apply ID remapping to preserve original Mermaid IDs
          const remappedElements = mapMermaidToExcalidrawIds(
            [skeleton],
            convertedElements
          );

          // Ensure unique IDs by checking against existing elements
          const existingIds = new Set(state.elements.map((el) => el.id));
          const uniqueRemappedElements = remappedElements.map((el) => {
            if (existingIds.has(el.id)) {
              // Generate a unique ID by appending a counter
              let counter = 2;
              let newId = `${el.id}_${counter}`;
              while (existingIds.has(newId)) {
                counter++;
                newId = `${el.id}_${counter}`;
              }
              el.id = newId;
            }
            return el;
          });

          const newElements = [...state.elements, ...uniqueRemappedElements];

          // Update Excalidraw canvas if API is available
          if (state.excalidrawAPI) {
            state.excalidrawAPI.updateScene({
              elements: newElements,
            });
          }

          return {
            elements: newElements,
          };
        } catch (conversionError) {
          throw conversionError;
        }
      });
    } catch (error) {
      throw error;
    }
  },

  addElementsSkeleton: async (skeletons: ExcalidrawElementSkeleton[]) => {
    try {
      const convert = await getConvertToExcalidrawElements();

      set((state) => {
        // Convert skeletons to full Excalidraw elements
        const convertedElements = convert(skeletons, { regenerateIds: false });

        // Apply ID remapping to preserve original Mermaid IDs
        const remappedElements = mapMermaidToExcalidrawIds(
          skeletons,
          convertedElements
        );

        // Ensure unique IDs by checking against existing elements
        const existingIds = new Set(state.elements.map((el) => el.id));
        const uniqueRemappedElements = remappedElements.map((el) => {
          if (existingIds.has(el.id)) {
            // Generate a unique ID by appending a counter
            let counter = 2;
            let newId = `${el.id}_${counter}`;
            while (existingIds.has(newId)) {
              counter++;
              newId = `${el.id}_${counter}`;
            }
            el.id = newId;
          }
          return el;
        });

        const newElements = [...state.elements, ...uniqueRemappedElements];

        // Update Excalidraw canvas if API is available
        if (state.excalidrawAPI) {
          state.excalidrawAPI.updateScene({
            elements: newElements,
          });
        }

        return {
          elements: newElements,
        };
      });
    } catch (error) {
      throw error;
    }
  },

  addMermaidDiagram: async (diagramDefinition: string) => {
    // Check if we're already processing a diagram
    const state = get();
    if (state.isProcessingDiagram) {
      return;
    }

    // Set processing flag
    set({ isProcessingDiagram: true });

    // Store current state for rollback in case of error
    const currentElements = [...get().elements];
    let hasExistingElements = false;

    try {
      const parseMermaid = await getParseMermaidToExcalidraw();

      if (!parseMermaid) {
        return;
      }

      // Get current canvas context to determine if this is incremental
      const currentContext = get().getCanvasContext();
      hasExistingElements =
        currentContext.nodes.length > 0 || currentContext.edges.length > 0;

      if (hasExistingElements) {
        // INCREMENTAL MODE: Replace entire canvas with new diagram
        // Clear existing elements first (but keep backup for rollback)
        set((state) => {
          if (state.excalidrawAPI) {
            state.excalidrawAPI.updateScene({
              elements: [],
            });
          }
          return { elements: [] };
        });
      }

      // Choose a sensible default font size
      const DEFAULT_FONT_SIZE = 32;

      const parseResult = await parseMermaid(diagramDefinition, {
        fontSize: DEFAULT_FONT_SIZE,
      });

      const { elements } = parseResult;

      if (!elements || elements.length === 0) {
        // Rollback to previous state if we had existing elements
        if (hasExistingElements) {
          set((state) => {
            if (state.excalidrawAPI) {
              state.excalidrawAPI.updateScene({
                elements: currentElements,
              });
            }
            return { elements: currentElements };
          });
        }
        return;
      }

      await get().addElementsSkeleton(elements as ExcalidrawElementSkeleton[]);
    } catch (error) {
      console.error("❌ Error processing Mermaid diagram:", error);

      // Rollback to previous state if we had existing elements
      if (hasExistingElements) {
        set((state) => {
          if (state.excalidrawAPI) {
            state.excalidrawAPI.updateScene({
              elements: currentElements,
            });
          }
          return { elements: currentElements };
        });
      }

      // Handle specific error cases
      if (
        error instanceof Error &&
        error.message.includes("has already been registered")
      ) {
        return;
      }

      // Re-throw error for upstream handling (e.g., toast notifications)
      throw error;
    } finally {
      // Always reset processing flag
      set({ isProcessingDiagram: false });
    }
  },

  updateElements: (elements: ExcalidrawElement[]) => {
    set((state) => {
      // Update Excalidraw canvas if API is available
      if (state.excalidrawAPI) {
        state.excalidrawAPI.updateScene({
          elements,
        });
      }

      return {
        elements,
      };
    });
  },

  syncFromExcalidraw: (elements: ExcalidrawElement[]) => {
    set({
      elements,
      lastSyncedElements: [...elements], // Track synced state
    });
  },

  syncFromExcalidrawWithRemapping: (elements: ExcalidrawElement[]) => {
    set((state) => {
      // Skip if already processing
      if (state.isRemappingElements) {
        return { elements };
      }

      // Only process if we have new elements (different count)
      if (elements.length <= state.elements.length) {
        return { elements, lastSyncedElements: [...elements] };
      }

      // Find truly new elements (ones not in previous state)
      const previousIds = new Set(state.elements.map((el) => el.id));
      const newElements = elements.filter((el) => !previousIds.has(el.id));

      if (newElements.length === 0) {
        return { elements, lastSyncedElements: [...elements] };
      }

      // Apply remapping only to new elements
      const existingIds = new Set(state.elements.map((el) => el.id));
      const remappedNewElements = remapManualElements(newElements, existingIds);

      // Combine existing + remapped new elements
      const finalElements = [...state.elements, ...remappedNewElements];

      return {
        elements: finalElements,
        lastSyncedElements: [...finalElements],
      };
    });
  },

  syncToExcalidraw: () => {
    const { excalidrawAPI, elements } = get();
    if (excalidrawAPI) {
      excalidrawAPI.updateScene({
        elements,
      });
    }
  },

  clearCanvas: () => {
    set((state) => {
      if (state.excalidrawAPI) {
        state.excalidrawAPI.updateScene({
          elements: [],
        });
      }

      return {
        elements: [],
      };
    });
  },

  getElementById: (id: string) => {
    const { elements } = get();
    return elements.find((el) => el.id === id);
  },

  getCanvasContext: () => {
    const { elements } = get();
    return extractCanvasContext(elements);
  },
}));

export const getCanvasStore = () => useCanvasStore.getState();

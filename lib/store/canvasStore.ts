import { create } from "zustand";

// Define types based on what we know is available
type ExcalidrawAPI = any; // We'll use any for now since imports are tricky
type ExcalidrawElement = any;
type ExcalidrawElementSkeleton = any;

// Dynamic import helper for client-side only
let convertToExcalidrawElements: any = null;
let parseMermaidToExcalidraw: any = null;

const getConvertToExcalidrawElements = async () => {
  if (typeof window === "undefined") {
    // Server-side rendering, return a no-op function
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
  syncToExcalidraw: () => void;

  // Utility actions
  clearCanvas: () => void;
  getElementById: (id: string) => ExcalidrawElement | undefined;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  // Initial state
  excalidrawAPI: null,
  elements: [],

  // Set the Excalidraw API instance
  setExcalidrawAPI: (api: ExcalidrawAPI) => {
    set({ excalidrawAPI: api });
  },

  // Add a new element using skeleton (cleaner approach)
  addElementSkeleton: async (skeleton: ExcalidrawElementSkeleton) => {
    try {
      const convert = await getConvertToExcalidrawElements();

      set((state) => {
        try {
          // Convert skeleton to full Excalidraw elements (shape + bound text)
          const convertedElements = convert([skeleton]);
          const newElements = [...state.elements, ...convertedElements];

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
          console.error("Canvas Store: Conversion error:", conversionError);
          throw conversionError;
        }
      });
    } catch (error) {
      console.error("Canvas Store: addElementSkeleton failed:", error);
      throw error;
    }
  },

  // Add multiple elements using skeletons
  addElementsSkeleton: async (skeletons: ExcalidrawElementSkeleton[]) => {
    try {
      const convert = await getConvertToExcalidrawElements();

      set((state) => {
        // Convert skeletons to full Excalidraw elements
        const convertedElements = convert(skeletons);
        const newElements = [...state.elements, ...convertedElements];

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
      console.error("Error in addElementsSkeleton:", error);
      throw error;
    }
  },

  // Parse Mermaid code and add resulting elements to the canvas
  addMermaidDiagram: async (diagramDefinition: string) => {
    try {
      const parseMermaid = await getParseMermaidToExcalidraw();

      if (!parseMermaid) {
        console.warn("Mermaid parser unavailable in this environment");
        return;
      }

      // Choose a sensible default font size
      const DEFAULT_FONT_SIZE = 32;

      const parseResult = await parseMermaid(diagramDefinition, {
        fontSize: DEFAULT_FONT_SIZE,
      });

      const { elements } = parseResult;

      if (!elements || elements.length === 0) {
        console.warn("No elements generated from Mermaid parsing");
        return;
      }

      // Elements are skeletons; reuse existing pipeline
      await get().addElementsSkeleton(elements as ExcalidrawElementSkeleton[]);
    } catch (error) {
      console.error("Failed to add Mermaid diagram:", error);
      throw error;
    }
  },

  // Update all elements (used for batch operations)
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

  // Sync elements FROM Excalidraw to store (when user manually edits)
  syncFromExcalidraw: (elements: ExcalidrawElement[]) => {
    set({
      elements,
    });
  },

  // Sync elements TO Excalidraw from store
  syncToExcalidraw: () => {
    const { excalidrawAPI, elements } = get();
    if (excalidrawAPI) {
      excalidrawAPI.updateScene({
        elements,
      });
    }
  },

  // Clear all elements from both store and canvas
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

  // Find element by ID
  getElementById: (id: string) => {
    const { elements } = get();
    return elements.find((el) => el.id === id);
  },
}));

// Helper function to get store instance (for use outside React components)
export const getCanvasStore = () => useCanvasStore.getState();

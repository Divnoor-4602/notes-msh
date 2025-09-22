import { create } from "zustand";

// Define types based on what we know is available
type ExcalidrawAPI = any; // We'll use any for now since imports are tricky
type ExcalidrawElement = any;
type ExcalidrawElementSkeleton = any;

// Dynamic import helper for client-side only
let convertToExcalidrawElements: any = null;

const getConvertToExcalidrawElements = async () => {
  if (typeof window === "undefined") {
    // Server-side rendering, return a no-op function
    return (skeletons: any[]) => skeletons;
  }

  if (!convertToExcalidrawElements) {
    const excalidrawModule = await import("@excalidraw/excalidraw");
    convertToExcalidrawElements = excalidrawModule.convertToExcalidrawElements;
  }

  console.log(
    "🔄 Canvas Store: Got converter function",
    convertToExcalidrawElements
  );
  return convertToExcalidrawElements;
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
      console.log("🏪 Canvas Store: Adding element skeleton:", skeleton);
      const convert = await getConvertToExcalidrawElements();
      console.log("🔄 Canvas Store: Got converter function");

      set((state) => {
        try {
          // Convert skeleton to full Excalidraw elements (shape + bound text)
          const convertedElements = convert([skeleton]);
          console.log(
            `✅ Canvas Store: Converted ${convertedElements.length} elements:`,
            convertedElements
          );

          const newElements = [...state.elements, ...convertedElements];
          console.log(
            `📊 Canvas Store: Total elements now: ${newElements.length}`
          );

          // Update Excalidraw canvas if API is available
          if (state.excalidrawAPI) {
            console.log("🎨 Canvas Store: Updating Excalidraw scene");
            state.excalidrawAPI.updateScene({
              elements: newElements,
            });
          } else {
            console.warn("⚠️ Canvas Store: No Excalidraw API available");
          }

          return {
            elements: newElements,
          };
        } catch (conversionError) {
          console.error("❌ Canvas Store: Conversion error:", conversionError);
          throw conversionError;
        }
      });
    } catch (error) {
      console.error("❌ Canvas Store: addElementSkeleton failed:", error);
      throw error;
    }
  },

  // Add multiple elements using skeletons
  addElementsSkeleton: async (skeletons: ExcalidrawElementSkeleton[]) => {
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

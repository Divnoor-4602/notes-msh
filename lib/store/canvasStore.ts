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

  console.log(
    "🔄 Canvas Store: Got converter function",
    convertToExcalidrawElements
  );
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
    console.log(
      "🔧 ADD_ELEMENTS_SKELETON called with",
      skeletons.length,
      "skeletons"
    );
    console.log("📋 Input skeletons preview:", skeletons.slice(0, 2));

    try {
      console.log("🔄 Getting element converter...");
      const convert = await getConvertToExcalidrawElements();
      console.log("✅ Element converter ready:", !!convert);

      set((state) => {
        console.log(
          "🏪 Current store state - elements count:",
          state.elements.length
        );
        console.log("🎨 ExcalidrawAPI available:", !!state.excalidrawAPI);

        // Convert skeletons to full Excalidraw elements
        console.log("🔄 Converting skeletons to Excalidraw elements...");
        const convertedElements = convert(skeletons);
        console.log("✅ Converted elements count:", convertedElements.length);
        console.log("📋 First converted element:", convertedElements[0]);

        const newElements = [...state.elements, ...convertedElements];
        console.log("📊 Total elements after addition:", newElements.length);

        // Update Excalidraw canvas if API is available
        if (state.excalidrawAPI) {
          console.log("🎨 Updating Excalidraw canvas...");
          state.excalidrawAPI.updateScene({
            elements: newElements,
          });
          console.log("✅ Excalidraw canvas updated");
        } else {
          console.warn(
            "⚠️ ExcalidrawAPI not available - elements added to state only"
          );
        }

        return {
          elements: newElements,
        };
      });

      console.log("✅ addElementsSkeleton completed successfully");
    } catch (error) {
      console.error("❌ Error in addElementsSkeleton:", error);
      console.error(
        "📍 Stack:",
        error instanceof Error ? error.stack : "No stack"
      );
      throw error;
    }
  },

  // Parse Mermaid code and add resulting elements to the canvas
  addMermaidDiagram: async (diagramDefinition: string) => {
    console.log("🏪 CANVAS STORE: addMermaidDiagram called");
    console.log("📋 Input diagram definition:", diagramDefinition);
    console.log(
      "📏 Diagram definition length:",
      diagramDefinition?.length || 0
    );

    try {
      console.log("🔍 Getting Mermaid parser...");
      const parseMermaid = await getParseMermaidToExcalidraw();
      console.log(
        "🔧 Parser result:",
        parseMermaid ? "✅ Available" : "❌ Not available"
      );

      if (!parseMermaid) {
        console.warn("⚠️ Mermaid parser unavailable in this environment");
        return;
      }

      // Choose a sensible default font size
      const DEFAULT_FONT_SIZE = 32;

      console.log(
        "📐 Parsing Mermaid diagram with fontSize:",
        DEFAULT_FONT_SIZE
      );
      console.log("🔤 Mermaid code to parse:\n", diagramDefinition);

      const parseResult = await parseMermaid(diagramDefinition, {
        fontSize: DEFAULT_FONT_SIZE,
      });

      console.log("🎯 Parse result:", parseResult);
      console.log("📊 Elements received:", parseResult.elements?.length || 0);

      if (parseResult.elements) {
        console.log("🔍 First few elements:", parseResult.elements.slice(0, 3));
      }

      const { elements } = parseResult;

      if (!elements || elements.length === 0) {
        console.warn("⚠️ No elements generated from Mermaid parsing");
        return;
      }

      console.log(
        "📦 Adding",
        elements.length,
        "elements to canvas via addElementsSkeleton..."
      );

      // Elements are skeletons; reuse existing pipeline
      await get().addElementsSkeleton(elements as ExcalidrawElementSkeleton[]);

      console.log("✅ Mermaid diagram successfully added to canvas");
    } catch (error) {
      console.error("❌ Failed to add Mermaid diagram:", error);
      console.error(
        "📍 Error stack:",
        error instanceof Error ? error.stack : "No stack available"
      );
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

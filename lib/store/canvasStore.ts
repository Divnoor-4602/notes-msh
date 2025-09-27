import { create } from "zustand";
// Removed extractCanvasContext - using mermaid code as source of truth

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
  isGeneratingMermaid: boolean;
  lastSyncedElements: ExcalidrawElement[]; // Track last synced state for meaningful change detection
  currentMermaidCode: string | null; // Store the latest Mermaid code from voice agent
  mermaidGenerationTimeout: NodeJS.Timeout | null; // Track debounce timeout

  // Actions for API management
  setExcalidrawAPI: (api: ExcalidrawAPI) => void;

  // Actions for element management - using skeleton approach (now async)
  addElementSkeleton: (skeleton: ExcalidrawElementSkeleton) => Promise<void>;
  addElementsSkeleton: (skeletons: ExcalidrawElementSkeleton[]) => Promise<void>;
  addMermaidDiagram: (diagramDefinition: string) => Promise<void>;
  updateElements: (elements: ExcalidrawElement[]) => void;
  syncFromExcalidraw: (elements: ExcalidrawElement[]) => void;
  syncFromExcalidrawWithMermaidGeneration: (elements: ExcalidrawElement[]) => void;
  generateMermaidFromCanvas: () => Promise<void>;
  syncToExcalidraw: () => void;

  // Utility actions
  clearCanvas: () => void;
  getElementById: (id: string) => ExcalidrawElement | undefined;
  getCurrentMermaidCode: () => string | null;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  // Initial state
  excalidrawAPI: null,
  elements: [],
  isProcessingDiagram: false,
  isGeneratingMermaid: false,
  lastSyncedElements: [],
  currentMermaidCode: null,
  mermaidGenerationTimeout: null,

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

          // Use converted elements directly (no ID remapping needed)
          const remappedElements = convertedElements;

          // Ensure unique IDs by checking against existing elements
          const existingIds = new Set(state.elements.map((el: any) => el.id));
          const uniqueRemappedElements = remappedElements.map((el: any) => {
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

        // Use converted elements directly (no ID remapping needed)
        const remappedElements = convertedElements;

        // Ensure unique IDs by checking against existing elements
        const existingIds = new Set(state.elements.map((el: any) => el.id));
        const uniqueRemappedElements = remappedElements.map((el: any) => {
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
    // Check if we're already processing a diagram or generating Mermaid
    const state = get();
    if (state.isProcessingDiagram || state.isGeneratingMermaid) {
      console.log("Skipping diagram processing - Mermaid generation or diagram processing in progress");
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

      // Check if there are existing elements by looking at current mermaid code
      const currentMermaidCode = get().currentMermaidCode;
      hasExistingElements = currentMermaidCode !== null && currentMermaidCode.length > 0;

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

      // Store the Mermaid code as the current source of truth
      set({ currentMermaidCode: diagramDefinition });
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
      if (error instanceof Error && error.message.includes("has already been registered")) {
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

  syncFromExcalidrawWithMermaidGeneration: (elements: ExcalidrawElement[]) => {
    const currentState = get();

    // Check if this is a meaningful change (not just canvas movement)
    const hasElementCountChanged = elements.length !== currentState.lastSyncedElements.length;
    const hasElementsChanged =
      hasElementCountChanged ||
      elements.some((el, index) => {
        const lastEl = currentState.lastSyncedElements[index];
        return !lastEl || el.id !== lastEl.id || JSON.stringify(el) !== JSON.stringify(lastEl);
      });

    // Only proceed if there are meaningful changes
    if (!hasElementsChanged) {
      return;
    }

    console.log("🎨 Meaningful canvas change detected:", {
      elementCount: elements.length,
      elementTypes: elements.map((el) => el.type),
      previousCount: currentState.lastSyncedElements.length,
    });

    // Update the canvas state
    set({
      elements: [...elements],
      lastSyncedElements: [...elements],
    });

    // Skip Mermaid generation for empty canvas or if already processing
    if (elements.length === 0 || currentState.isProcessingDiagram || currentState.isGeneratingMermaid) {
      console.log("⏸️ Skipping Mermaid generation:", {
        isEmpty: elements.length === 0,
        isProcessingDiagram: currentState.isProcessingDiagram,
        isGeneratingMermaid: currentState.isGeneratingMermaid,
      });
      return;
    }

    // Clear existing timeout to implement debouncing
    if (currentState.mermaidGenerationTimeout) {
      clearTimeout(currentState.mermaidGenerationTimeout);
      console.log("⏰ Previous Mermaid generation cancelled - new changes detected");
    }

    // Trigger Mermaid generation after a delay (debounced)
    const timeoutId = setTimeout(() => {
      const latestState = get();
      if (!latestState.isProcessingDiagram && !latestState.isGeneratingMermaid) {
        console.log("🔄 Triggering Mermaid generation for meaningful changes");
        latestState.generateMermaidFromCanvas();
      }
      // Clear the timeout reference
      set({ mermaidGenerationTimeout: null });
    }, 4000); // 4 second debounce

    // Store the timeout reference
    set({ mermaidGenerationTimeout: timeoutId });
  },

  // Generate Mermaid code from current canvas state
  generateMermaidFromCanvas: async () => {
    const state = get();

    // Check if voice agent is processing or already generating Mermaid
    if (state.isProcessingDiagram || state.isGeneratingMermaid) {
      console.log("Skipping Mermaid generation - diagram processing or Mermaid generation in progress");
      return;
    }

    // Set generating flag
    set({ isGeneratingMermaid: true });

    try {
      const { generateMermaidFromCanvas } = await import("@/lib/agent/mermaidAgent/utils");

      const response = await generateMermaidFromCanvas(state.elements, state.currentMermaidCode);

      if (response.success && response.mermaidCode) {
        set({ currentMermaidCode: response.mermaidCode });
        console.log("✅ Mermaid code updated from manual changes:");
        console.log("📋 Generated Mermaid Code:");
        console.log(response.mermaidCode);
        console.log("📊 Canvas Stats:", (response as any).canvasStats || "N/A");
      } else {
        console.error("❌ Failed to generate Mermaid code:", response.error);
        if (response.validationErrors) {
          console.warn("⚠️ Validation errors:", response.validationErrors);
        }
      }
    } catch (error) {
      console.error("❌ Error generating Mermaid code:", error);
    } finally {
      set({ isGeneratingMermaid: false });
    }
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

  getCurrentMermaidCode: () => {
    const { currentMermaidCode } = get();
    return currentMermaidCode;
  },
}));

export const getCanvasStore = () => useCanvasStore.getState();

// Expose generateMermaidFromCanvas globally for testing
if (typeof window !== "undefined") {
  (window as any).generateMermaidFromCanvas = () => {
    console.log("🧪 Testing Mermaid generation...");
    useCanvasStore.getState().generateMermaidFromCanvas();
  };
}

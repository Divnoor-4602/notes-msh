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
type ConvertFn = (skeletons: unknown[]) => ExcalidrawElement[];
type ParseMermaidFn = (
  definition: string,
  config?: unknown
) => Promise<{ elements: ExcalidrawElementSkeleton[] }>;
let convertToExcalidrawElements: ConvertFn | null = null;
let parseMermaidToExcalidraw: ParseMermaidFn | null = null;

const getConvertToExcalidrawElements = async () => {
  if (typeof window === "undefined") {
    // Server-side rendering, return a no-op function
    return (skeletons: ExcalidrawElementSkeleton[]) =>
      skeletons as unknown as ExcalidrawElement[];
  }

  if (!convertToExcalidrawElements) {
    const excalidrawModule = await import("@excalidraw/excalidraw");
    convertToExcalidrawElements =
      excalidrawModule.convertToExcalidrawElements as unknown as ConvertFn;
  }

  return convertToExcalidrawElements;
};

const getParseMermaidToExcalidraw = async () => {
  if (typeof window === "undefined") {
    return null;
  }

  if (!parseMermaidToExcalidraw) {
    const mermaidModule = await import("@excalidraw/mermaid-to-excalidraw");
    parseMermaidToExcalidraw =
      mermaidModule.parseMermaidToExcalidraw as unknown as ParseMermaidFn;
  }

  return parseMermaidToExcalidraw;
};

interface CanvasState {
  // Core state
  excalidrawAPI: ExcalidrawAPI | null;
  elements: ExcalidrawElement[];
  isProcessingDiagram: boolean;
  isGeneratingMermaid: boolean;
  isRemappingElements: boolean; // For compatibility with tests
  lastSyncedElements: ExcalidrawElement[]; // Track last synced state for meaningful change detection
  currentMermaidCode: string | null; // Store the latest Mermaid code from voice agent
  mermaidGenerationTimeout: NodeJS.Timeout | null; // Track debounce timeout
  isLoadedFromDatabase: boolean; // Track if canvas was loaded from database to prevent immediate sync

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
  syncFromExcalidrawWithMermaidGeneration: (
    elements: ExcalidrawElement[]
  ) => void;
  syncFromExcalidrawWithRemapping: (elements: ExcalidrawElement[]) => void;
  generateMermaidFromCanvas: () => Promise<void>;
  syncToExcalidraw: () => void;

  // Database loading methods (no Mermaid generation)
  loadFromDatabase: (
    mermaidCode: string,
    elements: ExcalidrawElement[]
  ) => void;
  loadElementsFromDatabase: (elements: ExcalidrawElement[]) => void;

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
  isRemappingElements: false,
  lastSyncedElements: [],
  currentMermaidCode: null,
  mermaidGenerationTimeout: null,
  isLoadedFromDatabase: false,

  setExcalidrawAPI: (api: ExcalidrawAPI) => {
    set({ excalidrawAPI: api });
  },

  // Database loading methods (no Mermaid generation)
  loadFromDatabase: (mermaidCode: string, elements: ExcalidrawElement[]) => {
    set((state) => {
      // Update Excalidraw canvas if API is available
      if (state.excalidrawAPI) {
        state.excalidrawAPI.updateScene({
          elements,
        });
      }

      return {
        elements,
        currentMermaidCode: mermaidCode,
        lastSyncedElements: [...elements], // Track as synced to prevent false change detection
        isLoadedFromDatabase: true, // Mark as loaded from database
      };
    });
  },

  loadElementsFromDatabase: (elements: ExcalidrawElement[]) => {
    set((state) => {
      // Update Excalidraw canvas if API is available
      if (state.excalidrawAPI) {
        state.excalidrawAPI.updateScene({
          elements,
        });
      }

      return {
        elements,
        lastSyncedElements: [...elements], // Track as synced to prevent false change detection
        isLoadedFromDatabase: true, // Mark as loaded from database
      };
    });
  },

  addElementSkeleton: async (skeleton: ExcalidrawElementSkeleton) => {
    try {
      const convert = await getConvertToExcalidrawElements();

      set((state) => {
        try {
          // Convert skeleton to full Excalidraw elements (shape + bound text)
          const convertedElements = convert([skeleton]);

          // Use converted elements directly (no ID remapping needed)
          const remappedElements = convertedElements;

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
        const convertedElements = convert(skeletons);

        // Use converted elements directly (no ID remapping needed)
        const remappedElements = convertedElements;

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
    // Check if we're already processing a diagram or generating Mermaid
    const state = get();
    if (state.isProcessingDiagram || state.isGeneratingMermaid) {
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
      hasExistingElements =
        currentMermaidCode !== null && currentMermaidCode.length > 0;

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
      console.error("Error processing Mermaid diagram:", error);

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

  syncFromExcalidrawWithMermaidGeneration: (elements: ExcalidrawElement[]) => {
    const currentState = get();

    // If canvas was just loaded from database, mark it as no longer loaded and skip initial sync
    if (currentState.isLoadedFromDatabase) {
      set({ isLoadedFromDatabase: false });
      return;
    }

    // Check if this is a meaningful change (not just canvas movement)
    const hasElementCountChanged =
      elements.length !== currentState.lastSyncedElements.length;
    const hasElementsChanged =
      hasElementCountChanged ||
      elements.some((el, index) => {
        const lastEl = currentState.lastSyncedElements[index];
        return (
          !lastEl ||
          el.id !== lastEl.id ||
          JSON.stringify(el) !== JSON.stringify(lastEl)
        );
      });

    // Only proceed if there are meaningful changes
    if (!hasElementsChanged) {
      return;
    }

    // meaningful change detected; state will be updated and generation may run

    // Update the canvas state
    set({
      elements: [...elements],
      lastSyncedElements: [...elements],
    });

    // Skip Mermaid generation for empty canvas or if already processing
    if (
      elements.length === 0 ||
      currentState.isProcessingDiagram ||
      currentState.isGeneratingMermaid
    ) {
      return;
    }

    // Clear existing timeout to implement debouncing
    if (currentState.mermaidGenerationTimeout) {
      clearTimeout(currentState.mermaidGenerationTimeout);
    }

    // Trigger Mermaid generation after a delay (debounced)
    const timeoutId = setTimeout(() => {
      const latestState = get();
      if (
        !latestState.isProcessingDiagram &&
        !latestState.isGeneratingMermaid
      ) {
        latestState.generateMermaidFromCanvas();
      }
      // Clear the timeout reference
      set({ mermaidGenerationTimeout: null });
    }, 4000); // 4 second debounce

    // Store the timeout reference
    set({ mermaidGenerationTimeout: timeoutId });
  },

  // Sync elements while indicating a remapping process; does not trigger Mermaid generation
  syncFromExcalidrawWithRemapping: (elements: ExcalidrawElement[]) => {
    set({ isRemappingElements: true });
    // Directly update state and last synced snapshot
    set({
      elements: [...elements],
      lastSyncedElements: [...elements],
    });
    // Update the Excalidraw canvas if available
    const { excalidrawAPI } = get();
    if (excalidrawAPI) {
      excalidrawAPI.updateScene({ elements });
    }
    // End remapping flag
    set({ isRemappingElements: false });
  },

  // Generate Mermaid code from current canvas state
  generateMermaidFromCanvas: async () => {
    const state = get();

    // Check if voice agent is processing or already generating Mermaid
    if (state.isProcessingDiagram || state.isGeneratingMermaid) {
      return;
    }

    // Set generating flag
    set({ isGeneratingMermaid: true });

    try {
      const { generateMermaidFromCanvas } = await import(
        "@/lib/agent/mermaidAgent/utils"
      );

      const response = await generateMermaidFromCanvas(
        state.elements,
        state.currentMermaidCode
      );

      if (response.success && response.mermaidCode) {
        set({ currentMermaidCode: response.mermaidCode });
      } else {
        if (response.validationErrors) {
          console.warn("Validation errors:", response.validationErrors);
        }
      }
    } catch (error) {
      console.error("Error generating Mermaid code:", error);
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
  (
    window as unknown as { generateMermaidFromCanvas: () => void }
  ).generateMermaidFromCanvas = () => {
    useCanvasStore.getState().generateMermaidFromCanvas();
  };
}

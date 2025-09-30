"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useRef } from "react";
import "@excalidraw/excalidraw/index.css";
import { useCanvasStore } from "@/lib/store/canvasStore";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawAPI = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawElement = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppState = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BinaryFiles = any;

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading Excalidraw...</div>
      </div>
    ),
  }
);

interface ExcalidrawCanvasProps {
  canEdit?: boolean;
}

export default function ExcalidrawCanvas({
  canEdit = true,
}: ExcalidrawCanvasProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [hasLoadedFromDatabase, setHasLoadedFromDatabase] = useState(false);
  const setExcalidrawAPI = useCanvasStore((state) => state.setExcalidrawAPI);
  const loadFromDatabase = useCanvasStore((state) => state.loadFromDatabase);
  const syncFromExcalidrawWithMermaidGeneration = useCanvasStore(
    (state) => state.syncFromExcalidrawWithMermaidGeneration
  );

  // Get current user
  const currentUser = useQuery(api.auth.getCurrentUser);
  const userId = currentUser?._id;

  // Load canvas data from database
  const canvasData = useQuery(
    api.canvas.getCanvasByUserId,
    userId ? { userId } : "skip"
  );

  // Mutation for updating canvas
  const updateCanvas = useMutation(api.canvas.updateCanvas);

  // Store state for persistence
  const elements = useCanvasStore((state) => state.elements);
  const mermaidCode = useCanvasStore((state) => state.getCurrentMermaidCode());
  const isGenerating = useCanvasStore((state) => state.isGeneratingMermaid);
  const isProcessing = useCanvasStore((state) => state.isProcessingDiagram);

  // Track last persisted content to avoid redundant writes
  const lastPersistRef = useRef<{
    elementsString: string;
    mermaidCode: string | null;
  } | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load canvas data when it's available and we haven't loaded it yet
  useEffect(() => {
    if (canvasData && !hasLoadedFromDatabase && isMounted) {
      try {
        // Parse the elements string back to array
        const elements = JSON.parse(canvasData.elements);
        const mermaidCode = canvasData.mermaidCode || "";

        // Load the data into the canvas store
        loadFromDatabase(mermaidCode, elements);
        setHasLoadedFromDatabase(true);
      } catch (error) {
        console.error("Error parsing canvas elements from database:", error);
        toast.error("Failed to load your canvas from the database.");
        // Fallback to empty canvas
        loadFromDatabase("", []);
        setHasLoadedFromDatabase(true);
      }
    }
  }, [canvasData, hasLoadedFromDatabase, isMounted, loadFromDatabase]);

  // Persist canvas changes to database
  useEffect(() => {
    // Requirements to attempt persistence:
    // - We have a canvasId
    // - Not during generation/processing
    // - We already loaded from DB to avoid first-write echo
    if (!canvasData?._id) return;
    if (isGenerating || isProcessing) return;
    if (!hasLoadedFromDatabase) return;

    // Filter out deleted elements before serializing
    const activeElements = elements.filter((el) => !el.isDeleted);
    const elementsString = JSON.stringify(activeElements);

    // Avoid redundant writes
    const last = lastPersistRef.current;
    if (
      last &&
      last.elementsString === elementsString &&
      last.mermaidCode === mermaidCode
    ) {
      return;
    }

    // Don't write completely empty state
    if (activeElements.length === 0 && !mermaidCode) return;

    updateCanvas({
      canvasId: canvasData._id,
      elements: elementsString,
      mermaidCode: mermaidCode ?? "",
    })
      .then((result) => {
        console.log("Canvas persisted:", {
          success: result.success,
          updatedFields: result.updatedFields,
          elementCount: result.elementCount,
          hasMermaidCode: result.hasMermaidCode,
          lastModified: new Date(result.lastModified).toISOString(),
        });
      })
      .catch((error) => {
        console.error("Failed to persist canvas:", error);
        toast.error("Failed to save changes to the canvas.");
      });

    lastPersistRef.current = { elementsString, mermaidCode };
  }, [
    canvasData?._id,
    elements,
    mermaidCode,
    isGenerating,
    isProcessing,
    hasLoadedFromDatabase,
    updateCanvas,
  ]);

  const handleExcalidrawAPI = async (api: ExcalidrawAPI) => {
    setExcalidrawAPI(api);
  };

  const handleChange = (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles
  ) => {
    void appState; // Suppress unused variable warning
    void files; // Suppress unused variable warning

    // Sync canvas state and detect meaningful changes
    // This will handle Mermaid generation internally if there are meaningful changes
    syncFromExcalidrawWithMermaidGeneration([...elements]);
  };

  // Don't render until mounted on client side
  if (!isMounted) {
    return (
      <div
        style={{ height: "100vh", width: "100%" }}
        className="flex items-center justify-center"
      >
        <div className="text-gray-500">Loading Excalidraw...</div>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <Excalidraw
        excalidrawAPI={handleExcalidrawAPI}
        onChange={handleChange}
        viewModeEnabled={!canEdit}
      ></Excalidraw>
    </div>
  );
}

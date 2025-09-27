"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import "@excalidraw/excalidraw/index.css";
import { useCanvasStore } from "@/lib/store/canvasStore";

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

export default function ExcalidrawCanvas() {
  const [isMounted, setIsMounted] = useState(false);
  const setExcalidrawAPI = useCanvasStore((state) => state.setExcalidrawAPI);
  const syncFromExcalidrawWithMermaidGeneration = useCanvasStore(
    (state) => state.syncFromExcalidrawWithMermaidGeneration
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
      <Excalidraw excalidrawAPI={handleExcalidrawAPI} onChange={handleChange} />
    </div>
  );
}

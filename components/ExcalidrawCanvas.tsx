"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import "@excalidraw/excalidraw/index.css";
import { useCanvasStore } from "@/lib/store/canvasStore";

type ExcalidrawAPI = any;
type ExcalidrawElement = any;
type AppState = any;
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
  const syncFromExcalidrawWithRemapping = useCanvasStore(
    (state) => state.syncFromExcalidrawWithRemapping
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
    // Use remapping to give manual elements semantic IDs
    syncFromExcalidrawWithRemapping([...elements]);
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

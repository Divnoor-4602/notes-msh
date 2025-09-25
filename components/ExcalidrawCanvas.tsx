"use client";

import dynamic from "next/dynamic";
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
  }
);

export default function ExcalidrawCanvas() {
  const setExcalidrawAPI = useCanvasStore((state) => state.setExcalidrawAPI);
  const syncFromExcalidrawWithRemapping = useCanvasStore(
    (state) => state.syncFromExcalidrawWithRemapping
  );

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

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <Excalidraw excalidrawAPI={handleExcalidrawAPI} onChange={handleChange} />
    </div>
  );
}

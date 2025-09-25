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
  const syncFromExcalidraw = useCanvasStore(
    (state) => state.syncFromExcalidraw
  );

  const handleExcalidrawAPI = async (api: ExcalidrawAPI) => {
    setExcalidrawAPI(api);
  };

  const handleChange = (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles
  ) => {
    syncFromExcalidraw([...elements]);
  };

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <Excalidraw excalidrawAPI={handleExcalidrawAPI} onChange={handleChange} />
    </div>
  );
}

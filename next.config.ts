import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@excalidraw/excalidraw"],
  // Note: webpack config removed as it's not compatible with Turbopack
  // The client-side only rendering in ExcalidrawCanvas should handle the SSR issues
};

export default nextConfig;

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { getConvexUrl } from "@convex-dev/static-hosting";
import App from "./App";
import "./index.css";

// When served from Convex static hosting the backend URL is derivable from the
// .convex.site hostname, so no build-time env var is required in production.
const convexUrl = import.meta.env.VITE_CONVEX_URL ?? getConvexUrl();
const convex = new ConvexReactClient(convexUrl);

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </StrictMode>
);

import { useRef, useCallback, useState } from "react";
import { generateMermaidFromCanvas } from "@/lib/agent/mermaidAgent/utils";

interface MermaidProcessorData {
  elements: unknown[];
  currentMermaidCode: string | null;
}

interface ProcessorOptions {
  debounceMs?: number;
  cooldownMs?: number;
}

/**
 * Hook for processing manual canvas changes to generate updated Mermaid code
 * Debounced processor for canvas element changes that generates Mermaid code
 */
export function useMermaidCodeProcessor(
  processor: (data: MermaidProcessorData) => Promise<void>,
  options: ProcessorOptions = {}
) {
  // Base debounce 4000ms for manual edits; adaptive based on server latency
  const { debounceMs = 4000, cooldownMs = 0 } = options;

  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Store the latest data
  const latestDataRef = useRef<MermaidProcessorData | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedAtRef = useRef<number>(0);
  const lastDurationMsRef = useRef<number>(0);
  const adaptiveDebounceMsRef = useRef<number>(debounceMs);
  const processingIdRef = useRef<number>(0);

  const processLatest = useCallback(async () => {
    if (!latestDataRef.current || isProcessing) {
      return;
    }

    // Check cooldown
    const now = Date.now();
    const timeSinceLastProcess = now - lastProcessedAtRef.current;
    if (timeSinceLastProcess < cooldownMs) {
      return;
    }

    // Get the latest data and clear it
    const dataToProcess = latestDataRef.current;
    latestDataRef.current = null;
    setPendingCount(0);

    // Generate processing ID to handle race conditions
    const currentProcessingId = ++processingIdRef.current;

    setIsProcessing(true);

    try {
      const startedAt = Date.now();
      console.log("🚀 Starting Mermaid generation...", {
        processingId: currentProcessingId,
        elementCount: dataToProcess.elements.length,
      });

      await processor(dataToProcess);

      const finishedAt = Date.now();
      lastDurationMsRef.current = finishedAt - startedAt;

      console.log("⚡ Mermaid generation completed:", {
        processingId: currentProcessingId,
        durationMs: lastDurationMsRef.current,
        nextDebounceMs: adaptiveDebounceMsRef.current,
      });

      // Adaptive backoff: if last request took > 8s, bump debounce up to 6000ms next time.
      // If fast (< 3000ms), relax back towards 4000ms.
      if (lastDurationMsRef.current > 8000) {
        adaptiveDebounceMsRef.current = 6000;
        console.log("🐌 Slow response detected, increasing debounce to 6000ms");
      } else if (lastDurationMsRef.current < 3000) {
        adaptiveDebounceMsRef.current = 4000;
        console.log("🚀 Fast response detected, resetting debounce to 4000ms");
      }

      // Only update timestamp if this is still the latest processing
      if (currentProcessingId === processingIdRef.current) {
        lastProcessedAtRef.current = Date.now();
      }
    } catch (error) {
      console.error(
        `❌ Mermaid processing failed (ID: ${currentProcessingId}):`,
        error
      );
    } finally {
      // Only clear processing flag if this is still the latest processing
      if (currentProcessingId === processingIdRef.current) {
        setIsProcessing(false);
      }
    }
  }, [processor, cooldownMs, isProcessing]);

  const enqueue = useCallback(
    (data: MermaidProcessorData) => {
      // Always replace with the latest data
      latestDataRef.current = data;
      setPendingCount((prev) => prev + 1);

      console.log("🔄 Mermaid generation enqueued:", {
        elementCount: data.elements.length,
        pendingCount: pendingCount + 1,
        debounceMs: adaptiveDebounceMsRef.current,
      });

      // Clear existing debounce timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        console.log(
          "⏰ Previous Mermaid generation cancelled - new changes detected"
        );
      }

      // Set new debounce timeout (adaptive)
      const waitMs = adaptiveDebounceMsRef.current;
      debounceTimeoutRef.current = setTimeout(() => {
        console.log("⚡ Starting Mermaid generation after debounce");
        processLatest();
      }, waitMs);
    },
    [processLatest, pendingCount]
  );

  const clear = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    latestDataRef.current = null;
    setPendingCount(0);
  }, []);

  const forceProcess = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    processLatest();
  }, [processLatest]);

  return {
    enqueue,
    clear,
    forceProcess,
    isProcessing,
    pendingCount,
    hasLatest: !!latestDataRef.current,
  };
}

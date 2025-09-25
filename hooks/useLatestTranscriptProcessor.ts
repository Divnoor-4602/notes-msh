import { useRef, useCallback, useState } from "react";

interface TranscriptData {
  transcript: string;
  currentChunk: string;
  recentContext: string;
}

interface ProcessorOptions {
  debounceMs?: number;
  cooldownMs?: number;
}

/**
 * Hook for processing only the latest transcript, discarding intermediate ones
 * Perfect for cumulative transcript processing where only the final result matters
 */
export function useLatestTranscriptProcessor(
  processor: (data: TranscriptData) => Promise<void>,
  options: ProcessorOptions = {}
) {
  // Base debounce 1000ms; we adapt this based on previous server latency
  const { debounceMs = 1000, cooldownMs = 0 } = options;

  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Store the latest transcript data
  const latestDataRef = useRef<TranscriptData | null>(null);
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
      console.log(
        `⏳ Cooldown active, waiting ${cooldownMs - timeSinceLastProcess}ms`
      );
      return;
    }

    // Get the latest data and clear it
    const dataToProcess = latestDataRef.current;
    latestDataRef.current = null;
    setPendingCount(0);

    // Generate processing ID to handle race conditions
    const currentProcessingId = ++processingIdRef.current;

    setIsProcessing(true);
    console.log(
      `🔒 Processing latest transcript (ID: ${currentProcessingId}):`,
      dataToProcess.transcript
    );

    try {
      const startedAt = Date.now();
      await processor(dataToProcess);
      const finishedAt = Date.now();
      lastDurationMsRef.current = finishedAt - startedAt;

      // Adaptive backoff: if last request took > 5s, bump debounce up to 2000ms next time.
      // If fast (< 2000ms), relax back towards 1000ms.
      if (lastDurationMsRef.current > 5000) {
        adaptiveDebounceMsRef.current = 2000;
      } else if (lastDurationMsRef.current < 2000) {
        adaptiveDebounceMsRef.current = 1000;
      }

      // Only update timestamp if this is still the latest processing
      if (currentProcessingId === processingIdRef.current) {
        lastProcessedAtRef.current = Date.now();
        console.log(`✅ Processing completed (ID: ${currentProcessingId})`);
      } else {
        console.log(
          `⚠️ Processing outdated (ID: ${currentProcessingId}), newer processing in progress`
        );
      }
    } catch (error) {
      console.error(
        `❌ Processing failed (ID: ${currentProcessingId}):`,
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
    (data: TranscriptData) => {
      // Always replace with the latest data
      latestDataRef.current = data;
      setPendingCount((prev) => prev + 1);

      console.log(
        `📝 Transcript queued: "${data.transcript}" (Pending: ${
          pendingCount + 1
        })`
      );

      // Clear existing debounce timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Set new debounce timeout (adaptive)
      const waitMs = adaptiveDebounceMsRef.current;
      debounceTimeoutRef.current = setTimeout(() => {
        console.log(
          `⏰ Debounce timeout reached, processing latest transcript`
        );
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
    console.log(`🧹 Transcript queue cleared`);
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

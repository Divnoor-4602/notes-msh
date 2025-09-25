"use client";

import { useCallback, useRef, useState } from "react";
import { RealtimeSession, OpenAIRealtimeWebRTC } from "@openai/agents/realtime";
import { createListeningAgent } from "../lib/agent/listeningAgent";
import { TranscriptAccumulator } from "../lib/utils/transcript";
import { useLatestTranscriptProcessor } from "./useLatestTranscriptProcessor";

export type SessionStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED";

export interface TranscriptionEvent {
  type: "transcription";
  text: string;
  timestamp: number;
}

export interface ConnectOptions {
  getEphemeralKey: () => Promise<string>;
  onTranscription?: (event: TranscriptionEvent) => void;
}

export function useRealtimeSession() {
  const sessionRef = useRef<RealtimeSession | null>(null);
  const [status, setStatus] = useState<SessionStatus>("DISCONNECTED");
  const onTranscriptionRef = useRef<
    ((event: TranscriptionEvent) => void) | null
  >(null);
  const transcriptAccumulatorRef = useRef<TranscriptAccumulator | null>(null);
  // Remove old refs - now handled by useLatestTranscriptProcessor

  const updateStatus = useCallback((s: SessionStatus) => {
    setStatus(s);
  }, []);

  // Latest transcript processor - only processes the most recent transcript
  const transcriptProcessor = useLatestTranscriptProcessor(
    async ({ transcript, currentChunk, recentContext }) => {
      if (sessionRef.current) {
        sessionRef.current.transport.sendEvent({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Current: ${currentChunk}${
                  recentContext ? `\nContext: ${recentContext}` : ""
                }`,
              },
            ],
          },
        });

        // Ask the agent to produce a response
        sessionRef.current.transport.sendEvent({
          type: "response.create",
        });
      }
    },
    {
      debounceMs: 1000, // Base 1s; adaptive backoff inside hook
      cooldownMs: 0, // Rely on single-flight gating instead of fixed cooldown
    }
  );

  const handleTransportEvent = useCallback(
    (event: any) => {
      // Handle transcription events
      switch (event.type) {
        case "conversation.item.input_audio_transcription.completed": {
          // Add transcript to accumulator
          if (transcriptAccumulatorRef.current && event.transcript) {
            transcriptAccumulatorRef.current.addChunk(
              event.transcript,
              Date.now()
            );
          }

          if (onTranscriptionRef.current && event.transcript) {
            onTranscriptionRef.current({
              type: "transcription",
              text: event.transcript,
              timestamp: Date.now(),
            });
          }

          // Queue the transcript for processing (only latest will be processed)
          if (
            sessionRef.current &&
            event.transcript &&
            transcriptAccumulatorRef.current
          ) {
            const currentChunk =
              transcriptAccumulatorRef.current.getCurrentChunk();
            const recentContext =
              transcriptAccumulatorRef.current.getRecentContext();

            // Enqueue the latest transcript (discards previous ones)
            transcriptProcessor.enqueue({
              transcript: event.transcript,
              currentChunk,
              recentContext,
            });
          }
          break;
        }
      }
    },
    [transcriptProcessor]
  );

  const connect = useCallback(
    async ({ getEphemeralKey, onTranscription }: ConnectOptions) => {
      if (sessionRef.current) return; // already connected

      updateStatus("CONNECTING");
      onTranscriptionRef.current = onTranscription || null;

      try {
        const ephemeralKey = await getEphemeralKey();

        // Initialize transcript accumulator
        transcriptAccumulatorRef.current = new TranscriptAccumulator(10, 30000);

        // Create the listening agent with tools
        const agent = createListeningAgent();

        sessionRef.current = new RealtimeSession(agent, {
          transport: new OpenAIRealtimeWebRTC({
            // Enable both input and output audio
          }),
          model: "gpt-4o-mini-realtime-preview-2024-12-17",
          config: {
            inputAudioFormat: "pcm16",
            outputAudioFormat: "pcm16",
            inputAudioTranscription: {
              model: "gpt-4o-mini-transcribe",
            },
            turnDetection: {
              type: "server_vad",
              threshold: 0.5,
              prefixPaddingMs: 300,
              silenceDurationMs: 500,
            },
          },
        });

        // Set up event handlers
        sessionRef.current.on("transport_event", handleTransportEvent);

        await sessionRef.current.connect({ apiKey: ephemeralKey });
        updateStatus("CONNECTED");
      } catch (error) {
        console.error("Failed to connect:", error);
        updateStatus("DISCONNECTED");
        throw error;
      }
    },
    [updateStatus, handleTransportEvent]
  );

  const disconnect = useCallback(() => {
    // Clear any pending transcript processing
    transcriptProcessor.clear();

    sessionRef.current?.close();
    sessionRef.current = null;
    onTranscriptionRef.current = null;
    transcriptAccumulatorRef.current?.clear();
    transcriptAccumulatorRef.current = null;
    updateStatus("DISCONNECTED");
  }, [updateStatus, transcriptProcessor]);

  const sendEvent = useCallback((event: any) => {
    sessionRef.current?.transport.sendEvent(event);
  }, []);

  const pushToTalkStart = useCallback(() => {
    if (!sessionRef.current) return;
    sessionRef.current.transport.sendEvent({
      type: "input_audio_buffer.clear",
    });
  }, []);

  const pushToTalkStop = useCallback(() => {
    if (!sessionRef.current) return;
    sessionRef.current.transport.sendEvent({
      type: "input_audio_buffer.commit",
    });
  }, []);

  return {
    status,
    connect,
    disconnect,
    sendEvent,
    pushToTalkStart,
    pushToTalkStop,
    // Transcript processor state for debugging
    isProcessingTranscript: transcriptProcessor.isProcessing,
    pendingTranscriptCount: transcriptProcessor.pendingCount,
  } as const;
}

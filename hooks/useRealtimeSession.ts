"use client";

import { useCallback, useRef, useState } from "react";
import { RealtimeSession, OpenAIRealtimeWebRTC } from "@openai/agents/realtime";
import { createListeningAgent } from "../lib/agent/listeningAgent";
import { TranscriptAccumulator } from "../lib/utils/transcript";
// Removed useLatestTranscriptProcessor - agent now decides when to respond

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
  const onTranscriptionRef = useRef<((event: TranscriptionEvent) => void) | null>(null);
  const transcriptAccumulatorRef = useRef<TranscriptAccumulator | null>(null);
  // Transcript accumulation for debugging/reference

  const updateStatus = useCallback((s: SessionStatus) => {
    setStatus(s);
  }, []);

  // No auto-triggering processor - agent decides when to respond
  // Just accumulate transcripts and let agent make intelligent decisions

  const handleTransportEvent = useCallback((event: any) => {
    // Handle transcription events
    switch (event.type) {
      case "conversation.item.input_audio_transcription.completed": {
        // Console log the GPT-4o transcription output
        console.log("🎤 GPT-4o Transcription Event:", {
          type: event.type,
          transcript: event.transcript,
          timestamp: new Date().toISOString(),
          rawEvent: event,
        });

        // Add transcript to accumulator
        if (transcriptAccumulatorRef.current && event.transcript) {
          transcriptAccumulatorRef.current.addChunk(event.transcript, Date.now());
          console.log("📝 Added to accumulator:", event.transcript);
          console.log("📊 Accumulator state:", transcriptAccumulatorRef.current.getDebugInfo());
        }

        if (onTranscriptionRef.current && event.transcript) {
          onTranscriptionRef.current({
            type: "transcription",
            text: event.transcript,
            timestamp: Date.now(),
          });
          console.log("🔔 Fired transcription callback with:", event.transcript);
        }

        // DO NOT send transcript as separate message - it's already handled by transcription
        // The server automatically includes transcribed audio in the conversation

        // Optionally trigger response when agent should respond
        // For now, let the agent decide via turn detection or we can add logic later
        break;
      }
      default:
        // Log other transport events for debugging
        if (event.type && event.type.includes("transcription")) {
          console.log("🎵 Other transcription event:", event.type, event);
        }
    }
  }, []);

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

        const sessionConfig = {
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
        };

        console.log("🔧 Creating RealtimeSession with config:", {
          model: sessionConfig.model,
          transcriptionModel: sessionConfig.config.inputAudioTranscription.model,
          vadThreshold: sessionConfig.config.turnDetection.threshold,
          silenceDurationMs: sessionConfig.config.turnDetection.silenceDurationMs,
        });

        sessionRef.current = new RealtimeSession(agent, sessionConfig);

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
    sessionRef.current?.close();
    sessionRef.current = null;
    onTranscriptionRef.current = null;
    transcriptAccumulatorRef.current?.clear();
    transcriptAccumulatorRef.current = null;
    updateStatus("DISCONNECTED");
  }, [updateStatus]);

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
    // Transcript accumulator for debugging
    transcriptDebugInfo: transcriptAccumulatorRef.current?.getDebugInfo(),
  } as const;
}

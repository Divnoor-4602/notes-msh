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

export type TranscriptionStatus = "idle" | "listening" | "processing";

export interface ConnectOptions {
  getEphemeralKey: () => Promise<string>;
  onTranscription?: (event: TranscriptionEvent) => void;
}

export function useRealtimeSession() {
  const sessionRef = useRef<RealtimeSession | null>(null);
  const [status, setStatus] = useState<SessionStatus>("DISCONNECTED");
  const [transcriptionStatus, setTranscriptionStatus] =
    useState<TranscriptionStatus>("idle");
  const onTranscriptionRef = useRef<
    ((event: TranscriptionEvent) => void) | null
  >(null);
  const transcriptAccumulatorRef = useRef<TranscriptAccumulator | null>(null);

  const updateStatus = useCallback((s: SessionStatus) => {
    setStatus(s);
  }, []);

  const handleTransportEvent = useCallback((event: any) => {
    // Handle WebRTC speech detection events
    switch (event.type) {
      case "input_audio_buffer.speech_started": {
        // User started speaking
        setTranscriptionStatus("listening");
        break;
      }
      case "input_audio_buffer.speech_stopped": {
        // User stopped speaking, AI will start processing
        setTranscriptionStatus("processing");
        break;
      }
      case "conversation.item.input_audio_transcription.completed": {
        // Transcription process completed
        setTranscriptionStatus("idle");

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

        break;
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
          model: "gpt-realtime-2025-08-28",
          config: {
            inputAudioFormat: "pcm16",
            outputAudioFormat: "pcm16",
            inputAudioTranscription: {
              model: "gpt-4o-transcribe",
            },
            turnDetection: {
              type: "server_vad",
              threshold: 0.5,
              prefixPaddingMs: 300,
              silenceDurationMs: 500,
            },
          },
        };

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
    setTranscriptionStatus("idle");
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
    transcriptionStatus,
    connect,
    disconnect,
    sendEvent,
    pushToTalkStart,
    pushToTalkStop,
    transcriptDebugInfo: transcriptAccumulatorRef.current?.getDebugInfo(),
  } as const;
}

"use client";

import { useCallback, useRef, useState } from "react";
import {
  RealtimeSession,
  RealtimeAgent,
  OpenAIRealtimeWebRTC,
} from "@openai/agents/realtime";

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

  const updateStatus = useCallback((s: SessionStatus) => {
    setStatus(s);
  }, []);

  const handleTransportEvent = useCallback((event: any) => {
    // Handle transcription events
    switch (event.type) {
      case "conversation.item.input_audio_transcription.completed": {
        if (onTranscriptionRef.current && event.transcript) {
          onTranscriptionRef.current({
            type: "transcription",
            text: event.transcript,
            timestamp: Date.now(),
          });
        }
        break;
      }
      default:
        // Log other events for debugging
        console.log("Transport event:", event.type, event);
        break;
    }
  }, []);

  const connect = useCallback(
    async ({ getEphemeralKey, onTranscription }: ConnectOptions) => {
      if (sessionRef.current) return; // already connected

      updateStatus("CONNECTING");
      onTranscriptionRef.current = onTranscription || null;

      try {
        const ephemeralKey = await getEphemeralKey();

        // Create a simple agent for transcription only (no responses)
        const agent = new RealtimeAgent({
          name: "transcription_agent",
          instructions:
            "You are a transcription agent. Only listen and transcribe audio input. Do not generate responses.",
        });

        sessionRef.current = new RealtimeSession(agent, {
          transport: new OpenAIRealtimeWebRTC({
            // No audio element needed for input-only
          }),
          model: "gpt-realtime",
          config: {
            inputAudioFormat: "pcm16",
            // Remove output audio format since we don't need audio output
            inputAudioTranscription: {
              model: "gpt-4o-mini-transcribe",
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
    sessionRef.current?.close();
    sessionRef.current = null;
    onTranscriptionRef.current = null;
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
    // Don't create response since we only want transcription
  }, []);

  return {
    status,
    connect,
    disconnect,
    sendEvent,
    pushToTalkStart,
    pushToTalkStop,
  } as const;
}

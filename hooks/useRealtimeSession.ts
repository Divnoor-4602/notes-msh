"use client";

import { useCallback, useRef, useState } from "react";
import { RealtimeSession, OpenAIRealtimeWebRTC } from "@openai/agents/realtime";
import { createListeningAgent } from "../lib/agent/listeningAgent";

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
    console.log("📡 Transport event received:", event.type, event);

    // Handle transcription events
    switch (event.type) {
      case "conversation.item.input_audio_transcription.completed": {
        console.log("🎙️ Transcription completed:", event.transcript);
        if (onTranscriptionRef.current && event.transcript) {
          onTranscriptionRef.current({
            type: "transcription",
            text: event.transcript,
            timestamp: Date.now(),
          });
        }
        break;
      }
      case "response.function_call_delta":
      case "response.function_call.started":
      case "response.function_call.completed":
        console.log("🔧 Function call event:", event.type, event);
        break;
      case "response.audio.delta":
      case "response.audio.done":
        console.log("🔊 Audio response:", event.type);
        break;
      case "response.text.delta":
      case "response.text.done":
        console.log("📝 Text response:", event.type, event.delta || event.text);
        break;
      default:
        // Log all events for debugging
        console.log("📡 Other transport event:", event.type, event);
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

        // Create the listening agent with tools
        console.log("🤖 Creating listening agent...");
        const agent = createListeningAgent();
        console.log("✅ Listening agent created:", agent);
        console.log("🔧 Agent tools count:", agent.tools?.length || 0);

        console.log("🔗 Creating RealtimeSession...");
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
        console.log("📡 Setting up transport event handlers...");
        sessionRef.current.on("transport_event", handleTransportEvent);

        console.log("🔌 Connecting RealtimeSession...");
        await sessionRef.current.connect({ apiKey: ephemeralKey });
        console.log("✅ RealtimeSession connected successfully");
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
    // Allow the agent to generate a response
    sessionRef.current.transport.sendEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
      },
    });
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

"use client";

import React, { useState, useCallback } from "react";
import {
  useRealtimeSession,
  TranscriptionEvent,
} from "../hooks/useRealtimeSession";

export default function VoiceAgent() {
  const [error, setError] = useState<string | null>(null);
  const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState(false);
  const [transcriptions, setTranscriptions] = useState<TranscriptionEvent[]>(
    []
  );

  const {
    status,
    connect,
    disconnect,
    sendEvent,
    pushToTalkStart,
    pushToTalkStop,
  } = useRealtimeSession();

  const getEphemeralKey = async () => {
    const response = await fetch("/api/token");
    if (!response.ok) {
      throw new Error("Failed to get ephemeral key");
    }
    const data = await response.json();
    return data.value;
  };

  const handleTranscription = useCallback((event: TranscriptionEvent) => {
    setTranscriptions((prev) => [...prev, event]);
  }, []);

  const handleConnect = async () => {
    try {
      setError(null);
      await connect({
        getEphemeralKey,
        onTranscription: handleTranscription,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setTranscriptions([]); // Clear transcriptions on disconnect
  };

  const clearTranscriptions = () => {
    setTranscriptions([]);
  };

  // Push-to-talk handlers
  const handleTalkButtonDown = () => {
    if (status !== "CONNECTED") return;
    setIsPTTUserSpeaking(true);
    pushToTalkStart();
  };

  const handleTalkButtonUp = () => {
    if (status !== "CONNECTED" || !isPTTUserSpeaking) return;
    setIsPTTUserSpeaking(false);
    pushToTalkStop();
  };

  const getStatusColor = () => {
    switch (status) {
      case "CONNECTED":
        return "bg-green-100 border-green-300 text-green-800";
      case "CONNECTING":
        return "bg-yellow-100 border-yellow-300 text-yellow-800";
      case "DISCONNECTED":
        return "bg-gray-100 border-gray-300 text-gray-800";
      default:
        return "bg-gray-100 border-gray-300 text-gray-800";
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div
        className={`px-4 py-3 rounded-lg shadow-lg border ${getStatusColor()}`}
      >
        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium">
            Voice Transcription - {status}
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            {status === "DISCONNECTED" ? (
              <button
                onClick={handleConnect}
                className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
              >
                Connect
              </button>
            ) : (
              <>
                <button
                  onClick={handleDisconnect}
                  className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                >
                  Disconnect
                </button>
                {status === "CONNECTED" && (
                  <button
                    onClick={clearTranscriptions}
                    className="px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                  >
                    Clear
                  </button>
                )}
              </>
            )}
          </div>

          {/* Push-to-Talk Controls */}
          {status === "CONNECTED" && (
            <div className="flex gap-2 pt-1 border-t border-gray-200">
              <button
                onMouseDown={handleTalkButtonDown}
                onMouseUp={handleTalkButtonUp}
                onMouseLeave={handleTalkButtonUp}
                className={`px-3 py-2 rounded text-xs font-medium ${
                  isPTTUserSpeaking
                    ? "bg-red-500 text-white"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                }`}
              >
                {isPTTUserSpeaking ? "🎤 Recording..." : "🎤 Hold to Talk"}
              </button>
            </div>
          )}

          {/* Transcription Display */}
          {transcriptions.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="text-xs font-medium text-gray-700 mb-1">
                Transcriptions:
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {transcriptions.map((transcription, index) => (
                  <div
                    key={index}
                    className="text-xs bg-gray-50 p-2 rounded border"
                  >
                    <div className="text-gray-500 text-[10px] mb-1">
                      {new Date(transcription.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="text-gray-800">{transcription.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

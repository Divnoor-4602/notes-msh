import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type VoiceAgentState =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnecting"
  | "listening"
  | "speaking"
  | "generating_diagram";

export type TranscriptionStatus = "idle" | "listening" | "processing";

interface VoiceAgentStore {
  // State
  agentState: VoiceAgentState;
  transcriptionStatus: TranscriptionStatus;
  connectionStatus: "DISCONNECTED" | "CONNECTING" | "CONNECTED";

  // Actions
  setConnectionStatus: (
    status: "DISCONNECTED" | "CONNECTING" | "CONNECTED"
  ) => void;
  setTranscriptionStatus: (status: TranscriptionStatus) => void;
  setAgentState: (state: VoiceAgentState) => void;

  // Composite actions for common transitions
  startConnecting: () => void;
  finishConnecting: () => void;
  startDisconnecting: () => void;
  finishDisconnecting: () => void;
  startListening: () => void;
  startSpeaking: () => void;
  startGenerating: () => void;
  resetToIdle: () => void;

  // Debug info
  getDebugInfo: () => {
    agentState: VoiceAgentState;
    transcriptionStatus: TranscriptionStatus;
    connectionStatus: string;
    timestamp: number;
  };
}

export const useVoiceAgentStore = create<VoiceAgentStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    agentState: "idle",
    transcriptionStatus: "idle",
    connectionStatus: "DISCONNECTED",

    // Individual setters
    setConnectionStatus: (status) => {
      const current = get();

      // Update connection status
      set({ connectionStatus: status });

      // Auto-transition agent state based on connection changes
      if (
        status === "CONNECTED" &&
        current.agentState !== "listening" &&
        current.agentState !== "speaking"
      ) {
        // Only set to generating if we're not in an active conversation state
        set({ agentState: "connected" });
      } else if (status === "DISCONNECTED") {
        set({ agentState: "idle" });
      }
    },

    setTranscriptionStatus: (status) => {
      set({ transcriptionStatus: status });

      // Auto-transition agent state based on transcription status
      const current = get();
      if (status === "listening" && current.connectionStatus === "CONNECTED") {
        set({ agentState: "listening" });
      } else if (
        status === "processing" &&
        current.connectionStatus === "CONNECTED"
      ) {
        set({ agentState: "speaking" });
      }
    },

    setAgentState: (state) => {
      set({ agentState: state });
    },

    // Composite actions for cleaner usage
    startConnecting: () => {
      set({
        agentState: "connecting",
        connectionStatus: "CONNECTING",
      });
    },

    finishConnecting: () => {
      set({
        agentState: "connected",
        connectionStatus: "CONNECTED",
      });
    },

    startDisconnecting: () => {
      set({ agentState: "disconnecting" });
    },

    finishDisconnecting: () => {
      set({
        agentState: "idle",
        connectionStatus: "DISCONNECTED",
        transcriptionStatus: "idle",
      });
    },

    startListening: () => {
      set({
        agentState: "listening",
        transcriptionStatus: "listening",
      });
    },

    startSpeaking: () => {
      set({
        agentState: "speaking",
        transcriptionStatus: "processing",
      });
    },

    startGenerating: () => {
      set({ agentState: "generating_diagram" });
    },

    resetToIdle: () => {
      set({
        agentState: "idle",
        transcriptionStatus: "idle",
      });
    },

    // Debug helper
    getDebugInfo: () => ({
      agentState: get().agentState,
      transcriptionStatus: get().transcriptionStatus,
      connectionStatus: get().connectionStatus,
      timestamp: Date.now(),
    }),
  }))
);

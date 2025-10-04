"use client";

import React, { useEffect } from "react";
import { useRealtimeSession } from "../../hooks/useRealtimeSession";
import { useVoiceAgentStore } from "../../lib/store/voiceAgentStore";
import useMightyMouse from "react-hook-mighty-mouse";
import { motion } from "motion/react";
import { RadioIcon, Diamond, Square, Circle } from "lucide-react";
import { toast } from "sonner";

export default function VoiceAgent() {
  const { status, transcriptionStatus, connect, disconnect } =
    useRealtimeSession();
  const { selectedElement } = useMightyMouse(true, "voice-agent-face");

  // Voice agent state from Zustand store
  const agentState = useVoiceAgentStore((state) => state.agentState);
  const setConnectionStatus = useVoiceAgentStore(
    (state) => state.setConnectionStatus
  );
  const setTranscriptionStatus = useVoiceAgentStore(
    (state) => state.setTranscriptionStatus
  );
  const startConnecting = useVoiceAgentStore((state) => state.startConnecting);
  const finishConnecting = useVoiceAgentStore(
    (state) => state.finishConnecting
  );
  const startDisconnecting = useVoiceAgentStore(
    (state) => state.startDisconnecting
  );
  const finishDisconnecting = useVoiceAgentStore(
    (state) => state.finishDisconnecting
  );

  // Sync voice agent store with useRealtimeSession changes
  useEffect(() => {
    setConnectionStatus(status);
  }, [status, setConnectionStatus]);

  useEffect(() => {
    setTranscriptionStatus(transcriptionStatus);
  }, [transcriptionStatus, setTranscriptionStatus]);

  const getEphemeralKey = async () => {
    const response = await fetch("/api/token");
    if (!response.ok) {
      throw new Error("Failed to get ephemeral key");
    }
    const data = await response.json();
    return data.value;
  };

  const handleConnect = async () => {
    try {
      startConnecting();
      await connect({
        getEphemeralKey,
      });
      finishConnecting();
    } catch {
      finishDisconnecting();
    }
  };

  const handleDisconnect = () => {
    disconnect();
    // Add a brief disconnect animation before returning to idle
    startDisconnecting();
    setTimeout(() => {
      finishDisconnecting();
    }, 800); // Match the duration of the disconnect animation
  };

  // Calculate eye movement based on mouse position relative to the face
  const getEyeOffset = (_eyePosition: "left" | "right") => {
    if (!selectedElement?.position.x || !selectedElement?.position.y) {
      return { x: 0, y: 0 };
    }

    const faceWidth = 64; // size-16 = 64px
    const faceHeight = 64;
    const eyeRadius = 2.5; // Very small movement radius for subtle tracking

    // Calculate relative position from -1 to 1
    const relativeX =
      (selectedElement.position.x - faceWidth / 2) / (faceWidth / 2);
    const relativeY =
      (selectedElement.position.y - faceHeight / 2) / (faceHeight / 2);

    // Clamp values to prevent eyes from going too far
    const clampedX = Math.max(-1, Math.min(1, relativeX));
    const clampedY = Math.max(-1, Math.min(1, relativeY));

    // Calculate very subtle eye movement
    const eyeX = clampedX * eyeRadius * 1.5; // Very reduced movement
    const eyeY = clampedY * eyeRadius * 1.5;

    return {
      x: eyeX,
      y: eyeY,
    };
  };

  const leftEyeOffset = getEyeOffset("left");
  const rightEyeOffset = getEyeOffset("right");

  // Get eye color based on agent state
  const getEyeColor = () => {
    switch (agentState) {
      case "listening":
        return "bg-blue-500";
      case "speaking":
        return "bg-orange-500";
      case "connected":
        return "bg-green-600";
      case "generating_diagram":
        return "bg-purple-500"; // This will be overridden by the animation
      default:
        return "bg-gray-800";
    }
  };

  // Get eye color animation for generating_diagram state
  const getEyeColorAnimation = () => {
    if (agentState === "generating_diagram") {
      return {
        animate: {
          backgroundColor: [
            "rgb(236 72 153)", // pink-500
            "rgb(59 130 246)", // blue-500
            "rgb(34 197 94)", // green-500
            "rgb(168 85 247)", // purple-500
            "rgb(251 191 36)", // yellow-500
            "rgb(236 72 153)", // pink-500 (back to start)
          ],
        },
        transition: {
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut" as const,
        },
      };
    } else {
      // When not in generating_diagram state, animate to the appropriate color
      const colorMap = {
        idle: "rgb(31 41 55)", // gray-800
        connecting: "rgb(31 41 55)", // gray-800
        connected: "rgb(34 197 94)", // green-600
        listening: "rgb(59 130 246)", // blue-500
        speaking: "rgb(245 158 11)", // orange-500
        disconnecting: "rgb(31 41 55)", // gray-800
      };

      return {
        animate: {
          backgroundColor: colorMap[agentState] || "rgb(31 41 55)",
        },
        transition: {
          duration: 0.3,
          ease: "easeInOut" as const,
        },
      };
    }
  };

  // Get state-specific eye animations
  const getEyeAnimation = (_eyePosition: "left" | "right") => {
    switch (agentState) {
      case "idle":
        return {
          animate: {
            height: ["1rem", "0.125rem", "1rem"],
          },
          transition: {
            duration: 0.25,
            repeat: Infinity,
            repeatType: "loop" as const,
            repeatDelay: 2.75,
          },
        };
      default:
        return {
          animate: {
            height: "1rem",
          },
          transition: {
            duration: 0.3,
          },
        };
    }
  };

  // Get floating icons/shapes for each state
  const getFloatingElements = () => {
    const elements = [];
    const count = 6;

    // Pastel colors array
    const pastelColors = [
      "text-pink-300 fill-pink-300",
      "text-blue-300 fill-blue-300",
      "text-green-300 fill-green-300",
      "text-yellow-300 fill-yellow-300",
      "text-purple-300 fill-purple-300",
      "text-indigo-300 fill-indigo-300",
      "text-red-300 fill-red-300",
      "text-orange-300 fill-orange-300",
      "text-teal-300 fill-teal-300",
      "text-rose-300 fill-rose-300",
    ];

    // Pre-assign colors based on agentState and index for consistency
    const colorSeed = agentState === "generating_diagram" ? 123 : 456;

    for (let i = 0; i < count; i++) {
      let Icon;
      // Use deterministic color selection based on state and index
      const colorIndex = (colorSeed + i) % pastelColors.length;
      const randomColor = pastelColors[colorIndex];

      switch (agentState) {
        case "connecting":
          Icon = RadioIcon;
          break;
        case "connected":
          return null; // No floating elements for connected state
        case "generating_diagram":
          // Only shapes
          const shapes = [Diamond, Square, Circle];
          Icon = shapes[i % shapes.length];
          break;
        default:
          return null; // No floating elements for idle or other states
      }

      elements.push(
        <motion.div
          key={`${agentState}-${i}`}
          className="absolute"
          initial={{
            x: 32 + (Math.random() - 0.5) * 30,
            y: 80,
            opacity: 0,
            scale: 0.5,
          }}
          animate={{
            x: 32 + (Math.random() - 0.5) * 30 + (Math.random() - 0.5) * 40,
            y: -20,
            opacity: [0, 1, 1, 0],
            scale: [0.5, 0.8, 0.8, 0.3],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            repeatDelay: 0.5,
            delay: i * 0.6,
            ease: "easeOut",
          }}
        >
          <motion.div
            key={agentState}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Icon className={`size-6 ${randomColor}`} />
          </motion.div>
        </motion.div>
      );
    }

    return elements;
  };

  // Add face scale animation based on agent state
  const getFaceAnimation = () => {
    switch (agentState) {
      case "speaking":
        return {
          scale: [1, 1.03, 0.99, 1.05, 1.01, 1.04, 1.02, 1.03, 1],
          transition: {
            duration: 0.8,
            repeat: Infinity,
            ease: "easeOut" as const, // Smoother, less bouncy easing
          },
        };
      default:
        return {
          scale: 1,
          transition: {
            duration: 0.3,
            ease: "easeOut" as const,
          },
        };
    }
  };

  return (
    <>
      <motion.div
        id="voice-agent-face"
        className="rounded-full size-16 bg-white absolute bottom-16 right-0 border border-gray-300 flex flex-col items-center justify-center overflow-hidden cursor-pointer shadow-sm z-20"
        whileHover={
          agentState !== "speaking" && agentState !== "generating_diagram"
            ? { scale: 1.05 }
            : {}
        }
        whileTap={{ scale: 0.95 }}
        animate={getFaceAnimation()}
        onClick={status === "DISCONNECTED" ? handleConnect : handleDisconnect}
      >
        {/* eyes */}
        <div className="flex items-center gap-2 justify-center relative">
          {/* Left Eye */}
          <motion.div
            className="absolute"
            style={{
              left: "50%",
              marginLeft: "-16px",
            }}
            animate={{
              x: leftEyeOffset.x,
              y: leftEyeOffset.y,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
          >
            <motion.div
              className="w-1 h-4 rounded-full"
              {...getEyeAnimation("left")}
              {...getEyeColorAnimation()}
            />
          </motion.div>

          {/* Right Eye */}
          <motion.div
            className="absolute"
            style={{
              left: "50%",
              marginLeft: "6px",
            }}
            animate={{
              x: rightEyeOffset.x,
              y: rightEyeOffset.y,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
          >
            <motion.div
              className="w-1 h-4 rounded-full"
              {...getEyeAnimation("right")}
              {...getEyeColorAnimation()}
            />
          </motion.div>
        </div>
      </motion.div>
      {/* Floating elements for different states */}
      {agentState !== "idle" && (
        <div className="absolute bottom-32 right-0 w-20 h-20 pointer-events-none z-10">
          {getFloatingElements()}
        </div>
      )}
    </>
  );
}

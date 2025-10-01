"use client";

import React, { useState, useEffect } from "react";
import { useRealtimeSession } from "../../hooks/useRealtimeSession";
import useMightyMouse from "react-hook-mighty-mouse";
import { motion } from "motion/react";
import { RadioIcon, Headphones, Diamond, Square, Circle } from "lucide-react";

export type VoiceAgentState =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnecting"
  | "listening"
  | "generating_diagram";

export default function VoiceAgent() {
  const [agentState, setAgentState] = useState<VoiceAgentState>("idle");

  const { status, connect, disconnect } = useRealtimeSession();
  const { selectedElement } = useMightyMouse(true, "voice-agent-face");

  // Get canvas store states (removed unused variables)

  // Console log state changes
  React.useEffect(() => {
    console.log("Voice Agent State:", agentState);
  }, [agentState]);

  // Handle state transitions based on real session states
  useEffect(() => {
    if (status === "CONNECTED") {
      setAgentState("generating_diagram");
    }
  }, [status]);

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
      setAgentState("connecting");
      await connect({
        getEphemeralKey,
      });
      setAgentState("connected");
    } catch {
      setAgentState("idle");
    }
  };

  const handleDisconnect = () => {
    disconnect();
    // Add a brief disconnect animation before returning to idle
    setAgentState("disconnecting");
    setTimeout(() => {
      setAgentState("idle");
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
          Icon = Headphones;
          break;
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

  return (
    <>
      <div
        id="voice-agent-face"
        className="rounded-full size-16 bg-white absolute bottom-16 right-0 border border-gray-300 flex flex-col items-center justify-center overflow-hidden cursor-pointer shadow-sm z-20"
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
              className="w-1 h-4 bg-gray-800 rounded-full"
              {...getEyeAnimation("left")}
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
              className="w-1 h-4 bg-gray-800 rounded-full"
              {...getEyeAnimation("right")}
            />
          </motion.div>
        </div>
      </div>
      {/* Floating elements for different states */}
      {agentState !== "idle" && (
        <div className="absolute bottom-32 right-0 w-20 h-20 pointer-events-none z-10">
          {getFloatingElements()}
        </div>
      )}
    </>
  );
}

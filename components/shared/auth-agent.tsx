"use client";

import { motion } from "motion/react";
import useMightyMouse from "react-hook-mighty-mouse";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";

export function AuthAgent() {
  // Mouse tracking for agent eyes
  const { selectedElement } = useMightyMouse(true, "auth-agent-face");

  // Calculate eye movement based on mouse position relative to the face
  const getEyeOffset = (eyePosition: "left" | "right") => {
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
    const eyeX = clampedX * eyeRadius * 1.5;
    const eyeY = clampedY * eyeRadius * 1.5;

    return {
      x: eyeX,
      y: eyeY,
    };
  };

  const leftEyeOffset = getEyeOffset("left");
  const rightEyeOffset = getEyeOffset("right");

  // Get floating shapes
  const getFloatingShapes = () => {
    const shapes = [];
    const count = 14;

    // Arrow icons, shape components, and text elements
    const shapeComponents = [
      { type: "arrow", Icon: ArrowUp },
      { type: "arrow", Icon: ArrowDown },
      { type: "arrow", Icon: ArrowLeft },
      { type: "arrow", Icon: ArrowRight },
      { type: "circle", Icon: null },
      { type: "rectangle", Icon: null },
      { type: "text", text: "process" },
      { type: "text", text: "flow" },
      { type: "text", text: "vibe" },
      { type: "text", text: "draw" },
      { type: "text", text: "create" },
      { type: "text", text: "explore" },
    ];

    for (let i = 0; i < count; i++) {
      const shape = shapeComponents[i % shapeComponents.length];
      const isArrow = shape.type === "arrow";
      const isCircle = shape.type === "circle";
      const isRectangle = shape.type === "rectangle";
      const isText = shape.type === "text";

      // Random positioning throughout the entire container
      const startX = Math.random() * 100; // 0 to 100%
      const startY = Math.random() * 100; // 0 to 100%
      const endX = Math.random() * 100;
      const endY = Math.random() * 100;

      shapes.push(
        <motion.div
          key={i}
          className="absolute"
          initial={{
            left: `${startX}%`,
            top: `${startY}%`,
            opacity: 0,
            scale: 0,
          }}
          animate={{
            left: `${endX}%`,
            top: `${endY}%`,
            opacity: [0, 1, 1, 0],
            scale: [0, 1, 1, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            repeatDelay: 1,
            delay: i * 0.5,
            ease: "easeInOut",
          }}
        >
          {isArrow && shape.Icon && (
            <div className="bg-white border border-gray-300 p-2 rounded-md shadow-sm">
              <shape.Icon className="size-4 text-gray-600" />
            </div>
          )}
          {isCircle && (
            <div className="bg-white border border-gray-300 rounded-full size-8 shadow-sm" />
          )}
          {isRectangle && (
            <div className="bg-white border border-gray-300 w-10 h-6 rounded-sm shadow-sm" />
          )}
          {isText && (
            <div className="bg-white border border-gray-300 px-3 py-1.5 rounded-md shadow-sm">
              <span className="text-xs font-medium text-gray-600">
                {shape.text}
              </span>
            </div>
          )}
        </motion.div>
      );
    }

    return shapes;
  };

  return (
    <div className="bg-muted relative hidden md:flex items-center justify-center overflow-hidden">
      {/* Floating shapes */}
      <div className="absolute inset-0 pointer-events-none">
        {getFloatingShapes()}
      </div>

      {/* Agent face */}
      <div
        id="auth-agent-face"
        className="rounded-full size-16 bg-white border border-gray-300 flex flex-col items-center justify-center overflow-hidden shadow-sm z-10"
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
              animate={{
                height: ["1rem", "0.125rem", "1rem"],
              }}
              transition={{
                duration: 0.25,
                repeat: Infinity,
                repeatType: "loop" as const,
                repeatDelay: 2.75,
              }}
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
              animate={{
                height: ["1rem", "0.125rem", "1rem"],
              }}
              transition={{
                duration: 0.25,
                repeat: Infinity,
                repeatType: "loop" as const,
                repeatDelay: 2.75,
              }}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

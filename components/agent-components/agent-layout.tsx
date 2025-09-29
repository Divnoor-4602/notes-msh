"use client";

import React from "react";
import VoiceAgent from "./voice-agent";
import RefinementAgent from "./refinement-agent";

export default function AgentLayout() {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-4 max-w-md">
      <VoiceAgent />
    </div>
  );
}

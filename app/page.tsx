"use client";

import React from "react";
import ExcalidrawCanvas from "@/components/ExcalidrawCanvas";
import VoiceAgent from "@/components/VoiceAgent";

const Home = () => {
  return (
    <>
      <VoiceAgent />
      <ExcalidrawCanvas />
    </>
  );
};

export default Home;

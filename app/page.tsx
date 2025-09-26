"use client";

import React from "react";
import ExcalidrawCanvas from "@/components/ExcalidrawCanvas";
import AgentLayout from "@/components/agent-components/agent-layout";

const Home = () => {
  return (
    <>
      <AgentLayout />
      <ExcalidrawCanvas />
    </>
  );
};

export default Home;

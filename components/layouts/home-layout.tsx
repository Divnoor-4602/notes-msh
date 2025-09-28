"use client";

import React from "react";
import ExcalidrawCanvas from "@/components/ExcalidrawCanvas";
import AgentLayout from "@/components/agent-components/agent-layout";

const HomeLayout = () => {
  return (
    <>
      <AgentLayout />
      <ExcalidrawCanvas />
    </>
  );
};

export default HomeLayout;

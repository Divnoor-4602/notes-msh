"use client";

import React from "react";
import ExcalidrawCanvas from "@/components/ExcalidrawCanvas";
import AgentLayout from "@/components/agent-components/agent-layout";
import SignOutButton from "@/components/shared/signout-button";

const HomeLayout = () => {
  return (
    <>
      <AgentLayout />
      <ExcalidrawCanvas />
      <div className="absolute top-4 right-4 z-50">
        <SignOutButton />
      </div>
    </>
  );
};

export default HomeLayout;

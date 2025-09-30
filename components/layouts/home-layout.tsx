"use client";

import React, { useState, useEffect } from "react";
import ExcalidrawCanvas from "@/components/ExcalidrawCanvas";
import AgentLayout from "@/components/agent-components/agent-layout";
import SignOutButton from "@/components/shared/signout-button";
import { useCustomer } from "autumn-js/react";
import PaywallDialog from "@/components/autumn/paywall-dialog";
import TrialStatusCard from "@/components/autumn/trial-status-card";

const HomeLayout = () => {
  const { check } = useCustomer();
  const [showPaywall, setShowPaywall] = useState(false);

  const { data, error } = check({
    featureId: "voice_agent_access",
  });

  // Show paywall when access is denied (only once per session)
  useEffect(() => {
    if (data && !data.allowed && !showPaywall) {
      setShowPaywall(true);
    }
  }, [data, showPaywall]);

  return (
    <>
      {/* Only show voice agent if user has access */}
      {data?.allowed && <AgentLayout />}

      {/* Pass access to canvas */}
      <ExcalidrawCanvas canEdit={data?.allowed} />

      <div className="absolute top-4 right-4 z-50 flex items-center gap-4">
        <TrialStatusCard />
        <SignOutButton />
      </div>

      {/* Manual paywall dialog */}
      <PaywallDialog
        open={showPaywall}
        setOpen={setShowPaywall}
        featureId="voice_agent_access"
      />
    </>
  );
};

export default HomeLayout;

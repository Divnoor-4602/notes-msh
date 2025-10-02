"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import ExcalidrawCanvas from "@/components/ExcalidrawCanvas";
import AgentLayout from "@/components/agent-components/agent-layout";
import SignOutButton from "@/components/shared/signout-button";
import { useCustomer } from "autumn-js/react";
import PaywallDialog from "@/components/autumn/paywall-dialog";
import TrialStatusCard from "@/components/autumn/trial-status-card";
import { ShareDialog } from "@/components/canvas/share-dialog";
import { ImportModal } from "@/components/canvas/import-modal";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";

const HomeLayout = () => {
  const searchParams = useSearchParams();
  const shareToken = searchParams.get("token");

  const { check, customer } = useCustomer();
  const [showPaywall, setShowPaywall] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showImportModal, setShowImportModal] = useState(!!shareToken);

  const currentUser = useQuery(api.auth.getCurrentUser);
  const canvasData = useQuery(
    api.canvas.getCanvasByUserId,
    currentUser ? { userId: currentUser._id } : "skip"
  );

  // Memoize the check call to prevent re-rendering issues
  const { data } = useMemo(() => {
    return check({
      featureId: "voice_agent_access",
    });
  }, []); // Empty dependency array since featureId doesn't change

  // Show paywall when access is denied (only once per session)
  useEffect(() => {
    if (data && !data.allowed && !showPaywall) {
      setShowPaywall(true);
    }
  }, [data, showPaywall]);

  // Show import modal when token is in URL
  useEffect(() => {
    if (shareToken) {
      setShowImportModal(true);
    } else {
      setShowImportModal(false);
    }
  }, [shareToken]);

  return (
    <>
      {/* Only show voice agent if user has access */}
      {data?.allowed && <AgentLayout />}

      {/* Pass access to canvas */}
      <ExcalidrawCanvas canEdit={data?.allowed} />

      <div className="absolute top-5 right-32 z-50 flex items-center gap-4">
        <SignOutButton />
        {/* Share button - only show if user has a canvas */}
        {canvasData && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShareDialog(true)}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        )}
      </div>

      <div className="absolute bottom-20 left-4 z-50 flex items-center gap-4">
        <TrialStatusCard />
      </div>

      {/* Manual paywall dialog */}
      <PaywallDialog
        open={showPaywall}
        setOpen={setShowPaywall}
        featureId="voice_agent_access"
      />

      {/* Share dialog */}
      {canvasData && (
        <ShareDialog
          canvasId={canvasData._id}
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
        />
      )}

      {/* Import modal - shows when ?token=... is in URL */}
      {shareToken && (
        <ImportModal
          token={shareToken}
          open={showImportModal}
          onOpenChange={setShowImportModal}
        />
      )}
    </>
  );
};

export default HomeLayout;

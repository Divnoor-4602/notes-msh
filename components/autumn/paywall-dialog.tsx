"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { usePaywall } from "autumn-js/react";
import { getPaywallContent } from "@/lib/autumn/paywall-content";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export interface PaywallDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  featureId: string;
  entityId?: string;
}

export default function PaywallDialog(params?: PaywallDialogProps) {
  const { data: preview } = usePaywall({
    featureId: params?.featureId,
    entityId: params?.entityId,
  });

  const router = useRouter();

  if (!params || !preview) {
    return <></>;
  }

  const { open, setOpen } = params;
  const { title, message } = getPaywallContent(preview);

  const handleUpgrade = () => {
    setOpen(false);
    router.push("/pricing");
  };

  // Get button text based on whether it's a free trial
  const getButtonText = () => {
    if (preview.products && preview.products.length > 0) {
      const nextProduct = preview.products[0];
      if (nextProduct.free_trial) {
        return "Start Free Trial";
      } else if (nextProduct.is_add_on) {
        return "Purchase Now";
      } else {
        return "Upgrade Now";
      }
    }
    return "Contact Support";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 pt-4 gap-0 text-foreground overflow-hidden text-sm">
        <DialogTitle className={cn("font-bold text-xl px-6")}>
          {title}
        </DialogTitle>
        <div className="px-6 my-2">{message}</div>
        <DialogFooter className="flex flex-col sm:flex-row justify-between gap-x-4 py-2 mt-4 pl-6 pr-3 bg-secondary border-t">
          <Button
            size="sm"
            className="font-medium shadow transition min-w-20"
            onClick={handleUpgrade}
          >
            {getButtonText()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

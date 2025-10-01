"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Download, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImportModalProps {
  token: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportModal({ token, open, onOpenChange }: ImportModalProps) {
  const [isImporting, setIsImporting] = useState(false);
  const router = useRouter();

  const sharedCanvas = useQuery(api.sharing.getSharedCanvas, {
    shareToken: token,
  });
  const importCanvas = useMutation(api.sharing.importSharedCanvas);
  const currentUser = useQuery(api.auth.getCurrentUser);

  const handleSignIn = () => {
    // Save token to return after sign-in
    onOpenChange(false);
    router.push(`/sign-in?returnUrl=${encodeURIComponent(`/?token=${token}`)}`);
  };

  const handleImport = async () => {
    if (!currentUser) {
      toast.error("Please sign in to import this canvas");
      onOpenChange(false);
      router.push("/sign-in");
      return;
    }

    setIsImporting(true);
    try {
      const result = await importCanvas({
        shareToken: token,
        userId: currentUser._id,
        importOption: "replace",
      });

      // Show success message
      toast.success(result.message);

      // Clear token from URL and reload
      // Use push instead of replace to avoid issues with reload
      window.location.href = "/";
    } catch (error: any) {
      toast.error(error.message || "Failed to import canvas");
      setIsImporting(false);
    }
  };

  // Loading state
  if (!sharedCanvas) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="p-0 pt-4 gap-0 text-foreground overflow-hidden text-sm">
          <div className="px-6 py-8 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Expired link
  if (sharedCanvas.isExpired) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="p-0 pt-4 gap-0 text-foreground overflow-hidden text-sm">
          <div className="px-6">
            <DialogTitle
              className={cn("font-bold text-xl mb-2 flex items-center gap-2")}
            >
              <AlertCircle className="h-5 w-5 text-destructive" />
              Share Link Expired
            </DialogTitle>
            <DialogDescription>
              This share link has expired and is no longer available.
            </DialogDescription>
          </div>
          <div className="px-6 my-4">
            <p className="text-sm text-muted-foreground">
              Please contact the person who shared this canvas with you to
              request a new link.
            </p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row justify-between gap-2 py-3 px-6 bg-secondary border-t">
            <Button
              size="sm"
              className="font-medium shadow transition"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Valid share - show import confirmation
  const elementCount = JSON.parse(sharedCanvas.elements).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 pt-4 gap-0 text-foreground overflow-hidden text-sm">
        <div className="px-6">
          <DialogTitle className={cn("font-bold text-xl mb-2")}>
            Canvas Shared with You
          </DialogTitle>
          <DialogDescription>
            {sharedCanvas.sharedByUserName || "Someone"} wants to share a canvas
            with you
          </DialogDescription>
        </div>

        <div className="px-6 my-4 space-y-3">
          {/* Canvas Info */}
          <div className="bg-secondary rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shared by:</span>
              <span className="font-medium">
                {sharedCanvas.sharedByUserName || "Unknown User"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Created:</span>
              <span className="font-medium">
                {new Date(sharedCanvas.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Elements:</span>
              <span className="font-medium">{elementCount} items</span>
            </div>
            {sharedCanvas.expiresAt && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expires:</span>
                <span className="font-medium">
                  {new Date(sharedCanvas.expiresAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Warning */}
          <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 dark:text-amber-200">
              Importing will replace your current canvas. Make sure you've saved
              any important work.
            </p>
          </div>

          {/* Sign-in prompt if not authenticated */}
          {!currentUser && (
            <p className="text-sm text-center text-muted-foreground">
              You need to{" "}
              <button
                onClick={handleSignIn}
                className="text-primary underline hover:no-underline"
              >
                sign in
              </button>{" "}
              to import this canvas
            </p>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row justify-between gap-2 py-3 px-6 bg-secondary border-t">
          <Button
            size="sm"
            className="font-medium shadow transition"
            onClick={handleImport}
            disabled={isImporting || !currentUser}
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Import Canvas
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

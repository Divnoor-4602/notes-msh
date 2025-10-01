"use client";

import { useState } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Share2, Copy, Mail, Check } from "lucide-react";
import { toast } from "sonner";

interface ShareDialogProps {
  canvasId: Id<"canvas">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({
  canvasId,
  open,
  onOpenChange,
}: ShareDialogProps) {
  const [recipientEmails, setRecipientEmails] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const createShareLink = useMutation(api.sharing.createShareLinkPublic);
  const shareViaEmail = useAction(api.sharing.shareCanvasViaEmail);
  const currentUser = useQuery(api.auth.getCurrentUser);

  const handleCreateLink = async () => {
    try {
      const result = await createShareLink({
        canvasId,
        expiresInDays: 30,
      });
      setShareUrl(result.shareUrl);
      toast.success("Share link created!");
    } catch (error) {
      toast.error("Failed to create share link");
      console.error(error);
    }
  };

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareViaEmail = async () => {
    const emails = recipientEmails
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e);

    if (emails.length === 0) {
      toast.error("Please enter at least one email address");
      return;
    }

    setIsSharing(true);
    try {
      const result = await shareViaEmail({
        canvasId,
        recipientEmails: emails,
        customMessage: customMessage || undefined,
        expiresInDays: 30,
        userName: (currentUser as any)?.name,
        userEmail: (currentUser as any)?.email,
      });
      setShareUrl(result.shareUrl);
      toast.success(`Canvas shared with ${emails.length} recipient(s)!`);
      setRecipientEmails("");
      setCustomMessage("");
    } catch (error) {
      toast.error("Failed to share canvas");
      console.error(error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 pt-4 gap-0 text-foreground overflow-hidden text-sm">
        <div className="px-6">
          <DialogTitle className={cn("font-bold text-xl mb-2")}>
            Share Canvas
          </DialogTitle>
          <DialogDescription>
            Share your canvas with others via email or link
          </DialogDescription>
        </div>

        <div className="px-6 my-4 space-y-4">
          {/* Email Sharing Section */}
          <div className="space-y-2">
            <Label htmlFor="emails" className="text-sm font-medium">
              Email Recipients
            </Label>
            <Input
              id="emails"
              type="text"
              placeholder="email@example.com, another@example.com"
              value={recipientEmails}
              onChange={(e) => setRecipientEmails(e.target.value)}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple emails with commas
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium">
              Message (Optional)
            </Label>
            <textarea
              id="message"
              className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              placeholder="Add a personal message..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
            />
          </div>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or copy link
              </span>
            </div>
          </div>

          {/* Link Generation Section */}
          {!shareUrl ? (
            <Button
              onClick={handleCreateLink}
              variant="outline"
              className="w-full text-sm"
              size="sm"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Generate Share Link
            </Button>
          ) : (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Share Link</Label>
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="flex-1 text-sm"
                  onClick={(e) => e.currentTarget.select()}
                />
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This link expires in 30 days
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row justify-between gap-2 py-3 px-6 bg-secondary border-t">
          <Button
            size="sm"
            className="font-medium shadow transition"
            onClick={handleShareViaEmail}
            disabled={isSharing || !recipientEmails.trim()}
          >
            <Mail className="h-4 w-4 mr-2" />
            {isSharing ? "Sending..." : "Send via Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

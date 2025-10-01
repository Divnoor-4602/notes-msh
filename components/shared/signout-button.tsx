"use client";

import { authClient } from "@/lib/auth/auth-client";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

export default function SignOutButton() {
  const router = useRouter();
  const currentUser = useQuery(api.auth.getCurrentUser);

  const handleSignOut = async () => {
    toast.info("Signed out successfully");
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/sign-in");
        },
      },
    });
  };

  if (currentUser === undefined) {
    return <Skeleton className="h-9 w-[110px]" />;
  }

  return (
    <Button onClick={handleSignOut} variant="destructive" size="sm">
      <LogOut className="h-4 w-4 mr-2" />
      Sign Out
    </Button>
  );
}

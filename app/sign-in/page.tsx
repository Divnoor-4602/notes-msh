import { Suspense } from "react";
import { SignInForm } from "@/components/forms/sign-in-form";
import { SignInSkeleton } from "@/components/forms/sign-in-skeleton";

export default function SignInPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <Suspense fallback={<SignInSkeleton />}>
          <SignInForm />
        </Suspense>
      </div>
    </div>
  );
}

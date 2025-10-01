import { Suspense } from "react";
import { SignUpForm } from "@/components/forms/sign-up-form";
import { SignUpSkeleton } from "@/components/forms/sign-up-skeleton";

export default function SignUpPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <Suspense fallback={<SignUpSkeleton />}>
          <SignUpForm />
        </Suspense>
      </div>
    </div>
  );
}

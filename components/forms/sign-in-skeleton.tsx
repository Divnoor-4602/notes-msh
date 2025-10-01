import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SignInSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          {/* Form Side */}
          <div className="p-6 md:p-8">
            <div className="flex flex-col gap-6">
              {/* Title & Subtitle */}
              <div className="flex flex-col items-center text-center gap-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>

              {/* Email Field */}
              <div className="grid gap-3">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-10 w-full" />
              </div>

              {/* Password Field */}
              <div className="grid gap-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>

              {/* Login Button */}
              <Skeleton className="h-10 w-full" />

              {/* Sign up link */}
              <Skeleton className="h-4 w-48 mx-auto" />
            </div>
          </div>

          {/* AuthAgent Side */}
          <div className="bg-muted hidden md:flex items-center justify-center p-8">
            <Skeleton className="h-16 w-16 rounded-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

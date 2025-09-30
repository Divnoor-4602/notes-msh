"use client";

import React from "react";
import { useCustomer } from "autumn-js/react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Calendar } from "lucide-react";

export default function TrialStatusCard() {
  const { customer, isLoading } = useCustomer({ errorOnNotFound: false });

  // Show loading skeleton while data is loading
  if (isLoading) {
    return (
      <Card className="w-64 shadow-lg border-l-4 border-l-gray-200">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="w-4 h-4 rounded" />
          </div>
          <div className="mt-2">
            <Skeleton className="h-3 w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't render anything if no customer data
  if (!customer) {
    return null;
  }

  // Check if customer has an active trial by looking at products
  const activeTrial = customer?.products?.find(
    (product) => product.trial_ends_at
  );

  // For testing - show for Pro users even without trial
  const proProduct = customer?.products?.find(
    (product) => product.id === "pro"
  );

  if (!activeTrial && !proProduct) {
    return null; // Don't show card if no active trial or pro product
  }

  // Use actual trial if available, otherwise use pro product for testing
  const trialData = activeTrial || proProduct;

  if (!trialData) {
    return null;
  }

  // Calculate remaining days using actual trial data or subscription period
  const trialEndDate = trialData.trial_ends_at
    ? new Date(trialData.trial_ends_at)
    : new Date(trialData.current_period_end || "");

  const today = new Date();
  const timeDiff = trialEndDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  // Don't show if trial has ended
  if (daysRemaining <= 0) {
    return null;
  }

  return (
    <Card className="w-64 shadow-lg border-l-4 border-l-blue-500">
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              Free Trial Active
            </p>
            <p className="text-xs text-gray-600">
              {daysRemaining === 1
                ? "1 day remaining"
                : `${daysRemaining} days remaining`}
            </p>
          </div>
          <Calendar className="w-4 h-4 text-gray-400" />
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Trial ends on {trialEndDate.toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}

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

  // Calculate remaining days using calendar-day difference to avoid off-by-one due to timezones/partials
  let trialEndDate: Date;

  if (trialData.trial_ends_at) {
    // Use actual trial end date
    trialEndDate = new Date(trialData.trial_ends_at);
  } else if (trialData.current_period_end) {
    // For testing with Pro products, calculate trial end from subscription start
    // Assume trial started when subscription was created and lasts 3 days
    const subscriptionStart = new Date(trialData.current_period_start || "");
    if (!isNaN(subscriptionStart.getTime())) {
      trialEndDate = new Date(
        subscriptionStart.getTime() + 3 * 24 * 60 * 60 * 1000
      );
    } else {
      // Fallback: use current_period_end but only if it's reasonable (within 7 days)
      const periodEnd = new Date(trialData.current_period_end);
      const now = new Date();
      const daysUntilPeriodEnd =
        (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      if (daysUntilPeriodEnd <= 7) {
        trialEndDate = periodEnd;
      } else {
        // Period end is too far in future, don't show trial card
        return null;
      }
    }
  } else {
    return null;
  }

  // Fallback: if date parsing failed, don't render
  if (isNaN(trialEndDate.getTime())) {
    return null;
  }

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfEndDay = new Date(trialEndDate);
  startOfEndDay.setHours(0, 0, 0, 0);

  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const rawDays =
    (startOfEndDay.getTime() - startOfToday.getTime()) / MS_PER_DAY;
  const daysRemaining = Math.floor(rawDays);

  // Debug logs to help verify calculation inputs/outputs
  if (process.env.NODE_ENV !== "production") {
    console.debug("TrialStatusCard: trialData=", {
      trial_ends_at: trialData.trial_ends_at,
      current_period_start: trialData.current_period_start,
      current_period_end: trialData.current_period_end,
      id: trialData.id,
    });
    console.debug(
      "TrialStatusCard: Using trial_ends_at?",
      !!trialData.trial_ends_at
    );
    console.debug(
      "TrialStatusCard: Using current_period_start?",
      !!trialData.current_period_start
    );
    console.debug(
      "TrialStatusCard: Using current_period_end?",
      !!trialData.current_period_end
    );
    console.debug("TrialStatusCard: now=", now.toISOString());
    console.debug(
      "TrialStatusCard: trialEndDate=",
      trialEndDate.toISOString(),
      "startOfToday=",
      startOfToday.toISOString(),
      "startOfEndDay=",
      startOfEndDay.toISOString(),
      "rawDays=",
      rawDays,
      "daysRemaining=",
      daysRemaining
    );
  }

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

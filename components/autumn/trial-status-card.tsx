"use client";

import React from "react";
import { useCustomer } from "autumn-js/react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "motion/react";
import { BadgePercentIcon, CircleIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function TrialStatusCard() {
  const { customer, isLoading, openBillingPortal } = useCustomer({
    errorOnNotFound: false,
  });

  // Show loading skeleton while data is loading
  if (isLoading) {
    return (
      <div className="bg-gray-100/70 pb-0.5 rounded-2xl px-0.5 relative overflow-hidden">
        {/* Decorative shapes skeleton */}
        <div className="flex justify-between items-center px-2 my-3">
          <div className="flex items-center gap-1">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="w-2 h-2 rounded-full" />
            <Skeleton className="w-1.5 h-1.5" />
            <Skeleton className="w-2 h-2" />
          </div>
        </div>
        <div className="border border-gray-200 px-4 py-4 rounded-xl w-56 flex flex-col gap-4 bg-white z-1">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>
      </div>
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
    <motion.div
      className="bg-gray-100/70 pb-0.5 rounded-2xl px-0.5 relative overflow-hidden"
      whileHover="hover"
      initial="initial"
    >
      {/* Decorative shapes in top right corner */}
      <div className="flex justify-between items-center px-2 my-3">
        <div className="flex items-center gap-1">
          <BadgePercentIcon className="w-4 h-4 text-gray-600" />
          {/* text */}
          <div className="text-xs text-gray-600">Get notes0 Pro</div>
        </div>
        <div className="flex items-center gap-1">
          <motion.div
            className="w-2 h-2 bg-gray-600 rounded-full"
            variants={{
              initial: { scale: 1 },
              hover: {
                scale: [1, 1.2, 1],
                transition: {
                  duration: 0.6,
                  ease: "easeOut",
                  delay: 0,
                  repeat: Infinity,
                  repeatDelay: 0.5,
                },
              },
            }}
          />
          <motion.div
            className="w-1.5 h-1.5 bg-gray-600 transform rotate-45"
            variants={{
              initial: { scale: 1 },
              hover: {
                scale: [1, 1.2, 1],
                transition: {
                  duration: 0.6,
                  ease: "easeOut",
                  delay: 0.1,
                  repeat: Infinity,
                  repeatDelay: 0.5,
                },
              },
            }}
          />
          <motion.div
            className="w-2 h-2 bg-gray-600"
            variants={{
              initial: { scale: 1 },
              hover: {
                scale: [1, 1.2, 1],
                transition: {
                  duration: 0.6,
                  ease: "easeOut",
                  delay: 0.2,
                  repeat: Infinity,
                  repeatDelay: 0.5,
                },
              },
            }}
          />
        </div>
      </div>
      <div className="border border-gray-200  px-4 py-4 rounded-xl w-56 flex flex-col gap-4 bg-white z-1">
        <div className="flex justify-between items-center">
          <div className="text-base text-black font-medium">Free trial</div>
          <div className="text-xs text-gray-500">
            {daysRemaining === 1 ? "1 day left" : `${daysRemaining} days left`}
          </div>
          {/* upgrade button */}
        </div>
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="cursor-pointer text-sm bg-zinc-800 text-white py-2 px-4 rounded-lg"
          onClick={async () => {
            try {
              toast.success("Opening billing portal", {
                icon: <Loader2 className="w-4 h-4 animate-spin" />,
              });
              await openBillingPortal({
                returnUrl:
                  process.env.NODE_ENV === "development"
                    ? "http://localhost:3000/"
                    : "https://notes0.app/",
              });
            } catch (error) {
              console.error("Failed to open billing portal:", error);
            }
          }}
        >
          Upgrade
        </motion.button>
      </div>
    </motion.div>
  );
}

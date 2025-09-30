import { feature, product, featureItem, priceItem } from "atmn";

// Features for the Notes App
export const voiceAgentAccess = feature({
  id: "voice_agent_access",
  name: "Voice Agent Access",
  type: "boolean",
});

export const collaborativeCanvas = feature({
  id: "collaborative_canvas",
  name: "Collaborative Canvas",
  type: "boolean",
});

export const realtimeUpdates = feature({
  id: "realtime_updates",
  name: "Real-time Updates",
  type: "boolean",
});

// Pro Product with 2-day free trial
export const proPlan = product({
  id: "pro",
  name: "Pro",
  items: [
    // Monthly subscription price
    priceItem({
      price: 20, // $20 per month
      interval: "month",
    }),

    // Core Pro features
    featureItem({
      feature_id: voiceAgentAccess.id,
    }),

    featureItem({
      feature_id: collaborativeCanvas.id,
    }),

    featureItem({
      feature_id: realtimeUpdates.id,
    }),
  ],
  free_trial: {
    duration: "day",
    length: 3, // 2-day free trial
    unique_fingerprint: false,
    card_required: false,
  },
});

// Export the configuration
export default {
  products: [proPlan],
  features: [voiceAgentAccess, collaborativeCanvas, realtimeUpdates],
};

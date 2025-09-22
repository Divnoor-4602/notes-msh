// Configure OpenAI Agents SDK for browser use
import { setDefaultOpenAIClient } from "@openai/agents";
import { OpenAI } from "openai";

// ⚠️ DEVELOPMENT ONLY - DO NOT USE IN PRODUCTION
console.warn(
  "⚠️ WARNING: Running OpenAI agents in browser with dangerouslyAllowBrowser=true"
);
console.warn(
  "🚨 This exposes your API key to client-side code - FOR DEVELOPMENT ONLY!"
);

// Create OpenAI client with dangerouslyAllowBrowser flag for development
const openaiClient = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || "",
  dangerouslyAllowBrowser: true, // ⚠️ DEVELOPMENT ONLY - Never use in production!
});

// Set the default OpenAI client for the agents SDK
setDefaultOpenAIClient(openaiClient);

console.log("✅ OpenAI Agents SDK configured for browser (DEVELOPMENT MODE)");

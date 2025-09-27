import { NextResponse } from "next/server";

// Minimal types for the OpenAI Realtime API
interface RealtimeSessionConfig {
  session: {
    type: string;
    model: string;
    audio: {
      output: {
        voice: string;
      };
    };
  };
}

interface OpenAITokenResponse {
  value: string;
}

interface ErrorResponse {
  error: string;
}

const sessionConfig: RealtimeSessionConfig = {
  session: {
    type: "realtime",
    model: "gpt-realtime-2025-08-28",
    audio: {
      output: {
        voice: "alloy",
      },
    },
  },
};

export async function GET(): Promise<NextResponse<OpenAITokenResponse | ErrorResponse>> {
  try {
    // Validate OpenAI API key exists
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OpenAI API key not found in environment variables");
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    // Make request to OpenAI Realtime API
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sessionConfig),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      return NextResponse.json({ error: "Failed to generate token from OpenAI" }, { status: response.status });
    }

    const data = await response.json();

    // Log token for debugging
    console.log("Generated ephemeral token:");

    return NextResponse.json(data);
  } catch (error) {
    console.error("Token generation error:", error);
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500 });
  }
}

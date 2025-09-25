import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Application-level timeout (30 seconds)
const REQUEST_TIMEOUT_MS = 30000;
const MAX_RETRIES = 5;

// AbortController map for cancelling stale requests
const activeRequests = new Map<string, AbortController>();

// endpoint for the OpenAI Responses API with timeout, retry, and abort logic
export async function POST(req: NextRequest) {
  // Generate unique request ID for tracking
  const requestId = Math.random().toString(36).substring(7);
  const abortController = new AbortController();
  activeRequests.set(requestId, abortController);

  try {
    const tReceived = Date.now();
    const body = await req.json();

    // Cancel any older requests if this is a newer transcript
    if (body.isNewerTranscript) {
      activeRequests.forEach((controller, id) => {
        if (id !== requestId) {
          controller.abort();
          activeRequests.delete(id);
        }
      });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await structuredResponse(
      openai,
      body,
      tReceived,
      requestId,
      abortController
    );
    return res;
  } catch (error) {
    console.error("Error in POST handler:", error);
    activeRequests.delete(requestId);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

async function structuredResponse(
  openai: OpenAI,
  body: any,
  tReceived: number,
  requestId: string,
  abortController: AbortController
) {
  let lastError: any;
  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    try {
      const tBefore = Date.now();
      console.log(`[responses] attempt ${attempt + 1}`, {
        requestId,
        model: body.model,
      });

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        const timeoutId = setTimeout(() => {
          abortController.abort();
          reject(new Error(`Request timeout after ${REQUEST_TIMEOUT_MS}ms`));
        }, REQUEST_TIMEOUT_MS);

        // Clear timeout if request completes
        abortController.signal.addEventListener("abort", () => {
          clearTimeout(timeoutId);
        });
      });

      // Make OpenAI request with abort signal (remove custom parameters)
      const { isNewerTranscript, ...openaiBody } = body;
      const openaiPromise = openai.responses.parse(
        {
          ...openaiBody,
          stream: false,
        },
        {
          signal: abortController.signal,
        }
      );

      const response = (await Promise.race([
        openaiPromise,
        timeoutPromise,
      ])) as any;

      const tAfter = Date.now();
      const durationMs = tAfter - tBefore;
      const endToEndMs = tAfter - tReceived;

      // Count function calls in response
      const outputItems = response.output || [];
      const functionCallCount = outputItems.filter(
        (item: any) => item.type === "function_call"
      ).length;

      console.log("[responses] success", {
        requestId,
        durationMs,
        totalTokens: response.usage?.total_tokens,
      });

      // Clean up
      activeRequests.delete(requestId);
      return NextResponse.json(response);
    } catch (attemptError) {
      lastError = attemptError;
      attempt++;

      // Don't retry on abort or certain errors
      if (abortController.signal.aborted) {
        activeRequests.delete(requestId);
        return NextResponse.json(
          { error: "Request cancelled" },
          { status: 499 }
        );
      }

      // Don't retry on 4xx errors (client errors)
      if (attemptError instanceof Error && "response" in attemptError) {
        const errorResponse = (attemptError as any).response;
        if (
          errorResponse?.status &&
          errorResponse.status >= 400 &&
          errorResponse.status < 500
        ) {
          console.error(`[responses] client error ${errorResponse.status}`, {
            requestId,
          });
          break;
        }
      }

      if (attempt <= MAX_RETRIES) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[responses] retry ${attempt} in ${backoffMs}ms`, {
          requestId,
        });
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  // All retries exhausted
  console.error("[responses] all retries exhausted", { requestId, lastError });
  activeRequests.delete(requestId);

  // Log rate limit headers if available
  if (lastError instanceof Error && "response" in lastError) {
    const response = (lastError as any).response;
    if (response?.headers) {
      console.error("[responses] rate-limit headers:", {
        requestId,
        limitRequests: response.headers.get?.("x-ratelimit-limit-requests"),
        remainingRequests: response.headers.get?.(
          "x-ratelimit-remaining-requests"
        ),
        resetRequests: response.headers.get?.("x-ratelimit-reset-requests"),
        limitTokens: response.headers.get?.("x-ratelimit-limit-tokens"),
        remainingTokens: response.headers.get?.("x-ratelimit-remaining-tokens"),
        resetTokens: response.headers.get?.("x-ratelimit-reset-tokens"),
      });
    }
  }

  return NextResponse.json(
    { error: "Failed to get response from OpenAI after retries" },
    { status: 500 }
  );
}

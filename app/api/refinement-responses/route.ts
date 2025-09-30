import { NextRequest, NextResponse } from "next/server";
import { Agent, run } from "@openai/agents";
import { getRefinementAgentConfig } from "@/lib/agent/refinementAgent";
import type { CreateAgentOptions } from "@/lib/validations/tool.schema";
import { getToken } from "@/lib/auth/auth-server";
import { fetchAction } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

// TODO: Import proper OpenAI client configuration when ready
// TODO: Import context providers when ready
// TODO: Import guardrails when ready

export async function POST(request: NextRequest) {
  try {
    // Get authentication token
    const token = await getToken();

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check Autumn access for collaborative canvas via Convex
    const accessResult = await fetchAction(
      api.autumn.check,
      { featureId: "collaborative_canvas" },
      { token }
    );

    if (accessResult.error || !accessResult.data?.allowed) {
      return NextResponse.json(
        { error: "Pro access required for canvas refinement" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Extract request parameters
    const {
      input,
      agentOptions = {},
      runOptions = {},
      // TODO: Add context when ready
      // TODO: Add stream support when ready
    } = body;

    // TODO: Validate input parameters when ready
    // TODO: Apply input guardrails when ready

    // Get agent configuration
    const agentConfig = getRefinementAgentConfig(
      agentOptions as CreateAgentOptions
    );

    // Create the refinement agent
    const agent = new Agent({
      ...agentConfig,
      // TODO: Add output type when ready
      // TODO: Add model settings when ready
      // TODO: Add custom instructions when ready
    });

    // TODO: Prepare context for agent when ready
    // const context = await prepareRefinementContext();

    // Run the agent
    const result = await run(agent, input, {
      // TODO: Add run configuration when ready
      // TODO: Add streaming when ready
      // TODO: Add interruption handling when ready
      ...runOptions,
    });

    // TODO: Apply output guardrails when ready
    // TODO: Process and validate result when ready
    // TODO: Format response according to requirements when ready

    // Return the result
    return NextResponse.json({
      success: true,
      finalOutput: result.finalOutput,
      output: result.output,
      newItems: result.newItems,
      state: result.state,
      lastAgent: result.lastAgent?.name,
      // TODO: Add more result properties when needed
      // TODO: Add usage information when ready
      // TODO: Add tracing information when ready
    });
  } catch (error) {
    console.error("Refinement agent error:", error);

    // TODO: Add proper error classification when ready
    // TODO: Add error logging/monitoring when ready

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to run refinement agent",
        // TODO: Add error codes when ready
        // TODO: Add error details for debugging when ready
      },
      { status: 500 }
    );
  }
}

// TODO: Add GET method for agent status/health check when ready
// TODO: Add OPTIONS method for CORS when ready
// TODO: Add rate limiting when ready
// TODO: Add authentication when ready

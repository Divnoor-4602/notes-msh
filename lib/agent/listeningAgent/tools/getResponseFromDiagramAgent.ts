import {
  GetResponseFromDiagramAgentParameterSchema,
  type RegisteredTool,
} from "@/lib/validations/tool.schema";
import { tool } from "@openai/agents";
import { DIAGRAM_AGENT_PROMPT } from "../prompts";
import {
  fetchResponsesMessage,
  diagrammingAgentTools,
  handleToolCalls,
  extractMermaidCode,
} from "./utils";
import { getCanvasStore } from "@/lib/store/canvasStore";
import { validateMermaid, ruleLint } from "./diagramAgentTools";

// tool definition for the diagramming agent:
export const diagrammingAgentTool = [];

// tool to get a response from the diagram agent for micro-updates
const getResponseFromDiagramAgentTool = tool({
  name: "get_response_from_diagram_agent",
  description: "Get a response from the diagram agent",
  parameters: GetResponseFromDiagramAgentParameterSchema,
  execute: async ({ fullTranscript, currentMermaidCode, recentContext }) => {
    // Get current mermaid code as source of truth
    const sourceMermaidCode =
      currentMermaidCode || getCanvasStore().getCurrentMermaidCode() || "";

    // form body for using the response api
    const body: {
      model: string;
      instructions: string;
      input: Array<{
        type: string;
        role?: string;
        content?: string;
        call_id?: string;
        name?: string;
        arguments?: string;
        output?: string;
      }>;
      tools: unknown[];
    } = {
      model: "gpt-4.1-mini",
      instructions: DIAGRAM_AGENT_PROMPT,
      input: [
        {
          type: "message",
          role: "user",
          content: `=====Full Conversation Transcript=======
          ${fullTranscript}

          =====Current Mermaid Code (Source of Truth)=====
          ${
            sourceMermaidCode
              ? `\`\`\`mermaid\n${sourceMermaidCode}\n\`\`\``
              : "No existing diagram"
          }

          =====Recent Context=======
          ${recentContext || "No recent context"}`,
        },
      ],
      tools: diagrammingAgentTools,
    };

    const response = await fetchResponsesMessage(body);
    if (response.error) {
      return { error: "Something went wrong." };
    }

    const finalText = await handleToolCalls(body, response);
    if (
      typeof finalText === "object" &&
      finalText !== null &&
      "error" in finalText
    ) {
      return { error: "Something went wrong." };
    }

    // Extract Mermaid code from final text
    const mermaidCode = extractMermaidCode(finalText as string);

    if (!mermaidCode) {
      return {
        error: "No Mermaid code found in final text",
        finalText: finalText as string,
      };
    }

    // Local validation with retry logic
    let finalMermaidCode = mermaidCode;
    let validationAttempt = 0;
    const maxRetries = 5;

    while (validationAttempt < maxRetries) {
      try {
        // Step 1: Rule lint validation
        const ruleLintResult = ruleLint({
          mermaid: finalMermaidCode,
          directionDefault: "TD",
        });

        if (!ruleLintResult.ok) {
          const violations = ruleLintResult.violations
            .map(
              (v) => `${v.code}: ${v.message}${v.hint ? ` (${v.hint})` : ""}`
            )
            .join("; ");

          if (validationAttempt === maxRetries - 1) {
            return {
              error: "Rule lint validation failed after 5 attempts",
              details: violations,
              mermaidCode: finalMermaidCode,
            };
          }

          // Retry with LLM to fix violations
          const retryBody = {
            model: "gpt-4.1-mini",
            instructions: `Fix the following Mermaid diagram violations and return only the corrected mermaid code block:\n\nViolations: ${violations}\n\nOriginal code:\n${finalMermaidCode}`,
            input: [
              {
                type: "message",
                role: "user",
                content:
                  "Please fix the violations and return only a corrected ```mermaid code block.",
              },
            ],
            tools: [],
          };

          const retryResponse = await fetchResponsesMessage(retryBody);
          const retryText = await handleToolCalls(retryBody, retryResponse);
          const retryMermaidCode = extractMermaidCode(retryText as string);

          if (!retryMermaidCode) {
            return {
              error: "Failed to extract corrected Mermaid code from LLM retry",
              details: violations,
              mermaidCode: finalMermaidCode,
            };
          }

          finalMermaidCode = retryMermaidCode;
          validationAttempt++;
          continue;
        }

        // Step 2: ID validation - REMOVED (using mermaid code as source of truth)
        // No ID validation needed since we use mermaid code as the source of truth

        // Step 2: Final Mermaid syntax validation (renumbered after removing ID validation)
        const validationResult = await validateMermaid(finalMermaidCode);

        if (!validationResult.success || !validationResult.valid) {
          const error =
            validationResult.error ||
            validationResult.message ||
            "Unknown validation error";

          if (validationAttempt === maxRetries - 1) {
            return {
              error: "Mermaid syntax validation failed after 5 attempts",
              details: error,
              mermaidCode: finalMermaidCode,
            };
          }

          // Retry with LLM to fix syntax issues
          const retryBody = {
            model: "gpt-4.1-mini",
            instructions: `Fix the following Mermaid syntax error and return only the corrected mermaid code block:\n\nSyntax Error: ${error}\n\nOriginal code:\n${finalMermaidCode}`,
            input: [
              {
                type: "message",
                role: "user",
                content:
                  "Please fix the syntax error and return only a corrected ```mermaid code block.",
              },
            ],
            tools: [],
          };

          const retryResponse = await fetchResponsesMessage(retryBody);
          const retryText = await handleToolCalls(retryBody, retryResponse);
          const retryMermaidCode = extractMermaidCode(retryText as string);

          if (!retryMermaidCode) {
            return {
              error:
                "Failed to extract corrected Mermaid code from syntax retry",
              details: error,
              mermaidCode: finalMermaidCode,
            };
          }

          finalMermaidCode = retryMermaidCode;
          validationAttempt++;
          continue;
        }

        // All validations passed!
        break;
      } catch (validationError) {
        console.error("Validation error:", validationError);
        if (validationAttempt === maxRetries - 1) {
          return {
            error: "Validation error after 5 attempts",
            details:
              validationError instanceof Error
                ? validationError.message
                : "Unknown validation error",
            mermaidCode: finalMermaidCode,
          };
        }
        validationAttempt++;
      }
    }

    // Add the validated Mermaid diagram directly to the canvas
    try {
      await getCanvasStore().addMermaidDiagram(finalMermaidCode);
      return {
        success: true,
        message: "Diagram added to canvas successfully",
        mermaidCode: finalMermaidCode,
      };
    } catch (error) {
      return {
        error: "Failed to add diagram to canvas",
        details: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

export const getResponseFromDiagramAgent: RegisteredTool = {
  tool: getResponseFromDiagramAgentTool,
  docs: {
    name: "get_response_from_diagram_agent",
    summary: "Create or update diagram based on conversation context",
    usage:
      "Call with { fullTranscript, currentMermaidCode, recentContext } when ready to create/update diagram.",
  },
  category: "meta",
};

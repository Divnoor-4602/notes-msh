/* eslint-disable */
import { DIAGRAM_AGENT_PROMPT } from "../lib/agent/listeningAgent/prompts";
import {
  diagrammingAgentTools,
  handleToolCalls,
} from "../lib/agent/listeningAgent/tools/utils";
import { Window } from "happy-dom";

// Modified version of fetchResponsesMessage that uses full URL for Node.js testing
async function fetchResponsesMessageWithFullURL(body: any) {
  const response = await fetch("http://localhost:3000/api/diagram-responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    // Preserve the previous behaviour of forcing sequential tool calls.
    body: JSON.stringify({ ...body, parallel_tool_calls: false }),
  });

  if (!response.ok) {
    console.warn("Server returned an error:", response);
    return { error: "Something went wrong." };
  }

  const completion = await response.json();
  return completion;
}

// Modified version of handleToolCalls that uses full URL for Node.js testing
async function handleToolCallsWithFullURL(
  body: any,
  response: any,
  addBreadcrumb?: (title: string, data?: any) => void
) {
  let currentResponse = response;

  while (true) {
    if (currentResponse?.error) {
      return { error: "Something went wrong." } as any;
    }

    const outputItems: any[] = currentResponse.output ?? [];

    // Gather all function calls in the output.
    const functionCalls = outputItems.filter(
      (item) => item.type === "function_call"
    );

    if (functionCalls.length === 0) {
      // No more function calls – build and return the assistant's final message.
      const assistantMessages = outputItems.filter(
        (item) => item.type === "message"
      );

      const finalText = assistantMessages
        .map((msg: any) => {
          const contentArr = msg.content ?? [];
          return contentArr
            .filter((c: any) => c.type === "output_text")
            .map((c: any) => c.text)
            .join("");
        })
        .join("");

      return finalText;
    }

    // For each function call returned by the model, execute it locally and append its
    // output to the request body as a `function_call_output` item.
    for (const toolCall of functionCalls) {
      const fName = toolCall.name;
      const args = JSON.parse(toolCall.arguments || "{}");

      // Handle tool response locally
      const toolRes = await getToolResponse(fName, args);

      // Since we're using a local function, we don't need to add our own breadcrumbs
      if (addBreadcrumb) {
        addBreadcrumb(`[Diagram agent] function call: ${fName}`, args);
      }
      if (addBreadcrumb) {
        addBreadcrumb(
          `[Diagram agent] function call result: ${fName}`,
          toolRes
        );
      }

      // Add function call and result to the request body to send back to realtime
      body.input.push(
        {
          type: "function_call",
          call_id: toolCall.call_id,
          name: toolCall.name,
          arguments: toolCall.arguments,
        },
        {
          type: "function_call_output",
          call_id: toolCall.call_id,
          output: JSON.stringify(toolRes),
        }
      );
    }

    // Make the follow-up request including the tool outputs using full URL
    currentResponse = await fetchResponsesMessageWithFullURL(body);
  }
}

// Helper function to handle tool responses (copied from utils.ts)
async function getToolResponse(fName: string, args?: any) {
  switch (fName) {
    case "validate_mermaid":
      return await handleValidateMermaid(args);
    case "validate_ids":
      return handleValidateIds(args);
    case "rule_lint":
      return handleRuleLint(args);
    default:
      return true;
  }
}

// Helper function to handle validate_mermaid tool calls
async function handleValidateMermaid(args: any) {
  if (args?.mermaid_code) {
    const { validateMermaid } = await import(
      "../lib/agent/listeningAgent/tools/diagramAgentTools"
    );
    return await validateMermaid(args.mermaid_code);
  }
  return { success: false, error: "Missing mermaid_code parameter" };
}

// Helper function to handle validate_ids tool calls
function handleValidateIds(args: any) {
  if (!args?.diagram_elements && !args?.mermaid_code) {
    return {
      success: false,
      error: "Missing diagram_elements or mermaid_code parameter",
    };
  }

  try {
    const {
      validateIds,
    } = require("../lib/agent/listeningAgent/tools/diagramAgentTools");
    const input = {
      mermaid: args.mermaid_code || args.diagram_elements,
      usedNodeIds: args.usedNodeIds || [],
      usedEdgeIds: args.usedEdgeIds || [],
      labelToId: args.labelToId || {},
      reservedIds: args.reservedIds || [],
      idPattern: args.idPattern ? new RegExp(args.idPattern) : undefined,
      generateEdgeIds: args.generateEdgeIds || false,
    };

    return validateIds(input);
  } catch (error) {
    return {
      success: false,
      error: `Validation failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

// Helper function to handle rule_lint tool calls
function handleRuleLint(args: any) {
  if (!args?.diagram_content) {
    return {
      ok: false,
      violations: [
        {
          code: "EXTRA_TEXT",
          message: "Missing diagram_content parameter",
          severity: "error",
        },
      ],
    };
  }

  const {
    ruleLint,
  } = require("../lib/agent/listeningAgent/tools/diagramAgentTools");
  const input = {
    mermaid: args.diagram_content,
    disallowedFeatures: args.disallowed_features,
    limits: args.limits,
    directionDefault: args.direction_default || "TD",
  };

  return ruleLint(input);
}

// Polyfill DOM for Node.js environment
function injectDOMPolyfill(context: any) {
  const window = new Window();

  for (const key of Object.getOwnPropertyNames(window)) {
    if (key in context) continue;
    try {
      context[key] = (window as any)[key];
    } catch (error) {
      // Ignore errors for properties that can't be set
    }
  }
}

// Inject DOM polyfill before importing mermaid
injectDOMPolyfill(globalThis);

// Mock canvas context data (similar to what would come from getCanvasStore().getCanvasContext())
const mockCanvasContext = {
  nodes: [
    {
      id: "node1",
      type: "rectangle",
      label: "Existing Node",
      position: { x: 100, y: 100 },
      size: { width: 120, height: 60 },
      isSpecial: false,
      connections: { incoming: [], outgoing: ["edge1"] },
    },
  ],
  edges: [
    {
      id: "edge1",
      source: "node1",
      target: "node2",
      label: "connects to",
      type: "arrow",
      points: [
        { x: 160, y: 130 },
        { x: 200, y: 130 },
      ],
    },
  ],
  subgraphs: [],
  textElements: [],
  usedNodeIds: ["node1", "node2"],
  usedEdgeIds: ["edge1"],
  labelToId: { "Existing Node": "node1" },
  reservedIds: ["canvas", "root"],
};

// Test parameters matching exactly what's used in getResponseFromDiagramAgent.ts
const currentChunkText =
  "Create a simple flowchart showing the user login process";
const recentContext =
  "User wants to add a login flow diagram to the existing canvas";

// Create the exact body structure from getResponseFromDiagramAgent.ts
const body: any = {
  model: "gpt-4.1",
  instructions: DIAGRAM_AGENT_PROMPT,
  input: [
    {
      type: "message",
      role: "user",
      content: `=====Current sentences text=======
      ${currentChunkText}

      =====Recent sentences context =======
      Recent context: ${recentContext}`,
    },
    {
      type: "function_call",
      call_id: "canvas_context_call",
      name: "get_current_canvas_context",
      arguments: "{}",
    },
    {
      type: "function_call_output",
      call_id: "canvas_context_call",
      output: JSON.stringify({
        success: true,
        context: mockCanvasContext,
      }),
    },
  ],
  tools: diagrammingAgentTools,
};

async function testGetResponseFromDiagramAgent() {
  console.log("Testing getResponseFromDiagramAgent flow...");
  console.log("Request body structure:");
  console.log(JSON.stringify(body, null, 2));

  try {
    // Step 1: Make the initial API call (same as getResponseFromDiagramAgent.ts)
    console.log("\n=== STEP 1: INITIAL API CALL ===");
    const response = await fetchResponsesMessageWithFullURL(body);

    if (response.error) {
      console.error("❌ Initial API call failed:", response.error);
      return;
    }

    console.log("✅ Initial API call successful");
    console.log("Response:", JSON.stringify(response, null, 2));

    // Step 2: Process tool calls iteratively (same as getResponseFromDiagramAgent.ts)
    console.log("\n=== STEP 2: PROCESSING TOOL CALLS ===");
    console.log(
      "Using handleToolCalls to process all tool calls iteratively..."
    );

    const finalText = await handleToolCallsWithFullURL(body, response);

    if ((finalText as any)?.error) {
      console.error("❌ Tool calls processing failed:", finalText);
      return;
    }

    console.log("✅ Tool calls processing successful");
    console.log("\n=== FINAL TEXT ANALYSIS ===");
    console.log("Final text type:", typeof finalText);
    console.log("Final text length:", finalText?.length || 0);
    console.log("Final text content:");
    console.log("--- START FINAL TEXT ---");
    console.log(finalText);
    console.log("--- END FINAL TEXT ---");

    // Step 3: Analyze the final text to extract Mermaid code
    console.log("\n=== STEP 3: MERMAID CODE EXTRACTION ===");

    if (typeof finalText === "string" && finalText) {
      // Method 1: Look for Mermaid code blocks
      console.log("\n--- Method 1: Looking for Mermaid code blocks ---");
      const mermaidCodeBlockMatch = finalText.match(
        /```mermaid\n([\s\S]*?)\n```/
      );
      if (mermaidCodeBlockMatch) {
        const mermaidCode = mermaidCodeBlockMatch[1];
        console.log("✅ Found Mermaid code in code block!");
        console.log("Mermaid code:");
        console.log("```mermaid");
        console.log(mermaidCode);
        console.log("```");

        // Clean the Mermaid code
        const cleanMermaidCode = mermaidCode.trim().replace(/\\n/g, "\n");
        console.log("\nCleaned Mermaid code:");
        console.log("```mermaid");
        console.log(cleanMermaidCode);
        console.log("```");

        return {
          success: true,
          mermaidCode: cleanMermaidCode,
          extractionMethod: "code_block",
          finalText: finalText,
        };
      } else {
        console.log("❌ No Mermaid code block found");
      }

      // Method 2: Look for Mermaid code without code blocks
      console.log("\n--- Method 2: Looking for raw Mermaid code ---");
      const mermaidDirectMatch = finalText.match(
        /^(flowchart|graph)\s+(TD|TB|LR|RL|BT)/m
      );
      if (mermaidDirectMatch) {
        console.log("✅ Found direct Mermaid code!");
        console.log("Raw Mermaid code:");
        console.log(finalText);

        // Clean the Mermaid code
        const cleanMermaidCode = finalText.trim().replace(/\\n/g, "\n");
        console.log("\nCleaned Mermaid code:");
        console.log("```mermaid");
        console.log(cleanMermaidCode);
        console.log("```");

        return {
          success: true,
          mermaidCode: cleanMermaidCode,
          extractionMethod: "direct",
          finalText: finalText,
        };
      } else {
        console.log("❌ No direct Mermaid code found");
      }

      // Method 3: Check if entire text is Mermaid code
      console.log("\n--- Method 3: Checking if entire text is Mermaid ---");
      const lines = finalText.split("\n");
      const firstLine = lines[0]?.trim();
      if (
        firstLine &&
        (firstLine.startsWith("flowchart") || firstLine.startsWith("graph"))
      ) {
        console.log("✅ Entire text appears to be Mermaid code!");
        console.log("Mermaid code:");
        console.log("```mermaid");
        console.log(finalText);
        console.log("```");

        // Clean the Mermaid code
        const cleanMermaidCode = finalText.trim().replace(/\\n/g, "\n");
        console.log("\nCleaned Mermaid code:");
        console.log("```mermaid");
        console.log(cleanMermaidCode);
        console.log("```");

        return {
          success: true,
          mermaidCode: cleanMermaidCode,
          extractionMethod: "entire_text",
          finalText: finalText,
        };
      } else {
        console.log("❌ Text does not start with flowchart/graph");
      }

      // Method 4: Search for any Mermaid-like patterns
      console.log("\n--- Method 4: Searching for Mermaid patterns ---");
      const mermaidPatterns = [
        /flowchart\s+(TD|TB|LR|RL|BT)/i,
        /graph\s+(TD|TB|LR|RL|BT)/i,
        /-->|==>|---/,
        /\([^)]*\)|\[[^\]]*\]|\{[^}]*\}/,
      ];

      let foundPatterns = 0;
      mermaidPatterns.forEach((pattern, index) => {
        if (pattern.test(finalText)) {
          foundPatterns++;
          console.log(`✅ Found pattern ${index + 1}: ${pattern}`);
        }
      });

      if (foundPatterns >= 2) {
        console.log(
          `✅ Found ${foundPatterns} Mermaid patterns - likely Mermaid code`
        );
        console.log("Attempting to extract...");

        // Try to extract the Mermaid part
        const lines = finalText.split("\n");
        let mermaidLines = [];
        let inMermaidSection = false;

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.match(/^(flowchart|graph)\s+(TD|TB|LR|RL|BT)/i)) {
            inMermaidSection = true;
            mermaidLines.push(line);
          } else if (
            inMermaidSection &&
            (trimmedLine.includes("-->") ||
              trimmedLine.includes("==>") ||
              trimmedLine.includes("---") ||
              trimmedLine.match(/\([^)]*\)|\[[^\]]*\]|\{[^}]*\}/))
          ) {
            mermaidLines.push(line);
          } else if (inMermaidSection && trimmedLine === "") {
            mermaidLines.push(line);
          } else if (inMermaidSection && !trimmedLine) {
            // Empty line, continue
            mermaidLines.push(line);
          } else if (inMermaidSection) {
            // End of Mermaid section
            break;
          }
        }

        if (mermaidLines.length > 0) {
          const extractedMermaid = mermaidLines.join("\n");
          console.log("✅ Extracted Mermaid code:");
          console.log("```mermaid");
          console.log(extractedMermaid);
          console.log("```");

          return {
            success: true,
            mermaidCode: extractedMermaid.trim(),
            extractionMethod: "pattern_extraction",
            finalText: finalText,
          };
        }
      } else {
        console.log(
          `❌ Only found ${foundPatterns} Mermaid patterns - likely not Mermaid code`
        );
      }

      console.log("\n❌ No Mermaid code could be extracted from final text");
      console.log("Final text analysis:");
      console.log("- Contains code blocks:", finalText.includes("```"));
      console.log("- Contains flowchart:", finalText.includes("flowchart"));
      console.log("- Contains graph:", finalText.includes("graph"));
      console.log("- Contains arrows:", finalText.includes("-->"));
      console.log("- Contains parentheses:", finalText.includes("("));

      return {
        success: false,
        error: "No Mermaid code found in final text",
        finalText: finalText,
      };
    } else {
      console.log("❌ Final text is not a string or is empty");
      return {
        success: false,
        error: "Final text is not a string or is empty",
        finalText: finalText,
      };
    }
  } catch (error) {
    console.error("❌ Test failed with error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Run the test
console.log("Starting getResponseFromDiagramAgent test...");
console.log(
  "Make sure your Next.js development server is running on localhost:3000"
);
console.log(
  "Make sure you have OPENAI_API_KEY set in your environment variables"
);
console.log("\n" + "=".repeat(50) + "\n");

testGetResponseFromDiagramAgent()
  .then((result) => {
    console.log("\n" + "=".repeat(50));
    console.log("Test completed!");
    if (result) {
      console.log("Final result:", JSON.stringify(result, null, 2));
    }
  })
  .catch((error) => {
    console.error("Test execution failed:", error);
  });

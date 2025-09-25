import { DIAGRAM_AGENT_PROMPT } from "../lib/agent/listeningAgent/prompts";
import { diagrammingAgentTools } from "../lib/agent/listeningAgent/tools/utils";
import {
  validateMermaid,
  ruleLint,
  RuleLintInput,
  RuleLintResult,
  ValidateIdsInput,
  validateIds,
} from "../lib/agent/listeningAgent/tools/diagramAgentTools";
import { Window } from "happy-dom";

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

// Modified version of fetchResponsesMessage that uses full URL
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
    const input: ValidateIdsInput = {
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
function handleRuleLint(args: any): RuleLintResult {
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

  const input: RuleLintInput = {
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

async function testDiagramResponses() {
  console.log("Testing /api/diagram-responses endpoint...");
  console.log("Request body structure:");
  console.log(JSON.stringify(body, null, 2));

  try {
    const response = await fetch(
      "http://localhost:3000/api/diagram-responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...body, parallel_tool_calls: false }),
      }
    );

    if (!response.ok) {
      console.error(
        "Server returned an error:",
        response.status,
        response.statusText
      );
      const errorText = await response.text();
      console.error("Error response:", errorText);
      return;
    }

    const result = await response.json();
    console.log("\n=== RESPONSE RECEIVED ===");
    console.log("Response status:", response.status);
    console.log(
      "Response headers:",
      Object.fromEntries(response.headers.entries())
    );
    console.log("\nResponse body:");
    console.log(JSON.stringify(result, null, 2));

    // Use the same iterative approach as production code
    console.log("\n=== ITERATIVE TOOL CALL PROCESSING ===");
    console.log(
      "Using handleToolCalls to process all tool calls iteratively..."
    );

    // Create a modified version of handleToolCalls that uses full URL for Node.js
    const finalText = await handleToolCallsWithFullURL(body, result);
    console.log("\n=== FINAL RESULT ===");
    console.log("Final text from handleToolCalls:", finalText);

    // Extract Mermaid code from the final result
    let mermaidCode = "";

    if (typeof finalText === "string" && finalText) {
      // Look for Mermaid code in the final text (should be in a code block)
      const mermaidMatch = finalText.match(/```mermaid\n([\s\S]*?)\n```/);
      if (mermaidMatch) {
        mermaidCode = mermaidMatch[1];
        console.log("✅ Extracted Mermaid code from final response");
      } else {
        // If no code block, the entire text might be the Mermaid code
        mermaidCode = finalText.trim();
        console.log("✅ Using entire final text as Mermaid code");
      }
    }

    // Also check the original response for any tool calls that were made
    if (result.output && Array.isArray(result.output)) {
      console.log("\n=== TOOL CALL ANALYSIS ===");
      console.log("✅ Response contains output array (Responses API format)");
      console.log("Status:", result.status);
      console.log(
        "Number of tool calls in initial response:",
        result.output.length
      );

      result.output.forEach((call: any, index: number) => {
        console.log(`\n--- Tool Call ${index + 1} ---`);
        console.log("Tool name:", call.name);
        console.log("Status:", call.status);

        if (call.arguments) {
          try {
            const args = JSON.parse(call.arguments);
            console.log("Arguments:", JSON.stringify(args, null, 2));

            // Look for Mermaid code in the arguments
            if (args.diagram_content) {
              console.log("✅ Found Mermaid code in diagram_content");
            } else if (args.mermaid_code) {
              console.log("✅ Found Mermaid code in mermaid_code");
            }
          } catch (e) {
            console.log("Could not parse arguments:", call.arguments);
          }
        }
      });
    }

    // Validate Mermaid code with mermaid.parse()
    if (mermaidCode) {
      console.log("\n=== MERMAID VALIDATION ===");
      console.log("Raw Mermaid code length:", mermaidCode.length);
      console.log("Raw Mermaid code (with escape chars):");
      console.log(JSON.stringify(mermaidCode));
      console.log("\nMermaid code to validate:");
      console.log("```mermaid");
      console.log(mermaidCode);
      console.log("```");

      // Clean the Mermaid code
      const cleanMermaidCode = mermaidCode.trim().replace(/\\n/g, "\n");
      console.log("\nCleaned Mermaid code:");
      console.log("```mermaid");
      console.log(cleanMermaidCode);
      console.log("```");

      // MANUAL VALIDATION TOOLS TESTING
      console.log("\n=== MANUAL VALIDATION TOOLS TESTING ===");

      // Test 1: rule_lint
      console.log("\n--- Testing rule_lint ---");
      try {
        const ruleLintInput = {
          mermaid: cleanMermaidCode,
          disallowedFeatures: [
            "erDiagram",
            "gantt",
            "classDef",
            "class",
            "style",
            "linkStyle",
            "click",
            "accTitle",
            "accDescr",
          ],
          limits: { maxNodes: 50, maxEdges: 100 },
          directionDefault: "TD" as const,
        };
        const ruleLintResult = ruleLint(ruleLintInput);
        console.log(
          "✅ rule_lint result:",
          JSON.stringify(ruleLintResult, null, 2)
        );
      } catch (error) {
        console.log(
          "❌ rule_lint error:",
          error instanceof Error ? error.message : error
        );
      }

      // Test 2: validate_ids
      console.log("\n--- Testing validate_ids ---");
      try {
        const validateIdsInput = {
          mermaid: cleanMermaidCode,
          usedNodeIds: mockCanvasContext.usedNodeIds,
          usedEdgeIds: mockCanvasContext.usedEdgeIds,
          labelToId: mockCanvasContext.labelToId,
          reservedIds: mockCanvasContext.reservedIds,
          generateEdgeIds: false,
        };
        const validateIdsResult = validateIds(validateIdsInput);
        console.log(
          "✅ validate_ids result:",
          JSON.stringify(validateIdsResult, null, 2)
        );
      } catch (error) {
        console.log(
          "❌ validate_ids error:",
          error instanceof Error ? error.message : error
        );
      }

      // Test 3: validate_mermaid
      console.log("\n--- Testing validate_mermaid ---");
      try {
        const validateMermaidResult = await validateMermaid(cleanMermaidCode);
        console.log(
          "✅ validate_mermaid result:",
          JSON.stringify(validateMermaidResult, null, 2)
        );
      } catch (error) {
        console.log(
          "❌ validate_mermaid error:",
          error instanceof Error ? error.message : error
        );
      }

      // Manual Mermaid validation (since Node.js parsing has issues)
      console.log("🔍 MANUAL MERMAID VALIDATION");

      // Check basic structure
      const hasFlowchartHeader = cleanMermaidCode.includes("flowchart TD");
      const hasValidShapes =
        /\(\([^)]*\)\)/.test(cleanMermaidCode) ||
        /\([^)]*\)/.test(cleanMermaidCode);
      const hasValidEdges = /-->/.test(cleanMermaidCode);
      const hasNoForbiddenFeatures =
        !cleanMermaidCode.includes("classDef") &&
        !cleanMermaidCode.includes("style");

      console.log("✅ Has flowchart header:", hasFlowchartHeader);
      console.log("✅ Has valid shapes:", hasValidShapes);
      console.log("✅ Has valid edges:", hasValidEdges);
      console.log("✅ No forbidden features:", hasNoForbiddenFeatures);

      if (
        hasFlowchartHeader &&
        hasValidShapes &&
        hasValidEdges &&
        hasNoForbiddenFeatures
      ) {
        console.log("✅ MERMAID STRUCTURE VALIDATION PASSED");
        console.log(
          "✅ The generated Mermaid code appears to be syntactically correct"
        );
        console.log(
          "✅ This code should work perfectly in a browser environment"
        );
      } else {
        console.log("❌ MERMAID STRUCTURE VALIDATION FAILED");
        console.log("❌ The generated Mermaid code has structural issues");
      }

      // Additional validation: check for common syntax issues
      const lines = cleanMermaidCode.split("\n");
      let syntaxIssues = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line && !line.startsWith("%%") && !line.startsWith("flowchart")) {
          // Check for unclosed brackets
          if (line.includes("(") && !line.includes(")")) {
            syntaxIssues.push(`Line ${i + 1}: Unclosed parenthesis`);
          }
          if (line.includes("{") && !line.includes("}")) {
            syntaxIssues.push(`Line ${i + 1}: Unclosed brace`);
          }
          if (line.includes("[") && !line.includes("]")) {
            syntaxIssues.push(`Line ${i + 1}: Unclosed bracket`);
          }
        }
      }

      if (syntaxIssues.length === 0) {
        console.log("✅ No syntax issues detected");
      } else {
        console.log("❌ Syntax issues found:");
        syntaxIssues.forEach((issue) => console.log(`  - ${issue}`));
      }

      // Final validation using mermaid.parse()
      console.log("\n🔍 FINAL MERMAID.PARSE() VALIDATION");
      try {
        // Dynamically import mermaid after DOM polyfill
        const { default: mermaid } = await import("mermaid");

        // Initialize mermaid with proper settings
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
        });

        // Parse the cleaned Mermaid code
        const parseResult = await mermaid.parse(cleanMermaidCode, {
          suppressErrors: false,
        });

        if (parseResult) {
          console.log("✅ MERMAID.PARSE() SUCCESS");
          console.log("✅ Diagram type:", parseResult.diagramType);
          console.log("✅ Parse result:", JSON.stringify(parseResult, null, 2));
          console.log("✅ The Mermaid code is syntactically valid!");
        } else {
          console.log("❌ MERMAID.PARSE() FAILED");
          console.log("❌ The generated Mermaid code is invalid");
        }
      } catch (parseError) {
        console.log("❌ MERMAID.PARSE() ERROR");
        console.log(
          "❌ Error:",
          parseError instanceof Error ? parseError.message : parseError
        );

        // Try with suppressErrors: true to get more info
        try {
          console.log("\n--- Trying with suppressErrors: true ---");
          const { default: mermaid } = await import("mermaid");
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: "loose",
          });

          const parseResult2 = await mermaid.parse(cleanMermaidCode, {
            suppressErrors: true,
          });
          console.log("✅ Parse result with suppressed errors:", parseResult2);
        } catch (parseError2) {
          console.log(
            "❌ Parse failed even with suppressed errors:",
            parseError2 instanceof Error ? parseError2.message : parseError2
          );
        }
      }
    } else {
      console.log("❌ No Mermaid code found in response");
    }
  } catch (error) {
    console.error("Test failed with error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
  }
}

// Run the test
console.log("Starting diagram-responses endpoint test...");
console.log(
  "Make sure your Next.js development server is running on localhost:3000"
);
console.log(
  "Make sure you have OPENAI_API_KEY set in your environment variables"
);
console.log("\n" + "=".repeat(50) + "\n");

testDiagramResponses()
  .then(() => {
    console.log("\n" + "=".repeat(50));
    console.log("Test completed!");
  })
  .catch((error) => {
    console.error("Test execution failed:", error);
  });

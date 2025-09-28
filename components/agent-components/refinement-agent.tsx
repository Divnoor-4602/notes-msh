"use client";

import React, { useState } from "react";
import { fetchRefinementResponse } from "../../lib/agent/refinementAgent/utils";

export default function RefinementAgent() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runRefinementAgent = async () => {
    try {
      setIsRunning(true);
      setError(null);
      setResult(null);

      // Prepare request for refinement agent API
      const request = {
        input:
          "Please analyze the current canvas and suggest layout improvements.",
        agentOptions: {
          // TODO: Configure agent options when ready
        },
        runOptions: {
          // TODO: Configure run options when ready
        },
      };

      // Fetch refinement response from API
      const response = await fetchRefinementResponse(request);

      console.log("Refinement agent response:", response);

      if (response.success) {
        // Extract the result from the response
        setResult(
          (response.finalOutput as string) || "Refinement analysis completed"
        );

        // TODO: Process additional response data when ready
        // TODO: Handle new items, state, etc.
      } else {
        throw new Error(response.error || "Unknown error occurred");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to run refinement agent"
      );
    } finally {
      setIsRunning(false);
    }
  };

  const clearResult = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="w-full">
      <div className="px-4 py-3 rounded-lg shadow-lg border bg-white">
        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium">Refinement Agent</div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={runRefinementAgent}
              disabled={isRunning}
              className={`px-3 py-1 rounded text-xs ${
                isRunning
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
            >
              {isRunning ? "Running..." : "Run Refinement"}
            </button>

            {(result || error) && (
              <button
                onClick={clearResult}
                className="px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Result Display */}
          {result && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="text-xs font-medium text-gray-700 mb-1">
                Refinement Result:
              </div>
              <div className="text-xs bg-gray-50 p-2 rounded border">
                <div className="text-gray-800">{result}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

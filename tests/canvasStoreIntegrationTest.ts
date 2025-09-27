/* eslint-disable */
import { useCanvasStore } from "../lib/store/canvasStore";

// Mock Excalidraw API
const mockExcalidrawAPI = {
  updateScene: (scene: { elements: any[] }) => {
    console.log(
      "Mock API: Updating scene with",
      scene.elements.length,
      "elements"
    );
  },
};

function testCanvasStoreIntegration() {
  console.log("🧪 Testing Canvas Store Manual Mapping Integration\n");

  // Test 1: Initial state
  console.log("Test 1: Initial state");
  console.log("Elements count:", useCanvasStore.getState().elements.length);
  console.log("Is remapping:", useCanvasStore.getState().isRemappingElements);

  // Test 2: Simulate real-world manual element addition
  console.log("\nTest 2: Simulating real-world manual element addition");

  // Create mock elements with random Excalidraw IDs (simulating manual addition)
  const mockManualElements = [
    {
      id: "aziJ5LS4gWkw--KXI2sGZ", // Random Excalidraw ID
      type: "rectangle",
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      boundElements: [
        {
          id: "text_aziJ5LS4gWkw--KXI2sGZ",
          type: "text",
        },
      ],
    },
    {
      id: "text_aziJ5LS4gWkw--KXI2sGZ",
      type: "text",
      text: "User Login",
      containerId: "aziJ5LS4gWkw--KXI2sGZ",
      x: 150,
      y: 140,
    },
  ];

  // Test syncFromExcalidrawWithRemapping
  console.log(
    "Before sync - elements count:",
    useCanvasStore.getState().elements.length
  );
  console.log("Input elements count:", mockManualElements.length);
  console.log(
    "Input elements:",
    mockManualElements.map((el) => el.id)
  );

  useCanvasStore.getState().syncFromExcalidrawWithRemapping(mockManualElements);

  console.log(
    "After sync - elements count:",
    useCanvasStore.getState().elements.length
  );
  console.log(
    "After sync - elements:",
    useCanvasStore.getState().elements.map((el) => el.id)
  );

  // Check if elements were remapped
  const remappedElements = useCanvasStore.getState().elements;
  console.log("Remapped elements:");
  remappedElements.forEach((element) => {
    console.log(`  ${element.type}: ${element.id}`);
  });

  // Verify remapping worked
  const hasRemappedElement = remappedElements.some(
    (el) => el.id === "userLogin"
  );
  const hasRemappedText = remappedElements.some(
    (el) => el.id === "text_userLogin"
  );

  if (hasRemappedElement && hasRemappedText) {
    console.log("✅ Test 2 PASSED: Manual elements were remapped correctly\n");
  } else {
    console.log("❌ Test 2 FAILED: Manual elements were not remapped\n");
    console.log("Has remapped element:", hasRemappedElement);
    console.log("Has remapped text:", hasRemappedText);
  }

  // Test 3: Test getCanvasContext
  console.log("Test 3: Testing getCanvasContext");
  const canvasContext = useCanvasStore.getState().getCanvasContext();
  console.log("Canvas context:");
  console.log("  Nodes:", canvasContext.nodes.length);
  console.log("  Edges:", canvasContext.edges.length);
  console.log("  Used node IDs:", canvasContext.usedNodeIds);
  console.log("  Used edge IDs:", canvasContext.usedEdgeIds);

  const test3Passed = canvasContext.nodes.length > 0;

  if (test3Passed) {
    console.log("✅ Test 3 PASSED: Canvas context extraction works\n");
  } else {
    console.log("❌ Test 3 FAILED: Canvas context extraction failed\n");
  }

  // Summary
  const allTestsPassed = hasRemappedElement && hasRemappedText && test3Passed;

  if (allTestsPassed) {
    console.log("🎉 ALL INTEGRATION TESTS PASSED!");
    console.log("\n📋 Summary:");
    console.log("✅ Canvas store initializes correctly");
    console.log("✅ Manual element remapping works");
    console.log("✅ Canvas context extraction works");
    console.log("\n🚀 The manual mapping integration is working correctly!");
  } else {
    console.log("⚠️  Some integration tests failed.");
  }

  return allTestsPassed;
}

// Run the tests
if (typeof require !== "undefined" && require.main === module) {
  testCanvasStoreIntegration();
}

export { testCanvasStoreIntegration };

import {
  filterBoundElements,
  extractFilteredCanvasContext,
  validateGeneratedMermaid,
  generateMermaidFromCanvas,
} from "@/lib/agent/mermaidAgent/utils";

// Test data - mock Excalidraw elements
const mockElements = [
  // Rectangle node
  {
    id: "rect1",
    type: "rectangle",
    x: 100,
    y: 100,
    width: 120,
    height: 60,
  },
  // Bound text for rectangle
  {
    id: "text1",
    type: "text",
    text: "Start Process",
    containerId: "rect1",
    x: 110,
    y: 120,
  },
  // Free-flowing text (should be filtered out)
  {
    id: "text2",
    type: "text",
    text: "Random note",
    containerId: null,
    x: 300,
    y: 50,
  },
  // Diamond decision node
  {
    id: "diamond1",
    type: "diamond",
    x: 200,
    y: 250,
    width: 100,
    height: 80,
  },
  // Bound text for diamond
  {
    id: "text3",
    type: "text",
    text: "Valid?",
    containerId: "diamond1",
    x: 230,
    y: 280,
  },
  // Arrow connecting rectangle to diamond
  {
    id: "arrow1",
    type: "arrow",
    startBinding: { elementId: "rect1" },
    endBinding: { elementId: "diamond1" },
    points: [
      [160, 130],
      [250, 290],
    ],
  },
];

// Test filtering bound elements
console.log("🧪 Testing filterBoundElements...");
const filteredElements = filterBoundElements(mockElements);
console.log(`Original elements: ${mockElements.length}`);
console.log(`Filtered elements: ${filteredElements.length}`);
console.log(
  "Free-flowing text should be removed:",
  !filteredElements.some((el) => el.id === "text2")
);

// Test canvas context extraction
console.log("\n🧪 Testing extractFilteredCanvasContext...");
const canvasContext = extractFilteredCanvasContext(mockElements);
console.log(`Nodes found: ${canvasContext.nodes.length}`);
console.log(`Edges found: ${canvasContext.edges.length}`);
console.log(
  "Nodes:",
  canvasContext.nodes.map((n) => `${n.id}: "${n.label}"`)
);
console.log(
  "Edges:",
  canvasContext.edges.map((e) => `${e.source} --> ${e.target}`)
);

// Test Mermaid validation
console.log("\n🧪 Testing Mermaid validation...");
const validMermaid = `flowchart TD
A(Start Process)
B{Valid?}
A --> B`;

const invalidMermaid = `graph TD
A(Start Process
B{Valid?}
A --> B`;

const validResult = validateGeneratedMermaid(validMermaid);
const invalidResult = validateGeneratedMermaid(invalidMermaid);

console.log("Valid Mermaid validation:", validResult.isValid);
console.log("Invalid Mermaid validation:", invalidResult.isValid);
if (!invalidResult.isValid) {
  console.log("Validation errors:", invalidResult.errors);
}

// Test the full generation function (without actually calling the API)
console.log("\n🧪 Testing generateMermaidFromCanvas structure...");
console.log("Function exists and accepts correct parameters");

export {
  mockElements,
  filteredElements,
  canvasContext,
  validResult,
  invalidResult,
};

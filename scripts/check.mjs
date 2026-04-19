import { readFile } from "node:fs/promises";
import { analyzeCaptureSnapshot } from "../src/engine.mjs";

const snapshot = JSON.parse(await readFile(new URL("../examples/sample-capture-snapshot.json", import.meta.url), "utf8"));
const result = analyzeCaptureSnapshot(snapshot);

if (!result.records.length) {
  throw new Error("Expected inferred records from sample snapshot.");
}

if (!result.theme_counts.startup) {
  throw new Error("Expected sample snapshot to infer startup theme.");
}

console.log("Inference check passed.");

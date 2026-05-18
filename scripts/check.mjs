import { readFile } from "node:fs/promises";
import { analyzeCaptureSnapshot, analyzeCaptureSnapshotAsync } from "../src/engine.mjs";

const snapshot = JSON.parse(await readFile(new URL("../examples/sample-capture-snapshot.json", import.meta.url), "utf8"));
const result = analyzeCaptureSnapshot(snapshot);

if (!result.records.length) {
  throw new Error("Expected inferred records from sample snapshot.");
}

if (!result.theme_counts.startup) {
  throw new Error("Expected sample snapshot to infer startup theme.");
}

const customResult = await analyzeCaptureSnapshotAsync(snapshot, {
  semanticProvider: "custom",
  providerName: "test_semantic_provider",
  async analyze({ rulesResult }) {
    return {
      ...rulesResult,
      source: {
        ...rulesResult.source,
        semantic_provider: {
          kind: "custom",
          name: "test_semantic_provider",
          external: false,
        },
      },
      provider_notes: ["Custom semantic provider kept source evidence attached."],
    };
  },
});

if (customResult.source.semantic_provider.kind !== "custom") {
  throw new Error("Expected custom semantic provider metadata.");
}

if (!customResult.provider_notes?.some((note) => note.includes("source evidence"))) {
  throw new Error("Expected custom provider notes to survive normalization.");
}

console.log("Inference check passed.");

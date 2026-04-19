#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { analyzeCaptureSnapshot, formatInferenceReport } from "./engine.mjs";

const args = parseArgs(process.argv.slice(2));

if (!args.input) {
  console.error("Usage: npm run infer -- --input <capture-snapshot.json> [--format report|json]");
  process.exit(1);
}

const snapshot = JSON.parse(await readFile(args.input, "utf8"));
const result = analyzeCaptureSnapshot(snapshot);

if ((args.format ?? "report") === "json") {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(formatInferenceReport(result));
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      parsed[arg.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    }
  }
  return parsed;
}

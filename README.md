# Memact Inference

Version: `v0.0`

Inference is the semantic understanding layer.

It owns one job:

```text
turn captured evidence into semantic evidence
```

Inference does not capture browser data, form long-term schemas, predict final
intent, store memory, or write user-facing answers.

## What This Repo Owns

- Reads Capture snapshots.
- Scores whether activity is meaningful enough to keep.
- Extracts semantic concepts, actions, relations, and themes.
- Keeps cited source evidence attached to every retained packet.
- Emits `memact.inference.v0` records for Schema, Intent, Memory, and app-specific query engines.
- Runs deterministic rules by default.
- Provides extension points for local, remote, or custom semantic providers.

## What This Repo Does Not Own

- Browser/page capture.
- Durable schema grouping.
- Current user goal prediction.
- Memory storage, forgetting, or retrieval.
- App-facing permission checks.

## Input

Inference expects a Capture snapshot:

```json
{
  "system": "capture",
  "events": [],
  "sessions": [],
  "activities": [],
  "content_units": [],
  "graph_packets": []
}
```

## Output

Inference emits `memact.inference.v0`:

```json
{
  "schema_version": "memact.inference.v0",
  "records": [
    {
      "packet_id": "packet:act_1",
      "meaningful": true,
      "meaningful_score": 0.64,
      "canonical_themes": ["startup"],
      "candidate_nodes": [],
      "candidate_edges": [],
      "sources": [
        {
          "domain": "youtube.com",
          "url": "https://youtube.com/watch?v=founder-mvp"
        }
      ]
    }
  ],
  "packet_network": {
    "nodes": [],
    "edges": []
  }
}
```

Inference is where semantic understanding starts. Capture may collect possible
content units and raw graph hints, but Inference decides what the approved
evidence appears to mean and keeps evidence attached to every semantic record.

## Semantic Provider Extension

The default provider is deterministic rules. Future integrations can plug in a
local model, a user-provided endpoint, or a custom semantic provider without
moving semantic understanding into Capture, Access, Intent, or Memory.

```js
import { analyzeCaptureSnapshot, analyzeCaptureSnapshotAsync } from "memact-inference";

const rulesResult = analyzeCaptureSnapshot(snapshot, {
  semanticProvider: "rules"
});

const customResult = await analyzeCaptureSnapshotAsync(snapshot, {
  semanticProvider: "custom",
  analyze: async ({ snapshot, rulesResult }) => ({
    ...rulesResult,
    provider_notes: ["Custom provider refined labels while keeping evidence links."]
  })
});
```

Remote endpoints are opt-in only. If a developer uses one later, the endpoint
must be controlled by the user or developer, include provider metadata, attach
output to source evidence, and accept low-confidence or unknown meaning instead
of inventing sources.

## Run Locally

Prerequisites:

- Node.js `20+`
- npm `10+`

Install:

```powershell
npm install
```

Validate:

```powershell
npm run check
```

Run sample:

```powershell
npm run sample
```

Run against a Capture snapshot:

```powershell
npm run infer -- --input path\to\capture-snapshot.json --format report
```

JSON output:

```powershell
npm run infer -- --input path\to\capture-snapshot.json --format json
```

## Contract

- Input comes from Capture's public snapshot contract.
- Output is semantic evidence, not user-facing conclusions.
- Output may contain candidate nodes and edges, but Schema decides whether they
  organize into durable cognitive-style schemas.
- Schema decides whether repeated evidence forms a virtual schema.
- Intent predicts the current goal from recent semantic evidence and schemas.
- Memory decides what survives after Schema and Intent produce their outputs.

## License

See `LICENSE`.

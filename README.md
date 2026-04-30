# Memact Inference

Version: `v0.0`

Inference is the meaning filter.

It owns one job:

```text
turn captured activity into retained evidence packets
```

Inference does not capture browser data, form long-term schemas, store memory, or write user-facing answers.

## What This Repo Owns

- Reads Capture snapshots.
- Scores whether activity is meaningful enough to keep.
- Normalizes activity text into stable themes.
- Keeps cited source evidence attached to every retained packet.
- Emits packet networks for Schema, Memory, Origin, Influence, and Website.
- Runs without LLM reasoning.

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
- Output is evidence packets, not conclusions about a thought.
- Schema decides whether repeated evidence forms a virtual schema.
- Memory decides what survives.

## License

See `LICENSE`.

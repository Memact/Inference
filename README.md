# Memact Inference

Version: `v0.0`

Inference is the deterministic meaning layer in the Memact architecture.

It answers:

`What is this captured activity about?`

Inference consumes Capture snapshots and emits stable theme records that downstream systems can trust without reading Capture internals.

Inference is part of Memact's citation and answer engine. It turns consumed website evidence into canonical meaning so Schema, Interface, Influence, and Origin can answer with sources instead of unsupported prose.

## Pipeline Position

```text
Capture -> Inference -> Schema -> Memory -> Interface / Query -> Influence / Origin
```

Inference does not decide what shaped a thought. It only turns raw activity into evidence-backed meaning. Memory later stores the schema/activity packets that survive and exposes RAG/CRUD for query-time use.

## What It Does

- reads Capture snapshot exports
- decides which activities are meaningful enough to keep
- turns meaningful activities into evidence packets
- normalizes retained activity/event text into canonical themes
- keeps source evidence attached to each retained packet
- emits a packet network of packets, themes, and cited sources
- emits deterministic JSON for Schema, Interface, Influence, and Origin
- avoids LLM reasoning and hidden probabilistic claims
- preserves enough source evidence for citation-backed answers

## Public Output Contract

```json
{
  "schema_version": "memact.inference.v0",
  "theme_counts": {
    "startup": 2
  },
  "thresholds": {
    "meaningful_score": 0.38
  },
  "records": [
    {
      "id": "act_1",
      "packet_id": "packet:act_1",
      "source_label": "YC founder interview about shipping MVPs",
      "meaningful": true,
      "meaningful_score": 0.64,
      "meaning_reasons": ["1 matched theme", "brief attention", "source can be cited"],
      "canonical_themes": ["startup"],
      "themes": [
        {
          "id": "startup",
          "label": "Startup / building",
          "score": 3,
          "evidence_terms": ["founder", "mvp", "ship"]
        }
      ],
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

## Terminal Quickstart

Prerequisites:

- Node.js `20+`
- npm `10+`

Install:

```powershell
npm install
```

Run the validation pass:

```powershell
npm run check
```

Run the sample:

```powershell
npm run sample
```

Analyze a manual Capture snapshot:

```powershell
npm run infer -- --input ..\capture-snapshot-<timestamp>-<id>.json --format report
```

Emit JSON for the next layer:

```powershell
npm run infer -- --input ..\capture-snapshot-<timestamp>-<id>.json --format json
```

Live Memact clients should not depend on a rolling downloaded snapshot file.
They should use Capture's bridge/status signature and request a snapshot only when memory changed.

## Design Rules

- deterministic first
- no AI-generated conclusions
- raw Capture activity is not automatically meaningful
- every retained packet must have deterministic reasons
- schemas and origins should consume retained packets, not raw activity
- every theme must keep source evidence
- downstream systems consume this output contract, not Capture internals

## License

See `LICENSE`.

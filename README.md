# Memact Inference

Inference turns captured evidence into semantic evidence.

It decides what captured activity appears to mean and whether it is useful
enough to pass into Schema. If future LLM or local model integrations are used,
they belong here as semantic providers.

## Owns

- Semantic understanding of capture events.
- Meaningfulness scoring.
- Concepts, actions, relations, and source-attached semantic records.
- Deterministic rules by default.
- Optional local, remote, or custom semantic provider extension points.

## Does Not Own

- Browser capture.
- Durable schemas.
- Memory storage.
- Feature runtime.
- API access checks.

## Provider Modes

```js
analyzeCaptureSnapshot(snapshot, {
  semanticProvider: "rules" // default
});

analyzeCaptureSnapshotAsync(snapshot, {
  semanticProvider: "remote",
  endpoint: "http://localhost:8789/analyze"
});
```

Remote providers are opt-in. They must attach output to source evidence and
return uncertainty when support is weak.

## Current Code

The rule-based v0 engine supports:

- `analyzeCaptureEvent(event, options)`
- `analyzeCaptureEvents(events, options)`
- `analyzeCaptureSnapshot(snapshot, options)` for older snapshot callers

The output is a semantic record, not a user-facing conclusion. Schema decides
how repeated semantic records become reusable packets.

## Development

```powershell
npm install
npm run check
```

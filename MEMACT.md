# Memact description

**Permissioned intent infrastructure for apps.**

```text
Understand what users are trying to do.
```

Memact is infrastructure that helps apps predict user intent from approved digital activity, without giving them raw access to a user's private data.

This repo is the Inference layer. It turns approved captured evidence into semantic evidence with concepts, actions, relations, confidence, and source links.

## System position

```text
Website manages -> Access gates -> Capture records -> Inference understands -> Schema groups -> Intent predicts -> Memory stores -> Apps consume
```

Inference decides what captured activity appears to mean. It does not capture browser data, form durable schemas, store memory, or produce final intent predictions.

## What this repo owns

- semantic evidence from Capture snapshots
- concepts, actions, relations, themes, and confidence
- evidence-attached meaning records
- deterministic rules by default
- extension points for local, remote, or custom semantic providers

## What this repo does not own

- browser/page capture
- durable schema grouping
- memory storage or forgetting
- final current-goal prediction
- app-facing permission checks

## Copy rules

Use:

- "Permissioned intent infrastructure for apps."
- "Understand what users are trying to do."
- "approved digital activity"
- "retained evidence packets"
- "meaning filter"

Avoid:

- generic AI wrapper language
- vague memory-plugin language
- raw-data export framing
- claims that apps get the whole memory graph
- open-source wording unless the repo license explicitly says so

import test from "node:test"
import assert from "node:assert/strict"
import { analyzeCaptureEvent, analyzeCaptureEvents } from "../src/engine.mjs"

test("article_read event creates meaningful record", () => {
  const record = analyzeCaptureEvent({
    event_id: "evt_1",
    event_type: "article_read",
    source_app: "app",
    occurred_at: new Date().toISOString(),
    category: "web:research",
    payload: {
      title: "API integration documentation guide",
      text: "This tutorial explains api integration and software debugging."
    }
  })
  assert.equal(record.schema_version, "memact.inference_record.v0")
  assert.equal(record.source_event_id, "evt_1")
})

test("low-signal event gets low score", () => {
  const record = analyzeCaptureEvent({
    event_type: "ping",
    source_app: "app",
    occurred_at: new Date().toISOString(),
    category: "productivity",
    payload: { title: "Home" }
  })
  assert.equal(record.meaningful, false)
})

test("skipped event is ignored", () => {
  assert.equal(analyzeCaptureEvent({ skipped: true }), null)
})

test("batch output wraps records", () => {
  const result = analyzeCaptureEvents([])
  assert.equal(result.schema_version, "memact.inference.v0")
  assert.deepEqual(result.records, [])
})

test("article reading events create semantic evidence", () => {
  const record = analyzeCaptureEvent({
    event_id: "evt_article",
    event_type: "scroll_depth_update",
    source_app: "article-app",
    occurred_at: new Date().toISOString(),
    category: "reading",
    payload: {
      title: "AI policy guide",
      topic: "ai policy",
      scroll_depth: 88
    }
  })
  assert.equal(record.category, "reading")
  assert.equal(record.evidence.article_topic, "ai policy")
  assert.ok(record.canonical_themes.includes("high_engagement"))
})

test("summary_expand creates summary preference signal", () => {
  const record = analyzeCaptureEvent({
    event_type: "summary_expand",
    source_app: "article-app",
    occurred_at: new Date().toISOString(),
    category: "reading",
    payload: { topic: "ai policy" }
  })
  assert.ok(record.canonical_themes.includes("summary_detail_preference"))
})

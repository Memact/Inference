const DEFAULT_THEME_RULES = [
  {
    id: "startup",
    label: "Startup / building",
    keywords: ["startup", "founder", "yc", "mvp", "launch", "traction", "product market", "ship", "build", "venture"],
  },
  {
    id: "exam",
    label: "Exam / performance",
    keywords: ["exam", "test", "rank", "score", "revision", "study", "syllabus", "mock", "marks"],
  },
  {
    id: "coding",
    label: "Coding / engineering",
    keywords: ["code", "coding", "github", "terminal", "javascript", "python", "react", "api", "debug", "software"],
  },
  {
    id: "ai",
    label: "AI / agents",
    keywords: ["ai", "agent", "llm", "openai", "model", "prompt", "embedding", "transformer", "gemini", "claude"],
  },
  {
    id: "attention",
    label: "Attention / deep work",
    keywords: ["focus", "attention", "deep work", "distraction", "dopamine", "flow", "concentration"],
  },
  {
    id: "productivity",
    label: "Productivity / systems",
    keywords: ["productivity", "habit", "routine", "todo", "notion", "planner", "system", "workflow"],
  },
  {
    id: "burnout",
    label: "Burnout / overload",
    keywords: ["burnout", "tired", "exhausted", "overwhelmed", "stress", "anxiety", "fatigue"],
  },
  {
    id: "identity",
    label: "Identity / self-concept",
    keywords: ["identity", "become", "person", "self", "worth", "confidence", "future me"],
  },
];

const URL_RE = /^https?:\/\//i;
const DEFAULT_MEANINGFUL_THRESHOLD = 0.38;
const LOW_VALUE_DOMAIN_RE = /(^|\.)accounts\.google\.com$|(^|\.)auth\.openai\.com$|(^|\.)login\.|(^|\.)signin\./i;
const LOW_VALUE_TEXT_RE = /\b(sign in|login|log in|auth|oauth|captcha|privacy policy|terms of service|cookie settings)\b/i;
const HIGH_SIGNAL_INTERACTIONS = new Set([
  "content",
  "dwell",
  "media",
  "media_play",
  "route_change",
  "scroll",
  "selection",
  "text_selection",
  "typing",
  "search",
  "navigation",
]);

export function analyzeCaptureSnapshot(snapshot, options = {}) {
  const rules = options.themeRules ?? DEFAULT_THEME_RULES;
  const meaningfulThreshold = Number(options.meaningfulThreshold ?? DEFAULT_MEANINGFUL_THRESHOLD);
  const activities = normalizeActivities(snapshot);
  const inferred = activities.map((activity) =>
    inferActivityMeaning(activity, rules, { meaningfulThreshold })
  );
  const retained = inferred.filter((record) => record.meaningful);
  const skipped = inferred.filter((record) => !record.meaningful);
  const themeCounts = countThemes(inferred);
  const retainedThemeCounts = countThemes(retained);

  return {
    schema_version: "memact.inference.v0",
    generated_at: new Date().toISOString(),
    source: {
      activity_count: activities.length,
      meaningful_activity_count: retained.length,
      skipped_activity_count: skipped.length,
      event_count: Array.isArray(snapshot?.events) ? snapshot.events.length : null,
      session_count: Array.isArray(snapshot?.sessions) ? snapshot.sessions.length : null,
    },
    thresholds: {
      meaningful_score: meaningfulThreshold,
    },
    theme_counts: retainedThemeCounts,
    all_theme_counts: themeCounts,
    records: retained,
    skipped_records: skipped.map(compactSkippedRecord),
    packet_network: buildPacketNetwork(retained),
  };
}

export function inferActivityMeaning(activity, rules = DEFAULT_THEME_RULES, options = {}) {
  const meaningfulThreshold = Number(options.meaningfulThreshold ?? DEFAULT_MEANINGFUL_THRESHOLD);
  const text = collectActivityText(activity).toLowerCase();
  const themes = rules
    .map((rule) => {
      const matches = rule.keywords.filter((keyword) => text.includes(keyword.toLowerCase()));
      return matches.length
        ? {
            id: rule.id,
            label: rule.label,
            score: matches.length,
            evidence_terms: matches,
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const meaningfulness = scoreMeaningfulness(activity, themes);

  const id = String(activity.id ?? activity.activity_id ?? activity.key ?? activity.label ?? `activity-${Date.now()}`);
  const sourceLabel = activity.label ?? activity.key ?? activity.title ?? "activity";
  const sources = extractSources(activity);
  const evidence = {
    title: activity.title ?? null,
    url: activity.url ?? null,
    text_excerpt: collectActivityText(activity).slice(0, 320),
  };
  const canonicalThemes = themes.map((theme) => theme.id);
  const packet = {
    id: `packet:${id}`,
    claim_type: "meaning_packet",
    source_record_id: id,
    label: sourceLabel,
    started_at: activity.started_at ?? activity.occurred_at ?? activity.timestamp ?? null,
    ended_at: activity.ended_at ?? null,
    canonical_themes: canonicalThemes,
    meaningful_score: meaningfulness.score,
    reasons: meaningfulness.reasons,
    sources,
    evidence,
  };

  return {
    id,
    packet_id: packet.id,
    started_at: activity.started_at ?? activity.occurred_at ?? activity.timestamp ?? null,
    ended_at: activity.ended_at ?? null,
    source_label: sourceLabel,
    meaningful: meaningfulness.score >= meaningfulThreshold,
    meaningful_score: meaningfulness.score,
    meaning_reasons: meaningfulness.reasons,
    themes,
    canonical_themes: canonicalThemes,
    sources,
    evidence,
    packet,
  };
}

export function normalizeActivities(snapshot) {
  if (Array.isArray(snapshot?.activities) && snapshot.activities.length) {
    return snapshot.activities;
  }

  if (Array.isArray(snapshot?.events)) {
    return snapshot.events.map((event, index) => ({
      id: event.id ?? `event-${index + 1}`,
      started_at: event.occurred_at ?? event.timestamp ?? null,
      ended_at: event.occurred_at ?? event.timestamp ?? null,
      label: event.title ?? event.window_title ?? event.url ?? event.domain ?? "event",
      title: event.title ?? event.window_title,
      url: event.url,
      domain: event.domain,
      application: event.application,
      interaction_type: event.interaction_type,
      content_text: event.content_text,
      full_text: event.full_text,
      display_full_text: event.display_full_text,
      searchable_text: event.searchable_text,
      context_profile_json: event.context_profile_json,
      events: [event],
    }));
  }

  return [];
}

export function formatInferenceReport(result) {
  const lines = [
    "Memact Inference Report",
    `Activities: ${result.source.activity_count}`,
    "",
    "Top Themes",
  ];

  const counts = Object.entries(result.theme_counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  if (!counts.length) {
    lines.push("No deterministic themes detected.");
  } else {
    counts.forEach(([theme, count], index) => {
      lines.push(`${index + 1}. ${theme}: ${count}`);
    });
  }

  lines.push("", "Inferred Records");
  result.records.slice(0, 12).forEach((record, index) => {
    const themes = record.canonical_themes.length ? record.canonical_themes.join(", ") : "unclassified";
    lines.push(`${index + 1}. ${record.source_label} -> ${themes}`);
  });

  return lines.join("\n");
}

function collectActivityText(activity) {
  const contextProfile = normalizeContextProfile(activity);
  const parts = [
    activity.key,
    activity.label,
    activity.title,
    activity.url,
    activity.domain,
    activity.content_text,
    activity.full_text,
    activity.display_full_text,
    activity.description,
  ];

  if (contextProfile) {
    parts.push(JSON.stringify(contextProfile));
  }

  if (Array.isArray(activity.events)) {
    activity.events.forEach((event) => {
      const eventContext = normalizeContextProfile(event);
      parts.push(
        event.title,
        event.window_title,
        event.url,
        event.domain,
        event.content_text,
        event.full_text,
        event.display_full_text,
        event.searchable_text,
        event.description,
        eventContext ? JSON.stringify(eventContext) : "",
      );
    });
  }

  return parts.filter((value) => typeof value === "string" && value.trim()).join(" ");
}

function extractSources(activity) {
  const sources = new Map();
  const pushSource = (url, domain, title) => {
    const sourceDomain = domain || domainFromUrl(url);
    if (!sourceDomain && !url) return;
    const key = url || sourceDomain;
    sources.set(key, {
      url: url ?? null,
      domain: sourceDomain ?? null,
      title: title ?? null,
      occurred_at: activity.started_at ?? activity.occurred_at ?? activity.timestamp ?? null,
      application: activity.application ?? null,
    });
  };

  pushSource(activity.url, activity.domain, activity.title);

  if (Array.isArray(activity.events)) {
    activity.events.forEach((event) => pushSource(event.url, event.domain, event.title ?? event.window_title));
  }

  return Array.from(sources.values());
}

function domainFromUrl(value) {
  if (!value || !URL_RE.test(value)) return null;
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function countThemes(records) {
  return records.reduce((counts, record) => {
    record.canonical_themes.forEach((theme) => {
      counts[theme] = (counts[theme] ?? 0) + 1;
    });
    return counts;
  }, {});
}

function scoreMeaningfulness(activity, themes) {
  const text = collectActivityText(activity);
  const textLength = text.length;
  const sources = extractSources(activity);
  const durationSeconds = durationInSeconds(activity);
  const interactionTypes = collectInteractionTypes(activity);
  const reasons = [];
  let score = 0;

  if (themes.length) {
    const themeScore = Math.min(0.34, 0.18 + (themes.length * 0.08));
    score += themeScore;
    reasons.push(`${themes.length} matched theme${themes.length === 1 ? "" : "s"}`);
  }

  if (textLength >= 1200) {
    score += 0.2;
    reasons.push("rich page text");
  } else if (textLength >= 320) {
    score += 0.14;
    reasons.push("usable page text");
  } else if (textLength >= 90) {
    score += 0.07;
    reasons.push("short but usable text");
  }

  if (durationSeconds >= 180) {
    score += 0.18;
    reasons.push("sustained attention");
  } else if (durationSeconds >= 45) {
    score += 0.11;
    reasons.push("brief attention");
  }

  if ([...interactionTypes].some((type) => HIGH_SIGNAL_INTERACTIONS.has(type))) {
    score += 0.12;
    reasons.push("active interaction");
  }

  if (sources.some((source) => isHighValueSource(source))) {
    score += 0.12;
    reasons.push("source can be cited");
  }

  if (looksLowValue(activity, text, sources)) {
    score -= 0.22;
    reasons.push("low-value browser/auth surface");
  }

  const normalized = Math.max(0, Math.min(1, Number(score.toFixed(4))));
  return {
    score: normalized,
    reasons: reasons.length ? reasons : ["no strong meaning signal"],
  };
}

function compactSkippedRecord(record) {
  return {
    id: record.id,
    source_label: record.source_label,
    meaningful_score: record.meaningful_score,
    reasons: record.meaning_reasons,
    canonical_themes: record.canonical_themes,
  };
}

function buildPacketNetwork(records) {
  const nodes = [];
  const edges = [];
  const seenNodes = new Set();
  const addNode = (node) => {
    if (!node?.id || seenNodes.has(node.id)) return;
    seenNodes.add(node.id);
    nodes.push(node);
  };

  records.forEach((record) => {
    const packetId = record.packet_id || `packet:${record.id}`;
    addNode({
      id: packetId,
      type: "meaning_packet",
      label: record.source_label,
      score: record.meaningful_score,
    });

    (record.canonical_themes ?? []).forEach((theme) => {
      const themeId = `theme:${theme}`;
      addNode({ id: themeId, type: "theme", label: theme });
      edges.push({
        from: packetId,
        to: themeId,
        type: "has_theme",
        weight: Number(record.themes?.find((item) => item.id === theme)?.score || 1),
      });
    });

    (record.sources ?? []).slice(0, 4).forEach((source) => {
      const sourceKey = source.url || source.domain;
      if (!sourceKey) return;
      const sourceId = `source:${sourceKey}`;
      addNode({
        id: sourceId,
        type: "source",
        label: source.title || source.domain || source.url,
        url: source.url || "",
        domain: source.domain || "",
      });
      edges.push({
        from: packetId,
        to: sourceId,
        type: "cites_source",
        weight: 1,
      });
    });
  });

  return { nodes, edges };
}

function normalizeContextProfile(activity) {
  if (activity?.context_profile && typeof activity.context_profile === "object") {
    return activity.context_profile;
  }
  const raw = activity?.context_profile_json;
  if (!raw || typeof raw !== "string") {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function durationInSeconds(activity) {
  const started = Date.parse(activity.started_at ?? activity.occurred_at ?? activity.timestamp ?? "");
  const ended = Date.parse(activity.ended_at ?? activity.finished_at ?? activity.occurred_at ?? activity.timestamp ?? "");
  if (Number.isFinite(started) && Number.isFinite(ended) && ended >= started) {
    return (ended - started) / 1000;
  }
  if (Array.isArray(activity.events)) {
    const times = activity.events
      .map((event) => Date.parse(event.occurred_at ?? event.timestamp ?? ""))
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
    if (times.length >= 2) {
      return (times[times.length - 1] - times[0]) / 1000;
    }
  }
  return 0;
}

function collectInteractionTypes(activity) {
  const types = new Set();
  if (activity.interaction_type) {
    types.add(String(activity.interaction_type).toLowerCase());
  }
  if (Array.isArray(activity.events)) {
    activity.events.forEach((event) => {
      if (event.interaction_type) {
        types.add(String(event.interaction_type).toLowerCase());
      }
    });
  }
  return types;
}

function isHighValueSource(source) {
  const domain = String(source?.domain || domainFromUrl(source?.url) || "").toLowerCase();
  if (!domain || LOW_VALUE_DOMAIN_RE.test(domain)) {
    return false;
  }
  return Boolean(source?.url || domain);
}

function looksLowValue(activity, text, sources) {
  const label = String(activity.label ?? activity.title ?? activity.url ?? "").toLowerCase();
  if (LOW_VALUE_TEXT_RE.test(`${label} ${text}`)) {
    return true;
  }
  return sources.some((source) => LOW_VALUE_DOMAIN_RE.test(String(source.domain || "")));
}

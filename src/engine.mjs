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

export function analyzeCaptureSnapshot(snapshot, options = {}) {
  const rules = options.themeRules ?? DEFAULT_THEME_RULES;
  const activities = normalizeActivities(snapshot);
  const inferred = activities.map((activity) => inferActivityMeaning(activity, rules));
  const themeCounts = countThemes(inferred);

  return {
    schema_version: "memact.inference.v0",
    generated_at: new Date().toISOString(),
    source: {
      activity_count: activities.length,
      event_count: Array.isArray(snapshot?.events) ? snapshot.events.length : null,
      session_count: Array.isArray(snapshot?.sessions) ? snapshot.sessions.length : null,
    },
    theme_counts: themeCounts,
    records: inferred,
  };
}

export function inferActivityMeaning(activity, rules = DEFAULT_THEME_RULES) {
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

  return {
    id: String(activity.id ?? activity.activity_id ?? activity.key ?? activity.label ?? `activity-${Date.now()}`),
    started_at: activity.started_at ?? activity.occurred_at ?? activity.timestamp ?? null,
    ended_at: activity.ended_at ?? null,
    source_label: activity.label ?? activity.key ?? activity.title ?? "activity",
    canonical_themes: themes.map((theme) => theme.id),
    themes,
    sources: extractSources(activity),
    evidence: {
      title: activity.title ?? null,
      url: activity.url ?? null,
      text_excerpt: collectActivityText(activity).slice(0, 320),
    },
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
      label: event.title ?? event.url ?? event.domain ?? "event",
      title: event.title,
      url: event.url,
      domain: event.domain,
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

  if (activity.context_profile) {
    parts.push(JSON.stringify(activity.context_profile));
  }

  if (Array.isArray(activity.events)) {
    activity.events.forEach((event) => {
      parts.push(event.title, event.url, event.domain, event.content_text, event.full_text, event.description);
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
    });
  };

  pushSource(activity.url, activity.domain, activity.title);

  if (Array.isArray(activity.events)) {
    activity.events.forEach((event) => pushSource(event.url, event.domain, event.title));
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

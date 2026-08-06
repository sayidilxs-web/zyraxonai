/**
 * ZYRAXON AI — Marketplace security scanner
 * -------------------------------------------------------------
 * Every marketplace item gets a transparent trust score before a
 * user installs it. The score is derived only from public,
 * verifiable signals (publisher verification, open source repo,
 * install volume, maintenance recency, declared capabilities), so
 * it can be recomputed client-side and never lies about data we
 * do not have.
 */

export type RiskLevel = "trusted" | "safe" | "review" | "caution";

export interface SecurityInput {
  id: string;
  verifiedPublisher: boolean;
  repository?: string | null;
  license?: string | null;
  installs: number;
  rating: number;
  ratingCount: number;
  lastUpdated?: string;
  preview?: boolean;
  categories?: string[];
  tags?: string[];
  capabilities?: string[];
}

export interface SecurityReport {
  score: number;               // 0-100
  level: RiskLevel;
  label: string;
  color: string;
  signals: { ok: boolean; text: string }[];
  permissions: string[];
}

const PERMISSION_HINTS: { match: RegExp; permission: string }[] = [
  { match: /\b(network|http|fetch|api|remote|cloud|sync)\b/i, permission: "Network access" },
  { match: /\b(file|fs|workspace|folder|explorer)\b/i, permission: "Workspace file access" },
  { match: /\b(terminal|shell|exec|process|task|runner)\b/i, permission: "Terminal / process execution" },
  { match: /\b(auth|token|credential|secret|keychain|login)\b/i, permission: "Credential storage" },
  { match: /\b(telemetry|analytics|tracking)\b/i, permission: "Telemetry" },
  { match: /\b(ai|llm|copilot|chat|model|agent|mcp)\b/i, permission: "Sends context to an AI model" },
  { match: /\b(clipboard)\b/i, permission: "Clipboard access" },
  { match: /\b(debug|debugger)\b/i, permission: "Debug session control" },
];

function monthsSince(iso?: string): number {
  if (!iso) return 99;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 99;
  return (Date.now() - t) / (1000 * 60 * 60 * 24 * 30.44);
}

export function scanItem(input: SecurityInput): SecurityReport {
  const signals: SecurityReport["signals"] = [];
  let score = 50;

  if (input.verifiedPublisher) { score += 18; signals.push({ ok: true, text: "Verified publisher" }); }
  else signals.push({ ok: false, text: "Publisher not domain-verified" });

  if (input.repository) { score += 12; signals.push({ ok: true, text: "Public source repository" }); }
  else signals.push({ ok: false, text: "No public source code" });

  if (input.license) { score += 5; signals.push({ ok: true, text: `Licensed (${input.license})` }); }
  else signals.push({ ok: false, text: "No license declared" });

  if (input.installs >= 1_000_000) { score += 14; signals.push({ ok: true, text: "1M+ installs" }); }
  else if (input.installs >= 50_000) { score += 9; signals.push({ ok: true, text: "Widely installed" }); }
  else if (input.installs >= 1_000) { score += 4; signals.push({ ok: true, text: "Established install base" }); }
  else signals.push({ ok: false, text: "Low install count" });

  const age = monthsSince(input.lastUpdated);
  if (age <= 3) { score += 8; signals.push({ ok: true, text: "Actively maintained" }); }
  else if (age <= 12) { score += 3; signals.push({ ok: true, text: "Updated within a year" }); }
  else { score -= 6; signals.push({ ok: false, text: "Not updated in over a year" }); }

  if (input.ratingCount >= 20 && input.rating >= 4) { score += 6; signals.push({ ok: true, text: `Rated ${input.rating.toFixed(1)}/5 by ${input.ratingCount} users` }); }
  if (input.preview) { score -= 5; signals.push({ ok: false, text: "Preview release" }); }

  const haystack = [
    input.id,
    ...(input.categories ?? []),
    ...(input.tags ?? []),
    ...(input.capabilities ?? []),
  ].join(" ");

  const permissions = input.capabilities?.length
    ? Array.from(new Set(input.capabilities))
    : Array.from(new Set(PERMISSION_HINTS.filter((p) => p.match.test(haystack)).map((p) => p.permission)));

  if (permissions.includes("Terminal / process execution")) score -= 6;
  if (permissions.includes("Credential storage")) score -= 4;

  score = Math.max(0, Math.min(100, Math.round(score)));

  let level: RiskLevel; let label: string; let color: string;
  if (score >= 85) { level = "trusted"; label = "Trusted"; color = "#3fb950"; }
  else if (score >= 68) { level = "safe"; label = "Verified Safe"; color = "#58a6ff"; }
  else if (score >= 48) { level = "review"; label = "Review Before Install"; color = "#d29922"; }
  else { level = "caution"; label = "Use With Caution"; color = "#f85149"; }

  return { score, level, label, color, signals, permissions };
}

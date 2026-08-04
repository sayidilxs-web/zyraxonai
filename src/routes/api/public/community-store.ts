import { createFileRoute } from "@tanstack/react-router";

/**
 * GitHub-backed shared storage proxy for the ecosystem/community.
 *
 * The website used to talk to GitHub directly with a token baked into the
 * bundle. That token is dead (401), so likes / stars / comments / chat stopped
 * persisting. This route keeps the exact same GitHub files and JSON shapes —
 * the only change is that reads/writes now go through the server, which holds
 * the token in GITHUB_PERSONAL_ACCESS_TOKEN.
 *
 *   GET  /api/public/community-store?file=likes.json      -> { content, sha }
 *   POST /api/public/community-store                      -> { ok }
 *        body: { file: "likes.json", content: <json>, message?: string }
 */
const REPO = "onelpawarai/ZYRAXON-AI";

const ALLOWED = new Set([
  "community_chat.json",
  "active_rooms.json",
  "marketplace/data/likes.json",
  "marketplace/data/user_likes.json",
  "marketplace/data/comments.json",
  "marketplace/data/ratings.json",
  "marketplace/data/downloads.json",
  "marketplace/data/stars.json",
  "marketplace/data/shares.json",
]);

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function gh(token?: string) {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "zyraxon-website",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function b64encode(text: string) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function b64decode(b64: string) {
  const bin = atob(b64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function readFile(file: string, token?: string) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${file}`, { headers: gh(token) });
  if (res.status === 404) return { content: null as unknown, sha: undefined as string | undefined };
  if (!res.ok) throw new Error(`GitHub read ${res.status}`);
  const data = (await res.json()) as { content?: string; sha?: string };
  let parsed: unknown = null;
  if (data.content) {
    try {
      parsed = JSON.parse(b64decode(data.content));
    } catch {
      parsed = null;
    }
  }
  return { content: parsed, sha: data.sha };
}

export const Route = createFileRoute("/api/public/community-store")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: HEADERS }),

      GET: async ({ request }) => {
        const file = new URL(request.url).searchParams.get("file") || "";
        if (!ALLOWED.has(file)) {
          return Response.json({ message: "Unknown file" }, { status: 400, headers: HEADERS });
        }
        const token = process.env["GITHUB_PERSONAL_ACCESS_TOKEN"];
        try {
          const { content, sha } = await readFile(file, token);
          return Response.json({ content, sha }, { headers: { ...HEADERS, "Cache-Control": "no-store" } });
        } catch (err) {
          return Response.json({ content: null, error: String(err) }, { headers: HEADERS });
        }
      },

      POST: async ({ request }) => {
        const token = process.env["GITHUB_PERSONAL_ACCESS_TOKEN"];
        if (!token) {
          return Response.json({ message: "Storage token is not configured" }, { status: 503, headers: HEADERS });
        }

        let input: { file?: string; content?: unknown; message?: string };
        try {
          input = (await request.json()) as typeof input;
        } catch {
          return Response.json({ message: "Invalid JSON body" }, { status: 400, headers: HEADERS });
        }

        const file = input.file || "";
        if (!ALLOWED.has(file)) {
          return Response.json({ message: "Unknown file" }, { status: 400, headers: HEADERS });
        }
        if (input.content === undefined) {
          return Response.json({ message: "Missing content" }, { status: 400, headers: HEADERS });
        }

        const payload = JSON.stringify(input.content, null, 2);
        if (payload.length > 5_000_000) {
          return Response.json({ message: "Payload too large" }, { status: 413, headers: HEADERS });
        }

        // Retry once on 409 (concurrent write -> stale sha)
        for (let attempt = 0; attempt < 2; attempt++) {
          const { sha } = await readFile(file, token);
          const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${file}`, {
            method: "PUT",
            headers: gh(token),
            body: JSON.stringify({
              message: input.message || `Update ${file}`,
              content: b64encode(payload),
              ...(sha ? { sha } : {}),
            }),
          });
          if (res.ok) return Response.json({ ok: true }, { headers: HEADERS });
          if (res.status !== 409) {
            const body = await res.text();
            return Response.json({ message: `GitHub write failed (${res.status})`, detail: body }, { status: 502, headers: HEADERS });
          }
        }
        return Response.json({ message: "GitHub write conflict" }, { status: 409, headers: HEADERS });
      },
    },
  },
});

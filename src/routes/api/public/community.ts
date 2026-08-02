import { createFileRoute } from "@tanstack/react-router";

/**
 * Additive bridge so the Electron / IoT application can talk to the same
 * community realtime channel the website uses. Nothing else changes.
 *
 *  GET  -> connection config (url, publishable key, channel name)
 *  POST -> relay a chat message into the realtime channel
 */
const CHANNEL = "zyraxon-community";

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/community")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: HEADERS }),

      GET: async () =>
        Response.json(
          {
            url: process.env["SUPABASE_URL"],
            key: process.env["SUPABASE_PUBLISHABLE_KEY"],
            channel: CHANNEL,
            events: { chat: "chat", signal: "signal" },
          },
          { headers: HEADERS },
        ),

      POST: async ({ request }) => {
        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!url || !key) {
          return Response.json({ message: "Realtime is not configured" }, { status: 500, headers: HEADERS });
        }

        let input: { event?: string; message?: unknown; payload?: unknown };
        try {
          input = (await request.json()) as typeof input;
        } catch {
          return Response.json({ message: "Invalid JSON body" }, { status: 400, headers: HEADERS });
        }

        const event = input.event === "signal" ? "signal" : "chat";
        const payload = event === "chat" ? { message: input.message ?? input.payload } : (input.payload ?? {});

        const res = await fetch(`${url}/realtime/v1/api/broadcast`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
          body: JSON.stringify({ messages: [{ topic: CHANNEL, event, payload }] }),
        });

        if (!res.ok) {
          return Response.json(
            { message: `Broadcast failed (${res.status})` },
            { status: 502, headers: HEADERS },
          );
        }
        return Response.json({ ok: true }, { headers: HEADERS });
      },
    },
  },
});

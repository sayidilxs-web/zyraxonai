import { createFileRoute } from "@tanstack/react-router";

const CLIENT_ID = "Ov23li80YUa3q7YPon5m";
const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function postForm(url: string, values: Record<string, string>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(values),
  });
  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: { ...HEADERS, "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/github-device")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: HEADERS }),
      POST: async ({ request }) => {
        let input: { action?: string; device_code?: string };
        try {
          input = (await request.json()) as { action?: string; device_code?: string };
        } catch {
          return Response.json({ message: "Invalid JSON body" }, { status: 400, headers: HEADERS });
        }

        if (input.action === "start") {
          return postForm("https://github.com/login/device/code", { client_id: CLIENT_ID, scope: "read:user user:email repo" });
        }
        if (input.action === "poll" && input.device_code) {
          return postForm("https://github.com/login/oauth/access_token", {
            client_id: CLIENT_ID,
            device_code: input.device_code,
            grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          });
        }
        return Response.json({ message: "Use action start, or poll with a device_code" }, { status: 400, headers: HEADERS });
      },
    },
  },
});
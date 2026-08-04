import { createFileRoute } from "@tanstack/react-router";
import { resolveReleases, PLATFORM_PATTERNS, REPO } from "../downloads";

/**
 * /api/public/download/windows | mac-arm | mac-intel | linux | android
 * Redirects straight to the correct latest asset for that platform.
 * If no asset exists for that platform, redirects to the releases page
 * (never to another platform's file).
 */
const ALIASES: Record<string, string> = {
  win: "windows",
  exe: "windows",
  windows: "windows",
  mac: "mac-arm",
  "mac-arm": "mac-arm",
  "mac-silicon": "mac-arm",
  "mac-intel": "mac-intel",
  linux: "linux",
  appimage: "linux",
  android: "android",
  apk: "android",
};

export const Route = createFileRoute("/api/public/download/$platform")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const key = ALIASES[String(params.platform || "").toLowerCase()];
        const fallback = `https://github.com/${REPO}/releases`;
        if (!key || !PLATFORM_PATTERNS[key]) {
          return Response.redirect(fallback, 302);
        }
        try {
          const data = await resolveReleases();
          const asset = data.platforms[key];
          return Response.redirect(asset?.url || fallback, 302);
        } catch {
          return Response.redirect(fallback, 302);
        }
      },
    },
  },
});

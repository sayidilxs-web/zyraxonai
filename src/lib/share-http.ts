export const SHARE_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
} as const;

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...SHARE_CORS },
  });
}

export function preflight(): Response {
  return new Response(null, { status: 204, headers: SHARE_CORS });
}

export function errorResponse(error: unknown): Response {
  const status = (error as { status?: number }).status ?? 500;
  const message = error instanceof Error ? error.message : 'Unexpected error';
  console.error('[shares]', status, message);
  return json({ error: message }, status);
}

export function siteOrigin(request: Request): string {
  const url = new URL(request.url);
  const proto = request.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? url.host;
  return `${proto}://${host}`;
}

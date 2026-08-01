/** Shared HTTP helpers for the ZYRAXON REST API. */

export const API_CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Hub-Signature-256, X-GitHub-Event',
  'Access-Control-Max-Age': '86400',
};

export type ApiError = { code: string; message: string };

export class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (m: string) => new HttpError(400, 'BAD_REQUEST', m);
export const unauthorized = (m = 'Authentication required') => new HttpError(401, 'UNAUTHORIZED', m);
export const forbidden = (m = 'Not allowed') => new HttpError(403, 'FORBIDDEN', m);
export const notFound = (m = 'Not found') => new HttpError(404, 'NOT_FOUND', m);
export const conflict = (m: string) => new HttpError(409, 'CONFLICT', m);
export const tooMany = (m = 'Rate limit exceeded') => new HttpError(429, 'RATE_LIMITED', m);

export function ok(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ success: true, data, error: null }), {
    status,
    headers: { 'Content-Type': 'application/json', ...API_CORS, ...extraHeaders },
  });
}

export function fail(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ success: false, data: null, error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json', ...API_CORS },
  });
}

export function toErrorResponse(error: unknown): Response {
  if (error instanceof HttpError) return fail(error.status, error.code, error.message);
  const message = error instanceof Error ? error.message : 'Unexpected server error';
  console.error('[api]', error);
  return fail(500, 'INTERNAL_ERROR', message);
}

export function preflight(): Response {
  return new Response(null, { status: 204, headers: API_CORS });
}

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    const value = await request.json();
    if (!value || typeof value !== 'object') throw badRequest('JSON object body required');
    return value as T;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw badRequest('Invalid JSON body');
  }
}

export function paginate(url: URL, defaultLimit = 20): { page: number; limit: number; from: number; to: number } {
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? defaultLimit) || defaultLimit));
  const from = (page - 1) * limit;
  return { page, limit, from, to: from + limit - 1 };
}

export function pageMeta(page: number, limit: number, total: number) {
  return { page, limit, total, has_more: page * limit < total };
}

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || `item-${Date.now().toString(36)}`;
}

export function requireString(value: unknown, field: string, max = 5000): string {
  if (typeof value !== 'string' || !value.trim()) throw badRequest(`${field} is required`);
  if (value.length > max) throw badRequest(`${field} exceeds ${max} characters`);
  return value.trim();
}

export function optionalString(value: unknown, field: string, max = 5000): string | null {
  if (value === undefined || value === null || value === '') return null;
  return requireString(value, field, max);
}

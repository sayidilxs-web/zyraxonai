import { createFileRoute } from '@tanstack/react-router';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

const handler = async ({ request, params }: { request: Request; params: { _splat?: string } }) => {
  const { handleApiRequest } = await import('@/lib/api/router.server');
  return handleApiRequest(request, params._splat ?? '');
};

export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: handler,
      POST: handler,
      PATCH: handler,
      PUT: handler,
      DELETE: handler,
    },
  },
});

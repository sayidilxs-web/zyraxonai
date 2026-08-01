import { createFileRoute } from '@tanstack/react-router';
import { preflight } from '@/lib/api/http.server';

async function dispatch(request: Request, splat: string | undefined) {
  const { handleApiRequest } = await import('@/lib/api/router.server');
  return handleApiRequest(request, splat ?? '');
}

const handler = async ({ request, params }: { request: Request; params: { _splat?: string } }) =>
  dispatch(request, params._splat);

export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: handler,
      POST: handler,
      PATCH: handler,
      PUT: handler,
      DELETE: handler,
    },
  },
});

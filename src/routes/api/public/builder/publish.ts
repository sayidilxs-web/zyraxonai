import { createFileRoute } from '@tanstack/react-router';
import { publishSite } from '@/lib/builder/github-publish.server';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

export const Route = createFileRoute('/api/public/builder/publish')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let body: any;
        try {
          body = await request.json();
        } catch {
          return Response.json({ ok: false, error: 'Invalid JSON body' }, { status: 400, headers: CORS });
        }

        if (typeof body?.html === 'string' && body.html.length > 5_000_000) {
          return Response.json({ ok: false, error: 'Site is too large (5MB limit).' }, { status: 413, headers: CORS });
        }

        try {
          const result = await publishSite({
            token: String(body?.token || ''),
            repo: String(body?.repo || ''),
            html: String(body?.html || ''),
            description: body?.description ? String(body.description) : undefined,
            customDomain: body?.customDomain ? String(body.customDomain) : undefined,
            privateRepo: Boolean(body?.privateRepo),
          });
          return Response.json(result, { status: result.ok ? 200 : 400, headers: CORS });
        } catch (error) {
          return Response.json(
            { ok: false, error: error instanceof Error ? error.message : 'Publish failed' },
            { status: 500, headers: CORS },
          );
        }
      },
    },
  },
});

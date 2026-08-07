import { createFileRoute } from '@tanstack/react-router';
import { ZEN_FREE_MODELS, DEFAULT_ZEN_MODEL, zenChatStream, type ChatMessage } from '@/lib/builder/zen.server';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

export const Route = createFileRoute('/api/public/builder/chat')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => Response.json({ models: ZEN_FREE_MODELS }, { headers: CORS }),
      POST: async ({ request }) => {
        let body: any;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: 'Invalid JSON body' }, { status: 400, headers: CORS });
        }

        const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages.slice(-24) : [];
        if (!messages.length) return Response.json({ error: 'messages required' }, { status: 400, headers: CORS });

        const requested = typeof body?.model === 'string' ? body.model : DEFAULT_ZEN_MODEL;
        const allowed = ZEN_FREE_MODELS.some((m) => m.id === requested);
        const apiKey = typeof body?.apiKey === 'string' && body.apiKey.trim() ? body.apiKey.trim() : undefined;
        // Non-free models are only reachable when the caller brings their own Zen key.
        const model = allowed || apiKey ? requested : DEFAULT_ZEN_MODEL;

        const clean: ChatMessage[] = messages
          .filter((m) => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
          .map((m) => ({ role: m.role, content: String(m.content).slice(0, 60000) }));

        return zenChatStream(model, clean, apiKey);
      },
    },
  },
});

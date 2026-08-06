import { createFileRoute } from '@tanstack/react-router';
import { handleCreateShare } from '@/lib/share-handlers';
import { preflight } from '@/lib/share-http';

export const Route = createFileRoute('/api/public/shares/')({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request }) => handleCreateShare(request),
    },
  },
});

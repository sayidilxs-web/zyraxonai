import { createFileRoute } from '@tanstack/react-router';
import { handleCreateShare } from '@/lib/share-handlers';
import { preflight } from '@/lib/share-http';

// Alias of /api/public/shares (kept for clients configured with /api/shares).
export const Route = createFileRoute('/api/shares/')({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request }) => handleCreateShare(request),
    },
  },
});

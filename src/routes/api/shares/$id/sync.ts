import { createFileRoute } from '@tanstack/react-router';
import { handleSyncShare } from '@/lib/share-handlers';
import { preflight } from '@/lib/share-http';

export const Route = createFileRoute('/api/shares/$id/sync')({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request, params }) => handleSyncShare(request, params.id),
    },
  },
});

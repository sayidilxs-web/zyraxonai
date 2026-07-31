import { createFileRoute } from '@tanstack/react-router';
import { handleDeleteShare } from '@/lib/share-handlers';
import { preflight } from '@/lib/share-http';

export const Route = createFileRoute('/api/public/shares/$id/')({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      DELETE: async ({ request, params }) => handleDeleteShare(request, params.id),
    },
  },
});

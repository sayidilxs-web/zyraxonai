import { createFileRoute } from '@tanstack/react-router';
import { handleGetShareData } from '@/lib/share-handlers';
import { preflight } from '@/lib/share-http';

export const Route = createFileRoute('/api/public/shares/$id/data')({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ params }) => handleGetShareData(params.id),
    },
  },
});

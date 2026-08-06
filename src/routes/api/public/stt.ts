import { createFileRoute } from '@tanstack/react-router';

/**
 * POST /api/public/stt
 *
 * Speech-to-Text endpoint for the ZYRAXON-AI Electron app.
 *
 * Two ways to call it:
 *
 * 1) multipart/form-data (recommended)
 *    FormData fields:
 *      - file  : audio blob (wav / mp3 / mp4 / webm)
 *      - model : optional, defaults to "openai/gpt-4o-mini-transcribe"
 *      - language : optional ISO-639-1 (e.g. "en", "bn"); omit to auto-detect
 *
 * 2) raw binary body
 *    Headers: Content-Type: audio/wav (or audio/webm, audio/mpeg, audio/mp4)
 *    Query params:
 *      - language : optional
 *      - model    : optional
 *
 * Response JSON:
 *   { success: boolean, text: string, language?: string, error?: string }
 *
 * CORS is open (*), so an Electron renderer or any origin can call it.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
} as const;

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  ...CORS_HEADERS,
} as const;

const DEFAULT_MODEL = 'openai/gpt-4o-mini-transcribe';
const MAX_BYTES = 25 * 1024 * 1024; // 25 MiB (gateway cap)

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function extForMime(mime: string): string {
  const m = mime.split(';')[0].trim().toLowerCase();
  if (m.includes('wav')) return 'wav';
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3';
  if (m.includes('mp4') || m.includes('m4a') || m.includes('aac')) return 'mp4';
  if (m.includes('ogg') || m.includes('opus')) return 'ogg';
  if (m.includes('webm')) return 'webm';
  if (m.includes('flac')) return 'flac';
  return 'webm';
}

export const Route = createFileRoute('/api/public/stt')({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: CORS_HEADERS }),

      POST: async ({ request }) => {
        try {
          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return jsonResponse(
              {
                success: false,
                text: '',
                error:
                  'LOVABLE_API_KEY is not configured on the server. Enable Lovable AI in the workspace.',
              },
              500,
            );
          }

          const url = new URL(request.url);
          const qLang = url.searchParams.get('language') || undefined;
          const qModel = url.searchParams.get('model') || undefined;

          const contentType = request.headers.get('content-type') || '';

          let audioBlob: Blob;
          let filename = 'recording.webm';
          let language: string | undefined = qLang;
          let model: string = qModel || DEFAULT_MODEL;

          if (contentType.includes('multipart/form-data')) {
            const form = await request.formData();
            const f = form.get('file');
            if (!(f instanceof Blob)) {
              return jsonResponse(
                { success: false, text: '', error: 'Missing "file" field in form data.' },
                400,
              );
            }
            audioBlob = f;
            filename =
              (f as File).name ||
              `recording.${extForMime(f.type || 'audio/webm')}`;
            const lf = form.get('language');
            if (typeof lf === 'string' && lf) language = lf;
            const mf = form.get('model');
            if (typeof mf === 'string' && mf) model = mf;
          } else {
            // Raw binary body
            const buf = await request.arrayBuffer();
            if (!buf || buf.byteLength === 0) {
              return jsonResponse(
                { success: false, text: '', error: 'Empty request body.' },
                400,
              );
            }
            if (buf.byteLength > MAX_BYTES) {
              return jsonResponse(
                { success: false, text: '', error: 'Audio too large (>25 MiB).' },
                413,
              );
            }
            const mime = contentType || 'audio/webm';
            audioBlob = new Blob([buf], { type: mime });
            filename = `recording.${extForMime(mime)}`;
          }

          if (audioBlob.size === 0) {
            return jsonResponse(
              { success: false, text: '', error: 'Audio blob is empty.' },
              400,
            );
          }
          if (audioBlob.size > MAX_BYTES) {
            return jsonResponse(
              { success: false, text: '', error: 'Audio too large (>25 MiB).' },
              413,
            );
          }

          const upstream = new FormData();
          upstream.append('model', model);
          upstream.append('file', audioBlob, filename);
          if (language) upstream.append('language', language);

          const gwRes = await fetch(
            'https://ai.gateway.lovable.dev/v1/audio/transcriptions',
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${apiKey}` },
              body: upstream,
            },
          );

          if (!gwRes.ok) {
            const errText = await gwRes.text().catch(() => '');
            console.error('[STT] gateway error', gwRes.status, errText);
            return jsonResponse(
              {
                success: false,
                text: '',
                error: `Transcription failed (${gwRes.status}): ${errText.slice(0, 300)}`,
              },
              gwRes.status === 402 || gwRes.status === 429 ? gwRes.status : 502,
            );
          }

          const data = (await gwRes.json()) as {
            text?: string;
            language?: string;
          };

          return jsonResponse({
            success: true,
            text: data.text ?? '',
            language: data.language ?? language,
          });
        } catch (error) {
          console.error('[STT] handler error', error);
          return jsonResponse(
            {
              success: false,
              text: '',
              error:
                error instanceof Error ? error.message : 'Internal server error',
            },
            500,
          );
        }
      },
    },
  },
});

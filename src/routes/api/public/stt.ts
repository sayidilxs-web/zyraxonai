import type { RequestEvent } from '@tanstack/react-start/server';
import { convertAudioToText } from '../../../lib/stt-service';
import type { STTRequest, STTResponse } from '../../../lib/types/stt';

/**
 * POST /api/public/stt
 * 
 * Backend endpoint for Speech-To-Text conversion
 * 
 * Request:
 * - Body: Binary audio data (Blob/ArrayBuffer)
 * - Query params:
 *   - language: Language code (e.g., 'en-US', 'bn-IN', 'fr-FR')
 *   - format: Audio format (wav, mp3, webm, ogg)
 * 
 * Response:
 * {
 *   success: boolean,
 *   text: string,
 *   language?: string,
 *   confidence?: number,
 *   error?: string
 * }
 * 
 * Example usage from application:
 * ```
 * const audioBlob = ...; // From microphone recording
 * const response = await fetch('/api/public/stt?language=bn-IN', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/octet-stream' },
 *   body: audioBlob,
 * });
 * const result = await response.json();
 * console.log(result.text); // Converted text
 * ```
 */

export async function POST(event: RequestEvent) {
  try {
    const request = event.request;
    
    // Extract query parameters
    const url = new URL(request.url);
    const language = url.searchParams.get('language') || 'en-US';
    const format = url.searchParams.get('format') || 'webm';

    // Get binary audio data from request body
    const audioBuffer = await request.arrayBuffer();

    if (!audioBuffer || audioBuffer.byteLength === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          text: '',
          error: 'No audio data provided in request body',
        } as STTResponse),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[STT] Processing audio: ${audioBuffer.byteLength} bytes, language: ${language}`);

    // Convert audio to text
    const result = await convertAudioToText(audioBuffer, language);

    // Return result
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[STT] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        text: '',
        error: error instanceof Error ? error.message : 'Internal server error',
      } as STTResponse),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * OPTIONS /api/public/stt
 * CORS preflight handler
 */
export async function OPTIONS(event: RequestEvent) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

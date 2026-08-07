/** OpenCode Zen provider integration (free, keyless models). */

export const ZEN_BASE = 'https://opencode.ai/zen/v1';

export type ZenModel = { id: string; label: string; blurb: string };

/** Free Zen models that work without any API key. */
export const ZEN_FREE_MODELS: ZenModel[] = [
  { id: 'deepseek-v4-flash-free', label: 'DeepSeek V4 Flash', blurb: 'Fast, strong coder — default' },
  { id: 'mimo-v2.5-free', label: 'MiMo V2.5', blurb: 'Balanced reasoning' },
  { id: 'nemotron-3-ultra-free', label: 'Nemotron 3 Ultra', blurb: 'Large reasoning model' },
  { id: 'longcat-2.0-free', label: 'LongCat 2.0', blurb: 'Long context' },
  { id: 'laguna-s-2.1-free', label: 'Laguna S 2.1', blurb: 'Lightweight & quick' },
];

export const DEFAULT_ZEN_MODEL = ZEN_FREE_MODELS[0]!.id;

export const BUILDER_SYSTEM_PROMPT = `You are ZYRAXON Blueprint, an elite web engineer that builds complete websites.

RULES:
1. Always reply with ONE complete, self-contained HTML document inside a single \`\`\`html code fence.
2. The document must include everything inline: <style>, <script>, fonts via CDN link, no build step, no external framework files.
3. Modern, production-grade design: responsive, accessible, semantic HTML, meta title + description, dark-mode friendly.
4. When the user asks for a change, output the FULL updated document again (never a diff, never a partial snippet).
5. Before the code fence, write at most 2 short sentences describing what you built or changed. No long explanations.
6. Use real, working interactions (JS) instead of placeholder text like "coming soon".`;

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

/** Proxy a streaming chat completion to OpenCode Zen. */
export async function zenChatStream(
  model: string,
  messages: ChatMessage[],
  apiKey?: string,
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const upstream = await fetch(`${ZEN_BASE}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      stream: true,
      max_tokens: 16000,
      messages: [{ role: 'system', content: BUILDER_SYSTEM_PROMPT }, ...messages],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '');
    return new Response(
      JSON.stringify({ error: `Zen error ${upstream.status}`, detail: text.slice(0, 800) }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

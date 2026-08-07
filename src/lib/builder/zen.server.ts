/** OpenCode Zen provider integration (free, keyless models). */

export const ZEN_BASE = 'https://opencode.ai/zen/v1';

export type ZenModel = { id: string; label: string; blurb: string };

/** Free Zen models that work without any API key. */
export const ZEN_FREE_MODELS: ZenModel[] = [
  { id: 'big-pickle', label: 'Big Pickle', blurb: 'Most powerful — best code quality' },
  { id: 'deepseek-v4-flash-free', label: 'DeepSeek V4 Flash', blurb: 'Fast, strong coder' },
  { id: 'mimo-v2.5-free', label: 'MiMo V2.5', blurb: 'Balanced reasoning' },
  { id: 'gemini-3-flash', label: 'Gemini 3 Flash', blurb: 'Google fast model' },
  { id: 'gpt-5-nano', label: 'GPT-5 Nano', blurb: 'Compact & quick' },
  { id: 'nemotron-3-ultra-free', label: 'Nemotron 3 Ultra', blurb: 'Large reasoning model' },
  { id: 'longcat-2.0-free', label: 'LongCat 2.0', blurb: 'Long context' },
  { id: 'laguna-s-2.1-free', label: 'Laguna S 2.1', blurb: 'Lightweight & quick' },
  { id: 'qwen3.5-plus', label: 'Qwen 3.5 Plus', blurb: 'Alibaba coding model' },
  { id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro', blurb: 'Pro-tier coder' },
];

export const DEFAULT_ZEN_MODEL = ZEN_FREE_MODELS[0]!.id;

export const BUILDER_SYSTEM_PROMPT = `You are ZYRAXON Blueprint, an elite web engineer that builds world-class websites. You produce production-ready code that rivals the best sites on the internet — Vercel, Linear, Stripe, Apple-level quality.

CRITICAL RULES:
1. Always reply with ONE complete, self-contained HTML document inside a single \`\`\`html code fence.
2. Everything MUST be inline: all CSS in <style> tags, all JS in <script> tags, fonts via CDN <link>. No external files, no build steps.
3. DESIGN QUALITY: Use modern CSS features — gradients, glassmorphism, CSS grid, flexbox, smooth animations, micro-interactions. Think dark-mode-first with vibrant accent colors (#00f5ff, #8957e5, #3fb950). Use subtle shadows and transitions on hover/focus states.
4. TYPOGRAPHY: Use Inter or similar modern sans-serif via Google Fonts CDN. Proper heading hierarchy, good line-height (1.6-1.7), letter-spacing on headings.
5. RESPONSIVE: Must work perfectly on desktop, tablet, and mobile. Use CSS media queries.
6. SEMANTIC HTML: Use <header>, <nav>, <main>, <section>, <footer>, <article> etc. Include proper <meta> tags and <title>.
7. REAL INTERACTIONS: Working navigation, animated counters, smooth scroll, form validation with visible feedback, working search/filter if needed. NO placeholder text like "coming soon".
8. When the user asks for changes, output the FULL updated document (never a diff).
9. Before the code fence, write exactly 1 sentence describing what you built/changed.
10. Make it look expensive. Every pixel matters.`;

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

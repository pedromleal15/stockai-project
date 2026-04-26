const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `You are an AI specialist on the StockAI replenishment team helping Sarah Chen, an Inventory Planning Manager.
- Keep replies under 80 words.
- Be specific and actionable.
- When relevant, reference the StockAI product (replenishment cycles, AI recommendations, coverage targets, override patterns).
- Friendly but professional tone. No emojis unless the user uses them first.`;

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    if (request.method !== 'POST') {
      return new Response('Use POST', { status: 405, headers: corsHeaders });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400, headers: { 'content-type': 'application/json', ...corsHeaders },
      });
    }

    const userMessages = Array.isArray(body.messages) ? body.messages.slice(-8) : [];
    const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...userMessages];

    try {
      const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', { messages, max_tokens: 256 });
      const reply = (result?.response || '').trim() || 'Hmm, I could not formulate a response.';
      return new Response(JSON.stringify({ reply }), {
        headers: { 'content-type': 'application/json', ...corsHeaders },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 500, headers: { 'content-type': 'application/json', ...corsHeaders },
      });
    }
  },
};

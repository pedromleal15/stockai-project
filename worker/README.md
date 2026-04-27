# StockAI Chat Worker

A Cloudflare Worker that proxies the Home-page chat to Cloudflare Workers AI (`@cf/meta/llama-3.1-8b-instruct`, free tier).

## Deploy (one-time)

```bash
cd worker
npx wrangler login                 # opens browser
npx wrangler deploy                # publishes the worker
```

The deploy URL looks like `https://stockai-chat.<your-account>.workers.dev`.

## Wire to the prototype

Open `stockai-case-study-deliverables.html` and find:

```js
const STOCKAI_CHAT_URL = '';  // paste your worker URL here
```

Paste the URL and reload. The chat in the Home view will start replying with real LLAMA responses.

## Local dev

```bash
npx wrangler dev   # starts worker on http://localhost:8787
```

## Notes

- Uses Workers AI binding — **no API key** in code, runs on Cloudflare free tier.
- Last 8 messages are forwarded as history (truncation prevents prompt bloat).
- System prompt scopes the bot to Sarah's Inventory Planner persona.
- CORS open (`*`) for prototype convenience — restrict to your domain in production.

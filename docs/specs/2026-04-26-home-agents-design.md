# Home + Agents — Design Spec

**Date:** 2026-04-26  
**Branch:** `new-screens`  
**Scope:** Two new views inside Hi-Fi (page-5) accessible via the existing rail (Home and Agents icons), plus a serverless chat backend.

---

## 1 — Architecture decisions (locked)

| # | Decision |
|---|---|
| 1 | Home & Agents live as **internal views of page-5** (rail click swaps `app-main` content; deliverable 5 stays active). Realistic product behavior over didactic. |
| 2 | Chat in Home is **functional** — calls a Cloudflare Worker that runs `@cf/meta/llama-3.1-8b-instruct` via Workers AI binding (free tier). |
| 3 | Gamification = **both** personal streak + team leaderboard (Sarah is in the leaderboard). |
| 4 | Responsive target = **desktop ≥ 1280** + **tablet ≥ 768**. Mobile out of scope. |

---

## 2 — Home (`app-main--home`)

```
┌─────────────────────────── Hero (full-width) ───────────────────────────┐
│  Greeting + 43 items stat + 3 mini-stats + CTA   |   isometric SVG     │
└──────────────────────────────────────────────────────────────────────────┘
┌── Streak (4-col) ──┬── Chat (4-col) ───┬── AI Insights (4-col) ──────┐
│   🔥 12 weeks       │  4 agent avatars   │  • Seasonality spike (3)   │
│   Pro Planner       │  messages list     │  • Bags coverage -8%       │
│   3 badges          │  input             │  • Override pattern        │
└─────────────────────┴────────────────────┴────────────────────────────┘
┌── This week (6-col) ─────────────┬── Critical items (6-col) ──────────┐
│  Sparkline + 3 KPIs              │  Top 3 product rows                │
└──────────────────────────────────┴────────────────────────────────────┘
┌─────────────────── Leaderboard (full-width) ────────────────────────┐
│  Rank | Avatar | Name | Cycles | Accuracy | Streak                  │
│  Sarah's row highlighted in brand blue                              │
└─────────────────────────────────────────────────────────────────────┘
```

### Key cards
- **Hero** — 64px greeting, animated number counter on "43", isometric stack of boxes SVG
- **Streak** — flame emoji with subtle scale pulse, progress bar to next tier, 3 badge pills
- **Chat** — header + 4 agent dots + scroll messages + input that POSTs to Worker
- **Insights** — 3 actionable AI-generated cards
- **Week glance** — sparkline + KPI numbers
- **Critical items** — 3 product rows (image + name + delta)
- **Leaderboard** — table with 5 planners, Sarah's row tinted accent

### Animations
- Hero number: `fx-count` (already exists)
- Card grid: stagger `cardRise` 50ms apart
- Streak flame: `streakFlame` keyframe (subtle 1.05 scale loop)
- Sparkline: SVG path stroke-dashoffset draw-on
- Hover on every card: lift `-2px` + shadow expand

---

## 3 — Agents (`app-main--agents`)

```
┌─ Header ────────────────────────────────────────── + New agent ─┐
│  Your AI team                                                   │
│  5 specialists ready to help                                    │
└─────────────────────────────────────────────────────────────────┘
┌── Agent card ──┬── Agent card ──┬── Agent card ──┐
│  📊 Sales      │  📦 Replen     │  📈 Forecast   │
│  Sales strat.  │  Replen exp.   │  Forecast      │
│  23 chats…     │  41 chats…     │  17 chats…     │
│  [Chat]  ⋮     │  [Chat]  ⋮     │  [Chat]  ⋮     │
├────────────────┼────────────────┼────────────────┤
│  🤝 Supplier   │  🔍 Auditor    │  + Create new  │
│  Negotiator    │  Inventory     │  (dashed)      │
└────────────────┴────────────────┴────────────────┘
```

### Pre-built agents
1. **Sales Strategist** — 📊 — "Closes deals + identifies upsell"
2. **Replenishment Expert** — 📦 — "Optimizes order quantities + cycle timing"
3. **Forecasting Analyst** — 📈 — "Predicts demand spikes + seasonality"
4. **Supplier Negotiator** — 🤝 — "Benchmarks pricing + flags better deals"
5. **Inventory Auditor** — 🔍 — "Catches anomalies + data integrity"

### Modal — `+ Create new`
- Width 420px, centered, scale-in animation
- Inputs: **Name** + **Specialty** (textarea)
- 5 specialty chips (Sales / Marketing / Finance / Replenishment / Forecasting) — click to seed text
- Footer: Cancel (ghost) + Save (primary)
- ESC closes / click outside closes / focus trap

---

## 4 — Rail navigation logic

```js
// Pseudo
function setView(view) { // 'home' | 'replenishment' | 'canvas' | 'agents'
  document.querySelectorAll('.app-main, .app-main--home, .app-main--agents').forEach(el => el.style.display = 'none');
  document.querySelector(`.app-main--${view}`).style.display = '';
  // Update rail-icon.active
}
```

- Default view: `replenishment` (current behavior preserved)
- `railHome.click → setView('home')`
- `railReplen.click → setView('replenishment')`
- `railCanvas.click → setCanvas(true)` (existing)
- `railAgents.click → setView('agents')`

---

## 5 — Cloudflare Worker (chat backend)

**Folder:** `worker/`  
**Files:** `wrangler.toml`, `src/index.js`, `README.md`

### Worker code
```js
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    const { messages } = await request.json();
    const ai = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [{ role: 'system', content: 'You are an AI specialist on the StockAI replenishment team. Keep replies under 80 words and actionable.' }, ...messages]
    });
    return new Response(JSON.stringify({ reply: ai.response }), { headers: { 'content-type': 'application/json', ...corsHeaders } });
  }
};
const corsHeaders = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' };
```

### Frontend → Worker flow
```js
const r = await fetch('https://stockai-chat.<acct>.workers.dev', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ messages: chatHistory })
});
const { reply } = await r.json();
```

User must run `cd worker && npx wrangler deploy` once with their Cloudflare account. Worker URL gets pasted into a JS const in the HTML.

---

## 6 — Design system reuse

| Element | Reuse |
|---|---|
| Card surface | `var(--surface)` + `var(--r-xl)` + `var(--shadow-sm)` |
| Title | `.page-title` (Bebas Neue) |
| Body text | Inter |
| Accent | `var(--accent)` = #2f6fed |
| Dark mode | Inherits `.hifi-wrapper.hifi-dark` palette |
| Animations | `cardRise`, `personaNameFlow`, `diagDotPulse` already defined |

---

## 7 — Out of scope (YAGNI)

- Mobile layout (≤ 767px)
- Drag-and-drop between cards
- Editor for agent system prompt (modal is name + free-text only)
- Chat history persistence (in-memory only)
- Real auth — Sarah Chen is hardcoded
- Onboarding tour

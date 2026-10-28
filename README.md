# UNISON — Different tastes. One great plan.

UNISON is a fairness-aware group taste negotiation agent for the [Qloo Agentic Hackathon](https://qloo.devpost.com/). Instead of recommending the most popular option or maximizing average taste, it tries to avoid outcomes that leave one participant unhappy. **Currently the demo mode is complete and Qloo live integration is unverified until an event API key is supplied.**

## Fast start

Requires Node.js 20+. **No npm packages or API key required for demo mode.**

```bash
npm start
# http://localhost:3000
npm test
npm run check
```

To enable the live Qloo branch locally, set the key in your terminal (never commit it):

```bash
export QLOO_API_KEY='YOUR_EVENT_KEY'
npm start
```

On Windows PowerShell: `$env:QLOO_API_KEY="YOUR_EVENT_KEY"; npm start`.

## Architecture

- `public/*` — accessible, responsive frontend with multi-favorite group onboarding, city/budget constraints, honest demo mode, per-person comparisons, vetoes, and execution trace.
- `server.js` — HTTP server and same-origin `/api/status` + `/api/plan`; key stays server-side.
- `src/agent.js` — multi-step agent orchestration and input validation.
- `src/qloo.js` — server-only Qloo adapter. It resolves exact favorites with `GET /search`, then uses `GET /v2/insights` with `filter.type`, repeated `signal.interests.entities`, and `filter.location.query` for places. It uses bounded TTL/LRU caching and retries only safe GET failures. `X-Api-Key` is sent only upstream by server.
- `src/demo.js` — deterministic, **simulated local preference scenarios** whose outcome changes with the submitted favorites; they are visibly separated from real Qloo results.
- `src/rank.js` — explainable max-min/average/coverage ranking, with vetoes.
- `test/*` — Node native test runner.

The optional host environment `QLOO_BASE_URL` may be set only to `https://hackathon.api.qloo.com` (default) or `https://api.qloo.com`.

## Decision rule

For candidate `c`, known relative-fit estimates use ranks from each person's independent Qloo results (top rank 100, later ranks step down). Missing data stays `null`, never 0. For people with any signal:

```
Utility = 0.55 * minimum_known_fit + 0.35 * average_known_fit + 0.10 * coverage_percent
```

This is an **unvalidated heuristic, not probability, objective satisfaction, or Qloo's native affinity score.** Coverage indicates the share of group members with a signal. On one person's signal only, high fit must not imply guaranteed consensus; clearly check coverage. No LLM invented justifications. Demo-only popularity comparator is illustrative and isn't evidence of measured user outcome.

## Agent flow

1. Plan a bounded run: 2–5 people, up to three favorites each, target domain, city, budget, and prior vetoes.
2. In live mode, resolve each favorite via `/search`; require exact name matches and surface ambiguous names rather than silently guessing.
3. Call `/v2/insights` once per person with `filter.type=urn:entity:place` or `urn:entity:movie`, repeated `signal.interests.entities`, plus `filter.location.query` for places.
4. Merge candidate IDs and record each person's relative rank-derived signal. Absence means unknown, not dislike.
5. Evaluate trade-offs, rank for compromise, and replan after a veto; the trace labels Qloo tool calls separately from local computation.

## Important next steps before hackathon submission

- Add the event-issued API key as a secret in the hosting provider.
- Validate `GET /search` and `GET /v2/insights` response envelopes with that actual key and refine the strict response parser if necessary. The adapter sends the documented parameter names and has sanitized fixture tests, but **live API was not tested without the key**. Official docs/OpenAPI retrieval was also blocked by a 403 in this environment.
- Add integration smoke tests against a redacted real-response fixture; handle quota and errors.
- Deploy publicly to Render (included `render.yaml`) or another Node-capable host; GitHub Pages alone cannot host this secure server.
- Verify live end-to-end from two different browser/device sessions, mobile usability, input edge cases, and proper error flows.
- Make repository **public** and ensure MIT `LICENSE` is visible at the top repo UI.
- Submit the **public hosted app + repository URL + written project description** to Devpost by Oct 30, 2026 at 11:45pm EDT (Oct 31, 04:45am Oslo); demo video is optional.

## Environment & security

Never put `QLOO_API_KEY` in GitHub, browser JavaScript, screenshots, logs, demo content, or messages. Set through deployment environment secrets. Only public test fixtures belong in source. No key? Select Demo mode, with no claims of actual Qloo usage. Qloo errors never trigger a silent mock fallback.

## License

MIT (see `LICENSE`).

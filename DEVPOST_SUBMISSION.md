# UNISON — Different tastes. One great plan.

## Project story

Planning with friends is usually optimized for the loudest preference or the average score. UNISON is a small-group negotiation agent that instead shows a defensible compromise: it protects the lowest observed relative fit, considers the observed average, calls out missing evidence, and gives every participant a veto.

Judges can use the fully local demo with two to five people immediately. It contains fictional candidates and fictional signals, visibly labeled as such. Nothing in demo mode is presented as Qloo data.

## Technical architecture

- A dependency-free Node HTTP server keeps `QLOO_API_KEY` server-side and exposes same-origin status and planning endpoints.
- The agent plans a bounded run, resolves up to three exact favorites per person through Qloo `/search` in live mode, then requests `/v2/insights` for each person using `filter.type`, `signal.interests.entities`, and city filtering for places. It evaluates the merged evidence and replans after vetoes.
- Ranking is an explainable project heuristic: `0.55 × lowest observed fit + 0.35 × observed average + 0.10 × coverage`. It is not a Qloo score or a happiness prediction.
- A local fictional catalog powers demo mode. Live failures are explicit; the app never silently changes a failed Qloo request into demo evidence.

## Demo instructions

1. Start with `npm start` and open the service locally.
2. Leave **Demo mode** selected and add 2–5 people with cultural references.
3. Choose a place or movie-night plan, then select **Find a fairer plan**.
4. Inspect each candidate’s observed floor, average, coverage, trace, and veto behavior.

## Qloo call trace and activation

When the event key is securely configured, live mode makes bounded HTTPS calls with `X-Api-Key` only on the server:

1. `GET /search?query=…` for each favorite; an exact name is required and ambiguous matches are surfaced.
2. `GET /v2/insights?filter.type=urn:entity:place|urn:entity:movie&signal.interests.entities=…`, with `filter.location.query=…` for places, once per participant.
3. The agent merges returned candidates and records rank-derived relative signals.

Live calls have **not been validated** because no event key is available. Before presenting live results, validate the event response envelopes and the exact query parameters with the issued key; errors are intentionally surfaced instead of guessed around. The official docs/OpenAPI host returned 403 from this environment, so it was not treated as a substitute for an authenticated response.

## Compliance checklist

- [x] No key in client code, repository files, URLs, logs, or demo data.
- [x] Demo evidence is fictional and prominently labeled.
- [x] Qloo routes are limited to `/search` and `/v2/insights`.
- [x] Native unit and HTTP tests cover ranking, validation, demo planning, and status.
- [ ] Public hosted Node URL — requires explicit deployment authorization and a host configuration.
- [ ] Event-key live smoke test — requires secure key configuration.
- [ ] Add final public repository and live-demo URLs after verification.

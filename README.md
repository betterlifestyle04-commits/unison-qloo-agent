# UNISON — Different tastes. One great plan.

UNISON is a fairness-aware group taste negotiation agent for the [Qloo Agentic Hackathon](https://qloo.devpost.com/). Instead of recommending the most popular option or maximizing average taste, it tries to avoid outcomes that leave one participant unhappy. **The public application is deployed and the server reports the hackathon Qloo key as configured. A user-observed live-result example exists; production behavior remains subject to further authenticated end-to-end and visual testing.**

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
- `src/qloo.js` — server-only Qloo adapter. It resolves exact favorites with `GET /search`, then uses `GET /v2/insights` with documented comma-separated `signal.interests.entities`, `filter.type`, and `filter.location.query` for places. It uses bounded TTL/LRU caching, a shared shortlist evaluated per person with `filter.results.entities`, and retries only rate-limit/transient GET failures. `X-Api-Key` is sent only upstream by server.
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
3. Call `/v2/insights` once per person with `filter.type=urn:entity:place` or `urn:entity:movie` and one comma-separated `signal.interests.entities` value. Places use `filter.location.query` with `filter.location.radius=0`; budget maps to documented `filter.price_level.max` (1, 2, or 4).
4. Build a bounded shared shortlist, then evaluate that shortlist per person with `filter.results.entities`. An affinity returned by Qloo is retained as observed; a rank-derived signal is labeled as local context. Absence means unknown, not dislike.
5. A candidate needs observed evidence from every participant before UNISON calls it a group compromise. Otherwise the app asks for a meaningful next step rather than naming a winner. Vetoes trigger replanning, and the trace labels Qloo tool calls separately from local computation.

## Important next steps before hackathon submission

- Add the event-issued API key as a secret in the hosting provider.
- Validate `GET /search` and `GET /v2/insights` response envelopes with that actual key and refine the parser if necessary. The documented Insights entity envelope is covered by sanitized fixtures from Qloo's public docs, but **live API was not tested without the key**.
- Add integration smoke tests against a redacted real-response fixture; handle quota and errors.
- Deploy publicly to Render (included `render.yaml`) or another Node-capable host; GitHub Pages alone cannot host this secure server.
- Verify live end-to-end from two different browser/device sessions, mobile usability, input edge cases, and proper error flows.
- Make repository **public** and ensure MIT `LICENSE` is visible at the top repo UI.
- Submit the **public hosted app + repository URL + written project description** to Devpost by Oct 30, 2026 at 11:45pm EDT (Oct 31, 04:45am Oslo); demo video is optional.

## Environment & security

Never put `QLOO_API_KEY` in GitHub, browser JavaScript, screenshots, logs, demo content, or messages. Set through deployment environment secrets. Only public test fixtures belong in source. No key? Select Demo mode, with no claims of actual Qloo usage. Qloo errors never trigger a silent mock fallback.

The public `/api/plan` endpoint limits each client to 20 requests per minute and runs at most four plans concurrently. Live execution caps work at five people, three favorites per person, a 12-item shortlist, and cached GETs to protect Qloo quota.

## Render deployment

1. Create a Render **Web Service** from this repository. Render's existing configuration uses `npm install`, `npm start`, and `/api/status` as its health check.
2. Set Node 22 (already declared in `render.yaml`). Do not add `QLOO_API_KEY` for a demo-only deployment; `/api/status` will report `demo` and the app remains functional.
3. For live mode, add `QLOO_API_KEY` as a Render secret, optionally set `QLOO_BASE_URL` to `https://hackathon.api.qloo.com`, deploy, and make one authenticated smoke request. Do not describe live mode as verified until that succeeds.
4. Confirm the public homepage and `/api/status` return 200 after deployment; add the verified URL to the Devpost material only then.

## License

MIT (see `LICENSE`).

## UX release notes

The public planner requires a city for live place searches and distinguishes heuristic relative-fit values from Qloo-provided metadata.

## Public project

- Website: https://unison-qloo.onrender.com
- Status: https://unison-qloo.onrender.com/api/status
- Source: https://github.com/betterlifestyle04-commits/unison-qloo-agent
- Continuous integration: GitHub Actions `UNISON quality checks` runs `npm run check` and `npm test` on pushes.

The service can report `live-ready` when a server-side key is present, but that status **does not itself prove** that authenticated requests succeed.

## New user-facing features

1. **Quick-start groups**: switch among a friends night out, a movie night, and a date-night scenario. Examples are editable and are not a claim about real people's tastes.
2. **Consent-based share links**: clicking `Copy a group setup link` creates a URL fragment containing the group names, favorites, city, budget, and mode. The URL is not stored by our server; **anyone with the link can read the shared details**. The app never sends the URL fragment to Qloo, and it does not automatically submit loaded preferences.
3. **Fairness styles**: balanced (55% floor, 35% mean, 10% coverage); protect lowest fit (75%, 15%, 10%); group average (25%, 65%, 10%). All weights are authored heuristic choices, not calibrated satisfaction scores.
4. **Instant local re-evaluation**: vetoes, restores, and fairness-style switches operate on existing evidence in the browser. Only submitting a new brief starts a new Qloo workflow. The trace distinguishes local re-evaluation from real upstream requests.
5. **Map lookup**: live place cards can open an external Google Maps search using the Qloo name and provided address or selected city. A map search is **not** a verified booking or opening-hour claim.
6. **Transparency**: person-level fit, observed coverage, a group-compromise explanation, and an inspectable tool trace are visible, including the fact that rank-derived fit is UNISON's own estimate.
7. **Harder input boundaries**: max five participants, three favorites per person, bounded field lengths, and defensive 400 responses to malformed requests.

## Limitations and priorities

- The venue data is Qloo's recommendation evidence. UNISON does not guarantee geographic accuracy, opening hours, reservations, availability, or prices.
- Local fairness controls do not trigger new Qloo requests and therefore cannot discover new candidate entities; submit a new brief to perform a fresh discovery.
- Share links expose voluntarily included names and favorites. Do not put private secrets or sensitive personal information in the planner.
- Browser-based end-to-end accessibility and layout testing, and live response accuracy checks across several cities and preference groups, remain ongoing.

## Trust and human decision features

- **Qloo Taste Finder:** The planner's optional, server-mediated cultural reference finder lets the user search for candidate names on demand. `GET /api/taste-lookup?q=...` requires a configured server key, accepts 2–80 characters, and is limited to 10 searches per minute per requester. Only cultural search terms are sent to Qloo; participant names are not included. Choosing a displayed name appends it to the participant's editable favorites field. It does **not** assert that similarly named Qloo entities have been unambiguously distinguished.
- **Grounded artwork:** Live recommendation cards display imagery only when supplied by Qloo's entity metadata at a trusted `images.qloo.com` domain. Other image URLs are discarded; illustrative demo options use CSS placeholders rather than fake real-world photos.
- **Group vote:** A participant can vote **Yes / Maybe / No** on each option. Votes are stored only in the current browser session, do not communicate with other users or devices, and do not change the underlying taste score. An option is marked **Everyone said yes** only if every listed participant explicitly votes Yes, with no veto. A new plan resets local votes.
- **Evidence inspector:** The user can expand a card to distinguish Qloo entity provenance, optional native affinity information, UNISON rank-derived comparative scores, simulated data, and missing evidence. These are not calibrated satisfaction predictions.

A group agreement based on one-device votes is a convenience for in-person planning, **not** authenticated multi-user voting. UNISON currently does not handle reservations, real-time opening hours, or payments.

## Entity identity and disambiguation

Qloo's Search API can return multiple cultural entities with the **same visible name** (for example, `Interstellar` can be a movie, album, book, or artist). The optional Taste Finder returns a name, entity type, and Qloo ID. When the user explicitly selects an item, the browser retains that exact Qloo ID in the participant's editable group brief and the agent uses it directly for live insights. This avoids silently selecting a different cultural entity with the same name and saves redundant Qloo searches.

Unselected, manually typed favorites continue through the documented server-side name resolver. The application validates the selected ID format and its relationship to the entered favorite before contacting Qloo. Qloo remains the authority on whether the chosen entity ID is recognized.

Share links can contain Qloo public entity IDs in addition to the group's names and favorites. A shared link does not automatically execute the Qloo API.

## Decision Lab and saved plans (October 2026)

**Decision Lab** compares **the same fully observed candidate set** under three predeclared, transparent aggregation formulas. It shows each rule's winning candidate and a pure average-fit baseline, while stating when rankings are sensitive to the weight choices. It excludes vetoed candidates and any option with incomplete group coverage. The baseline is **not** an observed popularity metric, and no formula is a calibrated happiness prediction. All calculations are local and make no new Qloo requests.

**Saved group plans** are explicitly opt-in and stay in the current browser's `localStorage`. Each saved record contains the group brief (including participant names, favorites and any public Qloo entity IDs), a user-facing plan summary, a timestamp, and a winner label. It does not store the Qloo API key or create an account. Up to eight recent records can be saved. Users can reopen a brief, copy a saved summary, or delete a record. **Reopening always selects demo mode** and does not automatically query Qloo. Since browser storage is not encrypted, users on shared devices should not save private details.

Implementation: `public/planner-state.js` exports `analyzeDecisionTradeoffs`; `public/saved-plans.js` handles explicit storage operations with validation and bounds. New unit and HTTP regression tests verify both features.

## Tentative calendar handoff and CSP-safe scoring

After generating a group shortlist, the **Make it happen** section lets people choose any fully supported, non-vetoed option; add a tentative date, start time, duration, meeting location and notes; and download a standard `.ics` calendar event or copy the meeting details. These are entirely browser-side operations and make no new Qloo calls. Event timestamps are created from the **visitor's browser-local timezone** and encoded as UTC in the calendar file. Users planning in another timezone must verify the imported event before sharing. Every generated calendar entry has **TENTATIVE** status and explicitly states that UNISON has not booked a reservation or verified availability.

The recommendation comparison bars now use **native HTML `<meter>` elements** rather than HTML-injected inline CSS widths. This keeps the charts visible under the existing strict `style-src 'self'` Content Security Policy and improves their accessibility.

The calendar helper is in `public/calendar.js`, covered by `test/calendar.test.js` and first-party routing tests. No calendar permissions, notifications, background processes or third-party calendar API integration are required.

## Group Evidence Audit and one-click judge demo

The results screen includes a **Group Evidence Audit** powered by `public/evidence-audit.js`. It reports active candidates with complete person-level evidence, each participant's observed share of the active candidate set, a side-by-side comparison of the top two fully supported candidates, and a list of missing signals. When no candidate can be treated as a group compromise, it gives concrete, non-automatic suggestions to revise preferences or broaden the price constraint. **Missing evidence is not imputed as negative preference.** All audit values are based on the current result only and do not cause additional Qloo requests.

The **Run a one-click fictional demonstration** action loads a sample brief in demo mode, explicitly locks its mode to `demo`, and runs the existing local deterministic scenario. It never calls Qloo endpoints. This makes the agent UI safely explorable for judges and for first-time visitors without spending hackathon API quota. The demo results and agent steps are always labeled simulated.

See [JUDGE_DEMO.md](JUDGE_DEMO.md) for a reproducible two-minute walkthrough that differentiates live Qloo evidence from fictional demonstrations and includes transparency caveats.

Regression tests: `test/evidence-audit.test.js` and `test/http-ux.test.js`. Browser-driven visual acceptance checks remain outstanding.

## Exportable decision report and privacy disclosure

The shortlist now offers **Download Decision Report**. The browser generates a Markdown file from the current candidate rankings, evidence coverage, participant-level fit, selected fairness style, optional on-device group votes, and classified agent trace steps. Live Qloo candidates and fictional demo results are marked unambiguously. Report generation is opt-in and entirely local; it does not send data to another website or use additional Qloo requests. **Reports can contain participant names, cultural preferences and votes**, so recipients can read those details. The download states that UNISON has not verified reservations, opening hours or satisfaction outcomes. See `public/decision-report.js` and `test/decision-report.test.js`.

The dedicated [privacy and data information page](/privacy) explains server request handling, live Qloo parameters, optional browser storage, one-device voting, share URL fragments, exports, and third-party map searches. It avoids promising that infrastructure providers retain no request metadata. The page is linked from the homepage footer.

**Reliability fixes:** clipboard fallback now uses a first-party CSS class rather than inline styling blocked by Content Security Policy. Favorite resolution is bounded to two concurrent participants with up to two favorite lookups per participant, limiting pressure on Qloo. These changes do not introduce new third-party dependencies.

## Agreement Pulse and Qloo request coalescing

- **Agreement Pulse** tracks explicit Yes/Maybe/No votes on the leading fully supported recommendation and identifies participants who have not voted. If someone votes No, it can suggest discussing another supported, non-rejected candidate, but **does not silently change the model ranking or equate inferred tastes with human approval**. Votes remain on the current page/device and never reach Qloo. The interface provides a direct action to open the candidate's vote controls. See `public/consensus.js` and `test/consensus.test.js`.
- **Single-flight Qloo GET requests:** concurrent, identical Search or Insights requests now share one upstream API request, while retaining the existing five-minute cache. Errors do not become successful cached results. This lowers redundant upstream traffic without reducing evidence coverage. See `src/qloo.js` and new concurrency regression tests.
- **Cross-site request protection:** requests carrying a different `Origin` or browser `Sec-Fetch-Site: cross-site` are rejected from the Qloo lookup and planning endpoints before work begins. HTML and APIs also send `Referrer-Policy: no-referrer`; static pages limit camera, microphone and geolocation permissions. This is a defensive safeguard, not full account-based authentication or a solution to abusive direct clients.
- **Expanded syntax checks:** `npm run check` now covers every production JavaScript module, including newer browser-only features.

## End-to-end agent integration tests (no real API spend)

A full **Qloo two-pass agent workflow integration test** lives in `test/live-pipeline.test.js`. Its controlled, realistic mock tools simulate each person's entity resolution, a separate discovery request, a common shortlisted Qloo Insights evaluation, and rank-derived fairness. Assertions verify that no missing participant evidence is ever invented, that zero candidates fail with clear wording instead of fictional fallback, and that result traces stay in participant order even when tools finish in different orders.

`runAgent(input,{qlooTools})` accepts test-only tool injection; the public web service invokes the agent without overrides, so production still uses the real server-side Qloo credentials. The tests **do not prove real Qloo Insights availability, venue accuracy, or valid API entitlements**, which still need a separate authenticated live test.

## Head-to-Head decision comparison

Results now offer a **Head-to-Head** panel: choose any two fully supported, non-vetoed candidates to inspect each participant's relative fit, count which candidate scores higher for each person, and see the difference in the lowest group fit. Only actual observations are compared; missing evidence is never filled in, and there are no network requests when switching candidates. This is a comparison of UNISON's heuristic evidence, **not an actual human vote**. The independent Yes/Maybe/No voting flow remains the source of explicit group approval.

Modules: `public/head-to-head.js` and `test/head-to-head.test.js`.

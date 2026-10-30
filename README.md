# UNISON — Different tastes. One great plan.

UNISON is a fairness-aware group taste negotiation agent for the [Qloo Agentic Hackathon](https://qloo.devpost.com/). Instead of recommending the most popular option or maximizing average taste, it tries to avoid outcomes that leave one participant unhappy. **Production verification (October 29, 2026):** UNISON completed live authenticated Qloo Search, Insights discovery and shortlist evaluation, plus two-person movie planning, two-person Oslo places, three-person mid-budget Oslo places, and five-person movie planning with repeated public taste anchors. All current desktop/mobile Chromium UI tests pass. Venue facts, unseen taste combinations, and real-world satisfaction remain unverified.

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

## Submission-ready checklist

- [x] Public source repository with GitHub-detected MIT license and setup instructions.
- [x] Externally hosted working Node application, with server-only Qloo credentials.
- [x] Live authenticated Qloo Search and Insights tests, including limited two-, three- and five-person planning cases.
- [x] Chromium checks for desktop, mobile, demo, mocked live errors, voting, exports and accessibility controls.
- [x] English project description, limitations, reproducible demo and verified results.
- [ ] Complete and submit the project entry in Devpost; this must be done by the account owner and is not automatic.

**Official deadline:** October 30, 2026 at 11:45 p.m. EDT (October 31, 2026 at 04:45 CET in Norway). **This event does not require a demonstration video.** Keep the public app reachable for judging November 2–5; see [HACKATHON_RELEASE.md](HACKATHON_RELEASE.md).

## Environment & security

Never put `QLOO_API_KEY` in GitHub, browser JavaScript, screenshots, logs, demo content, or messages. Set through deployment environment secrets. Only public test fixtures belong in source. No key? Select Demo mode, with no claims of actual Qloo usage. Qloo errors never trigger a silent mock fallback.

The public `/api/plan` endpoint limits each client to 20 requests per minute and runs at most four plans concurrently. Live execution caps work at five people, three favorites per person, a 12-item shortlist, and cached GETs to protect Qloo quota.

## Render deployment

1. Create a Render **Web Service** from this repository. Render's existing configuration uses `npm ci --omit=dev`, `npm start`, and `/api/status` as its health check. Browser-test tooling remains a development dependency and is not installed in the production service.
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

## Private workspace and backup

The Discovery Studio includes nine fictional, editable starter briefs. Saved plans are opt-in and live in browser `localStorage`, not an account or remotely synchronized database. The workspace provides local title/city/participant search and shows saved examples with source-mode labels. A versioned JSON export contains each explicitly saved normalized brief and a decision summary; it is plain text, unencrypted, and can reveal participant names, cultural tastes, and selected Qloo entity IDs. Users choose when to export and when to import. Import checks the schema, rejects damaged or oversized files, skips duplicates and excess plans, and **never overwrites an existing plan or automatically calls Qloo**. The library caps at eight plans on each browser profile. Reopening a saved item restores the editable brief in demo mode; it does not resurrect outdated live Qloo evidence or auto-run a new request.

## Limitations and priorities

- The venue data is Qloo's recommendation evidence. UNISON does not guarantee geographic accuracy, opening hours, reservations, availability, or prices.
- Local fairness controls do not trigger new Qloo requests and therefore cannot discover new candidate entities; submit a new brief to perform a fresh discovery.
- Share links expose voluntarily included names and favorites. Do not put private secrets or sensitive personal information in the planner.
- Automated Chromium accessibility/interaction and desktop/mobile layout checks pass; independent manual accessibility audits and live geographic accuracy checks across multiple cities remain outstanding.

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

## Better live-Qloo failure recovery (October 2026)

The planner now preserves the user's group brief when the live Qloo service returns an error. Instead of showing a generic dead end or quietly substituting fictional recommendations, a new **Recovery panel** identifies common categories: too many requests, ambiguous cultural entities, missing city, no comparable candidates, unavailable key, and temporary upstream problems. Each category offers specific next steps and a button to review/edit the group brief. A clearly labeled "Switch to fictional demo mode" option **only selects the radio button**; it never automatically executes a Qloo or demo plan.

Shareable briefs are now explicitly demo-only when opened, even after asynchronous key-status loading. Moving into Live Qloo requires a fresh direct user selection. Regression tests guard against accidentally reintroducing the previous auto-switch behavior.

The API uses a bounded, in-memory, per-client request limiter. Entries expire after their rate-limit window and the total number of tracked client identifiers is capped to prevent unbounded memory growth. Rate limiting is a best-effort infrastructure protection, not an account-based access-control system.

Modules: `public/recovery.js`, `src/request-limiter.js`, `test/recovery.test.js`, `test/request-limiter.test.js`, and `test/http-ux.test.js`. `npm run check` covers the added JavaScript modules.

## Qloo candidate integrity screening

To keep fairness calculations grounded in the **same requested pool of candidates**, the backend now screens every live Qloo Insights response in `src/candidate-integrity.js`. Discovery records must have a usable ID and name and must not explicitly belong to the wrong requested domain (places versus movies). Duplicate IDs are removed. The subsequent per-person evaluation is additionally restricted to **exact IDs in the shared shortlist**. Any returned extra or wrong-type entity is excluded **before** its ordinal position can influence a fit estimate. This is independent of the Qloo API's `filter.results.entities` query parameter and makes unexpected upstream responses safe to interpret.

The response includes an aggregate `quality` object with counts of accepted and excluded items. The UI exposes an expandable **Qloo response integrity** inspector; the agent trace records screening stages as **local computation**, not extra Qloo requests. A missing entity-type label is reported, not silently claimed verified. A filtered-out result is **not** evidence of dislike.

This protects candidate *membership*, not geographic truth or factual metadata: UNISON does **not** independently certify venue addresses, city boundaries, opening hours, prices, or bookability. Scores remain ordinal UNISON heuristics, not measured satisfaction.

Qloo's published [Insights parameter reference](https://github.com/qloo/docs-public/blob/main/reference/insights-api-deep-dive.md) documents `filter.results.entities` for the shared-candidate evaluation. The extra local screening is UNISON's own safeguard. See `test/candidate-integrity.test.js` and the contamination scenarios in `test/live-pipeline.test.js`.

## Actual Chromium browser acceptance testing

UNISON now has a dedicated **Chromium end-to-end job in GitHub Actions** (in addition to the existing fast unit/integration suite). It opens and uses the actual HTML/JavaScript interface rather than merely checking that the source contains expected strings.

The browser suite in `browser-tests/e2e.test.js` covers desktop and mobile fictional demo planning, fairness reweighting, Head-to-Head, Yes/Maybe/No voting, download of a Decision Report and tentative calendar entry, local saved plans, and shared-link safety. A separate **mocked live UI** scenario validates explicit Live Qloo opt-in, Taste Finder entity pinning and error recovery without using a credential or making Qloo API calls.

The first browser run uncovered a production startup crash: `starters.forEach(addPerson)` passed each loop index as the helper's `chosenEntities` argument, causing `chosenEntities.map is not a function`. This is fixed by passing the group row explicitly with `starters.forEach(values=>addPerson(values))`, plus defensive optional-argument validation.

In CI, screenshots of the working desktop and mobile demo are uploaded as a **unison-browser-screenshots** artifact retained for seven days. Playwright is a development-only dependency, so **production still has no extra runtime dependencies**. Local developers can run `npm install`, `npx playwright install chromium`, then `npm run test:e2e`.

A successful mocked-live browser test **does not establish real authenticated Qloo Insights availability**; live API verification remains a separate acceptance criterion.

## Explicit live-Qloo connection check

The Live Qloo selection now contains an **optional "Check Qloo connection"** button that calls `POST /api/qloo-diagnostics`. Unlike the configuration-only `GET /api/status` badge, it attempts a real, fixed-example sequence on the server: `/search` for a known public film, `/v2/insights` movie discovery, then a second `/v2/insights` evaluation restricted to the discovered shortlist. The UI discloses whether each stage passed or failed; errors never get replaced with demo evidence. It uses **zero names or favorites from the user's group brief**.

The check runs **only on an explicit click in Live mode**, not when loading the page, opening a group link or switching modes. It is throttled to **two attempts per ten minutes per connection** and may use up to **three Qloo GET operations, plus Qloo-adapter retries on transient failures**. It is a limited integration diagnostic, not proof that every other movie, geographic place, budget filter or recommendation will work. A check with valid Search but no matching Insights returns `ok:false`, not a made-up success.

The pure diagnostic is `src/qloo-diagnostics.js` (mock tests: `test/qloo-diagnostics.test.js`). Browser testing intercepts the health request with a labeled mock response to verify explicit consent and zero transfer of group data; those mocks must never be described as authenticated Qloo availability. To validate actual credentials, use the opt-in control on the deployed website and inspect its live result.

## Verified production Qloo runs — October 29, 2026

These **actual network-backed tests** ran from GitHub Actions against UNISON's production Render service using its existing server-side Qloo credential. They used only public movie names and fictional participants, without exposing an API key or uploading real group profiles.

| Live test | What it actually verified | Result |
|---|---|---|
| [Search → discovery → shortlist](https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40877477130) | Exact *Interstellar* movie entity, Qloo Insights discovery and filtered shortlist | **Passed:** 3 returned movie candidates, 3 shortlisted matches |
| [Two-person real plan](https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40878074739) | `/api/taste-lookup` for *Interstellar* and *Inception*, then `POST /api/plan` with two fictional participants and pinned UUIDs | **Passed:** 12 real movie candidates; 11 fully covered by both participants |
| [Chromium UI checks](https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40871949229) | Demo and mocked-live UI, voting, local exports, privacy and responsive layouts | **Passed:** mocked network interactions only |

Scope matters: these production smoke checks are deliberately limited **one-shot runs**, not recurring quota consumption. Additional verified runs cover three-person Oslo places with a mid restaurant price-tier cap and a five-person movie workflow with shared public anchors, detailed further below. They do **not** verify every participant preference combination, city, business address, opening hour, booking, or accuracy of UNISON's ordinal-fit heuristics. Browser tests use mocks for Qloo, but real Chromium interactions.

## Decision Stability analysis

With **three or more participants**, the results now include **Decision Stability**, a transparent leave-one-out stress test built from the exact same already observed shortlist. It hypothetically computes a winner while omitting each person's relative-fit evidence in turn, so groups can see when a decision is sensitive to a particular taste. No one is actually removed from the real decision and no new Qloo request occurs. A two-person group cannot run this diagnostic because removing one would no longer leave a group. It is not a vote or a prediction of enjoyment. See `public/group-stability.js` and `test/group-stability.test.js`.

## Verified live Oslo place recommendations — October 29, 2026

A one-time GitHub Actions smoke check against the real UNISON production server verified the actual **Live Qloo /api/plan for places in Oslo**. It used two fictional participants (Ada and Bea) with exact, public movie entity IDs (Interstellar and Inception) and the city string `Oslo`, budget `any`.

The run returned **12 Qloo-derived places, all 12 with fully covered two-person fit evidence**, and confirmed both participants' discovery and shortlist evaluation calls succeeded. See [live Oslo smoke test](https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40883494386). The API's location query and strict locality radius parameters are documented by Qloo. UNISON has not independently checked addresses, business hours, transport, prices, or booking availability for those returned places, and the test does not cover every geographic location or a budget filter other than `any`.

## Venue Reality Check

For a group outing, **Make it happen** now includes a *Venue Reality Check* for the currently selected option. The group can mark four practical questions reviewed: exact location, opening hours, total budget, and reservation or walk-in arrangements. Each candidate has a separate checklist on the current page; switching between candidates does not copy confirmations across venues. Every box starts unchecked, changing it requires explicit user input, and toggling or changing a choice makes **no Qloo API requests**.

This is a **manual, unverified** checklist, not a venue availability check, booking or guarantee. It is not sent to Qloo, not saved to a server, and does not influence fit scores or group votes. A new plan starts with empty checklists. See `public/venue-readiness.js`, `test/venue-readiness.test.js`, and the browser-level test.

## Verified real three-person Oslo plan with a restaurant price-tier cap

A one-time authenticated production run on October 29, 2026 tested **three fictional people**, each with a pinned Qloo movie ID, requesting **places in Oslo** with `budget:"mid"`. It returned **12 real Qloo candidate places, all 12 with complete relative-fit evidence across the three participants**. The test separately checked that all **six live Insights calls** (three discovery and three shared-shortlist evaluation requests) included Qloo's documented `filter.price_level.max=2` constraint.

Evidence: [one-time three-person budgeted Oslo workflow](https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40885037384).

Per [Qloo's parameter reference](https://github.com/qloo/docs-public/blob/main/reference/insights-api-deep-dive.md), `filter.price_level.max` is a restaurant-oriented 1–4 price-tier filter, **not a verified currency amount, actual checkout cost, or guaranteed price limit for all place types**. `filter.location.query` is a fuzzy locality match, and radius `0` instructs Qloo to use its locality boundary, not an independent validation of every venue address.

The interface now includes an expandable **Location and budget: What was actually checked?** explanation and describes Qloo-supplied venue information as **unverified**. To prevent a fictional or mistaken reservation implication, **tentative calendar exports leave the meeting location blank until a group member explicitly enters it**; no Qloo-supplied address is silently copied into the calendar.

The scope of the production test is **Oslo, Norway**, with three people and the `mid` tier only. Other cities, price limits, and real-world venue conditions have not been checked. Tests: `test/place-constraints.test.js`, `test/http-ux.test.js`, and the Chromium browser export workflow.

## Verified production maximum-size group — October 29, 2026

A separate one-time production test verified UNISON's advertised **maximum five-person group** through the real `POST /api/plan` workflow. Five fictional participants (Ada, Bea, Cam, Dee, and Eli) reused two independently verified public movie anchors (*Interstellar* and *Inception*). UNISON returned **12 real Qloo movie candidates; 11 had complete five-person relative-fit evidence**. The trace had five participant-level discovery steps and five shortlist evaluation steps. Qloo's caching and identical-request deduplication can reduce the actual number of external calls for the shared anchors.

See [real five-person production smoke test](https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40886047104). This validates the five-person orchestration path, **not the accuracy of five unique taste profiles**, the reliability of all possible inputs, film availability or calibrated happiness. The first smoke attempt encountered unexpected non-JSON content before it submitted any plan; the successful rerun used two previously verified anchors and explicit response validation. Both results are retained in GitHub Actions.

The verified production coverage now includes 2-person live movie, 2-person Oslo places without a price tier, 3-person Oslo places with a mid restaurant price-level cap, and 5-person live movies with shared public anchors. Browser tests still use explicitly mocked Qloo responses, independently of these real network checks.


## Additional cities and mixed-domain cultural evidence (October 30, 2026)

A [one-time live production check](https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40977183116) verified place-planning API responses for **Bergen, Norway**, and **London, UK**, using a film (*Interstellar*) and a music artist (*Radiohead*) as different participants' cultural references. Both returned **12 Qloo place candidates, all 12 covered by evidence for both participants**. This does not independently verify business identities, addresses, opening hours, reservation availability, or every cultural preference combination.

## External venue checks and optional outcome worksheet

For real Qloo place candidates, the Venue Reality Check links to a Google Maps venue search and a separate search for the official business website. A copyable message helps people request group opening hours, costs, address and booking rules. These are searches and draft enquiries, **not confirmed booking or verification services**. No checklist item is automatically checked.

The optional **Did the plan meet expectations?** worksheet lets participants record anticipated enjoyment and actual post-visit enjoyment on a 1–5 scale. Only paired self-reports are compared, and the result is an **expectation gap**, not evidence of improved happiness caused by UNISON. Ratings remain in browser memory until refresh; anonymous participant-number CSV export is optional, with fictional-demo exports labeled non-field-evidence. For credible evidence of impact, real user participation and a comparison group are required. See [VALIDATION_PROTOCOL.md](VALIDATION_PROTOCOL.md).

## Controlled Qloo waiting and stale-result protection

A group can now explicitly **Stop waiting** while a plan is loading. The front end aborts its own request after that click or after a **three-minute** wait. The recovery panel keeps the user's brief and accurately explains that a request already received by the Node/Qloo server may continue or consume API quota despite the browser stopping. UNISON never silently substitutes fictional recommendations. Switching to a different group preset while a live request is pending aborts the previous browser wait and prevents a stale result from replacing the new brief.

Chromium's acceptance suite explicitly exercises cancellation and preset switching with intentionally delayed, mocked network responses; these tests make no live Qloo requests. The separate production Qloo smoke evidence remains linked above.

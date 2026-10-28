# UNISON — Different tastes. One great plan.

**Project homepage:** https://unison-qloo.onrender.com  
**Public source:** https://github.com/betterlifestyle04-commits/unison-qloo-agent  
**License:** MIT  
**Hackathon:** Qloo Agentic Hackathon 2026

## Inspiration — the group decision problem

Most recommendation engines focus on a single user or on popularity. Real group decisions are harder: one friend's favorite can become everyone else's compromise, and a high group average can hide one very unhappy participant. UNISON helps groups find a transparent shared plan instead of relying on the loudest preference or opaque matching.

## What it does

UNISON helps two to five people plan a group outing or movie night. Each person contributes up to three favorite cultural references. A server-side agent resolves Qloo entities, retrieves taste-based recommendations individually, evaluates a common shortlist for everyone, and applies a fairness-aware heuristic. It explicitly refuses to call an incomplete-evidence option a fully supported consensus.

Users can:
- Choose a city and Qloo price-level constraint for places.
- Compare per-person relative fit, group average, lowest fit, and evidence coverage.
- Try balanced, protect-lowest-fit, or group-average decision styles; these re-rank existing evidence immediately.
- Veto or restore a candidate without generating another Qloo API request.
- Inspect the plan → search → insights → comparison → re-evaluation trace.
- Use the optional **Qloo Taste Finder** to clarify cultural entity names without copying an API key into the browser.
- Review grounded Qloo-supplied artwork and each candidate's **evidence inspector**, where native API metadata is separate from UNISON's rank-derived scores.
- Record a session-only **Yes / Maybe / No** vote for each listed participant. This is an explicit human agreement step, not a machine prediction or a real-time multi-user vote.
- Share an editable group setup through a consent-based link, or copy a plan summary.
- Open a Google Maps search for a live place candidate; this is discovery, not a verified booking.
- Explore a clearly labeled fictional demonstration if live API access isn't available.

## How we built it

- **Frontend:** responsive semantic HTML, modern CSS, vanilla JavaScript ES modules. No account required.
- **Backend:** Node.js server exposing `/api/status` and `/api/plan` with validation, request limits, and server-only API credentials.
- **Qloo tools:** authenticated GET `/search` resolves each favorite; `/v2/insights` uses `filter.type`, comma-separated `signal.interests.entities`, optional strict city filtering with `filter.location.query` and `filter.location.radius=0`, and place `filter.price_level.max`. A second comparison pass uses `filter.results.entities` to assess a shared shortlist.
- **Group reasoning:** candidates are compared using UNISON rank-derived relative-fit estimates on one consistent scale, with 100% observed group coverage required to name a compromise. Native Qloo affinity is not mixed with those local scores.
- **Transparency:** every displayed group score is a user-facing heuristic, never claimed to be a prediction of enjoyment or Qloo's own confidence percentage.
- **Quality:** native Node tests, integration tests, and GitHub Actions; deployment from GitHub to Render in Frankfurt.

## Why it's agentic

The agent does not just output a text recommendation. It runs a bounded tool-using process: interpret a group brief, resolve cultural entities, query Qloo for each person's tastes, generate a shared shortlist, evaluate cross-person evidence, and present a transparent choice. When users veto a candidate or change the decision weights, the browser immediately re-evaluates the existing evidence without paying for redundant upstream calls. A genuinely changed brief triggers fresh Qloo tools.

## What Qloo makes possible

Qloo connects tastes across categories: a movie or artist can provide cultural context for restaurant, place, or other movie recommendations. UNISON makes that cross-domain value visible while evaluating the same options for multiple participants instead of optimizing a single user's suggestions.

## Challenges and decisions

The most important technical challenge was **not confusing observed Qloo data with invented or rank-derived confidence**. UNISON intentionally distinguishes original entities, local ordinal-fit estimates, missing data, and the fair-ranking formula. We also prevent recommendations with incomplete group observations from being presented as a consensus. City input is mandatory for live place plans to avoid the unrestricted worldwide suggestions that initially appeared.

A second challenge was Qloo quota: users need to revise plans quickly without rerunning multiple search and insight requests. Local veto and weighting updates reuse the original result evidence; cache/retry bounds and server-level concurrency limits protect the integration.

## Test and demonstration flow

1. Open the public app, choose **Live Qloo** when enabled, and enter a city for place searches.
2. Try an editable sample group or add two to five participants and their favorite cultural references.
3. Submit the group brief. Inspect recommended entities and individual fit evidence.
4. Change between **Balanced**, **Protect the Lowest Fit**, and **Group Average**, observing reordering without additional Qloo requests.
5. Veto and restore a candidate. Inspect the trace for the local re-evaluation step.
6. Copy the plan or share the editable group setup. Explain that group links encode names and favorites in the URL.
7. Optionally switch to clearly labeled fictional demo mode to show the workflow independent of an API credential.

## Integrity and current verification status

The public Render service is deployed and the server status reports `live-ready` because the key is configured. An independently initiated, authenticated UNISON-to-Qloo cultural search for **Interstellar** returned real Qloo entity IDs for a movie, albums, a book, and an artist. This validates key authentication and the Qloo Search integration; it does **not** independently validate every Insights response, geographic recommendation, or browser workflow. A user screenshot also shows live-mode recommendations. The UI and integration still need a final cross-device, multi-city walkthrough before treating every use case as production-ready.

We do not claim venue opening hours, reservation availability, guaranteed location accuracy, measured improvements in group satisfaction, or scientifically validated ranking weights.

## Submission checklist

- [x] Public GitHub repo and MIT license
- [x] Public hosted Node web service
- [x] Server-only Qloo secret and documented tool flow
- [x] Demo results clearly labeled fictional
- [x] Reproducible automated tests and CI
- [x] Responsive interface and inspectable agent trace
- [ ] Manual live Qloo testing of several city-and-favorite combinations
- [ ] Desktop and mobile browser visual QA, including accessibility
- [ ] Final Devpost project submission by its official deadline

## New human-in-the-loop milestone

UNISON now separates two decisions: **Qloo-informed candidate discovery and ranking** versus **explicit human approval**. The new per-candidate group ballot records Yes / Maybe / No responses only in the browser, and a unanimous approval badge appears only when every participant says Yes. This does not change the inferred preference fit or make any additional Qloo API request. It is an in-person convenience, not a remote voting system. The optional Qloo Taste Finder helps users discover official entity names on demand. Live recommendation artwork is accepted only from a Qloo-controlled image CDN, with no invented venue photographs.

This improves the hackathon demonstration's clarity: an agent proposes and transparently evaluates options, but the group retains the final decision.

## Decision Lab — comparing tradeoffs without invented metrics

UNISON now provides an inspectable Decision Lab using only candidates with complete observed group coverage. It compares balanced, protect-lowest-fit, group-average-weighted rules, and an average-only baseline. The resulting explanation shows when a fairness-aware winner differs from the highest-mean candidate and whether the decision remains stable as weights change. No popularity statistics or satisfaction predictions are fabricated, and changing weights does not spend additional API quota.

## Optional device-only plan library

For returning visitors, UNISON can save up to eight group briefs and recommendation summaries **only when the user clicks Save**. Users can reopen a brief, copy a summary or delete it. We clearly warn that names and cultural preferences will be stored in this browser profile. Reopened briefs default to demo mode and require explicit opt-in before any live Qloo calls.

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

## Bringing the group decision into the real world

UNISON now includes a zero-integration calendar handoff. Once the shortlist is generated, the group can pick a supported option, agree on a proposed date and meeting location, and export a tentative standard calendar event. The app explicitly does not make bookings, check availability or send invitations. This is a local completion step rather than another AI or Qloo API request.

We also corrected an accessibility and security-policy conflict: recommendation fit visualizations use native meters and remain visible under a restrictive Content Security Policy without relying on blocked inline CSS.

## Export the agent's reasoning

To make the result genuinely portable, UNISON can now download a **Decision Report** in Markdown. It records individual relative-fit estimates, group fairness weighting, evidence coverage, vetoes, voluntary Yes/Maybe/No votes and labeled agent steps, distinguishing real Qloo requests from fictional demonstration and local computation. The export is intentionally opt-in because it may contain participant names and cultural references. Creating the report does not trigger further Qloo API calls.

## Public privacy disclosure

A dedicated privacy page explains what enters our backend, which cultural signals are sent to Qloo, what stays on the visitor's device, why share-link fragments are not encrypted, and why human votes are only session-local. The website also avoids CSP-blocked inline styling for its clipboard fallback. These changes improve product trust without introducing accounts, tracking, or another dependency.

## Human agreement and Qloo quota efficiency

The new **Agreement Pulse** makes the human-in-the-loop component more visible. It shows actual Yes/Maybe/No votes, who still needs to answer, and where the leading recommendation has been rejected. It may suggest discussing a different supported choice but never replaces the Qloo-derived shortlist or fabricates consent.

UNISON now also deduplicates concurrent identical Qloo requests and limits cross-site browser requests to its API endpoints. These changes protect limited API quota and keep the hackathon experience more reliable without introducing accounts, a new database, or paid dependencies.

## Auditable Qloo pipeline and head-to-head comparison

To validate more than a server configuration flag, we now run an integration test with mocked Qloo Search and Insights tools across the entire live-mode agent pipeline. It checks person-specific taste resolution, discovery, shared shortlist evaluation, stable provenance traces, missing-evidence handling, and refusal to substitute fictional results into live mode. Tests are deterministic and incur no Qloo quota; they do not establish real Insights availability.

The new **Head-to-Head** comparator lets groups choose any two supported candidates and see which person-level ordinal-fit estimate favors each option. This is independent of the explicit human-voting flow. No extra API requests are made when changing the comparison.

## Reliable and transparent live-mode recovery

UNISON no longer treats Qloo downtime or ambiguous favorites as an opaque recommendation failure. A dedicated recovery UI explains possible causes without inventing new evidence, preserves the group brief for revision and requires an explicit action before switching to fictional demo mode. Shared links always reopen in demo mode, protecting API quota and user intent. A memory-bounded request limiter prevents unbounded growth in the per-client planning and Taste Finder throttles.

The automated suite includes regression checks for these safeguards; comprehensive live Qloo Insights and interactive cross-browser verification remain separate work.

## Guarding the quality of the group shortlist

The latest release adds explicit candidate-integrity checks on every real Qloo Insights response. UNISON accepts only unique, correctly categorized Qloo candidates and screens the shared-shortlist evaluation against the exact requested entity IDs. This prevents unexpected, unrelated results from being promoted into the group comparison or changing rank-derived fit scores. The result interface and evidence trace disclose screening counts and limitations transparently. All screening is **local computation**, with no additional Qloo quota spent.

Automated tests inject duplicate, wrong-domain, and outside-shortlist candidates into mocked Qloo responses and verify they are excluded. This validates our handling of imperfect responses; it is **not** proof that all live Qloo Insights requests or venue details are correct.

## Self-service evidence of a working Qloo integration

UNISON now offers a manual **Qloo connection diagnostic** visible only in live mode. A visitor can explicitly test a fixed public sample through real Search, Insights discovery and Insights shortlist evaluation. The results report each stage separately so a configured API key is never confused with verified Insights responses. No private group names or favorites are sent during this diagnostic. We limit frequency to protect API quota; passing a one-title movie diagnostic is not a guarantee that other filters or places will return good recommendations.

Its logic has isolated tests with fake Qloo tools, and browser tests verify the control doesn't call the API without a click. We have **not** claimed an actual verified production Insights result until a user runs the live diagnostic successfully.

## Verified real-Qloo production evidence — October 29, 2026

We have now verified more than a configured key or mock tests. A one-time GitHub Actions smoke test against UNISON's actual Render production server successfully resolved the movie *Interstellar*, obtained three Qloo Insights discovery candidates, and re-evaluated all three through a filtered shortlist (see [workflow evidence](https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40877477130)).

We then ran a second, independent full **live two-person group** workflow with fictional participants and the movies *Interstellar* and *Inception*. UNISON's real `/api/plan` completed entity selection, both Qloo discovery calls, both shared-shortlist evaluation calls, and returned **12 real movie candidates, including 11 supported by evidence for both people** ([production workflow evidence](https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40878074739)). No Qloo API key or personal information was committed.

This is specifically live movie-planning evidence; we do not claim every places/city filter, three-to-five-person group or real-world venue fact was verified.

## Decision stability under hypothetical group changes

We added a **Decision Stability** stress test for groups of three to five. It re-ranks the same fully supported shortlist, hypothetically omitting each participant's taste evidence in turn, and discloses whether the top option changes. This highlights potential dependence on one voice without changing the actual group, consulting Qloo again, or confusing predicted preferences with human votes.

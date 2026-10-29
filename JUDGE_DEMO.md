# UNISON — Two-minute hackathon judge walkthrough

**Live application:** https://unison-qloo.onrender.com  
**Open source:** https://github.com/betterlifestyle04-commits/unison-qloo-agent

## 0:00–0:20 — The problem
"Planning for a group is not the same as recommending for one person. A popular suggestion can hide one person's very poor fit. UNISON is a transparent, fairness-aware group taste negotiation agent."

## 0:20–0:40 — Instant demonstration
1. Open the public site and select **Run a one-click fictional demonstration**.
2. The app submits an editable three-person sample in **demo mode**. No Qloo API calls occur.
3. Point out the distinct individual preferences and the ranked recommendation shortlist.

**Important:** The sample contains fictional entities and fit signals. It demonstrates the workflow, not Qloo's live accuracy.

## 0:40–1:10 — Why this is a group decision
1. Inspect the featured compromise: minimum individual relative fit, average, and complete evidence coverage.
2. Open **Decision Lab**: compare the balanced rule, protect-the-lowest rule, and average-first rule.
3. Open **Group Evidence Audit** to see person-level coverage, missing signals, and a two-candidate comparison.

Explain that these are transparent project heuristics, not predicted happiness percentages. The audit never treats missing data as dislike.

## 1:10–1:30 — Human oversight and replanning
1. Change a fairness style. The ranking changes locally; no extra Qloo request.
2. Veto a choice, then restore it, inspecting the evidence trace.
3. Have listed group participants select **Yes / Maybe / No** on a candidate. A unanimous badge appears only if everybody selects Yes.

**Caveat:** Voting is an in-person, one-device convenience, not authenticated multi-user remote voting.

## 1:30–1:50 — Real Qloo tools (only with a working API key)
1. Explicitly select **Live Qloo**.
2. For **Go somewhere**, enter a city such as Oslo. This limits the place query; it does not guarantee physical location or opening hours.
3. Use **Qloo Taste Finder** to pick a specific cultural entity, preserving its official Qloo ID and type.
4. Submit a group brief. Inspect the trace's Qloo search, discovery and evaluation steps, then compare each person's relative-fit evidence.

If Qloo is unavailable, **do not present demo evidence as real API responses**. Return to clearly labeled demo mode.

## 1:50–2:00 — Turn agreement into action
1. Open **Make it happen**, pick a candidate, date and meeting point.
2. Download a tentative calendar event or copy the meeting summary.
3. State explicitly that UNISON does **not** place reservations or send invitations.

## What makes it agentic
The server orchestrates a bounded workflow: normalize group requirements, resolve each favorite to a Qloo entity, retrieve recommendations separately for each person, compare a common shortlist, evaluate evidence coverage, and rank group trade-offs. Local changes preserve the data provenance and avoid redundant external requests.

## Troubleshooting
- **No live mode:** verify `QLOO_API_KEY` on Render, then check `/api/status`. Key-present status alone does not validate authenticated Qloo requests.
- **Favorite cannot be resolved:** use Taste Finder and select a precise entity instead of a potentially ambiguous text label.
- **No full group comparison:** use Evidence Audit to identify missing signals, edit preferences, broaden the price filter, and deliberately submit a new plan.
- **Free Render instance waking up:** the first request may take longer; do not confuse slow startup with invalid evidence.
- **Voting or calendar action isn't saved elsewhere:** ballots and calendar preparation happen on the current browser. Saved group briefs are available only when explicitly stored locally.
- **Missing images:** only trusted Qloo image URLs are displayed. CSS placeholders are not real photos.

## Submission integrity
Do not claim a reservation, measured improvement in group satisfaction, authenticated multi-device voting, or a complete end-to-end Qloo Insights validation without evidence. The project is open-source under MIT, uses a server-only key, and exposes fictional demonstration mode transparently.

## Optional 15-second extension — Group agreement

After presenting the fair ranking, open the **Agreement Pulse**. Have one participant vote Yes and observe the remaining response count. Have another vote No to see how the pulse recommends discussion rather than silently changing the machine recommendation. Explain that this is **local, one-device group input**, not a networked voting product. The proposed winner is only marked unanimously approved after every participant explicitly selects Yes.

## Optional extension — Compare any two recommendations

Expand **Head-to-Head** in the results. Choose two fully supported options and show the relative-fit table. Highlight when one group member may prefer Option A even though another prefers Option B. The number of people with higher estimated fit is **not a human vote** and must not be described as measured preference or happiness. This comparison reuses the same Qloo-sourced shortlist, without an additional Qloo request.

For engineering judges, `test/live-pipeline.test.js` verifies the full two-pass Qloo orchestration with controlled mocked tools, including no-candidate cases, missing person-level evidence, and tool provenance. These deterministic tests are **not** a substitute for a real authenticated Qloo Insights smoke test.

## Optional extension — Candidate evidence integrity

After a **live** recommendation appears, expand **Qloo response integrity** below the source banner. Explain that the agent does not trust upstream data blindly: it checks candidate types, removes duplicates, and enforces that every per-person evaluation matches the exact shared shortlist. These checks use no extra Qloo calls, and the agent trace labels them as local steps. The counts show what was accepted or excluded in that particular result. They **do not** certify addresses, geographic correctness, reservations, or happiness. The same checks are exercised in `test/candidate-integrity.test.js` and `test/live-pipeline.test.js` using intentionally contaminated mock responses.

## Optional live Qloo self-check (uses hackathon quota)

After explicitly selecting **Live Qloo**, expand the evidence choices and click **Check Qloo connection**. This is an opt-in, limited live API check using a fixed public film: Search, discovery Insights, and shortlist Insights. Show the three labeled results. It never sends participant names/favorites and is limited to two checks per ten minutes per connection. **Only say the real Qloo Insights integration was verified if the button actually reports successful live steps**. A configured key or simulated browser mock does not count.

## Verified production evidence for judges

The app's **live Qloo Search + Insights** path passed one production smoke test on October 29, 2026 ([evidence](https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40877477130)). A separate **live two-person movie plan** with fictitious Ada/Bea identities and *Interstellar*/*Inception* anchors returned 12 Qloo movie candidates, including 11 with full group coverage ([evidence](https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40878074739)). These are real production Qloo requests, distinct from the Chromium mocked-live and fictional demo test suites. They do not demonstrate verified locations, hours, or other group sizes.

For a three-person demo, expand **Decision Stability**: a leave-one-out hypothetical view shows whether the current fair winner would change if any one person's taste evidence were omitted. This uses only the existing results, does not change the actual decision or remove anyone, and requires no Qloo calls.

## New: live Oslo places evidence and practical handoff

The [one-time live production Oslo test](https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40883494386) returned 12 real Qloo places, with both fictional participants having candidate evidence for all 12. The test used a strict Oslo locality query and budget `any`. That verifies the integration's tested response path, not every individual venue fact.

For the fictional outing demo, open **Make it happen** and **Venue Reality Check**. Check the address and opening hours boxes; the progress advances. Switch to another candidate and observe a separate, unchecked list; switch back to see the previous marks. These are manual group reminders—not provider checks, reservations, or automatic validation—and they do not spend Qloo quota.

## Verified 3-person budgeted live place flow

A separate production CI run on October 29, 2026 successfully generated **12 places and 12 fully covered recommendations for three fictional participants** in Oslo, with all six Qloo Insights requests carrying the `mid` restaurant price-level cap ([evidence](https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40885037384)). Be precise: these are Qloo place candidates, not independently address-verified venues or guaranteed restaurant prices.

Expand **Location and budget · What was actually checked?** to demonstrate transparent constraints. Then open **Make it happen**, show that the calendar location stays blank until entered by a person, and use the manual Venue Reality Check without claiming to reserve or confirm anything.

## Maximum-size live test evidence

The [verified five-person real Qloo production run](https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40886047104) completed UNISON's full movie agent for fictional Ada/Bea/Cam/Dee/Eli, using *Interstellar* and *Inception* as repeated anchors. It returned 12 Qloo movie candidates; 11 were comparable for all five people. Explain that five-person support is **orchestration-tested**, but that using two repeated tastes does not validate five independent, contrasting profiles. The earlier live [three-person Oslo budget run](https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40885037384) separately confirmed Qloo's restaurant-specific mid price-tier filter reached all discovery/evaluation calls.

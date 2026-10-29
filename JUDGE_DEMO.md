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

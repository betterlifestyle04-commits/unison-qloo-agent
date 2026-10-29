# UNISON — Release and Devpost submission checklist (October 30, 2026)

**Submission-ready project:** UNISON — Different tastes. One great plan.

- **Live demo:** https://unison-qloo.onrender.com
- **Public source:** https://github.com/betterlifestyle04-commits/unison-qloo-agent
- **Open-source license:** https://github.com/betterlifestyle04-commits/unison-qloo-agent/blob/main/LICENSE (MIT, detected by GitHub)
- **Devpost event:** https://qloo.devpost.com/
- **Copyable detailed description:** [DEVPOST_SUBMISSION.md](DEVPOST_SUBMISSION.md)
- **Two-minute judge walkthrough:** [JUDGE_DEMO.md](JUDGE_DEMO.md)

## Deadline — verified against the current event, not the 2025 LLM hackathon

**Friday, October 30, 2026, 11:45 p.m. EDT** = **Saturday, October 31, 2026, 04:45 CET in Norway**. Submit sooner to avoid surprises. Official rules: https://qloo.devpost.com/rules

This **Qloo Agentic Hackathon 2026** does **not** require a demo video. The older **2025 Qloo LLM Hackathon** has a different, video-based submission rule; do not confuse the events.

## Official submission requirements versus UNISON

| Official requirement | UNISON evidence | Status |
| --- | --- | --- |
| Working externally hosted app accessible to judges | Live public Render Node app (no login), demo and live modes | Ready; check current URL before submitting |
| Real Qloo API integration within an agentic tool | Per-person Search, Insights discovery, shared-shortlist re-evaluation and fair ranking, with evidence trace | Real API tests passed |
| Public source code with instructions and assets | This public GitHub repository, README, test files and source | Ready |
| Open-source license discoverable at repo top/About | MIT LICENSE, GitHub license metadata is MIT | Ready |
| Written explanation of features and Qloo value | DEVPOST_SUBMISSION.md and short description below | Ready |
| Functional throughout judges' testing | Hosted service must remain public and working November 2–5 | Maintain access |
| Actual Devpost submission before deadline | Owner must enter/confirm project and click submit | **Owner action required — not automatically submitted** |

## Proven authenticated production tests

All tests use public cultural titles and fictional participant names. They are **real server-side Qloo requests, not mock results**.

| Real Qloo scenario | Actual verified result | GitHub Actions |
| --- | --- | --- |
| Search → Insights discovery → filtered shortlist | All three API stages succeeded for a public sample film | https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40877477130 |
| Two-person live movie plan | 12 candidates; 11 fully covered | https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40878074739 |
| Two-person Oslo places | 12 candidates; 12 fully covered | https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40883494386 |
| Three-person Oslo places, medium restaurant-tier cap | 12 candidates; 12 fully covered; filter applied on six Insights calls | https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40885037384 |
| Five-person movie plan using two repeated cultural anchors | 12 candidates; 11 fully covered; five discovery/evaluation steps | https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40886047104 |

Real API runs establish successful orchestration in these specific cases. They do **not** independently confirm venue addresses, availability, monetary costs, enjoyment outcomes, five independent taste profiles, every city, or every budget constraint. Browser testing uses separate mocked-live and fictional-demo scenarios.

## Copyable short Devpost description

**The problem:** One-size-fits-all recommendations overlook the least satisfied person in the group. A plan that looks great on average can still be terrible for one friend.

**Our solution:** UNISON is a fairness-aware, Qloo-powered group-planning agent for two to five people. Each person gives cultural favorites such as movies, artists or food interests. The server resolves exact Qloo entities, runs per-person cross-domain Insights discovery, evaluates a shared shortlist for everyone, and ranks fully supported options using a transparent minimum-fit-plus-average heuristic. Missing taste evidence never becomes a fabricated negative opinion.

**Why Qloo matters:** The cross-domain cultural graph lets movie/music tastes inform place or film choices, and provides the real external evidence for a group compromise rather than guessing from generic stereotypes.

**Experience:** A responsive web app makes each participant's fit visible and offers fairness styles, independent candidate comparison, participant vetoes, human Yes/Maybe/No ballots, decision stability, inspected agent trace, privacy-safe decision export, tentative calendar events, and manual venue readiness checks. A one-click fictional demo works without credentials; Live Qloo requires explicit opt-in and a server-kept API key.

**Proof:** Public GitHub Actions runs confirm real authenticated two- and five-person movie plans and two- and three-person Oslo place plans. Desktop and mobile Chromium CI covers the actual interface. UNISON never claims to have booked a venue, verified prices, or predicted enjoyment accurately.

**Built with:** Node.js, browser-native HTML/CSS/JavaScript, Qloo Search and Insights API, GitHub Actions, and Render. MIT licensed.

## Two-minute judge walkthrough

1. **0:00–0:20:** Describe the problem (popular or average fit often ignores one person) and the fairness goal.
2. **0:20–0:40:** Select **Run a one-click fictional demonstration**. State clearly that this is simulated, then show the three-person group and resulting shortlist.
3. **0:40–1:10:** Open **Decision Lab**, **Head-to-Head**, and **Group Evidence Audit**. Show the per-person score trade-offs, missing-data rule, and why the top choice is a compromise.
4. **1:10–1:30:** Record a human Yes/Maybe/No vote, switch decision weights and veto a choice. These operations use already observed evidence without new Qloo requests.
5. **1:30–1:50:** Explain the **real Qloo** tool sequence and show the source trace and links to actual production CI evidence. If live API is available, optionally switch explicitly to live; never call fictional evidence real.
6. **1:50–2:00:** Show the tentative calendar handoff and Venue Reality Check. Nothing is booked and details must be manually checked.

## Owner actions before pressing Submit

1. Open https://qloo.devpost.com/ and sign into the correct Devpost account, then **Join Hackathon** if it has not been done already.
2. Complete the Devpost submission form using the live demo link, public GitHub repository, and the English description. If the form offers an optional media asset, use a clean screenshot from the browser-test artifact or a manually captured screenshot. A video is **not required**.
3. Check the Devpost preview for working links and correct event selection, and press the final **Submit** control. A saved draft or GitHub commit is **not** a hackathon entry.
4. Verify Devpost shows the project as submitted and save its public submission URL. Keep Render live and the repo public through November 5, 2026.
5. Avoid changing underlying API behavior after submission unless fixing a genuine defect; keep the demo stable for judges.

## Four equally weighted judging criteria

- **Technological implementation:** Show real Qloo Search and two-pass Insights, per-person trace, defensive entity checks, honest scores and tested API integration.
- **Design:** Show a complete usable web experience, keyboard and mobile support, accessible status dashboard, voting, and clear action handoff.
- **Potential impact:** Explain who benefits: friends, households and groups tired of one person dominating a plan. Do not invent user-study results.
- **Quality of idea:** Emphasize minimum-fit fairness, evidence coverage, cultural taste crossover, local replanning and human group consent — not another one-person recommendation page.

**Outstanding uncertainties:** Independent venue/price/hours checks, human usability study, testing unusual cultural anchors, and account-level Devpost submission confirmation. These are not reasons to falsely present an incomplete product as finished.

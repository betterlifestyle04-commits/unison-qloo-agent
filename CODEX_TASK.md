# Codex mission: turn UNISON into a hackathon-winning Qloo agent

You are the principal engineer, product designer and QA lead for **UNISON — Different tastes. One great plan.** Deadline: **October 30, 2026, 11:45pm EDT / October 31, 04:45 Oslo time**. Read `README.md`, inspect all code, run `npm test && npm run check`, and work directly in this GitHub repository. Don't stop at analysis: make concrete commits and verify them.

## Goals, ordered by submission risk

1. **Make the existing zero-dependency Node app flawless.** Fix all bugs and accessibility issues, keyboard and mobile behavior, blank/error cases, page performance, and semantic markup. Ensure the interactive demo works end-to-end. Add thorough unit, HTTP and browser tests (Playwright when practical). Preserve honest, prominent demo labeling.
2. **Activate and verify the real server-side Qloo agent when `QLOO_API_KEY` is provided** as an environment secret. Base host `https://hackathon.api.qloo.com`; header `X-Api-Key`; `GET /search` to resolve favorite cultural entities and `GET /v2/insights` per person to retrieve candidates. Validate responses with the actual credential, Qloo docs and test fixtures; fix mismatched response shapes. Never use `/recs` or `/recommendations`. Never expose the key client-side, hardcode it, log it, commit it, or put it in a query parameter. Never substitute demo results silently if live requests fail. Follow Qloo quotas with bounded calls and cache.
3. **Improve the agent's genuine decision quality.** Today the first version uses relative rank-based scores, max-min/mean/coverage scoring and a veto loop. Add informative comparisons, missing-data handling, smarter confidence, deterministic evidence-linked explanations, and multi-step agent feedback cycles. Distinguish observed Qloo results from project-derived relative heuristics. Don't claim objective happiness percentages or invented results. Add explainability using documented Qloo fields only when verified.
4. **Polish the design to award quality.** Editorial quality, crisp typography, attractive but original visuals, meticulous responsive layout, delightful subtle animation, elegant loading, progress trace, and results. Every button, selector and input must work. No signup required for judges. Remove external font dependency if CSP blocks it, or configure font loading safely. Check real browser screenshot and correct spacing/overflows.
5. **Publish a real external demo.** Deploy to a Node-capable hosting service such as Render via `render.yaml`. Confirm 200 on homepage and `/api/status`, and verify `/api/plan` end-to-end on publicly hosted URL. Do NOT claim deployed until checked. GitHub Pages alone is insufficient for a server-held Qloo secret. Include public source repo and visible MIT license.
6. **Prepare submission materials** (`DEVPOST_SUBMISSION.md`): English project story and technical architecture, demo instructions, Qloo call trace, transparent limitations, live hosted demo URL and repository URL once confirmed, compliance checklist. No video required by official rules. Do not fabricate screenshots, popularity evidence, marketing statistics or integration success.

## Best practices

- Keep the hackathon solution narrowly focused: 2–5 friends, places and movie nights, trustworthy compromise, inspectable agent trace.
- Do not build unrelated social networks, payments, advanced profiles, or generic chatbots in the remaining time.
- Prefer shipping a reliable live Qloo demonstration over adding unverified features.
- Fix high-severity bugs before design flourishes. Keep code small, clean, typed/validated where practical.
- Use a feature branch or small tested commits; do not rewrite the whole repo without reason.
- Report what was actually implemented, tested, deployed, and still blocked, with precise status.

## First Codex step

Read all files, run existing checks and tests, identify the five highest submission risks, and then address them through real code changes. You may proceed through the tasks without asking for repeated approvals for ordinary code edits and tests. Do not publish publicly or submit the project to Devpost without explicit user authorization.

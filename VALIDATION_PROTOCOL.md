# Real-world validation protocol — what UNISON can and cannot claim

## Evidence already collected

Real Qloo API runs are not the same as external data verification or measured human enjoyment. Our authenticated one-time smoke tests now cover Oslo (two- and three-person groups), Bergen (two people, one movie + one music artist), London (two people, one movie + one music artist), and a five-person movie plan using repeated, verified public film anchors.

- Bergen + London mixed cultural tastes: https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40977183116
- Oslo places: https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40883494386
- Oslo 3-person / restaurant mid tier: https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40885037384
- Five-person movie group: https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40886047104

**Limits:** These are narrow, successful tool-connection examples. They do not establish place business identity, current hours, reservations or prices, nor any population-level generalization to every city or combination of cultural tastes.

## Venue truth: the human verification gate

Qloo provides cultural recommendation candidates, not necessarily independent venue truth.

The user-facing **Venue Reality Check** is always unverified when it starts. For live Qloo place candidates, we offer:
- An external Google Maps search to inspect the venue's name, address and current published hours.
- A web search that helps locate the venue's official website.
- A prewritten enquiry for a user to send independently asking about opening hours, group capacity, meeting address, costs, and booking requirements.

**No automated bookability lookup is integrated.** A map/search link is not the same as an official venue booking URL. A user must confirm the exact venue independently and mark any checklist items themselves. We do not automatically mark verified or make reservations. Real-time validated opening hours / reservation availability would require a suitable live venue data or reservation provider with its own credential, licensing, place matching and availability API.

## Measuring outcomes and user happiness

The opt-in **Did the plan meet expectations?** worksheet is accessible after a recommendation. For each candidate, individual participants can record:
1. **Before the outing:** anticipated enjoyment (1 = very low, 5 = very high).
2. **After actually attending:** experienced enjoyment on the same scale.

Only matched before/after ratings are compared. The summary labels the mean difference an **expectation gap**, not "UNISON improved happiness." If data are missing, no values are imputed. A user can explicitly export anonymous participant-number CSV; **no names or Qloo profiles** are placed in the file, and the browser does not submit the ratings to UNISON or Qloo. The ratings last only for the current page session; the CSV cannot be re-imported. No group measurements have yet been observed or analyzed by the project.

### Suggested external, consenting user study

1. Recruit a diverse set of groups, describe what is collected and obtain informed agreement; exclude sensitive personal information.
2. Randomize or counterbalance planning approaches (ordinary group discussion vs UNISON) in comparable decision sessions.
3. Record time-to-decision, number of conflicts, and opt-in pre-event expectation ratings.
4. After the outing/event, collect experienced enjoyment from each consenting individual; note dropouts and nonresponses.
5. Compare the same outcomes across planning methods, including the lowest-rated group member and dispersion. Do not treat scores from the Qloo algorithm as actual enjoyment.
6. Publish participant count, assignment method, uncertainty intervals, missingness, and limitations. Never claim causality without a credible comparison or study design.

**No impact improvement claim is justified until actual human study data exist.** The worksheet is measurement infrastructure, not research findings.

## Limitations for Devpost

- Verified: authenticated sample Qloo planning runs, mobile/desktop browser flows, test suites, quota and provenance protections.
- Requires external verification: specific business identity, hours, geographic location, current prices and bookability.
- Requires real participants: whether UNISON improves satisfaction relative to group decision-making without it.
- Unverified globally: arbitrary cities, budgets, cultural anchors, device/browser combinations, and live availability.

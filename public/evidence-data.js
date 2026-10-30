/**
 * Explicitly sourced one-time authenticated production smoke results.
 * These are historical observations, NOT live venues, success rates,
 * user analytics, forecast probabilities, or current Qloo availability.
 * All proof URLs refer to successful GitHub Actions runs verified Oct 30 2026.
 */
export const VERIFIED_CASES=Object.freeze([
 {id:'movies-two',title:'Two-person movie decision',domain:'movies',city:'—',country:'—',people:2,candidates:12,covered:11,date:'2026-10-29',run:40878074739,source:'https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40878074739',focus:'Live movie planning with two fictional participants',limits:'Movie availability and enjoyment were not checked.'},
 {id:'oslo-two',title:'Oslo · Two-person outing',domain:'places',city:'Oslo',country:'Norway',people:2,candidates:12,covered:12,date:'2026-10-29',run:40883494386,source:'https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40883494386',focus:'Two public film anchors; city query Oslo, any price tier',limits:'Business identities, hours, prices and booking availability were not independently confirmed.'},
 {id:'oslo-three',title:'Oslo · Three people and a price cap',domain:'places',city:'Oslo',country:'Norway',people:3,candidates:12,covered:12,date:'2026-10-29',run:40885037384,source:'https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40885037384',focus:'Three pinned cultural movie IDs; six Insights calls applied max restaurant price tier 2',limits:'The Qloo price filter was sent; actual prices and availability were not checked.'},
 {id:'movies-five',title:'Five-person movie planning',domain:'movies',city:'—',country:'—',people:5,candidates:12,covered:11,date:'2026-10-29',run:40886047104,source:'https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40886047104',focus:'Maximum group size; five discovery and evaluation trace steps, with repeated public film anchors',limits:'Repeated film anchors do not prove five independent taste profiles or calibrated satisfaction.'},
 {id:'bergen',title:'Bergen · Mixed cultural tastes',domain:'places',city:'Bergen',country:'Norway',people:2,candidates:12,covered:12,date:'2026-10-30',run:40977183116,source:'https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40977183116',focus:'Film Interstellar and artist Radiohead used as distinct public taste anchors',limits:'The response was not checked against venue addresses, actual opening hours or availability.'},
 {id:'london',title:'London · Mixed cultural tastes',domain:'places',city:'London',country:'United Kingdom',people:2,candidates:12,covered:12,date:'2026-10-30',run:40977183116,source:'https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40977183116',focus:'Film Interstellar and artist Radiohead used as distinct public taste anchors',limits:'The response was not checked against venue addresses, actual opening hours or availability.'}
].map(item=>Object.freeze(item)));
export const API_PIPELINE_PROOF=Object.freeze({
 title:'Authenticated Search → Insights → shortlist',
 date:'2026-10-29',
 source:'https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40877477130',
 note:'One-time real Qloo public-film smoke check; a passing sample is not a guarantee of live service availability.'
});
export function filterVerifiedCases({domain='all',city='all',people='all',query=''}={}){
 const needle=String(query??'').trim().toLocaleLowerCase();
 return VERIFIED_CASES.filter(x=>
  (domain==='all'||x.domain===domain)&&
  (city==='all'||x.city===city)&&
  (people==='all'||x.people===Number(people))&&
  (!needle||[x.title,x.focus,x.city,x.country,x.limits].some(value=>value.toLocaleLowerCase().includes(needle)))
 );
}
export function evidenceSummary(cases=VERIFIED_CASES){
 const rows=Array.isArray(cases)?cases:[];
 const places=rows.filter(x=>x.domain==='places');
 const movies=rows.filter(x=>x.domain==='movies');
 return Object.freeze({
   cases:rows.length,
   cities:new Set(places.map(x=>x.city).filter(x=>x!=='—')).size,
   peopleSizes:[...new Set(rows.map(x=>x.people))].sort((a,b)=>a-b),
   placeCases:places.length,movieCases:movies.length,
   runs:new Set(rows.map(x=>x.run)).size,
   candidates:rows.reduce((n,x)=>n+x.candidates,0),
   covered:rows.reduce((n,x)=>n+x.covered,0)
 });
}

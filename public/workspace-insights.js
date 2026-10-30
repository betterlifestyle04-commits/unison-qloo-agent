/**
 * Private dashboard calculations. All figures are derived ONLY from a
 * person's explicitly saved, browser-local plan archive. No telemetry,
 * Qloo lookups, real-time validation, or external measurements.
 */
const clean=s=>String(s??'').trim();
function topValues(entries,limit=5){
  const byValue=new Map();
  for(const value of entries){
    const label=clean(value);
    if(!label)continue;
    const key=label.toLocaleLowerCase();
    const prior=byValue.get(key);
    byValue.set(key,{label:prior?.label||label,count:(prior?.count||0)+1});
  }
  return [...byValue.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label)).slice(0,limit);
}
export function archiveInsights(plans=[]){
  const entries=Array.isArray(plans)?plans.filter(x=>x&&x.brief&&Array.isArray(x.brief.people)):[];
  const domains={places:0,movies:0};
  const modes={live:0,demo:0};
  let participantSlots=0;
  const cityVisits=[],favoriteMentions=[];
  for(const entry of entries){
    if(entry.brief.domain==='movies')domains.movies++;
    else domains.places++;
    if(entry.brief.mode==='live')modes.live++;
    else modes.demo++;
    participantSlots+=entry.brief.people.length;
    if(entry.brief.domain==='places'&&clean(entry.brief.city))cityVisits.push(entry.brief.city);
    // One mention per plan, not per participant, avoids mislabeling
    // a group favorite as an independent vote or preference measurement.
    const perPlan=new Map();
    for(const person of entry.brief.people){
      for(const favorite of person.favorites||[]){
        const label=clean(favorite);
        if(label&&!perPlan.has(label.toLocaleLowerCase()))perPlan.set(label.toLocaleLowerCase(),label);
      }
    }
    favoriteMentions.push(...perPlan.values());
  }
  const dated=entries.filter(x=>Number.isFinite(Date.parse(x.savedAt||'')))
    .slice().sort((a,b)=>Date.parse(b.savedAt)-Date.parse(a.savedAt));
  return {
    count:entries.length,
    domains,modes,participantSlots,
    cities:topValues(cityVisits),
    references:topValues(favoriteMentions),
    mostRecent:dated[0]?.savedAt||null,
    averageGroupSize:entries.length?Math.round(participantSlots/entries.length*10)/10:0
  };
}
export function filterArchive(plans=[],{query='',domain='all',mode='all',sort='newest'}={}){
  const needle=clean(query).toLocaleLowerCase();
  const list=(Array.isArray(plans)?plans:[]).filter(entry=>{
    if(!entry||!entry.brief)return false;
    if(domain!=='all'&&entry.brief.domain!==domain)return false;
    if(mode!=='all'&&entry.brief.mode!==mode)return false;
    if(!needle)return true;
    return [
      entry.title,entry.winner,entry.brief.city,entry.brief.domain,
      ...entry.brief.people.flatMap(person=>[person.name,...person.favorites])
    ].some(value=>clean(value).toLocaleLowerCase().includes(needle));
  });
  if(sort==='title')list.sort((a,b)=>clean(a.title).localeCompare(clean(b.title)));
  else list.sort((a,b)=>(Date.parse(b.savedAt)-Date.parse(a.savedAt))*(sort==='oldest'?-1:1));
  return list;
}

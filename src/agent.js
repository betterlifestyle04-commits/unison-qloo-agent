import {demoEvidence} from './demo.js';
import {explainCandidate,rankCandidates} from './rank.js';
import {insights,isLiveConfigured,searchFavorite} from './qloo.js';
import {screenCandidates,summarizeScreening} from './candidate-integrity.js';

const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
// Keep upstream Qloo requests bounded so larger groups do not send 15 searches at once.
export async function mapLimited(items,limit,mapper){
  const results=new Array(items.length),workers=Math.min(limit,items.length);
  let next=0;
  await Promise.all(Array.from({length:workers},async()=>{
    while(next<items.length){
      const index=next++;
      results[index]=await mapper(items[index],index);
    }
  }));
  return results;
}
// One consistent ordinal estimate for every participant; native Qloo affinity is kept separate.
export const rankFitEstimate=index=>Math.max(20,100-(index*8));
const idFor=(name,index)=>`${name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'person'}-${index+1}`;
function validate(input){
  if(!input||typeof input!=='object'||Array.isArray(input))fail('A plan request is required.');
  if(!Array.isArray(input.people)||input.people.length<2||input.people.length>5)fail('Add between 2 and 5 people.');
  const people=input.people.map((person,index)=>{
    if(!person||typeof person!=='object'||Array.isArray(person))fail('Each participant must be an object.');
    const name=typeof person.name==='string'?person.name.trim():'';
    const favorites=Array.isArray(person.favorites)?person.favorites:typeof person.favorite==='string'?person.favorite.split(','):[];
    if(favorites.length<1||favorites.length>3)fail('Use between 1 and 3 favorites per participant.');
    if(!favorites.every(value=>typeof value==='string'&&value.trim().length>0&&value.trim().length<=80))fail('Each favorite must be 1–80 characters.');
    if(!name||name.length>32)fail('Each participant needs a name up to 32 characters.');
    const uniqueFavorites=[...new Set(favorites.map(value=>value.trim()))];
    const selections=Array.isArray(person.selectedEntities)?person.selectedEntities:[];
    if(selections.length>3)fail('No more than three selected cultural entities are allowed per participant.');
    const selectedEntities=selections.map(choice=>{
      if(!choice||typeof choice!=='object'||Array.isArray(choice)||typeof choice.name!=='string'||typeof choice.id!=='string')fail('Invalid selected cultural entity.');
      const canonicalName=choice.name.trim();
      if(!uniqueFavorites.some(f=>f.toLowerCase()===canonicalName.toLowerCase()))fail('A selected Qloo entity must match a listed favorite.');
      if(!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(choice.id))fail('Invalid Qloo entity identifier.');
      return {name:canonicalName,id:choice.id,type:typeof choice.type==='string'?choice.type.slice(0,80):''};
    });
    return {name,favorites:uniqueFavorites,selectedEntities,id:idFor(name,index)};
  });
  if(new Set(people.map(person=>person.name.toLocaleLowerCase())).size!==people.length)fail('Use distinct names so the evidence remains inspectable.');
  if(input.domain!==undefined&&!['places','movies'].includes(input.domain))fail('Unsupported planning category.');
  if(input.mode!==undefined&&!['live','demo'].includes(input.mode))fail('Unsupported evidence source.');
  const domain=input.domain==='movies'?'movies':'places';
  const mode=input.mode==='live'?'live':'demo';
  if(input.city!==undefined&&typeof input.city!=='string')fail('City must be text.');
  const city=String(input.city||'').trim().slice(0,80),budget=['any','low','mid','high'].includes(input.budget)?input.budget:'any';
  const vetoes=Array.isArray(input.vetoes)?input.vetoes.filter(value=>typeof value==='string'&&value.length<=200).slice(0,30):[];
  return {people,domain,mode,city,budget,vetoes};
}
export async function resolvePersonFavorites(person,search=searchFavorite){
  return mapLimited(person.favorites,2,favorite=>{
    const chosen=(person.selectedEntities||[]).find(selection=>selection.name.toLowerCase()===favorite.toLowerCase());
    if(chosen)return {status:'resolved',exact:chosen,matches:[chosen],url:null,cached:false,picked:true};
    return search(favorite);
  });
}
async function liveEvidence(people,domain,city,budget,trace,tools){
  // Limit concurrent participant resolution. Each participant resolves at most two favorites at once.
  const resolved=await mapLimited(people,2,async person=>{
    const matches=await resolvePersonFavorites(person,tools.searchFavorite);
    const unresolved=matches.filter(match=>match.status!=='resolved');
    if(unresolved.length){const names=unresolved.flatMap(match=>match.matches.map(item=>item.name+(item.type?' ('+item.type.replace(/^urn:entity:/,'')+')':''))).slice(0,5);fail(`Please clarify ${person.name}'s favorite using Taste Finder. Qloo found ${names.length?names.join(', '):'no exact match'}; titles shared by movies, albums, artists, or books must be selected explicitly.`,422);}
    const picked=matches.filter(match=>match.picked).length;
    return {...person,entities:matches.map(match=>match.exact),resolution:{picked,requests:matches.filter(match=>match.url).map(match=>({url:match.url,cached:match.cached}))}};
  });
  for(const person of resolved)trace.push({step:'Qloo entity resolution',kind:'qloo',detail:`Resolved ${person.favorites.length} favorite(s) for ${person.name}, including ${person.resolution.picked} explicitly selected Qloo entity ID(s).`,requests:person.resolution.requests});
  const discoveries=await mapLimited(resolved,2,async person=>{
    const response=await tools.insights(person.entities.map(entity=>entity.id),domain,{city,budget});
    const screen=screenCandidates(response.results,domain);
    return {person,results:screen.items,quality:screen.stats,url:response.url,cached:response.cached};
  });
  for(const item of discoveries)trace.push({step:'Qloo discovery tool',kind:'qloo',detail:`Requested ${domain} candidates for ${item.person.name}${city&&domain==='places'?` within ${city}`:''}.`,requests:[{url:item.url,cached:item.cached}]});
  const discoveryStats=summarizeScreening(discoveries.map(item=>({stats:item.quality})));
  trace.push({step:'Discovery integrity gate',kind:'local',detail:`Screened ${discoveryStats.received} returned discovery entities; retained ${discoveryStats.accepted} category-matching unique candidates, excluded ${discoveryStats.wrongType} wrong-type, ${discoveryStats.duplicates} duplicate and ${discoveryStats.invalid} invalid entries. Missing entity types are not independently verified.`});
  const shortlist=[...new Set(discoveries.flatMap(entry=>entry.results.map(item=>item.id)))].slice(0,12);
  if(!shortlist.length){
    trace.push({step:'No candidates',kind:'local',detail:'Qloo returned no place or movie candidates matching this group and its current constraints.'});
    return {candidates:[],quality:{discovery:discoveryStats,evaluation:null,shortlistSize:0}};
  }
  const perPerson=await mapLimited(resolved,2,async person=>{
    const response=await tools.insights(person.entities.map(entity=>entity.id),domain,{city,budget,shortlist});
    const screen=screenCandidates(response.results,domain,{shortlist});
    return {person,results:screen.items,quality:screen.stats,url:response.url,cached:response.cached};
  });
  for(const item of perPerson)trace.push({step:'Qloo shortlist evaluation tool',kind:'qloo',detail:`Evaluated the shared ${shortlist.length}-option shortlist for ${item.person.name}.`,requests:[{url:item.url,cached:item.cached}]});
  const evaluationStats=summarizeScreening(perPerson.map(item=>({stats:item.quality})));
  trace.push({step:'Shortlist integrity gate',kind:'local',detail:`Accepted ${evaluationStats.accepted} person-candidate signals from the requested shortlist of ${shortlist.length} options. Excluded ${evaluationStats.outsideShortlist} unrequested entities, ${evaluationStats.wrongType} wrong-category entities, ${evaluationStats.duplicates} duplicates and ${evaluationStats.invalid} invalid records. Exclusion never means dislike.`});
  const candidates=new Map();
  perPerson.forEach(({person,results})=>results.forEach((item,index)=>{
    if(!candidates.has(item.id))candidates.set(item.id,{...item,signals:{},signalKinds:{},observedAffinityByPerson:{},evidence:'Observed Qloo candidate. All UNISON fit estimates use the same relative ordinal scale; native Qloo affinity is kept separate.'});
    candidates.get(item.id).signals[person.id]=rankFitEstimate(index);
    candidates.get(item.id).signalKinds[person.id]='UNISON ordinal fit estimate';
    if(item.affinity!==null)candidates.get(item.id).observedAffinityByPerson[person.id]=item.affinity;
  }));
  return {candidates:[...candidates.values()],quality:{discovery:discoveryStats,evaluation:evaluationStats,shortlistSize:shortlist.length}};
}
export async function runAgent(input,{qlooTools}={}){
  // Optional controlled test seam. Production never passes a replacement.
  const tools=qlooTools||{isLiveConfigured,searchFavorite,insights};
  const {people,domain,mode,city,budget,vetoes}=validate(input);
  if(mode==='live'&&!tools.isLiveConfigured())fail('Live Qloo mode is not configured. Add QLOO_API_KEY securely or choose clearly labeled demo mode.',503);
  if(mode==='live'&&domain==='places'&&!city)fail('Choose a city before requesting live place recommendations.',422);
  const trace=[{step:'Plan',kind:'local',detail:`Collect up to three favorites per person, then seek a ${budget==='any'?'practical':budget}-budget ${domain==='places'?'place':'movie'} compromise.`}];
  const live=mode==='live'?await liveEvidence(people,domain,city,budget,trace,tools):null;
  const candidates=live?live.candidates:demoEvidence(people,domain,{city,budget});
  if(!candidates.length)fail(mode==='live'
    ?'Qloo returned no candidates for this combination of tastes and constraints. Try another city, loosen the price level, or select other cultural references. No fictional results were substituted.'
    :'No simulated options match that budget. Try a different practical constraint.',422);
  const ranked=rankCandidates(candidates,people,vetoes).map(candidate=>({...candidate,explanation:explainCandidate(candidate,people)}));
  trace.push({step:mode==='demo'?'Simulated evidence tool':'Evidence merge',kind:mode==='demo'?'demo':'local',detail:mode==='demo'?'Mapped favorites to a deterministic fictional taste scenario. No Qloo request was made.':'Merged independent Qloo result lists; absent results remain unknown.'},{step:'Evaluation',kind:'local',detail:'Ranked consistently using UNISON ordinal relative-fit estimates. Native Qloo affinity is never blended with derived scores. Missing evidence stays unknown.'},{step:vetoes.length?'Replan after veto':'Control check',kind:'local',detail:vetoes.length?`Removed ${vetoes.length} vetoed option(s) and re-ranked the remaining trade-offs.`:'No veto changed this plan.'});
  const supported=ranked.filter(candidate=>candidate.sufficient&&!candidate.vetoed);
  return {mode,domain,city,budget,people,ranked,supported,...(live?{quality:live.quality}:{}),needsMoreEvidence:!supported.length,nextAction:!supported.length?'No candidate has observed evidence for every participant. Resolve missing favorites, relax an over-tight constraint, or collect another preference before calling a group compromise.':null,trace,disclaimer:mode==='demo'?'Demo mode: all candidates and signals are simulated local evidence, for interaction only.':'Live mode: candidates originate from Qloo. Per-person fit and group scores use UNISON rank-derived estimates, not native Qloo affinity or satisfaction probabilities.'};
}

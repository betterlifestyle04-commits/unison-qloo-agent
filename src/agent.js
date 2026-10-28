import {demoEvidence} from './demo.js';
import {explainCandidate,rankCandidates} from './rank.js';
import {insights,isLiveConfigured,searchFavorite} from './qloo.js';

const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
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
    return {name,favorites:[...new Set(favorites.map(value=>value.trim()))],id:idFor(name,index)};
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
async function liveEvidence(people,domain,city,budget,trace){
  const resolved=await Promise.all(people.map(async person=>{const matches=await Promise.all(person.favorites.map(favorite=>searchFavorite(favorite)));const unresolved=matches.filter(match=>match.status!=='resolved');if(unresolved.length){const names=unresolved.flatMap(match=>match.matches.map(item=>item.name)).slice(0,3);fail(`Please clarify ${person.name}'s favorite. Qloo found ${names.length?names.join(', '):'no exact match'}.`,422);}trace.push({step:'Qloo search tool',kind:'qloo',detail:`Resolved ${person.favorites.length} exact favorite${person.favorites.length===1?'':'s'} for ${person.name}.`,requests:matches.map(match=>({url:match.url,cached:match.cached}))});return {...person,entities:matches.map(match=>match.exact)};}));
  const discoveries=await Promise.all(resolved.map(async person=>{const response=await insights(person.entities.map(entity=>entity.id),domain,{city,budget});trace.push({step:'Qloo discovery tool',kind:'qloo',detail:`Requested ${domain} candidates for ${person.name}${city&&domain==='places'?` strictly within ${city}`:''}.`,requests:[{url:response.url,cached:response.cached}]});return {person,results:response.results};}));
  const shortlist=[...new Set(discoveries.flatMap(entry=>entry.results.map(item=>item.id)))].slice(0,12);
  const perPerson=await Promise.all(resolved.map(async person=>{const response=await insights(person.entities.map(entity=>entity.id),domain,{city,budget,shortlist});trace.push({step:'Qloo shortlist evaluation tool',kind:'qloo',detail:`Evaluated the shared ${shortlist.length}-option shortlist for ${person.name}.`,requests:[{url:response.url,cached:response.cached}]});return {person,results:response.results};}));
  const candidates=new Map();
  perPerson.forEach(({person,results})=>results.forEach((item,index)=>{
    if(!candidates.has(item.id))candidates.set(item.id,{...item,signals:{},signalKinds:{},observedAffinityByPerson:{},evidence:'Observed Qloo candidate. All UNISON fit estimates use the same relative ordinal scale; native Qloo affinity is kept separate.'});
    candidates.get(item.id).signals[person.id]=rankFitEstimate(index);
    candidates.get(item.id).signalKinds[person.id]='UNISON ordinal fit estimate';
    if(item.affinity!==null)candidates.get(item.id).observedAffinityByPerson[person.id]=item.affinity;
  }));
  return [...candidates.values()];
}
export async function runAgent(input){
  const {people,domain,mode,city,budget,vetoes}=validate(input);
  if(mode==='live'&&!isLiveConfigured())fail('Live Qloo mode is not configured. Add QLOO_API_KEY securely or choose clearly labeled demo mode.',503);
  if(mode==='live'&&domain==='places'&&!city)fail('Choose a city before requesting live place recommendations.',422);
  const trace=[{step:'Plan',kind:'local',detail:`Collect up to three favorites per person, then seek a ${budget==='any'?'practical':budget}-budget ${domain==='places'?'place':'movie'} compromise.`}];
  const candidates=mode==='live'?await liveEvidence(people,domain,city,budget,trace):demoEvidence(people,domain,{city,budget});
  if(!candidates.length)fail('No simulated options match that budget. Try a different practical constraint.',422);
  const ranked=rankCandidates(candidates,people,vetoes).map(candidate=>({...candidate,explanation:explainCandidate(candidate,people)}));
  trace.push({step:mode==='demo'?'Simulated evidence tool':'Evidence merge',kind:mode==='demo'?'demo':'local',detail:mode==='demo'?'Mapped favorites to a deterministic fictional taste scenario. No Qloo request was made.':'Merged independent Qloo result lists; absent results remain unknown.'},{step:'Evaluation',kind:'local',detail:'Ranked consistently using UNISON ordinal relative-fit estimates. Native Qloo affinity is never blended with derived scores. Missing evidence stays unknown.'},{step:vetoes.length?'Replan after veto':'Control check',kind:'local',detail:vetoes.length?`Removed ${vetoes.length} vetoed option(s) and re-ranked the remaining trade-offs.`:'No veto changed this plan.'});
  const supported=ranked.filter(candidate=>candidate.sufficient&&!candidate.vetoed);
  return {mode,domain,city,budget,people,ranked,supported,needsMoreEvidence:!supported.length,nextAction:!supported.length?'No candidate has observed evidence for every participant. Resolve missing favorites, relax an over-tight constraint, or collect another preference before calling a group compromise.':null,trace,disclaimer:mode==='demo'?'Demo mode: all candidates and signals are simulated local evidence, for interaction only.':'Live mode: candidates originate from Qloo. Per-person fit and group scores use UNISON rank-derived estimates, not native Qloo affinity or satisfaction probabilities.'};
}

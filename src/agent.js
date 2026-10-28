import {demoEvidence} from './demo.js';
import {explainCandidate,rankCandidates} from './rank.js';
import {insights,isLiveConfigured,resolveExact} from './qloo.js';

const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const idFor=(name,index)=>`${name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'person'}-${index+1}`;
function validate(input){
  if(!input||typeof input!=='object')fail('A plan request is required.');
  const people=(input.people||[]).map((person,index)=>({name:String(person?.name||'').trim(),favorite:String(person?.favorite||'').trim(),id:idFor(String(person?.name||''),index)}));
  if(people.length<2||people.length>5)fail('Add between 2 and 5 people.');
  if(people.some(person=>!person.name||!person.favorite))fail('Each person needs a name and one favorite cultural reference.');
  if(new Set(people.map(person=>person.name.toLocaleLowerCase())).size!==people.length)fail('Use distinct names so the evidence remains inspectable.');
  const domain=input.domain==='movies'?'movies':'places';
  const mode=input.mode==='live'?'live':'demo';
  return {people,domain,mode,vetoes:Array.isArray(input.vetoes)?input.vetoes.filter(value=>typeof value==='string'):[]};
}
async function liveEvidence(people,domain){
  const resolved=await Promise.all(people.map(async person=>({...person,entity:await resolveExact(person.favorite)})));
  const perPerson=await Promise.all(resolved.map(async person=>({person,results:await insights(person.entity.id,domain)})));
  const candidates=new Map();
  perPerson.forEach(({person,results})=>results.forEach((item,index)=>{
    if(!candidates.has(item.id))candidates.set(item.id,{...item,signals:{},evidence:'Observed in Qloo insights; relative fit is derived from result rank.'});
    candidates.get(item.id).signals[person.id]=Math.max(20,100-(index*10));
  }));
  return [...candidates.values()];
}
export async function runAgent(input){
  const {people,domain,mode,vetoes}=validate(input);
  if(mode==='live'&&!isLiveConfigured())fail('Live Qloo mode is not configured. Add QLOO_API_KEY securely or choose clearly labeled demo mode.',503);
  const candidates=mode==='live'?await liveEvidence(people,domain):demoEvidence(people,domain);
  const ranked=rankCandidates(candidates,people,vetoes).map(candidate=>({...candidate,explanation:explainCandidate(candidate,people)}));
  return {mode,domain,people,ranked,trace:[
    {step:'Input checked',detail:`${people.length} distinct people; ${domain} target.`},
    {step:mode==='demo'?'Demo evidence selected':'Qloo evidence requested',detail:mode==='demo'?'Fictional local scenario only. No Qloo request was made.':'Each favorite is resolved before per-person insights are merged.'},
    {step:'Compromise ranked',detail:'0.55 × minimum observed fit + 0.35 × observed average + 0.10 × coverage. Missing remains unknown.'},
    {step:'Vetoes applied',detail:vetoes.length?`${vetoes.length} option(s) excluded.`:'No options excluded.'}
  ],disclaimer:mode==='demo'?'Demo mode: all candidates and signals are fictional, for interaction only.':'Live mode: Qloo results are observed; scores are UNISON relative heuristics, not satisfaction probabilities.'};
}

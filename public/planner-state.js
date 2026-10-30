/**
 * Browser-safe, dependency-free planning utilities. No user data leaves the browser
 * when formatting or sharing a brief; links intentionally expose the chosen names
 * and cultural preferences to whoever receives the URL.
 */
export const starterGroups = [
  {
    id:'friends',
    label:'Friends night out',
    description:'Different personalities, one evening',
    domain:'places',
    city:'Oslo',
    budget:'any',
    people:[
      {name:'Maya', favorites:['Studio Ghibli']},
      {name:'Jon', favorites:['Anthony Bourdain']},
      {name:'Priya', favorites:['Knives Out']}
    ]
  },
  {
    id:'movie',
    label:'Movie night',
    description:'A cross-genre group compromise',
    domain:'movies',
    city:'',
    budget:'any',
    people:[
      {name:'Alex', favorites:['Interstellar']},
      {name:'Sam', favorites:['The Dark Knight']},
      {name:'Taylor', favorites:['La La Land']}
    ]
  },
  {
    id:'date',
    label:'Date night',
    description:'Two different sets of interests',
    domain:'places',
    city:'Oslo',
    budget:'mid',
    people:[
      {name:'Alex', favorites:['Jazz']},
      {name:'Sam', favorites:['Anthony Bourdain']}
    ]
  },
  {
    id:'team',label:'Team social',description:'Four colleagues with different cultural interests',domain:'places',city:'London',budget:'any',
    people:[
      {name:'Hana',favorites:['David Bowie','Jazz']},
      {name:'Leo',favorites:['Anthony Bourdain','Travel']},
      {name:'Noor',favorites:['Studio Ghibli','Museum']},
      {name:'Mika',favorites:['The Grand Budapest Hotel','Design']}
    ]
  },
  {
    id:'family',label:'Family film night',description:'A five-person group with mixed film preferences',domain:'movies',city:'',budget:'any',
    people:[
      {name:'Ava',favorites:['Toy Story','Animation']},
      {name:'Ben',favorites:['Star Wars','Science fiction']},
      {name:'Chloe',favorites:['Paddington','Comedy']},
      {name:'Dani',favorites:['The Lord of the Rings','Fantasy']},
      {name:'Eli',favorites:['Knives Out','Mystery']}
    ]
  },
  {
    id:'weekend',label:'Weekend explorers',description:'An adventurous group in a big city',domain:'places',city:'New York City',budget:'mid',
    people:[
      {name:'Riley',favorites:['Anthony Bourdain','Street food']},
      {name:'Morgan',favorites:['Jazz','Live music']},
      {name:'Avery',favorites:['Studio Ghibli','Art']},
      {name:'Casey',favorites:['Travel','Architecture']}
    ]
  },
  {
    id:'quiet',label:'A quieter outing',description:'Low-key culture and conversation',domain:'places',city:'Oslo',budget:'low',
    people:[
      {name:'Iris',favorites:['Museums','Architecture']},
      {name:'Robin',favorites:['Jazz','Coffee']}
    ]
  },
  {
    id:'cineclub',label:'Film club',description:'Four film genres and one decision',domain:'movies',city:'',budget:'any',
    people:[
      {name:'Zoe',favorites:['Interstellar','Sci-fi']},
      {name:'Amir',favorites:['Knives Out','Mystery']},
      {name:'Luca',favorites:['Spirited Away','Animation']},
      {name:'Nina',favorites:['The Grand Budapest Hotel','Comedy']}
    ]
  },
  {
    id:'creatives',label:'Creative meet-up',description:'Three creative interests, one London afternoon',domain:'places',city:'London',budget:'any',
    people:[
      {name:'Em',favorites:['Design','Architecture']},
      {name:'Kai',favorites:['Museum','Photography']},
      {name:'Fran',favorites:['Anthony Bourdain','Food']}
    ]
  }
];

const allowedDomain=new Set(['places','movies']);
const allowedBudget=new Set(['any','low','mid','high']);
const cleanText=(value,max)=>String(value??'').trim().slice(0,max);
const isObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);

export function normalizeBrief(raw){
  if(!isObject(raw)||!Array.isArray(raw.people)||raw.people.length<2||raw.people.length>5)throw new Error('The shared group must have between two and five people.');
  const people=raw.people.map(person=>{
    if(!isObject(person))throw new Error('Invalid participant.');
    const name=cleanText(person.name,32);
    const favorites=(Array.isArray(person.favorites)?person.favorites:[]).slice(0,3).map(f=>cleanText(f,75)).filter(Boolean);
    if(!name||favorites.length===0)throw new Error('Each participant needs a name and a favorite.');
    const choices=Array.isArray(person.selectedEntities)?person.selectedEntities:[];
    if(choices.length>3)throw new Error('Too many selected Qloo entities.');
    const selectedEntities=choices.map(choice=>{
      if(!isObject(choice)||typeof choice.name!=='string'||typeof choice.id!=='string'||!favorites.some(f=>f.toLowerCase()===choice.name.trim().toLowerCase())||!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(choice.id)){
        throw new Error('Invalid selected Qloo entity in the shared brief.');
      }
      return {name:cleanText(choice.name,80),id:choice.id,type:cleanText(choice.type,80)};
    });
    return {name,favorites,...(selectedEntities.length?{selectedEntities}:{})};
  });
  if(new Set(people.map(p=>p.name.toLowerCase())).size!==people.length)throw new Error('Use different names for each participant.');
  return {
    domain:allowedDomain.has(raw.domain)?raw.domain:'places',
    mode:raw.mode==='live'?'live':'demo',
    city:cleanText(raw.city,80),
    budget:allowedBudget.has(raw.budget)?raw.budget:'any',
    people
  };
}
function asBase64Url(plain){
  const bytes=new TextEncoder().encode(plain);
  let binary='';
  for(const byte of bytes)binary+=String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function fromBase64Url(encoded){
  const base64=encoded.replace(/-/g,'+').replace(/_/g,'/');
  const binary=atob(base64);
  return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(binary,char=>char.charCodeAt(0)));
}
export function encodeShareBrief(raw){
  const normalized=normalizeBrief(raw);
  return asBase64Url(JSON.stringify({v:1,...normalized}));
}
export function decodeShareBrief(hash){
  const match=/^#plan=([A-Za-z0-9_-]{1,6000})$/.exec(hash);
  if(!match)throw new Error('Not a UNISON group link.');
  let parsed;try{parsed=JSON.parse(fromBase64Url(match[1]));}catch{throw new Error('The shared group link is invalid or damaged.');}
  if(parsed?.v!==1)throw new Error('This group link uses an unsupported version.');
  return normalizeBrief(parsed);
}
export const decisionStyles={
  balanced:{label:'Balanced',minimum:.55,average:.35,coverage:.10,description:'Balances the least-supported person with the group average.'},
  protective:{label:'Protect the lowest fit',minimum:.75,average:.15,coverage:.10,description:'Gives greater influence to whoever has the lowest relative fit.'},
  average:{label:'Group average',minimum:.25,average:.65,coverage:.10,description:'Places greater weight on the average relative fit across the group.'}
};
export function applyVetoLocally(result,vetoes,style='balanced'){
  if(!result||!Array.isArray(result.ranked))throw new Error('A ranked plan is required.');
  const excluded=new Set(vetoes);
  const weights=decisionStyles[style]??decisionStyles.balanced;
  const ranked=result.ranked.map(item=>{
    const vetoed=excluded.has(item.id);
    // Every candidate uses the same locally derived relative-fit measurements.
    const computed=item.sufficient&&Number.isFinite(item.minimum)&&Number.isFinite(item.average)
      ?Number((weights.minimum*item.minimum+weights.average*item.average+weights.coverage*100*(item.coverage??0)).toFixed(1))
      :item.sufficient?(item.baseScore??item.score):null;
    return {
      ...item,
      baseScore:computed,
      vetoed,
      score:vetoed?null:computed,
      explanation:vetoed?'Removed because the group vetoed this option.':item.originalExplanation??item.explanation,
      originalExplanation:item.originalExplanation??item.explanation
    };
  }).sort((a,b)=>Number(b.score??-1)-Number(a.score??-1)||String(a.name).localeCompare(String(b.name)));
  const supported=ranked.filter(item=>item.sufficient&&!item.vetoed);
  return {
    ...result,
    ranked,
    supported,
    decisionStyle:decisionStyles[style]?style:'balanced',
    needsMoreEvidence:!supported.length,
    nextAction:!supported.length?'No supported options remain. Restore a veto or adjust your group brief and search again.':null,
    trace:[
      ...(result.trace||[]).filter(step=>step.kind!=='local-veto'),
      {step:'Local preference revision',kind:'local-veto',detail:'Re-ranked existing evidence using '+weights.label.toLowerCase()+' weights and '+excluded.size+' veto(es). No new Qloo request was made.'}
    ]
  };
}
export function buildGroupSummary(result){
  if(!result)return '';
  const choices=result.ranked.filter(item=>item.sufficient&&!item.vetoed);
  const winner=choices[0];
  if(!winner)return 'UNISON has no supported choice right now. Try adding another preference or restoring a veto.';
  return [
    'UNISON — Our shared plan',
    result.domain==='movies'?'Movie night':'Group outing'+(result.city?' in '+result.city:''),
    'Top pick: '+winner.name,
    'UNISON relative score: '+winner.score+'/100',
    'Decision style: '+(decisionStyles[result.decisionStyle]?.label??'Balanced'),
    'Evidence coverage: '+Math.round(winner.coverage*100)+'%',
    ...choices.slice(1,4).map((item,index)=>'Alternative '+(index+1)+': '+item.name),
    '',
    'Scores are UNISON relative-fit estimates, not satisfaction probabilities.',
    result.mode==='demo'?'All recommendations are fictional demo examples.':'Candidates sourced from the Qloo API.',
    'https://unison-qloo.onrender.com'
  ].join('\n');
}

/**
 * Compares different group-decision rules against the SAME observed candidate pool.
 * Never imputes missing people, uses fake statistics, or claims measured happiness.
 */
export function analyzeDecisionTradeoffs(result){
  if(!result||!Array.isArray(result.ranked))return {eligible:0,stable:false,winners:{},averageOnly:null,explanation:'Generate a plan to compare decision styles.'};
  const eligible=result.ranked.filter(item=>!item.vetoed&&item.sufficient&&Number.isFinite(item.minimum)&&Number.isFinite(item.average)&&Number.isFinite(item.coverage)&&item.coverage===1);
  if(!eligible.length)return {eligible:0,stable:false,winners:{},averageOnly:null,explanation:'No candidate has comparable evidence for every participant. Gather more information before comparing styles.'};
  const score=(candidate,weights)=>weights.minimum*candidate.minimum+weights.average*candidate.average+weights.coverage*100*candidate.coverage;
  const sortFor=weights=>[...eligible].sort((a,b)=>score(b,weights)-score(a,weights)||String(a.name).localeCompare(String(b.name))||String(a.id).localeCompare(String(b.id)));
  const winners=Object.fromEntries(Object.entries(decisionStyles).map(([style,weights])=>[style,sortFor(weights)[0]]));
  const averageOnly=[...eligible].sort((a,b)=>b.average-a.average||b.minimum-a.minimum||String(a.name).localeCompare(String(b.name)))[0];
  const stable=new Set(Object.values(winners).map(item=>item.id)).size===1;
  const balanced=winners.balanced;
  const different=averageOnly.id!==balanced.id;
  const minBenefit=different?Number((balanced.minimum-averageOnly.minimum).toFixed(1)):0;
  const averageCost=different?Number((averageOnly.average-balanced.average).toFixed(1)):0;
  const explanation=different
    ?`The balanced rule currently favors ${balanced.name} over the highest-average option (${averageOnly.name}). Its lowest relative fit is ${balanced.minimum}/100 instead of ${averageOnly.minimum}/100; the group-average difference is ${averageCost.toFixed(1)} points. This is a transparent heuristic trade-off, not a satisfaction prediction.`
    :`The balanced rule and highest-average rule both select ${balanced.name}. The ranking may still change if preferences or candidate evidence change.`;
  return {eligible:eligible.length,stable,winners,averageOnly,balanced,minBenefit,averageCost,different,explanation};
}

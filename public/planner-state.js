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
    return {name,favorites};
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
export function applyVetoLocally(result,vetoes){
  if(!result||!Array.isArray(result.ranked))throw new Error('A ranked plan is required.');
  const excluded=new Set(vetoes);
  const ranked=result.ranked.map(item=>{
    const vetoed=excluded.has(item.id);
    const originalScore=item.baseScore??item.score;
    return {
      ...item,
      baseScore:originalScore,
      vetoed,
      score:vetoed?null:originalScore,
      explanation:vetoed?'Removed because the group vetoed this option.':item.originalExplanation??item.explanation,
      originalExplanation:item.originalExplanation??item.explanation
    };
  }).sort((a,b)=>Number(b.score??-1)-Number(a.score??-1)||String(a.name).localeCompare(String(b.name)));
  const supported=ranked.filter(item=>item.sufficient&&!item.vetoed);
  return {
    ...result,
    ranked,
    supported,
    needsMoreEvidence:!supported.length,
    nextAction:!supported.length?'No supported options remain. Restore a veto or adjust your group brief and search again.':null,
    trace:[
      ...(result.trace||[]).filter(step=>step.kind!=='local-veto'),
      {step:'Replan after veto',kind:'local-veto',detail:'Re-ranked the existing evidence locally, with no new Qloo request. The full group can restore choices at any time.'}
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
    'Evidence coverage: '+Math.round(winner.coverage*100)+'%',
    ...choices.slice(1,4).map((item,index)=>'Alternative '+(index+1)+': '+item.name),
    '',
    'Scores are UNISON relative-fit estimates, not satisfaction probabilities.',
    result.mode==='demo'?'All recommendations are fictional demo examples.':'Candidates sourced from the Qloo API.',
    'https://unison-qloo.onrender.com'
  ].join('\n');
}

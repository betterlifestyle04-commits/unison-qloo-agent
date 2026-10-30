import {starterGroups} from './planner-state.js';
import {loadDevicePlans} from './saved-plans.js';

/**
 * Editorial sample briefs, not Qloo evidence or real-world venue inventory.
 * The scenarios use only public cultural references and fictional group members.
 */
export const scenarioMetadata=Object.freeze({
  friends:{icon:'✳',tone:'lilac',label:'Friends',moment:'Friday · together',detail:'Three very different tastes, one evening out.',tags:['Food','Film','Art']},
  movie:{icon:'▣',tone:'peach',label:'Movie night',moment:'Tonight · at home',detail:'A sci-fi fan, a thriller fan and a musical lover.',tags:['Movies','Genres','Compromise']},
  date:{icon:'♡',tone:'rose',label:'Date night',moment:'Two people · one plan',detail:'An easygoing night shaped by jazz and food.',tags:['Dinner','Music','Connection']},
  team:{icon:'◈',tone:'sky',label:'Team social',moment:'After work · four people',detail:'Find a shared outing for colleagues with contrasting interests.',tags:['Teams','After work','Culture']},
  family:{icon:'☼',tone:'gold',label:'Family film night',moment:'Weekend · five people',detail:'A mixed-age fictional group with wildly different viewing tastes.',tags:['Family','Movies','Fairness']},
  weekend:{icon:'⌁',tone:'mint',label:'Weekend explorers',moment:'Saturday · four people',detail:'Food, live culture and curiosity in one city.',tags:['Discovery','City','Friends']},
  quiet:{icon:'☾',tone:'sage',label:'A quieter outing',moment:'Low-key · two people',detail:'For people who prefer thoughtful, calm surroundings.',tags:['Calm','Conversation','Art']},
  cineclub:{icon:'✦',tone:'blue',label:'Film club',moment:'Screening · four people',detail:'Find common ground across mystery, animation, sci-fi and comedy.',tags:['Film club','Cinema','Taste']},
  creatives:{icon:'✳',tone:'lavender',label:'Creative meet-up',moment:'An afternoon · three people',detail:'Design, architecture and food without one person dominating.',tags:['Design','Culture','Exploration']}
});

export function filterScenarios(scenarios,{domain='all',query=''}={}){
  const needle=String(query).trim().toLocaleLowerCase();
  return scenarios.filter(scenario=>{
    if(domain!=='all'&&scenario.domain!==domain)return false;
    if(!needle)return true;
    const meta=scenarioMetadata[scenario.id]||{};
    const searchable=[scenario.label,scenario.description,scenario.city,meta.label,meta.moment,meta.detail,...(meta.tags||[]),...(scenario.people||[]).flatMap(person=>person.favorites||[])];
    return searchable.some(value=>String(value||'').toLocaleLowerCase().includes(needle));
  });
}
export function scenarioStats(scenarios=starterGroups){
  return {total:scenarios.length,places:scenarios.filter(x=>x.domain==='places').length,movies:scenarios.filter(x=>x.domain==='movies').length};
}

function cardFor(scenario){
  const meta=scenarioMetadata[scenario.id]||{icon:'✳',tone:'lilac',label:'Group',moment:'Shared plan',detail:scenario.description||'',tags:[]};
  const card=document.createElement('article');
  card.className='explore-card explore-'+meta.tone;
  const icon=document.createElement('span');icon.className='explore-card-symbol';icon.textContent=meta.icon;icon.setAttribute('aria-hidden','true');
  const top=document.createElement('div');top.className='explore-card-top';
  const category=document.createElement('span');category.className='explore-card-category';category.textContent=scenario.domain==='movies'?'MOVIE NIGHT':'GO SOMEWHERE';
  const audience=document.createElement('span');audience.className='explore-card-audience';audience.textContent=scenario.people.length+' people';
  top.append(category,audience);
  const name=document.createElement('h3');name.textContent=meta.label;
  const context=document.createElement('p');context.className='explore-card-moment';context.textContent=meta.moment;
  const details=document.createElement('p');details.className='explore-card-description';details.textContent=meta.detail;
  const tags=document.createElement('div');tags.className='explore-card-tags';
  for(const value of meta.tags.slice(0,3)){const tag=document.createElement('span');tag.textContent=value;tags.append(tag);}
  const bottom=document.createElement('div');bottom.className='explore-card-bottom';
  const avatars=document.createElement('span');avatars.className='explore-avatars';avatars.setAttribute('aria-label',scenario.people.length+' fictional participants');
  scenario.people.slice(0,4).forEach(person=>{const avatar=document.createElement('span');avatar.textContent=person.name.slice(0,1).toLocaleUpperCase();avatar.setAttribute('aria-hidden','true');avatars.append(avatar);});
  if(scenario.people.length>4){const more=document.createElement('span');more.textContent='+'+(scenario.people.length-4);avatars.append(more);}
  const button=document.createElement('button');button.type='button';button.className='explore-load';button.dataset.preset=scenario.id;button.setAttribute('aria-pressed','false');button.setAttribute('aria-label','Load '+meta.label+' sample brief into the planner');button.textContent='Use this template ↗';
  bottom.append(avatars,button);
  card.append(icon,top,name,context,details,tags,bottom);
  return card;
}

/** One-time UI mount. Selecting a template never invokes the planning API. */
export function mountExplorer({root=document,storage=null}={}){
  const gallery=root.querySelector('#explore-gallery');
  const search=root.querySelector('#explore-search');
  const count=root.querySelector('#explore-count');
  const tabs=[...root.querySelectorAll('[data-explore-domain]')];
  if(!gallery||!search||!count)return;
  let active='all';
  const updateSaved=()=>{
    const number=root.querySelector('#workspace-saved-number');
    const caption=root.querySelector('#workspace-saved-caption');
    if(!number||!caption)return;
    let saved=[];
    try{saved=loadDevicePlans(storage||globalThis.localStorage);}catch{saved=[];}
    number.textContent=String(saved.length);
    caption.textContent=saved.length?'Saved privately in this browser':'No plans saved yet';
  };
  const paint=()=>{
    const visible=filterScenarios(starterGroups,{domain:active,query:search.value});
    gallery.replaceChildren(...visible.map(cardFor));
    if(!visible.length){
      const empty=document.createElement('div');empty.className='explore-no-results';empty.textContent='No matching scenarios. Try a different taste or category.';
      gallery.append(empty);
    }
    count.textContent=visible.length+' of '+starterGroups.length+' example briefs';
    tabs.forEach(tab=>tab.setAttribute('aria-pressed',String(tab.dataset.exploreDomain===active)));
  };
  for(const tab of tabs)tab.addEventListener('click',()=>{active=tab.dataset.exploreDomain;paint();});
  search.addEventListener('input',paint);
  root.querySelector('#explore-clear')?.addEventListener('click',()=>{active='all';search.value='';paint();search.focus();});
  globalThis.addEventListener?.('unison:library-updated',updateSaved);
  const stats=scenarioStats();
  const scenarioNumber=root.querySelector('#workspace-scenarios-number');
  if(scenarioNumber)scenarioNumber.textContent=String(stats.total);
  updateSaved();paint();
}

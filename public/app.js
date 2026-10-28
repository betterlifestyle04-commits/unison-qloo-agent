import {starterGroups,normalizeBrief,encodeShareBrief,decodeShareBrief,applyVetoLocally,decisionStyles,buildGroupSummary} from './planner-state.js';
import {ballotChoices,updateBallot,summarizeBallot,winningAgreement} from './ballot.js';
const $=selector=>document.querySelector(selector);
const people=$('#people'),template=$('#person-template'),form=$('#plan-form'),results=$('#results'),error=$('#form-error'),submitBtn=$('#submit-plan'),statusBadge=$('#mode-status');
const starters=[['Maya','Studio Ghibli'],['Jon','Anthony Bourdain'],['Priya','Knives Out']];
const selectedByPerson=new WeakMap();
function showPinned(node){const selections=[...(selectedByPerson.get(node)?.values()||[])];const hint=node.querySelector('[data-pinned]');if(hint)hint.textContent=selections.length?'Verified Qloo selection: '+selections.map(x=>x.name+' ('+String(x.type||'entity').replace(/^urn:entity:/,'')+')').join(', '):'';}
const app={configured:false,requesting:false,lastInput:null,lastResult:null,showAll:false,hasChangedMode:false,baseResult:null,hashLoaded:false,decisionStyle:'balanced',ballots:{},lookupBusy:false};
const escape=value=>{const element=document.createElement('span');element.textContent=String(value??'');return element.innerHTML.replace(/\"/g,'&quot;').replace(/'/g,'&#39;');};
const number=value=>Number.isFinite(value)?String(Math.round(value)):null;
const initial=value=>String(value||'?').trim().slice(0,1).toUpperCase();
const percent=value=>Math.max(0,Math.min(100,Number(value)||0));
const sourceName=data=>data.mode==='live'?'Real Qloo results':'Fictional demonstration';
function setActivePreset(id=null){document.querySelectorAll('[data-preset]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.preset===id)));}
function updateTasteOwners(){
  const owner=$('#taste-owner');if(!owner)return;
  const previous=owner.value;
  owner.replaceChildren();
  [...people.querySelectorAll('.person')].forEach((row,index)=>{
    const name=row.querySelector('[data-field=name]').value.trim()||'Person '+(index+1);
    const option=document.createElement('option');option.value=String(index);option.textContent=name;owner.append(option);
  });
  if([...owner.options].some(option=>option.value===previous))owner.value=previous;
}

function updateGroup(){
  $('#people-count').textContent=people.children.length+' of 5';
  $('#add-person').disabled=people.children.length>=5;
  [...people.querySelectorAll('.person')].forEach((row,index)=>{const input=row.querySelector('[data-field=name]');row.querySelector('.person-avatar').textContent=initial(input.value);row.querySelector('.remove').setAttribute('aria-label','Remove '+(input.value.trim()||'person '+(index+1)));row.querySelector('.remove').disabled=people.children.length<=2;});
  updateTasteOwners();
}
function addPerson(values=['',''],chosenEntities=[]){
  const node=template.content.firstElementChild.cloneNode(true);
  const name=node.querySelector('[data-field=name]'),favorite=node.querySelector('[data-field=favorite]');
  name.value=values[0];favorite.value=values[1];
  selectedByPerson.set(node,new Map(chosenEntities.map(item=>[item.name.toLowerCase(),item])));
  favorite.addEventListener('input',()=>{
    const stillListed=new Set(favorite.value.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean));
    const saved=selectedByPerson.get(node);
    for(const key of saved.keys())if(!stillListed.has(key))saved.delete(key);
    showPinned(node);
  });
  name.addEventListener('input',updateGroup);
  node.querySelector('.remove').addEventListener('click',()=>{if(people.children.length<=2){showError('A group needs at least two people.');return;}node.remove();updateGroup();});
  people.append(node);showPinned(node);updateGroup();
}
starters.forEach(addPerson);
$('#add-person').addEventListener('click',()=>{if(people.children.length>=5)return;addPerson();people.lastElementChild.querySelector('[data-field=name]').focus();});
function showError(message=''){error.textContent=message;}
function markInvalid(input){
  if(!input)return;
  input.setAttribute('aria-invalid','true');input.setAttribute('aria-describedby','form-error');
  const clear=()=>{input.removeAttribute('aria-invalid');input.removeAttribute('aria-describedby');};
  input.addEventListener('input',clear,{once:true});input.addEventListener('change',clear,{once:true});
}
async function copyText(text){
  if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(text);return true;}catch{}}
  const area=document.createElement('textarea');area.value=text;area.setAttribute('readonly','');area.style.cssText='position:fixed;opacity:0;pointer-events:none';document.body.append(area);area.select();
  let copied=false;try{copied=typeof document.execCommand==='function'&&document.execCommand('copy');}catch{copied=false;}finally{area.remove();}return copied;
}
function currentMode(){return form.querySelector('input[name=mode]:checked')?.value||'demo';}
function currentDomain(){return form.querySelector('input[name=domain]:checked')?.value||'places';}
function updateFormPresentation(){
  const places=currentDomain()==='places';
  $('#place-constraints').hidden=!places;
  $('#city').required=places&&currentMode()==='live';
  $('#city').disabled=!places;
  $('#budget').disabled=!places;
  $('#taste-finder').hidden=!(app.configured&&currentMode()==='live');
  $('#submit-label').textContent=places?'Find our common ground':'Find our movie night';
}
form.querySelectorAll('input[name=domain],input[name=mode]').forEach(input=>input.addEventListener('change',()=>{if(input.name==='mode')app.hasChangedMode=true;setActivePreset();updateFormPresentation();}));
form.addEventListener('input',event=>{if(!event.target.matches('[data-preset]'))setActivePreset();});
form.addEventListener('change',event=>{if(!event.target.matches('[data-preset]'))setActivePreset();});
const lookupBtn=$('#taste-find');
const lookupResults=$('#taste-find-results');
function lookupMessage(message){lookupResults.replaceChildren(Object.assign(document.createElement('p'),{textContent:message}));}
async function lookupTaste(){
  if(app.lookupBusy||!app.configured||currentMode()!=='live')return;
  const q=$('#taste-query').value.trim();
  if(q.length<2||q.length>80){lookupMessage('Enter a cultural reference between 2 and 80 characters.');return;}
  app.lookupBusy=true;lookupBtn.disabled=true;lookupMessage('Searching Qloo cultural entities…');
  try{
    const response=await fetch('/api/taste-lookup?q='+encodeURIComponent(q),{cache:'no-store'});
    const payload=await response.json();
    if(!response.ok)throw new Error(payload.error||'Qloo search is currently unavailable.');
    if(!Array.isArray(payload.matches)||!payload.matches.length){lookupMessage('No result found. Try a more specific title or artist name.');return;}
    lookupResults.innerHTML='<p>Select a matching Qloo entity. The selected type and exact ID will be kept for that participant.</p>'+
      payload.matches.slice(0,5).map(item=>`<button type="button" class="taste-match" data-add-taste="${escape(item.name)}" data-entity-id="${escape(item.id)}" data-entity-type="${escape(item.type||'')}"><strong>${escape(item.name)}</strong><span>${escape(String(item.type||'Cultural entity').replace(/^urn:entity:/,''))}</span></button>`).join('');
    lookupResults.querySelectorAll('[data-add-taste]').forEach(button=>button.addEventListener('click',()=>{
      const person=[...people.querySelectorAll('.person')][Number($('#taste-owner').value)];
      const input=person?.querySelector('[data-field=favorite]');if(!input)return;
      const chosen=button.dataset.addTaste;
      const entity={name:chosen,id:button.dataset.entityId,type:button.dataset.entityType};
      if(chosen.includes(',')){lookupMessage('This title contains a comma and cannot be appended automatically. Copy its name into the favorites field manually.');return;}
      const favorites=input.value.split(',').map(x=>x.trim()).filter(Boolean);
      const existing=favorites.some(f=>f.toLowerCase()===chosen.toLowerCase());
      if(!existing&&favorites.length>=3){lookupMessage('This participant already has three favorites. Remove one before adding another.');return;}
      if(!existing)input.value=[...favorites,chosen].join(', ');
      selectedByPerson.get(person).set(chosen.toLowerCase(),entity);
      showPinned(person);
      lookupMessage('Selected Qloo '+(entity.type.replace(/^urn:entity:/,'')||'entity')+' “'+chosen+'”. Its exact ID will be used for this participant in the next live plan.');
      input.focus();
    }));
  }catch(e){lookupMessage(e.message||'Could not search Qloo.');}
  finally{app.lookupBusy=false;lookupBtn.disabled=false;}
}
lookupBtn.addEventListener('click',lookupTaste);
$('#taste-query').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();lookupTaste();}});

document.querySelectorAll('.city-quick').forEach(button=>button.addEventListener('click',()=>{$('#city').value=button.dataset.city;showError();}));
function brief(){
  const data=new FormData(form);
  return {domain:data.get('domain'),mode:data.get('mode'),city:String(data.get('city')||'').trim(),budget:data.get('budget')||'any',
    people:[...people.querySelectorAll('.person')].map(row=>{
      const favorites=row.querySelector('[data-field=favorite]').value.split(',').map(value=>value.trim()).filter(Boolean).slice(0,3);
      const saved=selectedByPerson.get(row)||new Map();
      const selectedEntities=favorites.map(name=>saved.get(name.toLowerCase())).filter(Boolean);
      return {name:row.querySelector('[data-field=name]').value.trim(),favorites,...(selectedEntities.length?{selectedEntities}:{})};
    })};
}
function validate(input){
  if(input.people.some(p=>!p.name||!p.favorites.length))return 'Give every participant a name and at least one favorite.';
  if(new Set(input.people.map(p=>p.name.toLocaleLowerCase())).size!==input.people.length)return 'Each participant needs a different name.';
  if(input.domain==='places'&&input.mode==='live'&&!input.city)return 'Enter a city for a live place plan so results stay in your chosen area.';
  if(input.mode==='live'&&!app.configured)return 'Live Qloo is not available right now. Choose demo mode.';
  return '';
}
function focusBriefProblem(problem,input){
  if(problem.startsWith('Give every participant')){
    const row=[...people.querySelectorAll('.person')].find(person=>{const name=person.querySelector('[data-field=name]').value.trim();const favorite=person.querySelector('[data-field=favorite]').value.trim();return !name||!favorite;});
    const field=row?.querySelector(row.querySelector('[data-field=name]').value.trim()?'[data-field=favorite]':'[data-field=name]');markInvalid(field);field?.focus();return;
  }
  if(problem.startsWith('Each participant')){const seen=new Set();const row=[...people.querySelectorAll('.person')].find(person=>{const name=person.querySelector('[data-field=name]').value.trim().toLocaleLowerCase();if(seen.has(name))return true;seen.add(name);return false;});const field=row?.querySelector('[data-field=name]');markInvalid(field);field?.focus();return;}
  if(problem.startsWith('Enter a city')){const field=$('#city');markInvalid(field);field?.focus();return;}
  error.focus();
}
function sameBrief(a,b){if(!a||!b)return false;const extract=x=>JSON.stringify([x.domain,x.mode,x.city,x.budget,x.people]);return extract(a)===extract(b);}
function fitBar(value){return value===null||value===undefined?'<span class="unknown">No signal</span>':`<span class="bar" aria-hidden="true"><i style="width:${percent(value)}%"></i></span><span class="value">${number(value)}</span>`;}
function listPeople(item,data){
  return `<details class="taste"><summary>How each person fits</summary><ul class="taste-list">${data.people.map(person=>{
    const val=item.signals?.[person.id];
    const shown=number(val);
    return `<li><span>${escape(person.name)}</span>${shown===null?'<span class="unknown">No signal</span>':`<span class="tiny-bar" aria-hidden="true"><i style="width:${percent(val)}%"></i></span><b>${shown}/100</b>`}</li>`;
  }).join('')}</ul></details>`;
}
function evidenceSection(item,data){
  const source=data.mode==='live'?'Qloo entity · live':'Fictional demo entity';
  const kind=data.mode==='live'?'Local ordinal fit estimate':'Simulated preference fit';
  const raw=item.observedAffinityByPerson||{};
  return `<details class="evidence-details">
    <summary>What is this recommendation based on?</summary>
    <div class="evidence-metadata"><span>Source</span><strong>${escape(source)}</strong></div>
    ${data.mode==='live'?`<div class="evidence-metadata"><span>Qloo entity ID</span><code>${escape(item.id)}</code></div>`:''}
    <div class="evidence-metadata"><span>Per-person score</span><strong>${escape(kind)}</strong></div>
    ${data.people.map(person=>`<div class="evidence-metadata"><span>${escape(person.name)}</span><span>${escape(item.signalKinds?.[person.id]|| (data.mode==='demo'?'Fictional scenario':'No observed signal'))}${Number.isFinite(raw[person.id])?' · native affinity '+escape(raw[person.id]):''}</span></div>`).join('')}
    <p>UNISON's group fit is a heuristic comparison, not a probability that anyone will enjoy the option. Missing evidence does not mean dislike.</p>
  </details>`;
}
function ballotSection(item,data){
  const status=summarizeBallot(app.ballots,item.id,data.people.map(p=>p.id));
  return `<details class="group-ballot" data-ballot-panel="${escape(item.id)}">
    <summary><span>Group vote <small class="ballot-count">${escape(status.label)}</small></span></summary>
    <p>Ask each person to choose. Votes stay in this browser and do not change Qloo scores.</p>
    <div class="ballot-people">${data.people.map(person=>`<div class="ballot-person">
      <span class="ballot-name">${escape(person.name)}</span>
      <div class="ballot-actions" role="group" aria-label="${escape(person.name)}'s vote on ${escape(item.name)}">
        ${ballotChoices.map(choice=>`<button type="button" data-vote-choice="${choice}" data-vote-candidate="${escape(item.id)}" data-vote-person="${escape(person.id)}" aria-pressed="${app.ballots[item.id]?.[person.id]===choice}">${choice==='yes'?'✓ Yes':choice==='maybe'?'~ Maybe':'× No'}</button>`).join('')}
      </div>
    </div>`).join('')}</div>
    ${status.unanimous?'<div class="ballot-unanimous">✓ All participants said yes — agreement recorded locally.</div>':''}
  </details>`;
}
function card(item,index,data){
  const title=escape(item.name),val=item.score===null||item.score===undefined?'—':escape(item.score);
  const label=item.vetoed?'VETOED':item.sufficient?'OPTION '+(index+1):'MORE EVIDENCE';
  const kind=escape(item.kind||item.category|| (data.domain==='movies'?'Movie':'Place'));
  const note=item.note||item.address||'';
  const voteStatus=summarizeBallot(app.ballots,item.id,data.people.map(p=>p.id));
  const mapUrl=data.mode==='live'&&data.domain==='places'?'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([item.name,item.address||data.city].filter(Boolean).join(' ')):null;
  return `<article class="card ${item.vetoed?'vetoed':''}" aria-label="${title}">
    <div class="candidate-visual">${data.mode==='live'&&item.imageUrl?`<img src="${escape(item.imageUrl)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`:`<div class="candidate-placeholder" aria-hidden="true"><span>${data.domain==='movies'?'▣':'✳'}</span></div>`}
      ${voteStatus.unanimous?'<span class="agree-mark">✓ Group approved</span>':''}
    </div>
    <div class="card-top"><span class="rank-pill">${label}</span><strong>${val}<small>${item.score===null?'':'/100'}</small></strong></div>
    <h4>${title}</h4><p class="candidate-meta">${kind}${item.price?' · '+escape('Price tier '+item.price):''}</p>${note?`<p class="candidate-note">${escape(note)}</p>`:''}
    <div class="divider-line"></div>
    <div class="stat-row"><span class="label">Lowest fit</span>${fitBar(item.minimum)}</div>
    <div class="stat-row"><span class="label">Average fit</span>${fitBar(item.average)}</div>
    <div class="stat-row"><span class="label">Coverage</span><span class="bar" aria-hidden="true"><i style="width:${Math.round((item.coverage||0)*100)}%"></i></span><span class="value">${Math.round((item.coverage||0)*100)}%</span></div>
    ${listPeople(item,data)}
    ${ballotSection(item,data)}
    ${evidenceSection(item,data)}
    ${mapUrl?`<a class="map-link" href="${escape(mapUrl)}" target="_blank" rel="noopener noreferrer">↗ Search for this place on Google Maps</a>`:''}
    <p class="card-explanation">${escape(item.explanation||'')}</p>
    <button class="veto" data-veto="${escape(item.id)}" aria-pressed="${Boolean(item.vetoed)}">${item.vetoed?'↶ Restore option':'× Not for our group'}</button>
  </article>`;
}
function render(data){
  app.lastResult=data;
  const approved=data.ranked.filter(item=>item.sufficient&&!item.vetoed);
  const top=approved[0],count=approved.length;
  const groupApproved=winningAgreement(data,app.ballots);
  const leastMatched=top?data.people.find(p=>top.signals?.[p.id]===top.minimum):null;
  const show=data.ranked.slice(0,app.showAll?data.ranked.length:6);
  const status=data.mode==='live'?'Qloo API · Live evidence':'Demo · Simulated evidence';
  results.innerHTML=`<div class="result-topline"><div><p class="overline">${escape(status)}</p><h3>${top?'Your best shared match':'We need a little more evidence'}</h3><p class="result-sub">${escape(data.domain==='places'?(data.city?'Planning for '+data.city:'No city selected'):'Movie night')} · ${data.people.length} people · ${count} fully covered option${count===1?'':'s'}</p></div><div class="result-actions"><button id="copy-plan" class="text-button" type="button" ${top?'':'disabled'}>Copy plan ↗</button><button id="reset-veto" class="text-button" type="button">Clear vetoes</button></div></div>
    <div class="source-banner ${data.mode==='live'?'live':''}"><strong>${escape(sourceName(data))}.</strong> ${escape(data.disclaimer)}</div>
    <section class="decision-tuning" aria-label="How should we balance the group's preferences?">
      <div class="decision-tuning-head"><strong>How should we choose?</strong><span>Adjusts ranking only · no new Qloo requests</span></div>
      <div class="decision-styles">${Object.entries(decisionStyles).map(([key,style])=>`<button type="button" data-style="${key}" aria-pressed="${app.decisionStyle===key}">${escape(style.label)}</button>`).join('')}</div>
      <p>${escape(decisionStyles[app.decisionStyle].description)} These weights are UNISON heuristics, not measurements of happiness.</p>
    </section>
    <div class="voting-intro"><strong>New · Agree together</strong><span>Each person can vote Yes, Maybe or No on any candidate. Votes stay on this device, separate from Qloo predictions.</span></div>
    ${groupApproved?`<div class="approved-choice" role="status">✓ Group agreement recorded: <strong>${escape(groupApproved.name)}</strong>. Everyone voted Yes.</div>`:''}
    ${data.needsMoreEvidence?`<div class="notice" role="status">${escape(data.nextAction||'Evidence is incomplete. Add another preference.')}</div>`:''}
    ${top?`<article class="winner"><div class="winner-inner"><p class="eyebrow">✳ THE BEST CURRENT COMPROMISE</p><h3>${escape(top.name)}</h3><div class="winner-meta"><span>${escape(data.domain==='movies'?'Movie recommendation':'Place recommendation')}</span><span>${escape(data.mode==='live'?'Qloo candidates':'Fictional demo candidates')}</span>${data.city&&data.domain==='places'?'<span>'+escape(data.city)+'</span>':''}</div><p>${escape(top.note||top.address||'Recommended based on the available cross-person taste signals.')}</p><div class="winner-stats"><div><strong>${escape(top.score)}</strong><small>UNISON relative score / 100</small></div><div><strong>${number(top.minimum)}</strong><small>Lowest relative fit</small></div><div><strong>${Math.round(top.coverage*100)}%</strong><small>Signal coverage</small></div></div></div></article>`:''}
    ${top?`<div class="compromise-context"><span class="context-icon">◎</span><span><strong>What makes this a compromise?</strong><small>${escape(leastMatched?leastMatched.name+' has the lowest relative fit at '+number(top.minimum)+'/100. UNISON considers this alongside the group average when ranking options.':'UNISON compares each participant using relative-fit evidence.')}</small></span></div>`:''}
    <div class="cards-heading"><h4>Explore the shortlist</h4><small>${data.ranked.length} candidate${data.ranked.length===1?'':'s'}</small></div>
    <div class="cards">${show.map((item,i)=>card(item,i,data)).join('')}</div>
    ${data.ranked.length>6?`<button id="show-all" class="add-person" type="button">${app.showAll?'Show fewer options':'Show all '+data.ranked.length+' options'} <span aria-hidden="true">↓</span></button>`:''}
    <details class="trace"><summary>How UNISON reached this decision · ${data.trace.length} steps</summary><ol>${data.trace.map(step=>{const label=step.kind==='qloo'?'Qloo request':step.kind==='demo'?'Simulated evidence':'Local computation';const tone=step.kind==='qloo'?'qloo':step.kind==='demo'?'demo':'local';return `<li class="trace-step trace-${tone}"><span class="trace-kind">${label}</span><strong>${escape(step.step)}</strong> — ${escape(step.detail)}${step.requests?.length?`<span class="trace-url">${step.requests.map(request=>escape(request.url+(request.cached?' (cached)':''))).join(' · ')}</span>`:''}</li>`;}).join('')}</ol></details>`;
  // Human votes are distinct from preference predictions; no network request.
  results.querySelectorAll('[data-vote-choice]').forEach(button=>button.addEventListener('click',()=>{
    const id=button.dataset.voteCandidate;
    app.ballots=updateBallot(app.ballots,id,button.dataset.votePerson,button.dataset.voteChoice);
    render(data);
    const ballot=[...results.querySelectorAll('[data-ballot-panel]')].find(panel=>panel.dataset.ballotPanel===id);
    if(ballot)ballot.open=true;
  }));
  // Vetoes only re-rank existing evidence locally: no Qloo quota spent on each click.
  results.querySelectorAll('[data-veto]').forEach(button=>button.addEventListener('click',()=>{
    const vetoes=new Set(app.lastInput.vetoes||[]);
    vetoes.has(button.dataset.veto)?vetoes.delete(button.dataset.veto):vetoes.add(button.dataset.veto);
    app.lastInput.vetoes=[...vetoes];
    render(applyVetoLocally(app.baseResult,app.lastInput.vetoes,app.decisionStyle));
  }));
  $('#reset-veto')?.addEventListener('click',()=>{app.lastInput.vetoes=[];render(applyVetoLocally(app.baseResult,[],app.decisionStyle));});
  results.querySelectorAll('[data-style]').forEach(button=>button.addEventListener('click',()=>{
    app.decisionStyle=button.dataset.style;
    render(applyVetoLocally(app.baseResult,app.lastInput?.vetoes||[],app.decisionStyle));
  }));
  $('#show-all')?.addEventListener('click',()=>{app.showAll=!app.showAll;render(data);});
  $('#copy-plan')?.addEventListener('click',async()=>{
    if(!top)return;
    const text=buildGroupSummary(data)+(groupApproved?'\nGroup vote: Everyone voted Yes for '+groupApproved.name+' (votes recorded in one browser session).':'');
    if(await copyText(text))$('#copy-plan').textContent='Copied ✓';else $('#copy-plan').textContent='Copy unavailable';
  });
}
async function submitPlan(input,{preserveScroll=false}={}){
  if(app.requesting)return;
  const problem=validate(input);if(problem){showError(problem);focusBriefProblem(problem,input);return;}
  showError();app.requesting=true;app.lastInput=input;submitBtn.disabled=true;$('#submit-label').textContent='Finding the overlap…';
  results.setAttribute('aria-busy','true');results.innerHTML='<div class="loader" role="status"><span class="spinner" aria-hidden="true"></span><strong>Looking for common ground</strong><p>Checking preferences, comparing options and finding the fairest supported shortlist…</p></div>';
  try{
    const response=await fetch('/api/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
    let data;try{data=await response.json();}catch{throw new Error('The planner returned an unexpected response. Please try again.');}
    if(!response.ok)throw new Error(data.error||'We could not create this plan.');
    app.ballots={};
    app.baseResult=data;
    render(app.decisionStyle==='balanced'?data:applyVetoLocally(data,[],app.decisionStyle));
    if(!preserveScroll&&window.innerWidth<821)$('#results-heading').scrollIntoView({behavior:'smooth',block:'start'});
  }catch(e){
    showError(e.message);
    results.innerHTML=`<div class="empty"><span class="eyebrow">SOMETHING TO ADJUST</span><h3>Let's try another route.</h3><p>${escape(e.message)}</p><p>Check the city and cultural references, or switch to demo mode to explore how UNISON works.</p></div>`;
  }finally{app.requesting=false;submitBtn.disabled=false;$('#submit-label').textContent=currentDomain()==='places'?'Find our common ground':'Find our movie night';results.setAttribute('aria-busy','false');}
}
form.addEventListener('submit',event=>{event.preventDefault();const input=brief();input.vetoes=[];app.showAll=false;submitPlan(input);});
function applyBrief(raw){
  const input=normalizeBrief(raw);
  const source=starterGroups.find(p=>p.id===raw.id);
  form.querySelector('input[name=domain][value='+input.domain+']').checked=true;
  app.pendingMode=input.mode;
  const requestedMode=input.mode==='live'&&app.configured?'live':'demo';
  form.querySelector('input[name=mode][value='+requestedMode+']').checked=true;
  if(source||app.hashLoaded)app.hasChangedMode=true;
  $('#city').value=input.city;
  $('#budget').value=input.budget;
  people.replaceChildren();
  input.people.forEach(p=>addPerson([p.name,p.favorites.join(', ')],p.selectedEntities||[]));
  app.lastInput=null;app.lastResult=null;app.baseResult=null;app.ballots={};app.showAll=false;
  results.innerHTML='<div class="empty"><span class="eyebrow">READY FOR YOUR GROUP</span><h3>Different tastes, one plan.</h3><p>Review the group brief and select Find our common ground to create a new shortlist.</p></div>';
  showError();updateFormPresentation();
}
document.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>{
  const preset=starterGroups.find(item=>item.id===button.dataset.preset);
  if(!preset)return;
  setActivePreset(preset.id);
  applyBrief({...preset,mode:currentMode()});
  $('#share-message').textContent='Loaded '+preset.label+'. Edit the names and tastes to make it yours.';
  form.scrollIntoView({behavior:'smooth',block:'start'});
}));
$('#share-brief').addEventListener('click',async()=>{
  const message=$('#share-message');
  try{
    const input=normalizeBrief(brief());
    const url=location.origin+location.pathname+'#plan='+encodeShareBrief(input);
    if(!await copyText(url))throw new Error('Clipboard unavailable');
    message.textContent='Group setup link copied. Anyone with the link can see these names and favorites.';
  }catch(e){message.textContent=e.message?.includes('clipboard')?'Clipboard unavailable; try another browser.':'Could not create a link. Check the participant names and favorites.';}
});
try{
  if(location.hash.startsWith('#plan=')){
    app.hashLoaded=true;
    applyBrief({...decodeShareBrief(location.hash),mode:'demo'});
    $('#share-message').textContent='Shared group loaded in demo mode. Review preferences, and choose Live Qloo explicitly if desired.';
    history.replaceState(null,'',location.pathname+location.search);
  }
}catch{
  $('#share-message').textContent='That group link could not be opened. You can still create a new plan.';
}

updateFormPresentation();
fetch('/api/status',{cache:'no-store'}).then(r=>r.json()).then(status=>{
  app.configured=Boolean(status.configured);
  if(app.hashLoaded && app.pendingMode==='live' && app.configured){form.querySelector('input[name=mode][value=live]').checked=true;}
  statusBadge.classList.toggle('live',app.configured);statusBadge.classList.toggle('offline',!app.configured);
  statusBadge.innerHTML=`<span class="status-dot"></span>${app.configured?'Qloo key present · Live available':'Explore in demo mode'}`;
  const live=$('#live-choice input');
  live.disabled=!app.configured;$('#live-choice').classList.toggle('disabled',!app.configured);
  // A key only makes live mode available. Keep demo selected until a person opts in.
  if(!app.configured&&live.checked){form.querySelector('input[name=mode][value=demo]').checked=true;$('#share-message').textContent='Qloo is not configured; this shared group is now in demo mode.';}
  updateFormPresentation();
}).catch(()=>{statusBadge.classList.add('offline');statusBadge.innerHTML='<span class="status-dot"></span>Service unavailable · Demo only';$('#live-choice input').disabled=true;$('#live-choice').classList.add('disabled');updateFormPresentation();});

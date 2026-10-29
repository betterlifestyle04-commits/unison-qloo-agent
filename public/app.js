import {starterGroups,normalizeBrief,encodeShareBrief,decodeShareBrief,applyVetoLocally,decisionStyles,buildGroupSummary,analyzeDecisionTradeoffs} from './planner-state.js';
import {ballotChoices,updateBallot,summarizeBallot,winningAgreement} from './ballot.js';
import {createPlanArchive,loadDevicePlans,saveDevicePlan,removeDevicePlan} from './saved-plans.js';
import {buildCalendarEvent,agendaText} from './calendar.js';
import {auditGroupEvidence,recoverySuggestions} from './evidence-audit.js';
import {buildDecisionReport,reportFilename} from './decision-report.js';
import {agreementPulse} from './consensus.js';
import {eligibleComparisons,compareOptions} from './head-to-head.js';
import {analyzeGroupStability} from './group-stability.js';
import {venueCheckItems,updateVenueCheck,venueCheckProgress} from './venue-readiness.js';
import {planningRecovery} from './recovery.js';
const $=selector=>document.querySelector(selector);
const people=$('#people'),template=$('#person-template'),form=$('#plan-form'),results=$('#results'),error=$('#form-error'),submitBtn=$('#submit-plan'),statusBadge=$('#mode-status');
const starters=[['Maya','Studio Ghibli'],['Jon','Anthony Bourdain'],['Priya','Knives Out']];
const selectedByPerson=new WeakMap();
function showPinned(node){const selections=[...(selectedByPerson.get(node)?.values()||[])];const hint=node.querySelector('[data-pinned]');if(hint)hint.textContent=selections.length?'Selected Qloo entity: '+selections.map(x=>x.name+' ('+String(x.type||'entity').replace(/^urn:entity:/,'')+')').join(', '):'';}
const app={configured:false,requesting:false,lastInput:null,lastResult:null,showAll:false,hasChangedMode:false,baseResult:null,hashLoaded:false,decisionStyle:'balanced',ballots:{},compare:{left:'',right:''},venueChecks:{},lookupBusy:false,agenda:{choiceId:'',date:'',time:'19:00',duration:'120',meeting:'',notes:''}};
const escape=value=>{const element=document.createElement('span');element.textContent=String(value??'');return element.innerHTML.replace(/\"/g,'&quot;').replace(/'/g,'&#39;');};
const number=value=>Number.isFinite(value)?String(Math.round(value)):null;
const initial=value=>String(value||'?').trim().slice(0,1).toUpperCase();
const percent=value=>Math.max(0,Math.min(100,Number(value)||0));
const sourceName=data=>data.mode==='live'?'Real Qloo results':'Fictional demonstration';
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
  selectedByPerson.set(node,new Map((Array.isArray(chosenEntities)?chosenEntities:[]).filter(item=>item&&typeof item.name==='string').map(item=>[item.name.toLowerCase(),item])));
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
// forEach also passes an index; addPerson's second parameter is an entity array, not the index.
starters.forEach(values=>addPerson(values));
$('#add-person').addEventListener('click',()=>{if(people.children.length>=5)return;addPerson();people.lastElementChild.querySelector('[data-field=name]').focus();});
function showError(message=''){error.textContent=message;}
async function copyText(text){
  if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(text);return true;}catch{}}
  const area=document.createElement('textarea');area.value=text;area.setAttribute('readonly','');area.className='clipboard-proxy';document.body.append(area);area.select();
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
  $('#qloo-diagnostics').hidden=!(app.configured&&currentMode()==='live');
  $('#submit-label').textContent=places?'Find our common ground':'Find our movie night';
}
form.querySelectorAll('input[name=domain],input[name=mode]').forEach(input=>input.addEventListener('change',()=>{if(input.name==='mode')app.hasChangedMode=true;updateFormPresentation();}));
const diagnosticBtn=$('#qloo-check');
const diagnosticResults=$('#qloo-check-results');
function showDiagnostic(text){diagnosticResults.replaceChildren(Object.assign(document.createElement('p'),{textContent:text}));}
diagnosticBtn.addEventListener('click',async()=>{
  if(diagnosticBtn.disabled||!app.configured||currentMode()!=='live')return;
  diagnosticBtn.disabled=true;
  showDiagnostic('Checking live Qloo Search, discovery and shortlisted Insights… This sends only a fixed sample title.');
  try{
    const response=await fetch('/api/qloo-diagnostics',{method:'POST',cache:'no-store'});
    const report=await response.json();
    if(!response.ok)throw new Error(report.error||'The diagnostic could not run.');
    const heading=document.createElement('strong');
    heading.textContent=report.ok?'All three live Qloo stages passed for this sample.':'Sample Qloo validation incomplete.';
    const list=document.createElement('ol');
    for(const stage of Array.isArray(report.stages)?report.stages:[]){
      const item=document.createElement('li');
      item.textContent=(stage.status==='passed'?'✓ ':'× ')+stage.step+': '+stage.detail;
      list.append(item);
    }
    const note=document.createElement('p');
    note.textContent=report.note||'This is a sample connection check, not a guarantee that every recommendation works.';
    diagnosticResults.replaceChildren(heading,list,note);
  }catch(error){
    showDiagnostic('Diagnostic unavailable: '+String(error.message||'Unexpected response')+'. Your existing group brief has not changed.');
  }finally{diagnosticBtn.disabled=false;}
});
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
function sameBrief(a,b){if(!a||!b)return false;const extract=x=>JSON.stringify([x.domain,x.mode,x.city,x.budget,x.people]);return extract(a)===extract(b);}
function fitBar(value){return value===null||value===undefined?'<span class="unknown">No signal</span>':`<meter class="fit-meter" min="0" max="100" value="${percent(value)}" aria-label="Relative fit ${number(value)} out of 100">${number(value)}/100</meter><span class="value">${number(value)}</span>`;}
function listPeople(item,data){
  return `<details class="taste"><summary>How each person fits</summary><ul class="taste-list">${data.people.map(person=>{
    const val=item.signals?.[person.id];
    const shown=number(val);
    return `<li><span>${escape(person.name)}</span>${shown===null?'<span class="unknown">No signal</span>':`<meter class="fit-meter tiny-meter" min="0" max="100" value="${percent(val)}" aria-label="${escape(person.name)} relative fit ${shown} out of 100">${shown}/100</meter><b>${shown}/100</b>`}</li>`;
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
    <div class="stat-row"><span class="label">Coverage</span><meter class="fit-meter" min="0" max="100" value="${Math.round((item.coverage||0)*100)}" aria-label="Coverage ${Math.round((item.coverage||0)*100)} percent">${Math.round((item.coverage||0)*100)}%</meter><span class="value">${Math.round((item.coverage||0)*100)}%</span></div>
    ${listPeople(item,data)}
    ${ballotSection(item,data)}
    ${evidenceSection(item,data)}
    ${mapUrl?`<a class="map-link" href="${escape(mapUrl)}" target="_blank" rel="noopener noreferrer">↗ Search for this place on Google Maps</a>`:''}
    <p class="card-explanation">${escape(item.explanation||'')}</p>
    <button class="veto" data-veto="${escape(item.id)}" aria-pressed="${Boolean(item.vetoed)}">${item.vetoed?'↶ Restore option':'× Not for our group'}</button>
  </article>`;
}
function decisionLab(data){
  const lab=analyzeDecisionTradeoffs(data);
  if(!lab.eligible)return '<details class="decision-lab"><summary>Decision Lab · Compare decision rules</summary><p>There are no fully comparable options yet. Every participant needs evidence for a candidate before we compare fairness styles.</p></details>';
  const styles=Object.entries(decisionStyles).map(([key,style])=>{
    const chosen=lab.winners[key];
    return `<div class="lab-style"><span>${escape(style.label)}</span><strong>${escape(chosen.name)}</strong><small>Lowest relative fit: ${escape(chosen.minimum)}/100 · group average: ${escape(chosen.average)}/100</small></div>`;
  }).join('');
  return `<details class="decision-lab">
    <summary>Decision Lab · What changes when fairness matters?</summary>
    <p>Same ${lab.eligible} fully observed candidate(s). Each rule changes only how existing evidence is weighted—no extra Qloo calls.</p>
    <div class="lab-style-grid">${styles}</div>
    <div class="lab-baseline"><span>Pure group-average choice</span><strong>${escape(lab.averageOnly.name)}</strong><small>Average ${lab.averageOnly.average}/100 · lowest relative fit ${lab.averageOnly.minimum}/100</small></div>
    <div class="lab-sensitivity">${lab.stable?'All three UNISON weightings currently pick the same option.':'At least one weighting selects a different option. The result is sensitive to group priorities.'}</div>
    <p class="lab-explanation">${escape(lab.explanation)}</p>
    <small class="lab-disclaimer">Relative-fit scores are UNISON heuristics, not measured enjoyment or probabilities. The average-only baseline is not a popularity score.</small>
  </details>`;
}
function planHandoff(data,choices,groupApproved){
  if(!choices.length)return '';
  const agenda=app.agenda;
  if(!choices.some(item=>item.id===agenda.choiceId))agenda.choiceId=(groupApproved||choices[0]).id;
  const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||'device local time';
  const options=choices.map(item=>`<option value="${escape(item.id)}" ${item.id===agenda.choiceId?'selected':''}>${escape(item.name)}${groupApproved?.id===item.id?' · Group-approved':''}</option>`).join('');
  return `<section class="plan-handoff" aria-labelledby="handoff-heading">
    <div class="handoff-heading"><span class="handoff-mark" aria-hidden="true">↗</span><div><p class="overline">03 / TURN A CHOICE INTO A PLAN</p><h4 id="handoff-heading">Make it happen, together.</h4></div></div>
    <p class="handoff-lead">Choose an option and suggest when to meet. Export a tentative calendar event or copy the details. Nothing is booked, and no invitation is sent automatically.</p>
    <div class="handoff-fields">
      <label class="input-label handoff-choice">Chosen option<select id="agenda-choice">${options}</select></label>
      <label class="input-label">Date<input type="date" id="agenda-date" value="${escape(agenda.date)}"></label>
      <label class="input-label">Start time<input type="time" id="agenda-time" value="${escape(agenda.time)}"></label>
      <label class="input-label">Duration<select id="agenda-duration">${[60,90,120,180,240].map(min=>`<option value="${min}" ${String(min)===agenda.duration?'selected':''}>${min/60} hr${min===60?'':'s'} (${min} min)</option>`).join('')}</select></label>
      <label class="input-label handoff-wide">Meeting place / address (optional)<input id="agenda-meeting" maxlength="160" value="${escape(agenda.meeting)}" placeholder="Specify your agreed meeting point"></label>
      <label class="input-label handoff-wide">Notes (optional)<input id="agenda-notes" maxlength="240" value="${escape(agenda.notes)}" placeholder="What should everyone bring or confirm?"></label>
    </div>
    <p class="handoff-timezone">Time interpreted using your browser timezone: <strong>${escape(timezone)}</strong>. For a different city or timezone, check the calendar entry before sharing.</p>
    <div class="handoff-actions"><button type="button" id="download-calendar">↓ Download tentative calendar event</button><button type="button" id="copy-agenda">Copy meeting details</button></div>
    <p class="handoff-footnote">UNISON does not check venue opening hours or availability, make reservations, or send invitations. Confirm details with everyone before treating this as final.</p>
    <p id="agenda-message" class="handoff-message" role="status" aria-live="polite"></p>
  </section>`;
}
function renderEvidenceAudit(data){
  const audit=auditGroupEvidence(data);
  const coverage=audit.total?Math.round(100*audit.complete/audit.total):0;
  const participants=audit.people.map(person=>`<div class="audit-person">
    <div class="audit-person-label"><span>${escape(person.name)}</span><strong>${person.observed} of ${person.total}</strong></div>
    <meter class="fit-meter" min="0" max="100" value="${person.percent}" aria-label="${escape(person.name)} has evidence for ${person.percent} percent of active candidates">${person.percent}%</meter>
  </div>`).join('');
  const comparison=audit.winner&&audit.alternative?`<div class="audit-comparison">
    <p><strong>Same shortlist · Top two options</strong> The values below are derived relative-fit signals, not satisfaction probabilities.</p>
    <div class="audit-compare-table"><table>
      <thead><tr><th scope="col">Person</th><th scope="col">${escape(audit.winner.name)}</th><th scope="col">${escape(audit.alternative.name)}</th></tr></thead>
      <tbody>${audit.comparison.map(person=>`<tr><th scope="row">${escape(person.name)}</th><td>${person.winnerFit}/100</td><td>${person.alternativeFit}/100</td></tr>`).join('')}</tbody>
    </table></div>
    <small>People can disagree about which option is best; this table makes that trade-off visible.</small>
  </div>`:''; 
  const missing=audit.missingRows.length?`<details class="audit-missing">
    <summary>Inspect missing signals (${audit.missingRows.length} option${audit.missingRows.length===1?'':'s'})</summary>
    <ul>${audit.missingRows.slice(0,8).map(row=>`<li><strong>${escape(row.name)}:</strong> ${escape(row.missing.map(person=>person.name).join(', ')||'No missing names available')}</li>`).join('')}</ul>
    <p>A missing signal means the Qloo comparison did not return evidence for that participant; it must not be counted as a negative reaction.</p>
  </details>`:''; 
  const suggestions=audit.complete===0?recoverySuggestions(data,audit):[];
  return `<section class="evidence-audit" aria-labelledby="audit-heading">
    <div class="audit-head"><div><span class="eyebrow">GROUP EVIDENCE · ${data.mode==='demo'?'SIMULATED':'QLOO-INFORMED'}</span><h4 id="audit-heading">Are we comparing everyone fairly?</h4></div><span class="audit-coverage">${audit.complete}/${audit.total} comparable</span></div>
    <p class="audit-summary">${escape(audit.summary)}</p>
    <div class="audit-overview"><div><strong>${coverage}%</strong><small>Active options with complete group evidence</small></div><div><strong>${audit.people.length}</strong><small>Participants being considered</small></div>${audit.winner?`<div><strong>${Math.round(audit.spread)}</strong><small>Top option's estimated max–min fit gap</small></div>`:''}</div>
    <details class="audit-detail"><summary>Show person-by-person evidence and comparisons</summary>
      <div class="audit-person-grid">${participants}</div>
      ${comparison}
      ${missing}
    </details>
    ${suggestions.length?`<div class="audit-recovery"><strong>How to get a clearer answer</strong><ul>${suggestions.map(suggestion=>`<li>${escape(suggestion)}</li>`).join('')}</ul><button type="button" id="edit-after-audit">Review your group brief ↑</button></div>`:''}
  </section>`;
}
function renderAgreementPulse(data){
  const pulse=agreementPulse(data,app.ballots);
  if(!pulse.top){
    return '<section class="agreement-pulse"><p class="overline">HUMAN AGREEMENT / NEXT STEP</p><h4>We need an eligible choice first.</h4><p>'+escape(pulse.nextAction)+'</p></section>';
  }
  const top=pulse.top;
  const fill=top.total?Math.round(top.voted/top.total*100):0;
  const approved=pulse.unanimous.length>0;
  return `<section class="agreement-pulse" aria-label="Current human vote progress">
    <div class="agreement-head"><div><p class="overline">HUMAN AGREEMENT / NEXT STEP</p><h4>${approved?'A group-approved choice!':'See what everyone thinks.'}</h4></div><span class="agreement-count">${top.voted} / ${top.total} responses</span></div>
    <p class="agreement-message">${escape(pulse.message)}</p>
    <div class="agreement-meter-row"><meter class="fit-meter" min="0" max="100" value="${fill}" aria-label="${fill} percent of participants have voted on the leading option">${fill}%</meter><strong>${fill}%</strong></div>
    <div class="agreement-totals"><span>✓ Yes: ${top.yes}</span><span>~ Maybe: ${top.maybe}</span><span>× No: ${top.no}</span></div>
    <p class="agreement-next">${escape(pulse.nextAction)}</p>
    ${pulse.unanimous.length?`<p class="agreement-winner">Unanimous approval recorded for: <strong>${escape(pulse.unanimous.map(item=>item.name).join(', '))}</strong></p>`:''}
    <button type="button" id="open-top-ballot">Open participant voting ↓</button>
    <p class="agreement-privacy">Only the people using this browser can record votes here. Voting doesn't change Qloo results or automatically make a booking.</p>
  </section>`;
}
function renderGroupStability(data){
  const report=analyzeGroupStability(data,app.decisionStyle);
  if(!report.comparable)return `<details class="group-stability">
    <summary>Decision Stability · Does everyone affect the choice?</summary>
    <p>${escape(report.reason)}</p>
  </details>`;
  const rows=report.trials.map(trial=>`<tr>
    <th scope="row">${escape(trial.personName)}</th>
    <td>${escape(trial.winnerName)}</td>
    <td>${trial.changesWinner?'Different leader':'Same leader'}</td>
  </tr>`).join('');
  return `<details class="group-stability" aria-label="Hypothetical decision sensitivity">
    <summary>Decision Stability · Is the shared match sensitive to one voice?</summary>
    <p class="stability-intro">A transparent stress test using ${report.eligible} fully supported candidates and the current <strong>${escape(decisionStyles[report.style].label)}</strong> weighting. Everyone remains included in the real result.</p>
    <div class="stability-overview">
      <div><strong>${report.changes} / ${report.trials.length}</strong><span>Hypothetical comparisons that change the leading option</span></div>
      <div><strong>${escape(report.winner.name)}</strong><span>Leader with all participants included</span></div>
    </div>
    <div class="stability-table"><table>
      <thead><tr><th scope="col">Hypothetically omit</th><th scope="col">Alternative leader</th><th scope="col">Outcome</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <p class="stability-summary">${escape(report.explanation)}</p>
    <small>This is not a vote, an instruction to remove people, a happiness prediction or another Qloo query. Every scenario reuses exactly the same observed candidate signals.</small>
  </details>`;
}
function renderHeadToHead(data){
  const choices=eligibleComparisons(data);
  if(choices.length<2)return '<section class="head-to-head"><p class="overline">EXPLORE THE TRADE-OFFS</p><h4>Head-to-Head</h4><p>At least two fully supported, non-vetoed options are needed before you can compare them fairly.</p></section>';
  const validIds=new Set(choices.map(item=>item.id));
  if(!validIds.has(app.compare.left))app.compare.left=choices[0].id;
  if(!validIds.has(app.compare.right)||app.compare.right===app.compare.left)app.compare.right=choices.find(item=>item.id!==app.compare.left).id;
  const analysis=compareOptions(data,app.compare.left,app.compare.right);
  const optionList=selected=>choices.map(choice=>`<option value="${escape(choice.id)}" ${selected===choice.id?'selected':''}>${escape(choice.name)}</option>`).join('');
  const people=analysis.people.map(person=>`<tr><th scope="row">${escape(person.name)}</th><td>${person.left}/100</td><td>${person.right}/100</td><td>${person.preference==='tie'?'Equal':person.preference==='left'?'Prefers A':'Prefers B'}</td></tr>`).join('');
  return `<section class="head-to-head" aria-labelledby="comparison-heading">
    <p class="overline">A BETTER GROUP DECISION</p><h4 id="comparison-heading">Head-to-Head</h4>
    <p>Compare any two fully supported options against the same group's available relative-fit evidence.</p>
    <div class="head-to-head-picker">
      <label class="input-label">Option A<select id="compare-left">${optionList(app.compare.left)}</select></label>
      <span aria-hidden="true">vs</span>
      <label class="input-label">Option B<select id="compare-right">${optionList(app.compare.right)}</select></label>
    </div>
    <div class="comparison-scoreboard"><div><strong>${analysis.leftWins}</strong><small>People favor A</small></div><div><strong>${analysis.ties}</strong><small>Same fit</small></div><div><strong>${analysis.rightWins}</strong><small>People favor B</small></div></div>
    <div class="head-to-head-table"><table><thead><tr><th scope="col">Participant</th><th scope="col">${escape(analysis.left.name)}</th><th scope="col">${escape(analysis.right.name)}</th><th scope="col">Comparison</th></tr></thead><tbody>${people}</tbody></table></div>
    <p class="comparison-comment">${escape(analysis.explanation)}</p>
    <small>${escape(analysis.source)}. These are heuristic relative-fit estimates, not actual human votes. Changing the comparison never calls Qloo.</small>
  </section>`;
}
function integrityReview(data){
  if(data.mode!=='live'||!data.quality?.evaluation)return '';
  const discovery=data.quality.discovery||{};
  const evaluation=data.quality.evaluation;
  const ignored=(evaluation.outsideShortlist||0)+(evaluation.wrongType||0)+(evaluation.duplicates||0)+(evaluation.invalid||0);
  return `<details class="integrity-review">
    <summary><span aria-hidden="true">◇</span> Qloo response integrity · <strong>${evaluation.accepted} accepted person-option signals</strong></summary>
    <p>UNISON checked returned candidate IDs against the shortlist requested from Qloo. Results outside that set, with an explicitly incorrect category, or repeated IDs are excluded before ranking.</p>
    <div class="integrity-metrics">
      <span><strong>${data.quality.shortlistSize}</strong> shortlist options</span>
      <span><strong>${evaluation.accepted}</strong> accepted signals</span>
      <span><strong>${ignored}</strong> excluded entries</span>
    </div>
    <p>Discovery screening: ${discovery.accepted||0} accepted candidates. Evaluation exclusions: ${evaluation.outsideShortlist||0} outside shortlist, ${evaluation.wrongType||0} wrong category, ${evaluation.duplicates||0} duplicates, ${evaluation.invalid||0} invalid records. ${evaluation.missingType||0} signals lacked explicit entity-type metadata.</p>
    <small>This validates response membership only. It does not independently verify a venue's address, opening hours, price or bookability, and the per-person fit remains a relative UNISON heuristic.</small>
  </details>`;
}
function renderVenueReadiness(data,choices){
  if(data.domain!=='places'||!choices.length)return '';
  const selected=choices.find(item=>item.id===app.agenda.choiceId)||choices[0];
  const progress=venueCheckProgress(app.venueChecks,selected.id);
  const example=data.mode==='demo';
  return `<section class="venue-readiness" aria-labelledby="venue-readiness-heading">
    <div class="venue-readiness-head"><div><span class="overline">BEFORE YOUR GROUP GOES</span><h4 id="venue-readiness-heading">Venue Reality Check</h4></div><span class="venue-readiness-count" id="venue-readiness-count">${progress.marked} / ${progress.total} reviewed</span></div>
    <p class="venue-readiness-intro">For <strong>${escape(selected.name)}</strong>: ${example?'This is a fictional demo venue.':'This is a real Qloo candidate, but venue details have not been independently verified.'} Mark what <em>your group</em> has checked before sharing a final plan.</p>
    <div class="venue-readiness-items">
      ${venueCheckItems.map(item=>`<label class="venue-readiness-item"><input type="checkbox" data-readiness-key="${item.id}" data-readiness-candidate="${escape(selected.id)}" ${app.venueChecks[selected.id]?.[item.id]?'checked':''}><span><strong>${escape(item.label)}</strong><small>${escape(item.hint)}</small></span></label>`).join('')}
    </div>
    <div class="venue-readiness-progress"><meter class="fit-meter" min="0" max="100" value="${progress.percent}" aria-label="Venue reality checklist ${progress.percent} percent marked reviewed" id="venue-readiness-meter">${progress.percent}%</meter><p id="venue-readiness-message" role="status" aria-live="polite">${escape(progress.label)}</p></div>
    <small>Checklist marks stay in this page only. They are self-reported, do not change Qloo ranking, do not verify venue facts, and do not make or confirm bookings. Changing options displays that option's separate checklist.</small>
  </section>`;
}
function render(data){
  app.lastResult=data;
  const approved=data.ranked.filter(item=>item.sufficient&&!item.vetoed);
  const top=approved[0],count=approved.length;
  const groupApproved=winningAgreement(data,app.ballots);
  const leastMatched=top?data.people.find(p=>top.signals?.[p.id]===top.minimum):null;
  const show=data.ranked.slice(0,app.showAll?data.ranked.length:6);
  const status=data.mode==='live'?'Qloo API · Live evidence':'Demo · Simulated evidence';
  results.innerHTML=`<div class="result-topline"><div><p class="overline">${escape(status)}</p><h3>${top?'Your best shared match':'We need a little more evidence'}</h3><p class="result-sub">${escape(data.domain==='places'?(data.city?'Planning for '+data.city:'No city selected'):'Movie night')} · ${data.people.length} people · ${count} fully covered option${count===1?'':'s'}</p></div><div class="result-actions"><button id="download-report" class="text-button" type="button">↓ Decision report</button><button id="save-plan" class="text-button" type="button">Save on this device</button><button id="copy-plan" class="text-button" type="button" ${top?'':'disabled'}>Copy plan ↗</button><button id="reset-veto" class="text-button" type="button">Clear vetoes</button></div></div>
    <div class="source-banner ${data.mode==='live'?'live':''}"><strong>${escape(sourceName(data))}.</strong> ${escape(data.disclaimer)}</div>
    ${integrityReview(data)}
    <p class="report-privacy"><span aria-hidden="true">◈</span> The Decision Report downloads to your device and includes group names, cultural favorites, and any votes recorded here. Share it thoughtfully.</p>
    <p id="report-message" class="report-message" role="status" aria-live="polite"></p>
    <section class="decision-tuning" aria-label="How should we balance the group's preferences?">
      <div class="decision-tuning-head"><strong>How should we choose?</strong><span>Adjusts ranking only · no new Qloo requests</span></div>
      <div class="decision-styles">${Object.entries(decisionStyles).map(([key,style])=>`<button type="button" data-style="${key}" aria-pressed="${app.decisionStyle===key}">${escape(style.label)}</button>`).join('')}</div>
      <p>${escape(decisionStyles[app.decisionStyle].description)} These weights are UNISON heuristics, not measurements of happiness.</p>
    </section>
    ${decisionLab(data)}
    ${renderGroupStability(data)}
    ${renderHeadToHead(data)}
    ${renderEvidenceAudit(data)}
    ${renderAgreementPulse(data)}
    <div class="voting-intro"><strong>New · Agree together</strong><span>Each person can vote Yes, Maybe or No on any candidate. Votes stay on this device, separate from Qloo predictions.</span></div>
    ${groupApproved?`<div class="approved-choice" role="status">✓ Group agreement recorded: <strong>${escape(groupApproved.name)}</strong>. Everyone voted Yes.</div>`:''}
    ${data.needsMoreEvidence?`<div class="notice" role="status">${escape(data.nextAction||'Evidence is incomplete. Add another preference.')}</div>`:''}
    ${top?`<article class="winner"><div class="winner-inner"><p class="eyebrow">✳ THE BEST CURRENT COMPROMISE</p><h3>${escape(top.name)}</h3><div class="winner-meta"><span>${escape(data.domain==='movies'?'Movie recommendation':'Place recommendation')}</span><span>${escape(data.mode==='live'?'Qloo candidates':'Fictional demo candidates')}</span>${data.city&&data.domain==='places'?'<span>'+escape(data.city)+'</span>':''}</div><p>${escape(top.note||top.address||'Recommended based on the available cross-person taste signals.')}</p><div class="winner-stats"><div><strong>${escape(top.score)}</strong><small>UNISON relative score / 100</small></div><div><strong>${number(top.minimum)}</strong><small>Lowest relative fit</small></div><div><strong>${Math.round(top.coverage*100)}%</strong><small>Signal coverage</small></div></div></div></article>`:''}
    ${top?`<div class="compromise-context"><span class="context-icon">◎</span><span><strong>What makes this a compromise?</strong><small>${escape(leastMatched?leastMatched.name+' has the lowest relative fit at '+number(top.minimum)+'/100. UNISON considers this alongside the group average when ranking options.':'UNISON compares each participant using relative-fit evidence.')}</small></span></div>`:''}
    ${planHandoff(data,approved,groupApproved)}
    ${renderVenueReadiness(data,approved)}
    <div class="cards-heading"><h4>Explore the shortlist</h4><small>${data.ranked.length} candidate${data.ranked.length===1?'':'s'}</small></div>
    <div class="cards">${show.map((item,i)=>card(item,i,data)).join('')}</div>
    ${data.ranked.length>6?`<button id="show-all" class="add-person" type="button">${app.showAll?'Show fewer options':'Show all '+data.ranked.length+' options'} <span aria-hidden="true">↓</span></button>`:''}
    <details class="trace"><summary>How UNISON reached this decision · ${data.trace.length} steps</summary><ol>${data.trace.map(step=>{const label=step.kind==='qloo'?'Qloo request':step.kind==='demo'?'Simulated evidence':'Local computation';const tone=step.kind==='qloo'?'qloo':step.kind==='demo'?'demo':'local';return `<li class="trace-step trace-${tone}"><span class="trace-kind">${label}</span><strong>${escape(step.step)}</strong> — ${escape(step.detail)}${step.requests?.length?`<span class="trace-url">${step.requests.map(request=>escape(request.url+(request.cached?' (cached)':''))).join(' · ')}</span>`:''}</li>`;}).join('')}</ol></details>`;
  const agendaFields={choiceId:'#agenda-choice',date:'#agenda-date',time:'#agenda-time',duration:'#agenda-duration',meeting:'#agenda-meeting',notes:'#agenda-notes'};
  for(const [key,selector] of Object.entries(agendaFields)){
    results.querySelector(selector)?.addEventListener('change',event=>{app.agenda[key]=event.target.value;if(key==='choiceId'&&data.domain==='places')render(data);});
    if(key==='meeting'||key==='notes')results.querySelector(selector)?.addEventListener('input',event=>{app.agenda[key]=event.target.value;});
  }
  results.querySelectorAll('[data-readiness-key]').forEach(box=>box.addEventListener('change',event=>{
    const candidate=event.target.dataset.readinessCandidate,key=event.target.dataset.readinessKey;
    app.venueChecks=updateVenueCheck(app.venueChecks,candidate,key,event.target.checked);
    const progress=venueCheckProgress(app.venueChecks,candidate);
    const count=results.querySelector('#venue-readiness-count'),meter=results.querySelector('#venue-readiness-meter'),message=results.querySelector('#venue-readiness-message');
    if(count)count.textContent=progress.marked+' / '+progress.total+' reviewed';
    if(meter){meter.value=progress.percent;meter.setAttribute('aria-label','Venue reality checklist '+progress.percent+' percent marked reviewed');}
    if(message)message.textContent=progress.label;
  }));
  const agendaDetails=()=>{
    const chosen=approved.find(item=>item.id===app.agenda.choiceId);
    if(!chosen)throw new Error('Choose an available option before scheduling.');
    const title=(data.mode==='demo'?'[Fictional demo] ':'')+chosen.name;
    const meeting=app.agenda.meeting.trim()||(data.mode==='live'&&data.domain==='places'?[chosen.name,chosen.address||data.city].filter(Boolean).join(', '):'');
    const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||'device local time';
    if(!app.agenda.date||!app.agenda.time)throw new Error('Choose a calendar date and starting time.');
    return {title,date:app.agenda.date,startTime:app.agenda.time,durationMinutes:Number(app.agenda.duration),location:meeting,notes:app.agenda.notes.trim(),timezone};
  };
  results.querySelector('#download-calendar')?.addEventListener('click',()=>{
    const message=results.querySelector('#agenda-message');
    try{
      const details=agendaDetails();
      const uid='unison-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
      const calendar=buildCalendarEvent({...details,uid});
      const blob=new Blob([calendar],{type:'text/calendar;charset=utf-8'});
      const link=document.createElement('a'),url=URL.createObjectURL(blob);
      link.href=url;link.download='unison-group-plan.ics';document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
      message.textContent='Tentative event downloaded. Open it in your calendar, check the timezone, and confirm the details with the group.';
    }catch(e){message.textContent=e.message||'Calendar export is unavailable.';}
  });
  results.querySelector('#copy-agenda')?.addEventListener('click',async()=>{
    const message=results.querySelector('#agenda-message');
    try{const details=agendaDetails();message.textContent=await copyText(agendaText({...details,note:details.notes}))?'Meeting details copied. No invitation was sent.':'Clipboard unavailable in this browser.';}
    catch(e){message.textContent=e.message||'Could not copy meeting details.';}
  });
  results.querySelector('#edit-after-audit')?.addEventListener('click',()=>{
    form.scrollIntoView({behavior:'smooth',block:'start'});
    const first=people.querySelector('[data-field=favorite]');if(first)first.focus({preventScroll:true});
  });
  results.querySelector('#open-top-ballot')?.addEventListener('click',()=>{
    const target=agreementPulse(data,app.ballots).top;
    if(!target)return;
    let panel=[...results.querySelectorAll('[data-ballot-panel]')].find(node=>node.dataset.ballotPanel===target.id);
    if(!panel&&!app.showAll){app.showAll=true;render(data);panel=[...results.querySelectorAll('[data-ballot-panel]')].find(node=>node.dataset.ballotPanel===target.id);}
    if(panel){panel.open=true;panel.scrollIntoView({behavior:'smooth',block:'center'});}
  });
  for(const [selector,key] of [['#compare-left','left'],['#compare-right','right']]){
    results.querySelector(selector)?.addEventListener('change',event=>{
      app.compare[key]=event.target.value;
      if(app.compare.left===app.compare.right){
        const options=eligibleComparisons(data);
        const other=options.find(item=>item.id!==event.target.value);
        app.compare[key==='left'?'right':'left']=other?.id||'';
      }
      render(data);
    });
  }
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
  $('#download-report')?.addEventListener('click',()=>{
    const message=results.querySelector('#report-message');
    try{
      const markdown=buildDecisionReport(data,{ballots:app.ballots,decisionStyle:app.decisionStyle,brief:app.lastInput});
      const blob=new Blob([markdown],{type:'text/markdown;charset=utf-8'});
      const url=URL.createObjectURL(blob);
      const link=document.createElement('a');
      link.href=url;link.download=reportFilename(data.mode);document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
      message.textContent='Report downloaded locally. It includes group preferences and votes; review before forwarding.';
    }catch(e){message.textContent='Could not export report: '+String(e.message||'Unknown error');}
  });
  $('#save-plan')?.addEventListener('click',()=>{
    try{
      if(!app.lastInput)throw new Error('Create a plan before saving.');
      const id=typeof globalThis.crypto?.randomUUID==='function'?globalThis.crypto.randomUUID():'unison-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
      const entry=createPlanArchive(app.lastInput,data,{id});
      if(!entry)throw new Error('Could not prepare this plan for saving.');
      const saved=saveDevicePlan(window.localStorage,entry);
      paintDeviceLibrary(saved);
      $('#save-plan').textContent='Saved ✓';
      $('#library-message').textContent='Saved on this browser only. No account or Qloo call needed.';
    }catch(e){$('#library-message').textContent='Saving was unavailable: '+String(e.message||'Browser storage blocked');$('#save-plan').textContent='Storage unavailable';}
  });
  $('#copy-plan')?.addEventListener('click',async()=>{
    if(!top)return;
    const text=buildGroupSummary(data)+(groupApproved?'\nGroup vote: Everyone voted Yes for '+groupApproved.name+' (votes recorded in one browser session).':'');
    if(await copyText(text))$('#copy-plan').textContent='Copied ✓';else $('#copy-plan').textContent='Copy unavailable';
  });
}
function paintDeviceLibrary(items=loadDevicePlans(window.localStorage)){
  const shelf=$('#device-plans');
  shelf.innerHTML=items.length?items.map(item=>{
    const date=new Date(item.savedAt).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
    return `<div class="device-item">
      <div><strong>${escape(item.title)}</strong><small>${escape(item.winner)} · ${escape(date)} · ${item.mode==='live'?'Saved from Qloo live results':'Saved from fictional demo'}</small></div>
      <div class="device-item-actions"><button type="button" data-open-device="${escape(item.id)}">Open brief</button><button type="button" data-copy-device="${escape(item.id)}">Copy summary</button><button type="button" data-delete-device="${escape(item.id)}">Delete</button></div>
    </div>`;
  }).join(''):'<p class="device-empty">No saved plans yet. Generate a plan, then select “Save on this device.”</p>';
  shelf.querySelectorAll('[data-open-device]').forEach(button=>button.addEventListener('click',()=>{
    const entry=loadDevicePlans(window.localStorage).find(item=>item.id===button.dataset.openDevice);
    if(!entry)return;
    applyBrief({...entry.brief,mode:'demo'});
    $('#library-message').textContent='Restored your group brief in demo mode. Review it and select Live manually if needed; no automatic Qloo calls were made.';
    $('#plan-form').scrollIntoView({behavior:'smooth',block:'start'});
  }));
  shelf.querySelectorAll('[data-copy-device]').forEach(button=>button.addEventListener('click',async()=>{
    const entry=loadDevicePlans(window.localStorage).find(item=>item.id===button.dataset.copyDevice);
    if(entry)$('#library-message').textContent=await copyText(entry.summary)?'Saved plan summary copied.':'Clipboard is unavailable in this browser.';
  }));
  shelf.querySelectorAll('[data-delete-device]').forEach(button=>button.addEventListener('click',()=>{
    const saved=removeDevicePlan(window.localStorage,button.dataset.deleteDevice);
    paintDeviceLibrary(saved);
    $('#library-message').textContent='Saved plan deleted from this browser.';
  }));
}
try{paintDeviceLibrary();}catch{$('#device-plans').textContent='Browser storage is unavailable. You can still plan without saving.';}

async function submitPlan(input,{preserveScroll=false}={}){
  if(app.requesting)return;
  const problem=validate(input);if(problem){showError(problem);form.querySelector('#city')?.focus();return;}
  showError();app.requesting=true;app.lastInput=input;submitBtn.disabled=true;$('#submit-label').textContent='Finding the overlap…';
  results.setAttribute('aria-busy','true');results.innerHTML='<div class="loader" role="status"><span class="spinner" aria-hidden="true"></span><strong>Looking for common ground</strong><p>Checking preferences, comparing options and finding the fairest supported shortlist…</p></div>';
  try{
    const response=await fetch('/api/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
    let data;try{data=await response.json();}catch{throw new Error('The planner returned an unexpected response. Please try again.');}
    if(!response.ok){const failure=new Error(data.error||'We could not create this plan.');failure.status=response.status;throw failure;}
    app.ballots={};
    app.compare={left:'',right:''};
    app.venueChecks={};
    app.agenda={choiceId:'',date:'',time:'19:00',duration:'120',meeting:'',notes:''};
    app.baseResult=data;
    render(app.decisionStyle==='balanced'?data:applyVetoLocally(data,[],app.decisionStyle));
    if(!preserveScroll&&window.innerWidth<821)$('#results-heading').scrollIntoView({behavior:'smooth',block:'start'});
  }catch(e){
    showError(e.message);
    const help=planningRecovery(e.status||0,e.message,{mode:input.mode,domain:input.domain});
    results.innerHTML=`<section class="plan-recovery" aria-labelledby="recovery-title">
      <span class="eyebrow">YOUR BRIEF IS SAFE · NO FALLBACK DATA USED</span>
      <h3 id="recovery-title">${escape(help.title)}</h3>
      <p>${escape(help.detail)}</p>
      <details><summary>Technical error details</summary><p>${escape(e.message||'Request failed')} ${e.status?'(HTTP '+escape(e.status)+')':''}</p></details>
      <h4>Suggested next steps</h4>
      <ul>${help.suggestions.map(item=>`<li>${escape(item)}</li>`).join('')}</ul>
      <div class="recovery-actions">
        <button type="button" id="recovery-edit">Review group brief</button>
        ${help.showDemo?'<button type="button" id="recovery-demo">Switch to fictional demo mode</button>':''}
      </div><p class="recovery-explainer">Changing modes does not automatically submit any Qloo request. Live and demo results are never mixed.</p>
    </section>`;
    results.querySelector('#recovery-edit')?.addEventListener('click',()=>{
      form.scrollIntoView({behavior:'smooth',block:'start'});
      const field=e.status===422&&/city/i.test(e.message)?$('#city'):people.querySelector('[data-field=favorite]');
      field?.focus({preventScroll:true});
    });
    results.querySelector('#recovery-demo')?.addEventListener('click',()=>{
      form.querySelector('input[name=mode][value=demo]').checked=true;
      app.hasChangedMode=true;
      updateFormPresentation();
      showError();
      results.querySelector('.recovery-explainer').textContent='Demo mode selected. Submit your group brief to generate clearly labeled fictional recommendations, with no Qloo requests.';
    });
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
  app.lastInput=null;app.lastResult=null;app.baseResult=null;app.ballots={};app.compare={left:'',right:''};app.venueChecks={};app.agenda={choiceId:'',date:'',time:'19:00',duration:'120',meeting:'',notes:''};app.showAll=false;
  results.innerHTML='<div class="empty"><span class="eyebrow">READY FOR YOUR GROUP</span><h3>Different tastes, one plan.</h3><p>Review the group brief and select Find our common ground to create a new shortlist.</p></div>';
  showError();updateFormPresentation();
}
document.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>{
  const preset=starterGroups.find(item=>item.id===button.dataset.preset);
  if(!preset)return;
  applyBrief({...preset,mode:currentMode()});
  $('#share-message').textContent='Loaded '+preset.label+'. Edit the names and tastes to make it yours.';
  form.scrollIntoView({behavior:'smooth',block:'start'});
}));
$('#instant-demo').addEventListener('click',()=>{
  if(app.requesting)return;
  const demo=starterGroups.find(item=>item.id==='friends')||starterGroups[0];
  applyBrief({...demo,mode:'demo'});
  form.querySelector('input[name=mode][value=demo]').checked=true;
  app.hasChangedMode=true;
  updateFormPresentation();
  const request=brief();
  request.mode='demo';request.vetoes=[];app.showAll=false;
  submitPlan(request);
});
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
  // Shared links always open in demo mode. Only a direct click can opt into live Qloo.
  statusBadge.classList.toggle('live',app.configured);statusBadge.classList.toggle('offline',!app.configured);
  statusBadge.innerHTML=`<span class="status-dot"></span>${app.configured?'Qloo key present · Live available':'Explore in demo mode'}`;
  const live=$('#live-choice input');
  live.disabled=!app.configured;$('#live-choice').classList.toggle('disabled',!app.configured);
  // A key only makes live mode available. Keep demo selected until a person opts in.
  if(!app.configured&&live.checked){form.querySelector('input[name=mode][value=demo]').checked=true;$('#share-message').textContent='Qloo is not configured; this shared group is now in demo mode.';}
  updateFormPresentation();
}).catch(()=>{statusBadge.classList.add('offline');statusBadge.innerHTML='<span class="status-dot"></span>Service unavailable · Demo only';$('#live-choice input').disabled=true;$('#live-choice').classList.add('disabled');updateFormPresentation();});

import {loadDevicePlans,removeDevicePlan,createDeviceBackup,importDeviceBackup,MAX_BACKUP_CHARACTERS} from './saved-plans.js';
import {archiveInsights,filterArchive} from './workspace-insights.js';

const $=selector=>document.querySelector(selector);
const create=(tag,className,text)=>{
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=String(text);
  return node;
};
const message=text=>{$('#ws-message').textContent=text;};
function saved(){
  try{return loadDevicePlans(window.localStorage);}
  catch{message('Browser storage is unavailable. You can still create new plans.');return [];}
}
function dated(value){
  try{return new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric'}).format(new Date(value));}
  catch{return 'Saved previously';}
}
function chartRow(label,count,total){
  const row=create('div','insight-row');
  const heading=create('div','insight-row-label');
  heading.append(create('span','',label),create('strong','',count));
  const meter=document.createElement('meter');
  meter.min=0;meter.max=Math.max(total,1);meter.value=count;meter.textContent=count+' of '+total;
  meter.setAttribute('aria-label',label+': '+count+' of '+total+' saved plans');
  row.append(heading,meter);
  return row;
}
function paintChart(selector,items,total){
  const root=$(selector);
  root.replaceChildren();
  if(!total){root.append(create('p','insight-empty','Save a plan to see real counts here.'));return;}
  if(!items.length){root.append(create('p','insight-empty','No matching entries in your saved plans.'));return;}
  root.append(...items.map(item=>chartRow(item.label,item.count,total)));
}
async function copySummary(text){
  try{
    if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return true;}
    const area=create('textarea');area.value=text;area.setAttribute('readonly','');
    area.style.position='fixed';area.style.left='-9999px';document.body.append(area);area.select();
    const success=document.execCommand('copy');area.remove();return success;
  }catch{return false;}
}
function action(label,actionName,id,style=''){
  const button=create('button','plan-action '+style,label);
  button.type='button';button.dataset.action=actionName;button.dataset.id=id;
  return button;
}
function makeCard(plan){
  const article=create('article','ws-plan-card');
  const heading=create('div','ws-card-head');
  const icon=create('span','ws-card-icon',plan.brief.domain==='movies'?'▣':'⌁');icon.setAttribute('aria-hidden','true');
  const text=create('div','ws-card-text');
  const badges=create('div','ws-card-badges');
  badges.append(
    create('span','ws-type',plan.brief.domain==='movies'?'Movie night':'Group outing'),
    create('span','ws-source '+(plan.brief.mode==='live'?'ws-source-live':'ws-source-demo'),plan.brief.mode==='live'?'Qloo-sourced result':'Fictional demo')
  );
  text.append(badges,create('h3','',plan.title),create('p','ws-plan-date','Saved '+dated(plan.savedAt)));
  heading.append(icon,text);
  const decision=create('div','ws-card-decision');
  decision.append(create('span','ws-card-kicker','SAVED DECISION'),create('strong','',plan.winner));
  const people=plan.brief.people.map(person=>person.name);
  const context=create('p','ws-card-context',
    people.length+' participants · '+(plan.brief.domain==='movies'?'Movie night':plan.brief.city||'City not specified'));
  const participants=create('div','ws-card-participants');
  const avatars=create('div','ws-card-avatars');
  people.slice(0,4).forEach(person=>{
    const avatar=create('span','',Array.from(person.trim())[0]?.toLocaleUpperCase()||'?');
    avatar.setAttribute('aria-hidden','true');avatars.append(avatar);
  });
  const names=create('span','',people.join(', '));
  participants.append(avatars,names);
  const actions=create('div','ws-card-actions');
  actions.append(
    action('Open brief ↗','open',plan.id,'primary'),
    action('Copy summary','copy',plan.id),
    action('Delete','delete',plan.id,'danger')
  );
  article.append(heading,decision,context,participants,actions);
  return article;
}
function render(){
  const plans=saved();
  const stats=archiveInsights(plans);
  $('#ws-total').textContent=String(stats.count);
  $('#ws-people').textContent=String(stats.participantSlots);
  $('#ws-live').textContent=String(stats.modes.live);
  $('#ws-average').textContent=stats.count?String(stats.averageGroupSize):'—';
  $('#ws-export').disabled=!stats.count;
  const options={query:$('#ws-search').value,domain:$('#ws-domain').value,mode:$('#ws-mode').value,sort:$('#ws-sort').value};
  const visible=filterArchive(plans,options);
  $('#ws-showing').textContent=visible.length+' of '+stats.count+' saved';
  const root=$('#ws-plan-list');
  root.replaceChildren();
  if(visible.length){root.append(...visible.map(makeCard));}
  else{
    const empty=create('div','ws-empty');
    empty.append(create('div','ws-empty-symbol','✳'),
      create('h3','',stats.count?'No matching plans':'Make room for more good decisions'),
      create('p','',stats.count?'Try a different search, type, or source filter.':'Your saved plan history starts when you explicitly save a group decision.'));
    const link=create('a','',stats.count?'Clear filters ↗':'Create your first plan ↗');
    link.href=stats.count?'#workspace-history':'/#planner';
    if(stats.count)link.addEventListener('click',event=>{
      event.preventDefault();
      $('#ws-search').value='';$('#ws-domain').value='all';$('#ws-mode').value='all';$('#ws-sort').value='newest';render();
    });
    empty.append(link);root.append(empty);
  }
  paintChart('#ws-types',[
    {label:'Outings',count:stats.domains.places},
    {label:'Movie nights',count:stats.domains.movies}
  ],stats.count);
  paintChart('#ws-sources',[
    {label:'Live Qloo saved results',count:stats.modes.live},
    {label:'Fictional demos',count:stats.modes.demo}
  ],stats.count);
  paintChart('#ws-cities',stats.cities,stats.count);
  paintChart('#ws-references',stats.references,stats.count);
}
for(const selector of ['#ws-search','#ws-domain','#ws-mode','#ws-sort']){
  $(selector).addEventListener(selector==='#ws-search'?'input':'change',render);
}
$('#ws-plan-list').addEventListener('click',async event=>{
  const button=event.target.closest('button[data-action]');
  if(!button)return;
  const plan=saved().find(entry=>entry.id===button.dataset.id);
  if(!plan)return;
  if(button.dataset.action==='open'){
    try{
      // Same-tab, session-only transfer. Unlike share links, no personal
      // names, favorites, or Qloo IDs are exposed in the URL.
      window.sessionStorage.setItem('unison.pending-brief.v1',JSON.stringify({...plan.brief,mode:'demo'}));
      window.location.assign('/#planner');
    }catch{message('This browser cannot transfer the brief. Try another session or export a backup.');}
  }else if(button.dataset.action==='copy'){
    message(await copySummary(plan.summary)?'Saved summary copied to your clipboard. Review names and favorites before sharing.':'Copy is unavailable in this browser.');
  }else if(button.dataset.action==='delete'){
    if(!window.confirm('Delete this plan from this browser? You cannot undo this unless you exported a backup.'))return;
    try{
      removeDevicePlan(window.localStorage,plan.id);render();
      message('Plan deleted from this browser.');
    }catch{message('Could not delete the plan. Browser storage may be blocked.');}
  }
});
$('#ws-export').addEventListener('click',()=>{
  try{
    const json=createDeviceBackup(window.localStorage);
    const blob=new Blob([json],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const link=create('a');link.href=url;link.download='unison-private-plan-backup.json';
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    message('Backup saved as plain JSON. It contains names, favorites and decision summaries; keep the file private.');
  }catch(e){message('Could not export: '+String(e.message||'Storage unavailable'));}
});
$('#ws-import').addEventListener('click',()=>$('#ws-import-file').click());
$('#ws-import-file').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{
    if(file.size>MAX_BACKUP_CHARACTERS*4)throw new Error('Select a backup smaller than 100 KB.');
    const result=importDeviceBackup(window.localStorage,await file.text());
    render();
    message(result.added+' added, '+result.skipped+' skipped; existing plans preserved. No Qloo requests made.');
  }catch(e){message('Import rejected: '+String(e.message||'Invalid file')+'. Existing plans were not changed.');}
  finally{event.target.value='';}
});
window.addEventListener('storage',event=>{if(event.key==='unison.device-plans.v1')render();});
render();

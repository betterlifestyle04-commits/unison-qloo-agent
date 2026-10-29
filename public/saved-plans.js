import {normalizeBrief,buildGroupSummary} from './planner-state.js';

export const PLAN_STORAGE_KEY='unison.device-plans.v1';
export const MAX_DEVICE_PLANS=8;

function archiveShape(value){
  if(!value||typeof value!=='object'||typeof value.id!=='string'||value.id.length>100||typeof value.savedAt!=='string'||typeof value.summary!=='string')return null;
  try{
    if(!Number.isFinite(Date.parse(value.savedAt)))return null;
    const brief=normalizeBrief(value.brief);
    return {
      id:value.id,savedAt:value.savedAt,
      title:String(value.title||'Group plan').slice(0,90),
      winner:String(value.winner||'No fully supported match').slice(0,160),
      mode:brief.mode,domain:brief.domain,city:brief.city,
      brief,
      summary:value.summary.slice(0,3500)
    };
  }catch{return null;}
}
export function createPlanArchive(brief,result,{id,savedAt=new Date().toISOString()}={}){
  if(typeof id!=='string'||!id.trim())throw new Error('A unique plan ID is required.');
  const clean=normalizeBrief(brief);
  const winning=result?.ranked?.find(item=>item.sufficient&&!item.vetoed);
  const title=clean.domain==='movies'?'Movie night':clean.city?'Outing in '+clean.city:'Group outing';
  return archiveShape({
    id,
    savedAt,
    title,
    winner:winning?.name||'No fully supported match',
    brief:clean,
    summary:buildGroupSummary(result)
  });
}
export function loadDevicePlans(storage){
  try{
    const raw=storage.getItem(PLAN_STORAGE_KEY);
    if(!raw)return [];
    const parsed=JSON.parse(raw);
    if(!Array.isArray(parsed))return [];
    const seen=new Set();
    return parsed.map(archiveShape).filter(item=>{
      if(!item||seen.has(item.id))return false;
      seen.add(item.id);return true;
    }).slice(0,MAX_DEVICE_PLANS);
  }catch{return [];}
}
export function saveDevicePlan(storage,entry){
  const valid=archiveShape(entry);
  if(!valid)throw new Error('Cannot save an invalid plan.');
  const next=[valid,...loadDevicePlans(storage).filter(item=>item.id!==valid.id)].slice(0,MAX_DEVICE_PLANS);
  storage.setItem(PLAN_STORAGE_KEY,JSON.stringify(next));
  return next;
}
export function removeDevicePlan(storage,id){
  const next=loadDevicePlans(storage).filter(item=>item.id!==id);
  storage.setItem(PLAN_STORAGE_KEY,JSON.stringify(next));
  return next;
}

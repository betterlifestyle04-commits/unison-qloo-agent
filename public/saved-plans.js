import {normalizeBrief,buildGroupSummary} from './planner-state.js';

export const PLAN_STORAGE_KEY='unison.device-plans.v1';
export const MAX_DEVICE_PLANS=8;

function archiveShape(value){
  if(!value||typeof value!=='object'||typeof value.id!=='string'||!value.id.trim()||value.id.length>100||typeof value.savedAt!=='string'||typeof value.summary!=='string')return null;
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


/**
 * Browser-only, human-readable backup of explicitly saved plans.
 * It includes personal names and favorites, is not encrypted, and never
 * contains Qloo credentials or authoritative live venue verification.
 */
export const DEVICE_BACKUP_FORMAT='unison-device-plans';
export const DEVICE_BACKUP_VERSION=1;
export const MAX_BACKUP_CHARACTERS=100_000;
export function createDeviceBackup(storage,{exportedAt=new Date().toISOString()}={}){
  const plans=loadDevicePlans(storage);
  if(!plans.length)throw new Error('Save at least one plan before exporting a backup.');
  if(!Number.isFinite(Date.parse(exportedAt)))throw new Error('Invalid backup date.');
  return JSON.stringify({
    format:DEVICE_BACKUP_FORMAT,version:DEVICE_BACKUP_VERSION,exportedAt,
    privacy:'Contains participant names, tastes, and result summaries. Plain JSON, not encrypted.',
    plans
  },null,2);
}
export function parseDeviceBackup(text){
  if(typeof text!=='string'||!text.trim()||text.length>MAX_BACKUP_CHARACTERS)throw new Error('Select a UNISON backup JSON file smaller than 100 KB.');
  let parsed;
  try{parsed=JSON.parse(text);}catch{throw new Error('This is not valid JSON. Choose an exported UNISON library backup.');}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||parsed.format!==DEVICE_BACKUP_FORMAT||parsed.version!==DEVICE_BACKUP_VERSION||!Array.isArray(parsed.plans)){
    throw new Error('This is not a supported UNISON library backup.');
  }
  if(parsed.plans.length<1||parsed.plans.length>MAX_DEVICE_PLANS)throw new Error('A backup must contain between 1 and 8 plans.');
  const valid=parsed.plans.map(archiveShape);
  if(valid.some(item=>!item))throw new Error('The backup contains an invalid saved plan. Nothing was imported.');
  if(new Set(valid.map(x=>x.id)).size!==valid.length)throw new Error('The backup has duplicate plan IDs. Nothing was imported.');
  return valid;
}
export function importDeviceBackup(storage,text){
  const incoming=parseDeviceBackup(text);
  const existing=loadDevicePlans(storage);
  const ids=new Set(existing.map(item=>item.id));
  const available=MAX_DEVICE_PLANS-existing.length;
  const additions=incoming.filter(item=>!ids.has(item.id)).slice(0,available);
  if(additions.length){
    // Existing plans always win on ID collision and are never removed.
    storage.setItem(PLAN_STORAGE_KEY,JSON.stringify([...additions,...existing]));
  }
  return {added:additions.length,skipped:incoming.length-additions.length,plans:loadDevicePlans(storage)};
}

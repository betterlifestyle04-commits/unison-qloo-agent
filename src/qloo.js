const allowedBases=new Set(['https://hackathon.api.qloo.com','https://api.qloo.com']);
const cache=new Map();
const base=()=>process.env.QLOO_BASE_URL||'https://hackathon.api.qloo.com';
export const isLiveConfigured=()=>Boolean(process.env.QLOO_API_KEY);

function endpoint(pathname,params={}){
  const origin=base();
  if(!allowedBases.has(origin))throw Object.assign(new Error('QLOO_BASE_URL is not an approved Qloo HTTPS host'),{status:500});
  const url=new URL(pathname,origin);
  Object.entries(params).filter(([,value])=>value!==undefined&&value!==null&&value!=='').forEach(([key,value])=>url.searchParams.set(key,String(value)));
  return url;
}
async function get(pathname,params){
  if(!isLiveConfigured())throw Object.assign(new Error('Live Qloo mode requires QLOO_API_KEY. Demo mode remains available.'),{status:503});
  const url=endpoint(pathname,params); const key=url.toString();
  if(cache.has(key))return cache.get(key);
  const response=await fetch(url,{headers:{'X-Api-Key':process.env.QLOO_API_KEY,Accept:'application/json'},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Object.assign(new Error(`Qloo request failed (${response.status})`),{status:502});
  const json=await response.json(); cache.set(key,json); return json;
}
const list=value=>Array.isArray(value)?value:Array.isArray(value?.results)?value.results:Array.isArray(value?.data)?value.data:Array.isArray(value?.entities)?value.entities:[];
const entity=item=>({id:item?.id??item?.entity_id??item?.uuid,name:item?.name??item?.title??item?.display_name});

export async function resolveExact(name){
  const payload=await get('/search',{query:name});
  const match=list(payload).map(entity).find(item=>item.id&&item.name?.trim().toLocaleLowerCase()===name.trim().toLocaleLowerCase());
  if(!match)throw Object.assign(new Error(`Qloo could not resolve an exact entity for “${name}”.`),{status:422});
  return match;
}

// The envelope is intentionally strict: an event-key validation should confirm fields before relying on it.
export async function insights(entityId,domain){
  const payload=await get('/v2/insights',{entity_id:entityId,domain});
  const results=list(payload).map(item=>({id:item?.id??item?.entity_id,name:item?.name??item?.title,kind:item?.category?.name??item?.type,rawRank:item?.rank})).filter(item=>item.id&&item.name);
  if(!results.length)throw Object.assign(new Error('Qloo returned an unrecognised or empty insights envelope. Validate it with the event key before live use.'),{status:502});
  return results.slice(0,12);
}

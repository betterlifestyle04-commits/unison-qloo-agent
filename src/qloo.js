const allowedBases=new Set(['https://hackathon.api.qloo.com','https://api.qloo.com']);
const CACHE_TTL_MS=5*60*1000, CACHE_LIMIT=100;
const cache=new Map();
const base=()=>process.env.QLOO_BASE_URL||'https://hackathon.api.qloo.com';
export const isLiveConfigured=()=>Boolean(process.env.QLOO_API_KEY);
export const entityTypeFor=domain=>domain==='movies'?'urn:entity:movie':'urn:entity:place';
const error=(message,status=502)=>Object.assign(new Error(message),{status});
function endpoint(pathname,params={}){const origin=base();if(!allowedBases.has(origin))throw error('QLOO_BASE_URL is not an approved Qloo HTTPS host',500);const url=new URL(pathname,origin);for(const [key,raw] of Object.entries(params))for(const value of Array.isArray(raw)?raw:[raw])if(value!==undefined&&value!==null&&value!=='')url.searchParams.append(key,String(value));return url;}
function fromCache(key){const hit=cache.get(key);if(!hit||Date.now()-hit.created>CACHE_TTL_MS){cache.delete(key);return null;}cache.delete(key);cache.set(key,hit);return hit.value;}
function saveCache(key,value){cache.set(key,{created:Date.now(),value});if(cache.size>CACHE_LIMIT)cache.delete(cache.keys().next().value);return value;}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function get(pathname,params,fetchImpl=fetch){
  if(!isLiveConfigured())throw error('Live Qloo mode requires QLOO_API_KEY. Demo mode remains available.',503);
  const url=endpoint(pathname,params), key=url.toString(), hit=fromCache(key);if(hit)return {payload:hit,cached:true,url};
  for(let attempt=0;attempt<3;attempt++){try{const response=await fetchImpl(url,{headers:{'X-Api-Key':process.env.QLOO_API_KEY,Accept:'application/json'},signal:AbortSignal.timeout(8000)});if(response.ok)return {payload:saveCache(key,await response.json()),cached:false,url};if(response.status!==429&&response.status<500)throw error(`Qloo request failed (${response.status}). Check the favorite or live API access.`,response.status===401||response.status===403?502:response.status);}catch(caught){if(caught.status&&caught.status<500)throw caught;}if(attempt<2)await wait(150*(attempt+1));}
  throw error('Qloo is temporarily unavailable after three safe GET attempts. No demo evidence was substituted.');
}
const array=value=>Array.isArray(value)?value:[];
const candidates=payload=>array(payload?.results?.entities).length?payload.results.entities:array(payload?.results).length?payload.results:array(payload?.data?.entities).length?payload.data.entities:array(payload?.entities);
function normalize(item){return {id:item?.entity_id??item?.id??item?.entity?.id,name:item?.name??item?.display_name??item?.title,type:item?.type??item?.entity_type??array(item?.types)[0],category:item?.category?.name??item?.category};}
export function parseSearch(payload){return candidates(payload).map(normalize).filter(item=>item.id&&item.name);}
export function parseInsights(payload){return candidates(payload).map(normalize).filter(item=>item.id&&item.name);}
export async function searchFavorite(name,{fetchImpl=fetch}={}){const {payload,cached,url}=await get('/search',{query:name},fetchImpl);const matches=parseSearch(payload);const exact=matches.find(item=>item.name.trim().localeCompare(name.trim(),undefined,{sensitivity:'accent'})===0);return {status:exact?'resolved':matches.length?'ambiguous':'unresolved',exact,matches:matches.slice(0,5),cached,url:url.pathname+url.search};}
export async function insights(entityIds,domain,{city,fetchImpl=fetch}={}){const ids=[...new Set(entityIds)].slice(0,3);if(!ids.length)throw error('At least one resolved Qloo entity is required.',422);const params={'filter.type':entityTypeFor(domain),'signal.interests.entities':ids};if(domain==='places'&&city?.trim())params['filter.location.query']=city.trim();const {payload,cached,url}=await get('/v2/insights',params,fetchImpl);const results=parseInsights(payload);if(!results.length)throw error('Qloo returned an empty or unsupported insights envelope. Inspect the documented response and retry with the event key.',502);return {results:results.slice(0,12),cached,url:url.pathname+url.search};}
export const __resetQlooCache=()=>cache.clear();

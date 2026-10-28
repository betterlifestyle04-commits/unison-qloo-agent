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
  for(let attempt=0;attempt<3;attempt++){try{const response=await fetchImpl(url,{headers:{'X-Api-Key':process.env.QLOO_API_KEY,Accept:'application/json'},signal:AbortSignal.timeout(8000)});if(response.ok)return {payload:saveCache(key,await response.json()),cached:false,url};if(response.status===401||response.status===403){const auth=error(`Qloo request failed (${response.status}). Check the configured server credential.`,502);auth.retryable=false;throw auth;}if(response.status<500&&response.status!==429)throw error(`Qloo request failed (${response.status}). Check the favorite or live API access.`,response.status);}catch(caught){if(caught.retryable===false||caught.status&&caught.status<500)throw caught;}if(attempt<2)await wait(150*(attempt+1));}
  throw error('Qloo is temporarily unavailable after three safe GET attempts. No demo evidence was substituted.');
}
const array=value=>Array.isArray(value)?value:[];
// A valid empty Qloo entities array means 'no matches', not a malformed upstream envelope.
const hasEntitiesArray=payload=>Array.isArray(payload?.results?.entities)||Array.isArray(payload?.results)||Array.isArray(payload?.data?.entities)||Array.isArray(payload?.entities);
const candidates=payload=>{
  if(Array.isArray(payload?.results?.entities))return payload.results.entities;
  if(Array.isArray(payload?.results))return payload.results;
  if(Array.isArray(payload?.data?.entities))return payload.data.entities;
  return array(payload?.entities);
};
function normalize(item){
  const affinity=item?.query?.affinity??item?.affinity??null;
  const properties=item?.properties??{};
  const category=item?.category?.name??item?.category;
  const normalized={id:item?.entity_id??item?.id??item?.entity?.id,name:item?.name??item?.display_name??item?.title,type:item?.subtype??item?.type??item?.entity_type??array(item?.types)[0],category,affinity:Number.isFinite(affinity)?(affinity<=1?affinity*100:affinity):null};
  const description=typeof properties.description==='string'?properties.description.trim():'';
  const address=typeof properties.address==='string'?properties.address.trim():typeof properties.address?.formatted==='string'?properties.address.formatted.trim():'';
  if(description)normalized.note=description.slice(0,240);
  if(address)normalized.address=address.slice(0,180);
  if(Number.isInteger(properties.release_year))normalized.year=properties.release_year;
  // Only allow Qloo-owned CDN imagery, never arbitrary external links from API metadata.
  const imageCandidate=typeof properties.image?.url==='string'?properties.image.url:null;
  if(imageCandidate){
    try{
      const image=new URL(imageCandidate);
      if(image.protocol==='https:' && (image.hostname==='images.qloo.com'||image.hostname.endsWith('.images.qloo.com'))){
        normalized.imageUrl=image.href;
      }
    }catch{/* malformed images are simply omitted */}
  }
  return normalized;
}
export function parseSearch(payload){return candidates(payload).map(normalize).filter(item=>item.id&&item.name);}
export function parseInsights(payload){return candidates(payload).map(normalize).filter(item=>item.id&&item.name);}
export function matchSearchResults(name,matches){
  const sameName=matches.filter(item=>item.name.trim().localeCompare(name.trim(),undefined,{sensitivity:'accent'})===0);
  // Multiple *different Qloo entity IDs* with the same visible name must be selected by a person.
  // Returning the first item would silently confuse a film with an album, artist, or book.
  const distinct=new Map(sameName.map(item=>[item.id,item]));
  const exact=distinct.size===1?[...distinct.values()][0]:null;
  return {status:exact?'resolved':matches.length?'ambiguous':'unresolved',exact,matches:matches.slice(0,8)};
}
export async function searchFavorite(name,{fetchImpl=fetch}={}){
  const {payload,cached,url}=await get('/search',{query:name},fetchImpl);
  if(!hasEntitiesArray(payload))throw error('Qloo search response had an unsupported structure.',502);
  return {...matchSearchResults(name,parseSearch(payload)),cached,url:url.pathname+url.search};
}
export async function insights(entityIds,domain,{city,budget='any',shortlist=[],fetchImpl=fetch}={}){const ids=[...new Set(entityIds)].slice(0,3);if(!ids.length)throw error('At least one resolved Qloo entity is required.',422);const params={'filter.type':entityTypeFor(domain),'signal.interests.entities':ids.join(','),take:12};if(shortlist.length)params['filter.results.entities']=[...new Set(shortlist)].slice(0,12).join(',');if(domain==='places'&&city?.trim()){params['filter.location.query']=city.trim();params['filter.location.radius']=0;}if(domain==='places'&&budget!=='any')params['filter.price_level.max']={low:1,mid:2,high:4}[budget];const {payload,cached,url}=await get('/v2/insights',params,fetchImpl);if(!hasEntitiesArray(payload))throw error('Qloo returned an unsupported Insights response structure.',502);
const results=parseInsights(payload);
return {results:results.slice(0,12),cached,url:url.pathname+url.search};}
export const __resetQlooCache=()=>cache.clear();

/**
 * Defensive validation of Qloo Insights candidate membership.
 *
 * Search/discovery may introduce new candidates; evaluation is restricted to the
 * specific shortlist requested. No unrequested or wrong-domain entity should
 * silently receive a fit score merely because it appears in a response.
 */
export function screenCandidates(results,domain,{shortlist=null}={}){
  if(!Array.isArray(results)||!['places','movies'].includes(domain))throw new Error('A supported Qloo candidate set is required.');
  const expectedType=domain==='movies'?'urn:entity:movie':'urn:entity:place';
  const allowed=Array.isArray(shortlist)?new Set(shortlist):null;
  const seen=new Set(),items=[];
  const stats={received:results.length,accepted:0,duplicates:0,wrongType:0,outsideShortlist:0,invalid:0,missingType:0};
  for(const item of results){
    if(!item||typeof item.id!=='string'||!item.id.trim()||item.id.length>200||typeof item.name!=='string'||!item.name.trim()){
      stats.invalid++;
      continue;
    }
    if(item.type!==undefined&&item.type!==null&&item.type!==''&&item.type!==expectedType){
      stats.wrongType++;
      continue;
    }
    if(allowed&&!allowed.has(item.id)){
      stats.outsideShortlist++;
      continue;
    }
    if(seen.has(item.id)){
      stats.duplicates++;
      continue;
    }
    if(!item.type)stats.missingType++;
    seen.add(item.id);
    items.push(item);
  }
  stats.accepted=items.length;
  return {items,stats};
}

export function summarizeScreening(screens){
  const sum={received:0,accepted:0,duplicates:0,wrongType:0,outsideShortlist:0,invalid:0,missingType:0};
  for(const screen of screens)for(const key of Object.keys(sum))sum[key]+=screen.stats[key]||0;
  return sum;
}

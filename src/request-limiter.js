/**
 * Bounded, in-memory, fixed-window request limiter.
 * Tracks a maximum number of client identifiers and expires idle entries.
 * Identifiers are never written to disk or application logs.
 */
export function createRequestLimiter({limit,windowMs=60_000,maxClients=2048}={}){
  if(!Number.isInteger(limit)||limit<1||!Number.isInteger(maxClients)||maxClients<1||!Number.isFinite(windowMs)||windowMs<1)throw new Error('Invalid rate limiter configuration.');
  const seen=new Map();
  function prune(now){
    for(const [key,entry] of seen){
      if(now-entry.started>=windowMs)seen.delete(key);
    }
    while(seen.size>maxClients)seen.delete(seen.keys().next().value);
  }
  return {
    allow(client,now=Date.now()){
      if(typeof client!=='string'||!client)throw new Error('A client identifier is required.');
      let entry=seen.get(client);
      if(!entry||now-entry.started>=windowMs)entry={started:now,count:0};
      entry.count++;
      // Refresh insertion order so active clients remain represented when at capacity.
      seen.delete(client);
      seen.set(client,entry);
      if(seen.size>maxClients)prune(now);
      return entry.count<=limit;
    },
    tracked(){return seen.size;},
    clear(){seen.clear();}
  };
}

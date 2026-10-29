import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnoseQloo} from '../src/qloo-diagnostics.js';

const movie={id:'movie-1',name:'Interstellar',type:'urn:entity:movie'};
const place={id:'venue-1',name:'A venue',type:'urn:entity:place'};
const recommendation={id:'movie-2',name:'Second movie',type:'urn:entity:movie'};

test('full live diagnostic explicitly uses one fixed Search and two shortlisted Insights requests',async()=>{
  const calls=[];
  const result=await diagnoseQloo({
    search:async query=>{calls.push(['search',query]);return {matches:[movie,place]};},
    inspect:async(ids,domain,params)=>{
      calls.push(['insights',ids,domain,params]);
      if(!params.shortlist)return {results:[recommendation]};
      return {results:[recommendation,place]};
    }
  });
  assert.equal(result.ok,true);
  assert.deepEqual(result.stages.map(s=>s.status),['passed','passed','passed']);
  assert.equal(calls.length,3);
  assert.deepEqual(calls[0],['search','Interstellar']);
  assert.equal(calls[1][2],'movies');
  assert.deepEqual(calls[2][3].shortlist,['movie-2']);
  assert.equal(calls[1][3].budget,'any');
  assert.doesNotMatch(JSON.stringify(result),/movie-1|QLOO_API_KEY/);
});
test('diagnostic fails clearly on missing movie identity without any Insights calls',async()=>{
  let downstream=0;
  const result=await diagnoseQloo({
    search:async()=>({matches:[place]}),
    inspect:async()=>{downstream++;return {results:[recommendation]};}
  });
  assert.equal(result.ok,false);
  assert.equal(result.stages[0].step,'Search');
  assert.equal(downstream,0);
});
test('upstream Insights outages do not masquerade as a passed connectivity check',async()=>{
  const result=await diagnoseQloo({
    search:async()=>({matches:[movie]}),
    inspect:async()=>{throw new Error('Insights 503 unavailable');}
  });
  assert.equal(result.ok,false);
  assert.deepEqual(result.stages.map(s=>s.step),['Search','Insights discovery']);
  assert.match(result.stages[1].detail,/503/);
});
test('shortlist responses with only extra IDs cannot pass diagnostic verification',async()=>{
  let calls=0;
  const result=await diagnoseQloo({
    search:async()=>({matches:[movie]}),
    inspect:async(_ids,_domain,params)=>{
      calls++;return params.shortlist?{results:[{...recommendation,id:'not-requested'}]}:{results:[recommendation]};
    }
  });
  assert.equal(calls,2);
  assert.equal(result.ok,false);
  assert.equal(result.stages.at(-1).step,'Insights shortlist');
});

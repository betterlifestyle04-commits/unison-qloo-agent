import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {__resetQlooCache,insights,parseInsights,parseSearch,searchFavorite,matchSearchResults} from '../src/qloo.js';
const fixtures=JSON.parse(await readFile(new URL('./fixtures/qloo-responses.json',import.meta.url)));
const response=payload=>({ok:true,status:200,json:async()=>payload});
test.beforeEach(()=>{process.env.QLOO_API_KEY='test-only-placeholder';__resetQlooCache();});
test.after(()=>delete process.env.QLOO_API_KEY);
test('parses sanitized Qloo documented entity envelopes',()=>{
  assert.deepEqual(parseSearch(fixtures.search)[0],{id:'F0D354AA-BA7E-49D2-8ABA-9A8250F5C852',name:'Everything Everywhere All at Once',type:'urn:entity:movie',category:undefined,affinity:null});
  assert.equal(parseInsights(fixtures.insights)[0].name,'Queen & Slim');
});
test('builds documented insight signals, type URN, and city filter',async()=>{
  let seen;const fetchImpl=async url=>{seen=new URL(url);return response(fixtures.insights);};
  const result=await insights(['urn:entity:movie:one','urn:entity:movie:two'],'places',{city:'Oslo',fetchImpl});
  assert.equal(seen.pathname,'/v2/insights');assert.equal(seen.searchParams.get('filter.type'),'urn:entity:place');assert.equal(seen.searchParams.get('signal.interests.entities'),'urn:entity:movie:one,urn:entity:movie:two');assert.equal(seen.searchParams.get('filter.location.query'),'Oslo');assert.equal(seen.searchParams.get('filter.location.radius'),'0');assert.equal(result.results.length,1);
});
test('does not retry authentication failures',async()=>{
  let calls=0;const fetchImpl=async()=>{calls++;return {ok:false,status:401,json:async()=>({})};};
  await assert.rejects(()=>insights(['urn:entity:movie:one'],'movies',{fetchImpl}),/401/);assert.equal(calls,1);
});
test('requires an exact search match and caches repeated safe GETs',async()=>{
  let calls=0;const fetchImpl=async()=>{calls++;return response(fixtures.search);};
  const first=await searchFavorite('Everything Everywhere All at Once',{fetchImpl});const second=await searchFavorite('Everything Everywhere All at Once',{fetchImpl});
  assert.equal(first.status,'resolved');assert.equal(second.cached,true);assert.equal(calls,1);
});

test('Qloo descriptions and release years are surfaced only when present',()=>{
  const result=parseInsights({results:{entities:[{entity_id:'sample',name:'Sample Film',subtype:'urn:entity:movie',properties:{description:'A sample description',release_year:2024}}]}});
  assert.equal(result[0].note,'A sample description');
  assert.equal(result[0].year,2024);
  assert.equal(result[0].address,undefined);
});

test('trusted Qloo image URLs are retained, unsafe image hosts are excluded',()=>{
  const entity=(image)=>({entity_id:'entity1',name:'Example Film',subtype:'urn:entity:movie',properties:{image:{url:image}}});
  const image='https://staging.images.qloo.com/i/example.jpg';
  const valid=parseInsights({results:{entities:[entity(image)]}})[0];
  assert.equal(valid.imageUrl,image);
  const untrusted=parseInsights({results:{entities:[entity('https://lookalike-qloo.com/x.jpg')]}})[0];
  assert.equal(untrusted.imageUrl,undefined);
  const insecure=parseInsights({results:{entities:[entity('http://staging.images.qloo.com/i/example.jpg')]}})[0];
  assert.equal(insecure.imageUrl,undefined);
});

test('same name across different Qloo types must be explicitly disambiguated',()=>{
  const options=[
    {id:'movie-id',name:'Interstellar',type:'urn:entity:movie'},
    {id:'album-id',name:'Interstellar',type:'urn:entity:album'},
    {id:'book-id',name:'Interstellar',type:'urn:entity:book'}
  ];
  const result=matchSearchResults('Interstellar',options);
  assert.equal(result.status,'ambiguous');
  assert.equal(result.exact,null);
  assert.equal(result.matches.length,3);
  assert.equal(matchSearchResults('Interstellar',[options[0]]).status,'resolved');
  assert.equal(matchSearchResults('Unknown',[]).status,'unresolved');
});
test('valid no-results Qloo Insights is not mistaken for an upstream failure',async()=>{
  const fetchImpl=async()=>response({success:true,results:{entities:[]}});
  const value=await insights(['urn:entity:movie:test'],'movies',{fetchImpl});
  assert.deepEqual(value.results,[]);
});
test('malformed Insights response is rejected instead of silently returning zero results',async()=>{
  const fetchImpl=async()=>response({unexpected:true});
  await assert.rejects(()=>insights(['urn:entity:movie:test'],'movies',{fetchImpl}),/unsupported Insights response/);
});

test('concurrent identical Qloo lookups share one upstream request',async()=>{
  let hits=0;
  const fetchImpl=async()=>{hits++;await new Promise(resolve=>setTimeout(resolve,20));return response(fixtures.search);};
  const [a,b,c]=await Promise.all([
    searchFavorite('Everything Everywhere All at Once',{fetchImpl}),
    searchFavorite('Everything Everywhere All at Once',{fetchImpl}),
    searchFavorite('Everything Everywhere All at Once',{fetchImpl})
  ]);
  assert.equal(hits,1);
  assert.equal(a.status,'resolved');
  assert.ok(b.cached||c.cached);
  assert.deepEqual([a.exact.id,b.exact.id,c.exact.id],[a.exact.id,a.exact.id,a.exact.id]);
});
test('failed Qloo requests are not cached as successes and can be retried',async()=>{
  let calls=0;
  const first=async()=>{calls++;return {ok:false,status:401,json:async()=>({})};};
  const second=async()=>{calls++;return response(fixtures.search);};
  await assert.rejects(()=>Promise.all([
    searchFavorite('Everything Everywhere All at Once',{fetchImpl:first}),
    searchFavorite('Everything Everywhere All at Once',{fetchImpl:first})
  ]),/401/);
  assert.equal(calls,1);
  const recovered=await searchFavorite('Everything Everywhere All at Once',{fetchImpl:second});
  assert.equal(recovered.status,'resolved');
  assert.equal(calls,2);
});

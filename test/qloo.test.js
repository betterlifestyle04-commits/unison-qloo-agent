import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {__resetQlooCache,insights,parseInsights,parseSearch,searchFavorite} from '../src/qloo.js';
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

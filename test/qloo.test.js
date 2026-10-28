import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {__resetQlooCache,insights,parseInsights,parseSearch,searchFavorite} from '../src/qloo.js';
const fixtures=JSON.parse(await readFile(new URL('./fixtures/qloo-responses.json',import.meta.url)));
const response=payload=>({ok:true,status:200,json:async()=>payload});
test.beforeEach(()=>{process.env.QLOO_API_KEY='test-only-placeholder';__resetQlooCache();});
test.after(()=>delete process.env.QLOO_API_KEY);
test('parses sanitized search and insight examples without mixing envelopes',()=>{
  assert.deepEqual(parseSearch(fixtures.search)[0],{id:'urn:entity:movie:fictional-archive',name:'The Bright Archive',type:'urn:entity:movie',category:undefined});
  assert.equal(parseInsights(fixtures.insights)[0].name,'Fictional Café');
});
test('builds documented insight signals, type URN, and city filter',async()=>{
  let seen;const fetchImpl=async url=>{seen=new URL(url);return response(fixtures.insights);};
  const result=await insights(['urn:entity:movie:one','urn:entity:movie:two'],'places',{city:'Oslo',fetchImpl});
  assert.equal(seen.pathname,'/v2/insights');assert.equal(seen.searchParams.get('filter.type'),'urn:entity:place');assert.deepEqual(seen.searchParams.getAll('signal.interests.entities'),['urn:entity:movie:one','urn:entity:movie:two']);assert.equal(seen.searchParams.get('filter.location.query'),'Oslo');assert.equal(result.results.length,1);
});
test('requires an exact search match and caches repeated safe GETs',async()=>{
  let calls=0;const fetchImpl=async()=>{calls++;return response(fixtures.search);};
  const first=await searchFavorite('The Bright Archive',{fetchImpl});const second=await searchFavorite('The Bright Archive',{fetchImpl});
  assert.equal(first.status,'resolved');assert.equal(second.cached,true);assert.equal(calls,1);
});

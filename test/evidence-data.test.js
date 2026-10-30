import test from 'node:test';
import assert from 'node:assert/strict';
import {VERIFIED_CASES,API_PIPELINE_PROOF,filterVerifiedCases,evidenceSummary} from '../public/evidence-data.js';

test('historical evidence records are bounded, internally valid and backed by real public GitHub Actions run links',()=>{
  assert.equal(VERIFIED_CASES.length,6);
  assert.equal(new Set(VERIFIED_CASES.map(x=>x.id)).size,6);
  assert.equal(new Set(VERIFIED_CASES.map(x=>x.run)).size,5,'Bergen and London share a single real run');
  for(const row of VERIFIED_CASES){
    assert.equal(row.source,'https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/'+row.run);
    assert.match(row.date,/^2026-10-(29|30)$/);
    assert.ok(row.people>=2&&row.people<=5);
    assert.ok(row.covered<=row.candidates);
    assert.ok(row.covered>=0&&row.candidates>0);
    assert.ok(row.limits.length>30);
    assert.ok(Object.isFrozen(row));
  }
  assert.equal(API_PIPELINE_PROOF.source,'https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/40877477130');
});
test('evidence displays observed candidate coverage not predictions of suitability',()=>{
  const stats=evidenceSummary();
  assert.deepEqual(stats,{cases:6,cities:3,peopleSizes:[2,3,5],placeCases:4,movieCases:2,runs:5,candidates:72,covered:70});
  assert.deepEqual(evidenceSummary([]),{cases:0,cities:0,peopleSizes:[],placeCases:0,movieCases:0,runs:0,candidates:0,covered:0});
  assert.equal(VERIFIED_CASES.find(x=>x.id==='movies-five').covered,11);
  assert.equal(VERIFIED_CASES.find(x=>x.id==='oslo-three').covered,12);
});
test('filters return actual known scopes and never invent additional cases',()=>{
  assert.deepEqual(filterVerifiedCases({domain:'movies'}).map(x=>x.id),['movies-two','movies-five']);
  assert.deepEqual(filterVerifiedCases({city:'Oslo'}).map(x=>x.id),['oslo-two','oslo-three']);
  assert.deepEqual(filterVerifiedCases({city:'London'}).map(x=>x.id),['london']);
  assert.deepEqual(filterVerifiedCases({people:'5'}).map(x=>x.id),['movies-five']);
  assert.deepEqual(filterVerifiedCases({domain:'places',city:'Oslo',people:'3'}).map(x=>x.id),['oslo-three']);
  assert.deepEqual(filterVerifiedCases({domain:'movies',city:'Oslo'}),[]);
  assert.deepEqual(filterVerifiedCases({query:'radiohead'}).map(x=>x.id),['bergen','london']);
  assert.deepEqual(filterVerifiedCases({query:'PRICE CAP'}).map(x=>x.id),['oslo-three']);
  assert.deepEqual(filterVerifiedCases({query:'unknown_fake_city'}),[]);
  assert.deepEqual(filterVerifiedCases({domain:'all',people:'all'}),VERIFIED_CASES);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {starterGroups,normalizeBrief} from '../public/planner-state.js';
import {scenarioMetadata,filterScenarios,scenarioStats} from '../public/explore.js';

test('discovery scenarios provide usable fictional group briefs for 2–5 people',()=>{
  const ids=new Set();
  assert.ok(starterGroups.length>=9);
  for(const scenario of starterGroups){
    assert.ok(scenarioMetadata[scenario.id],'Missing editorial metadata for '+scenario.id);
    assert.ok(!ids.has(scenario.id),'Duplicate scenario ID: '+scenario.id);
    ids.add(scenario.id);
    const normalized=normalizeBrief(scenario);
    assert.ok(normalized.people.length>=2&&normalized.people.length<=5);
    assert.equal(normalized.mode,'demo','Samples must remain in fictional demonstration mode');
    assert.ok(normalized.people.every(person=>person.favorites.length>=1));
  }
});

test('discovery search supports case-insensitive cultural references, cities and labels',()=>{
  assert.equal(filterScenarios(starterGroups,{query:'bOUrdAIN'}).some(x=>x.id==='friends'),true);
  assert.equal(filterScenarios(starterGroups,{query:'LONDON'}).some(x=>x.id==='team'),true);
  assert.equal(filterScenarios(starterGroups,{query:'film club'}).some(x=>x.id==='cineclub'),true);
  assert.equal(filterScenarios(starterGroups,{query:'not-a-real-search-result'}).length,0);
});

test('outings and movies have independent, reproducible filters',()=>{
  const all=filterScenarios(starterGroups);
  const places=filterScenarios(starterGroups,{domain:'places'});
  const movies=filterScenarios(starterGroups,{domain:'movies'});
  assert.equal(all.length,places.length+movies.length);
  assert.ok(places.every(x=>x.domain==='places'));
  assert.ok(movies.every(x=>x.domain==='movies'));
  assert.equal(filterScenarios(starterGroups,{domain:'movies',query:'Oslo'}).length,0);
  assert.deepEqual(scenarioStats(starterGroups),{total:all.length,places:places.length,movies:movies.length});
});

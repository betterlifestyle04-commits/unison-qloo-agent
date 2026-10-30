import test from 'node:test';
import assert from 'node:assert/strict';
import {archiveInsights,filterArchive} from '../public/workspace-insights.js';

const item=(id,{domain='places',mode='demo',city='Oslo',time='2026-10-30T12:00:00Z',winner='Shared plan',names=['Maya','Jon'],favorites=[['Jazz','Art'],['Jazz','Coffee']]}={})=>({
  id,savedAt:time,title:domain==='movies'?'Movie night':'Outing in '+city,winner,
  brief:{domain,mode,city,people:names.map((name,i)=>({name,favorites:favorites[i]||['Movies']}))}
});
const plans=[
  item('1'),
  item('2',{domain:'movies',city:'',time:'2026-10-29T12:00:00Z',favorites:[['Jazz'],['Mystery']]}),
  item('3',{mode:'live',city:'London',time:'2026-10-28T12:00:00Z',favorites:[['Jazz'],['Architecture']]})
];

test('dashboard reports only observed saved-plan counts, not unique people or Qloo satisfaction',()=>{
  const stats=archiveInsights(plans);
  assert.equal(stats.count,3);
  assert.equal(stats.participantSlots,6);
  assert.equal(stats.averageGroupSize,2);
  assert.deepEqual(stats.domains,{places:2,movies:1});
  assert.deepEqual(stats.modes,{live:1,demo:2});
  assert.deepEqual(stats.cities,[{label:'London',count:1},{label:'Oslo',count:1}]);
  assert.deepEqual(stats.references[0],{label:'Jazz',count:3},'repeated interest in one plan counts only once');
  assert.equal(stats.mostRecent,plans[0].savedAt);
});
test('empty workspace conveys zero evidence rather than fictional metrics',()=>{
  const stats=archiveInsights([]);
  assert.equal(stats.count,0);assert.equal(stats.averageGroupSize,0);
  assert.deepEqual(stats.cities,[]);assert.deepEqual(stats.references,[]);
  assert.equal(stats.mostRecent,null);
});
test('workspace searches names, city, cultural favorites and results, and sorts correctly',()=>{
  assert.deepEqual(filterArchive(plans,{query:'MAYA'}).map(x=>x.id),['1','2','3']);
  assert.deepEqual(filterArchive(plans,{query:'architecturE'}).map(x=>x.id),['3']);
  assert.deepEqual(filterArchive(plans,{query:'London'}).map(x=>x.id),['3']);
  assert.deepEqual(filterArchive(plans,{query:'no-such-place'}),[]);
  assert.deepEqual(filterArchive(plans,{domain:'movies'}).map(x=>x.id),['2']);
  assert.deepEqual(filterArchive(plans,{mode:'live'}).map(x=>x.id),['3']);
  assert.deepEqual(filterArchive(plans,{sort:'oldest'}).map(x=>x.id),['3','2','1']);
  assert.deepEqual(filterArchive(plans,{sort:'newest'}).map(x=>x.id),['1','2','3']);
  assert.equal(filterArchive(plans,{sort:'title'})[0].id,'2');
  assert.equal(filterArchive(plans).length,3,'the helper never mutates or truncates the source array');
});

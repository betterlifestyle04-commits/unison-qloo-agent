import test from 'node:test';
import assert from 'node:assert/strict';
import {auditGroupEvidence,recoverySuggestions} from '../public/evidence-audit.js';
const people=[{id:'ada-1',name:'Ada'},{id:'bea-2',name:'Bea'},{id:'cam-3',name:'Cam'}];
const ranked=[
  {id:'a',name:'First',score:87,sufficient:true,vetoed:false,signals:{'ada-1':80,'bea-2':92,'cam-3':89}},
  {id:'b',name:'Second',score:78,sufficient:true,vetoed:false,signals:{'ada-1':90,'bea-2':68,'cam-3':70}},
  {id:'c',name:'Partial',score:null,sufficient:false,vetoed:false,signals:{'ada-1':95,'bea-2':83}},
];
test('evidence audit measures actually observed values, without imputing missing values',()=>{
  const data={people,ranked,domain:'places',budget:'mid'};
  const audit=auditGroupEvidence(data);
  assert.equal(audit.total,3);
  assert.equal(audit.complete,2);
  assert.equal(audit.partial,1);
  assert.equal(audit.winner.id,'a');
  assert.equal(audit.alternative.id,'b');
  assert.equal(audit.spread,12);
  assert.deepEqual(audit.missingRows[0].missing.map(x=>x.name),['Cam']);
  assert.deepEqual(audit.people.map(p=>p.observed),[3,3,2]);
  assert.equal(audit.comparison.find(x=>x.name==='Ada').delta,-10);
  assert.equal(audit.comparison.find(x=>x.name==='Bea').delta,24);
  assert.deepEqual(recoverySuggestions(data,audit),[]);
});
test('missing group coverage leads to targeted next steps without false winner',()=>{
  const data={people,ranked:[ranked[2]],domain:'places',budget:'low'};
  const audit=auditGroupEvidence(data);
  assert.equal(audit.complete,0);
  assert.equal(audit.winner,null);
  assert.equal(audit.partial,1);
  assert.match(audit.summary,/unknown, not disagreement/i);
  const advice=recoverySuggestions(data,audit).join(' ');
  assert.match(advice,/Cam/);
  assert.match(advice,/broader price level/i);
});
test('vetoed options are excluded from audits and are never considered evidence of consensus',()=>{
  const data={people,ranked:[{...ranked[0],vetoed:true,score:null},ranked[2]],domain:'movies',budget:'any'};
  const audit=auditGroupEvidence(data);
  assert.equal(audit.total,1);
  assert.equal(audit.complete,0);
  assert.equal(audit.winner,null);
  assert.ok(!audit.missingRows.some(row=>row.id==='a'));
});
test('fully empty active shortlist gives a useful next action',()=>{
  const data={people,ranked:[{...ranked[0],vetoed:true}],domain:'movies'};
  const audit=auditGroupEvidence(data);
  assert.equal(audit.total,0);
  assert.match(recoverySuggestions(data,audit).join(' '),/Restore a veto/i);
});

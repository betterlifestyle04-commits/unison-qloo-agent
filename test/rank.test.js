import test from 'node:test';
import assert from 'node:assert/strict';
import {explainCandidate,rankCandidates} from '../src/rank.js';

const people=[{id:'a',name:'Ada'},{id:'b',name:'Bea'},{id:'c',name:'Cy'}];
test('fairness ranking rewards a stronger floor and preserves missing data',()=>{
  const [fair,popular]=rankCandidates([
    {id:'fair',name:'Fair',signals:{a:78,b:76,c:80}},
    {id:'popular',name:'Popular',signals:{a:100,b:45}}
  ],people);
  assert.equal(fair.id,'fair'); assert.equal(popular.coverage,2/3); assert.match(explainCandidate(popular,people),/not enough/);
});
test('a veto excludes an item without deleting its evidence',()=>{
  const [item]=rankCandidates([{id:'x',name:'X',signals:{a:80,b:80,c:80}}],people,['x']);
  assert.equal(item.vetoed,true); assert.equal(item.score,null);
});
test('partial evidence is never scored as a group compromise',()=>{
  const [item]=rankCandidates([{id:'x',name:'X',signals:{a:99}}],people);
  assert.equal(item.sufficient,false);assert.equal(item.score,null);assert.match(explainCandidate(item,people),/not enough/);
});

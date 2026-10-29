import test from 'node:test';
import assert from 'node:assert/strict';
import {screenCandidates,summarizeScreening} from '../src/candidate-integrity.js';

const place=id=>({id,name:'Venue '+id,type:'urn:entity:place',affinity:null});
test('only requested, unique, correct-domain Qloo entities enter the shared evaluation',()=>{
  const input=[
    place('one'),
    place('one'),
    place('outside'),
    {id:'movie',name:'A movie',type:'urn:entity:movie'},
    {id:'unknown-type',name:'Venue without type'},
    {id:'',name:'Missing id',type:'urn:entity:place'},
    place('two')
  ];
  const result=screenCandidates(input,'places',{shortlist:['one','two','unknown-type']});
  assert.deepEqual(result.items.map(item=>item.id),['one','unknown-type','two']);
  assert.deepEqual(result.stats,{received:7,accepted:3,duplicates:1,wrongType:1,outsideShortlist:1,invalid:1,missingType:1});
  assert.equal(input.length,7);
});
test('unconstrained discovery still checks category and does not repeat the same entity',()=>{
  const result=screenCandidates([{id:'film',name:'Film',type:'urn:entity:movie'},place('one'),{id:'film',name:'Film duplicate',type:'urn:entity:movie'}],'movies');
  assert.deepEqual(result.items.map(item=>item.id),['film']);
  assert.equal(result.stats.wrongType,1);
  assert.equal(result.stats.duplicates,1);
});
test('a missing explicit type is accepted but reported as not independently verified',()=>{
  const result=screenCandidates([{id:'unknown',name:'A candidate'}],'movies',{shortlist:['unknown']});
  assert.equal(result.items.length,1);
  assert.equal(result.stats.missingType,1);
});
test('case-specific shortlist IDs and incorrect data shapes are excluded',()=>{
  const data=screenCandidates([place('AAA'),place('aaa'),null,{id:1,name:'Bad',type:'urn:entity:place'}],'places',{shortlist:['AAA']});
  assert.deepEqual(data.items.map(x=>x.id),['AAA']);
  assert.equal(data.stats.outsideShortlist,1);
  assert.equal(data.stats.invalid,2);
  assert.throws(()=>screenCandidates('not-an-array','places'),/supported Qloo/);
});
test('aggregate quality counts across people remain accurate',()=>{
  const a=screenCandidates([place('a'),place('outside')],'places',{shortlist:['a']});
  const b=screenCandidates([place('a'),place('a')],'places',{shortlist:['a']});
  assert.deepEqual(summarizeScreening([a,b]),{received:4,accepted:2,duplicates:1,wrongType:0,outsideShortlist:1,invalid:0,missingType:0});
});

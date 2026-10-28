import test from 'node:test';
import assert from 'node:assert/strict';
import {ballotChoices,updateBallot,summarizeBallot,winningAgreement} from '../public/ballot.js';

const people=['maya-1','jon-2','priya-3'];
test('votes are immutable and can be toggled off without network calls',()=>{
  const original={};
  const one=updateBallot(original,'option-1',people[0],'yes');
  assert.deepEqual(original,{});
  assert.equal(one['option-1'][people[0]],'yes');
  const two=updateBallot(one,'option-1',people[1],'maybe');
  assert.equal(two['option-1'][people[0]],'yes');
  assert.equal(two['option-1'][people[1]],'maybe');
  const removed=updateBallot(two,'option-1',people[1],'maybe');
  assert.equal(removed['option-1'][people[1]],undefined);
  assert.deepEqual(ballotChoices,['yes','maybe','no']);
});
test('unanimous agreement requires everyone to explicitly say yes',()=>{
  const all={x:{'maya-1':'yes','jon-2':'yes','priya-3':'yes'}};
  const summary=summarizeBallot(all,'x',people);
  assert.deepEqual([summary.yes,summary.maybe,summary.no,summary.total],[3,0,0,3]);
  assert.equal(summary.unanimous,true);
  assert.equal(summarizeBallot({x:{'maya-1':'yes'}},'x',people).unanimous,false);
  assert.equal(summarizeBallot({x:{'maya-1':'no'}},'x',people).rejected,true);
});
test('group approval remains separate from recommendation rank and veto state',()=>{
  const ranked=[
    {id:'top',name:'Top',score:85,sufficient:true,vetoed:false},
    {id:'other',name:'Other',score:76,sufficient:true,vetoed:false}
  ];
  const group={people:people.map(id=>({id})),ranked};
  const ballots={other:Object.fromEntries(people.map(id=>[id,'yes']))};
  assert.equal(winningAgreement(group,ballots)?.id,'other');
  assert.equal(winningAgreement({...group,ranked:[ranked[0],{...ranked[1],vetoed:true}]},ballots),null);
  assert.equal(winningAgreement(group,{}),null);
  assert.equal(group.ranked[1].score,76);
});
test('invalid votes and missing candidate are rejected',()=>{
  assert.throws(()=>updateBallot({},'option-1',people[0],'absolutely'),/Invalid vote/);
  assert.throws(()=>updateBallot({},'',people[0],'yes'),/candidate/i);
});

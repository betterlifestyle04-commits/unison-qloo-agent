import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeDecisionTradeoffs,applyVetoLocally} from '../public/planner-state.js';

const group={mode:'demo',people:[{id:'a',name:'Alex'},{id:'b',name:'Bea'}],ranked:[
  {id:'fair',name:'A fair compromise',sufficient:true,vetoed:false,minimum:70,average:80,coverage:1,score:76.5,signals:{a:70,b:90}},
  {id:'mean',name:'Average favorite',sufficient:true,vetoed:false,minimum:50,average:90,coverage:1,score:69,signals:{a:50,b:130}},
  {id:'unknown',name:'No signal for Alex',sufficient:false,vetoed:false,minimum:95,average:96,coverage:.5,score:null}
]};
test('Decision Lab compares identical eligible candidate pool without inventing missing evidence',()=>{
  const report=analyzeDecisionTradeoffs(group);
  assert.equal(report.eligible,2);
  assert.equal(report.winners.balanced.id,'fair');
  assert.equal(report.winners.protective.id,'fair');
  assert.equal(report.winners.average.id,'mean');
  assert.equal(report.averageOnly.id,'mean');
  assert.equal(report.stable,false);
  assert.equal(report.different,true);
  assert.equal(report.minBenefit,20);
  assert.equal(report.averageCost,10);
  assert.match(report.explanation,/heuristic trade-off/i);
  assert.equal(group.ranked[0].score,76.5);
});
test('unanimous leaders report robustness without claiming satisfaction',()=>{
  const only={...group,ranked:[group.ranked[0]]};
  const report=analyzeDecisionTradeoffs(only);
  assert.equal(report.eligible,1);
  assert.equal(report.stable,true);
  assert.equal(report.different,false);
  assert.match(report.explanation,/ranking may still change/i);
});
test('vetoed and incomplete candidates are never Decision Lab leaders',()=>{
  const veto=applyVetoLocally(group,['fair']);
  const report=analyzeDecisionTradeoffs(veto);
  assert.equal(report.eligible,1);
  assert.equal(report.winners.balanced.id,'mean');
  const none=analyzeDecisionTradeoffs({...group,ranked:[group.ranked[2]]});
  assert.equal(none.eligible,0);
  assert.match(none.explanation,/every participant/i);
});

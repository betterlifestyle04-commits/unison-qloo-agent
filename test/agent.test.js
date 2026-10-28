import test from 'node:test';
import assert from 'node:assert/strict';
import {runAgent} from '../src/agent.js';

const group={mode:'demo',domain:'places',people:[{name:'Ada',favorite:'Jazz'},{name:'Bea',favorite:'Manga'}]};
test('demo agent returns labeled, inspectable fictional results',async()=>{
  const result=await runAgent(group);
  assert.equal(result.mode,'demo'); assert.equal(result.ranked.length,5); assert.match(result.disclaimer,/simulated/i); assert.equal(result.ranked[0].known.length,2);
});
test('changing a fictional favorite changes the preference-sensitive ranking',async()=>{
  const food=await runAgent({mode:'demo',domain:'places',people:[{name:'Ada',favorites:['Anthony Bourdain']},{name:'Bea',favorites:['chef']} ]});
  const animation=await runAgent({mode:'demo',domain:'places',people:[{name:'Ada',favorites:['Studio Ghibli']},{name:'Bea',favorites:['Miyazaki']} ]});
  assert.notEqual(food.ranked[0].id,animation.ranked[0].id);
});
test('agent rejects ambiguous or undersized group input',async()=>{
  await assert.rejects(()=>runAgent({mode:'demo',people:[{name:'Ada',favorite:'Jazz'}]}),/2 and 5/);
  await assert.rejects(()=>runAgent({...group,people:[...group.people,{name:'ada',favorite:'Books'}]}),/distinct/);
});
test('live mode fails explicitly when no Qloo key is configured',async()=>{
  const prior=process.env.QLOO_API_KEY; delete process.env.QLOO_API_KEY;
  await assert.rejects(()=>runAgent({...group,mode:'live'}),{message:/not configured/});
  if(prior)process.env.QLOO_API_KEY=prior;
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {runAgent,resolvePersonFavorites} from '../src/agent.js';

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

test('live place mode requires a city before calling Qloo',async()=>{
  const old=process.env.QLOO_API_KEY;
  process.env.QLOO_API_KEY='test-only-placeholder';
  try { await assert.rejects(()=>runAgent({...group,mode:'live',city:''}),/Choose a city/); }
  finally { if(old===undefined)delete process.env.QLOO_API_KEY;else process.env.QLOO_API_KEY=old; }
});

test('an explicitly selected Qloo ID is used instead of ambiguous name matching',async()=>{
  const movieId='057DA9D9-399B-437E-8BCA-A80E499125EF';
  const calls=[];
  const matches=await resolvePersonFavorites({
    favorites:['Interstellar','Jazz'],
    selectedEntities:[{name:'Interstellar',id:movieId,type:'urn:entity:movie'}]
  },async name=>{
    calls.push(name);
    return {status:'resolved',exact:{id:'00000000-0000-0000-0000-000000000001',name},matches:[],url:'/search?query='+name};
  });
  assert.deepEqual(calls,['Jazz']);
  assert.equal(matches[0].exact.id,movieId);
  assert.equal(matches[0].exact.type,'urn:entity:movie');
  assert.equal(matches[0].picked,true);
  assert.equal(matches[1].exact.name,'Jazz');
});
test('malformed Qloo entity IDs are rejected before any upstream API calls',async()=>{
  await assert.rejects(()=>runAgent({...group,people:[
    {name:'Ada',favorites:['Interstellar'],selectedEntities:[{name:'Interstellar',id:'../secrets'}]},
    {name:'Bea',favorites:['Jazz']}
  ]}),/Invalid Qloo entity identifier/);
});

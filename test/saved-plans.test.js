import test from 'node:test';
import assert from 'node:assert/strict';
import {PLAN_STORAGE_KEY,MAX_DEVICE_PLANS,createPlanArchive,loadDevicePlans,saveDevicePlan,removeDevicePlan} from '../public/saved-plans.js';

const brief={mode:'live',domain:'places',city:'Oslo',budget:'mid',people:[
  {name:'Maya',favorites:['Studio Ghibli']},
  {name:'Jon',favorites:['Jazz']}
]};
const result={mode:'live',domain:'places',city:'Oslo',people:[{id:'maya-1',name:'Maya'},{id:'jon-2',name:'Jon'}],ranked:[{id:'pick',name:'Some Qloo place',score:76,coverage:1,sufficient:true,vetoed:false}],decisionStyle:'balanced'};
function memory(){const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),raw:map};}

test('saving is explicit and stores only a normalized brief and plan summary',()=>{
  const storage=memory();
  const archive=createPlanArchive(brief,result,{id:'test-1',savedAt:'2026-10-28T20:00:00.000Z'});
  assert.equal(storage.getItem(PLAN_STORAGE_KEY),null);
  assert.equal(archive.winner,'Some Qloo place');
  assert.equal(archive.brief.city,'Oslo');
  saveDevicePlan(storage,archive);
  assert.equal(loadDevicePlans(storage).length,1);
  const stored=storage.getItem(PLAN_STORAGE_KEY);
  assert.ok(stored.includes('Maya'));
  assert.equal(stored.includes('QLOO_API_KEY'),false);
});
test('the device library can reopen and delete entries',()=>{
  const storage=memory();
  const archived=createPlanArchive(brief,result,{id:'test-2'});
  saveDevicePlan(storage,archived);
  assert.equal(loadDevicePlans(storage)[0].id,'test-2');
  removeDevicePlan(storage,'test-2');
  assert.deepEqual(loadDevicePlans(storage),[]);
});
test('malformed storage entries are ignored without throwing',()=>{
  const storage=memory();
  storage.setItem(PLAN_STORAGE_KEY,'broken{');
  assert.deepEqual(loadDevicePlans(storage),[]);
  storage.setItem(PLAN_STORAGE_KEY,JSON.stringify([{id:'danger',savedAt:'not a date',brief:{people:[]},summary:'text'}]));
  assert.deepEqual(loadDevicePlans(storage),[]);
});
test('device library retains no more than eight most recent saves',()=>{
  const storage=memory();
  for(let i=0;i<MAX_DEVICE_PLANS+3;i++)saveDevicePlan(storage,createPlanArchive(brief,result,{id:'plan-'+i}));
  const plans=loadDevicePlans(storage);
  assert.equal(plans.length,MAX_DEVICE_PLANS);
  assert.equal(plans[0].id,'plan-'+(MAX_DEVICE_PLANS+2));
  assert.equal(plans.at(-1).id,'plan-3');
});
test('saving a plan is not a Qloo request and requires meaningful data',()=>{
  assert.throws(()=>createPlanArchive(brief,result,{}),/unique plan ID/);
  assert.throws(()=>createPlanArchive({...brief,people:[{name:'One',favorites:[]}]},result,{id:'bad'}),/between two and five people/);
});

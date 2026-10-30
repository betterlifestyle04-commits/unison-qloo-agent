import test from 'node:test';
import assert from 'node:assert/strict';
import {PLAN_STORAGE_KEY,MAX_DEVICE_PLANS,createPlanArchive,loadDevicePlans,saveDevicePlan,removeDevicePlan,createDeviceBackup,parseDeviceBackup,importDeviceBackup,DEVICE_BACKUP_FORMAT} from '../public/saved-plans.js';

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


test('exported device backup round-trips through strict, versioned JSON without a network dependency',()=>{
  const storage=memory();
  const first=createPlanArchive(brief,result,{id:'backup-1'});
  saveDevicePlan(storage,first);
  const backup=createDeviceBackup(storage,{exportedAt:'2026-10-30T00:00:00Z'});
  const parsed=JSON.parse(backup);
  assert.equal(parsed.format,DEVICE_BACKUP_FORMAT);
  assert.equal(parsed.version,1);
  assert.equal(parsed.plans.length,1);
  assert.match(backup,/Maya/);
  assert.match(backup,/not encrypted/);
  assert.deepEqual(parseDeviceBackup(backup)[0].brief,first.brief);
  const other=memory();
  assert.deepEqual(importDeviceBackup(other,backup).added,1);
  assert.equal(loadDevicePlans(other)[0].id,first.id);
  assert.deepEqual(importDeviceBackup(other,backup).added,0,'duplicate imports cannot create duplicate entries');
  assert.equal(loadDevicePlans(other).length,1);
});

test('backup import is non-destructive when library is nearly full or includes duplicate IDs',()=>{
  const storage=memory();
  for(let i=0;i<MAX_DEVICE_PLANS-1;i++)saveDevicePlan(storage,createPlanArchive(brief,result,{id:'existing-'+i}));
  const prior=loadDevicePlans(storage);
  const remote=memory();
  for(let i=0;i<3;i++)saveDevicePlan(remote,createPlanArchive(brief,result,{id:'remote-'+i}));
  const imported=importDeviceBackup(storage,createDeviceBackup(remote));
  assert.equal(imported.added,1);
  assert.equal(imported.skipped,2);
  assert.equal(imported.plans.length,MAX_DEVICE_PLANS);
  assert.ok(prior.every(item=>imported.plans.some(saved=>saved.id===item.id)),'import must not evict existing plans');
});

test('bad, unsupported and duplicate backups cannot modify local storage',()=>{
  const storage=memory();
  saveDevicePlan(storage,createPlanArchive(brief,result,{id:'base'}));
  const before=storage.getItem(PLAN_STORAGE_KEY);
  const backup=JSON.parse(createDeviceBackup(storage));
  const samples=[
    '{}','not json',JSON.stringify({...backup,version:2}),
    JSON.stringify({...backup,plans:[backup.plans[0],backup.plans[0]]}),
    JSON.stringify({...backup,plans:[{...backup.plans[0],brief:{people:[]}}]}),
    ' '.repeat(100_001)
  ];
  for(const sample of samples){
    assert.throws(()=>importDeviceBackup(storage,sample));
    assert.equal(storage.getItem(PLAN_STORAGE_KEY),before);
  }
  assert.throws(()=>createDeviceBackup(memory()),/Save at least one plan/);
});

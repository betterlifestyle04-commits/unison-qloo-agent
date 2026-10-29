import test from 'node:test';
import assert from 'node:assert/strict';
import {runAgent} from '../src/agent.js';

const group={mode:'live',domain:'places',city:'Oslo',budget:'mid',people:[
 {name:'Ada',favorites:['Jazz']},{name:'Bea',favorites:['Knives Out']}
]};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function fakeTools({partial=false,empty=false,contaminated=false}={}){
 const calls=[];
 return {
  calls,
  isLiveConfigured:()=>true,
  async searchFavorite(favorite){
   calls.push({tool:'search',favorite});
   await sleep(favorite==='Jazz'?11:1);
   return {status:'resolved',exact:{id:'urn:entity:movie:'+favorite.replaceAll(' ','-'),name:favorite},matches:[],url:'/search?query='+encodeURIComponent(favorite),cached:false};
  },
  async insights(entities,domain,params){
   const person=entities[0].includes('Jazz')?'Ada':'Bea';
   const evaluation=Array.isArray(params.shortlist)&&params.shortlist.length>0;
   calls.push({tool:'insights',person,domain,city:params.city,budget:params.budget,evaluation,shortlist:params.shortlist||[]});
   await sleep(person==='Ada'?13:1);
   if(empty)return {results:[],url:'/v2/insights?stage=empty',cached:false};
   const shared={id:'qloo-shared',name:'Shared Venue',type:'urn:entity:place',affinity:83};
   const unique={id:'qloo-'+person,name:person+' Venue',type:'urn:entity:place',affinity:null};
   const results=partial&&evaluation&&person==='Bea'?[]:[shared,unique];
   if(contaminated&&evaluation){
     // Simulate a broken or unexpected Qloo response ignoring the requested whitelist.
     results.unshift({id:'not-requested',name:'Unrequested result',type:'urn:entity:place'});
     results.push(shared);
     results.push({id:'wrong-domain',name:'Film in place response',type:'urn:entity:movie'});
   }

   return {results,url:'/v2/insights?stage='+(evaluation?'comparison':'discovery')+'&person='+person,cached:false};
  }
 };
}
test('full two-pass live Qloo workflow preserves source provenance and stable trace order',async()=>{
 const tools=fakeTools();
 const result=await runAgent(group,{qlooTools:tools});
 assert.equal(result.mode,'live');
 assert.equal(result.domain,'places');
 assert.equal(result.city,'Oslo');
 assert.equal(result.people.length,2);
 assert.equal(tools.calls.filter(c=>c.tool==='search').length,2);
 assert.equal(tools.calls.filter(c=>c.tool==='insights'&&!c.evaluation).length,2);
 assert.equal(tools.calls.filter(c=>c.tool==='insights'&&c.evaluation).length,2);
 assert.ok(tools.calls.filter(c=>c.tool==='insights').every(c=>c.city==='Oslo'&&c.budget==='mid'));
 assert.ok(tools.calls.filter(c=>c.evaluation).every(c=>c.shortlist.includes('qloo-shared')));
 assert.equal(result.ranked[0].name,'Shared Venue');
 assert.equal(result.ranked[0].sufficient,true);
 assert.equal(result.ranked[0].coverage,1);
 assert.equal(result.ranked[0].signals[result.people[0].id],100);
 assert.equal(result.ranked[0].signals[result.people[1].id],100);
 assert.equal(result.ranked[0].observedAffinityByPerson[result.people[0].id],83);
 assert.match(result.disclaimer,/rank-derived estimates/);
 assert.deepEqual(result.trace.filter(t=>t.kind==='qloo').map(t=>t.step+': '+(t.detail.includes('Ada')?'Ada':'Bea')),[
  'Qloo entity resolution: Ada','Qloo entity resolution: Bea',
  'Qloo discovery tool: Ada','Qloo discovery tool: Bea',
  'Qloo shortlist evaluation tool: Ada','Qloo shortlist evaluation tool: Bea'
 ]);
 assert.ok(result.trace.every(t=>['local','qloo','demo'].includes(t.kind)));
});
test('missing Qloo response for a participant remains unknown, never invented',async()=>{
 const tools=fakeTools({partial:true});
 const result=await runAgent(group,{qlooTools:tools});
 assert.equal(result.needsMoreEvidence,true);
 assert.equal(result.supported.length,0);
 const shared=result.ranked.find(x=>x.id==='qloo-shared');
 assert.equal(shared.sufficient,false);
 assert.equal(shared.coverage,.5);
 assert.equal(shared.signals[result.people[1].id],undefined);
 assert.match(result.nextAction,/No candidate has observed evidence/);
});
test('valid empty Qloo discovery fails clearly without simulated fallbacks',async()=>{
 const tools=fakeTools({empty:true});
 await assert.rejects(()=>runAgent(group,{qlooTools:tools}),/Qloo returned no candidates/);
 assert.equal(tools.calls.filter(x=>x.evaluation).length,0);
});
test('live place city is mandatory before the fake Qloo tools run',async()=>{
 const tools=fakeTools();
 await assert.rejects(()=>runAgent({...group,city:''},{qlooTools:tools}),/Choose a city/);
 assert.equal(tools.calls.length,0);
});

test('live evaluation excludes foreign, wrong-type and duplicate Qloo results before scoring',async()=>{
  const tools=fakeTools({contaminated:true});
  const result=await runAgent(group,{qlooTools:tools});
  assert.deepEqual(result.ranked.map(item=>item.id).sort(),['qloo-Ada','qloo-Bea','qloo-shared']);
  assert.equal(result.quality.shortlistSize,3);
  assert.equal(result.quality.evaluation.outsideShortlist,2);
  assert.equal(result.quality.evaluation.wrongType,2);
  assert.equal(result.quality.evaluation.duplicates,2);
  assert.equal(result.quality.evaluation.accepted,4);
  const shared=result.ranked.find(item=>item.id==='qloo-shared');
  assert.equal(shared.sufficient,true);
  assert.equal(shared.signals[result.people[0].id],100);
  assert.equal(shared.signals[result.people[1].id],100);
  assert.ok(result.trace.some(step=>step.step==='Shortlist integrity gate'&&step.kind==='local'&&step.detail.includes('unrequested entities')));
});

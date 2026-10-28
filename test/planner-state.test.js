import test from 'node:test';
import assert from 'node:assert/strict';
import {starterGroups,normalizeBrief,encodeShareBrief,decodeShareBrief,applyVetoLocally,buildGroupSummary} from '../public/planner-state.js';

const sample={domain:'places',mode:'live',city:'Oslo',budget:'mid',people:[
  {name:'Søren',favorites:['映画', 'Jazz']},{name:'Maya',favorites:['Interstellar']}
]};
test('shareable group links preserve Unicode and strip unknown fields',()=>{
  const encoded=encodeShareBrief({...sample,internalSecret:'SHOULD_NOT_LEAK'});
  assert.match(encoded,/^[A-Za-z0-9_-]+$/);
  const restored=decodeShareBrief('#plan='+encoded);
  assert.deepEqual(restored,normalizeBrief(sample));
  assert.equal(JSON.stringify(restored).includes('SHOULD_NOT_LEAK'),false);
});
test('shared group links reject unsupported data without code execution',()=>{
  assert.throws(()=>decodeShareBrief('#plan=notvalid!!!!!'),/not a UNISON/i);
  assert.throws(()=>decodeShareBrief('#plan=eyJ2IjoyfQ'),/unsupported version/i);
  assert.throws(()=>normalizeBrief({...sample,people:[{name:'X',favorites:['A']}]}),/between two and five/i);
  assert.throws(()=>normalizeBrief({...sample,people:[{name:'Maya',favorites:['X']},{name:'maya',favorites:['Y']}]}),/different names/i);
});
test('samples include at least two distinct participants with usable preferences',()=>{
  for(const preset of starterGroups){
    const cleaned=normalizeBrief(preset);
    assert.ok(cleaned.people.length>=2);
    assert.ok(cleaned.people.every(person=>person.favorites.length>=1));
  }
});
const plan={
  mode:'demo',domain:'movies',city:'',people:[{id:'a',name:'A'},{id:'b',name:'B'}],
  ranked:[
    {id:'first',name:'First',score:87,coverage:1,sufficient:true,signals:{a:90,b:80},explanation:'High relative fit',vetoed:false},
    {id:'second',name:'Second',score:75,coverage:1,sufficient:true,signals:{a:80,b:70},explanation:'Next best',vetoed:false}
  ],trace:[{step:'Discovery',kind:'qloo',detail:'Cached Qloo evidence'}]
};
test('local veto reorders without changing original Qloo evidence or group scores',()=>{
  const revised=applyVetoLocally(plan,['first']);
  assert.equal(revised.ranked[0].id,'second');
  assert.equal(revised.ranked[1].score,null);
  assert.equal(revised.supported.length,1);
  assert.equal(revised.trace[0].kind,'qloo');
  assert.match(revised.trace.at(-1).detail,/no new Qloo request/i);
  assert.equal(plan.ranked[0].score,87);
  const restored=applyVetoLocally(plan,[]);
  assert.equal(restored.ranked[0].id,'first');
  assert.equal(restored.ranked[0].score,87);
});
test('all vetoed candidates result in a clear next action, not a false winner',()=>{
  const result=applyVetoLocally(plan,['first','second']);
  assert.equal(result.supported.length,0);
  assert.equal(result.needsMoreEvidence,true);
  assert.match(result.nextAction,/restore a veto/i);
});
test('copied plan labels relative scores and demo evidence honestly',()=>{
  const summary=buildGroupSummary(plan);
  assert.match(summary,/Top pick: First/);
  assert.match(summary,/fictional demo/i);
  assert.match(summary,/relative-fit estimates/i);
});

test('decision styles change tradeoffs without modifying observed source evidence',()=>{
  const source={
    ...plan,
    ranked:[
      {id:'safe',name:'Safe',score:71.5,minimum:64,average:75,coverage:1,sufficient:true,vetoed:false,signals:{a:64,b:86}},
      {id:'popular',name:'Popular',score:70.5,minimum:55,average:88,coverage:1,sufficient:true,vetoed:false,signals:{a:55,b:99}}
    ]
  };
  const protective=applyVetoLocally(source,[],'protective');
  const average=applyVetoLocally(source,[],'average');
  assert.equal(protective.ranked[0].id,'safe');
  assert.equal(average.ranked[0].id,'popular');
  assert.equal(source.ranked[0].score,71.5);
  assert.equal(protective.decisionStyle,'protective');
  assert.equal(average.decisionStyle,'average');
  assert.ok(average.trace.some(step=>/no new Qloo request/i.test(step.detail)));
});

test('specific Qloo entity identity survives a shareable brief',()=>{
  const pinned={...sample,people:[
    {name:'Alex',favorites:['Interstellar'],selectedEntities:[{name:'Interstellar',id:'057DA9D9-399B-437E-8BCA-A80E499125EF',type:'urn:entity:movie'}]},
    {name:'Sam',favorites:['Jazz']}
  ]};
  const decoded=decodeShareBrief('#plan='+encodeShareBrief(pinned));
  assert.equal(decoded.people[0].selectedEntities[0].id,'057DA9D9-399B-437E-8BCA-A80E499125EF');
  assert.equal(decoded.people[0].selectedEntities[0].type,'urn:entity:movie');
  assert.equal(decoded.people[1].selectedEntities,undefined);
});
test('shared Qloo entity selections are only accepted for listed favorites',()=>{
  const invalid={...sample,people:[
    {name:'Alex',favorites:['Interstellar'],selectedEntities:[{name:'Not listed',id:'057DA9D9-399B-437E-8BCA-A80E499125EF'}]},
    {name:'Sam',favorites:['Jazz']}
  ]};
  assert.throws(()=>normalizeBrief(invalid),/Invalid selected Qloo entity/);
});

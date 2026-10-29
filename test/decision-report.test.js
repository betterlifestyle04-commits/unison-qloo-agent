import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDecisionReport,reportFilename} from '../public/decision-report.js';

const result={
  mode:'live',domain:'places',city:'Oslo',people:[{id:'ada-1',name:'Ada'},{id:'bea-2',name:'Bea'}],
  ranked:[
    {id:'one',name:'Shared match',score:84.2,minimum:72,average:85,coverage:1,sufficient:true,vetoed:false,signals:{'ada-1':72,'bea-2':98},explanation:'Group compromise',evidence:'Observed Qloo candidate'},
    {id:'two',name:'Incomplete',score:null,minimum:90,average:90,coverage:.5,sufficient:false,vetoed:false,signals:{'ada-1':90},explanation:'Only one person has signal'}
  ],
  trace:[{kind:'qloo',step:'Qloo discovery tool',detail:'Queried cultural entities.'},{kind:'local',step:'Evaluation',detail:'Combined group evidence.'}]
};
test('real decision report distinguishes provenance and incomplete evidence',()=>{
  const report=buildDecisionReport(result,{brief:{people:[{name:'Ada',favorites:['Jazz']},{name:'Bea',favorites:['Knives Out']}]},decisionStyle:'protective',ballots:{one:{'ada-1':'yes','bea-2':'yes'}},createdAt:'2026-10-29T00:00:00Z'});
  assert.match(report,/LIVE QLOO CANDIDATES — UNISON-DERIVED SCORES/);
  assert.match(report,/All-Yes human agreement: Shared match/);
  assert.match(report,/Decision style: protective/);
  assert.match(report,/Bea: No observed signal/);
  assert.match(report,/\[Real Qloo tool request\]/);
  assert.match(report,/\[Local computation\]/);
  assert.match(report,/No reservation or booking/i);
  assert.match(report,/Jazz/);
});
test('demo report is loudly labeled fictional and does not overclaim Qloo',()=>{
  const report=buildDecisionReport({...result,mode:'demo',trace:[{kind:'demo',step:'Simulated evidence tool',detail:'Fictional'}]});
  assert.match(report,/FICTIONAL DEMO — NOT REAL QLOO RECOMMENDATIONS/);
  assert.match(report,/\[Fictional demonstration step\]/);
  assert.match(report,/No account, booking or calendar invitation/);
});
test('untrusted group text is rendered as inert Markdown text',()=>{
  const report=buildDecisionReport({...result,people:[{id:'ada-1',name:'<script>alert(1)<\/script>'},{id:'bea-2',name:'Bea'}],ranked:[{...result.ranked[0],name:'<img src=x onerror=alert(1)>'}]});
  assert.doesNotMatch(report,/<script>|<img/);
  assert.match(report,/&lt;script&gt;/);
  assert.match(report,/&lt;img/);
});
test('reports are opt-in and require a finished, typed result',()=>{
  assert.throws(()=>buildDecisionReport(null),/completed UNISON result/i);
  assert.throws(()=>buildDecisionReport({...result,people:[]}),/At least two people/);
  assert.equal(reportFilename('live',new Date('2026-10-29T00:00:00Z')),'unison-decision-live-2026-10-29.md');
});

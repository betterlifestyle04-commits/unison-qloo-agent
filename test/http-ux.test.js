import test from 'node:test';
import assert from 'node:assert/strict';
import {server} from '../server.js';
async function request(path,options={}){const response=await fetch('http://127.0.0.1:'+server.address().port+path,options);return {response,body:await response.text()};}
test.before(async()=>new Promise(resolve=>server.listen(0,'127.0.0.1',resolve)));
test.after(async()=>new Promise(resolve=>server.close(resolve)));

test('browser planning utilities are served as first-party JavaScript',async()=>{
  const module=await request('/planner-state.js');
  assert.equal(module.response.status,200);
  assert.match(module.response.headers.get('content-type'),/javascript/);
  assert.match(module.body,/applyVetoLocally/);
});
test('malformed participant structures fail safely with a 400 response',async()=>{
  for(const people of ['not-an-array',[null,null],[{name:'A',favorites:['X','Y','Z','Too many']},{name:'B',favorites:['Z']}]]){
    const answer=await request('/api/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'demo',domain:'movies',people})});
    assert.equal(answer.response.status,400);
    assert.ok(JSON.parse(answer.body).error);
  }
});

test('live cultural search is unavailable without a server-side key',async()=>{
  const r=await request('/api/taste-lookup?q=Interstellar');
  assert.equal(r.response.status,503);
  assert.match(JSON.parse(r.body).error,/not currently available/i);
});
test('session-only vote utilities are served with the correct MIME type',async()=>{
  const r=await request('/ballot.js');
  assert.equal(r.response.status,200);
  assert.match(r.response.headers.get('content-type'),/javascript/);
  assert.match(r.body,/summarizeBallot/);
});
test('frontend keeps demo mode opt-in and provides clipboard fallback',async()=>{
  const r=await request('/app.js');
  assert.equal(r.response.status,200);
  assert.match(r.body,/async function copyText/);
  assert.match(r.body,/document\.execCommand\('copy'\)/);
  assert.doesNotMatch(r.body,/if\(app\.configured&&!app\.hasChangedMode\)\{live\.checked=true;/);
  assert.match(r.body,/Qloo request/);
});

test('sample groups and shared plans never auto-opt into live Qloo',async()=>{
  const r=await request('/app.js');
  assert.equal(r.response.status,200);
  assert.match(r.body,/applyBrief\(\{\.\.\.preset,mode:currentMode\(\)\}\)/);
  assert.match(r.body,/applyBrief\(\{\.\.\.decodeShareBrief\(location\.hash\),mode:'demo'\}\)/);
  assert.doesNotMatch(r.body,/applyBrief\(\{\.\.\.preset,mode:app\.configured\?'live':'demo'\}\)/);
});

test('Decision Lab and device save modules are served with JavaScript MIME type',async()=>{
  for(const module of ['/saved-plans.js','/planner-state.js']){
    const {response,body}=await request(module);
    assert.equal(response.status,200);
    assert.match(response.headers.get('content-type'),/application\/javascript/);
    assert.ok(body.length>100);
  }
});
test('real results UI offers a non-automatic on-device save action',async()=>{
  const {response,body}=await request('/app.js');
  assert.equal(response.status,200);
  assert.match(body,/createPlanArchive/);
  assert.match(body,/saveDevicePlan/);
  assert.match(body,/analyzeDecisionTradeoffs/);
});

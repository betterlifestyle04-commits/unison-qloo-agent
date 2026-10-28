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

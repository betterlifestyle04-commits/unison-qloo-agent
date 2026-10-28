import test from 'node:test';
import assert from 'node:assert/strict';
import {server} from '../server.js';

async function request(path,options={}){const response=await fetch(`http://127.0.0.1:${server.address().port}${path}`,options);return {response,body:await response.text()};}
test.before(async()=>await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve)));
test.after(async()=>await new Promise(resolve=>server.close(resolve)));
test('status and homepage are available without a key',async()=>{
  const status=await request('/api/status'); assert.equal(status.response.status,200); assert.equal(JSON.parse(status.body).mode,'demo');
  const home=await request('/'); assert.equal(home.response.status,200); assert.match(home.body,/Different tastes/);
});
test('plan endpoint validates input and produces demo result',async()=>{
  const invalid=await request('/api/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:'nope'});assert.equal(invalid.response.status,400);
  const plan=await request('/api/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'demo',people:[{name:'Ada',favorite:'Jazz'},{name:'Bea',favorite:'Manga'}]})});assert.equal(plan.response.status,200);assert.equal(JSON.parse(plan.body).ranked.length,5);
});

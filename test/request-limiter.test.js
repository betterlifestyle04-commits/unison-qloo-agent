import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequestLimiter} from '../src/request-limiter.js';

test('plan limiter permits only configured requests per client and resets each minute',()=>{
  const limiter=createRequestLimiter({limit:2,windowMs:60_000,maxClients:5});
  assert.equal(limiter.allow('a',0),true);
  assert.equal(limiter.allow('a',1000),true);
  assert.equal(limiter.allow('a',2000),false);
  assert.equal(limiter.allow('b',2000),true);
  assert.equal(limiter.allow('a',60_000),true);
});
test('memory use stays bounded as many new clients appear',()=>{
  const limiter=createRequestLimiter({limit:1,windowMs:60_000,maxClients:3});
  for(let i=0;i<20;i++)assert.equal(limiter.allow('client-'+i,i),true);
  assert.equal(limiter.tracked(),3);
  assert.equal(limiter.allow('client-19',21),false);
  assert.equal(limiter.allow('client-0',21),true);
  assert.equal(limiter.tracked(),3);
});
test('expired clients are pruned and cannot accumulate',()=>{
  const limiter=createRequestLimiter({limit:1,windowMs:10,maxClients:3});
  limiter.allow('old-a',0);
  limiter.allow('old-b',0);
  limiter.allow('new-c',15);
  limiter.allow('new-d',16);
  assert.ok(limiter.tracked()<=3);
  limiter.clear();
  assert.equal(limiter.tracked(),0);
});
test('invalid limiter configurations or clients are refused',()=>{
  assert.throws(()=>createRequestLimiter({limit:0}),/Invalid/);
  assert.throws(()=>createRequestLimiter({limit:2,maxClients:0}),/Invalid/);
  assert.throws(()=>createRequestLimiter({limit:1}).allow(''),/client identifier/);
});

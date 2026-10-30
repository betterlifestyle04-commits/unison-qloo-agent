import test from 'node:test';
import assert from 'node:assert/strict';
import {planningRecovery} from '../public/recovery.js';

test('rate limiting suggests waiting instead of retrying or silently falling back',()=>{
  const r=planningRecovery(429,'Too many requests',{mode:'live'});
  assert.match(r.title,/Too many/);
  assert.match(r.suggestions.join(' '),/request window/);
  assert.equal(r.showDemo,true);
  assert.equal(r.canRetry,false);
});
test('ambiguous Qloo favorites point toward explicit Taste Finder disambiguation',()=>{
  const r=planningRecovery(422,"Please clarify Ada's favorite using Taste Finder",{mode:'live'});
  assert.match(r.title,/clarification/i);
  assert.match(r.suggestions.join(' '),/Taste Finder/);
  assert.equal(r.showDemo,true);
});
test('valid zero Qloo candidates are unknown, not disapproval',()=>{
  const r=planningRecovery(422,'Qloo returned no candidates',{mode:'live',domain:'places'});
  assert.match(r.title,/No suitable/);
  assert.match(r.detail,/missing evidence/i);
  assert.match(r.suggestions.join(' '),/price limit/);
  assert.match(r.suggestions.join(' '),/city/);
});
test('unavailable and upstream outages remain clearly distinct from fictional data',()=>{
  const down=planningRecovery(503,'Qloo not available',{mode:'live'});
  assert.match(down.title,/not available/i);
  assert.match(down.detail,/not pretend/i);
  const timeout=planningRecovery(502,'Qloo timeout',{mode:'live'});
  assert.match(timeout.title,/could not complete/);
  assert.match(timeout.suggestions.join(' '),/later/);
});
test('demo errors never mislead user toward a live service switch',()=>{
  const r=planningRecovery(400,'Invalid group',{mode:'demo'});
  assert.equal(r.showDemo,false);
  assert.match(r.title,/Check the group brief/);
});

test('user cancellation is not represented as a completed server-side cancellation',()=>{
  const r=planningRecovery(0,'Stopped waiting',{mode:'live',interruption:'cancelled'});
  assert.match(r.title,/stopped waiting/i);
  assert.match(r.detail,/server may still continue and use API quota/);
  assert.match(r.suggestions.join(' '),/only if needed/);
});
test('timeout gives actionable feedback without claiming Qloo dislikes a group',()=>{
  const r=planningRecovery(0,'Timeout',{mode:'live',interruption:'timeout'});
  assert.match(r.title,/took too long/);
  assert.match(r.detail,/may still be processing/);
  assert.match(r.suggestions.join(' '),/Avoid repeated submissions/);
});

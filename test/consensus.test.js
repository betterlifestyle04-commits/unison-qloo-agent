import test from 'node:test';
import assert from 'node:assert/strict';
import {agreementPulse} from '../public/consensus.js';
const people=[{id:'a',name:'Ada'},{id:'b',name:'Bea'},{id:'c',name:'Cam'}];
const ranked=[{id:'top',name:'Top choice',score:85,sufficient:true,vetoed:false},{id:'other',name:'Other option',score:76,sufficient:true,vetoed:false},{id:'partial',name:'Incomplete',score:null,sufficient:false,vetoed:false}];
const result={people,ranked};
test('no-vote pulse invites human feedback without inventing approval',()=>{
 const pulse=agreementPulse(result,{});
 assert.equal(pulse.top.name,'Top choice');
 assert.equal(pulse.top.voted,0);
 assert.equal(pulse.unanimous.length,0);
 assert.match(pulse.nextAction,/each participant/i);
 assert.equal(pulse.choices.length,2);
});
test('missing responses list only genuinely non-voting people',()=>{
 const pulse=agreementPulse(result,{top:{a:'yes',b:'maybe'}});
 assert.equal(pulse.top.voted,2);
 assert.deepEqual(pulse.top.missing,['Cam']);
 assert.match(pulse.nextAction,/Cam/);
});
test('rejected leader suggests an alternative for discussion, never auto-substitutes it',()=>{
 const votes={top:{a:'no',b:'yes'},other:{a:'yes',b:'yes'}};
 const pulse=agreementPulse(result,votes);
 assert.equal(pulse.top.id,'top');
 assert.equal(pulse.suggestion.id,'other');
 assert.match(pulse.message,/voted No/i);
 assert.match(pulse.nextAction,/Other option/);
 assert.equal(result.ranked[0].score,85);
});
test('unanimity requires explicit Yes from every person',()=>{
 const no={top:{a:'yes',b:'yes',c:'maybe'}};
 assert.equal(agreementPulse(result,no).unanimous.length,0);
 const yes={top:{a:'yes',b:'yes',c:'yes'}};
 const pulse=agreementPulse(result,yes);
 assert.equal(pulse.unanimous.length,1);
 assert.match(pulse.message,/Everyone has voted Yes/i);
});
test('vetoed and incomplete candidate votes never become consensus',()=>{
 const altered={people,ranked:[{...ranked[0],vetoed:true},ranked[2]]};
 const pulse=agreementPulse(altered,{top:{a:'yes',b:'yes',c:'yes'}});
 assert.equal(pulse.top,null);
 assert.equal(pulse.unanimous.length,0);
 assert.match(pulse.nextAction,/Revise the group brief/i);
});

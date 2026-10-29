import test from 'node:test';
import assert from 'node:assert/strict';
import {compareOptions,eligibleComparisons} from '../public/head-to-head.js';
const people=[{id:'a',name:'Ada'},{id:'b',name:'Bea'},{id:'c',name:'Cam'}];
const ranked=[
 {id:'fair',name:'Fairer option',score:80,minimum:60,average:76.7,sufficient:true,vetoed:false,signals:{a:60,b:80,c:90}},
 {id:'popular',name:'Popular option',score:79,minimum:55,average:78.3,sufficient:true,vetoed:false,signals:{a:55,b:90,c:90}},
 {id:'missing',name:'Incomplete',score:null,sufficient:false,vetoed:false,signals:{a:100,b:100}},
 {id:'veto',name:'Vetoed',score:null,sufficient:true,vetoed:true,signals:{a:95,b:95,c:95}}
];
const plan={mode:'live',people,ranked};
test('comparison highlights who gains and who loses without inventing preferences',()=>{
 const compared=compareOptions(plan,'fair','popular');
 assert.equal(compared.leftWins,1);
 assert.equal(compared.rightWins,1);
 assert.equal(compared.ties,1);
 assert.equal(compared.people.find(p=>p.id==='a').difference,5);
 assert.equal(compared.people.find(p=>p.id==='b').difference,-10);
 assert.equal(compared.minimumAdvantage,5);
 assert.match(compared.explanation,/higher lowest relative-fit/);
 assert.match(compared.source,/ordinal estimates derived from Qloo/);
 assert.equal(plan.ranked[0].score,80);
});
test('incomplete, vetoed and identical options cannot be compared',()=>{
 assert.deepEqual(eligibleComparisons(plan).map(x=>x.id),['fair','popular']);
 assert.throws(()=>compareOptions(plan,'fair','missing'),/two different fully supported/);
 assert.throws(()=>compareOptions(plan,'fair','veto'),/two different fully supported/);
 assert.throws(()=>compareOptions(plan,'fair','fair'),/two different fully supported/);
});
test('demo comparison identifies fictional source accurately',()=>{
 const result=compareOptions({...plan,mode:'demo'},'fair','popular');
 assert.match(result.source,/Fictional demonstration evidence/);
});

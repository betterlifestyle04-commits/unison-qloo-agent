import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeGroupStability} from '../public/group-stability.js';
const group={mode:'demo',people:[{id:'a',name:'Ada'},{id:'b',name:'Bea'},{id:'c',name:'Cam'}],ranked:[
 {id:'safe',name:'Fair option',score:80,minimum:70,average:70,coverage:1,sufficient:true,vetoed:false,signals:{a:70,b:70,c:70}},
 {id:'risky',name:'Polarizing option',score:61,minimum:30,average:70,coverage:1,sufficient:true,vetoed:false,signals:{a:90,b:90,c:30}},
 {id:'partial',name:'Partial candidate',score:null,sufficient:false,vetoed:false,signals:{a:100,b:100}}
]};
test('decision stability identifies a pivotal contribution without dropping anyone from the actual group',()=>{
 const report=analyzeGroupStability(group);
 assert.equal(report.comparable,true);
 assert.equal(report.winner.id,'safe');
 assert.equal(report.changes,1);
 assert.equal(report.stable,false);
 assert.deepEqual(report.trials.filter(x=>x.changesWinner).map(x=>x.personName),['Cam']);
 assert.equal(report.trials.find(x=>x.personName==='Cam').winnerId,'risky');
 assert.match(report.explanation,/Each participant still matters/);
 assert.equal(group.ranked[0].id,'safe');
});
test('winner remains stable when every person favors the same option',()=>{
 const stable={...group,ranked:[
  {...group.ranked[0],signals:{a:95,b:95,c:95},minimum:95,average:95},
  {...group.ranked[1],signals:{a:70,b:70,c:70},minimum:70,average:70}
 ]};
 const report=analyzeGroupStability(stable);
 assert.equal(report.stable,true);
 assert.equal(report.changes,0);
 assert.match(report.explanation,/does not prove/);
});
test('2-person plans cannot be treated as a leave-one-out group',()=>{
 const two={...group,people:group.people.slice(0,2)};
 assert.equal(analyzeGroupStability(two).comparable,false);
 assert.match(analyzeGroupStability(two).reason,/at least three/);
});
test('missing or vetoed alternatives cannot influence a hypothetical comparison',()=>{
 const incomplete={...group,ranked:[group.ranked[0],group.ranked[2]]};
 assert.equal(analyzeGroupStability(incomplete).comparable,false);
 const vetoed={...group,ranked:[group.ranked[0],{...group.ranked[1],vetoed:true}]};
 assert.equal(analyzeGroupStability(vetoed).comparable,false);
});
test('changing fairness weights recomputes a hypothetical outcome using the same data',()=>{
 const report=analyzeGroupStability(group,'average');
 assert.equal(report.comparable,true);
 assert.equal(report.style,'average');
 assert.equal(report.trials.length,3);
 assert.ok(report.trials.every(x=>x.remainingPeople===2));
});

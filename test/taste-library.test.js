import test from 'node:test';
import assert from 'node:assert/strict';
import {TASTE_REFERENCES,filterTasteReferences,appendTasteReference} from '../public/taste-library.js';

test('editorial inspiration lists 36 distinct real cultural names and consistent categories',()=>{
  assert.equal(TASTE_REFERENCES.length,36);
  assert.equal(new Set(TASTE_REFERENCES.map(x=>x.name.toLocaleLowerCase())).size,TASTE_REFERENCES.length);
  assert.ok(TASTE_REFERENCES.every(x=>['films','music','stories','culture'].includes(x.category)&&x.hint&&x.name));
  assert.ok(Object.isFrozen(TASTE_REFERENCES));
  assert.ok(Object.isFrozen(TASTE_REFERENCES[0]));
});
test('search is editorial only, case insensitive and safely bounded',()=>{
  assert.deepEqual(filterTasteReferences({query:'GHIBLI'}).map(x=>x.name),['Studio Ghibli']);
  assert.ok(filterTasteReferences({category:'films'}).every(x=>x.category==='films'));
  assert.deepEqual(filterTasteReferences({query:'not one of these films'}),[]);
  assert.equal(filterTasteReferences({limit:500}).length,TASTE_REFERENCES.length);
  assert.equal(filterTasteReferences({limit:-1}).length,0);
  assert.equal(filterTasteReferences({category:'invalid',limit:4}).length,4);
  assert.deepEqual(filterTasteReferences({category:'stories',query:'mystery'}),[]);
});
test('adding inspiration preserves unique favorites and the planner three-item cap',()=>{
  const one=appendTasteReference('Interstellar','Miles Davis');
  assert.equal(one.ok,true);assert.equal(one.value,'Interstellar, Miles Davis');assert.equal(one.count,2);
  assert.deepEqual(appendTasteReference('Spirited Away, KNIVES OUT','Knives Out').ok,false);
  assert.match(appendTasteReference('Interstellar, Inception, Knives Out','Miles Davis').reason,/three favorites/);
  assert.match(appendTasteReference('','Not a recognized editorial example').reason,/Choose one/);
  assert.equal(appendTasteReference(' ','Radiohead').value,'Radiohead');
  assert.equal(appendTasteReference('  Spirited Away,   ','Studio Ghibli').value,'Spirited Away, Studio Ghibli');
});

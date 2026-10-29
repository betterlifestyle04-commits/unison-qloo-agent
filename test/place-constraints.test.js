import test from 'node:test';
import assert from 'node:assert/strict';
import {describePlaceConstraints,restaurantPriceTierMax,manuallyConfirmedMeetingLocation} from '../public/place-constraints.js';

test('live Oslo locality filter is disclosed without claiming physical address verification',()=>{
 const info=describePlaceConstraints({mode:'live',domain:'places',city:'Oslo',budget:'any'});
 assert.match(info.location,/Oslo/);
 assert.match(info.location,/boundary radius 0/);
 assert.match(info.location,/not independently checked/);
 assert.match(info.price,/No Qloo restaurant price-level cap/);
 assert.equal(info.priceLevel,null);
});
test('budget tiers are restaurant price caps, never known monetary costs for all venues',()=>{
 assert.deepEqual(restaurantPriceTierMax,{low:1,mid:2,high:4});
 for(const [budget,value] of Object.entries(restaurantPriceTierMax)){
  const info=describePlaceConstraints({mode:'live',domain:'places',city:'Oslo',budget});
  assert.equal(info.priceLevel,value);
  assert.match(info.price,/restaurant price-level maximum:/i);
  assert.match(info.price,/not a verified cost/i);
 }
});
test('movie plans do not imply place constraints or a physical destination',()=>{
 assert.equal(describePlaceConstraints({mode:'live',domain:'movies',budget:'mid'}),null);
});
test('fictional venues remain unmistakably fictional',()=>{
 const info=describePlaceConstraints({mode:'demo',domain:'places',budget:'low'});
 assert.match(info.location,/fictional demonstration/i);
 assert.match(info.price,/Fictional price-tier setting/);
});
test('calendar location only comes from an explicit user-provided meeting point',()=>{
 assert.equal(manuallyConfirmedMeetingLocation('  Main entrance, Oslo  '),'Main entrance, Oslo');
 assert.equal(manuallyConfirmedMeetingLocation(''), '');
 assert.equal(manuallyConfirmedMeetingLocation(null),'');
 assert.equal(manuallyConfirmedMeetingLocation('a'.repeat(200)).length,160);
});

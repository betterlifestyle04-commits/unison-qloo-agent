import test from 'node:test';
import assert from 'node:assert/strict';
import {venueCheckItems,updateVenueCheck,venueCheckProgress} from '../public/venue-readiness.js';

test('venue checks begin unchecked, without suggesting an actual verification',()=>{
 const state={};
 assert.equal(venueCheckItems.length,4);
 assert.equal(venueCheckProgress(state,'venue-1').marked,0);
 assert.equal(venueCheckProgress(state,'venue-1').complete,false);
 assert.match(venueCheckProgress(state,'venue-1').label,/marked reviewed/);
});
test('checks are maintained per candidate and survive an ordinary local choice switch',()=>{
 let state={};
 state=updateVenueCheck(state,'venue-1','location',true);
 state=updateVenueCheck(state,'venue-1','hours',true);
 state=updateVenueCheck(state,'venue-2','booking',true);
 assert.equal(venueCheckProgress(state,'venue-1').marked,2);
 assert.equal(venueCheckProgress(state,'venue-2').marked,1);
 state=updateVenueCheck(state,'venue-1','location',false);
 assert.equal(venueCheckProgress(state,'venue-1').marked,1);
});
test('completeness records only human-reviewed items, not booking confirmation',()=>{
 let state={};
 for(const item of venueCheckItems)state=updateVenueCheck(state,'candidate',item.id,true);
 const summary=venueCheckProgress(state,'candidate');
 assert.deepEqual([summary.marked,summary.total,summary.percent,summary.complete],[4,4,100,true]);
 assert.match(summary.label,/independently/);
});
test('invalid keys or untrusted candidate IDs are refused',()=>{
 assert.throws(()=>updateVenueCheck({},'venue-1','nonexistent',true),/valid candidate/);
 assert.throws(()=>updateVenueCheck({},'', 'location',true),/valid candidate/);
 assert.throws(()=>updateVenueCheck({},'venue-1','location','yes'),/boolean/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {matchingHelpItems} from '../public/guide.js';

const items=[
  {topic:'bookings',question:'Does UNISON book a table?',answer:'No confirmed opening hours or bookings.'},
  {topic:'privacy',question:'Where do saved plans live?',answer:'Local browser storage is readable from this browser.'},
  {topic:'source',question:'Is this live Qloo evidence?',answer:'The fictional demo is not a Qloo API request.'}
];
test('help search handles both questions and answers without network requirements',()=>{
  assert.deepEqual(matchingHelpItems(items,'bookings').map(x=>x.topic),['bookings']);
  assert.deepEqual(matchingHelpItems(items,' OPENING ').map(x=>x.topic),['bookings']);
  assert.deepEqual(matchingHelpItems(items,'saved plans').map(x=>x.topic),['privacy']);
  assert.deepEqual(matchingHelpItems(items,'QLOO').map(x=>x.topic),['source']);
  assert.deepEqual(matchingHelpItems(items,'no-match'),[]);
});
test('blank query returns all FAQs and does not alter underlying data',()=>{
  const initial=JSON.stringify(items);
  assert.deepEqual(matchingHelpItems(items),items);
  assert.deepEqual(matchingHelpItems(null,'bookings'),[]);
  assert.equal(JSON.stringify(items),initial);
});

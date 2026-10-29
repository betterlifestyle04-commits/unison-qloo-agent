import test from 'node:test';
import assert from 'node:assert/strict';
import {updateFeedback,summarizeFeedback,exportFeedbackCsv,venueCheckLinks,venueInquiry} from '../public/field-validation.js';
const people=[{id:'a',name:'Ada'},{id:'b',name:'Bea'},{id:'c',name:'Cam'}];
test('feedback only computes paired actual self-reports and never invents an outcome',()=>{
  let data={};
  data=updateFeedback(data,'place-1','a','expected',2);
  data=updateFeedback(data,'place-1','a','experienced',4);
  data=updateFeedback(data,'place-1','b','expected',3);
  data=updateFeedback(data,'place-2','a','experienced',1);
  const report=summarizeFeedback(data,'place-1',people);
  assert.equal(report.paired,1);
  assert.equal(report.expectedMean,2);
  assert.equal(report.experiencedMean,4);
  assert.equal(report.difference,2);
  assert.equal(report.ratings[1].experienced,null);
  assert.match(report.explanation,/not proof UNISON improved happiness/);
  assert.equal(summarizeFeedback(data,'place-2',people).paired,0);
});
test('incomplete feedback has no statistics, and clearing does not affect other people',()=>{
 let data=updateFeedback({},'p','a','expected',5);
 data=updateFeedback(data,'p','a','expected',null);
 const report=summarizeFeedback(data,'p',people);
 assert.equal(report.paired,0);assert.equal(report.difference,null);
 assert.match(report.explanation,/No conclusions/);
});
test('invalid values and candidate identity are rejected',()=>{
 assert.throws(()=>updateFeedback({},'p','a','expected',6),/valid candidate/);
 assert.throws(()=>updateFeedback({},'p','a','expected',2.5),/valid candidate/);
 assert.throws(()=>updateFeedback({},'p','a','other',3),/valid candidate/);
 assert.throws(()=>updateFeedback({},'','a','expected',1),/valid candidate/);
});
test('anonymous CSV contains no participant names, no Qloo keys and a prominent non-causal caveat',()=>{
 let data={};
 data=updateFeedback(data,'p','a','expected',3);
 data=updateFeedback(data,'p','a','experienced',4);
 const report=summarizeFeedback(data,'p',people);
 const csv=exportFeedbackCsv(report);
 assert.match(csv,/SELF-REPORTED - NOT CAUSAL/);
 assert.match(csv,/"Participant 1","3","4","1"/);
 assert.doesNotMatch(csv,/Ada|Bea|Cam|QLOO_API_KEY/);
 assert.match(exportFeedbackCsv(report,{demo:true}),/FICTIONAL DEMO - NOT FIELD EVIDENCE/);
});
test('venue research links are only external searches, not fabricated official booking destinations',()=>{
 const links=venueCheckLinks({name:'Venue & Co',address:'Some Road',city:'Oslo'});
 assert.match(links.maps,/www\.google\.com\/maps\/search/);
 assert.match(links.official,/www\.google\.com\/search/);
 assert.match(decodeURIComponent(links.official),/official website opening hours reservations/);
 assert.equal(venueCheckLinks({name:'Fiction',demo:true}),null);
 const enquiry=venueInquiry({name:'Venue & Co',date:'2026-11-12',time:'18:30',partySize:4});
 assert.match(enquiry,/4 people on 2026-11-12 at 18:30/);
 assert.match(enquiry,/confirm the exact address/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCalendarEvent,agendaText,escapeIcs,utcStamp,foldIcsLine} from '../public/calendar.js';

test('calendar export produces a tentative event in the visitor local time',()=>{
  const now=new Date('2026-10-28T20:00:00Z');
  const input={title:'Our group outing',date:'2026-11-14',startTime:'19:30',durationMinutes:120,location:'Oslo, Norway',notes:'Bring tickets',uid:'unison-case-42'};
  const calendar=buildCalendarEvent(input,now);
  const expectedBegin=new Date(2026,10,14,19,30);
  assert.ok(calendar.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(calendar.endsWith('END:VCALENDAR\r\n'));
  assert.ok(calendar.includes('DTSTART:'+utcStamp(expectedBegin)));
  assert.ok(calendar.includes('DTEND:'+utcStamp(new Date(expectedBegin.getTime()+120*60000))));
  assert.match(calendar,/STATUS:TENTATIVE\r\n/);
  assert.match(calendar,/UID:unison-case-42@unison.local/);
  assert.match(calendar,/No reservation or booking/i);
});
test('calendar values escape punctuation and cannot inject ICS properties',()=>{
  assert.equal(escapeIcs('Fun, food; friends\\'),String.raw`Fun\, food\; friends\\`);
  const ics=buildCalendarEvent({title:'Hello\nBEGIN:ALARM',date:'2026-11-14',startTime:'19:00',uid:'safe-id',location:'Main; Hall'});
  assert.equal((ics.match(/BEGIN:VEVENT/g)||[]).length,1);
  assert.doesNotMatch(ics,/(?:^|\r\n)BEGIN:ALARM(?:\r\n|$)/);
  assert.ok(ics.includes('LOCATION:Main\\; Hall'));
});
test('invalid calendar inputs fail instead of generating misleading meeting details',()=>{
  const baseline={title:'Event',date:'2026-11-14',startTime:'19:00',uid:'test'};
  assert.throws(()=>buildCalendarEvent({...baseline,date:'2026-02-30'}),/does not exist/i);
  assert.throws(()=>buildCalendarEvent({...baseline,startTime:'25:15'}),/Choose a date and time/);
  assert.throws(()=>buildCalendarEvent({...baseline,durationMinutes:10}),/duration/i);
  assert.throws(()=>buildCalendarEvent({...baseline,uid:''}),/identifier/i);
  assert.throws(()=>buildCalendarEvent({...baseline,title:''}),/name/i);
});
test('copying an agenda explicitly says the venue has not been booked',()=>{
  const summary=agendaText({title:'Movie night',date:'2026-11-14',startTime:'19:00',durationMinutes:90,timezone:'Europe/Oslo',location:'Our place'});
  assert.match(summary,/Movie night/);
  assert.match(summary,/Europe\/Oslo/);
  assert.match(summary,/No reservation or booking has been made/);
  assert.throws(()=>agendaText({title:'Movie night',date:'',startTime:''}),/date and time/i);
});

test('iCalendar physical lines are at most 75 UTF-8 octets',()=>{
  const long='Meeting about 🍿 film choices; '+('é'.repeat(90));
  const folded=foldIcsLine('DESCRIPTION:'+escapeIcs(long));
  const physicalLines=folded.split('\r\n');
  const encoder=new TextEncoder();
  assert.ok(physicalLines.length>2);
  assert.ok(physicalLines.every(line=>encoder.encode(line).length<=75));
  assert.ok(physicalLines.slice(1).every(line=>line.startsWith(' ')));
  const event=buildCalendarEvent({title:'Film night 🍿',date:'2026-11-14',startTime:'19:00',uid:'fold-check',notes:long});
  assert.ok(event.split('\r\n').every(line=>encoder.encode(line).length<=75));
});

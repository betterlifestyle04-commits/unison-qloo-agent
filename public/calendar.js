/**
 * Turn an in-browser group decision into a standard iCalendar event.
 * All times are interpreted in the visitor's current browser timezone.
 * This module never books or reserves anything and never calls a network API.
 */
function text(value,max=280){
  return String(value??'').replace(/[\u0000-\u001F\u007F]/g,' ').trim().slice(0,max);
}
export function escapeIcs(value){
  return text(value,1800).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');
}
export function utcStamp(date){
  if(!(date instanceof Date)||!Number.isFinite(date.getTime()))throw new Error('A valid date is required.');
  return date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'').replace('Z','Z');
}
function validateLocalStart(date,time){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw new Error('Choose a date and time for your group.');
  const [y,m,d]=date.split('-').map(Number),[hour,minute]=time.split(':').map(Number);
  const start=new Date(y,m-1,d,hour,minute,0,0);
  if(start.getFullYear()!==y||start.getMonth()!==m-1||start.getDate()!==d||start.getHours()!==hour||start.getMinutes()!==minute)throw new Error('The chosen local date or time does not exist in this timezone.');
  return start;
}
export function buildCalendarEvent({title,date,startTime,durationMinutes=120,location='',notes='',uid=''},now=new Date()){
  const eventTitle=text(title,120);
  if(!eventTitle)throw new Error('The event needs a name.');
  const minutes=Number(durationMinutes);
  if(!Number.isInteger(minutes)||minutes<15||minutes>720)throw new Error('Choose a duration between 15 minutes and 12 hours.');
  const begin=validateLocalStart(date,startTime);
  const end=new Date(begin.getTime()+minutes*60000);
  const eventId=text(uid,100).replace(/[^A-Za-z0-9_.-]/g,'');
  if(!eventId)throw new Error('A unique event identifier is required.');
  const description=['UNISON group plan. No reservation or booking has been made.',notes,'Confirm availability, meeting details and any reservations independently.'].filter(Boolean).join(' ');
  return [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//UNISON//Group Plan//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',
    'UID:'+eventId+'@unison.local',
    'DTSTAMP:'+utcStamp(now),
    'DTSTART:'+utcStamp(begin),
    'DTEND:'+utcStamp(end),
    'SUMMARY:'+escapeIcs(eventTitle),
    'LOCATION:'+escapeIcs(location),
    'DESCRIPTION:'+escapeIcs(description),
    'STATUS:TENTATIVE',
    'END:VEVENT','END:VCALENDAR',''
  ].join('\r\n');
}
export function agendaText({title,date,startTime,durationMinutes=120,location='',timezone='',note=''}){
  if(!title||!date||!startTime)throw new Error('A choice, date and time are required.');
  return ['UNISON — group plan',title,date+' at '+startTime+' ('+timezone+'; your device timezone)',durationMinutes+' minutes',location?'Meet at: '+location:'Meeting point: to be confirmed',note?'Notes: '+note:'','Suggested plan only. No reservation or booking has been made.'].join('\n');
}

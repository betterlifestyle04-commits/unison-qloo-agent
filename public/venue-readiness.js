/**
 * UNISON venue reality check. Human-maintained notes, never inferred from Qloo.
 * Checking a box means the group marked a question reviewed, not that the
 * platform verified availability, prices, booking, or accessibility.
 */
export const venueCheckItems=Object.freeze([
  {id:'location',label:'Confirm the venue address and meeting location',hint:'Check the exact place on a map, including which entrance to use.'},
  {id:'hours',label:'Check opening hours for the planned date and time',hint:'Hours can change for holidays, events or private bookings.'},
  {id:'cost',label:'Check the current total price and budget',hint:'Confirm entrance fees, minimum spend and any other group costs.'},
  {id:'booking',label:'Confirm reservation or walk-in arrangements',hint:'Contact the venue directly if necessary. UNISON makes no reservation.'}
]);
const allowed=new Set(venueCheckItems.map(item=>item.id));
export function updateVenueCheck(state,candidateId,key,checked){
  if(typeof candidateId!=='string'||!candidateId||!allowed.has(key)||typeof checked!=='boolean')throw new Error('A valid candidate, checklist item and boolean are required.');
  const existing=state?.[candidateId]??{};
  return {...(state||{}),[candidateId]:{...existing,[key]:checked}};
}
export function venueCheckProgress(state,candidateId){
  const marked=venueCheckItems.filter(item=>state?.[candidateId]?.[item.id]===true).length;
  const total=venueCheckItems.length;
  return {marked,total,complete:marked===total,percent:Math.round(100*marked/total),
    label:marked===total?'All four questions marked reviewed by this group. Confirm the actual details independently.':marked+' of '+total+' practical questions marked reviewed'};
}

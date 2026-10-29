/** Self-reported experience feedback. No network requests and no inferred satisfaction. */
const validRating=v=>v===null||Number.isInteger(v)&&v>=1&&v<=5;
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj||{},key);
export function updateFeedback(state,candidateId,personId,stage,rating){
  if(typeof candidateId!=='string'||!candidateId||candidateId.length>200||typeof personId!=='string'||!personId||personId.length>80||!['expected','experienced'].includes(stage)||!validRating(rating))throw new Error('Use a valid candidate, participant and 1–5 rating.');
  const current=state?.[candidateId]||{};
  const currentPerson=current[personId]||{};
  return {...(state||{}),[candidateId]:{...current,[personId]:{...currentPerson,[stage]:rating}}};
}
export function summarizeFeedback(state,candidateId,people){
  if(!Array.isArray(people))throw new Error('Participant list is required.');
  const record=state?.[candidateId]||{};
  const ratings=people.map((person,index)=>{
    const item=record[person.id]||{};
    const expected=validRating(item.expected)&&Number.isInteger(item.expected)?item.expected:null;
    const experienced=validRating(item.experienced)&&Number.isInteger(item.experienced)?item.experienced:null;
    return {label:'Participant '+(index+1),expected,experienced,paired:expected!==null&&experienced!==null};
  });
  const paired=ratings.filter(x=>x.paired);
  const mean=key=>paired.length?Number((paired.reduce((total,x)=>total+x[key],0)/paired.length).toFixed(2)):null;
  const expectedMean=mean('expected'),experiencedMean=mean('experienced');
  return {ratings,paired:paired.length,total:people.length,expectedMean,experiencedMean,
    difference:paired.length?Number((experiencedMean-expectedMean).toFixed(2)):null,
    explanation:paired.length
      ?'Matched self-reported expectation vs actual experience for '+paired.length+' of '+people.length+' participants. This is an expectation gap, not proof UNISON improved happiness or caused an outcome.'
      :'No matched before-and-after ratings yet. Record expectations before the outing, then actual experience afterward. No conclusions are possible.'};
}
const csvValue=value=>'"'+String(value??'').replace(/"/g,'""')+'"';
export function exportFeedbackCsv(summary,{demo=false}={}){
  if(!summary||!Array.isArray(summary.ratings))throw new Error('Feedback summary required.');
  const rows=[
    ['participant','expected_before_1_to_5','experienced_after_1_to_5','difference_after_minus_before'],
    ...summary.ratings.map(row=>[row.label,row.expected??'',row.experienced??'',row.paired?row.experienced-row.expected:''])
  ];
  return '# '+(demo?'FICTIONAL DEMO - NOT FIELD EVIDENCE':'SELF-REPORTED - NOT CAUSAL EVIDENCE')+'\r\n'
    +'# This CSV has participant numbers, not names or Qloo profiles. Data were not sent to a server.\r\n'
    +rows.map(row=>row.map(csvValue).join(',')).join('\r\n')+'\r\n';
}
export function venueCheckLinks({name='',address='',city='',demo=false}={}){
  if(demo)return null;
  const label=[String(name).slice(0,120),String(address||city).slice(0,120)].filter(Boolean).join(' ');
  if(!label.trim())return null;
  return {
    maps:'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(label),
    official:'https://www.google.com/search?q='+encodeURIComponent(label+' official website opening hours reservations'),
  };
}
export function venueInquiry({name='',date='',time='',partySize=2}={}){
  return 'Hello, we are planning a group visit to '+String(name).slice(0,120)+'.'+
   (date&&time?' Would you be open and able to accommodate '+Number(partySize)+' people on '+date+' at '+time+'?':' Could you confirm your current opening hours and whether a group of '+Number(partySize)+' needs a reservation?')+
   ' Could you please confirm the exact address, expected costs, accessibility needs and booking or walk-in arrangements? Thank you.';
}

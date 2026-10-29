/**
 * Portable, plain-text decision report. Never sends data to a new service.
 * Report can contain chosen participant names, preferences and votes. Users opt in by download.
 * All data is descriptive, not a scientific satisfaction forecast or a reservation.
 */
const safe=(value,max=300)=>String(value??'').replace(/[\r\n\t]+/g,' ').trim().slice(0,max).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const numeric=value=>typeof value==='number'&&Number.isFinite(value)?value.toFixed(1):'Unknown';
const verdict=(data,person)=>typeof data.signals?.[person.id]==='number'&&Number.isFinite(data.signals[person.id])?numeric(data.signals[person.id])+'/100':'No observed signal';
const namedType=kind=>kind==='qloo'?'Real Qloo tool request':kind==='demo'?'Fictional demonstration step':'Local computation';
const votesFor=(ballots,id,people)=>people.map(person=>{
  const value=ballots?.[id]?.[person.id];
  return safe(person.name,60)+': '+(value==='yes'?'Yes':value==='maybe'?'Maybe':value==='no'?'No':'Not recorded');
});
function writeChoice(choice,people,ballots,index){
  const lines=[
    '### '+(index+1)+'. '+safe(choice.name,150),
    '- Source: '+(choice.evidence?'Qloo entity or annotated evidence':'Candidate from selected planning mode'),
    '- UNISON relative score: '+(choice.score===null?'Not rankable':numeric(choice.score)+'/100'),
    '- Lowest relative fit: '+numeric(choice.minimum)+'/100',
    '- Average relative fit: '+numeric(choice.average)+'/100',
    '- Evidence coverage: '+Math.round(100*(choice.coverage||0))+'%',
    '- Fully supported for the whole group: '+(choice.sufficient?'Yes':'No'),
    '- Vetoed: '+(choice.vetoed?'Yes':'No'),
    '- Interpretation: '+safe(choice.explanation,650),
    '- Individual relative fit:'
  ];
  for(const person of people)lines.push('  - '+safe(person.name,60)+': '+verdict(choice,person));
  lines.push('- Human votes (from this browser, not authenticated):');
  for(const vote of votesFor(ballots,choice.id,people))lines.push('  - '+vote);
  return lines.join('\n');
}
export function buildDecisionReport(result,{ballots={},decisionStyle='balanced',brief=null,createdAt=new Date().toISOString()}={}){
  if(!result||!Array.isArray(result.ranked)||!Array.isArray(result.people)||!['live','demo'].includes(result.mode))throw new Error('A completed UNISON result is required.');
  const people=result.people.filter(p=>typeof p?.id==='string'&&typeof p?.name==='string');
  if(people.length<2)throw new Error('At least two people are required to explain a decision.');
  const supported=result.ranked.filter(item=>item.sufficient&&!item.vetoed);
  const unanimous=supported.filter(item=>people.every(person=>ballots?.[item.id]?.[person.id]==='yes'));
  const trace=Array.isArray(result.trace)?result.trace:[];
  const type=result.mode==='demo'?'FICTIONAL DEMO — NOT REAL QLOO RECOMMENDATIONS':'LIVE QLOO CANDIDATES — UNISON-DERIVED SCORES';
  const lines=[
    '# UNISON — Group Decision Report',
    '',
    '> '+type,
    '> No reservation or booking has been made; venue availability is not verified.',
    '> The relative-fit scores are UNISON heuristics, not calibrated enjoyment probabilities.',
    '',
    'Generated: '+safe(createdAt,100),
    'Plan type: '+(result.domain==='movies'?'Movie night':'Group outing'),
    'City: '+safe(result.city||'Not set',90),
    'Decision style: '+safe(decisionStyle,40),
    'Group members: '+people.map(person=>safe(person.name,50)).join(', '),
    'Fully supported active options: '+supported.length+' of '+result.ranked.filter(item=>!item.vetoed).length,
    'All-Yes human agreement: '+(unanimous.length?unanimous.map(item=>safe(item.name,120)).join('; '):'Not recorded'),
    '',
    '## Cultural preferences'
  ];
  if(brief?.people&&Array.isArray(brief.people)){
    for(const p of brief.people)lines.push('- '+safe(p.name,60)+': '+(Array.isArray(p.favorites)?p.favorites.map(f=>safe(f,90)).join(', '):'Not supplied'));
  }else{
    lines.push('Preferences were not included in this export.');
  }
  lines.push('','## Shared shortlist');
  if(!result.ranked.length)lines.push('No candidates were returned.');
  for(const [index,item] of result.ranked.entries())lines.push('',writeChoice(item,people,ballots,index));
  lines.push('','## Agent decision trace');
  if(!trace.length)lines.push('No trace supplied.');
  trace.forEach((step,index)=>lines.push((index+1)+'. ['+namedType(step.kind)+'] '+safe(step.step,100)+' — '+safe(step.detail,700)));
  lines.push('','## Important limitations','- Qloo data is evidence of cultural associations. It does not guarantee a preference, price, opening hours or geographic correctness.','- Missing evidence is unknown, not a vote against a choice.','- Human votes are entered on one device and are not independently authenticated.','- Names, favorites and votes in this file are visible to anyone you share it with.','- No account, booking or calendar invitation was created by downloading this report.','','UNISON: https://unison-qloo.onrender.com','');
  return lines.join('\n');
}
export function reportFilename(mode='demo',date=new Date()){
  const stamp=Number.isFinite(date.getTime())?date.toISOString().slice(0,10):'undated';
  return 'unison-decision-'+(mode==='live'?'live':'demo')+'-'+stamp+'.md';
}

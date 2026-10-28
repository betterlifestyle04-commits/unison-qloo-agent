const clamp=value=>Math.max(0,Math.min(100,value));

export function rankCandidates(candidates,people,vetoes=[]){
  const vetoed=new Set(vetoes);
  return candidates.map(candidate=>{
    const known=people.map(person=>({person,value:candidate.signals?.[person.id]})).filter(entry=>Number.isFinite(entry.value));
    const values=known.map(entry=>clamp(entry.value));
    const minimum=values.length?Math.min(...values):null;
    const average=values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;
    const coverage=people.length?values.length/people.length:0;
    // A partial observation may be useful context, never evidence of group consensus.
    const sufficient=coverage===1;
    const score=!sufficient||minimum===null?null:(.55*minimum)+(.35*average)+10;
    const isVetoed=vetoed.has(candidate.id);
    const confidence=coverage===1?'complete':coverage>=.6?'partial':'limited';
    return {...candidate,known,minimum,average,coverage,confidence,sufficient,score:isVetoed||score===null?null:Number(score.toFixed(1)),vetoed:isVetoed};
  }).sort((a,b)=>Number(b.score??-1)-Number(a.score??-1)||a.name.localeCompare(b.name));
}

export function explainCandidate(candidate,people){
  if(candidate.vetoed)return 'Removed because someone in the group vetoed it.';
  if(!candidate.sufficient)return `Only ${candidate.known.length} of ${people.length} people have observed evidence. This is not enough to call a group compromise; add or resolve the missing taste signals.`;
  const missing=people.length-candidate.known.length;
  const floor=Math.round(candidate.minimum??0);
  const average=Math.round(candidate.average??0);
  const coverage=Math.round(candidate.coverage*100);
  return `${floor} is the lowest relative-fit estimate; the relative-fit average is ${average} across ${coverage}% of the group.${missing?` ${missing} person${missing===1?' has':'s have'} no signal, so this is not evidence of dislike.`:''}`;
}

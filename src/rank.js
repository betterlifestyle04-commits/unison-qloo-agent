const clamp=value=>Math.max(0,Math.min(100,value));

export function rankCandidates(candidates,people,vetoes=[]){
  const vetoed=new Set(vetoes);
  return candidates.map(candidate=>{
    const known=people.map(person=>({person,value:candidate.signals?.[person.id]})).filter(entry=>Number.isFinite(entry.value));
    const values=known.map(entry=>clamp(entry.value));
    const minimum=values.length?Math.min(...values):null;
    const average=values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;
    const coverage=people.length?values.length/people.length:0;
    const score=minimum===null?0:(.55*minimum)+(.35*average)+(10*coverage);
    const isVetoed=vetoed.has(candidate.id);
    const confidence=coverage===1?'complete':coverage>=.6?'partial':'limited';
    return {...candidate,known,minimum,average,coverage,confidence,score:isVetoed?null:Number(score.toFixed(1)),vetoed:isVetoed};
  }).sort((a,b)=>Number(b.score??-1)-Number(a.score??-1)||a.name.localeCompare(b.name));
}

export function explainCandidate(candidate,people){
  if(candidate.vetoed)return 'Removed because someone in the group vetoed it.';
  const missing=people.length-candidate.known.length;
  const floor=Math.round(candidate.minimum??0);
  const average=Math.round(candidate.average??0);
  const coverage=Math.round(candidate.coverage*100);
  return `${floor} is the lowest observed relative fit; the observed average is ${average} across ${coverage}% of the group.${missing?` ${missing} person${missing===1?' has':'s have'} no signal, so this is not evidence of dislike.`:''}`;
}

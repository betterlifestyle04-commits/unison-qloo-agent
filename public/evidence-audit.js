/**
 * UNISON evidence audit. Reports only what was actually observed in the same shortlist.
 * Never interprets missing evidence as dislike, invents Qloo scores, or guesses popularity.
 * Designed to work with live Qloo rank-derived signals and clearly labeled fictional demo signals.
 */
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const ordered=(a,b)=>Number(b.score??-1)-Number(a.score??-1)||String(a.name).localeCompare(String(b.name));
export function auditGroupEvidence(result){
  if(!result||!Array.isArray(result.people)||!Array.isArray(result.ranked))throw new Error('A ranked group result is required.');
  const people=result.people.filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string');
  const included=result.ranked.filter(item=>item&&!item.vetoed&&typeof item.id==='string');
  const coverageByPerson=people.map(person=>{
    const observed=included.filter(item=>finite(item.signals?.[person.id])).length;
    const total=included.length;
    return {id:person.id,name:person.name,observed,total,percent:total?Math.round(observed/total*100):0,missing:total-observed};
  });
  const fullyCovered=included.filter(item=>item.sufficient&&people.length>0&&people.every(person=>finite(item.signals?.[person.id]))).sort(ordered);
  const missingRows=included.filter(item=>!fullyCovered.some(complete=>complete.id===item.id)).map(item=>({
    id:item.id,name:item.name,
    missing:people.filter(person=>!finite(item.signals?.[person.id])).map(person=>({id:person.id,name:person.name}))
  }));
  const winner=fullyCovered[0]??null;
  const alternative=fullyCovered[1]??null;
  const comparison=winner&&alternative?people.map(person=>{
    const winnerFit=winner.signals[person.id];
    const alternativeFit=alternative.signals[person.id];
    return {id:person.id,name:person.name,winnerFit,alternativeFit,delta:Number((winnerFit-alternativeFit).toFixed(1))};
  }):[];
  const spread=winner?Math.max(...people.map(person=>winner.signals[person.id]))-Math.min(...people.map(person=>winner.signals[person.id])):null;
  const summary=included.length===0
    ?'No candidate is currently active. Restore a veto or generate a new shortlist.'
    :fullyCovered.length===0
      ?'None of the active candidates has comparable signals for every participant. Missing evidence is unknown, not disagreement.'
      :fullyCovered.length===included.length
        ?'Every active candidate has a signal for each participant. These are relative-fit estimates, not a measurement of happiness.'
        :fullyCovered.length+' of '+included.length+' active candidates have comparable group evidence. Other candidates cannot be treated as a group consensus.';
  return {total:included.length,complete:fullyCovered.length,partial:included.length-fullyCovered.length,people:coverageByPerson,missingRows,winner,alternative,comparison,spread,summary};
}
export function recoverySuggestions(result,audit=auditGroupEvidence(result)){
  if(audit.complete>0)return [];
  const suggestions=[];
  if(!audit.total){
    suggestions.push('Restore a veto or submit a revised brief to discover different candidates.');
  }else{
    const leastCovered=[...audit.people].sort((a,b)=>a.percent-b.percent).slice(0,2);
    for(const person of leastCovered)if(person.missing>0)suggestions.push('Try another specific cultural reference for '+person.name+' or select an exact Qloo entity with Taste Finder.');
    suggestions.push('Review each candidate’s missing signals; missing information does not mean a negative preference.');
  }
  if(result.domain==='places'&&result.budget&&result.budget!=='any')suggestions.push('Consider a broader price level and explicitly generate a new plan.');
  return suggestions.slice(0,4);
}

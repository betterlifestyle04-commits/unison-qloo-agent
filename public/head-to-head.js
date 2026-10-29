/**
 * Compare two candidates using only observed, fully covered group evidence.
 * Qloo source entities and UNISON heuristic signals are never confused with votes.
 */
const finite=x=>typeof x==='number'&&Number.isFinite(x);
export function compareOptions(result,leftId,rightId){
 if(!result||!Array.isArray(result.people)||!Array.isArray(result.ranked))throw new Error('A complete group plan is required.');
 const choices=result.ranked.filter(item=>item.sufficient&&!item.vetoed&&result.people.every(person=>finite(item.signals?.[person.id])));
 const left=choices.find(item=>item.id===leftId),right=choices.find(item=>item.id===rightId);
 if(!left||!right||left.id===right.id)throw new Error('Select two different fully supported, non-vetoed choices.');
 const people=result.people.map(person=>{
  const l=left.signals[person.id],r=right.signals[person.id];
  return {id:person.id,name:person.name,left:l,right:r,difference:Number((l-r).toFixed(1)),preference:l>r?'left':r>l?'right':'tie'};
 });
 const leftWins=people.filter(x=>x.preference==='left').length,rightWins=people.filter(x=>x.preference==='right').length;
 const ties=people.length-leftWins-rightWins;
 const minimumAdvantage=Number((left.minimum-right.minimum).toFixed(1));
 const meanAdvantage=Number((left.average-right.average).toFixed(1));
 const explanation=minimumAdvantage===0
   ?'Both options have the same lowest relative fit.'
   :minimumAdvantage>0
      ?left.name+' has a '+minimumAdvantage.toFixed(1)+'-point higher lowest relative-fit estimate.'
      :right.name+' has a '+Math.abs(minimumAdvantage).toFixed(1)+'-point higher lowest relative-fit estimate.';
 return {left,right,people,leftWins,rightWins,ties,minimumAdvantage,meanAdvantage,explanation,source:result.mode==='demo'?'Fictional demonstration evidence':'UNISON ordinal estimates derived from Qloo candidate ranks'};
}
export function eligibleComparisons(result){
 if(!result||!Array.isArray(result.people)||!Array.isArray(result.ranked))return [];
 return result.ranked.filter(item=>item?.sufficient&&!item?.vetoed&&result.people.every(person=>finite(item.signals?.[person.id])));
}

import {decisionStyles} from './planner-state.js';

/**
 * Diagnostic only: leave-one-out reweighting of the same fully observed shortlist.
 * Removing a participant is NOT a product recommendation or a request to exclude them.
 * Never imputes missing taste signals and never makes Qloo requests.
 */
const finite=x=>typeof x==='number'&&Number.isFinite(x);
export function analyzeGroupStability(result,style='balanced'){
  if(!result||!Array.isArray(result.ranked)||!Array.isArray(result.people))throw new Error('A group plan is required.');
  const group=result.people;
  if(group.length<3)return {eligible:0,comparable:false,reason:'Decision stability requires at least three participants so every comparison still includes a group.'};
  const pool=result.ranked.filter(item=>item?.sufficient&&!item?.vetoed&&group.every(person=>finite(item.signals?.[person.id])));
  if(pool.length<2)return {eligible:pool.length,comparable:false,reason:'At least two fully observed, non-vetoed candidates are needed to examine decision sensitivity.'};
  const weights=decisionStyles[style]||decisionStyles.balanced;
  const winnerFor=participants=>[...pool].map(item=>{
    const values=participants.map(person=>item.signals[person.id]);
    const minimum=Math.min(...values),average=values.reduce((acc,n)=>acc+n,0)/values.length;
    return {id:item.id,name:item.name,minimum:Number(minimum.toFixed(1)),average:Number(average.toFixed(1)),score:Number((weights.minimum*minimum+weights.average*average+weights.coverage*100).toFixed(1))};
  }).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name)||a.id.localeCompare(b.id))[0];
  const full=winnerFor(group);
  const trials=group.map(person=>{
    const without=winnerFor(group.filter(other=>other.id!==person.id));
    return {personId:person.id,personName:person.name,winnerId:without.id,winnerName:without.name,changesWinner:without.id!==full.id,remainingPeople:group.length-1};
  });
  const changes=trials.filter(trial=>trial.changesWinner).length;
  return {
    eligible:pool.length,comparable:true,
    style:decisionStyles[style]?style:'balanced',winner:full,
    trials,changes,stable:changes===0,
    explanation:changes===0
      ?'The same option leads every hypothetical comparison with one participant omitted. This does not prove the choice will satisfy the group.'
      :changes+' of '+group.length+' hypothetical comparisons select another option when one person’s taste evidence is omitted. Each participant still matters in the real group decision.'
  };
}

import {summarizeBallot} from './ballot.js';

/**
 * Browser-only vote summary. This is not a prediction or a remote polling service.
 * Never changes ranking, scores, or the underlying Qloo response.
 */
export function agreementPulse(result,ballots={}){
  if(!result||!Array.isArray(result.ranked)||!Array.isArray(result.people))throw new Error('A group result is needed.');
  const people=result.people.filter(person=>person&&typeof person.id==='string'&&typeof person.name==='string');
  const choices=result.ranked.filter(item=>item?.sufficient&&!item?.vetoed);
  const summary=choices.map(item=>{
    const votes=summarizeBallot(ballots,item.id,people.map(person=>person.id));
    const missing=people.filter(person=>!['yes','maybe','no'].includes(ballots?.[item.id]?.[person.id])).map(person=>person.name);
    return {id:item.id,name:item.name,score:item.score,...votes,missing};
  });
  const top=summary[0]??null;
  const unanimous=summary.filter(item=>item.unanimous);
  // A discussion suggestion is not a change to the system's top recommendation.
  const possible=summary.filter(item=>item.no===0).sort((a,b)=>b.yes-a.yes||b.voted-a.voted||(b.score??-1)-(a.score??-1));
  const suggestion=possible[0]??null;
  let message='',nextAction='';
  if(!top){
    message='There is no fully supported recommendation to vote on.';
    nextAction='Revise the group brief or restore a veto to discover a supported option.';
  }else if(unanimous.length){
    message='Everyone has voted Yes on '+unanimous[0].name+'.';
    nextAction='Confirm the plan details with the group before creating a tentative calendar event.';
  }else if(top.voted===0){
    message='No one has voted on the leading recommendation yet.';
    nextAction='Ask each participant to vote Yes, Maybe or No using the candidate card.';
  }else if(top.no>0){
    message='At least one participant voted No on the leading recommendation.';
    nextAction=suggestion&&suggestion.id!==top.id?'Consider discussing '+suggestion.name+' as an alternative.':'Discuss the disagreement or explore another supported option.';
  }else if(top.missing.length){
    message=top.voted+' of '+top.total+' participants have voted on the leading recommendation.';
    nextAction='Ask for a response from '+top.missing.join(', ')+'.';
  }else{
    message='All participants have responded, but the leading option does not have unanimous approval.';
    nextAction='Discuss Maybe votes or compare another option; no choice is finalized automatically.';
  }
  return {top,unanimous,suggestion,choices:summary,people:people.length,message,nextAction};
}

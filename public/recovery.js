/**
 * Translate planning failures to concrete next steps, without inventing evidence
 * or silently switching live Qloo to a fictional result.
 */
export function planningRecovery(status,message,{mode='demo',domain='places',interruption=null}={}){
  const words=String(message??'').toLowerCase();
  const live=mode==='live';
  let title='We could not finish this plan.';
  let detail='Your group brief is still here. Review the inputs and try again when ready.';
  let suggestions=['Review participant names and cultural favorites.'];
  if(interruption==='cancelled'){
    title='You stopped waiting for this plan.';
    detail='Your group brief has been preserved. The browser stopped waiting, but a Qloo request already received by the server may still continue and use API quota.';
    suggestions=['Review your group brief and submit again only if needed.'];
  }else if(interruption==='timeout'){
    title='The plan took too long to finish.';
    detail='The browser stopped waiting for this request. The server may still be processing it; this does not mean Qloo disliked your favorites.';
    suggestions=['Try again manually later if the network is stable. Avoid repeated submissions while the service is slow.'];
  }else if(status===429){
    title='Too many requests right now.';
    detail='The request limit protects the live service. Nothing has been booked or saved.';
    suggestions=['Allow the request window to reset before generating another plan.'];
  }else if(status===413){
    title='The group brief is too large.';
    detail='Shorten long cultural-reference fields and try submitting again.';
    suggestions=['Use no more than three favorites per participant.'];
  }else if(status===422&&/clarify|favorite|exact match|resolved|ambiguous/.test(words)){
    title='A cultural reference needs clarification.';
    detail='Some titles are shared by movies, albums, books and artists. UNISON will not guess the intended entity.';
    suggestions=['Choose Live Qloo explicitly and use Taste Finder to select the precise entity.', 'Edit the ambiguous favorite in the group brief.'];
  }else if(status===422&&/city/.test(words)){
    title='Choose a city before using live places.';
    detail='A city is mandatory to narrow the live location query.';
    suggestions=['Enter a specific city, for example Oslo, Norway.'];
  }else if(status===422&&/no candidates|no candidate|matching/.test(words)){
    title='No suitable Qloo candidates were returned.';
    detail='This is missing evidence, not a negative opinion from any participant.';
    suggestions=['Try a different cultural reference or a broader price limit.', ...(domain==='places'?['Review your selected city.']:[])];
  }else if(status===503&&/configured|api key|not available/.test(words)){
    title='Live Qloo is not available.';
    detail='The API connection is not currently ready. UNISON will not pretend that demo recommendations are real.';
    suggestions=['Explore the separately labeled fictional demonstration instead.'];
  }else if(status===503||status===502||status>=500){
    title='The live service could not complete the request.';
    detail='This may be a temporary upstream or server problem; it does not mean the group dislikes the suggestions.';
    suggestions=['Keep your current group brief and retry manually later.', 'If a live request fails, use the separately labeled fictional demo to explore the interface.'];
  }else if(status===400){
    title='Check the group brief.';
    detail='The planner could not validate the request. No recommendations were generated.';
    suggestions=['Make sure every participant has a distinct name and one to three favorites.'];
  }
  return {title,detail,suggestions,showDemo:live,showEditor:true,canRetry:status!==429&&status!==413};
}

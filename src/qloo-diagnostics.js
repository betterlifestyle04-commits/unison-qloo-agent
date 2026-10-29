import {searchFavorite,insights} from './qloo.js';
import {screenCandidates} from './candidate-integrity.js';

/**
 * Explicit, bounded diagnostic: 1 Search + 2 Insights GET calls at most.
 * Uses only a fixed public cultural title; never sends a user's group brief.
 * Real results may still change or be unavailable for other Qloo parameters.
 */
export async function diagnoseQloo({search=searchFavorite,inspect=insights}={}){
  const stages=[];
  const output=(verified)=>({
    ok:verified,
    source:'Live Qloo tools',
    stages,
    checkedAt:new Date().toISOString(),
    note:'Checks one sample movie search, discovery and shortlist evaluation. Does not certify place accuracy, other filters or individual recommendations. Up to three Qloo requests; retries are possible on transient errors.'
  });
  const failed=(name,message)=>{stages.push({step:name,status:'failed',detail:String(message||'Unexpected error').slice(0,220)});return output(false);};
  let movie;
  try{
    const response=await search('Interstellar');
    const exact=(response.matches||[]).filter(item=>item&&item.name?.toLowerCase()==='interstellar'&&item.type==='urn:entity:movie'&&typeof item.id==='string');
    movie=exact[0];
    if(!movie)return failed('Search','The Search API responded, but did not return an exact movie entity for the diagnostic title.');
    stages.push({step:'Search',status:'passed',detail:'Found an exact movie entity for a public sample title. No participant names were sent.'});
  }catch(error){return failed('Search',error.message);}
  let shortlist;
  try{
    const response=await inspect([movie.id],'movies',{budget:'any'});
    shortlist=screenCandidates(response.results,'movies').items.slice(0,3).map(item=>item.id);
    if(!shortlist.length)return failed('Insights discovery','Insights responded, but provided no usable movie candidates for this sample.');
    stages.push({step:'Insights discovery',status:'passed',detail:'Returned '+shortlist.length+' category-matching sample candidate'+(shortlist.length===1?'':'s')+'.'});
  }catch(error){return failed('Insights discovery',error.message);}
  try{
    const response=await inspect([movie.id],'movies',{budget:'any',shortlist});
    const filtered=screenCandidates(response.results,'movies',{shortlist});
    if(!filtered.items.length)return failed('Insights shortlist','The shortlisted Insights response did not contain any of the requested candidate IDs.');
    stages.push({step:'Insights shortlist',status:'passed',detail:'Matched '+filtered.items.length+' candidate'+(filtered.items.length===1?'':'s')+' against the explicitly requested shortlist.'});
    return output(true);
  }catch(error){return failed('Insights shortlist',error.message);}
}

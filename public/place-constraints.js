/**
 * Communicate exactly what location and price filters can (and cannot) establish.
 * Qloo's filter.price_level.max is a RESTAURANT price-tier cap (1–4), not
 * verified local currency cost, nor a guaranteed price bound for every venue.
 */
export const restaurantPriceTierMax=Object.freeze({low:1,mid:2,high:4});
export function describePlaceConstraints({mode='demo',domain='places',city='',budget='any'}={}){
  if(domain!=='places')return null;
  const live=mode==='live',priceLevel=restaurantPriceTierMax[budget]??null;
  return {
    location:live
      ?'Qloo was asked to restrict place results to the locality matching "'+String(city).slice(0,80)+'" with boundary radius 0. The matched locality and venue addresses are not independently checked by UNISON.'
      :'This is a fictional demonstration. Place names and locations are not real venue recommendations.',
    price:priceLevel!==null
      ?(live?'Qloo restaurant price-level maximum: ':'Fictional price-tier setting: ')+priceLevel+' of 4. This is not a verified cost or a guaranteed budget limit for all venues.'
      :(live?'No Qloo restaurant price-level cap was requested.':'No fictional price-tier filter was requested.')+' Actual costs are not checked.',
    priceLevel,
    requiresManualMeeting:true
  };
}
export function manuallyConfirmedMeetingLocation(value){
  return typeof value==='string'?value.trim().slice(0,160):'';
}

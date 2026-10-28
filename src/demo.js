// Fictional, local-only evidence. It is deliberately never mixed with live Qloo data.
export const DEMO_CATALOG={
  places:[
    {id:'demo:olive-table',name:'Olive Table',kind:'Mediterranean small plates',note:'A relaxed, shareable dinner with vegetarian choices.'},
    {id:'demo:night-market',name:'Night Market Hall',kind:'Global food hall',note:'Many cuisines and fast, low-commitment ordering.'},
    {id:'demo:corner-cinema',name:'Corner Cinema Café',kind:'Film café',note:'A low-key screening with coffee and desserts.'},
    {id:'demo:river-studio',name:'River Studio',kind:'Art workshop',note:'A hands-on evening with a quiet social pace.'}
  ],
  movies:[
    {id:'demo:bright-archive',name:'The Bright Archive',kind:'Mystery drama',note:'A character-led mystery with a hopeful finish.'},
    {id:'demo:orbit-laughs',name:'Orbit Laughs',kind:'Science-fiction comedy',note:'A playful, light science-fiction adventure.'},
    {id:'demo:paper-gardens',name:'Paper Gardens',kind:'Animated fantasy',note:'A visually rich, gentle fantasy.'},
    {id:'demo:small-hours',name:'Small Hours',kind:'Indie comedy',note:'A warm ensemble comedy about friendship.'}
  ]
};

const profiles=[
  [96,72,61,45], [68,94,58,76], [74,65,93,55], [82,59,66,91], [62,84,79,70]
];

export function demoEvidence(people,domain){
  const candidates=DEMO_CATALOG[domain]||DEMO_CATALOG.places;
  return candidates.map((candidate,index)=>({
    ...candidate,
    signals:Object.fromEntries(people.map((person,personIndex)=>[
      person.id, profiles[personIndex%profiles.length][index]
    ])),
    evidence:'Fictional demo signal; not a Qloo result.'
  }));
}

// Local fictional evidence only. These tags and scores are never returned as Qloo evidence.
const catalog={
  places:[
    {id:'demo:olive-table',name:'Olive Table',kind:'Mediterranean small plates',price:'mid',tags:['food','social','calm','travel'],note:'Shareable dinner with vegetarian choices.'},
    {id:'demo:night-market',name:'Night Market Hall',kind:'Global food hall',price:'low',tags:['food','adventure','social','fast'],note:'Many cuisines and low-commitment ordering.'},
    {id:'demo:corner-cinema',name:'Corner Cinema Café',kind:'Film café',price:'mid',tags:['film','calm','cozy','art'],note:'A small screening with coffee and desserts.'},
    {id:'demo:river-studio',name:'River Studio',kind:'Art workshop',price:'mid',tags:['art','hands-on','calm','social'],note:'A hands-on evening with a quiet social pace.'},
    {id:'demo:rooftop-supper',name:'Rooftop Supper Club',kind:'Chef pop-up',price:'high',tags:['food','adventure','social','art'],note:'A special-occasion tasting menu.'}
  ],
  movies:[
    {id:'demo:bright-archive',name:'The Bright Archive',kind:'Mystery drama',price:'low',tags:['mystery','story','calm','art'],note:'A character-led mystery with a hopeful finish.'},
    {id:'demo:orbit-laughs',name:'Orbit Laughs',kind:'Science-fiction comedy',price:'low',tags:['science','comedy','adventure','social'],note:'A playful light science-fiction adventure.'},
    {id:'demo:paper-gardens',name:'Paper Gardens',kind:'Animated fantasy',price:'low',tags:['animation','fantasy','art','cozy'],note:'A visually rich, gentle fantasy.'},
    {id:'demo:small-hours',name:'Small Hours',kind:'Indie comedy',price:'low',tags:['comedy','story','cozy','calm'],note:'A warm ensemble comedy about friendship.'},
    {id:'demo:deep-signal',name:'Deep Signal',kind:'Space mystery',price:'low',tags:['science','mystery','story','adventure'],note:'A tense but accessible space mystery.'}
  ]
};
const lexicon={ghibli:['animation','fantasy','art','cozy'],miyazaki:['animation','fantasy','art'],anime:['animation','fantasy'],bourdain:['food','travel','adventure'],chef:['food','adventure'],restaurant:['food','social'],knives:['mystery','story','comedy'],mystery:['mystery','story'],crime:['mystery','story'],jazz:['art','calm','social'],comedy:['comedy','social'],marvel:['science','adventure','comedy'],sci:['science','adventure'],science:['science','adventure'],fantasy:['fantasy','art'],indie:['art','story','calm'],travel:['travel','adventure','food'],coffee:['cozy','calm'],museum:['art','calm'],hiking:['adventure','hands-on']};
const normalize=value=>String(value).toLocaleLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function tagsFor(favorites){const words=normalize(favorites.join(' ')).split(' ');const tags=new Set(words.flatMap(word=>lexicon[word]||[]));if(!tags.size){const fallback=['art','food','story','adventure'];tags.add(fallback[normalize(favorites.join('')).length%fallback.length]);}return tags;}
function score(tags,candidate){const overlap=candidate.tags.filter(tag=>tags.has(tag)).length;const variety=Math.min(tags.size,4);return Math.min(98,Math.max(24,Math.round(30+(overlap*18)+(variety*5))));}
export function demoEvidence(people,domain,{city,budget='any'}={}){const candidates=(catalog[domain]||catalog.places).filter(candidate=>budget==='any'||candidate.price===budget);return candidates.map(candidate=>({...candidate,note:`${candidate.note}${domain==='places'&&city?` Fictional ${city} scenario.`:''}`,signals:Object.fromEntries(people.map(person=>[person.id,score(tagsFor(person.favorites),candidate)])),evidence:'Simulated local preference scenario — not a Qloo result.'}));}

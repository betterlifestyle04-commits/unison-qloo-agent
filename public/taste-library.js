/**
 * Hand-authored cultural prompts, not Qloo entity matches, affinity evidence,
 * live provider inventory, or popularity rankings.
 * Choosing a label edits a local form field and never sends a network request.
 */
export const TASTE_REFERENCES=Object.freeze([
  {name:'Interstellar',category:'films',hint:'Science fiction'},
  {name:'Inception',category:'films',hint:'Science fiction'},
  {name:'Spirited Away',category:'films',hint:'Animation'},
  {name:'Knives Out',category:'films',hint:'Mystery'},
  {name:'La La Land',category:'films',hint:'Musical'},
  {name:'The Grand Budapest Hotel',category:'films',hint:'Comedy'},
  {name:'The Dark Knight',category:'films',hint:'Superhero'},
  {name:'Paddington',category:'films',hint:'Family'},
  {name:'Toy Story',category:'films',hint:'Animation'},
  {name:'The Lord of the Rings',category:'films',hint:'Fantasy'},
  {name:'The Matrix',category:'films',hint:'Science fiction'},
  {name:'Arrival',category:'films',hint:'Science fiction'},
  {name:'Miles Davis',category:'music',hint:'Jazz'},
  {name:'David Bowie',category:'music',hint:'Rock'},
  {name:'Radiohead',category:'music',hint:'Alternative rock'},
  {name:'Daft Punk',category:'music',hint:'Electronic'},
  {name:'Billie Eilish',category:'music',hint:'Pop'},
  {name:'Nina Simone',category:'music',hint:'Jazz & soul'},
  {name:'Beyoncé',category:'music',hint:'Pop & R&B'},
  {name:'The Weeknd',category:'music',hint:'Pop & R&B'},
  {name:'Coldplay',category:'music',hint:'Pop rock'},
  {name:'Hans Zimmer',category:'music',hint:'Film music'},
  {name:'Taylor Swift',category:'music',hint:'Pop'},
  {name:'Kendrick Lamar',category:'music',hint:'Hip-hop'},
  {name:'Haruki Murakami',category:'stories',hint:'Literature'},
  {name:'Agatha Christie',category:'stories',hint:'Mysteries'},
  {name:'Jane Austen',category:'stories',hint:'Classics'},
  {name:'Neil Gaiman',category:'stories',hint:'Fantasy'},
  {name:'Studio Ghibli',category:'culture',hint:'Animation studio'},
  {name:'Anthony Bourdain',category:'culture',hint:'Food & travel'},
  {name:'Hayao Miyazaki',category:'culture',hint:'Animation'},
  {name:'Wes Anderson',category:'culture',hint:'Cinema'},
  {name:'Banksy',category:'culture',hint:'Street art'},
  {name:'Zaha Hadid',category:'culture',hint:'Architecture'},
  {name:'David Attenborough',category:'culture',hint:'Nature documentaries'},
  {name:'Yayoi Kusama',category:'culture',hint:'Contemporary art'}
].map(x=>Object.freeze(x)));

const validCategories=new Set(['all','films','music','stories','culture']);
const categories=Object.freeze([
  {value:'all',label:'All'},
  {value:'films',label:'Films'},
  {value:'music',label:'Music'},
  {value:'stories',label:'Stories'},
  {value:'culture',label:'Culture'}
]);
export function filterTasteReferences({query='',category='all',limit=12}={}){
  const needle=String(query??'').trim().toLocaleLowerCase();
  const group=validCategories.has(category)?category:'all';
  const max=Number.isInteger(limit)?Math.max(0,Math.min(limit,TASTE_REFERENCES.length)):12;
  return TASTE_REFERENCES.filter(item=>(group==='all'||item.category===group)
    &&(!needle||[item.name,item.hint,item.category].some(value=>value.toLocaleLowerCase().includes(needle)))).slice(0,max);
}

/** Keeps participant preferences unique and within the planner's three-favorite limit. */
export function appendTasteReference(input,label){
  const clean=String(label??'').trim();
  if(!TASTE_REFERENCES.some(item=>item.name===clean))return {ok:false,reason:'Choose one of the example cultural references.'};
  const items=String(input??'').split(',').map(x=>x.trim()).filter(Boolean);
  if(items.some(value=>value.toLocaleLowerCase()===clean.toLocaleLowerCase()))
    return {ok:false,reason:clean+' is already in this participant’s favorites.'};
  if(items.length>=3)return {ok:false,reason:'This participant already has three favorites. Edit or remove one to add another.'};
  return {ok:true,value:[...items,clean].join(', '),count:items.length+1};
}
function el(tag,cls,text){
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=String(text);
  return node;
}
export function refreshTastePeople(root=document){
  const select=root.querySelector('#taste-shelf-person');
  const rows=[...root.querySelectorAll('#people .person')];
  if(!select)return;
  const previous=select.value;
  select.replaceChildren();
  rows.forEach((row,index)=>{
    const name=row.querySelector('[data-field=name]')?.value.trim();
    const option=el('option','',name||'Person '+(index+1));
    option.value=String(index);select.append(option);
  });
  if([...select.options].some(option=>option.value===previous))select.value=previous;
}
/** One-time mount. Any selected reference is sent only to onAdd. */
export function mountTasteShelf({root=document,onAdd}={}){
  const shelf=root.querySelector('#taste-shelf');
  const list=root.querySelector('#taste-shelf-results');
  const search=root.querySelector('#taste-shelf-search');
  const tabs=root.querySelector('#taste-shelf-categories');
  const status=root.querySelector('#taste-shelf-message');
  if(!shelf||!list||!search||!tabs||!status||typeof onAdd!=='function')return;
  let category='all';
  function paint(){
    const visible=filterTasteReferences({category,query:search.value});
    tabs.replaceChildren();
    for(const group of categories){
      const button=el('button','taste-shelf-tab',group.label);
      button.type='button';button.dataset.tasteCategory=group.value;
      button.setAttribute('aria-pressed',String(group.value===category));
      tabs.append(button);
    }
    list.replaceChildren();
    if(!visible.length)list.append(el('p','taste-shelf-empty','No example matches. Try a different search or category.'));
    else for(const item of visible){
      const button=el('button','taste-shelf-item');
      button.type='button';button.dataset.tasteReference=item.name;
      button.setAttribute('aria-label','Add '+item.name+' to selected participant');
      button.append(el('strong','',item.name),el('small','',item.hint));
      list.append(button);
    }
    const count=root.querySelector('#taste-shelf-count');
    if(count)count.textContent=visible.length+' shown · '+TASTE_REFERENCES.length+' editorial examples';
    refreshTastePeople(root);
  }
  tabs.addEventListener('click',event=>{
    const button=event.target.closest('button[data-taste-category]');
    if(!button)return;category=button.dataset.tasteCategory;status.textContent='';paint();
  });
  search.addEventListener('input',()=>{status.textContent='';paint();});
  list.addEventListener('click',event=>{
    const button=event.target.closest('button[data-taste-reference]');
    if(!button)return;
    const index=Number(root.querySelector('#taste-shelf-person').value);
    try{
      const response=onAdd({index,name:button.dataset.tasteReference});
      status.textContent=String(response||button.dataset.tasteReference+' added to the group brief. No Qloo lookup was made.');
    }catch(error){status.textContent=String(error?.message||'Could not add this favorite.');}
  });
  root.querySelector('#taste-shelf-reset')?.addEventListener('click',()=>{
    search.value='';category='all';status.textContent='';paint();search.focus();
  });
  paint();
}

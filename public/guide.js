/**
 * Local-only searchable help. Never looks up a provider or sends user queries
 * to analytics, Qloo or UNISON endpoints.
 */
export function matchingHelpItems(items,query=''){
  const needle=String(query??'').trim().toLocaleLowerCase();
  return (Array.isArray(items)?items:[]).filter(item=>{
    if(!needle)return true;
    const text=[item.question,item.answer,item.topic].map(x=>String(x??'')).join(' ').toLocaleLowerCase();
    return text.includes(needle);
  });
}
export function mountHelpSearch({root=document}={}){
  const search=root.querySelector('#help-search-input');
  const faq=root.querySelector('#help-faq-list');
  const count=root.querySelector('#help-count');
  const none=root.querySelector('#help-no-results');
  if(!search||!faq||!count||!none)return;
  const details=[...faq.querySelectorAll('details[data-help-topic]')];
  const records=details.map(el=>({
    topic:el.dataset.helpTopic,
    question:el.querySelector('summary')?.textContent||'',
    answer:el.querySelector('p')?.textContent||''
  }));
  const update=()=>{
    const matching=new Set(matchingHelpItems(records,search.value).map(x=>x.topic));
    let shown=0;
    details.forEach(el=>{
      const visible=matching.has(el.dataset.helpTopic);
      el.hidden=!visible;
      if(!visible)el.open=false;
      if(visible)shown++;
    });
    count.textContent=search.value.trim()?shown+' of '+details.length+' answers':details.length+' answers';
    none.hidden=shown!==0;
  };
  search.addEventListener('input',update);
  search.addEventListener('keydown',event=>{if(event.key==='Escape'&&search.value){search.value='';update();}});
  root.querySelector('#help-reset')?.addEventListener('click',()=>{
    search.value='';update();search.focus();
  });
  update();
}
mountHelpSearch();

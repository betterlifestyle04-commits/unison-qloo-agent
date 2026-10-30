import {VERIFIED_CASES,API_PIPELINE_PROOF,filterVerifiedCases,evidenceSummary} from './evidence-data.js';

const $=selector=>document.querySelector(selector);
const make=(tag,className,text)=>{
  const element=document.createElement(tag);
  if(className)element.className=className;
  if(text!==undefined)element.textContent=String(text);
  return element;
};
const metrics=evidenceSummary();
$('#evidence-case-count').textContent=metrics.cases;
$('#evidence-city-count').textContent=metrics.cities;
$('#evidence-group-sizes').textContent=metrics.peopleSizes.join(', ');
$('#evidence-run-count').textContent=metrics.runs;
$('#evidence-pipeline-link').href=API_PIPELINE_PROOF.source;
const cards=$('#evidence-cards'),counter=$('#evidence-visible-count');
const controls=['#evidence-search','#evidence-domain','#evidence-city','#evidence-people'];

function evidenceCaseCard(x){
  const card=make('article','evidence-case-card');
  const header=make('div','evidence-case-head');
  const icon=make('span','evidence-case-icon',x.domain==='movies'?'▣':'⌖');
  icon.setAttribute('aria-hidden','true');
  const heading=make('div','evidence-case-title');
  const type=make('div','evidence-case-eyebrow',x.domain==='movies'?'MOVIE NIGHT · LIVE QLOO':'GROUP OUTING · LIVE QLOO');
  const title=make('h3','',x.title);
  heading.append(type,title);
  header.append(icon,heading);
  const meta=make('div','evidence-case-tags');
  meta.append(
    make('span','',x.people+' participants'),
    make('span','',x.city==='—'?'No city required':x.city+', '+x.country),
    make('span','',x.date)
  );
  const coverage=make('div','evidence-case-coverage');
  const label=make('div','evidence-case-coverage-label');
  label.append(make('span','','Candidates with complete group evidence'),make('strong','',x.covered+' / '+x.candidates));
  const meter=make('meter','evidence-case-meter');
  meter.min=0;meter.max=x.candidates;meter.value=x.covered;
  meter.setAttribute('aria-label',x.covered+' of '+x.candidates+' candidates had complete per-person evidence');
  meter.textContent=x.covered+' of '+x.candidates;
  coverage.append(label,meter,make('p','','This counts observed group comparison evidence, not popularity or expected enjoyment.'));
  const observed=make('div','evidence-case-detail');
  observed.append(make('span','evidence-case-detail-kicker','WHAT THE TEST EXERCISED'),make('p','',x.focus));
  const limits=make('div','evidence-case-caution');
  limits.append(make('span','','LIMITATION'),make('p','',x.limits));
  const footer=make('div','evidence-case-bottom');
  const proof=make('a','evidence-proof-link','View original passing run ↗');
  proof.href=x.source;proof.target='_blank';proof.rel='noopener noreferrer';
  const id=make('span','evidence-run-id','GitHub Actions #'+x.run);
  footer.append(proof,id);
  card.append(header,meta,coverage,observed,limits,footer);
  return card;
}
function paint(){
  const query=$('#evidence-search').value;
  const domain=$('#evidence-domain').value;
  const city=$('#evidence-city').value;
  const people=$('#evidence-people').value;
  const result=filterVerifiedCases({query,domain,city,people});
  counter.textContent='Showing '+result.length+' of '+VERIFIED_CASES.length+' documented scenarios';
  cards.replaceChildren();
  if(result.length)cards.append(...result.map(evidenceCaseCard));
  else{
    const empty=make('div','evidence-no-results');
    empty.append(make('strong','','No matching verified cases'),make('p','','These historical tests covered only specific workflows. Try another activity, location or group size.'));
    const button=make('button','','Clear filters');
    button.type='button';
    button.addEventListener('click',reset);
    empty.append(button);cards.append(empty);
  }
}
function reset(){
  $('#evidence-search').value='';
  $('#evidence-domain').value='all';
  $('#evidence-city').value='all';
  $('#evidence-people').value='all';
  paint();$('#evidence-search').focus();
}
for(const selector of controls){
  $(selector).addEventListener(selector==='#evidence-search'?'input':'change',paint);
}
$('#evidence-reset').addEventListener('click',reset);
paint();

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {server} from '../server.js';
import {encodeShareBrief} from '../public/planner-state.js';
import {runAgent} from '../src/agent.js';

let browser,origin;
const errors=[];
const trackErrors=page=>{
  page.on('pageerror',error=>errors.push(error.message+(error.stack?' — '+error.stack:'')));
  page.on('console',message=>{if(message.type()==='error')errors.push('Browser console: '+message.text());});
  page.on('requestfailed',request=>errors.push('Failed request '+request.url()+': '+request.failure()?.errorText));
};
async function waitForResults(page){
  try{await page.locator('#results .result-topline').waitFor({timeout:5000});}
  catch(error){
    const debug={errors,results:await page.locator('#results').innerText(),formError:await page.locator('#form-error').innerText(),people:await page.locator('#people .person').count(),url:page.url()};
    throw new Error('Browser could not reach results: '+JSON.stringify(debug),{cause:error});
  }
}


test.before(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  origin='http://127.0.0.1:'+server.address().port;
  const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  browser=await chromium.launch({headless:true,...(executablePath?{executablePath,args:['--no-sandbox']}:{} )});
  await mkdir('browser-tests/screenshots',{recursive:true});
});
test.after(async()=>{
  if(browser)await browser.close();
  if(server.listening)await new Promise(resolve=>server.close(resolve));
});

test('desktop: full demo workflow, votes, weighting, archive, report and calendar',async()=>{
  const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
  const page=await context.newPage();
  trackErrors(page);
  const calls=[];
  page.on('request',request=>{if(request.url().includes('/api/plan')||request.url().includes('/api/taste-lookup'))calls.push({url:request.url(),method:request.method(),body:request.postData()});});
  try{
    await page.goto(origin+'/',{waitUntil:'networkidle'});
    assert.equal(await page.locator('input[name="mode"][value="demo"]').isChecked(),true,'initial mode must be demo');
    await page.locator('#instant-demo').click();
    await waitForResults(page);
    assert.match(await page.locator('#results .source-banner').innerText(),/Fictional demonstration/i);
    assert.ok(await page.locator('#results .card').count()>=2);
    assert.ok(await page.locator('.decision-lab').count()>0);
    assert.ok(await page.locator('.evidence-audit').count()>0);
    assert.ok(await page.locator('.head-to-head').count()>0);
    assert.equal(await page.locator('.decision-status-grid>*').count(),3);
    assert.match(await page.locator('.decision-status').innerText(),/EVIDENCE|GROUP AGREEMENT|PRACTICAL CHECK/);
    await page.locator('.decision-status a[href="#venue-readiness"]').click();
    assert.match(page.url(),/#venue-readiness$/);
    assert.ok(await page.locator('#venue-readiness').isVisible());
    assert.ok(await page.locator('.decision-workspace-nav a').count()>=4);
    await page.locator('.decision-workspace-nav a[href="#evidence-audit"]').click();
    assert.match(page.url(),/#evidence-audit$/);
    assert.equal(await page.locator('.decision-workspace-nav a[href="#evidence-audit"]').getAttribute('aria-current'),'page');
    assert.ok(await page.locator('#evidence-audit').isVisible());
    const stability=page.locator('.group-stability');
    assert.equal(await stability.count(),1);
    await stability.locator('summary').click();
    assert.ok(await stability.locator('.stability-table tbody tr').count()>=3);
    assert.match(await stability.innerText(),/hypothetical|Hypothetically/i);
    const venue=page.locator('.venue-readiness');
    assert.equal(await venue.count(),1);
    assert.match(await venue.innerText(),/fictional demo venue/i);
    await venue.locator('[data-readiness-key="location"]').check();
    await venue.locator('[data-readiness-key="hours"]').check();
    assert.match(await page.locator('#venue-readiness-count').innerText(),/2 \/ 4 reviewed/);
    assert.match(await page.locator('#decision-logistics-status strong').innerText(),/2 \/ 4 venue details reviewed locally/,'decision dashboard updates when the checklist changes');
    await page.locator('#agenda-choice').selectOption({index:1});
    assert.equal(await page.locator('#agenda-choice').evaluate(node=>document.activeElement===node),true,'switching a venue keeps focus on the choice control');
    assert.match(await page.locator('#venue-readiness-count').innerText(),/0 \/ 4 reviewed/);
    await page.locator('#agenda-choice').selectOption({index:0});
    assert.match(await page.locator('#venue-readiness-count').innerText(),/2 \/ 4 reviewed/);


    assert.equal(calls.length,1,'one-click demo must make exactly one planning request');
    assert.equal(JSON.parse(calls[0].body).mode,'demo');
    // Anonymous outcome research only exists in this browser. Demo ratings
    // must be clearly separated from real field evidence and not call Qloo.
    const study=page.locator('#outcome-study');
    assert.equal(await study.count(),1);
    await study.locator('[data-feedback-stage="expected"]').first().selectOption('3');
    assert.match(await study.locator('#outcome-summary').innerText(),/No matched before-and-after ratings/);
    await study.locator('[data-feedback-stage="experienced"]').first().selectOption('4');
    assert.match(await study.locator('#outcome-summary').innerText(),/1 of 3 participants/);
    const feedbackDownloadEvent=page.waitForEvent('download');
    await study.locator('#export-outcomes').click();
    const feedbackDownload=await feedbackDownloadEvent;
    assert.equal(feedbackDownload.suggestedFilename(),'unison-anonymous-outcome-feedback.csv');
    const feedbackText=await readFile(await feedbackDownload.path(),'utf8');
    assert.match(feedbackText,/FICTIONAL DEMO - NOT FIELD EVIDENCE/);
    assert.match(feedbackText,/"Participant 1","3","4","1"/);
    assert.doesNotMatch(feedbackText,/Maya|Jon|Priya/);
    await page.screenshot({path:'browser-tests/screenshots/desktop-demo.png',fullPage:true});

    const before=calls.length;
    await page.locator('[data-style="protective"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('[data-style="protective"]').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('[data-style="protective"]').evaluate(node=>document.activeElement===node),true,'fairness control keeps keyboard focus after local re-ranking');
    const veto=page.locator('[data-veto="demo:olive-table"]');
    await veto.focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('[data-veto="demo:olive-table"]').innerText(),'↶ Restore option');
    assert.equal(await page.locator('[data-veto="demo:olive-table"]').evaluate(node=>node.closest('.card')?.classList.contains('vetoed')),true);
    assert.equal(await page.locator('[data-veto="demo:olive-table"]').evaluate(node=>document.activeElement===node),true,'veto keeps keyboard focus after local replanning');
    assert.equal(calls.length,before,'vetoing cannot call Qloo');
    await page.keyboard.press('Space');
    assert.equal(await page.locator('[data-veto="demo:olive-table"]').innerText(),'× Not for our group');
    assert.equal(await page.locator('[data-veto="demo:olive-table"]').evaluate(node=>node.closest('.card')?.classList.contains('vetoed')),false);
    assert.equal(calls.length,before,'restoring a veto cannot call Qloo');
    const left=page.locator('#compare-left'),right=page.locator('#compare-right');
    assert.ok(await left.locator('option').count()>=2);
    await right.selectOption({index:1});
    assert.ok(await page.locator('.head-to-head-table tbody tr').count()>=2);

    await page.locator('#open-top-ballot').click();
    const chosen=page.locator('.group-ballot[open]').first();
    assert.equal(await chosen.locator('[data-vote-choice]').first().evaluate(node=>document.activeElement===node),true,'opening participant voting moves focus into the vote controls');
    await chosen.locator('[data-vote-choice="yes"]').first().focus();
    await page.keyboard.press('Space');
    assert.match(await page.locator('.agreement-count').innerText(),/1\s*\/\s*3/);
    assert.equal(await page.locator('[data-vote-choice="yes"]').first().evaluate(node=>document.activeElement===node),true,'vote control keeps keyboard focus after local re-render');
    assert.equal(calls.length,before,'voting and local fairness controls cannot call Qloo');
    await page.locator('#clear-local-votes').click();
    assert.match(await page.locator('.agreement-count').innerText(),/0\s*\/\s*3/);
    assert.equal(await page.locator('#clear-local-votes').isDisabled(),true);
    assert.equal(await page.locator('#agreement-heading').evaluate(node=>document.activeElement===node),true,'clearing votes moves focus to the refreshed agreement status');
    assert.equal(calls.length,before,'clearing local votes cannot call Qloo');

    const reportEvent=page.waitForEvent('download');
    await page.locator('#download-report').click();
    const report=await reportEvent;
    assert.match(report.suggestedFilename(),/^unison-decision-demo-.*\.md$/);
    const reportContents=await readFile(await report.path(),'utf8');
    assert.match(reportContents,/FICTIONAL DEMO/);
    assert.match(reportContents,/Human votes/);

    await page.locator('#save-plan').click();
    assert.ok((await page.locator('#device-plans').innerText()).includes('Open brief'));
    await page.locator('#device-plans [data-open-device]').first().click();
    assert.equal(await page.locator('input[name="mode"][value="demo"]').isChecked(),true);
    assert.equal(calls.length,before,'restoring a saved brief must not submit a new plan');
    await page.locator('#device-plans [data-delete-device]').first().click();
    assert.match(await page.locator('#device-plans').innerText(),/No saved plans yet/i);

    await page.locator('#instant-demo').click();
    await page.locator('#results .result-topline').waitFor();
    await page.locator('#agenda-date').fill('2026-11-14');
    await page.locator('#agenda-time').fill('19:30');
    const calendarEvent=page.waitForEvent('download');
    await page.locator('#download-calendar').click();
    const calendar=await calendarEvent;
    assert.equal(calendar.suggestedFilename(),'unison-group-plan.ics');
    const calendarText=await readFile(await calendar.path(),'utf8');
    assert.match(calendarText,/STATUS:TENTATIVE/);
    assert.match(calendarText,/No reservation or booking/);
    assert.match(calendarText,/LOCATION:\r?\n/,'unverified venues must not be silently used as confirmed meeting points');
    await page.locator('#agenda-meeting').fill('Main entrance, Oslo');
    const secondCalendarEvent=page.waitForEvent('download');
    await page.locator('#download-calendar').click();
    const secondCalendar=await secondCalendarEvent;
    assert.match(await readFile(await secondCalendar.path(),'utf8'),/LOCATION:Main entrance\\, Oslo/);
    assert.ok(await page.locator('.place-filter-disclosure').count()>0);
    assert.deepEqual(errors,[], 'no uncaught browser JavaScript errors');
  }finally{await context.close();}
});

test('mobile: working demo and responsive navigation without document overflow',async()=>{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const page=await context.newPage();trackErrors(page);
  try{
    await page.goto(origin+'/',{waitUntil:'networkidle'});
    await page.locator('#instant-demo').click();
    await waitForResults(page);
    assert.equal(await page.locator('input[name="mode"][value="demo"]').isChecked(),true);
    const width=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:window.innerWidth}));
    assert.ok(width.page<=width.viewport+2,'mobile page must not have horizontal overflow: '+JSON.stringify(width));
    await page.screenshot({path:'browser-tests/screenshots/mobile-demo.png',fullPage:true});
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
});

test('skip link moves keyboard focus to the planner',async()=>{
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  const page=await context.newPage();trackErrors(page);
  try{
    await page.goto(origin+'/',{waitUntil:'networkidle'});
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('.skip').evaluate(node=>document.activeElement===node),true);
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#planner').evaluate(node=>document.activeElement===node),true);
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
});

test('planner carries participant edits and practical constraints into demo requests',async()=>{
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  const page=await context.newPage();trackErrors(page);
  const plans=[];
  page.on('request',request=>{if(request.url().includes('/api/plan'))plans.push(request.postDataJSON());});
  try{
    await page.goto(origin+'/',{waitUntil:'networkidle'});
    assert.equal(await page.locator('#people .person').count(),3);
    assert.equal(await page.locator('#brief-ready-score').innerText(),'3 / 3 ready');
    await page.locator('#add-person').click();
    assert.equal(await page.locator('#people .person').count(),4);
    assert.equal(await page.locator('#people .person').last().locator('[data-field=name]').evaluate(node=>document.activeElement===node),true);
    assert.equal(await page.locator('#brief-ready-score').innerText(),'2 / 3 ready');
    await page.locator('#people .person').last().locator('[data-field=name]').fill('Lina');
    await page.locator('#people .person').last().locator('[data-field=favorite]').fill('jazz');
    assert.equal(await page.locator('#brief-ready-score').innerText(),'3 / 3 ready');
    await page.locator('#people .person').last().locator('.remove').click();
    assert.equal(await page.locator('#people .person').count(),3);
    assert.equal(await page.locator('#people .person').last().locator('[data-field=name]').evaluate(node=>document.activeElement===node),true,'removing a participant returns keyboard focus to a remaining participant');

    await page.locator('#city').fill('Oslo');
    await page.locator('#budget').selectOption('low');
    await page.locator('#people .person').first().locator('[data-field=favorite]').fill('Studio Ghibli, jazz');
    const firstPlan=page.waitForResponse(response=>response.url().includes('/api/plan')&&response.request().method()==='POST');
    await page.locator('#submit-plan').click();
    await firstPlan;
    await waitForResults(page);
    assert.equal(plans.length,1);
    assert.deepEqual({domain:plans[0].domain,city:plans[0].city,budget:plans[0].budget},{domain:'places',city:'Oslo',budget:'low'});
    assert.deepEqual(plans[0].people[0].favorites,['Studio Ghibli','jazz']);

    await page.locator('input[name="domain"][value="movies"]').check({force:true});
    const secondPlan=page.waitForResponse(response=>response.url().includes('/api/plan')&&response.request().method()==='POST');
    await page.locator('#submit-plan').click();
    await secondPlan;
    await waitForResults(page);
    assert.equal(plans.length,2);
    assert.equal(plans[1].domain,'movies');
    assert.equal(plans[1].mode,'demo');
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
});

test('copied group setup restores in explicit demo mode without a plan request',async()=>{
  const context=await browser.newContext({viewport:{width:1280,height:800},permissions:['clipboard-read','clipboard-write']});
  const page=await context.newPage();trackErrors(page);
  const planRequests=[];
  page.on('request',request=>{if(request.url().includes('/api/plan'))planRequests.push(request.url());});
  try{
    await page.goto(origin+'/',{waitUntil:'networkidle'});
    await page.locator('#city').fill('Oslo');
    await page.locator('#share-brief').click();
    await page.waitForFunction(()=>Boolean(document.querySelector('#share-message')?.textContent));
    assert.match(await page.locator('#share-message').innerText(),/Group setup link copied/i);
    const sharedUrl=await page.evaluate(()=>navigator.clipboard.readText());
    assert.ok(sharedUrl.startsWith(origin+'/#plan='));

    const restored=await context.newPage();trackErrors(restored);
    const restoredRequests=[];
    restored.on('request',request=>{if(request.url().includes('/api/plan'))restoredRequests.push(request.url());});
    await restored.goto(sharedUrl,{waitUntil:'networkidle'});
    assert.equal(await restored.locator('input[name="mode"][value="demo"]').isChecked(),true);
    assert.equal(await restored.locator('#city').inputValue(),'Oslo');
    assert.match(await restored.locator('#share-message').innerText(),/Shared group loaded in demo mode/i);
    assert.equal(planRequests.length,0);
    assert.equal(restoredRequests.length,0);
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
});

test('shared link remains demo-only even when status indicates Qloo is configured',async()=>{
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  const page=await context.newPage();trackErrors(page);
  const encoded=encodeShareBrief({
    domain:'movies',mode:'live',city:'',budget:'any',
    people:[{name:'Alex',favorites:['Interstellar']},{name:'Sam',favorites:['La La Land']}]
  });
  const planRequests=[];
  await page.route('**/api/status',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({configured:true,mode:'live-ready'})}));
  page.on('request',request=>{if(request.url().includes('/api/plan'))planRequests.push(request.url());});
  try{
    await page.goto(origin+'/#plan='+encoded,{waitUntil:'networkidle'});
    assert.equal(await page.locator('input[name="mode"][value="demo"]').isChecked(),true);
    assert.equal(await page.locator('input[name="mode"][value="live"]').isChecked(),false);
    assert.equal(await page.locator('input[name="mode"][value="live"]').isEnabled(),true);
    assert.equal(planRequests.length,0);
    assert.match(await page.locator('#share-message').innerText(),/demo mode/,'Shared link status: '+JSON.stringify(errors));
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
});

test('mocked live browser journey: explicit opt-in, precise Taste Finder and honest recovery',async()=>{
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  const page=await context.newPage();
  trackErrors(page);
  const submissions=[];
  const diagnosticsRequests=[];
  await page.route('**/api/qloo-diagnostics',route=>{
    diagnosticsRequests.push({method:route.request().method(),body:route.request().postData()});
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      ok:true,source:'Live Qloo tools',stages:[
        {step:'Search',status:'passed',detail:'One exact movie'},
        {step:'Insights discovery',status:'passed',detail:'Three candidates'},
        {step:'Insights shortlist',status:'passed',detail:'Three shortlisted candidates'}
      ],note:'This is a sample check.'
    })});
  });
  await page.route('**/api/status',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({configured:true,mode:'live-ready',source:'server-configuration'})
  }));
  await page.route('**/api/taste-lookup?**',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({query:'Interstellar',matches:[{id:'057DA9D9-399B-437E-8BCA-A80E499125EF',name:'Interstellar',type:'urn:entity:movie'}],exact:true,cached:false})
  }));
  await page.route('**/api/plan',async route=>{
    submissions.push(route.request().postDataJSON());
    await route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({error:'Please clarify Jon\'s favorite using Taste Finder. Multiple entities share the title.'})});
  });
  try{
    await page.goto(origin+'/',{waitUntil:'networkidle'});
    assert.equal(await page.locator('input[name="mode"][value="demo"]').isChecked(),true);
    assert.equal(await page.locator('input[name="mode"][value="live"]').isEnabled(),true);
    await page.locator('input[name="mode"][value="live"]').check({force:true});
    assert.equal(await page.locator('#brief-ready-score').innerText(),'2 / 3 ready');
    await page.locator('#submit-plan').click();
    assert.match(await page.locator('#form-error').innerText(),/Enter a city/i);
    assert.equal(await page.locator('#city').evaluate(node=>document.activeElement===node),true,'missing live city focuses the practical constraint that needs attention');
    assert.equal(await page.locator('#city').getAttribute('aria-invalid'),'true');
    assert.equal(submissions.length,0,'client validation cannot call the planner');
    await page.locator('#city').fill('Oslo');
    assert.equal(await page.locator('#city').getAttribute('aria-invalid'),null);
    assert.equal(await page.locator('#brief-ready-score').innerText(),'3 / 3 ready');
    assert.equal(await page.locator('#taste-finder').isVisible(),true);
    assert.equal(await page.locator('#qloo-diagnostics').isVisible(),true);
    assert.equal(diagnosticsRequests.length,0,'diagnostics cannot run on page load or mode change');
    await page.locator('#qloo-check').click();
    await page.locator('#qloo-check-results strong').waitFor();
    assert.match(await page.locator('#qloo-check-results').innerText(),/All three live Qloo stages passed/);
    assert.equal(diagnosticsRequests.length,1);
    assert.equal(diagnosticsRequests[0].method,'POST');
    assert.equal(diagnosticsRequests[0].body,null,'never send participant data to connection check');
    assert.equal(submissions.length,0);

    await page.locator('#taste-query').fill('Interstellar');
    await page.locator('#taste-find').click();
    await page.locator('.taste-match').first().click();
    assert.match(await page.locator('#people .person').first().locator('[data-pinned]').innerText(),/Interstellar \(movie\)/);
    await page.locator('#submit-plan').click();
    await page.locator('.plan-recovery').waitFor({timeout:10000});
    assert.match(await page.locator('#recovery-title').innerText(),/clarification/i);
    assert.equal(await page.locator('#recovery-title').evaluate(node=>document.activeElement===node),true,'failed planning moves keyboard focus to the recovery explanation');
    assert.equal(submissions.length,1);
    assert.equal(submissions[0].mode,'live');
    assert.ok(submissions[0].people[0].selectedEntities.some(item=>item.id==='057DA9D9-399B-437E-8BCA-A80E499125EF'));
    await page.locator('#recovery-demo').click();
    assert.equal(await page.locator('input[name="mode"][value="demo"]').isChecked(),true);
    assert.equal(submissions.length,1,'switching to demo must not trigger automatic plan submissions');
    // Chromium logs an expected 422 response as a console network warning; this is
    // the deliberately mocked API validation failure, not a JavaScript exception.
    const unexpected=errors.filter(error=>!/Browser console: Failed to load resource: .*422 \(Unprocessable Entity\)/.test(error));
    assert.deepEqual(unexpected,[]);
  }finally{await context.close();}
});

test('mocked live venue UI exposes external research, unsent enquiry and anonymous feedback without a Qloo call',async()=>{
  const context=await browser.newContext({viewport:{width:1260,height:850},permissions:['clipboard-read','clipboard-write']});
  const page=await context.newPage();trackErrors(page);
  const sample=await runAgent({mode:'demo',domain:'places',city:'London, UK',budget:'any',people:[
    {name:'Ada',favorites:['jazz']},{name:'Bea',favorites:['films']}
  ]});
  const mock={...sample,mode:'live',disclaimer:'Mocked Qloo fixture for browser acceptance; no upstream Qloo request.',ranked:sample.ranked.map((item,i)=>({
    ...item,name:'Mock Test Venue '+(i+1),address:'Test street, London'
  }))};
  let submitted=0;
  await page.route('**/api/status',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({configured:true,mode:'live-ready'})}));
  await page.route('**/api/plan',route=>{
    submitted++;
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(mock)});
  });
  try{
    await page.goto(origin+'/',{waitUntil:'networkidle'});
    await page.locator('input[name=mode][value=live]').check({force:true});
    await page.locator('#city').fill('London, UK');
    await page.locator('#submit-plan').click();
    await waitForResults(page);
    assert.equal(submitted,1);
    assert.equal(await page.locator('#venue-readiness .venue-external a').count(),2);
    const links=await page.locator('#venue-readiness .venue-external a').evaluateAll(nodes=>nodes.map(node=>node.href));
    assert.ok(links.every(link=>link.startsWith('https://www.google.com/')));
    assert.match(await page.locator('#venue-readiness').innerText(),/does not retrieve, check or confirm their availability/);
    await page.locator('#venue-copy-inquiry').click();
    const message=await page.evaluate(()=>navigator.clipboard.readText());
    assert.match(message,/confirm the exact address/);
    assert.match(message,/group of 2/);
    assert.equal(submitted,1,'research links, clipboard and ratings should never send another Qloo plan');
    const survey=page.locator('#outcome-study');
    await survey.locator('[data-feedback-stage="expected"]').first().selectOption('2');
    await survey.locator('[data-feedback-stage="experienced"]').first().selectOption('5');
    assert.match(await survey.locator('#outcome-summary').innerText(),/expectation gap, not proof/i);
    const dl=page.waitForEvent('download');
    await survey.locator('#export-outcomes').click();
    const file=await dl;
    const text=await readFile(await file.path(),'utf8');
    assert.match(text,/SELF-REPORTED - NOT CAUSAL EVIDENCE/);
    assert.doesNotMatch(text,/Ada|Bea|Mock Test Venue/);
    assert.equal(submitted,1);
  }finally{await context.close();}
});

test('stop waiting and changing a brief never show a stale live result',async()=>{
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  const page=await context.newPage();
  const scriptErrors=[];
  page.on('pageerror',error=>scriptErrors.push(error.message));
  let submitted=0;
  await page.route('**/api/status',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({configured:true,mode:'live-ready'})}));
  await page.route('**/api/plan',async route=>{
    submitted++;
    // Deliberately leave the response pending long enough to exercise cancellation.
    await new Promise(resolve=>setTimeout(resolve,1600));
    try{await route.fulfill({status:200,contentType:'application/json',body:'{"unexpected":"stale"}'});}catch{/* the browser cancelled the request */}
  });
  try{
    await page.goto(origin+'/',{waitUntil:'networkidle'});
    await page.locator('input[name=mode][value=live]').check({force:true});
    await page.locator('#city').fill('Oslo');
    await page.locator('#submit-plan').click();
    await page.locator('#cancel-plan').waitFor({timeout:5000});
    assert.match(await page.locator('#results .loader').innerText(),/server.*may.*continue|server.*will stop|server.*stop or avoid/i);
    await page.locator('#cancel-plan').click();
    await page.locator('.plan-recovery').waitFor({timeout:6000});
    assert.match(await page.locator('#recovery-title').innerText(),/stopped waiting/i);
    assert.match(await page.locator('.plan-recovery').innerText(),/API quota/);
    assert.equal(await page.locator('#submit-plan').isEnabled(),true);
    assert.equal(submitted,1);
    // A user can safely start over, then choose a new brief while waiting.
    await page.locator('#submit-plan').click();
    await page.locator('#cancel-plan').waitFor();
    await page.locator('[data-preset]').first().click();
    assert.equal(await page.locator('#results .empty').count(),1);
    await page.waitForTimeout(1850);
    assert.equal(await page.locator('#results .result-topline').count(),0,'stale response did not overwrite new group setup');
    assert.equal(await page.locator('#results .plan-recovery').count(),0,'old error did not overwrite new group setup');
    assert.equal(await page.locator('#submit-plan').isEnabled(),true);
    assert.equal(submitted,2);
    assert.deepEqual(scriptErrors,[]);
  }finally{await context.close();}
});


test('discovery studio: search, filter, edit fictional brief and track on-device saves',async()=>{
  const context=await browser.newContext({viewport:{width:1280,height:860}});
  const page=await context.newPage();
  trackErrors(page);
  const requests=[];
  page.on('request',request=>{if(request.url().includes('/api/plan')||request.url().includes('/api/taste-lookup'))requests.push(request.url());});
  try{
    await page.goto(origin+'/',{waitUntil:'networkidle'});
    assert.equal(await page.locator('#explore-gallery .explore-card').count(),9);
    assert.equal(await page.locator('#workspace-scenarios-number').innerText(),'9');
    assert.equal(await page.locator('#workspace-saved-number').innerText(),'0');
    await page.locator('[data-explore-domain="movies"]').click();
    assert.equal(await page.locator('[data-explore-domain="movies"]').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#explore-gallery .explore-card').count(),3);
    await page.locator('#explore-search').fill('film club');
    assert.equal(await page.locator('#explore-gallery .explore-card').count(),1);
    await page.locator('#explore-gallery [data-preset="cineclub"]').click();
    assert.equal(await page.locator('#people .person').count(),4);
    assert.equal(await page.locator('input[name="domain"]:checked').inputValue(),'movies');
    assert.equal(await page.locator('input[name="mode"]:checked').inputValue(),'demo');
    assert.equal(requests.length,0,'exploring and opening a brief must not invoke any API');
    await page.locator('#submit-plan').click();
    await waitForResults(page);
    const inReadingOrder=await page.locator('#decision-summary').evaluate(node=>{
      const shortlist=document.querySelector('#shortlist-heading');
      const handoff=document.querySelector('#handoff-heading');
      const analysis=document.querySelector('.decision-lab');
      const follows=(a,b)=>Boolean(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING);
      return Boolean(shortlist&&handoff&&analysis&&follows(node,shortlist)&&follows(shortlist,handoff)&&follows(handoff,analysis));
    });
    assert.equal(inReadingOrder,true,'recommendation, shortlist and practical plan should precede the advanced decision analysis');
    assert.equal(requests.length,1,'only explicit plan submission invokes the planning API');
    assert.match(await page.locator('.source-banner').innerText(),/Fictional demonstration/);
    await page.locator('#save-plan').click();
    assert.equal(await page.locator('#workspace-saved-number').innerText(),'1');
    await page.locator('#device-plans [data-delete-device]').click();
    assert.equal(await page.locator('#workspace-saved-number').innerText(),'0');
    await page.locator('#explore-clear').click();
    assert.equal(await page.locator('#explore-gallery .explore-card').count(),9);
    await page.screenshot({path:'browser-tests/screenshots/discovery-studio.png',fullPage:true});
  }finally{await context.close();}
});


test('private workspace: saved plans search, JSON backup export and safe restore without Qloo calls',async()=>{
  const context=await browser.newContext({viewport:{width:1200,height:850},acceptDownloads:true});
  const page=await context.newPage();
  trackErrors(page);
  const requests=[];
  page.on('request',request=>{if(request.url().includes('/api/plan')||request.url().includes('/api/taste-lookup'))requests.push(request.url());});
  try{
    await page.goto(origin+'/',{waitUntil:'networkidle'});
    assert.equal(await page.locator('#library-export').isDisabled(),true);
    assert.ok(await page.locator('#data-methods').count());
    await page.locator('#instant-demo').click();
    await waitForResults(page);
    assert.equal(requests.length,1);
    await page.locator('#save-plan').click();
    assert.equal(await page.locator('#workspace-saved-number').innerText(),'1');
    assert.equal(await page.locator('#library-total').innerText(),'1 / 8 saved');
    assert.equal(await page.locator('#device-plans .device-item').count(),1);
    await page.locator('#library-search').fill('missing-city-name');
    assert.equal(await page.locator('#device-plans .device-item').count(),0);
    await page.locator('#library-search').fill('Maya');
    assert.equal(await page.locator('#device-plans .device-item').count(),1);
    await page.locator('#library-search').fill('');
    const downloadEvent=page.waitForEvent('download');
    await page.locator('#library-export').click();
    const download=await downloadEvent;
    assert.equal(download.suggestedFilename(),'unison-private-plan-backup.json');
    const backup=await readFile(await download.path(),'utf8');
    assert.match(backup,/unison-device-plans/);
    assert.match(backup,/Maya/);
    assert.match(await page.locator('#library-message').innerText(),/not encrypted/i);
    await page.locator('#device-plans [data-delete-device]').click();
    assert.equal(await page.locator('#workspace-saved-number').innerText(),'0');
    await page.locator('#library-import-file').setInputFiles({name:'unison-private-plan-backup.json',mimeType:'application/json',buffer:Buffer.from(backup)});
    await page.waitForFunction(()=>document.querySelector('#workspace-saved-number')?.textContent==='1',null,{timeout:5000});
    assert.equal(await page.locator('#workspace-saved-number').innerText(),'1');
    assert.match(await page.locator('#library-message').innerText(),/1 plan imported/);
    await page.locator('#library-import-file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"format":"not-unison"}')});
    await page.waitForFunction(()=>document.querySelector('#library-message')?.textContent.startsWith('Nothing imported:'),null,{timeout:5000});
    assert.equal(await page.locator('#workspace-saved-number').innerText(),'1');
    assert.match(await page.locator('#library-message').innerText(),/Nothing imported/);
    assert.equal(requests.length,1,'local search, export and import must not request planning or spend Qloo quota');
    await page.screenshot({path:'browser-tests/screenshots/private-workspace.png',fullPage:true});
  }finally{await context.close();}
});


test('mobile workspace navigation exposes planning and saved plans without background requests',async()=>{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  trackErrors(page);
  const requests=[];
  page.on('request',request=>{if(request.url().includes('/api/plan'))requests.push(request.url());});
  try{
    await page.goto(origin+'/',{waitUntil:'networkidle'});
    const nav=page.locator('.mobile-workspace-nav');
    assert.equal(await nav.isVisible(),true);
    assert.equal(await nav.locator('a').count(),4);
    await nav.getByRole('link',{name:'Plan',exact:true}).click();
    assert.match(page.url(),/#planner$/);
    await nav.getByRole('link',{name:'Workspace',exact:true}).click();
    assert.match(page.url(),/\/workspace$/);
    assert.equal(await page.locator('#ws-total').innerText(),'0');
    assert.equal(requests.length,0);
  }finally{await context.close();}
});


test('personal workspace: dashboard, real saved-data metrics, search, backup and safe session resume',async()=>{
  const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
  const page=await context.newPage();
  trackErrors(page);
  const calls=[];
  page.on('request',request=>{if(request.url().includes('/api/plan')||request.url().includes('/api/taste-lookup'))calls.push(request.url());});
  try{
    await page.goto(origin+'/workspace',{waitUntil:'networkidle'});
    assert.equal(await page.title(),'My Workspace — UNISON');
    assert.equal(await page.locator('#ws-total').innerText(),'0');
    assert.equal(await page.locator('#ws-average').innerText(),'—');
    assert.equal(await page.locator('#ws-export').isDisabled(),true);
    assert.match(await page.locator('#ws-references').innerText(),/Save a plan/);
    assert.equal(calls.length,0,'an empty dashboard cannot generate real usage data or Qloo calls');

    await page.locator('.app-primary-action').click();
    await page.locator('#instant-demo').click();
    await waitForResults(page);
    assert.equal(calls.length,1);
    await page.locator('#save-plan').click();
    await page.goto(origin+'/workspace',{waitUntil:'networkidle'});

    assert.equal(await page.locator('#ws-total').innerText(),'1');
    assert.equal(await page.locator('#ws-people').innerText(),'3');
    assert.equal(await page.locator('#ws-live').innerText(),'0');
    assert.equal(await page.locator('#ws-average').innerText(),'3');
    assert.equal(await page.locator('.ws-plan-card').count(),1);
    assert.match(await page.locator('#ws-types').innerText(),/Outings\s*1/);
    assert.match(await page.locator('#ws-references').innerText(),/Studio Ghibli/);
    assert.equal(await page.locator('#ws-plan-list').getByRole('button',{name:/Open brief/}).count(),1);
    await page.locator('#ws-search').fill('totally unknown');
    assert.equal(await page.locator('.ws-plan-card').count(),0);
    await page.locator('#ws-search').fill('Maya');
    assert.equal(await page.locator('.ws-plan-card').count(),1);
    await page.locator('#ws-search').fill('');
    await page.locator('#ws-domain').selectOption('movies');
    assert.equal(await page.locator('.ws-plan-card').count(),0);
    await page.locator('#ws-domain').selectOption('all');
    assert.equal(await page.locator('.ws-plan-card').count(),1);
    const downloadStarted=page.waitForEvent('download');
    await page.locator('#ws-export').click();
    const downloaded=await downloadStarted;
    const backup=await readFile(await downloaded.path(),'utf8');
    assert.equal(downloaded.suggestedFilename(),'unison-private-plan-backup.json');
    assert.match(backup,/unison-device-plans/);
    assert.equal(calls.length,1,'dashboard charts, filters and export do not call Qloo');
    await page.locator('.ws-plan-card').getByRole('button',{name:/Open brief/}).click();
    await page.waitForURL(url=>url.pathname==='/'&&url.hash==='#planner');
    assert.equal(await page.locator('#people .person').count(),3);
    assert.equal(await page.locator('input[name="mode"][value="demo"]').isChecked(),true);
    assert.match(await page.locator('#share-message').innerText(),/private workspace/);
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('unison.pending-brief.v1')),null);
    assert.equal(calls.length,1,'resuming a local brief must not re-run the agent');
    assert.equal(page.url().includes('Maya'),false,'participant names must not leak into navigation URL');
    await page.screenshot({path:'browser-tests/screenshots/workspace-resumed.png',fullPage:true});

    await page.goto(origin+'/workspace',{waitUntil:'networkidle'});
    await page.screenshot({path:'browser-tests/screenshots/workspace-dashboard.png',fullPage:true});
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('.ws-plan-card').getByRole('button',{name:'Delete'}).click();
    assert.equal(await page.locator('#ws-total').innerText(),'0');
    await page.locator('#ws-import-file').setInputFiles({name:'unison-private-plan-backup.json',mimeType:'application/json',buffer:Buffer.from(backup)});
    await page.waitForFunction(()=>document.querySelector('#ws-total')?.textContent==='1',null,{timeout:5000});
    assert.equal(await page.locator('#ws-total').innerText(),'1');
    assert.equal(calls.length,1,'manual backup import cannot make Qloo calls');
  }finally{await context.close();}
});

test('mobile personal workspace: small-screen layout and navigable planner without overflow',async()=>{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  trackErrors(page);
  try{
    await page.goto(origin+'/workspace',{waitUntil:'networkidle'});
    assert.equal(await page.locator('.workspace-mobile-nav').isVisible(),true);
    assert.equal(await page.locator('.app-sidebar').isVisible(),false);
    const dimensions=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:window.innerWidth}));
    assert.ok(dimensions.document<=dimensions.viewport+1,'workspace must fit the mobile viewport: '+JSON.stringify(dimensions));
    await page.locator('.workspace-mobile-nav').getByRole('link',{name:'Plan'}).click();
    assert.equal(new URL(page.url()).pathname,'/');
  }finally{await context.close();}
});


test('taste inspiration: safely add editorial examples to individual participants without Qloo calls',async()=>{
  const context=await browser.newContext({viewport:{width:1250,height:850}});
  const page=await context.newPage();
  trackErrors(page);
  const calls=[];
  page.on('request',request=>{if(request.url().includes('/api/plan')||request.url().includes('/api/taste-lookup')||request.url().includes('/api/qloo-diagnostics'))calls.push(request.url());});
  try{
    await page.goto(origin+'/',{waitUntil:'networkidle'});
    assert.equal(await page.locator('#taste-shelf').count(),1);
    assert.equal(await page.locator('#taste-shelf').evaluate(el=>el.open),false);
    await page.locator('#taste-shelf summary').click();
    assert.equal(await page.locator('#taste-shelf-person option').count(),3);
    assert.equal(await page.locator('#taste-shelf-item').count(),0,'no unexpected element ID should be needed');
    assert.equal(await page.locator('[data-taste-reference]').count(),12);
    await page.locator('#taste-shelf-person').selectOption('1');
    await page.locator('#taste-shelf-search').fill('Miles Davis');
    assert.equal(await page.locator('[data-taste-reference]').count(),1);
    await page.locator('[data-taste-reference="Miles Davis"]').click();
    assert.equal(await page.locator('#people .person').nth(1).locator('[data-field=favorite]').inputValue(),'Anthony Bourdain, Miles Davis');
    assert.match(await page.locator('#taste-shelf-message').innerText(),/No Qloo lookup was made/);
    await page.locator('[data-taste-reference="Miles Davis"]').click();
    assert.match(await page.locator('#taste-shelf-message').innerText(),/already/);
    await page.locator('#taste-shelf-search').fill('Radiohead');
    await page.locator('[data-taste-reference="Radiohead"]').click();
    assert.equal(await page.locator('#people .person').nth(1).locator('[data-field=favorite]').inputValue(),'Anthony Bourdain, Miles Davis, Radiohead');
    await page.locator('#taste-shelf-search').fill('David Bowie');
    await page.locator('[data-taste-reference="David Bowie"]').click();
    assert.match(await page.locator('#taste-shelf-message').innerText(),/three favorites/);
    assert.equal(await page.locator('#people .person').nth(1).locator('[data-field=favorite]').inputValue(),'Anthony Bourdain, Miles Davis, Radiohead');
    await page.locator('#taste-shelf-reset').click();
    await page.locator('#taste-shelf-categories [data-taste-category="stories"]').click();
    await page.locator('#taste-shelf-person').selectOption('2');
    await page.locator('[data-taste-reference="Agatha Christie"]').click();
    assert.equal(await page.locator('#people .person').nth(2).locator('[data-field=favorite]').inputValue(),'Knives Out, Agatha Christie');
    assert.equal(calls.length,0,'inspiration catalog is local; selecting examples must not trigger an API call');
    assert.match(await page.locator('#brief-ready-score').innerText(),/3 \/ 3 ready/);
    await page.screenshot({path:'browser-tests/screenshots/taste-inspiration.png',fullPage:true});
    await page.locator('#plan-form').evaluate(node=>node.requestSubmit());
    await waitForResults(page);
    assert.equal(calls.length,1,'only a deliberate plan submission should request /api/plan');
    assert.match(await page.locator('.source-banner').innerText(),/Fictional demonstration/);
  }finally{await context.close();}
});

test('mobile taste inspiration catalog is usable and does not overflow',async()=>{
  const context=await browser.newContext({viewport:{width:375,height:812}});
  const page=await context.newPage();
  trackErrors(page);
  try{
    await page.goto(origin+'/',{waitUntil:'networkidle'});
    await page.locator('#taste-shelf summary').click();
    await page.locator('#taste-shelf-search').fill('jazz');
    assert.ok(await page.locator('[data-taste-reference]').count()>=1);
    const width=await page.evaluate(()=>({actual:document.documentElement.scrollWidth,viewport:window.innerWidth}));
    assert.ok(width.actual<=width.viewport+1,'taste inspiration must not overflow small screens: '+JSON.stringify(width));
    await page.screenshot({path:'browser-tests/screenshots/taste-inspiration-mobile.png',fullPage:true});
  }finally{await context.close();}
});


test('product guide: truthful evidence explanation, local FAQ search, and no automatic Qloo calls',async()=>{
  const context=await browser.newContext({viewport:{width:1320,height:860}});
  const page=await context.newPage();
  trackErrors(page);
  const calls=[];
  page.on('request',request=>{if(request.url().includes('/api/plan')||request.url().includes('/api/taste-lookup')||request.url().includes('/api/qloo-diagnostics'))calls.push(request.url());});
  try{
    await page.goto(origin+'/guide',{waitUntil:'networkidle'});
    assert.equal(await page.title(),'Product Guide & Help — UNISON');
    assert.equal(await page.locator('#help-faq-list details').count(),8);
    assert.match(await page.locator('#help-modes').innerText(),/FICTIONAL DEMO/);
    assert.match(await page.locator('#help-modes').innerText(),/LIVE QLOO/);
    assert.match(await page.locator('#help-modes').innerText(),/EDITORIAL INPUT/);
    assert.match(await page.locator('#help-count').innerText(),/8 answers/);
    await page.locator('#help-search-input').fill('booking');
    assert.equal(await page.locator('#help-faq-list details:visible').count(),1);
    assert.match(await page.locator('#help-count').innerText(),/1 of 8 answers/);
    await page.locator('[data-help-topic="bookings"] summary').click();
    assert.match(await page.locator('[data-help-topic="bookings"] p').innerText(),/No\./);
    await page.locator('#help-search-input').fill('no such help topic 222');
    assert.equal(await page.locator('#help-faq-list details:visible').count(),0);
    assert.equal(await page.locator('#help-no-results').isVisible(),true);
    await page.locator('#help-reset').click();
    assert.equal(await page.locator('#help-search-input').inputValue(),'');
    assert.equal(await page.locator('#help-faq-list details:visible').count(),8);
    assert.equal(calls.length,0,'reading help must not send live or demo planning requests');
    await page.screenshot({path:'browser-tests/screenshots/product-guide.png',fullPage:true});
    await page.locator('.help-hero-primary').click();
    assert.equal(new URL(page.url()).pathname,'/');
    assert.equal(calls.length,0,'navigating to the planner must not auto-submit');
  }finally{await context.close();}
});

test('mobile guide fits and its FAQ can be navigated by keyboard',async()=>{
  const context=await browser.newContext({viewport:{width:375,height:812}});
  const page=await context.newPage();
  trackErrors(page);
  try{
    await page.goto(origin+'/guide',{waitUntil:'networkidle'});
    const sizes=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:window.innerWidth}));
    assert.ok(sizes.document<=sizes.viewport+1,'guide overflows mobile: '+JSON.stringify(sizes));
    await page.locator('#help-search-input').fill('Qloo');
    assert.ok(await page.locator('#help-faq-list details:visible').count()>=1);
    await page.locator('#help-search-input').press('Escape');
    assert.equal(await page.locator('#help-search-input').inputValue(),'');
    await page.locator('[data-help-topic="source"] summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('[data-help-topic="source"]').evaluate(el=>el.open),true);
    await page.screenshot({path:'browser-tests/screenshots/product-guide-mobile.png',fullPage:true});
  }finally{await context.close();}
});


test('evidence studio: six real source-linked Qloo records, filters, zero upstream calls and responsive mobile',async()=>{
 const context=await browser.newContext({viewport:{width:1366,height:900}});
 const page=await context.newPage();
 trackErrors(page);
 const requests=[];
 page.on('request',r=>{if(r.url().includes('/api/'))requests.push(r.url());});
 try{
   await page.goto(origin+'/evidence',{waitUntil:'networkidle'});
   assert.equal(await page.title(),'Validation & Evidence — UNISON');
   assert.equal(await page.locator('#evidence-cards .evidence-case-card').count(),6);
   assert.equal(await page.locator('#evidence-case-count').innerText(),'6');
   assert.equal(await page.locator('#evidence-city-count').innerText(),'3');
   assert.equal(await page.locator('#evidence-group-sizes').innerText(),'2, 3, 5');
   assert.equal(await page.locator('#evidence-run-count').innerText(),'5');
   assert.equal(await page.locator('.evidence-proof-link').count(),6);
   const links=await page.locator('.evidence-proof-link').evaluateAll(nodes=>nodes.map(n=>n.href));
   assert.ok(links.every(url=>url.startsWith('https://github.com/betterlifestyle04-commits/unison-qloo-agent/actions/runs/')));
   assert.equal(new Set(links).size,5,'same cross-city run underpins Bergen and London');
   await page.locator('#evidence-domain').selectOption('places');
   assert.equal(await page.locator('#evidence-cards .evidence-case-card').count(),4);
   await page.locator('#evidence-city').selectOption('Oslo');
   assert.equal(await page.locator('#evidence-cards .evidence-case-card').count(),2);
   await page.locator('#evidence-people').selectOption('3');
   assert.equal(await page.locator('#evidence-cards .evidence-case-card').count(),1);
   assert.match(await page.locator('.evidence-case-card').innerText(),/six Insights calls/);
   assert.match(await page.locator('.evidence-case-card').innerText(),/12 \/ 12/);
   await page.locator('#evidence-search').fill('not a verified scenario');
   assert.equal(await page.locator('.evidence-case-card').count(),0);
   assert.match(await page.locator('.evidence-no-results').innerText(),/No matching verified cases/);
   await page.locator('.evidence-no-results button').click();
   assert.equal(await page.locator('.evidence-case-card').count(),6);
   await page.locator('#evidence-search').fill('Radiohead');
   assert.equal(await page.locator('.evidence-case-card').count(),2);
   assert.equal(requests.length,0,'filtering historical records must never query Qloo or UNISON APIs');
   await page.locator('#evidence-reset').click();
   await page.screenshot({path:'browser-tests/screenshots/evidence-studio.png',fullPage:true});
 }finally{await context.close();}
});
test('mobile evidence studio uses accessible filtering with no horizontal page overflow',async()=>{
 const context=await browser.newContext({viewport:{width:375,height:812}});
 const page=await context.newPage();
 trackErrors(page);
 try{
   await page.goto(origin+'/evidence',{waitUntil:'networkidle'});
   const dimensions=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth}));
   assert.ok(dimensions.document<=dimensions.viewport+1,'mobile evidence studio overflows: '+JSON.stringify(dimensions));
   await page.locator('#evidence-city').selectOption('Bergen');
   assert.equal(await page.locator('.evidence-case-card').count(),1);
   assert.match(await page.locator('.evidence-case-card').innerText(),/Bergen/);
   const link=page.locator('.evidence-proof-link');
   assert.equal(await link.getAttribute('rel'),'noopener noreferrer');
   await page.screenshot({path:'browser-tests/screenshots/evidence-studio-mobile.png',fullPage:true});
 }finally{await context.close();}
});

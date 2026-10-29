import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {server} from '../server.js';
import {encodeShareBrief} from '../public/planner-state.js';

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
    assert.ok(await page.locator('.decision-workspace-nav a').count()>=4);
    await page.locator('.decision-workspace-nav a[href="#evidence-audit"]').click();
    assert.match(page.url(),/#evidence-audit$/);
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
    await page.locator('#agenda-choice').selectOption({index:1});
    assert.equal(await page.locator('#agenda-choice').evaluate(node=>document.activeElement===node),true,'switching a venue keeps focus on the choice control');
    assert.match(await page.locator('#venue-readiness-count').innerText(),/0 \/ 4 reviewed/);
    await page.locator('#agenda-choice').selectOption({index:0});
    assert.match(await page.locator('#venue-readiness-count').innerText(),/2 \/ 4 reviewed/);


    assert.equal(calls.length,1,'one-click demo must make exactly one planning request');
    assert.equal(JSON.parse(calls[0].body).mode,'demo');
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

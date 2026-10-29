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
  browser=await chromium.launch({headless:true});
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
    assert.equal(calls.length,1,'one-click demo must make exactly one planning request');
    assert.equal(JSON.parse(calls[0].body).mode,'demo');
    await page.screenshot({path:'browser-tests/screenshots/desktop-demo.png',fullPage:true});

    const before=calls.length;
    await page.locator('[data-style="protective"]').click();
    assert.equal(await page.locator('[data-style="protective"]').getAttribute('aria-pressed'),'true');
    const left=page.locator('#compare-left'),right=page.locator('#compare-right');
    assert.ok(await left.locator('option').count()>=2);
    await right.selectOption({index:1});
    assert.ok(await page.locator('.head-to-head-table tbody tr').count()>=2);

    await page.locator('#open-top-ballot').click();
    const chosen=page.locator('.group-ballot[open]').first();
    await chosen.locator('[data-vote-choice="yes"]').first().click();
    assert.match(await page.locator('.agreement-count').innerText(),/1\s*\/\s*3/);
    assert.equal(calls.length,before,'voting and local fairness controls cannot call Qloo');

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

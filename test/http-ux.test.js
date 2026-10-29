import test from 'node:test';
import assert from 'node:assert/strict';
import {server} from '../server.js';
async function request(path,options={}){const response=await fetch('http://127.0.0.1:'+server.address().port+path,options);return {response,body:await response.text()};}
test.before(async()=>new Promise(resolve=>server.listen(0,'127.0.0.1',resolve)));
test.after(async()=>new Promise(resolve=>server.close(resolve)));

test('browser planning utilities are served as first-party JavaScript',async()=>{
  const module=await request('/planner-state.js');
  assert.equal(module.response.status,200);
  assert.match(module.response.headers.get('content-type'),/javascript/);
  assert.match(module.body,/applyVetoLocally/);
});
test('malformed participant structures fail safely with a 400 response',async()=>{
  for(const people of ['not-an-array',[null,null],[{name:'A',favorites:['X','Y','Z','Too many']},{name:'B',favorites:['Z']}]]){
    const answer=await request('/api/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'demo',domain:'movies',people})});
    assert.equal(answer.response.status,400);
    assert.ok(JSON.parse(answer.body).error);
  }
});

test('live cultural search is unavailable without a server-side key',async()=>{
  const r=await request('/api/taste-lookup?q=Interstellar');
  assert.equal(r.response.status,503);
  assert.match(JSON.parse(r.body).error,/not currently available/i);
});
test('session-only vote utilities are served with the correct MIME type',async()=>{
  const r=await request('/ballot.js');
  assert.equal(r.response.status,200);
  assert.match(r.response.headers.get('content-type'),/javascript/);
  assert.match(r.body,/summarizeBallot/);
});
test('frontend keeps demo mode opt-in and provides clipboard fallback',async()=>{
  const r=await request('/app.js');
  assert.equal(r.response.status,200);
  assert.match(r.body,/async function copyText/);
  assert.match(r.body,/document\.execCommand\('copy'\)/);
  assert.doesNotMatch(r.body,/if\(app\.configured&&!app\.hasChangedMode\)\{live\.checked=true;/);
  assert.match(r.body,/Qloo request/);
});

test('sample groups and shared plans never auto-opt into live Qloo',async()=>{
  const r=await request('/app.js');
  assert.equal(r.response.status,200);
  assert.match(r.body,/applyBrief\(\{\.\.\.preset,mode:currentMode\(\)\}\)/);
  assert.match(r.body,/applyBrief\(\{\.\.\.decodeShareBrief\(location\.hash\),mode:'demo'\}\)/);
  assert.doesNotMatch(r.body,/applyBrief\(\{\.\.\.preset,mode:app\.configured\?'live':'demo'\}\)/);
});

test('Decision Lab and device save modules are served with JavaScript MIME type',async()=>{
  for(const module of ['/saved-plans.js','/planner-state.js']){
    const {response,body}=await request(module);
    assert.equal(response.status,200);
    assert.match(response.headers.get('content-type'),/application\/javascript/);
    assert.ok(body.length>100);
  }
});
test('real results UI offers a non-automatic on-device save action',async()=>{
  const {response,body}=await request('/app.js');
  assert.equal(response.status,200);
  assert.match(body,/createPlanArchive/);
  assert.match(body,/saveDevicePlan/);
  assert.match(body,/analyzeDecisionTradeoffs/);
});

test('calendar export is served as a first-party JavaScript module',async()=>{
  const r=await request('/calendar.js');
  assert.equal(r.response.status,200);
  assert.match(r.response.headers.get('content-type'),/application\/javascript/);
  assert.match(r.body,/buildCalendarEvent/);
});
test('recommendation meters avoid inline CSS forbidden by the app CSP',async()=>{
  const [html,js]=await Promise.all([request('/'),request('/app.js')]);
  assert.match(html.response.headers.get('content-security-policy'),/style-src 'self'/);
  assert.match(js.body,/class="fit-meter"/);
  assert.doesNotMatch(js.body,/style="width:\$\{/);
  assert.match(js.body,/download-calendar/);
});

test('evidence audit module is first-party and visible in the real results code',async()=>{
  const [module,app]=await Promise.all([request('/evidence-audit.js'),request('/app.js')]);
  assert.equal(module.response.status,200);
  assert.match(module.response.headers.get('content-type'),/javascript/);
  assert.match(module.body,/auditGroupEvidence/);
  assert.match(app.body,/renderEvidenceAudit/);
  assert.match(app.body,/recoverySuggestions/);
});
test('one-click judge demo explicitly submits fictional data without Qloo access',async()=>{
  const [page,app]=await Promise.all([request('/'),request('/app.js')]);
  assert.equal(page.response.status,200);
  assert.match(page.body,/id="instant-demo"/);
  assert.match(page.body,/fictional demonstration/);
  assert.match(app.body,/submitPlan\(request\)/);
  assert.match(app.body,/request\.mode='demo'/);
  assert.match(app.body,/app\.hasChangedMode=true/);
});

test('privacy disclosure is accessible as first-party HTML from footer',async()=>{
  const [privacy,home]=await Promise.all([request('/privacy'),request('/')]);
  assert.equal(privacy.response.status,200);
  assert.match(privacy.response.headers.get('content-type'),/text\/html/);
  assert.match(privacy.body,/Browser|browser/);
  assert.match(privacy.body,/not encrypted/);
  assert.match(privacy.body,/live Qloo|Live Qloo/);
  assert.match(home.body,/href="\/privacy"/);
});
test('downloadable decision report is a same-origin module and clearly opt in',async()=>{
  const [module,app]=await Promise.all([request('/decision-report.js'),request('/app.js')]);
  assert.equal(module.response.status,200);
  assert.match(module.response.headers.get('content-type'),/application\/javascript/);
  assert.match(module.body,/buildDecisionReport/);
  assert.match(app.body,/id="download-report"/);
  assert.match(app.body,/reportFilename/);
  assert.match(app.body,/report-privacy/);
});
test('clipboard fallback avoids blocked inline styling under strict Content Security Policy',async()=>{
  const [app,css]=await Promise.all([request('/app.js'),request('/styles.css')]);
  assert.match(app.body,/className='clipboard-proxy'/);
  assert.doesNotMatch(app.body,/area\.style\.cssText/);
  assert.match(css.body,/\.clipboard-proxy/);
});

test('Agreement Pulse is served and participant vote control remains client-side',async()=>{
  const [module,app]=await Promise.all([request('/consensus.js'),request('/app.js')]);
  assert.equal(module.response.status,200);
  assert.match(module.response.headers.get('content-type'),/javascript/);
  assert.match(module.body,/agreementPulse/);
  assert.match(app.body,/renderAgreementPulse/);
  assert.match(app.body,/open-top-ballot/);
  assert.match(app.body,/Only the people using this browser/);
});

test('cross-site browser calls cannot spend Qloo quota',async()=>{
  const payload={mode:'demo',domain:'movies',people:[{name:'Ada',favorites:['Jazz']},{name:'Bea',favorites:['Manga']}]};
  const bad=await request('/api/plan',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://unrelated.example'},body:JSON.stringify(payload)});
  assert.equal(bad.response.status,403);
  assert.match(bad.body,/Cross-site planning requests/);
  const forged=await request('/api/taste-lookup?q=Interstellar',{headers:{'Sec-Fetch-Site':'cross-site'}});
  assert.equal(forged.response.status,403);
  const normal=await request('/api/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  assert.equal(normal.response.status,200);
});
test('public UNISON pages restrict referrer leakage and unnecessary sensitive permissions',async()=>{
  const {response}=await request('/');
  assert.equal(response.headers.get('referrer-policy'),'no-referrer');
  assert.match(response.headers.get('permissions-policy'),/geolocation=\(\)/);
  const health=await request('/api/status');
  assert.equal(health.response.headers.get('referrer-policy'),'no-referrer');
});

test('head-to-head comparison stays in the browser and uses complete evidence',async()=>{
  const [helper,app]=await Promise.all([request('/head-to-head.js'),request('/app.js')]);
  assert.equal(helper.response.status,200);
  assert.match(helper.response.headers.get('content-type'),/application\/javascript/);
  assert.match(helper.body,/eligibleComparisons/);
  assert.match(helper.body,/compareOptions/);
  assert.match(app.body,/renderHeadToHead/);
  assert.match(app.body,/id="compare-left"/);
  assert.match(app.body,/id="compare-right"/);
});

test('shared group setup cannot quietly restore Live Qloo after status check',async()=>{
  const {response,body}=await request('/app.js');
  assert.equal(response.status,200);
  assert.match(body,/applyBrief\(\{\.\.\.decodeShareBrief\(location\.hash\),mode:'demo'\}\)/);
  assert.doesNotMatch(body,/app\.hashLoaded\s*&&\s*app\.pendingMode\s*===\s*'live'/);
});
test('error recovery does not fabricate live evidence or auto-submit demo',async()=>{
  const [module,app]=await Promise.all([request('/recovery.js'),request('/app.js')]);
  assert.equal(module.response.status,200);
  assert.match(module.response.headers.get('content-type'),/application\/javascript/);
  assert.match(app.body,/planningRecovery\(e\.status\|\|0/);
  assert.match(app.body,/id="recovery-demo"/);
  assert.match(app.body,/mode\]\[value=demo/);
  assert.match(module.body,/never|not pretend|without inventing/i);
});

test('live results disclose candidate integrity screening and its limits',async()=>{
  const [app,css]=await Promise.all([request('/app.js'),request('/styles.css')]);
  assert.equal(app.response.status,200);
  assert.match(app.body,/function integrityReview\(data\)/);
  assert.match(app.body,/outside shortlist/);
  assert.match(app.body,/It does not independently verify a venue/);
  assert.match(css.body,/\.integrity-review/);
});

test('live Qloo diagnostic requires POST, same-origin and configured server key',async()=>{
  const csrf=await request('/api/qloo-diagnostics',{method:'POST',headers:{Origin:'https://unrelated.example'}});
  assert.equal(csrf.response.status,403);
  assert.match(csrf.body,/Cross-site Qloo diagnostic/);
  const noKey=await request('/api/qloo-diagnostics',{method:'POST'});
  assert.equal(noKey.response.status,503);
  assert.match(noKey.body,/not currently configured/);
  const get=await request('/api/qloo-diagnostics');
  assert.equal(get.response.status,404);
});
test('Qloo diagnostics are visible only after explicit Live mode and require a click',async()=>{
  const [app,page]=await Promise.all([request('/app.js'),request('/')]);
  assert.match(page.body,/id="qloo-diagnostics"/);
  assert.match(page.body,/id="qloo-check"/);
  assert.match(page.body,/no group names or favorites/);
  assert.match(app.body,/qloo-diagnostics'\)\.hidden=/);
  assert.match(app.body,/diagnosticBtn\.addEventListener\('click'/);
  assert.match(app.body,/method:'POST'/);
  assert.doesNotMatch(app.body,/fetch\('\/api\/qloo-diagnostics'\)\.then/);
});

test('group stability review is served locally and does not require another Qloo call',async()=>{
 const [module,app,style]=await Promise.all([request('/group-stability.js'),request('/app.js'),request('/styles.css')]);
 assert.equal(module.response.status,200);
 assert.match(module.response.headers.get('content-type'),/javascript/);
 assert.match(module.body,/analyzeGroupStability/);
 assert.match(app.body,/renderGroupStability/);
 assert.match(app.body,/hypothetical decision sensitivity/i);
 assert.match(style.body,/\.group-stability/);
});

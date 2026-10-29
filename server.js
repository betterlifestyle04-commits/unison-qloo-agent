import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runAgent} from './src/agent.js';
import {isLiveConfigured,searchFavorite} from './src/qloo.js';
import {createRequestLimiter} from './src/request-limiter.js';
import {diagnoseQloo} from './src/qloo-diagnostics.js';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'public');
const files=new Map([['/','index.html'],['/app.js','app.js'],['/planner-state.js','planner-state.js'],['/ballot.js','ballot.js'],['/saved-plans.js','saved-plans.js'],['/calendar.js','calendar.js'],['/evidence-audit.js','evidence-audit.js'],['/decision-report.js','decision-report.js'],['/consensus.js','consensus.js'],['/head-to-head.js','head-to-head.js'],['/group-stability.js','group-stability.js'],['/venue-readiness.js','venue-readiness.js'],['/place-constraints.js','place-constraints.js'],['/recovery.js','recovery.js'],['/privacy','privacy.html'],['/privacy.html','privacy.html'],['/styles.css','styles.css']]);
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const planLimiter=createRequestLimiter({limit:20,windowMs:60_000,maxClients:2048});
const lookupLimiter=createRequestLimiter({limit:10,windowMs:60_000,maxClients:2048});
const diagnosticsLimiter=createRequestLimiter({limit:2,windowMs:10*60_000,maxClients:512});
let activePlans=0;
function allowLookup(req){return lookupLimiter.allow(req.socket.remoteAddress||'unknown');}
function allowPlan(req){return planLimiter.allow(req.socket.remoteAddress||'unknown');}
function isCrossSite(req){
  if(req.headers['sec-fetch-site']==='cross-site')return true;
  const origin=req.headers.origin;
  if(!origin)return false; // CLI and server-side clients can omit Origin.
  try{
    const target=new URL(origin);
    const host=String(req.headers.host||'').toLowerCase();
    return !['https:','http:'].includes(target.protocol)||target.host.toLowerCase()!==host;
  }catch{return true;}
}
function send(res,status,payload){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(JSON.stringify(payload));}
export const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    if(req.method==='GET'&&url.pathname==='/api/status') return send(res,200,{configured:isLiveConfigured(),mode:isLiveConfigured()?'live-ready':'demo',status:isLiveConfigured()?'Key present; live requests can be attempted':'Demo only; awaiting Qloo key',source:'server-configuration'});
    if(req.method==='GET'&&url.pathname==='/api/taste-lookup'){
      if(isCrossSite(req))return send(res,403,{error:'Cross-site Qloo lookups are not allowed.'});
      if(!isLiveConfigured())return send(res,503,{error:'Qloo taste lookup is not currently available.'});
      if(!allowLookup(req))return send(res,429,{error:'Please wait before making more taste searches.'});
      const query=url.searchParams.get('q')?.trim()||'';
      if(query.length<2||query.length>80)return send(res,400,{error:'Search for a cultural reference using 2–80 characters.'});
      const match=await searchFavorite(query);
      return send(res,200,{query,matches:match.matches.map(({id,name,type})=>({id,name,type})),exact:Boolean(match.exact),cached:match.cached});
    }
    if(req.method==='POST'&&url.pathname==='/api/qloo-diagnostics'){
      if(isCrossSite(req))return send(res,403,{error:'Cross-site Qloo diagnostic requests are not allowed.'});
      if(!isLiveConfigured())return send(res,503,{error:'Qloo is not currently configured on the server.'});
      if(!diagnosticsLimiter.allow(req.socket.remoteAddress||'unknown'))return send(res,429,{error:'Qloo diagnostics are limited to two checks per ten minutes. You can still use the demo.'});
      if(req.headers['content-length']&&Number(req.headers['content-length'])>0)return send(res,400,{error:'The diagnostic does not accept participant data or a request body.'});
      const diagnostics=await diagnoseQloo();
      return send(res,200,diagnostics);
    }
    if(req.method==='POST'&&url.pathname==='/api/plan'){
      if(isCrossSite(req))return send(res,403,{error:'Cross-site planning requests are not allowed.'});
      if(!allowPlan(req))return send(res,429,{error:'Too many planning requests. Please wait a minute before trying again.'});
      if(activePlans>=4)return send(res,503,{error:'Planner is busy. Please retry shortly.'});
      const chunks=[]; let size=0;
      for await(const chunk of req){size+=chunk.length; if(size>64000){return send(res,413,{error:'Request too large'});}chunks.push(chunk);}
      let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return send(res,400,{error:'Invalid JSON'});}
      activePlans++;try{const result=await runAgent(input);return send(res,200,result);}finally{activePlans--;}
    }
    if((req.method==='GET'||req.method==='HEAD')&&files.has(url.pathname)){
      const file=files.get(url.pathname);
      const buf=await readFile(path.join(root,file));
      res.writeHead(200,{'Content-Type':MIME[path.extname(file)],'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data: https://images.qloo.com https://*.images.qloo.com; connect-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'"});res.end(req.method==='HEAD'?undefined:buf);return;
    }
    return send(res,404,{error:'Not found'});
  }catch(e){if(!res.headersSent)send(res,e.status||500,{error:e.status?e.message:'Internal server error'});}
});
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT||3000);server.listen(port,'0.0.0.0',()=>console.log(`UNISON running at http://localhost:${port}`));
}

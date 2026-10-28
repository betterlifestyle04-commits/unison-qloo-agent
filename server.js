import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runAgent} from './src/agent.js';
import {isLiveConfigured} from './src/qloo.js';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'public');
const files=new Map([['/','index.html'],['/app.js','app.js'],['/styles.css','styles.css']]);
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const requestWindows=new Map(); let activePlans=0;
function allowPlan(req){const ip=req.socket.remoteAddress||'unknown',now=Date.now(),window=requestWindows.get(ip)||{started:now,count:0};if(now-window.started>60_000){window.started=now;window.count=0;}window.count++;requestWindows.set(ip,window);return window.count<=20;}
function send(res,status,payload){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(payload));}
export const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    if(req.method==='GET'&&url.pathname==='/api/status') return send(res,200,{configured:isLiveConfigured(),mode:isLiveConfigured()?'live-ready':'demo',status:isLiveConfigured()?'Key present; live requests can be attempted':'Demo only; awaiting Qloo key',source:'server-configuration'});
    if(req.method==='POST'&&url.pathname==='/api/plan'){
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
      res.writeHead(200,{'Content-Type':MIME[path.extname(file)],'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache','Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'"});res.end(req.method==='HEAD'?undefined:buf);return;
    }
    return send(res,404,{error:'Not found'});
  }catch(e){if(!res.headersSent)send(res,e.status||500,{error:e.status?e.message:'Internal server error'});}
});
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT||3000);server.listen(port,'0.0.0.0',()=>console.log(`UNISON running at http://localhost:${port}`));
}

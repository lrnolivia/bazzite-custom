import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const steam=path.join(os.homedir(),'.local/share/Steam');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function bundle(){
 const sources=['libraryExtras','nativeLogoCenter','artworkAccent','nonSteamMetadata'].map(n=>read(`desktop/scripts/${n}.js`));
 sources[2]=sources[2].replace("import palettes from './logoPalette.js';",read('desktop/scripts/logoPalette.js').replace('export default','const palettes ='));
 const css=read('desktop/styles/libraryFeed.css')+'\n'+read('desktop/styles/playButtonAlignment.css')+'\n'+read('desktop/styles/adwaita.css');
 const needed=new Set([...((css+'\n'+sources.join('\n')).matchAll(/\.([A-Z][A-Za-z0-9_]*)/g))].map(m=>m[1]));
 const map={};
 for(const m of fs.readFileSync(path.join(steam,'steamui/sp.js'),'utf8').matchAll(/\b([A-Za-z]\w*):"([_A-Za-z0-9-]{8,40})"/g)){
  if(needed.has(m[1]))(map[m[2]]??=[]).push(m[1]);
 }
 return `(()=>{if(!document.body.classList.contains('DesktopUI'))return;if(window.__loewAdwaitaPort===4)return;window.__loewAdwaitaPort=4;const aliases=${JSON.stringify(map)};const css=${JSON.stringify(css)};`+read('desktop/compat.js')+'\n'+sources.map(source=>'(()=>{'+source+'\n})();').join('\n')+'\n})();';
}
let payload;
try{payload=bundle()}catch(e){console.error(e);process.exit(1)}
const connected=new Map();
const allowedPaths=new Set(['/api/appdetails','/api/storesearch/','/events/ajaxgetpartnereventspageable/']);
async function metadata(url){
 const parsed=new URL(url);
 if(parsed.origin!=='https://store.steampowered.com'||!allowedPaths.has(parsed.pathname)||parsed.username||parsed.password||url.length>2048)throw Error('Unsupported metadata URL');
 const response=await fetch(parsed,{redirect:'error',signal:AbortSignal.timeout(12000),headers:{Accept:'application/json'}});
 if(!response.ok)throw Error('Steam metadata HTTP '+response.status);
 let bytes=0;const chunks=[];for await(const chunk of response.body){bytes+=chunk.length;if(bytes>2*1024*1024)throw Error('Metadata too large');chunks.push(chunk)}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
async function attach(page){
 try{payload=bundle()}catch(e){console.error('Cannot refresh theme bundle:',e);return}
 const ws=new WebSocket(page.webSocketDebuggerUrl);connected.set(page.id,ws);let id=0;let requests=0;let active=0;const token=crypto.randomBytes(16).toString('hex');
 const fetchShim=`(()=>{const pending=new Map();let sequence=0;window.__loewThemeFetchResolve=(id,data,error)=>{const p=pending.get(id);if(!p)return;pending.delete(id);clearTimeout(p.timer);error?p.reject(Error(error)):p.resolve(data)};window.__loewThemeFetchJson=url=>new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);reject(Error('Metadata timeout'))},15000);pending.set(id,{resolve,reject,timer});window.__loewThemeFetch(JSON.stringify({id,url,token:${JSON.stringify(token)}}))});})();`;
 const inject=()=>ws.readyState===1&&ws.send(JSON.stringify({id:++id,method:'Runtime.evaluate',params:{expression:fetchShim+payload}}));
 ws.onopen=()=>{ws.send(JSON.stringify({id:++id,method:'Runtime.addBinding',params:{name:'__loewThemeFetch'}}));ws.send(JSON.stringify({id:++id,method:'Runtime.enable'}));inject()};
 ws.onmessage=async e=>{const d=JSON.parse(e.data);
 if(d.method==='Runtime.bindingCalled'&&d.params.name==='__loewThemeFetch'){
  let req;try{req=JSON.parse(d.params.payload)}catch{return}
  if(req.token!==token||!Number.isSafeInteger(req.id))return;
  let data=null,error=null;
  try{if(active>=2||++requests>300)throw Error('Metadata request limit');active++;try{data=await metadata(req.url)}finally{active--}}catch(e){error=String(e.message)}
  if(ws.readyState===1)ws.send(JSON.stringify({id:++id,method:'Runtime.evaluate',params:{expression:`window.__loewThemeFetchResolve?.(${req.id},${JSON.stringify(data)},${JSON.stringify(error)})`,contextId:d.params.executionContextId}}));return;
 }
if(d.method==='Runtime.executionContextCreated')inject();if(d.result?.exceptionDetails)console.error('Theme injection:',JSON.stringify(d.result.exceptionDetails).slice(0,900));};
 ws.onclose=()=>connected.delete(page.id);ws.onerror=()=>ws.close();
}
async function tick(){try{
 const pages=await(await fetch('http://127.0.0.1:8080/json/list',{signal:AbortSignal.timeout(1500)})).json();
 for(const p of pages)if(p.title==='Steam'&&!connected.has(p.id))await attach(p);
 for(const [id,ws]of connected)if(!pages.some(p=>p.id===id)){ws.close();connected.delete(id)}
}catch{for(const ws of connected.values())ws.close();connected.clear()}}
await tick();setInterval(tick,2000);

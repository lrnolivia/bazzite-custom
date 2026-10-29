import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const steam=path.join(os.homedir(),'.local/share/Steam');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function bundle(){
 const sources=['libraryExtras','artworkAccent','nonSteamMetadata'].map(n=>read(`desktop/scripts/${n}.js`));
 sources[1]=sources[1].replace("import palettes from './logoPalette.js';",read('desktop/scripts/logoPalette.js').replace('export default','const palettes ='));
 sources.push(read('game-mode/artworkCache.js'));
 const css=read('desktop/styles/libraryFeed.css')+'\n'+read('desktop/styles/playButtonAlignment.css')+'\n'+read('desktop/styles/adwaita.css');
 const needed=new Set([...((css+'\n'+sources.join('\n')).matchAll(/\.([A-Z][A-Za-z0-9_]*)/g))].map(m=>m[1]));
 const map={};
 for(const m of fs.readFileSync(path.join(steam,'steamui/sp.js'),'utf8').matchAll(/\b([A-Za-z]\w*):"([_A-Za-z0-9-]{8,40})"/g)){
  if(needed.has(m[1]))(map[m[2]]??=[]).push(m[1]);
 }
 return `(()=>{if(!document.body.classList.contains('DesktopUI'))return;if(window.__loewAdwaitaPort===7)return;window.__loewAdwaitaPort=7;const aliases=${JSON.stringify(map)};const css=${JSON.stringify(css)};`+read('desktop/compat.js')+'\n'+sources.map(source=>'(()=>{'+source+'\n})();').join('\n')+'\n})();';
}
// CSS Loader translates dot selectors, while Prime also uses semantic
// [class~=...] selectors. Supply those aliases in Game Mode popup documents.
function gameModeBundle(){
 const dir=path.join(root,'game-mode/Steam Prime');let css='';
 const walk=p=>{for(const f of fs.readdirSync(p,{withFileTypes:true})){const q=path.join(p,f.name);if(f.isDirectory())walk(q);else if(f.name.endsWith('.css'))css+=fs.readFileSync(q,'utf8')+'\n'}};walk(dir);
 const scripts=['bigPictureExtras','footerExtras','menuEffects','uiMotion','gamePageMotion','cardEntrance','optimizeStyles','artworkCache'].map(n=>read(`game-mode/${n}.js`));
 const needed=new Set([...css.matchAll(/\[class~=['"]([A-Za-z_][\w-]*)['"]\]/g)].map(m=>m[1]));
 for(const m of (css+'\n'+scripts.join('\n')).matchAll(/\.([A-Z][A-Za-z0-9_]*)/g))needed.add(m[1]);
 const aliases={};
 for(const m of fs.readFileSync(path.join(steam,'steamui/sp.js'),'utf8').matchAll(/\b([A-Za-z]\w*):"([_A-Za-z0-9-]{8,40})"/g)){
  if(needed.has(m[1]))(aliases[m[2]]??=[]).push(m[1]);
 }
 return `(()=>{if(window.__loewPrimeAliases===6)return;window.__loewPrimeAliasState?.observer.disconnect();window.__loewPrimeAliases=6;const aliases=${JSON.stringify(aliases)};`+read('game-mode/aliases.js')+'\n'+read('desktop/scripts/logoPalette.js').replace('export default','const palettes =')+'\n'+read('game-mode/artworkColor.js')+'\n'+scripts.join('\n')+'\n})();';
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
 const gameMode=page.title!=='Steam';let gamePayload;
 if(gameMode){try{gamePayload=gameModeBundle()}catch(e){console.error(e);return}}
 try{payload=bundle()}catch(e){console.error('Cannot refresh theme bundle:',e);return}
 const ws=new WebSocket(page.webSocketDebuggerUrl);connected.set(page.id,ws);let id=0;let requests=0;let active=0;const token=crypto.randomBytes(16).toString('hex');
 const fetchShim=`(()=>{const pending=new Map();let sequence=0;window.__loewThemeFetchResolve=(id,data,error)=>{const p=pending.get(id);if(!p)return;pending.delete(id);clearTimeout(p.timer);error?p.reject(Error(error)):p.resolve(data)};window.__loewThemeFetchJson=url=>new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);reject(Error('Metadata timeout'))},15000);pending.set(id,{resolve,reject,timer});window.__loewThemeFetch(JSON.stringify({id,url,token:${JSON.stringify(token)}}))});})();`;
 const inject=()=>ws.readyState===1&&ws.send(JSON.stringify({id:++id,method:'Runtime.evaluate',params:{expression:gameMode?gamePayload:fetchShim+payload}}));
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
 for(const p of pages)if((p.title==='Steam'||p.title==='Steam Big Picture Mode'||/^(MainMenu|QuickAccess)_/.test(p.title))&&!connected.has(p.id))await attach(p);
 for(const [id,ws]of connected)if(!pages.some(p=>p.id===id)){ws.close();connected.delete(id)}
}catch{for(const ws of connected.values())ws.close();connected.clear()}}
await tick();setInterval(tick,2000);

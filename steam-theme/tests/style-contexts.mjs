// Live regression check: dormant context styles must reactivate on DOM entry,
// class changes, removal and reinsertion, preserving nesting and cascade.
const pages=await(await fetch('http://127.0.0.1:8080/json/list')).json();
const page=pages.find(p=>p.title==='Steam');
if(!page)throw Error('Open desktop Steam with the bridge installed first');
const ws=new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
const expression=`(async()=>{
 const contexts=window.__loewAdwaitaPortState?.styleContexts;
 if(!contexts)throw Error('Context optimization is not installed');
 const style=document.createElement('style');
 style.textContent='body.DesktopUI .LoewContextProbe{color:rgb(11,22,33);.LoewContextRow:has(>.LoewContextActive){color:rgb(44,55,66)}}body.DesktopUI .LoewContextProbe{background-color:rgb(77,88,99)}';
 document.head.append(style);const sheet=style.sheet,extra=[];
 const root=document.createElement('div');root.className='LoewContextProbe';
 root.style.cssText='position:fixed;left:-10000px;top:0;visibility:hidden';
 const row=document.createElement('div');row.className='LoewContextRow';
 const active=document.createElement('span');active.className='LoewContextActive';
 row.append(active);root.append(row);
 const tick=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 const assert=(condition,message)=>{if(!condition)throw Error(message);};
 try{
  contexts.prepare(sheet);
  const record=contexts.records.find(r=>r.sheet===sheet);
  assert(record?.media.media.mediaText==='not all','Absent context was not suspended');
  document.body.append(root);await tick();
  assert(record.media.media.mediaText==='all','Mounted context was not restored');
  assert(getComputedStyle(row).color==='rgb(44, 55, 66)','Nested :has rule changed');
  assert(getComputedStyle(root).backgroundColor==='rgb(77, 88, 99)','Later cascade rule changed');
  active.className='LoewContextInactive';await tick();
  assert(getComputedStyle(row).color==='rgb(11, 22, 33)','Relational state change stopped updating');
  root.className='LoewContextOther';await tick();
  assert(record.media.media.mediaText==='not all','Context class removal was not detected');
  root.className='LoewContextProbe';active.className='LoewContextActive';await tick();
  assert(record.media.media.mediaText==='all'&&getComputedStyle(row).color==='rgb(44, 55, 66)','Context class restoration failed');
  root.remove();await tick();
  assert(record.media.media.mediaText==='not all','Removed context was left active');
  document.body.append(root);await tick();
  assert(record.media.media.mediaText==='all'&&getComputedStyle(row).color==='rgb(44, 55, 66)','Reinserted context failed');
  const mountedStyle=document.createElement('style');mountedStyle.textContent=style.textContent;
  document.head.append(mountedStyle);extra.push(mountedStyle);contexts.prepare(mountedStyle.sheet);
  const mounted=contexts.records.find(r=>r.sheet===mountedStyle.sheet);
  assert(mounted?.media.media.mediaText==='all','Initially mounted context was not retained');
  root.remove();await tick();
  assert(mounted.media.media.mediaText==='not all','Initially mounted context did not suspend on removal');
  const focusStyle=document.createElement('style');
  focusStyle.textContent='body.DesktopUI .LoewFocusProbe:focus-within{.LoewFocusRow{.LoewFocusChild:has(.LoewFocusActive){color:red}}}';
  document.head.append(focusStyle);extra.push(focusStyle);contexts.prepare(focusStyle.sheet);
  assert(!contexts.records.some(r=>r.sheet===focusStyle.sheet),'Focus-dependent descendants must remain CSS driven');
  return 'PASS: entry, nesting/cascade, class/state changes, removal/reinsertion, initially mounted context, focus ancestors';
 }finally{
  const sheets=new Set([sheet,...extra.map(s=>s.sheet)]);
  root.remove();style.remove();extra.forEach(s=>s.remove());
  for(let i=contexts.records.length-1;i>=0;i--)if(sheets.has(contexts.records[i].sheet))contexts.records.splice(i,1);
 }
})()`;
try{
 const response=await new Promise(resolve=>{ws.onmessage=e=>{const r=JSON.parse(e.data);if(r.id===1)resolve(r);};ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression,returnByValue:true,awaitPromise:true}}));});
 if(response.error||response.result?.exceptionDetails)throw Error(JSON.stringify(response.error||response.result.exceptionDetails));
 console.log(response.result.result.value);
}finally{ws.close();}

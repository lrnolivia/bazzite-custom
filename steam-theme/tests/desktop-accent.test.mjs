import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {parseGtkAccent,readDesktopAccent,watchDesktopAccent,desktopAccentCss} from '../desktopAccent.mjs';

test('GTK managed colours, references, comments and later declarations resolve correctly',()=>{
 const css=`/* @define-color accent_bg_color #abcdef; */
 @define-color selected #d0436b;
 @define-color accent_bg_color @selected;
 @define-color accent_fg_color #fff;
 @define-color accent_color #d86586;
 :root {--accent-fg-color:#000;}`;
 assert.deepEqual(parseGtkAccent(css),{bg:'#d0436b',fg:'#000000',color:'#d86586'});
});

test('GTK4 takes priority and missing custom colours use GNOME preference',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'steam-prime-accent-'));
 try{
  const gtk3=path.join(home,'.config/gtk-3.0');const gtk4=path.join(home,'.config/gtk-4.0');
  fs.mkdirSync(gtk3,{recursive:true});fs.mkdirSync(gtk4,{recursive:true});
  assert.equal(readDesktopAccent(home,'red').bg,'#e62d42');
  fs.writeFileSync(path.join(gtk3,'gtk.css'),'@define-color accent_bg_color #123456;');
  assert.equal(readDesktopAccent(home,'red').bg,'#123456');
  fs.writeFileSync(path.join(gtk4,'gtk.css'),':root{--accent-bg-color:#fedcba;--accent-fg-color:#000;}');
  assert.equal(readDesktopAccent(home,'red').bg,'#fedcba');
  assert.equal(readDesktopAccent(home,'red').fg,'#000000');
  const css=desktopAccentCss(readDesktopAccent(home,'red'));
  assert.match(css,/--adw-accent-bg-rgb:254,220,186/);
  assert.match(css,/--adw-accent-fg:#000000/);
 }finally{fs.rmSync(home,{recursive:true,force:true});}
});

test('atomic GTK updates are detected without restarting the bridge',async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'steam-prime-accent-watch-'));
 let watcher;
 try{
  for(const v of [3,4])fs.mkdirSync(path.join(home,`.config/gtk-${v}.0`),{recursive:true});
  const file=path.join(home,'.config/gtk-4.0/gtk.css');
  fs.writeFileSync(file,':root{--accent-bg-color:#112233;}');
  let notify;const changed=new Promise(resolve=>notify=resolve);
  watcher=watchDesktopAccent(notify,home);
  fs.writeFileSync(file+'.new',':root{--accent-bg-color:#d0436b;--accent-fg-color:#000;}');
  fs.renameSync(file+'.new',file);
  let timer;
  try{
   const next=await Promise.race([changed,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('No accent update')),3000))]);
   assert.equal(next.bg,'#d0436b');assert.equal(next.fg,'#000000');
  }finally{clearTimeout(timer);}
 }finally{watcher?.close();fs.rmSync(home,{recursive:true,force:true});}
});

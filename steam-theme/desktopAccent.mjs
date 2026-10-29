import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync,spawn} from 'node:child_process';

const palette={blue:'#3584e4',teal:'#2190a4',green:'#3a944a',yellow:'#c88800',orange:'#ed5b00',red:'#e62d42',pink:'#d56199',purple:'#9141ac',slate:'#6f8396'};
const last=(text,pattern)=>[...text.matchAll(pattern)].at(-1)?.[1]?.trim();
const hex=value=>/^#[\da-f]{6}$/i.test(value||'')?value.toLowerCase():/^#[\da-f]{3}$/i.test(value||'')?'#'+[...value.slice(1)].map(c=>c+c).join('').toLowerCase():null;
const rgb=color=>color.slice(1).match(/../g).map(v=>parseInt(v,16));
const contrastInk=color=>{
 const light=rgb(color).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
 return (light+.05)/.05>1.05/(light+.05)?'#000000':'#ffffff';
};
export function parseGtkAccent(css){
 const text=css.replace(/\/\*[\s\S]*?\*\//g,'');
 const roots=[...text.matchAll(/:root\s*\{([^}]+)\}/g)].map(m=>m[1]).join('\n');
 const named=name=>last(text,new RegExp('@define-color\\s+'+name+'\\s+([^;]+);','g'));
 const resolve=value=>{for(let i=0;value?.startsWith('@')&&i<8;i++)value=named(value.slice(1));return hex(value);};
 const value=(cssName,gtkName)=>resolve(last(roots,new RegExp('--'+cssName+'\\s*:\\s*([^;]+);','g')))||resolve(named(gtkName));
 return {bg:value('accent-bg-color','accent_bg_color'),fg:value('accent-fg-color','accent_fg_color'),color:resolve(named('accent_color'))};
}
export function readDesktopAccent(home=os.homedir(),name='blue'){
 const styles=[4,3].map(version=>{try{return parseGtkAccent(fs.readFileSync(path.join(home,`.config/gtk-${version}.0/gtk.css`),'utf8'));}catch{return {};}});
 const chosen=styles.find(s=>s.bg)||{};
 const bg=chosen.bg||palette[name]||palette.blue;
 return {bg,fg:chosen.fg||contrastInk(bg),color:chosen.color||bg};
}
export function desktopAccentCss(accent){
 const {bg,fg,color}=accent;
 return `:root,body.DesktopUI{
 --adw-system-accent:${bg}!important;--adw-accent-bg-light:${bg}!important;--adw-accent-bg-dark:${bg}!important;
 --adw-accent-bg:${bg}!important;--adw-accent-fg:${fg}!important;--adw-accent:${color}!important;
 --adw-accent-bg-rgb:${rgb(bg)}!important;--adw-accent-fg-rgb:${rgb(fg)}!important;
 --SystemAccentColor:${bg}!important;--SystemAccentColorLight1:${color}!important;--SystemAccentColorLight2:${color}!important;
 }
 body.DesktopUI ._1UBpAXP408Ez_L_mXhW5Q9.Selected{background:color-mix(in srgb,${bg} 25%,transparent)!important;}
 body.DesktopUI #lumen-settings-overlay :is(button.primary,.lumen-account-button.primary){color:${fg}!important;}
 body.DesktopUI #lumen-settings-overlay .lumen-tab.active{background:rgba(${rgb(bg)},.22)!important;}`;
}
export function watchDesktopAccent(changed,home=os.homedir()){
 let name='blue',timer;
 try{name=execFileSync('gsettings',['get','org.gnome.desktop.interface','accent-color'],{encoding:'utf8',timeout:2000}).trim().replaceAll("'",'');}catch{}
 let value=readDesktopAccent(home,name);
 const refresh=()=>{const next=readDesktopAccent(home,name);if(JSON.stringify(next)!==JSON.stringify(value)){value=next;changed(value);}};
 const schedule=()=>{clearTimeout(timer);timer=setTimeout(refresh,120);};
 const watchers=[];
 for(const version of [3,4])try{watchers.push(fs.watch(path.join(home,`.config/gtk-${version}.0`),(_,file)=>{if(!file||String(file)==='gtk.css')schedule();}));}catch{}
 const settings=spawn('gsettings',['monitor','org.gnome.desktop.interface','accent-color'],{stdio:['ignore','pipe','ignore']});
 settings.on('error',()=>{});let pending='';
 settings.stdout.on('data',chunk=>{pending+=chunk;let end;while((end=pending.indexOf('\n'))>=0){const line=pending.slice(0,end);pending=pending.slice(end+1);const next=line.match(/accent-color:\s*'([^']+)'/);if(next){name=next[1];schedule();}}});
 return {get current(){return value;},refresh,close(){clearTimeout(timer);watchers.forEach(w=>w.close());settings.kill();}};
}

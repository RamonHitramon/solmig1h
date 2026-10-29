import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {strategyLabel,formatSOL} from './paper-table-model.mjs?v=mig1hv1';
import {plotModel} from './paper-chart-model.mjs?v=mig1hv1';

const files=['index.html','paper.mjs','paper-charts.mjs','paper-chart-model.mjs','paper-table-model.mjs'];
const ids=['tp20','tp25','tp30','tp35','tp40','tp30be'];
const labels=['TP20','TP25','TP30','TP35','TP40','TP30BE15'];
const cyrillic=/[\u0400-\u04ff]/u;
const text=n=>[n.textContent||'',n.title||'',n['aria-label']||'',...n.children.map(text)].join(' ').replace(/\s+/g,' ').trim();
class Node {
 constructor(tag='div'){this.tag=tag;this.children=[];this.style={};this.dataset={};this.events={};this.value='all';}
 append(...nodes){this.children.push(...nodes);}
 prepend(...nodes){this.children.unshift(...nodes);}
 replaceChildren(...nodes){this.children=nodes;}
 setAttribute(key,value){this[key]=value;}
 addEventListener(key,fn){this.events[key]=fn;}
}

test('English main UI preserves terminology, rules, links and consistent module cache versions',async()=>{
 const sources=await Promise.all(files.map(file=>readFile(new URL('./'+file,import.meta.url),'utf8')));
 for(let i=0;i<files.length;i++){
  // Deliberately stricter than UI-only: production sources contain no Cyrillic, even in comments.
  assert.doesNotMatch(sources[i],cyrillic,files[i]);
  for(const match of sources[i].matchAll(/(?:from\s+|import\(|src=)["'](\.\/)?(paper[^"']*\.mjs)(\?[^"']*)?["']/g))assert.equal(match[3],'?v=mig1hv1',match[0]);
 }
 const html=sources[0],visible=html.replace(/<style>[\s\S]*?<\/style>/g,'').replace(/<\/(?:p|h[1-6]|section|nav)>/g,' ').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
 assert.match(html,/<html lang="en">/);assert.match(html,/<h1>SOL MIG1H M1<\/h1>/);
 assert.match(visible,/Filter: SOL · MIG1H/);assert.deepEqual(visible.match(/#[a-z0-9]+/gi),['#solmig1hm1']);
 assert.match(visible,/Filter determines eligible SOL migration-age signals/);
 assert.match(visible,/Strategies are exit rules/);assert.match(visible,/Test SOL MIG1H M1 compares six independent virtual accounts/);
 assert.match(visible,/gross \+15%.*fixed modeled net break-even stop/);assert.match(visible,/TP30 remains active/);
 assert.match(visible,/not a trailing stop/);assert.match(visible,/sampled quotes; a gap can produce a negative result/);
 assert.match(visible,/Free SOL is spendable virtual cash, not the marked value of open tokens/);
 assert.match(visible,/shared persistent budget of 48 quotes\/min/);
 assert.match(html,/href="https:\/\/ramonhitramon.github.io\/gmgn_100kmcap\/"/);
 assert.match(html,/rel="canonical" href="https:\/\/ramonhitramon.github.io\/solmig1h\/"/);
 for(let i=0;i<ids.length;i++)assert.ok(html.includes(`value="${ids[i]}">${labels[i]}</option>`));
 assert.doesNotMatch(sources.join(''),/TP30 · BE15|r4set2/);
});

test('strategy presentation uses stable English labels even with legacy feed names',()=>{
 for(let i=0;i<ids.length;i++)assert.equal(strategyLabel(ids[i],'Старое имя'),labels[i]);
 assert.equal(strategyLabel('legacy','Legacy account'),'Legacy account');
 assert.equal(strategyLabel(null),'—');
 assert.equal(formatSOL(.1),'+0.100 SOL');
 assert.equal(plotModel({started_at:100,asof:200,series:[{id:'tp30be',name:'Старое имя',disabled_at:150,points:[[100,0,0,1,false]]}]}).series[0].name,'TP30BE15 · archived');
});

test('rendered cards, table, break-even states, empty states and errors are English',async()=>{
 const elements=Object.fromEntries(['status','wallets','filter','status-filter','sort','positions','health','download','refresh','error','trade-count','trade-asof','active-strategies','active-rules'].map(id=>[id,new Node()]));
 elements.filter.options=ids.map((id,i)=>Object.assign(new Node('option'),{value:id,textContent:labels[i]}));elements.sort.value='latest';
 const previous={document:globalThis.document,fetch:globalThis.fetch,setInterval:globalThis.setInterval};
 const snapshot={mode:'PAPER_ONLY',run_id:'R4',updated_at:200,started_at:100,signals:1,wallets:ids.map(id=>({id,name:'Старое имя',equity_sol:1,net_sol:0,cash_sol:.9,realised_sol:0,open:1,closed:0,skipped:0})),positions:[{symbol:'TEST',strategy:'tp30be',opened:150,signal_at:140,entry_delay_seconds:10,cost:.1,last_mark:.12,last_seen:190,armed:true}]};
 try{
  globalThis.document={getElementById:id=>elements[id]||null,createElement:tag=>new Node(tag)};
  globalThis.setInterval=()=>0;globalThis.fetch=async()=>({ok:true,json:async()=>snapshot});
  await import('./paper.mjs?v=mig1hv1');await new Promise(resolve=>setImmediate(resolve));
  const allText=()=>Object.values(elements).map(text).join(' ');
  assert.doesNotMatch(allText(),cyrillic);
  for(const label of labels)assert.match(text(elements.wallets),new RegExp(label));
  assert.match(text(elements.wallets),/Free SOL \(spendable virtual cash\) 0.900 SOL/);
  assert.equal(elements.positions.children[0].children[1].textContent,'TP30BE15');
  assert.equal(elements.positions.children[0].children[1].children[0].textContent,'Break-even armed');
  assert.match(text(elements.positions),/Mint unavailable/);assert.match(text(elements.positions),/Not an executed sale/);
  snapshot.positions[0].armed=false;await elements.refresh.events.click();assert.match(text(elements.positions),/Waiting for \+15%/);
  elements.filter.value='tp20';elements.filter.events.change();assert.match(text(elements.positions),/No trades match this selection yet/);
  snapshot.signals=0;await elements.refresh.events.click();assert.match(text(elements.positions),/Waiting for the first new eligible signal/);
  globalThis.fetch=async()=>({ok:true,json:async()=>({mode:'INVALID'})});await elements.refresh.events.click();
  assert.equal(elements.error.textContent,'Could not load a fresh snapshot: Invalid snapshot format');
  globalThis.fetch=async()=>({ok:false,status:503});await elements.refresh.events.click();
  assert.equal(elements.error.textContent,'Could not load a fresh snapshot: HTTP 503');
  assert.doesNotMatch(allText(),cyrillic);
 }finally{Object.assign(globalThis,previous);}
});

test('rendered chart controls, accessibility labels, cash and tooltips are English',async()=>{
 const root=new Node('section'),previous=globalThis.document;
 try{
  globalThis.document={getElementById:()=>root,createElement:tag=>new Node(tag),createElementNS:(_,tag)=>new Node(tag)};
  const {updateCharts}=await import('./paper-charts.mjs?v=mig1hv1');
  updateCharts({run_id:'R4'});assert.match(text(root),/Account history is loading/);
  updateCharts({run_id:'R4',wallets:ids.map(id=>({id,cash_sol:.9})),performance_history:{run_id:'R4',started_at:100,asof:200,series:ids.map(id=>({id,name:'Старое имя',points:[[100,0,0,1,false],[200,.02,0,.9,false]],realized:[[100,0],[200,0]],gaps:[]}))}});
  assert.doesNotMatch(text(root),cyrillic);
  for(const label of labels)assert.match(text(root.children[1]),new RegExp(label));
  const controls=root.children[0].children[1];assert.equal(controls.children[0]['aria-label'],'Chart units');assert.equal(controls.children[1]['aria-label'],'Chart period');
  const cash=root.children[2].children[1],notes=root.children[3];assert.match(text(notes),/Spendable virtual cash.*excludes open-token marks/);
  assert.match(text(notes),/TP30BE15: 0.900 SOL/);
  assert.doesNotMatch(text(cash),/Spendable virtual cash.*excludes open-token marks/);
  for(const card of root.children[2].children){
   const plot=card.children.at(-1);assert.match(plot['aria-label'],/chart. Use arrow keys to inspect/);
   plot.onkeydown({key:'ArrowLeft',preventDefault(){}});
   assert.match(text(plot.children[1]),/TP30BE15:/);assert.doesNotMatch(text(plot),cyrillic);
  }
  assert.match(text(cash.children.at(-1)),/Free virtual cash 1.000 SOL/);
  controls.children[0].value='%';controls.children[0].onchange();assert.match(text(root),/Cash PnL · %/);
  controls.children[1].value='1';controls.children[1].onchange();assert.doesNotMatch(text(root),cyrillic);
 }finally{globalThis.document=previous;}
});

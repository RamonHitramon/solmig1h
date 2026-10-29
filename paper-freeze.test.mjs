import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
test('archived chart legends, cash labels and inspection remain historical',async()=>{
 class Node {constructor(tag){this.tag=tag;this.children=[];this.style={};this.dataset={};}append(...v){this.children.push(...v)}prepend(...v){this.children.unshift(...v)}replaceChildren(...v){this.children=v}setAttribute(k,v){this[k]=v}}
 const root=new Node('section'),previous=globalThis.document;
 globalThis.document={getElementById:()=>root,createElement:t=>new Node(t),createElementNS:(_,t)=>new Node(t)};
 try{
  const {updateCharts}=await import('./paper-charts.mjs?v=mig1hv1');
  updateCharts({run_id:'x',wallets:[{id:'tp40',disabled:true,cash_sol:.8}],config:{disabled_strategies:{tp40:{disabled_at:150}}},performance_history:{run_id:'x',started_at:100,asof:300,series:[{id:'tp40',name:'TP40',disabled_at:150,points:[[100,0,0,1,false],[150,.1,0,.8,false]],realized:[[100,0],[150,.01]]}]}});
  const text=n=>[n.textContent||'',...n.children.map(text)].join(' ');
  assert.match(text(root.children[1]),/TP40 · archived/);
  const cash=root.children[3];assert.match(text(cash),/TP40 · archived/);assert.doesNotMatch(text(cash),/Free SOL now/);
  for(const card of root.children[2].children){const plot=card.children.at(-1);plot.onkeydown({key:'ArrowLeft',preventDefault(){}});assert.doesNotMatch(text(plot.children[1]),/TP40:/);assert.match(text(plot.children[1]),/archived|frozen/);}
 }finally{globalThis.document=previous}
});
test('HTML exposes dynamic active counts without asserting five current strategies',async()=>{
 const html=await readFile(new URL('./index.html',import.meta.url),'utf8');
 assert.match(html,/id="active-strategies"/);assert.match(html,/id="active-rules"/);assert.doesNotMatch(html,/Five independent strategies/);
 for(const file of ['paper.mjs','paper-charts.mjs','paper-chart-model.mjs','paper-table-model.mjs']){
  const sources=html+await readFile(new URL('./paper.mjs?v=mig1hv1',import.meta.url),'utf8')+await readFile(new URL('./paper-charts.mjs?v=mig1hv1',import.meta.url),'utf8');
  assert.ok(sources.includes(file+'?v='+'mig1hv1'));
 }
});

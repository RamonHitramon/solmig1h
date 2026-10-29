import test from 'node:test';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const model = await import('./paper-table-model.mjs?v=r4visual1').catch(() => ({}));
test('net PnL separates closed cash from approximate snapshot marks and missing values', () => {
 assert.equal(typeof model.pnlModel,'function');
 const closed=model.pnlModel({closed:120,cost:.1,proceeds:.12},200);
 assert.ok(Math.abs(closed.net-.02)<1e-12); assert.ok(Math.abs(closed.percent-20)<1e-10); assert.equal(closed.approx,false);
 const open=model.pnlModel({closed:null,cost:.1,last_mark:.2,last_seen:110},200);
 assert.ok(Math.abs(open.net-(.2*.99-.00005-.1))<1e-12); assert.equal(open.approx,true); assert.equal(open.stale,false);
 assert.equal(model.pnlModel({cost:.1,last_mark:.2,last_seen:109},200).stale,true);
 assert.equal(model.pnlModel({cost:.1,last_mark:.2,last_seen:201},200).stale,true);
 assert.equal(model.pnlModel({cost:.1,last_mark:0},200).net,-.1);
 for(const p of [{cost:null,last_mark:.2},{cost:.1,last_mark:null},{cost:.1,closed:120,proceeds:null},{cost:'0.1',last_mark:.2},{cost:.1,last_mark:-1}]) assert.equal(model.pnlModel(p,200).net,null);
 assert.equal(model.pnlModel({cost:0,last_mark:.2},200).percent,null);
});
test('formatters preserve missing data, UTC seconds, signed 3-decimal SOL and compact duration',()=>{
 assert.equal(model.formatDuration(null),'—'); assert.equal(model.formatDuration(-1),'—');
 assert.equal(model.formatDuration(29.9),'29.9s'); assert.equal(model.formatDuration(60),'1m'); assert.equal(model.formatDuration(3661),'1h 1m');
 assert.equal(model.formatUTC(100),'00:01:40 UTC\n1970-01-01'); assert.equal(model.formatUTC(null),'—'); assert.equal(model.formatUTC(Infinity),'—');
 assert.equal(model.formatSOL(.12349),'+0.123 SOL'); assert.equal(model.formatSOL(-.12349),'−0.123 SOL'); assert.equal(model.formatSOL(null),'—'); assert.equal(model.formatSOL(-.00001),'0.000 SOL');
 assert.equal(model.formatPercent(-.001),'0.00%'); assert.equal(model.formatPercent(.02),'+0.02%');
 assert.equal(model.entryDelay({entry_delay_seconds:null,opened:120,signal_at:100}),null);
 assert.equal(model.entryDelay({entry_delay_seconds:20}),20); assert.equal(model.entryDelay({entry_delay_seconds:-1}),null);
});
test('links allow only base58 mint GMGN paths and exact existing Telegram calls',()=>{
 const mint='So11111111111111111111111111111111111111112';
 assert.deepEqual(model.safeLinks({address:mint,source_url:'https://t.me/c/4466268904/123'}),{gmgn:'https://gmgn.ai/sol/token/'+mint,telegram:'https://t.me/c/4466268904/123'});
 for(const address of ['<script>',mint+'?t=1','0'.repeat(44),'',null]) assert.equal(model.safeLinks({address}).gmgn,null);
 for(const source_url of ['javascript:alert(1)','https://t.me.evil/mcap100k_sol/123','https://t.me/c/4466268904/123?x=1']) assert.equal(model.safeLinks({source_url}).telegram,null);
 assert.equal(model.safeLinks({address:mint,gmgn_url:'javascript:alert(1)'}).gmgn,'https://gmgn.ai/sol/token/'+mint);
});
test('filters and numeric sorting are immutable, missing values last in both directions',()=>{
 const rows=[{symbol:'a',strategy:'tp30',opened:100,cost:1,last_mark:2},{symbol:'b',strategy:'tp20',opened:20,closed:50,cost:1,proceeds:.5},{symbol:'c',strategy:'tp20',opened:null,cost:1}];
 const names=(sort,extra={})=>model.selectPositions(rows,{sort,...extra},200).map(p=>p.symbol);
 assert.deepEqual(names('latest'),['a','b','c']); assert.deepEqual(names('oldest'),['b','a','c']);
 assert.deepEqual(names('hold-asc'),['b','a','c']); assert.deepEqual(names('hold-desc'),['a','b','c']);
 assert.deepEqual(names('pnl-desc'),['a','b','c']); assert.deepEqual(names('pnl-asc'),['b','a','c']);
 assert.deepEqual(names('strategy'),['b','c','a']); assert.deepEqual(names('latest',{strategy:'tp20',status:'closed'}),['b']);
 assert.deepEqual(names('latest',{status:'open'}),['a','c']); assert.deepEqual(rows.map(p=>p.symbol),['a','b','c']);
});
test('counts identify feed truncation with explicit or wallet totals',()=>{
 assert.deepEqual(model.countModel({positions:[{},{}],positions_total:5},1),{shown:1,loaded:2,total:5,truncated:true});
 assert.equal(model.countModel({positions:[{}],wallets:[{open:2,closed:3}]},1).total,5);
 assert.equal(model.countModel({positions:[{}]},0).truncated,false);
});
test('frontend has semantic scroll table, new feed/cache path, safe text and all filters',async()=>{
 const html=await readFile(new URL('./index.html',import.meta.url),'utf8');
 const js=await readFile(new URL('./paper.mjs?v=r4visual1',import.meta.url),'utf8');
 assert.match(html,/<table[ >]/); assert.match(html,/<tbody id="positions"/); assert.match(html,/scope="col"/);
 assert.match(html,/id="status-filter"/); assert.match(html,/id="sort"/); assert.match(html,/overflow:auto/);
 assert.match(html,/paper.mjs\?v=[\w.-]+/); assert.match(js,/refs\/heads\/paper-feed\/live-paper.json/);
 assert.doesNotMatch(js,/innerHTML/); assert.match(js,/paper-table-model.mjs\?v=[\w.-]+/);
});
test('frontend renders safe rows, snapshot marks, empty tbody and preserves filters on refresh',async()=>{
 class Node { constructor(tag='div'){this.tag=tag;this.children=[];this.value='all';this.events={};this.style={};} append(...v){this.children.push(...v);} replaceChildren(...v){this.children=v;} addEventListener(k,fn){this.events[k]=fn;} setAttribute(k,v){this[k]=v;} }
 const ids=Object.fromEntries(['status','wallets','filter','status-filter','sort','positions','health','download','refresh','error','trade-count','trade-asof','active-strategies','active-rules'].map(id=>[id,new Node()]));
 ids.sort.value='latest'; const option=new Node('option');option.value='tp100';option.textContent='TP 2×';ids.filter.children.push(option);ids.filter.options=ids.filter.children;
 const globals={document:globalThis.document,fetch:globalThis.fetch,setInterval:globalThis.setInterval};
 const snapshot={mode:'PAPER_ONLY',updated_at:200,started_at:100,signals:1,wallets:Array.from({length:5},(_,i)=>({id:'tp'+i,name:'Wallet '+i,net_sol:0,equity_sol:1,cash_sol:1,realised_sol:0,open:1,closed:0})),positions:[{symbol:'<img onerror=bad>',strategy:'tp0',address:'So11111111111111111111111111111111111111112',opened:100,last_seen:100,last_mark:.2,cost:.1,signal_at:null,entry_delay_seconds:null,age_at_migration_seconds:3661}]};
 try {
  globalThis.document={getElementById:id=>ids[id]||null,createElement:tag=>new Node(tag)};
  globalThis.setInterval=()=>0; globalThis.fetch=async()=>({ok:true,json:async()=>snapshot});
  await import('./paper.mjs?v=r4visual1'); await new Promise(resolve=>setImmediate(resolve));
  assert.equal(ids.wallets.children.length,5); assert.equal(ids.positions.children[0].tag,'tr');
  const row=ids.positions.children[0]; assert.equal(row.children.length,10); assert.equal(row.children[0].children[0].textContent,'<img onerror=bad>');assert.equal(row.children[2].children[0].tag,'strong');assert.equal(row.children[2].children[0].textContent,'1h 1m 1s');
  assert.equal(row.children[3].textContent,'—'); assert.equal(row.children[5].textContent,'—');
  assert.equal(row.children[7].textContent,'1m 40s'); assert.match(row.children[8].children[0].textContent,/≈ \+0.098 SOL/);
  ids.filter.value='missing'; ids['status-filter'].value='closed'; ids.sort.value='oldest'; ids.filter.events.change();
  assert.equal(ids.positions.children[0].children[0].colSpan,10);
  await ids.refresh.events.click();
  assert.equal(ids.filter.value,'missing'); assert.equal(ids['status-filter'].value,'closed'); assert.equal(ids.sort.value,'oldest');
  const text=n=>[n.textContent||'',...n.children.map(text)].join(' ');
  snapshot.wallets[0]={...snapshot.wallets[0],id:'tp100',name:'TP 2×',disabled:true,disabled_at:150};
  snapshot.config={disabled_strategies:{tp100:{disabled_at:150,mode:'frozen'}}};
  snapshot.positions=[{...snapshot.positions[0],strategy:'tp100',strategy_disabled:true,frozen_at:150,last_seen:140},
   {strategy:'tp100',strategy_disabled:true,opened:100,closed:145,cost:.1,proceeds:.12}];
  ids.filter.value='tp100';ids['status-filter'].value='all';await ids.refresh.events.click();
  assert.match(text(ids.wallets.children[0]),/TP 2× · archived/);
  assert.match(text(ids.wallets.children[0]),/Archived · no new entries\/exits; valuation frozen/);
  assert.match(text(ids.wallets.children[0]),/00:02:30 UTC/);
  assert.equal(ids.wallets.children[0].children[2].className,'big muted');
  assert.equal(ids.filter.options[0].textContent,'TP 2× · archived');
  assert.match(ids['active-strategies'].textContent,/4/);assert.match(ids['active-rules'].textContent,/4/);
  const frozen=ids.positions.children.find(r=>r.children[6].textContent==='FROZEN');assert.ok(frozen);
  assert.equal(frozen.children[7].textContent,'50s');assert.match(frozen.children[1].textContent,/archived/);
  assert.match(text(frozen.children[8]),/frozen/);assert.equal(frozen.children[8].className,'numeric muted');
  assert.match(frozen.children[8].title,/00:02:20 UTC/);
  const closed=ids.positions.children.find(r=>r!==frozen);assert.equal(closed.children[8].children[0].textContent,'+0.020 SOL');
  assert.doesNotMatch(text(closed.children[8]),/frozen|≈/);
  snapshot.run_status='stopped';snapshot.stopped_at=200;
  await ids.refresh.events.click();
  assert.match(ids.status.textContent,/Test stopped/);
  assert.doesNotMatch(ids.status.textContent,/Paper test running|Snapshot is stale/);
 } finally {Object.assign(globalThis,globals);}
});
test('frozen open HOLD stops at freeze only for strict disabled flag, fails neutral without freeze',()=>{
 for(const [freeze,tone] of [[129.9,'neg'],[130,'warning'],[160,'warning'],[160.1,'pos']]){
  const h=model.holdModel({opened:100,strategy_disabled:true,frozen_at:freeze},999);
  assert.ok(Math.abs(h.seconds-(freeze-100))<1e-10); assert.equal(h.tone,tone);
 }
 for(const frozen_at of [undefined,null,'150',90]) assert.deepEqual(model.holdModel({opened:100,strategy_disabled:true,frozen_at},999),{seconds:null,tone:'muted'});
 for(const strategy_disabled of [undefined,false,'true']) assert.equal(model.holdModel({opened:100,strategy_disabled,frozen_at:150},200).seconds,100);
 assert.equal(model.holdModel({opened:100,closed:175,strategy_disabled:true,frozen_at:150},999).seconds,75);
});
test('hold uses snapshot time, strict boundaries and neutral invalid durations', () => {
 assert.equal(typeof model.holdModel, 'function');
 for (const [seconds,tone] of [[0,'neg'],[29.99,'neg'],[30,'warning'],[60,'warning'],[60.01,'pos']]) {
  const actual=model.holdModel({opened:100,closed:100+seconds},999);
  assert.equal(actual.tone,tone); assert.ok(Math.abs(actual.seconds-seconds)<1e-10);
 }
 assert.deepEqual(model.holdModel({opened:100,closed:null},145),{seconds:45,tone:'warning'});
 for (const p of [{opened:null},{opened:'100'},{opened:200},{opened:100,closed:90},{opened:100,closed:'bad'}]) assert.deepEqual(model.holdModel(p,150),{seconds:null,tone:'muted'});
});

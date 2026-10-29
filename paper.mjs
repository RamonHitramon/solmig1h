import {updateCharts} from './paper-charts.mjs?v=mig1hv1';
import {holdModel,pnlModel,entryDelay,formatDuration,migrationAge,formatMigrationAge,formatUTC,formatSOL,formatPercent,strategyLabel,safeLinks,selectPositions,countModel} from './paper-table-model.mjs?v=mig1hv1';
const feed='https://raw.githubusercontent.com/RamonHitramon/solmig1h/refs/heads/paper-feed/live-paper.json';
const $=id=>document.getElementById(id);
const sol=v=>Number(v).toFixed(3)+' SOL';
const at=t=>t?new Date(t*1000).toLocaleString('en-GB',{timeZone:'UTC'})+' UTC':'—';
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const field=(list,key,value)=>{const line=el('div');line.append(el('dt',key),el('dd',value));list.append(line);};
let state=null,busy=false;
function render(){
 const s=state,age=Date.now()/1000-s.updated_at,stale=age>300;
 $('status').textContent=(s.run_status==='preparing'?'◌ Preparing test · ':s.run_status==='stopped'?'■ Test stopped · ':stale?'⚠ Snapshot is stale. ':'● Paper test running · ')+at(s.stopped_at||s.updated_at)+(s.run_id?' · '+s.run_id:'')+' · signals: '+s.signals;
 $('status').className=stale?'warning':'muted';$('wallets').replaceChildren();
 const active=s.wallets.filter(w=>!w.disabled).length;
 $('active-strategies').textContent=`Active strategies: ${active}. New signals → real Jupiter quotes → virtual trades; no hindsight peak selection.`;
 $('active-rules').textContent=`New entries and exits: ${active} active strategies. Archived accounts do not trade; their history and frozen marks are preserved.`;
 for(const option of $('filter').options){option.dataset??={};option.dataset.label??=option.textContent;option.textContent=option.dataset.label+(s.config?.disabled_strategies?.[option.value]?' · archived':'');}
 for(const w of s.wallets){const card=el('article',undefined,'card');card.append(el('h3',strategyLabel(w.id,w.name)+(w.disabled?' · archived':'')),el('small',w.disabled?'Archived · no new entries/exits; valuation frozen':'Account equity including modeled costs'),el('div',sol(w.equity_sol),w.disabled?'big muted':'big'),el('div',(w.net_sol>=0?'+':'')+sol(w.net_sol)+' · '+(w.net_sol*100).toFixed(2)+'%',w.disabled?'muted':w.net_sol>=0?'pos':'neg'));if(w.disabled)card.append(el('small','Frozen: '+formatUTC(w.disabled_at).replace('\n',' · ')));const dl=el('dl');field(dl,'Free SOL (spendable virtual cash)',sol(w.cash_sol));field(dl,'Realized PnL',sol(w.realised_sol));field(dl,'Open / closed',w.open+' / '+w.closed);field(dl,'Skipped',w.skipped);if(w.stale)field(dl,'Stale marks',w.stale);card.append(dl);$('wallets').append(card);}
 renderTrades(s);
 const h=s.health||{};$('health').textContent='Started: '+at(s.started_at)+' · Process RAM: '+((s.memory_rss_kib||0)/1024).toFixed(1)+' MiB · Last successful quote: '+at(h.last_quote_ok)+' · Recorded monitoring gaps: '+(h.gap_count||0)+(h.last_error?' · Last event: '+h.last_error.stage+' / '+h.last_error.error+' / '+at(h.last_error.at):'');
 $('download').href=feed;updateCharts(s);
}
export function renderTrades(s){
 const ps=selectPositions(s.positions,{strategy:$('filter').value,status:$('status-filter').value,sort:$('sort').value},s.updated_at);
 const body=$('positions');body.replaceChildren();
 const count=countModel(s,ps.length);
 $('trade-count').textContent=`Showing ${count.shown} of ${count.loaded} in snapshot · total ${count.total}`+(count.truncated?' · Feed: latest 200 only; selection and sorting apply to loaded rows.':'');
 $('trade-asof').textContent='As of: '+formatUTC(s.updated_at).replace('\n',' · ')+' · Open HOLD uses snapshot time; FROZEN uses frozen_at (missing timestamp: —). Frozen PnL is not a current quote.';
 if(!ps.length){const row=el('tr'),cell=el('td',s.signals?'No trades match this selection yet.':'Waiting for the first new eligible signal. Old signals are not bought retroactively.','empty');cell.colSpan=10;row.append(cell);body.append(row);}
 for(const p of ps){
  const row=el('tr'),token=el('th',undefined,'token-cell');token.scope='row';token.append(el('strong',p.symbol||'—','token-name'));
  const links=safeLinks(p),linksRow=el('div',undefined,'token-links');
  for(const [label,url] of [['GMGN ↗',links.gmgn],['TG ↗',links.telegram]]){const link=el(url?'a':'span',url?label:label.replace(' ↗',' —'));if(url){link.href=url;link.target='_blank';link.rel='noopener noreferrer';}else link.className='muted';linksRow.append(link);}
  token.title=p.address||'Mint unavailable';token.append(linksRow);row.append(token);
  const archived=p.strategy_disabled===true||s.wallets.find(w=>w.id===p.strategy)?.disabled||Boolean(s.config?.disabled_strategies?.[p.strategy]);
  const frozen=p.strategy_disabled===true&&p.closed==null;
  const name=strategyLabel(p.strategy,s.wallets.find(w=>w.id===p.strategy)?.name)+(archived?' · archived':'');const strategy=el('td',name,'strategy-cell');
  strategy.title=name;if(p.strategy==='tp30be')strategy.append(el('small',p.armed?'Break-even armed':'Waiting for +15%'));row.append(strategy);
  const age=el('td',undefined,'numeric token-age');age.append(el('strong',formatMigrationAge(migrationAge(p))));age.title='Created: '+formatUTC(p.created_at)+' · Migration: '+formatUTC(p.migration_at)+' · Market open: '+formatUTC(p.market_open_at);row.append(age);
  row.append(el('td',formatUTC(p.signal_at),'utc'),el('td',formatUTC(p.opened),'utc'),el('td',formatDuration(entryDelay(p)),'numeric'));
  const exit=el('td',p.closed==null?(frozen?'FROZEN':'OPEN'):formatUTC(p.closed),p.closed==null?'muted':'utc');exit.title=frozen?'Frozen: '+formatUTC(p.frozen_at).replace('\n',' · '):p.reason||'Open virtual position';row.append(exit);
  const hold=holdModel(p,s.updated_at);row.append(el('td',formatDuration(hold.seconds),'numeric '+hold.tone));
  const pnl=pnlModel(p,s.updated_at),cell=el('td',undefined,'numeric '+(frozen||pnl.net===null?'muted':pnl.net>0?'pos':pnl.net<0?'neg':'muted'));
  cell.append(el('div',(pnl.approx?'≈ ':'')+formatSOL(pnl.net)));
  if(pnl.approx){cell.append(el('small',frozen?'frozen · ≈ frozen mark':pnl.stale?'⚠ stale / no fresh mark':'mark · as of snapshot',frozen?'muted':pnl.stale?'warning':'muted'));cell.title='Mark as of '+formatUTC(p.last_seen).replace('\n',' · ')+'; max(0, last_mark × 0.99 − 0.00005) − cost. Not an executed sale.';}
  // Column order: token, strategy, signal, entry, delay, exit, HOLD, PnL SOL, PnL %.
  const percent=el('td',(pnl.approx?'≈ ':'')+formatPercent(pnl.percent),'numeric '+(frozen||pnl.net===null?'muted':pnl.net>0?'pos':pnl.net<0?'neg':'muted'));
  row.append(cell,percent);body.append(row);
 }
}
async function refresh(){if(busy)return;busy=true;$('refresh').disabled=true;try{const r=await fetch(feed+'?v='+Math.floor(Date.now()/60000),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const s=await r.json();if(s.mode!=='PAPER_ONLY'||!Array.isArray(s.wallets))throw Error('Invalid snapshot format');state=s;$('error').textContent=s.data_quality?.legacy_quote_outages?'⚠ Earlier quote gaps: results are provisional, not a clean strategy comparison.':'';render();}catch(e){$('error').textContent='Could not load a fresh snapshot: '+e.message;if(state)render();}finally{busy=false;$('refresh').disabled=false;}}
$('refresh').addEventListener('click',refresh);for(const id of ['filter','status-filter','sort'])$(id).addEventListener('change',()=>state&&renderTrades(state));refresh();setInterval(refresh,60000);

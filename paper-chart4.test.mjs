import test from 'node:test';
import assert from 'node:assert/strict';
import {plotModel} from './paper-chart-model.mjs?v=mig1hv1';
const h={started_at:100,asof:1000,series:[{id:'tp20',name:'TP20',points:[[100,0,0,1],[200,2,0,.1],[1000,.5,0,.8]],realized:[[100,0],[400,.3]],trade_counts:[[100,0,0],[200,3,0],[400,3,2]],gaps:[]}]};
test('PnL domains are shared across displayed metrics, units and window',()=>{
 const modes=['equity','cash','realized'];
 for(const units of ['SOL','%']){const models=modes.map(mode=>plotModel(h,mode,units));for(const m of models){assert.deepEqual(m.y,models[0].y);assert.deepEqual(m.x,[100,1000]);}assert(models[0].y[0]<-(units==='%'?90:.9));}
 const hidden=plotModel(h,'equity','SOL',[]);assert(hidden.y[1]<1);
 const late={...h,asof:10000};assert(plotModel(late,'equity','SOL',null,1).y[1]<1);
});
test('shared domain clips the selected window and does not pull in extrema across observation gaps',()=>{
 const series={id:'tp20',points:[[100,100,0,1],[900,.1,0,1]],realized:[],gaps:[]};
 const history={started_at:100,asof:4000,series:[series]}; // Last hour begins at 400.
 const a=plotModel(history,'equity','SOL',null,1);assert(a.y[1]<80);assert(a.y[1]>60);
 const gap=plotModel({...history,series:[{...series,gaps:[[100,900]]}]},'equity','SOL',null,1);assert(gap.y[1]<1);
});
test('counts preserve integer events independently of units, freezes, windows and capped positions',()=>{
 const a=plotModel(h,'counts','SOL'),b=plotModel(h,'counts','%');assert.deepEqual(a,b);assert.equal(a.units,'counts');assert.deepEqual(a.y,[0,4]);assert.deepEqual(a.series[0].data.map(p=>[p.t,p.v,p.closed]),[[100,0,0],[200,3,0],[400,3,2]]);
 assert.deepEqual(a.x,plotModel(h).x);assert.equal(plotModel(h,'counts','SOL',[]).series.length,0);
 const frozen=plotModel({...h,series:[{...h.series[0],disabled_at:250}]},'counts').series[0];assert.equal(frozen.data.at(-1).t,200);
 const missing=plotModel({...h,positions:[{status:'closed'}],series:[{...h.series[0],trade_counts:undefined}]},'counts').series[0];assert.equal(missing.unavailable,true);assert.deepEqual(missing.data,[]);
});

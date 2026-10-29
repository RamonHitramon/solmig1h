import {strategyLabel} from './paper-table-model.mjs?v=mig1hv1';
export function plotModel(history,mode='equity',units='SOL',enabled=null,hours=0){
 const end=Number(history?.asof)||0,start=Number(history?.started_at)||end,min=hours?Math.max(start,end-hours*3600):start;
 const selected=(history?.series||[]).filter(s=>!enabled||enabled.includes(s.id));
 function makeSeries(s,metric){
  const disabled_at=Number.isFinite(s.disabled_at)&&s.disabled_at>0?s.disabled_at:null;
  const counts=metric==='counts',raw=counts?s.trade_counts:metric==='realized'?s.realized:s.points;
  let data=(raw||[]).filter(p=>(disabled_at===null||p[0]<=disabled_at)&&Number.isFinite(p[0])&&p[0]<=end&&(counts?Number.isSafeInteger(p[1])&&p[1]>=0&&Number.isSafeInteger(p[2])&&p[2]>=0:Number.isFinite(metric==='cash'?p[3]:p[1]))).map(p=>counts?{t:p[0],v:p[1],closed:p[2]}:{t:p[0],v:(metric==='cash'?p[3]-1:p[1])*(units==='%'?100:1),cash:metric==='cash'?p[3]:undefined,stale:metric==='equity'&&Boolean(p[4])});
  const previous=data.filter(p=>p.t<min).at(-1);data=data.filter(p=>p.t>=min);if(previous)data.unshift(previous);
  return {id:s.id,name:strategyLabel(s.id,s.name)+(disabled_at!==null?' · archived':''),disabled_at,data,gaps:metric==='equity'||metric==='cash'?(s.gaps||[]):[],...(counts?{unavailable:!Array.isArray(raw)||!data.length}:{})};
 }
 const series=selected.map(s=>makeSeries(s,mode));
 // Domain-only clipping does not add observations or extend any rendered line.
 const displayed=(s,metric)=>{
  const values=s.data.filter(p=>p.t>=min).map(p=>p.v),previous=s.data[0],next=s.data[1];
  if(previous?.t<min&&next?.t>=min&&!previous.stale&&!next.stale&&!s.gaps.some(g=>g[0]<next.t&&g[1]>previous.t))values.push(metric==='equity'?previous.v+(next.v-previous.v)*(min-previous.t)/(next.t-previous.t):previous.v);
  return values;
 };
 let y;
 if(mode==='counts'){
  const hi=Math.max(0,...series.flatMap(s=>s.data.flatMap(p=>[p.v,p.closed])));
  const step=Math.max(1,Math.ceil(hi/4));y=[0,step*4];
 }else{
  const values=['equity','cash','realized'].flatMap(metric=>selected.flatMap(s=>displayed(makeSeries(s,metric),metric)));
  const lo=Math.min(0,...values),hi=Math.max(0,...values),pad=Math.max((hi-lo)*.12,units==='%'?.5:.005);y=[lo-pad,hi+pad];
 }
 return {series,x:[min,Math.max(end,min+1)],y,mode,units:mode==='counts'?'counts':units};
}
export function pathFor(data,x,y,step=false,gaps=[]){
 let path='',previous=null;
 for(const p of data){
  const move=!previous||p.stale||previous.stale||gaps.some(g=>g[0]<p.t&&g[1]>previous.t);
  const px=x(p.t).toFixed(2),py=y(p.v).toFixed(2);
  path+=move?`M${px},${py}`:step?`H${px}V${py}`:`L${px},${py}`;previous=p;
 }
 return path;
}

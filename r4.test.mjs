import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
test('R4 table and chart strategy labels and isolated public feed',async()=>{
 const html=await readFile(new URL('./index.html',import.meta.url),'utf8'),charts=await readFile(new URL('./paper-charts.mjs?v=r4visual1',import.meta.url),'utf8'),app=await readFile(new URL('./paper.mjs?v=r4visual1',import.meta.url),'utf8');
 for(const n of [20,25,30,35,40]){assert.ok(html.includes(`value="tp${n}"`));assert.ok(charts.includes(`tp${n}:`));assert.ok(charts.includes(`TP${n}`));}
 assert.doesNotMatch(html+charts,/tp100|trail50_20/);assert.match(app,/RamonHitramon\/solmig1h\/refs\/heads\/paper-feed/);assert.doesNotMatch(app,/mcap-call-report-2026-10-25/);
});

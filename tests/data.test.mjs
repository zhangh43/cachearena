import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {normalizeState,selectRows,seriesFor,cohorts} from '../src/data.mjs';
const rows=JSON.parse(await readFile('public/data/results.json','utf8'));
test('source archive hashes match the published manifest',async()=>{
 const manifest=JSON.parse(await readFile('public/data/manifest.json','utf8'));
 for(const [file,hash]of Object.entries(manifest.files))assert.equal(createHash('sha256').update(await readFile(`public/data/${file}`)).digest('hex'),hash);
});
test('all 146 September measurements match the original CSV precisely',async()=>{
 const lines=(await readFile('public/data/september-results.csv','utf8')).trim().split('\n');const keys=lines.shift().split(',');
 const source=lines.map(line=>Object.fromEntries(line.split(',').map((v,i)=>[keys[i],v])));
 assert.equal(source.length,146);const sept=rows.filter(r=>r.cohort==='memory'||r.cohort==='storage');assert.equal(sept.length,146);
 for(const s of source){const r=sept.find(r=>r.source===s.source);assert.ok(r);assert.equal(r.qps,Number(s.qps));assert.equal(r.p99,Number(s.p99_ms));assert.equal(r.p999,Number(s.p999_ms));assert.equal(r.connections,Number(s.connections));assert.equal(r.threads,Number(s.server_threads));}
 assert.equal(sept.filter(r=>r.reused).length,124);
});
test('all 30 August summary rows match their source, including separate Azure rows',async()=>{
 const source=(await readFile('public/data/august-report.md','utf8')).split('\n').map(l=>l.split('|').slice(1,-1).map(s=>s.trim())).filter(p=>p.length===5&&['Read-only GET','Write-only SET','1:1 read/write'].includes(p[0]));
 assert.equal(source.length,30);
 for(const p of source){const qps=Number(p[2].replaceAll(',',''));const r=rows.find(r=>r.qps===qps);assert.ok(r);assert.equal(r.p99,Number(p[3]));assert.equal(r.p999,Number(p[4]));assert.equal(r.cohort,p[1].includes('Azure')?'azure':'august');}
});
test('peak selections reproduce report values and latency rankings do not cherry-pick points',()=>{
 const state=normalizeState({cohort:'storage',workload:'SET'});const selected=selectRows(rows,state);
 assert.deepEqual(selected.map(r=>[r.system,Math.round(r.qps),r.connections]),[['lavik-spdk',764939,1280],['garnet',751057,1280],['dragonfly',539616,640]]);
 const latency=selectRows(rows,{...state,metric:'p99'});assert.equal(latency[0].system,'garnet');
 for(const r of latency)assert.deepEqual(r,selected.find(x=>x.system===r.system));
});
test('memory defaults select Valkey SET with 8 I/O threads, and explicit settings work',()=>{
 const state=normalizeState({cohort:'memory',workload:'SET'});assert.equal(selectRows(rows,state).find(r=>r.system==='valkey').threads,8);
 for(const n of ['1','2','4','8','16']){
  const selected=selectRows(rows,normalizeState({...state,threads:n,connection:'320'}));
  assert.equal(selected.length,3);for(const r of selected){assert.equal(r.connections,320);if(r.system!=='lavik-spdk')assert.equal(r.threads,Number(n));}
 }
});
test('every valid selector combination has complete, finite, correctly ordered data',()=>{
 for(const [cohort,c]of Object.entries(cohorts))for(const workload of c.workloads)for(const connection of ['peak',...c.connections.map(String)])for(const metric of ['qps','p99','p999']){
  const state=normalizeState({cohort,workload,connection,metric});const selected=selectRows(rows,state);
  assert.equal(selected.length,cohort==='august'?9:3);
  assert.ok(selected.every(r=>r.cohort===cohort&&r.system!=='azure'&&Number.isFinite(r[metric])));
  for(let i=1;i<selected.length;i++)assert.ok(metric==='qps'?selected[i-1][metric]>=selected[i][metric]:selected[i-1][metric]<=selected[i][metric]);
  for(const s of seriesFor(rows,state))assert.ok(s.points.length>0);
 }
});
test('invalid URLs normalize to supported states without inherited object properties',()=>{
 assert.deepEqual(normalizeState({cohort:'__proto__',metric:'constructor',workload:'bad',connection:'-1'}),normalizeState());
 assert.equal(normalizeState({cohort:'memory',workload:'MIXED',connection:'2560'}).workload,'GET');
 assert.equal(normalizeState({cohort:'august',connection:'peak'}).connection,'80');
});

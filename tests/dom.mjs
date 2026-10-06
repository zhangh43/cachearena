import {JSDOM} from 'jsdom';
import {readFile,access} from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
const rows=JSON.parse(await readFile('public/data/results.json','utf8'));
for(const route of ['index.html','compare/index.html','methodology/index.html']){
 const dom=new JSDOM(await readFile(`dist/${route}`,'utf8'),{url:'https://cachearena.com/'+route.replace('index.html','')});
 const d=dom.window.document;assert.equal(d.querySelectorAll('h1').length,1);assert.ok(d.querySelector('link[rel=canonical]'));
 for(const link of d.querySelectorAll('[href],[src]')){
  const raw=link.getAttribute('href')||link.getAttribute('src');if(!raw.startsWith('/')||raw.startsWith('//'))continue;
  const url=new URL(raw,'https://cachearena.com');let file=path.join('dist',url.pathname);if(!path.extname(file))file=path.join(file,'index.html');
  await access(file);
  if(url.hash){const target=new JSDOM(await readFile(file,'utf8')).window.document;assert.ok(target.getElementById(url.hash.slice(1)),`Missing anchor ${raw}`);}
 }
}
const dom=new JSDOM(await readFile('dist/compare/index.html','utf8'),{url:'https://cachearena.com/compare?cohort=memory&workload=SET&metric=p99&connection=320'});
const w=dom.window;globalThis.window=w;globalThis.document=w.document;globalThis.location=w.location;globalThis.history=w.history;
globalThis.fetch=async()=>({ok:true,json:async()=>rows});let agentTool;document.modelContext={registerTool:tool=>{agentTool=tool;}};
await import('../src/app.mjs');
assert.equal(document.querySelector('#workload').value,'SET');assert.equal(document.querySelector('#metric').value,'p99');assert.equal(document.querySelector('#connection').value,'320');
document.querySelector('[data-cohort="august"]').click();assert.equal(document.querySelector('#comparison tbody').rows.length,9);assert.equal(document.querySelector('#connection').value,'80');
const workload=document.querySelector('#workload');workload.value='MIXED';workload.dispatchEvent(new w.Event('change',{bubbles:true}));assert.match(location.search,/workload=MIXED/);assert.ok(document.querySelector('#comparison').textContent.includes('352,442'));
assert.ok(agentTool);const result=agentTool.execute({cohort:'storage',workload:'SET',metric:'p99'});assert.equal(result.measurements[0].system,'garnet');assert.equal(document.querySelector('#metric').value,'p99');
const prior=location.href;assert.throws(()=>agentTool.execute({cohort:'memory',workload:'MIXED',metric:'qps'}));assert.equal(location.href,prior);
let download;const originalCreate=document.createElement.bind(document);document.createElement=tag=>{const el=originalCreate(tag);if(tag==='a')el.click=()=>{download=el.download;};return el;};document.querySelector('#export').click();assert.match(download,/cachearena-storage-set-peak\.csv/);
console.log('Passed: page metadata, local links and anchors, deep links, cohort/workload/metric changes, CSV download, and agent tool state validation (simulated context).');
dom.window.close();

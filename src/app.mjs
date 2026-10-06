import {normalizeState,selectRows,cohorts,workloadName,metricInfo} from './data.mjs';
import {comparison} from './render.mjs';
const container=document.querySelector('#comparison');
if(container){
 let rows;
 let state=normalizeState(Object.fromEntries(new URLSearchParams(location.search)));
 function render({url=true,focus}={}){
  container.innerHTML=comparison(rows,state);
  if(url){const query=new URLSearchParams(state);history.replaceState(null,'',`${location.pathname}?${query}`);}
  if(focus)container.querySelector(focus)?.focus({preventScroll:true});
  document.querySelector('#result-announcement').textContent=`${cohorts[state.cohort].label}. ${workloadName[state.workload]}. Sorted by ${metricInfo[state.metric].name}.`;
 }
 function update(changes,focus){state=normalizeState({...state,...changes});render({focus});}
 container.addEventListener('click',event=>{
  const cohort=event.target.closest('[data-cohort]');
  if(cohort&&rows)update({cohort:cohort.dataset.cohort,connection:'peak',threads:'best'},`[data-cohort="${cohort.dataset.cohort}"]`);
  if(event.target.closest('#export')&&rows){
   const selected=selectRows(rows,state);
   const columns=['cohort','system','workload','threads','role','connections','qps','p99','p999','seconds','reused','source'];
   const csv=[columns.join(','),...selected.map(row=>columns.map(key=>'"'+String(row[key]??'').replaceAll('"','""')+'"').join(','))].join('\r\n');
   const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
   link.href=url;link.download=`cachearena-${state.cohort}-${state.workload.toLowerCase()}-${state.connection}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
 });
 container.addEventListener('change',event=>{if(rows&&['workload','metric','connection','threads'].includes(event.target.id))update({[event.target.id]:event.target.value},`#${event.target.id}`);});
 window.addEventListener('popstate',()=>{if(rows){state=normalizeState(Object.fromEntries(new URLSearchParams(location.search)));render({url:false});}});
 try{
  const response=await fetch('/data/results.json');if(!response.ok)throw new Error('Data request failed');rows=await response.json();render({url:false});
  const context=document.modelContext;
  if(context?.registerTool){
   const lifecycle=new AbortController();
   window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
   Promise.resolve(context.registerTool({name:'configure_cache_comparison',title:'Configure cache benchmark comparison',description:'Select a benchmark cohort, workload, metric, and concurrency. Updates the visible comparison and returns the selected source measurements. Does not run a benchmark.',inputSchema:{type:'object',properties:{cohort:{type:'string',enum:['memory','storage','august']},workload:{type:'string',enum:['GET','SET','MIXED']},metric:{type:'string',enum:['qps','p99','p999']},connection:{type:'string',enum:['peak','80','160','320','640','1280','2560']},threads:{type:'string',enum:['best','1','2','4','8','16']}},required:['cohort','workload','metric'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){
    if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Expected a comparison configuration.');
    const next=normalizeState(input);
    for(const [key,value]of Object.entries(input))if(!Object.hasOwn(next,key)||next[key]!==value)throw new Error(`Unsupported ${key} for this cohort.`);
    for(const key of ['cohort','workload','metric'])if(!input[key])throw new Error(`Missing ${key}.`);
    state=next;render();return{state,measurements:selectRows(rows,state)};
   }},{signal:lifecycle.signal})).catch(()=>{});
  }
 }catch{
  container.insertAdjacentHTML('afterbegin','<p class="error-note" role="alert">Interactive data could not load. The default results below remain available. Please reload or download the <a href="/data/september-results.csv">source CSV</a>.</p>');
  container.querySelectorAll('button,select').forEach(control=>control.disabled=true);
 }
}

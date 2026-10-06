export const REVISION = 'd88a5e8fdcc5702272b26f9853f4baad7a146988';
export const REPO = 'https://github.com/eloqdata/lavik';
export const SEPTEMBER = `${REPO}/tree/${REVISION}/perf_reports/lavik-v0.1.0-beta.1-spdk-vs-peers-2026-09-18`;
export const AUGUST = `${REPO}/blob/${REVISION}/perf_reports/lavik-vs-dragonfly-tiering-2026-08-11/README.md`;
export const systems = {
  'lavik-spdk': {name:'Lavik',variant:'SPDK',color:'#3439ed',versions:{memory:'0.1.0-beta.1',storage:'0.1.0-beta.1',august:'August report build'}},
  'lavik-raw': {name:'Lavik',variant:'io_uring · raw',color:'#6075cb',versions:{august:'August report build'}},
  'lavik-file': {name:'Lavik',variant:'io_uring · XFS',color:'#8a9aba',versions:{august:'August report build'}},
  redis: {name:'Redis',variant:'In memory',color:'#b94444',versions:{memory:'8.8.0'}},
  valkey: {name:'Valkey',variant:'In memory',color:'#478382',versions:{memory:'9.1.0'}},
  dragonfly: {name:'Dragonfly',variant:'Tiered Storage',color:'#bf7738',versions:{storage:'1.40.2',august:'1.40.1'}},
  garnet: {name:'Garnet',variant:'Storage Tier',color:'#9870ad',versions:{storage:'2.1.5',august:'2.1.3'}},
  kvrocks: {name:'Apache Kvrocks',variant:'RocksDB',color:'#4b858b',versions:{august:'2.16.0'}},
  pika: {name:'Pika',variant:'RocksDB',color:'#a18a3d',versions:{august:'4.0.3 tag; binary 4.0.2'}},
  tendis: {name:'Tendis',variant:'RocksDB',color:'#74805b',versions:{august:'2.8.4-rocksdb-v8.5.3'}},
  keydb: {name:'KeyDB',variant:'On Flash · beta',color:'#7a7c86',versions:{august:'6.3.4'}},
  azure: {name:'Azure Managed Redis',variant:'Separate managed-service test',color:'#587eae',versions:{azure:'Redis 7.4.3'}}
};
export const cohorts = {
  storage:{name:'Storage tier',short:'1B keys',label:'1B keys · storage tier',date:'Sep 18, 2026',keys:'1 billion',value:'1 KiB',duration:'60 seconds',hardware:'16 logical CPUs · 6 × NVMe',memory:'~126 GiB host RAM',description:'A dataset larger than memory, with each system using its tested storage tier.',note:'22 new Lavik measurements and 124 reused peer controls across the September report. One run per configuration; no confidence intervals. Memory budgets, warmups, storage paths, and durability differ.',source:SEPTEMBER,connections:[80,160,320,640,1280,2560],workloads:['GET','SET']},
  memory:{name:'In-memory controls',short:'10M keys',label:'10M keys · in-memory controls',date:'Sep 18, 2026',keys:'10 million',value:'1 KiB',duration:'30 seconds',hardware:'16 logical CPUs · same host',memory:'~126 GiB host RAM',description:'Redis and Valkey in-memory controls compared with Lavik’s SPDK backend on the same host.',note:'Redis and Valkey use their best measured I/O-thread configuration for the selected workload by default. AOF and automatic snapshots are disabled. Thread roles and persistence semantics differ.',source:SEPTEMBER,connections:[80,160,320,640,1280],workloads:['GET','SET']},
  august:{name:'Broader storage comparison',short:'200M keys',label:'200M keys · storage tier',date:'Aug 12, 2026 update',keys:'200 million',value:'1–4 KB',duration:'300 seconds',hardware:'Azure L16s_v3 · 2 × NVMe',memory:'Product-specific cache budgets',description:'Nine backend configurations across read, mixed, and write workloads on the August test platform.',note:'Fixed 80 connections; GET, mixed, then SET on one loaded dataset. Cache budgets, warmups, compaction, and WAL settings differ. This cohort must not be ranked against the September tests.',source:AUGUST,connections:[80],workloads:['GET','MIXED','SET']}
};
export const metricInfo = {qps:{name:'Throughput',unit:'ops/sec',direction:'Higher is better'},p99:{name:'p99 latency',unit:'ms',direction:'Lower is better'},p999:{name:'p99.9 latency',unit:'ms',direction:'Lower is better'}};
export const workloadName = {GET:'Read-only GET',SET:'Write-only SET',MIXED:'1:1 read / write'};
export function normalizeState(input={}) {
  const cohort=Object.hasOwn(cohorts,input.cohort)?input.cohort:'storage';
  const workload=cohorts[cohort].workloads.includes(input.workload)?input.workload:'GET';
  const metric=Object.hasOwn(metricInfo,input.metric)?input.metric:'qps';
  const connection=cohort==='august'?'80':cohorts[cohort].connections.includes(Number(input.connection))?String(input.connection):'peak';
  const threads=cohort==='memory'&&['1','2','4','8','16'].includes(String(input.threads))?String(input.threads):'best';
  return {cohort,workload,metric,connection,threads};
}
// Choose thread configurations by maximum throughput across the complete sweep,
// then choose peak throughput or the requested common connection count.
// Switching the displayed metric never substitutes a different measurement.
export function seriesFor(rows,state) {
  const matching=rows.filter(r=>r.cohort===state.cohort&&r.workload===state.workload);
  return [...new Set(matching.map(r=>r.system))].map(system=>{
    let points=matching.filter(r=>r.system===system);
    if (system==='redis'||system==='valkey') {
      const thread=state.threads==='best'?points.reduce((a,b)=>a.qps>b.qps?a:b).threads:Number(state.threads);
      points=points.filter(r=>r.threads===thread);
    }
    return {system,points:points.sort((a,b)=>a.connections-b.connections)};
  });
}
export function selectRows(rows,state) {
  return seriesFor(rows,state).map(({points})=>state.connection==='peak'?points.reduce((a,b)=>a.qps>b.qps?a:b):points.find(r=>r.connections===Number(state.connection))).filter(Boolean).sort((a,b)=>state.metric==='qps'?b.qps-a.qps:a[state.metric]-b[state.metric]);
}

import {readFile,writeFile,cp,mkdir,rm} from 'node:fs/promises';
import {documentHtml,homepage,methodology} from '../src/render.mjs';
import {normalizeState} from '../src/data.mjs';
const rows=JSON.parse(await readFile('public/data/results.json','utf8'));
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
await cp('public','dist',{recursive:true});
for(const file of ['styles.css','app.mjs','render.mjs','data.mjs'])await cp(`src/${file}`,`dist/${file}`);
for(const page of ['home','compare','methodology']){
 const body=page==='methodology'?methodology(rows):homepage(rows,normalizeState(),page==='compare');
 const html=documentHtml({page,body});
 const directory=page==='home'?'dist':`dist/${page}`;await mkdir(directory,{recursive:true});
 await writeFile(`${directory}/index.html`,html);
}
await writeFile('dist/404.html',documentHtml({page:'notfound',body:'<main id="main" class="not-found"><p class="eyebrow">404 / Page not found</p><h1>This page is not in the dataset.</h1><p>Explore the published benchmarks or read how they were measured.</p><a class="button primary" href="/">Back to CacheArena</a></main>'}));
console.log(`Built 3 static pages and a 404 page with ${rows.length} source measurements.`);

import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:process.env.BROWSER_SINGLE_PROCESS?['--single-process','--no-zygote']:[]});
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4173';
await mkdir('test-results',{recursive:true});
const errors=[];
const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
 await page.setViewportSize(viewport);
 if(process.env.TEST_STATIC){
  const types={'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.svg':'image/svg+xml','.csv':'text/csv'};
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());let file=path.resolve('dist','.'+url.pathname);let status=200;
   try{if((await stat(file)).isDirectory())file=path.join(file,'index.html');await stat(file);}catch{file=path.resolve('dist/404.html');status=404;}
   await route.fulfill({status,contentType:types[path.extname(file)]||'text/plain',body:await readFile(file)});
  });
 }
 await page.goto(base);await page.waitForFunction(()=>document.querySelector('#result-announcement').textContent.length>0);
 assert.equal(await page.locator('h1').count(),1);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Page overflows viewport');
 await page.screenshot({path:`test-results/home-${viewport.width}.png`,fullPage:true});
 await page.selectOption('#workload','SET');await page.selectOption('#metric','p99');
 assert.match(await page.locator('#comparison tbody tr').first().innerText(),/Garnet/);
 await page.getByRole('button',{name:'10M keys In-memory controls'}).click();await page.selectOption('#threads','4');await page.selectOption('#connection','320');
 assert.equal(await page.locator('#comparison tbody').first().locator('tr').count(),3);
 await page.getByRole('button',{name:'200M keys Broader storage comparison'}).click();await page.selectOption('#workload','MIXED');
 assert.equal(await page.locator('#comparison tbody').first().locator('tr').count(),9);
 const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();assert.match((await downloadPromise).suggestedFilename(),/august-mixed-80/);
 await page.goto(base+'/methodology');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`test-results/methodology-${viewport.width}.png`,fullPage:true});
}
await browser.close();assert.deepEqual(errors,[]);console.log('Desktop and mobile browser checks passed.');

const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
(async()=>{
 const server=spawn('python',['-m','http.server','8877','--bind','127.0.0.1','--directory','web/meteo'],{stdio:'ignore'});
 let browser;
 try{
  for(let i=0;i<50;i++){try{await fetch('http://127.0.0.1:8877/');break;}catch{await new Promise(r=>setTimeout(r,100));}}
  browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://api.ipma.pt/**',r=>r.fulfill({json:r.request().url().endsWith('stations.json')?[{properties:{idEstacao:1,localEstacao:'Estação de teste'},geometry:{coordinates:[-7,40]}}]:{[new Date().toISOString().slice(0,13)+':00']:{'1':{temperatura:20,humidade:40,intensidadeVentoKM:10,precAcumulada:0}}}}));
  await page.route('**/api/wu',r=>r.fulfill({status:503,body:'{}'}));
  await page.route('https://raw.githubusercontent.com/**',r=>r.fulfill({json:{observations:[]}}));
  await page.route('https://api.open-meteo.com/**',r=>{
   const url=new URL(r.request().url());
   if(!url.pathname.endsWith('/gfs'))return r.fulfill({status:503,body:'{}'});
   const hourly={time:['2026-10-17T20:00','2026-10-17T21:00'],surface_pressure:[930,930],cape:[null,300],convective_inhibition:[0,150]};
   for(const p of [1000,975,950,925,900,850,800,700,600,500,400,300,250,200,150,100]){
    hourly[`temperature_${p}hPa`]=[20-(1000-p)/12,19-(1000-p)/12];hourly[`dew_point_${p}hPa`]=[10-(1000-p)/12,9-(1000-p)/12];hourly[`geopotential_height_${p}hPa`]=[(1000-p)*12,(1000-p)*12];hourly[`wind_speed_${p}hPa`]=[10,12];hourly[`wind_direction_${p}hPa`]=[180,200];
   }
   return r.fulfill({json:{latitude:40,longitude:-7,elevation:600,hourly}});
  });
  await page.goto('http://127.0.0.1:8877/');
  await page.waitForFunction(()=>document.querySelector('#station').options.length===1);
  await page.locator('#sounding-panel summary').click();await page.locator('#load-sounding').click();
  await page.waitForFunction(()=>document.querySelector('#sounding-table table'));
  assert.equal(await page.locator('.fire-card').count(),4);
  assert.match(await page.locator('#fire-summary').innerText(),/Energia convectiva indisponível/);
  assert.match(await page.locator('#profile-risk-description').innerText(),/Estação de teste/);
  assert.match(await page.locator('#sounding-status').innerText(),/GFS Global/);
  assert.match(await page.locator('#sounding-metrics').innerText(),/CAPE do modelo: —/);
  assert.equal(await page.locator('#sounding-table tr').nth(1).locator('td').first().innerText(),'925.0');
  await page.locator('#sounding-hour').selectOption('1');assert.match(await page.locator('#sounding-metrics').innerText(),/300.0/);
  assert.match(await page.locator('#fire-summary').innerText(),/CAPE 300.0/);
  await page.locator('.profile-data summary').click();
  const download=page.waitForEvent('download');await page.locator('#sounding-csv').click();const d=await download;const stream=await d.createReadStream();let csv='';for await(const chunk of stream)csv+=chunk;assert.ok(csv.split('\n').length>10);assert.ok(!csv.includes('\\n'));
  await page.screenshot({path:'tephigram-mobile.png',fullPage:true});
  console.log('Overflow elements:',await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,id:e.id,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right})).slice(0,20)));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  await page.screenshot({path:'tephigram-mobile.png',fullPage:true});
  await page.setViewportSize({width:1400,height:1000});await page.screenshot({path:'tephigram-desktop.png',fullPage:true});
  console.log('Browser smoke passed: profile loading, missing CAPE, subsurface masking, hour selection, CSV and mobile layout.');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1)});

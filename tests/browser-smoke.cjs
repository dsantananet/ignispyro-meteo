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
   if((url.searchParams.get('hourly')||'').includes('boundary_layer_height')){
    const t0=Math.floor(Date.now()/3600000)*3600,time=Array.from({length:80},(_,i)=>t0+i*3600),h={time};
    for(const k of url.searchParams.get('hourly').split(','))h[k]=time.map((_,i)=>k.startsWith('temperature_950')?17:k.startsWith('temperature_900')?15:k.startsWith('temperature_850')?13:k.startsWith('temperature_700')?3:k.startsWith('temperature_500')?-15:k.startsWith('temperature')?15+(i%6):k.startsWith('relative')?40+(i%20):k.startsWith('geopotential_height_950')?520:k.startsWith('geopotential_height')?1500:k.startsWith('wind_direction')?(i*15)%360:k.startsWith('wind')?20+(i%10):k==='dew_point_2m'?8:k==='boundary_layer_height'?800:k==='cape'?(i%7)*20:0);
    return r.fulfill({json:{latitude:38.835,longitude:-8.4375,elevation:128,hourly:h}});
   }
   if(!url.pathname.endsWith('/gfs'))return r.fulfill({status:503,body:'{}'});
   const hourly={time:['2026-10-17T20:00','2026-10-17T21:00'],surface_pressure:[930,930],cape:[null,300],convective_inhibition:[0,150]};
   for(const p of [1000,975,950,925,900,850,800,700,600,500,400,300,250,200,150,100]){
    hourly[`temperature_${p}hPa`]=[20-(1000-p)/12,19-(1000-p)/12];hourly[`dew_point_${p}hPa`]=[10-(1000-p)/12,9-(1000-p)/12];hourly[`geopotential_height_${p}hPa`]=[(1000-p)*12,(1000-p)*12];hourly[`wind_speed_${p}hPa`]=[10,12];hourly[`wind_direction_${p}hPa`]=[180,200];
   }
   return r.fulfill({json:{latitude:40,longitude:-7,elevation:600,hourly}});
  });
  await page.goto('http://127.0.0.1:8877/');
  await page.waitForFunction(()=>document.querySelector('#station').options.length===1);
  await page.locator('#sounding-panel > summary').click();await page.locator('#load-sounding').click();
  await page.waitForFunction(()=>document.querySelector('#sounding-table table'));
  assert.equal(await page.locator('.fire-card').count(),4);
  assert.equal(await page.locator('#sounding-description-content section').count(),5);
  assert.match(await page.locator('#sounding-description-content').innerText(),/Haines intermédio/);
  assert.match(await page.locator('#sounding-description-content').innerText(),/CAPE indisponível/);
  assert.match(await page.locator('#fire-summary').innerText(),/Energia convectiva indisponível/);
  assert.match(await page.locator('#profile-risk-description').innerText(),/Estação de teste/);
  assert.match(await page.locator('#sounding-status').innerText(),/GFS Global/);
  assert.match(await page.locator('#sounding-metrics').innerText(),/CAPE do modelo: —/);
  await page.locator('.profile-data summary').click();
  assert.equal(await page.locator('#sounding-table tr').nth(1).locator('td').first().innerText(),'925.0');
  await page.locator('#sounding-hour').selectOption('1');assert.match(await page.locator('#sounding-metrics').innerText(),/300.0/);
  assert.match(await page.locator('#fire-summary').innerText(),/CAPE 300.0/);
  const download=page.waitForEvent('download');await page.locator('#sounding-csv').click();const d=await download;const stream=await d.createReadStream();let csv='';for await(const chunk of stream)csv+=chunk;assert.ok(csv.split('\n').length>10);assert.ok(!csv.includes('\\n'));
  // Meteograma de incêndios por ponto
  await page.locator('#fire-meteogram-panel > summary').click();
  await page.locator('#fire-lat').fill('95');await page.locator('#fire-lon').fill('-8,394');await page.locator('#fire-generate').click();
  assert.match(await page.locator('#fire-status').innerText(),/Indique latitude/);
  assert.equal(await page.locator('#fire-plot svg').count(),0);
  await page.locator('#fire-use-station').click();
  assert.equal(await page.locator('#fire-lat').inputValue(),'40');
  await page.locator('#fire-lat').fill('38,8043');await page.locator('#fire-name').fill('Cortiçadas do Lavre');await page.locator('#fire-generate').click();
  await page.waitForFunction(()=>document.querySelector('#fire-plot svg'));
  const fireText=await page.locator('#fire-plot svg').textContent();
  for(const t of ['Humidade relativa','Índice de Haines','Hot-Dry-Windy','Cortiçadas do Lavre'])assert.ok(fireText.includes(t),t);
  assert.ok(!/NaN|undefined/.test(fireText));
  assert.match(await page.locator('#fire-status').innerText(),/GFS Global via Open-Meteo/);
  assert.equal(await page.locator('#fire-svg').isDisabled(),false);
  const fireSvg=page.waitForEvent('download');await page.locator('#fire-svg').click();const fs1=await fireSvg;assert.match(fs1.suggestedFilename(),/^meteograma-incendios-.*\.svg$/);
  const fireCsv=page.waitForEvent('download');await page.locator('#fire-csv').click();const fc=await fireCsv;let fireBody='';for await(const chunk of await fc.createReadStream())fireBody+=chunk;assert.ok(fireBody.includes('GFS Global via Open-Meteo'));assert.ok(fireBody.split('\n').length>70);
  await page.screenshot({path:'tephigram-mobile.png',fullPage:true});
  console.log('Overflow elements:',await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,id:e.id,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right})).slice(0,20)));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  await page.screenshot({path:'tephigram-mobile.png',fullPage:true});
  await page.setViewportSize({width:1400,height:1000});await page.screenshot({path:'tephigram-desktop.png',fullPage:true});
  console.log('Browser smoke passed: profile loading, missing CAPE, subsurface masking, hour selection, fire meteogram by point, CSV/SVG exports and mobile layout.');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1)});

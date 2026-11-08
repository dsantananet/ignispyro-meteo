import test from 'node:test';
import assert from 'node:assert/strict';
import {fireMeteogramURL,dewPoint,vaporPressureDeficit,deadFuelMoisture,haines,hotDryWindy,buildRows,fireMeteogramSVG,fireMeteogramCSV,FIELDS} from '../web/meteo/fire-meteogram.mjs';
const near=(a,b,tol)=>assert.ok(Math.abs(a-b)<=tol,`${a} ≠ ${b} (±${tol})`);
function sample(hours=80,start=Date.UTC(2026,10,8,0)){
 const time=Array.from({length:hours},(_,i)=>start/1000+i*3600),h={time};
 for(const k of FIELDS)h[k]=time.map((_,i)=>k.startsWith('temperature_950')?17:k.startsWith('temperature_900')?15:k.startsWith('temperature_850')?13:k.startsWith('temperature_700')?3:k.startsWith('temperature_500')?-15:k.startsWith('temperature')?15+(i%6):k.startsWith('relative')?40+(i%20):k.startsWith('geopotential_height_950')?520:k.startsWith('geopotential_height')?1500:k.startsWith('wind_direction')?(i*15)%360:k.startsWith('wind')?20+(i%10):k==='dew_point_2m'?8:k==='boundary_layer_height'?800:k==='cape'?(i%7)*20:k==='precipitation'?(i%11===0?0.4:0):0);
 return {latitude:38.835,longitude:-8.4375,elevation:128,hourly:h};
}
test('URL pede GFS com níveis 950 e 900 hPa e rejeita coordenadas inválidas',()=>{
 const u=new URL(fireMeteogramURL(38.8043,-8.394));
 assert.equal(u.hostname,'api.open-meteo.com');assert.equal(u.searchParams.get('models'),'gfs_global');
 const hourly=u.searchParams.get('hourly').split(',');
 for(const k of ['temperature_950hPa','relative_humidity_900hPa','wind_speed_950hPa','boundary_layer_height','cape'])assert.ok(hourly.includes(k),k);
 for(const [a,b] of [[91,0],[0,181],[NaN,0],[0,Infinity],[null,1]])assert.throws(()=>fireMeteogramURL(a,b),/Coordenadas/);
});
test('ponto de orvalho, VPD e humidade de equilíbrio têm valores físicos conhecidos',()=>{
 near(dewPoint(20,50),9.3,0.2);near(dewPoint(15,100),15,0.01);assert.equal(dewPoint(20,0),null);assert.equal(dewPoint(null,50),null);
 near(vaporPressureDeficit(30,30),29.7,0.5);assert.equal(vaporPressureDeficit(20,120),null);
 near(deadFuelMoisture(15,70),13.06,0.05);   // ramo HR≥50
 near(deadFuelMoisture(30,30),5.76,0.01);      // ramo 10≤HR<50
 assert.ok(deadFuelMoisture(30,5)<3);        // ramo HR<10
 assert.equal(deadFuelMoisture(20,undefined),null);
});
test('Índice de Haines escolhe a variante pela altitude e respeita limiares',()=>{
 const r={temperature_950hPa:20,temperature_850hPa:11,relative_humidity_850hPa:20,temperature_700hPa:0,temperature_500hPa:-20,relative_humidity_700hPa:20};
 assert.deepEqual(haines(r,100),{value:6,variant:'baixa'});
 assert.equal(haines({...r,temperature_950hPa:13,temperature_850hPa:11,relative_humidity_850hPa:90},100).value,2);
 assert.equal(haines(r,500).variant,'média');assert.equal(haines(r,1256).variant,'alta');
 assert.equal(haines({...r,temperature_850hPa:null},100),null);assert.equal(haines(r,null),null);
});
test('Hot-Dry-Windy usa o máximo de VPD × máximo de vento e só inclui 950 hPa dentro de 500 m AGL',()=>{
 const base={temperature_2m:30,relative_humidity_2m:30,wind_speed_10m:18,temperature_950hPa:25,relative_humidity_950hPa:20,wind_speed_950hPa:36,geopotential_height_950hPa:520};
 const expected=Math.max(vaporPressureDeficit(30,30),vaporPressureDeficit(25,20))*36/3.6;
 near(hotDryWindy(base,128),expected,1e-9);
 near(hotDryWindy({...base,geopotential_height_950hPa:900},128),vaporPressureDeficit(30,30)*18/3.6,1e-9);
 assert.equal(hotDryWindy({},128),null);
});
test('buildRows começa na hora corrente, limita a 72 h e preserva ausentes como null',()=>{
 const data=sample(),now=Date.UTC(2026,10,8,5,30);
 const rows=buildRows(data,{now});
 assert.equal(rows.length,72);assert.equal(new Date(rows[0].time).toISOString(),'2026-11-08T05:00:00.000Z');
 assert.ok(rows.every(r=>Number.isFinite(r.emc)&&Number.isFinite(r.hdw)&&Number.isFinite(r.haines)));
 data.hourly.boundary_layer_height=data.hourly.time.map(()=>null);
 assert.ok(buildRows(data,{now}).every(r=>r.boundary_layer_height===null));
 assert.throws(()=>buildRows({hourly:{}}),/horas válidas/);
 assert.throws(()=>buildRows(data,{now:Date.UTC(2030,0,1)}),/futuras/);
});
test('SVG contém todos os painéis, sem NaN, escapa o nome e marca painéis indisponíveis',()=>{
 const data=sample(),now=Date.UTC(2026,10,8,0);
 const rows=buildRows(data,{now}),meta={name:'<b>"Teste"&</b>',lat:38.8043,lon:-8.394,gridLat:38.835,gridLon:-8.4375,elevation:128,queried:'2026-11-08 22:00 UTC'};
 const svg=fireMeteogramSVG(rows,meta);
 for(const t of ['Humidade relativa','Temperatura','Precipitação','Vento','Direção do vento','Índice de Haines','camada limite','CAPE','Hot-Dry-Windy'])assert.ok(svg.includes(t),t);
 assert.ok(!/NaN|undefined|Infinity/.test(svg));assert.ok(!svg.includes('<b>"Teste"'));assert.ok(svg.includes('&lt;b&gt;&quot;Teste&quot;&amp;&lt;/b&gt;'));
 assert.ok(!svg.includes('Indisponível nesta fonte'));
 for(const row of rows){row.boundary_layer_height=null;row.cape=null;}
 const partial=fireMeteogramSVG(rows,meta);assert.equal(partial.match(/Indisponível nesta fonte/g).length,2);assert.ok(!/NaN|undefined|Infinity/.test(partial));
});
test('CSV tem metadados de proveniência, cabeçalho e uma linha por hora',()=>{
 const rows=buildRows(sample(),{now:Date.UTC(2026,10,8,0)}),csv=fireMeteogramCSV(rows,{name:'P',lat:1,lon:2,gridLat:1.1,gridLon:2.1,elevation:128,queried:'x'});
 const lines=csv.split('\r\n');assert.ok(lines[0].startsWith('﻿# ponto=P; lat=1; lon=2'));assert.ok(lines[0].includes('GFS Global via Open-Meteo'));
 assert.ok(lines[1].startsWith('hora_UTC;temperature_2m'));assert.equal(lines.length,2+rows.length);
});

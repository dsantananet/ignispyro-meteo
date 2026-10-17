import test from 'node:test';
import assert from 'node:assert/strict';
import {coordinates,profileURL,profileAt,inversions,tephigram,distanceKm} from '../web/meteo/sounding.mjs';
test('tephigram isotherms and dry adiabats are orthogonal in T-entropy coordinates',()=>{
 const a=coordinates(0,1000),b=coordinates(0,500);
 assert.ok(Math.abs(a.x)<1e-10&&Math.abs(a.y)<1e-10);
 assert.ok(Math.abs((b.x-a.x)-(b.y-a.y))<1e-10);
 const c=coordinates(300*Math.pow(850/1000,287.05/1004)-273.15,850),d=coordinates(300*Math.pow(500/1000,287.05/1004)-273.15,500);
 assert.ok(Math.abs((c.x-d.x)+(c.y-d.y))<1e-10);
});
test('subsurface levels and absent CAPE are never displayed as valid zero',()=>{
 const p=profileAt({hourly:{time:['2026-10-17T12:00'],surface_pressure:[920],cape:[null],convective_inhibition:[0],temperature_900hPa:[15]}},0);
 assert.ok(p.profile.every(x=>x.p<=920));assert.equal(p.cape,null);assert.equal(p.cin,0);
 assert.throws(()=>profileAt({hourly:{time:['x'],surface_pressure:[null]}},0));
});
test('inversions require adjacent valid ascending levels',()=>{
 assert.equal(inversions([{t:10,z:100},{t:12,z:300}]).length,1);
 assert.equal(inversions([{t:10,z:100},{t:null,z:200},{t:12,z:300}]).length,0);
});
test('request pins GFS and explicitly requests pressure levels and UTC',()=>{
 const url=new URL(profileURL(40,-7));assert.equal(url.searchParams.get('models'),'gfs_global');assert.equal(url.searchParams.get('timezone'),'UTC');assert.ok(url.searchParams.get('hourly').includes('dew_point_850hPa'));assert.throws(()=>profileURL(NaN,0));
});
test('plot breaks temperature line at missing data and coordinates have known distance',()=>{
 const svg=tephigram([{p:1000,t:20,td:15},{p:925,t:null,td:null},{p:850,t:10,td:5}]);assert.ok(!svg.includes('stroke="#ff946d" stroke-width="3"'));assert.ok(Math.abs(distanceKm(0,0,1,0)-111.195)<.01);
});

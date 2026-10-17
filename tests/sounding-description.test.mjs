import test from 'node:test';
import assert from 'node:assert/strict';
import {hainesMid,soundingDescription} from '../web/meteo/sounding-description.mjs';
const profile=(t=27,td=-1,upper=13)=>[{p:850,t,td,z:1500},{p:700,t:upper,td:-10,z:3000}];
test('reproduces Black Saturday example supplied in Haines slides 22–24',()=>{
 const h=hainesMid(profile());assert.equal(h.value,6);assert.equal(h.A,3);assert.equal(h.B,3);assert.ok(Math.abs(h.continuous-11.6666666667)<1e-8);
});
test('C-Haines limits moisture deficit at 30 then halves CB slope above five',()=>{
 const h=hainesMid(profile(27,-30,13));assert.equal(h.deficit,57);assert.equal(h.cb,7);assert.equal(h.continuous,12);
 const edge=hainesMid(profile(20,2,10));assert.equal(edge.cb,5);
});
test('missing/subsurface 850 or invalid dewpoint disables both indices',()=>{
 assert.equal(hainesMid([{p:700,t:10}]),null);assert.equal(hainesMid(profile(20,21,10)),null);assert.equal(hainesMid(profile(null,0,10)),null);
});
test('discrete score uses documented nearest-degree rounding, C-Haines preserves raw inputs',()=>{
 const a=hainesMid(profile(20,14.51,14.51)),b=hainesMid(profile(20,14.5,14.5));assert.equal(a.value,2);assert.equal(b.value,4);assert.notEqual(a.continuous,b.continuous);
});
test('exercise profile gives Haines 4 and C-Haines 2.5',()=>{
 const h=hainesMid(profile(2,-4,-5));assert.equal(h.value,4);assert.equal(h.continuous,2.5);
});
test('missing values do not invent lapse rate, parcel levels or inversion',()=>{
 const d=soundingDescription({time:'2026-10-17T21:00',profile:[],cape:null,cin:null},null);assert.equal(d.haines,null);assert.equal(d.paragraphs.length,5);assert.match(d.paragraphs[1].text,/não é calculado/);assert.match(d.paragraphs[3].text,/não se localizam LCL/);assert.match(d.paragraphs[4].text,/cobertura suficiente/);
});
test('environmental lapse rate is calculated with geopotential heights',()=>{
 const d=soundingDescription({time:'x',profile:profile(20,10,5),cape:0,cin:0},500);assert.match(d.paragraphs[1].text,/10.0 °C por quilómetro/);
});

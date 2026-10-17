import test from 'node:test';
import assert from 'node:assert/strict';
import {interpretFireProfile} from '../web/meteo/fire-profile.mjs';
test('missing values remain unavailable and never generate a reassuring danger class',()=>{
 const r=interpretFireProfile({time:'2026-10-17T21:00',profile:[],cape:null,cin:null},null);
 assert.match(r.cards[0].value,/indisponível/);assert.match(r.cards[1].value,/indisponível/);assert.match(r.cards[3].value,/indisponível/);assert.match(r.limit,/não atribui uma classe/);
});
test('zero CAPE does not imply no fire convection',()=>{
 const r=interpretFireProfile({time:'x',profile:[],cape:0,cin:0},0);assert.match(r.cards[0].text,/convecção própria/);assert.match(r.cards[0].text,/não significa ausência/);
});
test('diagnostics use only valid humidity pairs and winds within 3 km AGL',()=>{
 const r=interpretFireProfile({time:'x',cape:500,cin:150,profile:[{p:925,z:700,t:20,td:10,wind:20,direction:180},{p:850,z:1500,t:18,td:4,wind:40,direction:240},{p:700,z:3100,t:10,td:20,wind:60},{p:300,z:9000,t:-40,td:-60,wind:200}]},500);
 assert.match(r.cards[1].value,/14.0/);assert.match(r.cards[3].value,/60.0/);assert.match(r.cards[2].value,/Sem inversão/);
});
test('an inversion is described without predicting its break time',()=>{
 const r=interpretFireProfile({time:'x',profile:[{p:925,z:700,t:15,td:10},{p:850,z:1500,t:18,td:4}]},500);assert.match(r.cards[2].value,/1 camada/);assert.match(r.cards[2].detail,/não é calculada/);
});
test('missing level never bridges an inversion',()=>{
 const r=interpretFireProfile({time:'x',profile:[{p:925,z:700,t:15},{p:900,z:1000,t:null},{p:850,z:1500,t:18}]},500);assert.match(r.cards[2].value,/Sem inversão/);
});

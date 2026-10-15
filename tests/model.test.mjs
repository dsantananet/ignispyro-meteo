import test from 'node:test';
import assert from 'node:assert/strict';
import {modelRows,riskSummary} from '../web/meteo/model.mjs';
test('model time is UTC and missing data remains missing',()=>{
 const rows=modelRows({hourly:{time:[0,3600],temperature_2m:[0,null]}});
 assert.equal(rows[0].time,'1970-01-01T00:00:00.000Z');assert.equal(rows[0].temperature,0);assert.equal(rows[1].temperature,null);assert.equal(rows[0].rain,null);
});
test('missing humidity is not diagnosed as dry; insufficient coverage is explicit',()=>{
 const text=riskSummary({name:'Test',id:'T'},[{time:'1970-01-01T01:00:00Z',temperature:31,humidity:null,wind:21,rain:null}],0);
 assert.ok(!text.includes('coincidentes'));assert.ok(text.includes('Cobertura incompleta'));
});
test('risk uses future 24 hours, not older model values',()=>{
 const text=riskSummary({name:'Test',id:'T'},[{time:'1970-01-01T00:00:00Z',temperature:40,humidity:10,wind:50,rain:20}],3600000);
 assert.ok(!text.includes('Atenção:'));assert.ok(text.includes('indisponível'));
});

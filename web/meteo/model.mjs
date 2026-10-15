export const variables={temperature:['temperature_2m','Temperatura','°C'],humidity:['relative_humidity_2m','Humidade','%'],wind:['wind_speed_10m','Vento','km/h'],gust:['wind_gusts_10m','Rajada','km/h'],rain:['precipitation','Chuva horária','mm'],pressure:['pressure_msl','Pressão ao nível do mar','hPa'],cloud:['cloud_cover','Nebulosidade','%'],dewpoint:['dew_point_2m','Ponto de orvalho','°C']};
export function modelRows(data){
  if(!Array.isArray(data?.hourly?.time))throw Error('Previsão sem horas válidas');
  return data.hourly.time.map((t,i)=>Object.fromEntries([['time',new Date(t*1000).toISOString()],...Object.entries(variables).map(([k,[v]])=>[k,Number.isFinite(data.hourly[v]?.[i])?data.hourly[v][i]:null])]));
}
const cache=new Map();
export function lisboa(time){return new Intl.DateTimeFormat('pt-PT',{timeZone:'Europe/Lisbon',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(time));}
export function bulletin(station,rows,now=Date.now()){
  const future=rows.filter(r=>Date.parse(r.time)>now&&Date.parse(r.time)<=now+24*3600000);
  const values=k=>future.map(r=>r[k]).filter(Number.isFinite),fmt=v=>Number.isFinite(v)?v.toFixed(1).replace('.',','):'indisponível';
  const extremum=(k,fn)=>values(k).length?fn(...values(k)):null;
  const maxT=extremum('temperature',Math.max),minH=extremum('humidity',Math.min),maxW=extremum('wind',Math.max),maxG=extremum('gust',Math.max);
  const strongest=future.find(r=>r.wind!==null&&r.wind===maxW);
  const rain=values('rain'),rainText=rain.length<24?'A cobertura de precipitação está incompleta.':rain.every(v=>v===0)?'Não está prevista precipitação nas próximas 24 horas.':`Precipitação prevista acumulada: ${fmt(rain.reduce((a,b)=>a+b,0))} mm nas próximas 24 horas.`;
  const attention=future.filter(r=>r.temperature>=30&&r.humidity!==null&&r.humidity<=30&&r.wind>=20);
  const groups=[];for(const r of attention){const last=groups.at(-1);if(last&&Date.parse(r.time)-Date.parse(last.end)===3600000)last.end=r.time;else groups.push({start:r.time,end:r.time});}
  const periods=groups.map(g=>g.start===g.end?lisboa(g.start):`${lisboa(g.start)}–${lisboa(g.end)}`).join('; ');
  const observed=station.time?`Observação ${lisboa(station.time.endsWith('Z')?station.time:station.time+'Z')}: ${fmt(station.temperature)} °C; HR ${fmt(station.humidity)}%; vento ${fmt(station.wind)} km/h. ${now-Date.parse(station.time.endsWith('Z')?station.time:station.time+'Z')>7200000?'Registo desatualizado.':''}`:'Sem observação disponível.';
  return `IGNISPYRO · ${station.name.toLocaleUpperCase('pt-PT')}\nMeteorologia · ${lisboa(now)} · Hora de Lisboa\nEstação ${station.id}\n\n${observed}\n\nA previsão ECMWF/Open-Meteo para ${future.length?lisboa(future[0].time)+'–'+lisboa(future.at(-1).time):'o período solicitado'} indica temperatura máxima de ${fmt(maxT)} °C, humidade relativa mínima de ${fmt(minH)}% e vento até ${fmt(maxW)} km/h, com rajadas até ${fmt(maxG)} km/h.${strongest?' O máximo de vento ocorre em '+lisboa(strongest.time)+'.':''}\n\n${rainText}\n\n${periods?'Atenção meteorológica por coincidência de calor (≥30 °C), secura (HR ≤30%) e vento (≥20 km/h): '+periods+'.':'Não se identifica coincidência dos limiares de calor, secura e vento nos dados disponíveis; isto não significa ausência de perigo.'} Não é classe oficial de perigo.\n\nFWI, HDW, humidade dos combustíveis, camada limite e vento em altitude: indisponíveis nesta integração. Sem dados de ocorrências associados.\nFontes: ${station.source||'estação'}, ECMWF/Open-Meteo. Valores locais, não médias distritais. Apoio à análise de incêndios; considerar combustíveis, relevo e observação no terreno. Consulta do modelo identificada no painel.`;
}
export async function loadModels(stations,onProgress=()=>{}){
  const result=new Map(), pending=[];
  for(const s of stations){const key=`${s.id}:${s.lat}:${s.lon}`,c=cache.get(key);if(c&&Date.now()-c.at<3600000)result.set(s.id,c);else pending.push(s);}
  for(let i=0;i<pending.length;i+=20){
    const batch=pending.slice(i,i+20),q=new URLSearchParams({latitude:batch.map(s=>s.lat).join(','),longitude:batch.map(s=>s.lon).join(','),hourly:Object.values(variables).map(v=>v[0]).join(','),timeformat:'unixtime',timezone:'UTC',past_days:'1',forecast_days:'4',wind_speed_unit:'kmh'});
    const response=await fetch('https://api.open-meteo.com/v1/ecmwf?'+q,{signal:AbortSignal.timeout(45000)});
    if(!response.ok)throw Error(`Modelo indisponível (HTTP ${response.status})`);
    const raw=await response.json(),data=Array.isArray(raw)?raw:[raw];
    if(data.length!==batch.length)throw Error('Resposta incompleta do modelo');
    batch.forEach((s,j)=>{const c={at:Date.now(),rows:modelRows(data[j])};cache.set(`${s.id}:${s.lat}:${s.lon}`,c);result.set(s.id,c);});onProgress(result.size,stations.length);
  }
  return result;
}
export function riskSummary(station,rows,now=Date.now()){
  const future=rows.filter(r=>Date.parse(r.time)>now&&Date.parse(r.time)<=now+24*3600000);
  const valid=key=>future.map(r=>r[key]).filter(Number.isFinite),range=key=>{const a=valid(key);return a.length?`${Math.min(...a).toFixed(1)}–${Math.max(...a).toFixed(1)}`:'indisponível';};
  const flags=[];
  if(future.some(r=>r.temperature!==null&&r.temperature>=35))flags.push('calor ≥35 °C');
  if(future.some(r=>r.temperature!==null&&r.temperature<=0))flags.push('temperatura ≤0 °C');
  if(future.some(r=>r.wind!==null&&r.wind>=30))flags.push('vento ≥30 km/h');
  if(future.some(r=>r.rain!==null&&r.rain>=10))flags.push('chuva ≥10 mm/h');
  if(future.some(r=>r.temperature>=30&&r.humidity!==null&&r.humidity<=30&&r.wind>=20))flags.push('calor, secura e vento coincidentes');
  const complete=future.length>=24&&['temperature','humidity','wind','rain'].every(k=>valid(k).length>=24);
  const dryWind=future.filter(r=>r.temperature>=30&&r.humidity!==null&&r.humidity<=30&&r.wind>=20);
  const windows=dryWind.map(r=>r.time.slice(11,16)).join(', ');
  const fmt=v=>Number.isFinite(v)?v.toFixed(1):'sem dados';
  return `📍 ${station.name} · ${station.id}\nOBSERVADO · ${station.time||'hora indisponível'}: ${fmt(station.temperature)} °C; HR ${fmt(station.humidity)}%; vento ${fmt(station.wind)} km/h.${station.time&&now-Date.parse(station.time.endsWith('Z')?station.time:station.time+'Z')>7200000?' Observação desatualizada.':''}\nPREVISÃO · próximas 24 h: temperatura ${range('temperature')} °C; humidade ${range('humidity')}%; vento ${range('wind')} km/h; rajadas ${range('gust')} km/h.\n${flags.length?'⚠ Atenção: '+flags.join('; '):'Nenhum dos limiares indicativos acionado nos dados disponíveis.'}${complete?'':' Cobertura incompleta.'}${windows?'\nHoras de calor + secura + vento (UTC): '+windows+'.':''}\nAnálise de incêndios: considerar combustível, relevo e condições no terreno; estes dados não calculam propagação nem risco oficial.`;
}

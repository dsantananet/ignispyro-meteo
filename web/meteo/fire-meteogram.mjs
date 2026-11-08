// Meteograma de incêndios para um ponto: GFS (Open-Meteo), variáveis derivadas e gráfico SVG.
// Produtos MODELADOS e ESTIMADOS; nenhum valor aqui é observação nem classe oficial de perigo.
const valid=v=>typeof v==='number'&&Number.isFinite(v);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const PRESSURE_LEVELS=[950,900,850,700,500];
const SURFACE=['temperature_2m','relative_humidity_2m','dew_point_2m','precipitation','wind_speed_10m','wind_direction_10m','wind_gusts_10m','cape','boundary_layer_height'];
const LEVEL_FIELDS=PRESSURE_LEVELS.flatMap(p=>[`temperature_${p}hPa`,`relative_humidity_${p}hPa`,`geopotential_height_${p}hPa`]).concat([950,900].flatMap(p=>[`wind_speed_${p}hPa`,`wind_direction_${p}hPa`]));
export const FIELDS=[...SURFACE,...LEVEL_FIELDS];

export function fireMeteogramURL(lat,lon){
  if(!valid(lat)||!valid(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw Error('Coordenadas inválidas');
  return 'https://api.open-meteo.com/v1/gfs?'+new URLSearchParams({latitude:lat,longitude:lon,models:'gfs_global',hourly:FIELDS.join(','),forecast_days:4,timeformat:'unixtime',timezone:'UTC',wind_speed_unit:'kmh'});
}

// Magnus (hPa, °C).
export const saturationVapour=t=>6.1094*Math.exp(17.625*t/(t+243.04));
export function dewPoint(t,rh){
  if(!valid(t)||!valid(rh)||rh<=0||rh>100)return null;
  const g=Math.log(rh/100)+17.625*t/(t+243.04);return 243.04*g/(17.625-g);
}
export function vaporPressureDeficit(t,rh){
  if(!valid(t)||!valid(rh)||rh<0||rh>100)return null;
  return saturationVapour(t)*(1-rh/100);
}
// Teor de humidade de equilíbrio do combustível morto fino (Simard, 1968; T em °F). Estimativa, não medição.
export function deadFuelMoisture(t,rh){
  if(!valid(t)||!valid(rh)||rh<0||rh>100)return null;
  const f=t*9/5+32;
  if(rh<10)return 0.03229+0.281073*rh-0.000578*rh*f;
  if(rh<50)return 2.22749+0.160107*rh-0.01478*f;
  return 21.0606+0.005565*rh*rh-0.00035*rh*f-0.483199*rh;
}
const bin=(x,a,b)=>x<a?1:x<b?2:3;
// Índice de Haines (NWS). Variante escolhida pela altitude do ponto: baixa <305 m, média 305–915 m, alta >915 m.
export function haines(r,elevation){
  const dew=p=>dewPoint(r[`temperature_${p}hPa`],r[`relative_humidity_${p}hPa`]),t=p=>r[`temperature_${p}hPa`];
  let variant,a,b;
  if(!valid(elevation))return null;
  if(elevation<305){variant='baixa';if(![t(950),t(850),dew(850)].every(valid))return null;a=bin(t(950)-t(850),4,8);b=bin(t(850)-dew(850),6,10);}
  else if(elevation<=915){variant='média';if(![t(850),t(700),dew(850)].every(valid))return null;a=bin(t(850)-t(700),6,11);b=bin(t(850)-dew(850),6,13);}
  else{variant='alta';if(![t(700),t(500),dew(700)].every(valid))return null;a=bin(t(700)-t(500),18,22);b=bin(t(700)-dew(700),15,20);}
  return {value:a+b,variant};
}
// Hot-Dry-Windy (Srock et al., 2018): máx(VPD) × máx(vento) nos primeiros 500 m AGL.
// Aproximação: apenas 2 m/10 m e, se estiver nos 500 m AGL, o nível de 950 hPa (a fonte não dá todos os níveis do modelo).
export function hotDryWindy(r,elevation){
  const layers=[{t:r.temperature_2m,rh:r.relative_humidity_2m,w:r.wind_speed_10m}];
  if(valid(elevation)&&valid(r.geopotential_height_950hPa)){const agl=r.geopotential_height_950hPa-elevation;if(agl>0&&agl<=500)layers.push({t:r.temperature_950hPa,rh:r.relative_humidity_950hPa,w:r.wind_speed_950hPa});}
  const vpds=layers.map(l=>vaporPressureDeficit(l.t,l.rh)).filter(valid),winds=layers.map(l=>l.w).filter(valid);
  if(!vpds.length||!winds.length)return null;
  return Math.max(...vpds)*Math.max(...winds)/3.6;
}
function derive(r,elevation){
  const level=p=>dewPoint(r[`temperature_${p}hPa`],r[`relative_humidity_${p}hPa`]);
  const h=haines(r,elevation);
  return {...r,td_950:level(950),td_900:level(900),depression:valid(r.temperature_2m)&&valid(r.dew_point_2m)?r.temperature_2m-r.dew_point_2m:null,emc:deadFuelMoisture(r.temperature_2m,r.relative_humidity_2m),haines:h?h.value:null,hainesVariant:h?h.variant:null,hdw:hotDryWindy(r,elevation)};
}
// Linhas horárias a partir da resposta Open-Meteo, começando na hora corrente.
export function buildRows(data,{count=72,now=Date.now()}={}){
  const h=data?.hourly;
  if(!Array.isArray(h?.time))throw Error('Resposta sem horas válidas');
  const elevation=valid(data.elevation)?data.elevation:null;
  const rows=h.time.map((t,i)=>{const r={time:t*1000};for(const k of FIELDS)r[k]=valid(h[k]?.[i])?h[k][i]:null;return r;}).filter(r=>r.time>=Math.floor(now/3600000)*3600000).slice(0,count);
  if(!rows.length)throw Error('Sem horas de previsão futuras');
  return rows.map(r=>derive(r,elevation));
}
export function fireMeteogramCSV(rows,meta={}){
  const cols=['temperature_2m','relative_humidity_2m','dew_point_2m','depression','precipitation','wind_speed_10m','wind_gusts_10m','wind_direction_10m','temperature_950hPa','relative_humidity_950hPa','wind_speed_950hPa','wind_direction_950hPa','temperature_900hPa','relative_humidity_900hPa','wind_speed_900hPa','wind_direction_900hPa','emc','haines','hdw','boundary_layer_height','cape'];
  const head=`# ponto=${meta.name||''}; lat=${meta.lat}; lon=${meta.lon}; grelha_lat=${meta.gridLat??''}; grelha_lon=${meta.gridLon??''}; altitude_modelo_m=${meta.elevation??''}; modelo=GFS Global via Open-Meteo; consulta_UTC=${meta.queried||''}\r\n`;
  return '﻿'+head+['hora_UTC',...cols].join(';')+'\r\n'+rows.map(r=>[new Date(r.time).toISOString(),...cols.map(c=>r[c]===null||r[c]===undefined?'':Number.isInteger(r[c])?r[c]:r[c].toFixed(2))].join(';')).join('\r\n');
}

const W=960,L=58,R=18,PW=W-L-R,PH=118,GAP=60,TOP=98;
function niceRange(lo,hi,ticks=4){
  if(lo===hi){lo-=1;hi+=1;}
  const raw=(hi-lo)/ticks,mag=10**Math.floor(Math.log10(raw)),step=[1,2,2.5,5,10].map(m=>m*mag).find(s=>s>=raw);
  const a=Math.floor(lo/step)*step,b=Math.ceil(hi/step)*step,out=[];
  for(let v=a;v<=b+step/1000;v+=step)out.push(+v.toFixed(6));
  return {lo:a,hi:b,ticks:out};
}
const num=v=>v.toFixed(1);
export function fireMeteogramSVG(rows,meta={}){
  const n=rows.length,x=i=>L+(n>1?i/(n-1):0.5)*PW;
  const series=(key)=>rows.map((r,i)=>valid(r[key])?{i,v:r[key]}:null);
  const path=(pts,y)=>{let d='',pen=false;for(const p of pts){if(!p){pen=false;continue;}d+=`${pen?'L':'M'}${num(x(p.i))},${num(y(p.v))} `;pen=true;}return d.trim();};
  let top=TOP;
  const parts=[];
  const dayLabels=()=>rows.map((r,i)=>{const d=new Date(r.time),hr=d.getUTCHours();return {i,hr,day:d};});
  const frame=(title,y0,range,fmtTick=v=>String(v))=>{
    const y=v=>y0+PH-(v-range.lo)/(range.hi-range.lo)*PH;
    let g=`<text x="${L}" y="${y0-22}" class="t">${escape(title)}</text>`;
    for(const t of range.ticks)g+=`<line x1="${L}" x2="${W-R}" y1="${num(y(t))}" y2="${num(y(t))}" stroke="#e3e3e3"/><text x="${L-6}" y="${num(y(t)+4)}" text-anchor="end" class="a">${escape(fmtTick(t))}</text>`;
    for(const {i,hr,day} of dayLabels()){if(hr%2===0){const major=hr===0;g+=`<line x1="${num(x(i))}" x2="${num(x(i))}" y1="${y0}" y2="${y0+PH}" stroke="${major?'#b8b8b8':'#efefef'}"/><text x="${num(x(i))}" y="${y0+PH+13}" text-anchor="middle" class="a">${String(hr).padStart(2,'0')} h</text>`;if(major)g+=`<text x="${num(x(i))}" y="${y0+PH+25}" text-anchor="middle" class="a b">${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][day.getUTCDay()]} ${String(day.getUTCDate()).padStart(2,'0')}</text>`;}}
    g+=`<rect x="${L}" y="${y0}" width="${PW}" height="${PH}" fill="none" stroke="#777"/>`;
    return {y,g};
  };
  const legend=(items)=>items.map(([label,color],k)=>`<tspan fill="${color}" dx="${k?14:0}">▬ ${escape(label)}</tspan>`).join('');
  const lines=(y0,title,defs,{min,max,fmtTick,legendItems}={})=>{
    const all=defs.flatMap(d=>series(d.key)).filter(Boolean).map(p=>p.v);
    if(!all.length){parts.push(unavailable(y0,title));return;}
    const range=niceRange(min??Math.min(...all),max??Math.max(...all)),f=frame(title,y0,range,fmtTick);
    let g=f.g;for(const d of defs)g+=`<path d="${path(series(d.key),f.y)}" fill="none" stroke="${d.color}" stroke-width="${d.width||1.6}"${d.dash?` stroke-dasharray="${d.dash}"`:''}/>`;
    g+=`<text x="${L}" y="${y0-8}" class="l">${legend(legendItems||defs.map(d=>[d.label,d.color]))}</text>`;
    parts.push(g);
  };
  const bars=(y0,title,key,color,{min=0,fixedMax,fmtTick,note}={})=>{
    const vals=series(key).filter(Boolean).map(p=>p.v);
    if(!vals.length){parts.push(unavailable(y0,title));return;}
    const range=niceRange(min,Math.max(fixedMax??0,...vals,1e-9)),f=frame(title,y0,range,fmtTick),bw=Math.max(1.5,PW/n*0.7);
    let g=f.g;for(const p of series(key).filter(Boolean)){const ytop=f.y(p.v),h=f.y(range.lo)-ytop;if(h>0)g+=`<rect x="${num(x(p.i)-bw/2)}" y="${num(ytop)}" width="${num(bw)}" height="${num(h)}" fill="${color}"/>`;}
    if(note)g+=`<text x="${L}" y="${y0-8}" class="s">${escape(note)}</text>`;
    parts.push(g);
  };
  const unavailable=(y0,title)=>`<text x="${L}" y="${y0-22}" class="t">${escape(title)}</text><rect x="${L}" y="${y0}" width="${PW}" height="${PH}" fill="#fafafa" stroke="#999" stroke-dasharray="4 3"/><text x="${L+PW/2}" y="${y0+PH/2+4}" text-anchor="middle" class="a">Indisponível nesta fonte para este ponto</text>`;
  const slot=()=>{const y0=top;top+=PH+GAP;return y0;};

  lines(slot(),'GFS · Humidade relativa (%) · 2 m / 950 hPa / 900 hPa',[{key:'relative_humidity_2m',color:'#111',label:'2 m',width:2},{key:'relative_humidity_950hPa',color:'#d62728',label:'950 hPa'},{key:'relative_humidity_900hPa',color:'#1f4fd6',label:'900 hPa'}],{min:0,max:100});
  lines(slot(),'GFS · Temperatura (°C)',[{key:'temperature_2m',color:'#111',label:'2 m',width:2},{key:'temperature_950hPa',color:'#d62728',label:'950 hPa'},{key:'temperature_900hPa',color:'#1f4fd6',label:'900 hPa'},{key:'dew_point_2m',color:'#1a9e3f',label:'Td 2 m'},{key:'depression',color:'#c01fb7',label:'T−Td 2 m'}]);
  bars(slot(),'GFS · Precipitação (mm/h)','precipitation','#2a7fd4',{fixedMax:1,fmtTick:v=>String(+v.toFixed(2))});
  lines(slot(),'GFS · Vento (km/h) · 10 m / 950 hPa / 900 hPa',[{key:'wind_speed_10m',color:'#111',label:'10 m',width:2},{key:'wind_speed_950hPa',color:'#d62728',label:'950 hPa'},{key:'wind_speed_900hPa',color:'#1f4fd6',label:'900 hPa'},{key:'wind_gusts_10m',color:'#c01fb7',label:'Rajada 10 m'}],{min:0});
  { // direção do vento: seta aponta para onde o vento sopra
    const y0=slot(),rowsDef=[['wind_direction_10m','#111','10 m'],['wind_direction_950hPa','#d62728','950 hPa'],['wind_direction_900hPa','#1f4fd6','900 hPa']];
    if(!rowsDef.some(([k])=>rows.some(r=>valid(r[k]))))parts.push(unavailable(y0,'GFS · Direção do vento'));
    else{
      let g=`<text x="${L}" y="${y0-22}" class="t">GFS · Direção do vento (setas: para onde o vento sopra)</text><text x="${L}" y="${y0-8}" class="s">Uma seta a cada 3 h · preto 10 m · vermelho 950 hPa · azul 900 hPa</text><rect x="${L}" y="${y0}" width="${PW}" height="${PH}" fill="none" stroke="#777"/>`;
      rowsDef.forEach(([k,c,label],row)=>{const cy=y0+PH*(row+0.5)/3;g+=`<text x="${L-6}" y="${num(cy+4)}" text-anchor="end" class="a" fill="${c}">${label}</text>`;rows.forEach((r,i)=>{if(i%3!==1||!valid(r[k]))return;g+=`<g transform="translate(${num(x(i))},${num(cy)}) rotate(${(r[k]+180)%360})" stroke="${c}" stroke-width="1.4" fill="none"><path d="M0,9 L0,-9 M-3.5,-4 L0,-9 L3.5,-4"/></g>`;});});
      for(const {i,hr} of dayLabels())if(hr%6===0)g+=`<text x="${num(x(i))}" y="${y0+PH+13}" text-anchor="middle" class="a">${String(hr).padStart(2,'0')} h</text>`;
      parts.push(g);
    }
  }
  { // EMC + Haines
    const y0=slot(),emc=series('emc').filter(Boolean),hn=series('haines').filter(Boolean);
    if(!emc.length&&!hn.length)parts.push(unavailable(y0,'Humidade de equilíbrio do combustível fino e Índice de Haines'));
    else{
      const range=niceRange(0,Math.max(21,...emc.map(p=>p.v))),f=frame('Combustível morto fino · humidade de equilíbrio estimada (%) e Índice de Haines',y0,range);
      const hy=v=>y0+PH-(v/6)*PH;let g=f.g;
      g+=`<path d="${path(series('emc'),f.y)}" fill="none" stroke="#111" stroke-width="2"/>`;
      if(hn.length){let d='';hn.forEach((p,k)=>{d+=`${k?'L':'M'}${num(x(p.i))},${num(hy(p.v))} `;});g+=`<path d="${d.trim()}" fill="none" stroke="#e07b00" stroke-width="1.6"/>`;for(const v of [0,2,4,6])g+=`<text x="${W-R+4}" y="${num(hy(v)+4)}" class="a" fill="#e07b00">${v}</text>`;}
      const variant=rows.find(r=>r.hainesVariant)?.hainesVariant;
      g+=`<text x="${L}" y="${y0-8}" class="l">${legend([['EMC 2 m (eixo esq.)','#111'],[`Haines ${variant||''} (eixo dir., 2–6)`,'#e07b00']])}</text>`;
      parts.push(g);
    }
  }
  lines(slot(),'GFS · Altura da camada limite (m)',[{key:'boundary_layer_height',color:'#111',label:'Camada limite',width:2}],{min:0});
  bars(slot(),'GFS · CAPE (J/kg) · indicador de instabilidade, não probabilidade de trovoada','cape','#7b3fb0',{fmtTick:v=>String(v)});
  bars(slot(),'Índice Hot-Dry-Windy estimado (hPa·m/s)','hdw','#e07b00',{fixedMax:20,note:'VPD×vento, 2 m/10 m (+950 hPa se <500 m AGL)'});
  const height=top-GAP+PH*0+70;
  const first=rows[0]?.time,last=rows.at(-1)?.time,fmtT=t=>new Date(t).toISOString().slice(0,16).replace('T',' ');
  const head=`<text x="${L}" y="20" class="h">Meteograma de incêndios${meta.name?' · '+escape(meta.name):''}</text><text x="${L}" y="38" class="s">Coord: ${valid(meta.lat)?meta.lat.toFixed(4):'—'}N ${valid(meta.lon)?meta.lon.toFixed(4):'—'}E · Grelha: ${valid(meta.gridLat)?meta.gridLat.toFixed(3):'—'}, ${valid(meta.gridLon)?meta.gridLon.toFixed(3):'—'} · Alt. modelo: ${valid(meta.elevation)?Math.round(meta.elevation)+' m':'—'}</text><text x="${L}" y="53" class="s">Modelo GFS Global via Open-Meteo · ${first?fmtT(first):''} a ${last?fmtT(last):''} UTC · eixo horário UTC · consulta ${escape(meta.queried||'')}</text>`;
  const foot=`<text x="${L}" y="${height-26}" class="s">Previsão numérica de grelha, não observação. EMC, Haines e HDW são estimativas calculadas a partir do modelo.</text><text x="${L}" y="${height-11}" class="s">FWI e probabilidade de trovoada não incluídos nesta fonte. Não é classe oficial de perigo.</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${height}" width="${W}" role="img" aria-label="Meteograma de incêndios${meta.name?' para '+escape(meta.name):''}"><style>.h{font:700 15px system-ui,sans-serif;fill:#111}.s{font:11px system-ui,sans-serif;fill:#444}.t{font:700 12px system-ui,sans-serif;fill:#111}.a{font:10px system-ui,sans-serif;fill:#333}.b{font-weight:700}.l{font:700 11px system-ui,sans-serif}</style><rect width="${W}" height="${height}" fill="#fff"/>${head}${parts.join('')}${foot}</svg>`;
}

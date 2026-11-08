import {fireMeteogramURL,buildRows,fireMeteogramSVG,fireMeteogramCSV} from './fire-meteogram.mjs';
const $=id=>document.getElementById(id);
let station=null,serial=0,last=null;
function save(name,body,type){
  if(window.IgnisPyroAndroid){window.IgnisPyroAndroid.save(name,body,type);return;}
  const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function selectFireMeteogram(row){station=row||null;$('fire-use-station').disabled=!station;}
function coords(){
  const lat=Number($('fire-lat').value.replace(',','.')),lon=Number($('fire-lon').value.replace(',','.'));
  if($('fire-lat').value.trim()===''||$('fire-lon').value.trim()===''||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw Error('Indique latitude (−90 a 90) e longitude (−180 a 180) em graus decimais.');
  return {lat,lon};
}
$('fire-use-station').onclick=()=>{if(!station)return;$('fire-lat').value=station.lat;$('fire-lon').value=station.lon;$('fire-name').value=station.name;};
$('fire-generate').onclick=async()=>{
  const request=++serial;last=null;$('fire-svg').disabled=true;$('fire-csv').disabled=true;$('fire-plot').replaceChildren();
  let point;try{point=coords();}catch(e){$('fire-status').textContent=e.message;return;}
  $('fire-status').textContent='A obter previsão GFS para o ponto…';
  try{
    const response=await fetch(fireMeteogramURL(point.lat,point.lon),{signal:AbortSignal.timeout(45000)});
    if(!response.ok)throw Error(`Modelo indisponível (HTTP ${response.status})`);
    const data=await response.json();if(request!==serial)return;
    const rows=buildRows(data),meta={name:$('fire-name').value.trim(),lat:point.lat,lon:point.lon,gridLat:data.latitude,gridLon:data.longitude,elevation:data.elevation,queried:new Date().toISOString().slice(0,16).replace('T',' ')+' UTC'};
    last={rows,meta};$('fire-plot').innerHTML=fireMeteogramSVG(rows,meta);$('fire-svg').disabled=false;$('fire-csv').disabled=false;
    $('fire-status').textContent=`GFS Global via Open-Meteo · grelha ${data.latitude.toFixed(3)}, ${data.longitude.toFixed(3)} · altitude do modelo ${Math.round(data.elevation)} m · ${rows.length} horas (UTC).`;
  }catch(e){if(request===serial)$('fire-status').textContent=`${e.message}. Sem meteograma; nenhum valor substituto foi usado.`;}
};
const slug=()=>(last.meta.name||`${last.meta.lat}_${last.meta.lon}`).normalize('NFD').replace(/[^\w.-]+/g,'_').replace(/^_+|_+$/g,'')||'ponto';
$('fire-svg').onclick=()=>{if(last)save(`meteograma-incendios-${slug()}.svg`,fireMeteogramSVG(last.rows,last.meta),'image/svg+xml');};
$('fire-csv').onclick=()=>{if(last)save(`meteograma-incendios-${slug()}.csv`,fireMeteogramCSV(last.rows,last.meta),'text/csv;charset=utf-8');};

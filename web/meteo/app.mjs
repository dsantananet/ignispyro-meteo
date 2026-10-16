import {configureStations,showModels,exportModels} from './meteograms.mjs';
import {fields,normalize,merge,series,forecast,csv,geojson,clock,number} from './engine.mjs';
import {assess} from './decisions.mjs';
const $=id=>document.getElementById(id), API='https://api.ipma.pt/open-data/observation/meteorology/stations/';
let modelStation=null;
let rows=[],times=[],timer=null,markers=null,map=null,currentForecast=[];
const fmt=v=>v===null||v===undefined?'—':Number(v).toFixed(1);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
try { const stored=JSON.parse(localStorage.getItem('flame-meteo-v1')||'[]'); rows=Array.isArray(stored)?stored.filter(r=>r&&typeof r.id==='string'&&typeof r.time==='string'&&Number.isFinite(r.lon)&&Number.isFinite(r.lat)):[]; } catch { rows=[]; }
function save(){try{localStorage.setItem('flame-meteo-v1',JSON.stringify(rows));return true;}catch{return false;}}
function download(name,body,type){if(window.IgnisPyroAndroid){window.IgnisPyroAndroid.save(name,body,type);return;}const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function configure(){
  const selected=$('station').value;
  const stations=new Map(rows.map(r=>[r.id,r.name]));
  $('station').replaceChildren(...[...stations].sort((a,b)=>a[1].localeCompare(b[1])).map(([id,name])=>{const o=document.createElement('option');o.value=id;o.textContent=`${name} · ${id}`;return o;}));
  if(stations.has(selected)) $('station').value=selected;
  times=[...new Set(rows.map(r=>r.time))].sort((a,b)=>clock(a)-clock(b));
  configureStations(rows);
  $('time').max=Math.max(0,times.length-1);$('time').value=Math.max(0,times.length-1);render();
}
async function fetchJSON(url){const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json();}
async function refresh(){
  $('refresh').disabled=true;$('status').textContent='A consultar estações e observações do IPMA…';
  try{const [stations,data]=await Promise.all([fetchJSON(API+'stations.json'),fetchJSON(API+'observations.json')]);const incoming=normalize(stations,data);if(!incoming.length)throw new Error('Resposta sem observações válidas');rows=merge(rows,incoming);modelStation=null;const saved=save();configure();$('status').textContent=`${new Set(incoming.map(r=>r.id)).size} estações IPMA · ${incoming.length} observações recebidas · último horário da fonte: ${incoming.reduce((latest,r)=>clock(r.time)>clock(latest)?r.time:latest,incoming[0].time)}. ${saved?'Histórico guardado neste navegador.':'Armazenamento indisponível: exporte os dados antes de fechar.'}`;}
  catch(e){$('status').textContent=`Não foi possível atualizar: ${e.message}. ${rows.length?'A mostrar histórico local; não são dados novos.':'Tente novamente.'}`;if(rows.length)configure();}
  finally{$('refresh').disabled=false;}
}
function color(value,field){if(number(value)===null)return '#8995a5';const bounds={temperature:[0,40],humidity:[0,100],wind:[0,60],rain:[0,15]}[field];const fraction=Math.max(0,Math.min(1,(value-bounds[0])/(bounds[1]-bounds[0])));return `hsl(${220-220*fraction},85%,55%)`;}
function render(){
  const time=times[Number($('time').value)], field=$('field').value,id=$('station').value;
  if(!time)return;$('timestamp').textContent=time.replace('T',' ');
  const byStation=new Map();for(const r of rows){const lag=clock(time)-clock(r.time);if(lag>=0&&lag<=2*3600000)byStation.set(r.id,r);}const snapshot=[...byStation.values()];
  if(map){markers.clearLayers();for(const r of snapshot){const marker=L.circleMarker([r.lat,r.lon],{radius:r.id===id?10:6,color:r.id===id?'#fff':color(r[field],field),fillColor:color(r[field],field),fillOpacity:.85,weight:2});marker.bindTooltip(`${escape(r.name)} · ${fmt(r[field])} ${fields[field][1]} · ${escape(r.time)}`);marker.on('click',()=>{$('station').value=r.id;render();});marker.addTo(markers);}}
  $('legend').textContent=`${fields[field][0]}: azul = valores menores, vermelho = maiores; cinzento = ausente. ${snapshot.length} estações com observação nas últimas 2 horas deste horário.`;
  const history=rows.filter(r=>r.id===id&&clock(r.time)<=clock(time));const latest=history.at(-1);
  $('station-title').textContent=latest?`${latest.name} · ${id}`:'Sem observações para esta estação no horário selecionado';
  $('summary').innerHTML=latest?Object.entries(fields).map(([key,[label,unit]])=>`<span class="metric">${label}<strong>${fmt(latest[key])} ${unit}</strong></span>`).join('')+`<p>Último registo: ${escape(latest.time)} · ${escape(latest.source)}</p>`:'';
  decisions(history,time,[]);
  if(modelStation!==id){modelStation=id;showModels(rows,id);}
}

try{if(!window.L)throw new Error('Biblioteca de mapa indisponível');map=L.map('map').setView([39.8,-8],6);map.attributionControl.addAttribution('Natural Earth · domínio público');fetchJSON('basemap.geojson').then(data=>L.geoJSON(data,{interactive:false,style:{color:'#6b8f9a',weight:1,fillColor:'#264653',fillOpacity:.8}}).addTo(map).bringToBack()).catch(()=>{$('legend').textContent='Contornos geográficos indisponíveis; estações continuam visíveis.';});markers=L.layerGroup().addTo(map);}catch(e){$('map').textContent=e.message+'; gráficos e exportações continuam disponíveis.';}
$('refresh').onclick=refresh;for(const id of ['field','station','time'])$(id).addEventListener('input',render);
$('play').onclick=()=>{if(timer){clearInterval(timer);timer=null;$('play').textContent='▶ Animar';return;}$('play').textContent='❚❚ Pausar';timer=setInterval(()=>{if(times.length){$('time').value=(Number($('time').value)+1)%times.length;render();}},800);};
$('csv').onclick=()=>download('ignispyro-observacoes.csv',csv(rows),'text/csv;charset=utf-8');$('geo').onclick=()=>download('ignispyro-observacoes.geojson',JSON.stringify(geojson(rows)),'application/geo+json');
$('forecast-csv').onclick=()=>download('ignispyro-ecmwf.csv',exportModels(),'text/csv;charset=utf-8');
$('wu').onclick=()=>{$('personal-dialog').showModal();};
$('personal-cancel').onclick=()=>{$('personal-key').value='';$('personal-dialog').close();};
if(!['127.0.0.1','localhost'].includes(location.hostname)){$('wu').disabled=true;$('wu').title='Novas estações pessoais requerem a aplicação Windows local.';}
$('personal-form').onsubmit=async event=>{event.preventDefault();const key=$('personal-key').value;$('personal-key').value='';try{const response=await fetch('/api/station',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({station:$('personal-id').value.trim(),key})});if(!response.ok)throw Error();const data=await response.json();rows=merge(rows,data);save();configure();$('station').value=data[0].id;render();$('personal-dialog').close();$('wu-status').textContent='Estação adicionada nesta sessão; chave não guardada.';}catch{$('wu-status').textContent='Não foi possível ligar à estação. Confirme os acessos e a ligação.';}};
async function aldeia(){try{let data;try{data=await fetchJSON('/api/wu');}catch{data=await fetchJSON('https://raw.githubusercontent.com/dsantananet/ignispyro-meteo/main/data/aldeia.json');data=data.observations;}if(!Array.isArray(data)||!data.length)throw Error();rows=merge(rows,data);save();configure();$('station').value='IALDEI10';render();$('wu-status').textContent='Aldeia do Bispo integrada · última observação '+data.at(-1).time;}catch{$('wu-status').textContent='Aldeia do Bispo: atualização indisponível. O histórico, quando existe, mantém a sua data original.';}}
aldeia();
$('station').addEventListener('change',()=>{const r=rows.filter(r=>r.id===$('station').value).at(-1);if(map&&r)map.panTo([r.lat,r.lon]);});
if(rows.length)configure();refresh();

function decisions(history,time,predictions){
 const config={frost:Number($('frost').value),heat:Number($('heat').value),dry:Number($('dry').value),wind:Number($('wind-limit').value),rain:Number($('rain-limit').value),base:Number($('base').value)};
 const result=assess(history,time,config,predictions);
 if(result.unavailable){$('agro').textContent=result.reason;$('civil').textContent=result.reason;return;}
 const list=items=>items.map(text=>`<p class="indicator">${escape(text)}</p>`).join('');
 $('agro').innerHTML=`<p>Últimas 24 horas da fonte · ${result.temperatureCoverage}/24 amostras horárias de temperatura · ${result.rainCoverage}/24 de chuva.</p><p>Mínima: <strong>${fmt(result.min)} °C</strong> · Máxima: <strong>${fmt(result.max)} °C</strong><br>Chuva 24 h: <strong>${result.rain24===null?'Dados incompletos':fmt(result.rain24)+' mm'}</strong><br>Graus-dia acima de ${config.base} °C: <strong>${result.degreeDays===null?'Dados incompletos':fmt(result.degreeDays)+' °C·dia'}</strong></p>`+list(result.agro)+(result.agro.length?'':'<p>Sem indicadores acionados pelos dados disponíveis e limiares atuais.</p>');
 $('civil').innerHTML=`<p>Calor + secura + vento: <strong>${escape(result.fire)}</strong>.</p>`+list(result.civil)+(result.civil.length?'':'<p>Sem outros indicadores acionados. Confirmar dados ausentes e avisos oficiais.</p>');
}
for(const id of ['frost','heat','dry','wind-limit','rain-limit','base'])$(id).addEventListener('input',()=>{if($(id).checkValidity())render();});

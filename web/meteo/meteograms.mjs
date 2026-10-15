import {variables,loadModels,bulletin} from './model.mjs';
import {clock} from './engine.mjs';
const $=id=>document.getElementById(id),escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let token=0,lastRows=[],lastSelected='',models=new Map();
function plot(observed,predicted,key){
  const now=Date.now(),start=now-24*3600000,end=now+72*3600000;
  const points=arr=>arr.filter(r=>Number.isFinite(r[key])&&clock(r.time)>=start&&clock(r.time)<=end).map(r=>({t:clock(r.time),v:r[key]}));
  const obs=points(observed),pred=points(predicted),values=[...obs,...pred].map(p=>p.v);
  if(!values.length)return '<p>Sem dados para esta variável.</p>';
  const lo=Math.min(...values)-1,hi=Math.max(...values)+1,x=t=>48+(t-start)/(end-start)*560,y=v=>130-(v-lo)/(hi-lo)*100;
  const path=arr=>arr.map((p,i)=>`${!i||p.t-arr[i-1].t>2*3600000?'M':'L'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  let ticks='';for(let h=0;h<=96;h+=24){const t=start+h*3600000;ticks+=`<text x="${x(t)}" y="156" text-anchor="middle">${new Date(t).toISOString().slice(5,16).replace('T',' ')}</text>`;}
  return `<svg viewBox="0 0 660 170" role="img" aria-label="${variables[key][1]}: observações e previsão"><text x="5" y="22">${hi.toFixed(1)} ${variables[key][2]}</text><text x="5" y="132">${lo.toFixed(1)}</text><line x1="${x(now)}" x2="${x(now)}" y1="20" y2="135" stroke="#aaa"/><path d="${path(pred)}" fill="none" stroke="#ffbb66" stroke-width="2" stroke-dasharray="6 4"/><path d="${path(obs)}" fill="none" stroke="#6dd7ed" stroke-width="3"/>${obs.map(p=>`<circle cx="${x(p.t)}" cy="${y(p.v)}" r="2" fill="#6dd7ed"/>`).join('')}${ticks}</svg>`;
}
export function configureStations(rows){
  const checked=new Set([...document.querySelectorAll('#station-options input:checked')].map(n=>n.value));
  const stations=[...new Map(rows.map(r=>[r.id,r])).values()].sort((a,b)=>a.name.localeCompare(b.name));
  $('station-options').replaceChildren(...stations.map(s=>{const l=document.createElement('label'),i=document.createElement('input');i.type='checkbox';i.value=s.id;i.checked=checked.has(s.id);l.append(i,document.createTextNode(`${s.name} · ${s.id}`));return l;}));
}
export async function showModels(rows,selected,multiple=false){
  lastRows=rows;lastSelected=selected;const mine=++token;
  let ids=[selected];if(multiple){const mode=$('scope').value;ids=mode==='all'?[...new Set(rows.map(r=>r.id))]:mode==='selection'?[...document.querySelectorAll('#station-options input:checked')].map(n=>n.value):[selected];}
  const stations=ids.map(id=>rows.filter(r=>r.id===id).at(-1)).filter(Boolean);
  $('model-status').textContent=stations.length?'A carregar previsão ECMWF…':'Selecione pelo menos uma estação.';
  $('meteograms').replaceChildren();$('risk-text').value='';models=new Map();if(!stations.length)return;
  try{
    const loaded=await loadModels(stations,(n,total)=>{if(mine===token)$('model-status').textContent=`Previsão: ${n}/${total} estações…`;});if(mine!==token)return;models=loaded;
    $('model-status').textContent=`ECMWF via Open-Meteo · ${stations.length} estações · consulta ${new Date().toLocaleString('pt-PT')} · eixo horário UTC. Azul: observado; laranja tracejado: modelo; linha vertical: agora.`;
    $('meteograms').replaceChildren(...stations.map(s=>{const article=document.createElement('article');const forecast=models.get(s.id).rows,obs=rows.filter(r=>r.id===s.id);article.innerHTML=`<h3>${escape(s.name)} · ${escape(s.id)}</h3><p>Última observação: ${escape(s.time)} (${escape(s.source)})${Date.now()-clock(s.time)>2*3600000?' · DESATUALIZADA':''}</p>`+Object.entries(variables).map(([key,[,label,unit]])=>`<details ${['temperature','wind','rain'].includes(key)?'open':''}><summary>${label} · ${unit}</summary>${plot(obs,forecast,key)}</details>`).join('');return article;}));
    $('risk-text').value=`IGNISPYRO METEO · ${stations.length===1?'Estação':$('scope').value==='all'?'Resumo nacional das estações disponíveis':'Seleção de estações'}\n${stations.length} estação(ões) com previsão disponível. Consulta ${new Date().toISOString()}\n\n`+stations.map(s=>bulletin(s,models.get(s.id).rows)).join('\n\n────────────────\n\n')+'\n\nCobertura limitada às estações carregadas. Consultar avisos IPMA/ANEPC. Projeto independente · IGNISPYRO.';
  }catch(e){if(mine===token)$('model-status').textContent=e.message+'. Observações mantidas; sem previsão substituta.';}
}
export function exportModels(){const lines=['estacao;hora_UTC;'+Object.keys(variables).join(';')];for(const [id,data] of models)for(const r of data.rows)lines.push([id,r.time,...Object.keys(variables).map(k=>r[k]??'')].join(';'));return '\uFEFF'+lines.join('\r\n');}
$('load-models').onclick=()=>showModels(lastRows,lastSelected,true);
$('scope').onchange=()=>{$('station-options').hidden=$('scope').value!=='selection';};
$('observations-tab').onclick=()=>{$('risk-panel').hidden=true;$('weather-panel').hidden=false;};
$('risk-tab').onclick=()=>{$('risk-panel').hidden=false;$('weather-panel').hidden=true;};
$('copy-risk').onclick=async()=>{try{await navigator.clipboard.writeText($('risk-text').value);$('copy-risk').textContent='Resumo copiado';}catch{$('risk-text').select();}};

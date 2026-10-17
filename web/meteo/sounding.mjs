// T–entropy (tephigram) coordinates: orthogonal isotherms and dry adiabats.
export const levels=[1000,975,950,925,900,850,800,700,600,500,400,300,250,200,150,100];
const valid=v=>typeof v==='number'&&Number.isFinite(v);
export function coordinates(t,p){
 const k=t+273.15, entropy=273.15*Math.log((k/273.15)*Math.pow(1000/p,287.05/1004));
 return {x:(t+entropy)/Math.sqrt(2),y:(entropy-t)/Math.sqrt(2)};
}
export function profileURL(lat,lon){
 if(!valid(lat)||!valid(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw Error('Coordenadas inválidas');
 const hourly=['surface_pressure','cape','convective_inhibition',...levels.flatMap(p=>['temperature','dew_point','geopotential_height','wind_speed','wind_direction'].map(v=>`${v}_${p}hPa`))];
 return 'https://api.open-meteo.com/v1/gfs?'+new URLSearchParams({latitude:lat,longitude:lon,models:'gfs_global',hourly:hourly.join(','),forecast_hours:48,timezone:'UTC',wind_speed_unit:'kmh',elevation:'nan'});
}
export function profileAt(data,index){
 const h=data.hourly, time=h?.time?.[index], surface=h?.surface_pressure?.[index];
 if(!time||!valid(surface))throw Error('Sem hora ou pressão de superfície: perfil indisponível');
 const profile=levels.filter(p=>p<=surface).map(p=>({p,t:h[`temperature_${p}hPa`]?.[index],td:h[`dew_point_${p}hPa`]?.[index],z:h[`geopotential_height_${p}hPa`]?.[index],wind:h[`wind_speed_${p}hPa`]?.[index],direction:h[`wind_direction_${p}hPa`]?.[index]}));
 return {time,profile,cape:valid(h.cape?.[index])?h.cape[index]:null,cin:valid(h.convective_inhibition?.[index])?h.convective_inhibition[index]:null};
}
export function inversions(profile){
 const out=[];
 for(let i=1;i<profile.length;i++){const a=profile[i-1],b=profile[i];if([a.t,b.t,a.z,b.z].every(valid)&&b.z>a.z&&b.t>a.t)out.push({bottom:a.z,top:b.z,delta:b.t-a.t});}
 return out;
}
export function distanceKm(a,b,c,d){const rad=Math.PI/180;const q=Math.sin((c-a)*rad/2)**2+Math.cos(a*rad)*Math.cos(c*rad)*Math.sin((d-b)*rad/2)**2;return 6371*2*Math.asin(Math.sqrt(Math.min(1,q)));}
export function tephigram(profile){
 const xy=(t,p)=>{const q=coordinates(t,p);return [90+(q.x+65)*4.2,610-q.y*4.2];};
 const line=(points,color,width=1)=>`<polyline fill="none" stroke="${color}" stroke-width="${width}" points="${points.map(q=>q.map(n=>n.toFixed(2)).join(',')).join(' ')}"/>`;
 let grid='';
 for(let t=-90;t<=50;t+=10)grid+=line([xy(t,1050),xy(t,100)],'#34455b');
 for(let theta=-40;theta<=200;theta+=10){const points=[];for(let p=1050;p>=100;p-=5){const t=(theta+273.15)*Math.pow(p/1000,287.05/1004)-273.15;if(t>=-100&&t<=55)points.push(xy(t,p));}grid+=line(points,'#284d46');}
 for(let t=-40;t<=40;t+=10){const [x,y]=xy(t,1000);grid+=`<text x="${x}" y="${y}" fill="#c7d7e8" font-size="11">${t}°</text>`;}
 for(const p of [1000,925,850,700,500,300,200,100]){const pts=[];for(let t=-100;t<=55;t++)pts.push(xy(t,p));grid+=line(pts,'#586377');const [x,y]=xy(p>=700?-40:-70,p);grid+=`<text x="${x}" y="${y}" fill="#c7d7e8" font-size="12">${p} hPa</text>`;}
 let traces='';for(const [field,color] of [['t','#ff946d'],['td','#67d4b0']]){let segment=[];const flush=()=>{if(segment.length>1)traces+=line(segment,color,3);segment=[];};for(const row of profile){if(valid(row[field]))segment.push(xy(row[field],row.p));else flush();}flush();}
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 660" role="img" aria-label="Tefigrama previsto: temperatura e ponto de orvalho"><rect width="800" height="660" fill="#101d2d"/><defs><clipPath id="tephi-clip"><rect x="35" y="40" width="730" height="570"/></clipPath></defs><g clip-path="url(#tephi-clip)">${grid}${traces}</g><text x="35" y="25" fill="#ff946d">Temperatura (°C)</text><text x="240" y="25" fill="#67d4b0">Ponto de orvalho (°C)</text><text x="35" y="640" fill="#c7d7e8" font-size="12">T–entropia · isóbaras cinzentas · adiabáticas secas verdes · sem trajetória de parcela</text></svg>`;
}

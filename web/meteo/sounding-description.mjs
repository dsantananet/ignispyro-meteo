// Source mapping and numerical conventions: docs/TEPHIGRAM-INTERPRETATION.md.
const valid=v=>typeof v==='number'&&Number.isFinite(v);
const f=v=>v.toFixed(1);
export function hainesMid(profile){
 const a=profile.find(r=>r.p===850),b=profile.find(r=>r.p===700);
 if(!a||!b||![a.t,a.td,b.t].every(valid)||a.td>a.t)return null;
 const stability=a.t-b.t,deficit=a.t-a.td;
 // The source table lists integer degrees: round differences explicitly before scoring.
 const stabilityScoreInput=Math.round(stability),deficitScoreInput=Math.round(deficit);
 const A=stabilityScoreInput<6?1:stabilityScoreInput<11?2:3,B=deficitScoreInput<6?1:deficitScoreInput<13?2:3;
 const ca=.5*stability-2;let cb=Math.min(deficit,30)/3-1;
 if(cb>5)cb=5+.5*(cb-5);
 return {A,B,value:A+B,stability,deficit,ca,cb,continuous:ca+cb};
}
export function soundingDescription(current,elevation){
 const p=current.profile||[],a=p.find(r=>r.p===850),b=p.find(r=>r.p===700),haines=hainesMid(p),paragraphs=[];
 const usable=p.filter(r=>valid(r.t)&&valid(r.td)&&r.td<=r.t&&valid(r.z));
 paragraphs.push({title:'O que as curvas mostram',text:usable.length?`Nesta hora (${current.time} UTC), existem ${usable.length} níveis com temperatura, ponto de orvalho e altura válidos. A curva laranja representa a temperatura ambiente e a verde o ponto de orvalho. A pressão diminui em altitude. Curvas próximas indicam ar relativamente mais húmido; maior afastamento indica ar relativamente mais seco. Isto não mede a humidade dos combustíveis.`:'Não existem níveis suficientes com temperatura, ponto de orvalho e altura válidos para interpretar as curvas nesta hora.'});
 if(a&&b&&[a.t,b.t,a.z,b.z].every(valid)&&b.z>a.z){const lapse=(a.t-b.t)/((b.z-a.z)/1000);paragraphs.push({title:'Variação da temperatura com a altitude',text:`Entre 850 e 700 hPa (${f(a.z)}–${f(b.z)} m ASL), a temperatura ${lapse>=0?'diminui':'aumenta'} ${f(Math.abs(lapse))} °C por quilómetro. A referência de uma parcela seca em ascensão é cerca de 9,8 °C/km; a taxa de uma parcela saturada varia com temperatura e pressão. Este gradiente ambiental não basta para determinar a flutuabilidade da coluna: falta a trajetória da parcela e o seu teor de humidade.`});}
 else paragraphs.push({title:'Variação da temperatura com a altitude',text:'Sem temperaturas e alturas válidas em 850 e 700 hPa não é calculado o gradiente desta camada. Não se substituem níveis ausentes por níveis abaixo do terreno.'});
 paragraphs.push({title:'Haines e C-Haines',text:haines?`Haines intermédio (850–700 hPa): ${haines.value}/6, composto por estabilidade A=${haines.A} (T850−T700=${f(haines.stability)} °C) e secura B=${haines.B} (T850−Td850=${f(haines.deficit)} °C). C-Haines: ${haines.continuous.toFixed(2)} (CA=${haines.ca.toFixed(2)}; CB=${haines.cb.toFixed(2)}). As diferenças são arredondadas a graus inteiros para a tabela discreta do Haines; o C-Haines usa os valores sem arredondamento. Estes índices resumem instabilidade e secura da camada; não incluem vento, combustível ou relevo. A variante intermédia é fixa e a adequação à orografia regional deve ser confirmada. Sem climatologia local não se atribui um percentil ou uma classe de risco ao C-Haines.`:'Haines intermédio e C-Haines indisponíveis: são necessários T850, Td850 e T700 válidos, acima da superfície do modelo. A presença de outros níveis não permite preencher estes valores.'});
 const cape=valid(current.cape)&&current.cape>=0?current.cape:null,cin=valid(current.cin)?current.cin:null;
 paragraphs.push({title:'Convecção e desenvolvimento da coluna',text:`${cape===null?'CAPE indisponível.':`CAPE do modelo: ${f(cape)} J/kg.`} ${cin===null?'CIN indisponível.':`CIN do modelo: ${f(cin)} J/kg (magnitude ${f(Math.abs(cin))}).`} CAPE descreve energia de flutuabilidade positiva de uma parcela definida pelo fornecedor; CIN descreve a barreira energética de flutuabilidade negativa. São diagnósticos do modelo. Sem trajetória de parcela não se localizam LCL, LFC, nível de equilíbrio ou LI neste gráfico. Estes valores não demonstram formação de pirocúmulos ou pirocumulonimbus, nem excluem convecção gerada pelo fogo.`});
 const low=valid(elevation)?p.filter(r=>valid(r.z)&&r.z>=elevation&&r.z<=elevation+3000):[];const inv=[];
 for(let i=1;i<p.length;i++){const l=p[i-1],u=p[i];if(valid(elevation)&&[l.t,u.t,l.z,u.z].every(valid)&&l.z>=elevation&&u.z<=elevation+3000&&u.z>l.z&&u.t>l.t)inv.push({l,u});}
 const first=inv[0];paragraphs.push({title:'Implicação para o incêndio',text:first?`Na camada inferior até 3 km AGL deteta-se uma inversão entre ${f(first.l.z)} e ${f(first.u.z)} m ASL (+${f(first.u.t-first.l.t)} °C). Pode limitar a mistura e reter fumo. A sua erosão pode alterar a ventilação e a atividade do incêndio, mas não se prevê aqui a hora de rutura. Confirme a evolução horária, o vento à superfície e o comportamento observado.`:`${low.filter(r=>valid(r.t)).length>=2?'Não foi resolvida uma inversão entre os níveis válidos adjacentes da camada inferior até 3 km AGL. Camadas finas podem escapar à resolução do perfil.':'A camada inferior não tem cobertura suficiente para um diagnóstico de inversões.'} Cruze a estrutura térmica e a secura em altitude com vento observado, relevo, humidade do combustível e atividade do incêndio. Nenhum indicador isolado define segurança ou risco operacional.`});
 return {paragraphs,haines};
}

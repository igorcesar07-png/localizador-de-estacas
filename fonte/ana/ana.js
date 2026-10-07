/* =====================================================================
   PÁGINA 6 — Análise por km (estratégia de execução e simulação da programação)
   ===================================================================== */
(function AnaPage(){
  const LF=window.L;
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const nfx=(v,d)=>v==null||!isFinite(v)?'—':nf(v,d);
  const OBRAS={'277':{nome:'BR-277 — Blocos 02 e 03',obra:'Restauração BR-277 – Blocos 02 e 03',fonte:'R08 Unifilar de Soluções B2+B3 BR-277 e KMZ de estacas'},
    B4:{nome:'BR-373 — Bloco 04',obra:'Restauração BR-373 – Bloco 04',fonte:'unifilar de soluções da BR-373 B4 e KMZ de estacas'}};
  const SRC277={Data,R,LANES,SIDE,PANOS,ODO};
  const srcOf=k=>k==='B4'?window.__SRC_B4||null:SRC277;
  const GRPS=[['F1','Faixa 1'],['F23','Faixa 2/3'],['AC','Acostamento'],['DRN','Dreno']];
  const GRP_B4={F23:'Faixa 2',AC:'Acostamento / bordo'};
  const grpName=(k,g)=>(k==='B4'&&GRP_B4[g])||GRPS.find(x=>x[0]===g)[1];
  const STATUS={nao:'Não executado',prog:'Programado',and:'Em execução',exec:'Executado'};
  const ST_COLOR={nao:'#9AA19D',prog:'#1A73E8',and:'#E08A00',exec:'#1E7A4C'};
  const IND={m:{t:'Metros de serviço',u:'m',d:0},t:{t:'CBUQ',u:'t',d:1},n:{t:'Nº de segmentos',u:'',d:0},frag:{t:'Fragmentação',u:'seg./100 m',d:2},pL:{t:'Metros em segmentos ≥ 100 m',u:'%',d:0}};
  const SORTS={km:'Km (ordem da rodovia)',m:'Metros de serviço',t:'CBUQ (t)',n:'Nº de segmentos',frag:'Fragmentação'};
  const PAL=['#FFF1D6','#FBC97A','#F08A2C','#C8101A','#7A0A10'];
  const DEF={obra:'277',kA:'',kB:'',lanes:['F1','F23','AC'],sent:'ALL',sol:null,st:null,ind:'m',gap:20,sort:'km',range:false};
  let F=Object.assign({},DEF,store.get('anaF',{}));
  const SIM=Object.assign({cap:'',capU:'m2',disp:'',truck:''},store.get('anaSim',{}));
  let SEL=null,RES=null,map=null,kmLayer=null,mapKey='';
  const saveF=()=>store.set('anaF',F),saveSim=()=>store.set('anaSim',SIM);
  const num=v=>{if(v===''||v==null)return null;const n=parseFloat(String(v).replace(',','.'));return isFinite(n)?n:null};

  /* ---------- parâmetros de largura, espessura e densidade (cadastro da Calculadora; BR-373: unifilar) ---------- */
  function cad(k){const c=store.get('calc',null)||{};const bs=(c.bySrc&&c.bySrc[k])||(k==='277'?c:{});
    const esp=Object.assign({FF:6,FE:10,FS:3},c.esp||{});
    return {w:{F1:num((c.w||{}).F1)??3.6,F23:num((c.w||{}).F23)??3.6,AC:num((c.w||{}).AC)??2.5},esp:code=>num(esp[code]),excl:code=>!!(c.excl||{})[code],
      rowW:tag=>num((bs.rowW||{})[tag]),dens:num(c.dens)??2.528,custom:!!c.w}}

  /* ---------- base: filtros → partes de cada segmento dentro de cada km ---------- */
  function famsOf(SRC){const set=new Set(SRC.PANOS.map(p=>p.info.fam));return SRC.Data.FAM_ORDER.filter(f=>set.has(f))}
  function build(){const k=F.obra,SRC=srcOf(k);if(!SRC)return {err:true,k};
    const {Data:D,R:RR,LANES:LN,SIDE:SD,PANOS:PN,ODO:OD}=SRC;const C=cad(k);
    const fams=famsOf(SRC),sol=F.sol?F.sol.filter(f=>fams.includes(f)):fams.filter(f=>f!=='DR'&&f!=='DP');
    const stIdx=k==='277'&&window.ExecIdx?window.ExecIdx():null;const stSel=stIdx&&F.st?F.st:null;
    const kmA=num(F.kA),kmB=num(F.kB),lo=kmA!=null&&kmB!=null?Math.min(kmA,kmB):kmA,hi=kmA!=null&&kmB!=null?Math.max(kmA,kmB):kmB;
    const kmIn=km=>(lo==null||km>=lo)&&(hi==null||km<=hi);
    const kms=new Map();for(let i=0;i<RR.length;i++){const km=RR[i][5];if(!kmIn(km))continue;let o=kms.get(km);if(!o){o={k:km,i0:i,i1:i,parts:[]};kms.set(km,o)}o.i1=i}
    const parts=[];let missCad=0;
    for(const p of PN){const L0=LN[p.L],grp=L0.grp;if(!F.lanes.includes(grp))continue;if(F.sent!=='ALL'&&L0.side!==F.sent)continue;if(!sol.includes(p.info.fam))continue;
      const drn=grp==='DRN',totLen=20*(p.i1-p.i0+1);let w=null,e=null,excl=false,wFrom='',eFrom='';
      if(!drn){excl=C.excl(p.code);const us=k==='B4'&&p.src?p.src:null,rw=C.rowW(p.tag);
        if(rw!=null){w=rw;wFrom='pano (calculadora)'}else if(us&&us.largura_media_m>0){w=us.largura_media_m;wFrom='unifilar'}else{w=C.w[grp];wFrom='cadastro'}
        if(!excl){if(us&&us.espessura_m>0){e=Math.round(us.espessura_m*1000)/10;eFrom='unifilar'}else{e=C.esp(p.code);eFrom='cadastro'}}}
      const miss=!drn&&!excl&&(!(w>0)||!(e>0));
      let i=p.i0;while(i<=p.i1){const km=RR[i][5];let j=i;while(j+1<=p.i1&&RR[j+1][5]===km)j++;
        if(kms.has(km)){const len=20*(j-i+1),a=OD[i],b=OD[j]+20,area=!drn&&w>0?len*w:null,vol=!drn&&!excl&&area!=null&&e>0?area*e/100:null,t=vol!=null&&C.dens>0?vol*C.dens:null;
          let st=null;if(stIdx)st=stIdx(p.L,a,b).st;
          if(!stSel||stSel.includes(st)){const x={p,km,i,j,a,b,len,area,vol,t,miss,excl,drn,w,e,wFrom,eFrom,st,totLen,L0,grp,side:L0.side};parts.push(x);kms.get(km).parts.push(x)}}
        i=j+1}}
    const list=[...kms.values()].sort((a,b)=>a.k-b.k);list.forEach(o=>o.A=agg(o.parts,F.gap));
    return {k,SRC,C,fams,sol,stOn:!!stIdx,parts,kms:list,byK:new Map(list.map(o=>[o.k,o]))}}

  // segmentos dentro do escopo (partes do mesmo segmento unidas)
  function pieces(parts){const m=new Map();for(const x of parts){let s=m.get(x.p.id);if(!s){s={p:x.p,L:x.p.L,L0:x.L0,grp:x.grp,side:x.side,a:x.a,b:x.b,len:0,area:0,vol:0,t:0,tNull:false,miss:x.miss,excl:x.excl,drn:x.drn,w:x.w,e:x.e,wFrom:x.wFrom,eFrom:x.eFrom,tot:x.totLen,kms:new Set(),st:{}};m.set(x.p.id,s)}
      s.a=Math.min(s.a,x.a);s.b=Math.max(s.b,x.b);s.len+=x.len;if(x.area!=null)s.area+=x.area;if(x.vol!=null)s.vol+=x.vol;if(x.t!=null)s.t+=x.t;else s.tNull=true;s.kms.add(x.km);if(x.st)s.st[x.st]=(s.st[x.st]||0)+x.len}
    return [...m.values()]}
  // ordem de execução: crescente da menor para a maior estaca, depois decrescente da maior para a menor (faixa 1 → 2/3 → acostamento → dreno)
  const LORD={2:0,1:1,0:2,6:3,3:0,4:1,5:2,7:3};
  const execOrder=ps=>ps.slice().sort((x,y)=>(x.side===y.side?0:x.side==='C'?-1:1)||(x.side==='C'?x.a-y.a:y.b-x.b)||LORD[x.L]-LORD[y.L]);
  function agg(parts,gap){const ps=pieces(parts);let m=0,area=0,vol=0,t=0,cbuqM=0,tM=0;const bySol={},byLane={},bySide={},bySt={};
    for(const x of parts){m+=x.len;if(x.area!=null)area+=x.area;if(x.vol!=null)vol+=x.vol;if(!x.drn&&!x.excl){cbuqM+=x.len;if(x.t!=null){t+=x.t;tM+=x.len}}
      const f=x.p.info.fam;bySol[f]=(bySol[f]||0)+x.len;byLane[x.grp]=(byLane[x.grp]||0)+x.len;bySide[x.side]=(bySide[x.side]||0)+x.len;if(x.st)bySt[x.st]=(bySt[x.st]||0)+x.len}
    const n=ps.length,nL=ps.filter(s=>s.tot>=100).length,mL=parts.filter(x=>x.totLen>=100).reduce((s,x)=>s+x.len,0);
    const missN=ps.filter(s=>s.miss).length,avg=n?ps.reduce((s,x)=>s+x.tot,0)/n:0;
    // intervalos entre segmentos consecutivos da mesma pista e sentido; sequências com mesma solução e espessura
    const byL=new Map();for(const s of ps){if(!byL.has(s.L))byL.set(s.L,[]);byL.get(s.L).push(s)}
    const gaps=[],chains=[];let chg=0;
    for(const [L,arr] of byL){arr.sort((x,y)=>x.a-y.a);let ch=null;
      for(let q=0;q<arr.length;q++){const s=arr[q],pr=arr[q-1];
        if(pr){const g=s.a-pr.b;gaps.push({L,L0:s.L0,g:Math.max(0,g),from:pr,to:s});if(pr.p.code!==s.p.code||pr.e!==s.e)chg++}
        const same=ch&&pr&&s.a-pr.b<=gap+1e-6&&pr.p.code===s.p.code&&pr.e===s.e;
        if(same){ch.items.push(s);ch.len+=s.len;ch.b=s.b}else{ch={L,L0:s.L0,code:s.p.code,info:s.p.info,e:s.e,a:s.a,b:s.b,len:s.len,items:[s]};chains.push(ch)}}}
    chains.sort((x,y)=>y.len-x.len);
    const seq=execOrder(ps);let chL=0,chS=0;for(let q=1;q<seq.length;q++){if(seq[q].side!==seq[q-1].side)chS++;else if(seq[q].grp!==seq[q-1].grp)chL++}
    return {m,area,vol,t,cbuqM,tM,tPartial:cbuqM>0&&tM<cbuqM-1e-6,tNone:cbuqM>0&&tM<1e-6,n,nL,nS:n-nL,mL,pL:m?mL/m*100:0,missN,avg,frag:m>0?n/(m/100):0,bySol,byLane,bySide,bySt,ps,gaps,chains,chgSol:chg,chgLane:chL,chgSide:chS,best:chains[0]||null}}
  const indVal=(A,ind)=>ind==='m'?A.m:ind==='t'?(A.tNone?null:A.t):ind==='n'?A.n:ind==='frag'?A.frag:A.pL;

  /* ---------- tela ---------- */
  function pills(id,items,sel,onTog){const el=$(id);el.innerHTML=items.map(([k,t,c])=>`<button type="button" class="pill an-p" data-k="${esc(k)}" aria-pressed="${sel.includes(k)}">${c?`<span class="sw" style="background:${c}"></span>`:''}<span>${esc(t)}</span></button>`).join('');
    el.querySelectorAll('button').forEach(b=>b.onclick=()=>onTog(b.dataset.k))}
  function renderFilters(){const k=F.obra,SRC=srcOf(k);$('aObra').value=k;$('aKA').value=F.kA;$('aKB').value=F.kB;$('aSent').value=F.sent;$('aInd').value=F.ind;$('aGap').value=F.gap;$('aSort').value=F.sort;$('aRange').checked=!!F.range;
    $('aSrcNote').innerHTML=k==='B4'?(SRC?'Fonte: <b>unifilar de soluções da BR-373 B4</b> e KMZ de estacas. Largura e espessura de cada segmento vêm do unifilar. A solução <b>Gap Graded (GAP)</b>, sigla G no unifilar, aparece como <b>FS — Fresagem Superficial 3 cm</b>; o nome original fica no detalhe do segmento e na exportação.':'<b>Base da BR-373 B4 não carregada.</b> O administrador precisa enviar a base em Administração › Base do projeto.'):
      'Fonte: <b>R08 Unifilar de Soluções B2+B3 BR-277</b> e KMZ de estacas. O R08 não traz largura: a largura e a espessura vêm do cadastro da Calculadora de programação.';
    if(!SRC){$('aSol').innerHTML='';$('aLanes').innerHTML='';$('aSt').innerHTML='';return}
    pills('aLanes',GRPS.map(([g])=>[g,grpName(k,g)]),F.lanes,g=>{F.lanes=F.lanes.includes(g)?F.lanes.filter(x=>x!==g):F.lanes.concat(g);saveF();refresh()});
    const fams=famsOf(SRC),sol=F.sol?F.sol.filter(f=>fams.includes(f)):fams.filter(f=>f!=='DR'&&f!=='DP');
    pills('aSol',fams.map(f=>{const inf=SRC.Data.info(f==='PA'?(SRC.Data.CODES.find(c=>/^PA/.test(c))||'PA'):f==='REC'&&k==='277'?'RECe25':f==='RP'&&k==='277'?'RPe25':f);return [f,`${f} – ${f==='FS'&&k==='B4'?'Fresagem Superficial 3 cm':inf.desc}`,inf.color]}),sol,f=>{const cur=F.sol?F.sol.filter(x=>fams.includes(x)):sol.slice();F.sol=cur.includes(f)?cur.filter(x=>x!==f):cur.concat(f);saveF();refresh()});
    const stOn=k==='277'&&!!window.ExecIdx;$('aStBox').hidden=!stOn;$('aStNone').hidden=stOn;
    if(stOn){const st=F.st||Object.keys(STATUS);pills('aSt',Object.entries(STATUS).map(([s,t])=>[s,t,ST_COLOR[s]]),st,s=>{const cur=F.st||Object.keys(STATUS);F.st=cur.includes(s)?cur.filter(x=>x!==s):cur.concat(s);saveF();refresh()})}}
  function scale(vals){const v=vals.filter(x=>x!=null&&x>0).sort((a,b)=>a-b);if(!v.length)return {col:()=>'#E4E7E5',br:[]};const q=f=>v[Math.min(v.length-1,Math.floor(f*(v.length-1)))];const br=[q(.2),q(.4),q(.6),q(.8)];
    return {col:x=>x==null?'#E4E7E5':x<=0?'#E4E7E5':PAL[br.filter(b=>x>b).length],br,min:v[0],max:v[v.length-1]}}
  function selKms(){if(!RES||!SEL)return RES?RES.kms:[];return RES.kms.filter(o=>o.k>=SEL.a&&o.k<=SEL.b)}
  function scopeA(){const ks=selKms();return {ks,A:agg(ks.flatMap(o=>o.parts),F.gap)}}
  const kmLbl=k=>'km '+k;
  const selLbl=()=>!SEL?'todos os km filtrados':SEL.a===SEL.b?kmLbl(SEL.a):`km ${SEL.a} a ${SEL.b}`;

  function refresh(){F.gap=Math.max(0,num($('aGap').value)??20);RES=build();renderFilters();
    if(RES.err){['aSum','aDiag','aStrat','aKmTab','aSegTab','aSimOut'].forEach(id=>$(id).innerHTML='');$('aMsg').hidden=false;$('aMsg').innerHTML='<b>Base da BR-373 B4 não carregada.</b> Escolha a BR-277 ou peça ao administrador para enviar a base.';drawMap();return}
    $('aMsg').hidden=!!RES.kms.length;if(!RES.kms.length)$('aMsg').innerHTML='<b>Nenhum km no intervalo informado.</b> Confira o km inicial e o final.';
    if(SEL&&!RES.kms.some(o=>o.k>=SEL.a&&o.k<=SEL.b))SEL=null;
    renderSummary();renderDiag();drawMap();renderStrat();renderKmTab();renderSegTab();renderSim()}

  function renderSummary(){const {ks,A}=scopeA();const tTxt=A.cbuqM?(A.tNone?'sem dados':nf(A.t,2)+' t'):'não se aplica';
    const tiles=[['Km analisados',String(ks.length),selLbl()],['Metros de serviço',nf(A.m,0)+' m','soma das faixas; pode passar de 1.000 m por km'],['Área',nf(A.area,0)+' m²',''],
      ['Volume de CBUQ',nf(A.vol,1)+' m³',A.tPartial?'parcial':''],['Massa de CBUQ',tTxt,A.tPartial?`parcial: ${A.missN} segmento${A.missN>1?'s':''} sem largura ou espessura`:`densidade ${nf(RES.C.dens,3)} t/m³`,true],
      ['Segmentos',String(A.n),'únicos, sem repetir os que passam de um km'],['Segmentos ≥ 100 m',String(A.nL),`${nf(A.pL,0)}% dos metros de serviço`],['Segmentos < 100 m',String(A.nS),'porte pela extensão total do segmento'],
      ['Extensão média',nf(A.avg,0)+' m','extensão total dos segmentos'],['Fragmentação',nf(A.frag,2),'segmentos por 100 m de serviço']];
    $('aSum').innerHTML=tiles.map(([k,v,s,hl])=>`<div class="kpi${hl?' main':''}"><span>${k}</span><b>${v}</b>${s?`<div class="sub">${s}</div>`:''}</div>`).join('')+
      `<div class="an-dist">${dist('Por solução',A.bySol,f=>{const inf=RES.SRC.Data.info(f==='PA'?(RES.SRC.Data.CODES.find(c=>/^PA/.test(c))||'PA'):f);return [f,inf.color]},A.m)}${dist('Por pista',A.byLane,g=>[grpName(RES.k,g),'#56605A'],A.m)}${dist('Por sentido',A.bySide,s=>[RES.SRC.SIDE[s],s==='C'?'#2E86C1':'#B0177A'],A.m)}${RES.stOn?dist('Por status',A.bySt,s=>[STATUS[s],ST_COLOR[s]],A.m):''}</div>`}
  function dist(t,o,lab,tot){const e=Object.entries(o).sort((a,b)=>b[1]-a[1]);if(!e.length)return '';
    return `<div class="an-db"><h4>${t}</h4>${e.map(([k,v])=>{const [n,c]=lab(k);return `<div class="an-dr"><span class="an-dn"><i style="background:${c}"></i>${esc(n)}</span><span class="an-dbar"><b style="width:${tot?v/tot*100:0}%;background:${c}"></b></span><span class="an-dv">${nf(v,0)} m · ${nf(tot?v/tot*100:0,0)}%</span></div>`}).join('')}</div>`}

  function renderDiag(){const ks=RES.kms,ind=F.ind,S=scale(ks.map(o=>indVal(o.A,ind))),mx=Math.max(1,...ks.map(o=>o.A.m)),fams=RES.fams;
    $('aLegend').innerHTML=`<b>${IND[ind].t}${IND[ind].u?` (${IND[ind].u})`:''}</b>`+[0,...S.br].map((b,q)=>`<span><i style="background:${PAL[q]}"></i>${q===0?'até '+nf(S.br[0]??0,IND[ind].d):q===S.br.length?'acima de '+nf(b,IND[ind].d):nf(b,IND[ind].d)+' a '+nf(S.br[q],IND[ind].d)}</span>`).join('')+'<span><i style="background:#E4E7E5"></i>sem serviço / sem dados</span>';
    $('aDiag').innerHTML=ks.map(o=>{const v=indVal(o.A,ind),on=!!(SEL&&o.k>=SEL.a&&o.k<=SEL.b);
      const bars=fams.filter(f=>o.A.bySol[f]).map(f=>{const inf=RES.SRC.Data.info(f==='PA'?(RES.SRC.Data.CODES.find(c=>/^PA/.test(c))||'PA'):f);return `<b style="height:${o.A.bySol[f]/mx*100}%;background:${inf.color}" title="${f}: ${nf(o.A.bySol[f],0)} m"></b>`}).join('');
      return `<button type="button" class="an-km${on?' on':''}" data-k="${o.k}" aria-pressed="${on}" aria-label="km ${o.k}: ${IND[ind].t} ${v==null?'sem dados':nf(v,IND[ind].d)+' '+IND[ind].u}, ${nf(o.A.m,0)} m de serviço, ${o.A.n} segmentos"><span class="an-c" style="background:${S.col(v)}"></span><span class="an-bars">${bars}</span><span class="an-kl">${o.k}</span></button>`}).join('');
    $('aDiag').querySelectorAll('.an-km').forEach(b=>b.onclick=()=>pick(+b.dataset.k));
    $('aSelTxt').innerHTML=SEL?`Selecionado: <b>${selLbl()}</b> · <button type="button" class="linkbtn" id="aClr">limpar seleção</button>`:'Toque em um km para ver os indicadores e os segmentos. Para uma frente de trabalho, ligue "Selecionar intervalo" e toque no km inicial e no final.';
    const c=$('aClr');if(c)c.onclick=()=>{SEL=null;afterSel()}}
  let anchor=null;
  function pick(k){if(F.range&&anchor!=null&&SEL&&SEL.a===SEL.b){SEL={a:Math.min(anchor,k),b:Math.max(anchor,k)};anchor=null}
    else if(SEL&&SEL.a===k&&SEL.b===k&&!F.range){SEL=null;anchor=null}else{SEL={a:k,b:k};anchor=k}
    afterSel()}
  function afterSel(){renderSummary();renderDiag();styleMap();renderStrat();renderKmTab();renderSegTab();renderSim();const d=document.querySelector('#aDiag .an-km.on');if(d)d.scrollIntoView({block:'nearest',inline:'nearest'})}

  /* ---------- mapa geográfico (coordenadas das estacas do KMZ) ---------- */
  function drawMap(){const box=$('aMap');if(!LF||!box)return;
    if(!map){map=LF.map(box,{zoomControl:true,attributionControl:true,preferCanvas:true});
      LF.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map)}
    if(kmLayer){kmLayer.remove();kmLayer=null}if(!RES||RES.err||!RES.kms.length)return;
    const RR=RES.SRC.R;kmLayer=LF.layerGroup().addTo(map);const all=[];
    for(const o of RES.kms){const pts=[];for(let i=o.i0;i<=Math.min(RR.length-1,o.i1+1);i++)pts.push([RR[i][1]/1e5,RR[i][2]/1e5]);all.push(...pts);
      o.line=LF.polyline(pts,{weight:7,opacity:.95,lineCap:'butt'}).addTo(kmLayer);o.line.on('click',()=>pick(o.k));
      o.line.bindTooltip(()=>`km ${o.k} · ${nf(o.A.m,0)} m de serviço · ${o.A.n} segmentos${o.A.cbuqM?` · ${o.A.tNone?'CBUQ sem dados':nf(o.A.t,1)+' t'}`:''}`,{sticky:true})}
    const key=RES.k+'|'+RES.kms[0].k+'|'+RES.kms[RES.kms.length-1].k;if(key!==mapKey){mapKey=key;setTimeout(()=>{map.invalidateSize();map.fitBounds(LF.latLngBounds(all),{padding:[16,16]})},60)}
    styleMap()}
  function styleMap(){if(!RES||RES.err||!kmLayer)return;const S=scale(RES.kms.map(o=>indVal(o.A,F.ind)));
    for(const o of RES.kms){if(!o.line)continue;const on=SEL&&o.k>=SEL.a&&o.k<=SEL.b;o.line.setStyle({color:S.col(indVal(o.A,F.ind)),weight:on?12:7});if(on)o.line.bringToFront()}}

  /* ---------- estratégia: continuidade, fragmentação e demanda ---------- */
  function renderStrat(){const {ks,A}=scopeA(),SDN=RES.SRC.SIDE;const all=RES.kms.filter(o=>o.A.n);
    const top=(arr,f,n=5)=>arr.slice().sort(f).slice(0,n);
    const cont=top(all.filter(o=>o.A.best),(x,y)=>y.A.best.len-x.A.best.len||y.A.pL-x.A.pL);
    const frag=top(all.filter(o=>o.A.n>=3),(x,y)=>y.A.frag-x.A.frag||y.A.nS-x.A.nS);
    const dem=top(all.filter(o=>o.A.cbuqM&&!o.A.tNone),(x,y)=>y.A.t-x.A.t);
    const li=(o,txt)=>`<li><button type="button" class="linkbtn" data-k="${o.k}">km ${o.k}</button> ${txt}</li>`;
    const solTxt=c=>`${c.code}${c.e!=null?' '+nf(c.e,c.e%1?1:0)+' cm':''}`;
    let h=`<div class="an-hl"><div><h4>Maior continuidade</h4><p class="note">Maior sequência na mesma pista e sentido, com a mesma solução e espessura e intervalos de até ${nf(F.gap,0)} m entre segmentos; desempate pela parcela dos metros em segmentos ≥ 100 m.</p><ol>${cont.map(o=>li(o,`· ${nf(o.A.best.len,0)} m seguidos (${solTxt(o.A.best)}, ${SDN[o.A.best.L0.side].toLowerCase()}, ${grpName(RES.k,o.A.best.L0.grp).toLowerCase()}) · ${nf(o.A.pL,0)}% em segmentos ≥ 100 m`)).join('')||'<li>—</li>'}</ol></div>
      <div><h4>Mais fragmentados</h4><p class="note">Mais segmentos por 100 m de serviço (mínimo de 3 segmentos no km): muitas trocas de posição da equipe para pouca extensão.</p><ol>${frag.map(o=>li(o,`· ${nf(o.A.frag,2)} seg./100 m · ${o.A.n} segmentos (${o.A.nS} com menos de 100 m) em ${nf(o.A.m,0)} m`)).join('')||'<li>—</li>'}</ol></div>
      <div><h4>Maior demanda de material</h4><p class="note">Maior massa estimada de CBUQ no km (extensão × largura × espessura × densidade).</p><ol>${dem.map(o=>li(o,`· ${nf(o.A.t,1)} t${o.A.tPartial?' (parcial)':''} · ${nf(o.A.vol,1)} m³`)).join('')||'<li>—</li>'}</ol></div></div>
      <p class="an-warn"><b>Potencial produtivo, não produtividade medida:</b> os destaques vêm só da geometria do projeto (extensão, continuidade e quantidades). A produtividade real depende da equipe, dos equipamentos, do fornecimento de material e das condições de campo, e só é medida pelos apontamentos executados.</p>`;
    // detalhamento do escopo
    const gl=new Map();for(const g of A.gaps){const key=g.L;let o=gl.get(key);if(!o){o={L0:g.L0,n:0,s:0,mx:0,near:0};gl.set(key,o)}o.n++;o.s+=g.g;o.mx=Math.max(o.mx,g.g);if(g.g<=F.gap)o.near++}
    h+=`<h3 class="an-h3">Frente selecionada: ${selLbl()}</h3><div class="an-kv"><span>Trocas de solução/espessura ao longo das pistas <b>${A.chgSol}</b></span><span>Trocas de faixa na sequência de execução <b>${A.chgLane}</b></span><span>Trocas de sentido <b>${A.chgSide}</b></span><span>Segmentos com ≥ 100 m <b>${nf(A.n?A.nL/A.n*100:0,0)}%</b></span></div>
      <div class="tscroll"><table class="q an-t"><thead><tr><th class="l">Sentido · pista</th><th>Intervalos</th><th>Distância média<small>m</small></th><th>Maior distância<small>m</small></th><th>Até ${nf(F.gap,0)} m</th></tr></thead><tbody>
      ${[...gl.values()].sort((x,y)=>(x.L0.side>y.L0.side?1:-1)).map(o=>`<tr><td class="l">${SDN[o.L0.side]} · ${esc(grpName(RES.k,o.L0.grp))}</td><td>${o.n}</td><td>${nf(o.s/o.n,0)}</td><td>${nf(o.mx,0)}</td><td>${o.near}</td></tr>`).join('')||'<tr><td class="l" colspan="5">Sem segmentos consecutivos na mesma pista e sentido.</td></tr>'}</tbody></table></div>
      <h4 class="an-h4">Sequências contínuas (mesma solução e espessura, intervalos até ${nf(F.gap,0)} m)</h4>
      <div class="tscroll"><table class="q an-t"><thead><tr><th class="l">Sentido · pista</th><th class="l">Solução</th><th>Estaca inicial</th><th>Estaca final</th><th>Segmentos</th><th>Extensão<small>m</small></th></tr></thead><tbody>
      ${A.chains.slice(0,8).map(c=>{const D=RES.SRC.Data,dec=c.L0.side==='D';return `<tr><td class="l">${SDN[c.L0.side]} · ${esc(grpName(RES.k,c.L0.grp))}</td><td class="l">${tagH(c.info)} ${esc(solName(c.code,c.info))}${c.e!=null?' · '+nf(c.e,c.e%1?1:0)+' cm':''}</td><td>${D.nameAt(dec?c.b:c.a)}</td><td>${D.nameAt(dec?c.a:c.b)}</td><td>${c.items.length}</td><td>${nf(c.len,0)}</td></tr>`}).join('')||'<tr><td class="l" colspan="6">—</td></tr>'}</tbody></table></div>`;
    $('aStrat').innerHTML=h;$('aStrat').querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{SEL={a:+b.dataset.k,b:+b.dataset.k};anchor=SEL.a;afterSel();$('aDiagCard').scrollIntoView({behavior:'smooth'})})}
  const tagH=inf=>`<span class="tag sm" style="background:${inf.color};color:${inf.ink}">${esc(inf.code)}</span>`;
  const solName=(code,inf)=>code==='FS'&&RES.k==='B4'?'Fresagem Superficial 3 cm':inf.desc;

  function renderKmTab(){const ks=RES.kms.slice(),s=F.sort;
    if(s!=='km')ks.sort((x,y)=>{const v=o=>s==='t'?(o.A.tNone?-1:o.A.t):o.A[s];return v(y)-v(x)});
    $('aKmTab').innerHTML=`<table class="q an-t"><thead><tr><th class="l sticky">Km</th><th>Metros de serviço<small>m</small></th><th>Área<small>m²</small></th><th>Volume<small>m³</small></th><th>CBUQ<small>t</small></th><th>Segmentos</th><th>≥ 100 m</th><th>&lt; 100 m</th><th>Ext. média<small>m</small></th><th>Fragmentação<small>seg./100 m</small></th><th>Maior sequência<small>m</small></th></tr></thead><tbody>
      ${ks.map(o=>{const A=o.A,on=SEL&&o.k>=SEL.a&&o.k<=SEL.b;return `<tr class="${on?'an-on':''}" data-k="${o.k}"><td class="l sticky"><button type="button" class="linkbtn" data-k="${o.k}">km ${o.k}</button></td><td>${nf(A.m,0)}</td><td>${nf(A.area,0)}</td><td>${nf(A.vol,1)}</td><td>${A.cbuqM?(A.tNone?'<small>sem dados</small>':nf(A.t,2)+(A.tPartial?'*':'')):'<small>—</small>'}</td><td>${A.n}</td><td>${A.nL}</td><td>${A.nS}</td><td>${A.n?nf(A.avg,0):'—'}</td><td>${A.n?nf(A.frag,2):'—'}</td><td>${A.best?nf(A.best.len,0):'—'}</td></tr>`}).join('')}</tbody></table>
      <p class="note" style="margin:8px 0 0">* CBUQ parcial: há segmentos sem largura ou espessura no km (não contados como zero). Metros de serviço somam todas as faixas e podem passar de 1.000 m por km.</p>`;
    $('aKmTab').querySelectorAll('button[data-k]').forEach(b=>b.onclick=()=>{SEL={a:+b.dataset.k,b:+b.dataset.k};anchor=SEL.a;afterSel()})}

  function segRows(){const {ks}=scopeA();const ps=execOrder(pieces(ks.flatMap(o=>o.parts)));const byL=new Map(),D=RES.SRC.Data;
    return ps.map(s=>{const prev=byL.get(s.L);byL.set(s.L,s);const dec=s.side==='D',gap=prev?(dec?prev.a-s.b:s.a-prev.b):null;const orig=RES.k==='B4'&&window.__SRC_B4.orig?window.__SRC_B4.orig(s.p):null;
      const st=Object.entries(s.st).sort((a,b)=>b[1]-a[1])[0];
      return {s,km:[...s.kms].sort((a,b)=>a-b).join(', '),ini:D.nameAt(dec?s.b:s.a),fim:D.nameAt(dec?s.a:s.b),gap:gap!=null?Math.max(0,gap):null,porte:s.tot>=100?'≥ 100 m':'< 100 m',
        sol:solName(s.p.code,s.p.info),orig:orig&&orig.sigla!==s.p.code?`${orig.sigla} – ${orig.nome}`:'',st:st?STATUS[st[0]]:'',
        tTxt:s.drn?'não se aplica':s.excl?'não leva CBUQ':s.miss?'sem dados':nf(s.t,2)}})}
  function renderSegTab(){const rows=segRows();
    $('aSegHead').textContent=`Segmentos — ${selLbl()} (${rows.length})`;
    $('aSegTab').innerHTML=`<table class="q an-t"><thead><tr><th class="l sticky">Segmento</th><th class="l">Km</th><th class="l">Sentido · pista</th><th class="l">Solução</th><th>Esp.<small>cm</small></th><th>Larg.<small>m</small></th><th>Est. inicial</th><th>Est. final</th><th>Ext. no escopo<small>m</small></th><th>Ext. total<small>m</small></th><th class="l">Porte</th><th>Área<small>m²</small></th><th>Volume<small>m³</small></th><th>CBUQ<small>t</small></th>${RES.stOn?'<th class="l">Status</th>':''}<th>Dist. ao anterior<small>m (mesma pista)</small></th></tr></thead><tbody>
      ${rows.slice(0,600).map(r=>{const s=r.s;return `<tr><td class="l sticky"><b>${esc(s.p.tag)}</b>${r.orig?`<small class="an-orig">no unifilar: ${esc(r.orig)}</small>`:''}</td><td class="l">${r.km}</td><td class="l">${RES.SRC.SIDE[s.side]} · ${esc(grpName(RES.k,s.grp))}</td><td class="l">${tagH(s.p.info)} ${esc(r.sol)}</td><td>${s.drn?'—':s.excl?'—':s.e>0?nf(s.e,s.e%1?1:0):'<small>sem dado</small>'}</td><td>${s.drn?'—':s.w>0?nf(s.w,2):'<small>sem dado</small>'}</td><td>${r.ini}</td><td>${r.fim}</td><td>${nf(s.len,0)}</td><td>${nf(s.tot,0)}</td><td class="l">${r.porte}</td><td>${s.drn?'—':nf(s.area,1)}</td><td>${s.drn||s.excl||s.miss?'—':nf(s.vol,2)}</td><td>${s.drn||s.excl||s.miss?`<small>${r.tTxt}</small>`:r.tTxt}</td>${RES.stOn?`<td class="l">${r.st}</td>`:''}<td>${r.gap==null?'—':nf(r.gap,0)}</td></tr>`}).join('')}</tbody></table>${rows.length>600?`<p class="note">Mostrando 600 de ${rows.length} segmentos; selecione menos km ou exporte para ver todos.</p>`:''}`}

  /* ---------- simulação da programação ---------- */
  function simulate(){const cap=num(SIM.cap),disp=num(SIM.disp),truck=num(SIM.truck),U=SIM.capU;const {ks}=scopeA();
    const ps=execOrder(pieces(ks.flatMap(o=>o.parts))).filter(s=>!s.drn);
    const miss=[];if(!(cap>0))miss.push('capacidade diária de execução');if(!(disp>0))miss.push('disponibilidade diária de CBUQ');if(!(truck>0))miss.push('capacidade do caminhão');
    if(miss.length)return {miss,ps};
    const need=s=>U==='m'?s.len:U==='m2'?s.area:s.t;
    const tot={m:0,m2:0,t:0,noT:0};for(const s of ps){tot.m+=s.len;tot.m2+=s.area||0;if(!s.excl&&!s.miss)tot.t+=s.t;else if(!s.excl)tot.noT++}
    const days=[];let d=null;const newDay=()=>{d={n:days.length+1,items:[],m:0,m2:0,t:0,capLeft:cap,tLeft:disp,lim:''};days.push(d)};newDay();
    for(const s of ps){const qs=need(s),tS=!s.excl&&!s.miss?s.t:0;if(U!=='m'&&(qs==null||!(qs>0))&&!(U==='t'&&s.excl)){d.items.push({s,f:1,skip:true});continue}
      let rest=1;let guard=0;const dec=s.side==='D',pos=fr=>dec?s.b-fr*s.len:s.a+fr*s.len;while(rest>1e-9&&guard++<10000){const qN=(U==='t'&&s.excl)?0:qs*rest,tN=tS*rest;
        let f=rest,lim='';if(qN>d.capLeft+1e-9){f=Math.min(f,rest*d.capLeft/qN);lim='equipe'}if(tN>d.tLeft+1e-9){const g=rest*d.tLeft/tN;if(g<f){f=g;lim='material'}}
        if(f>1e-9){const len=s.len*f;const done=1-rest;d.items.push({s,f,frac:f,len,area:(s.area||0)*f,t:tS*f,part:f<1-1e-9||rest<1-1e-9,ini:pos(done),fim:pos(done+f)});d.m+=len;d.m2+=(s.area||0)*f;d.t+=tS*f;d.capLeft-=(U==='t'&&s.excl)?0:qs*f;d.tLeft-=tS*f;rest-=f}
        if(rest>1e-9){d.lim=lim||(d.capLeft<=1e-9?'equipe':'material');newDay()}}}
    if(!d.items.length)days.pop();
    days.forEach(x=>{x.loads=x.t>0?Math.ceil(x.t/truck-1e-9):0;if(!x.lim)x.lim='fim do trecho'});
    const dEx=(U==='m'?tot.m:U==='m2'?tot.m2:tot.t)/cap,dMat=tot.t/disp;
    const nEq=days.filter(x=>x.lim==='equipe').length,nMat=days.filter(x=>x.lim==='material').length;
    return {ps,days,tot,cap,disp,truck,U,dEx,dMat,nEq,nMat,lim:nEq>=nMat?'equipe':'material',loads:days.reduce((a,x)=>a+x.loads,0)}}
  const UN={m:'m de serviço/dia',m2:'m²/dia',t:'t/dia'};
  function renderSim(){const r=simulate();$('aSimCap').value=SIM.cap;$('aSimU').value=SIM.capU;$('aSimDisp').value=SIM.disp;$('aSimTruck').value=SIM.truck;
    if(r.miss){$('aSimOut').innerHTML=`<div class="alert info"><b>Informe ${r.miss.join(', ')} para simular.</b>O painel não supõe capacidades nem tempos de execução: use os valores da equipe e do fornecimento previstos para a frente (${selLbl()}, ${r.ps.length} segmentos de pavimento).</div>`;return}
    if(!r.ps.length){$('aSimOut').innerHTML='<div class="alert info"><b>Sem segmentos de pavimento no escopo.</b>Selecione km com serviços de pavimento.</div>';return}
    const D=RES.SRC.Data;const limTxt=r.lim==='equipe'?'pela capacidade da equipe':'pelo fornecimento de CBUQ';
    $('aSimOut').innerHTML=`<div class="kpis an-sk"><div class="kpi main"><span>Dias estimados</span><b>${r.days.length}</b><div class="sub">limitado ${limTxt}</div></div><div class="kpi"><span>CBUQ do trecho</span><b>${nf(r.tot.t,1)}<small>t</small></b><div class="sub">${r.tot.noT?`${r.tot.noT} segmento${r.tot.noT>1?'s':''} sem dados fora da conta`:'todos os segmentos com dados'}</div></div>
      <div class="kpi"><span>Demanda diária de CBUQ</span><b>${nf(r.days.length?r.tot.t/r.days.length:0,1)}<small>t/dia</small></b><div class="sub">média; disponível ${nf(r.disp,1)} t/dia</div></div><div class="kpi"><span>Cargas estimadas</span><b>${r.loads}</b><div class="sub">caminhão de ${nf(r.truck,1)} t, arredondado por dia</div></div></div>
      <p class="note">Jornadas encerradas pela capacidade da equipe: <b>${r.nEq}</b> · pelo fornecimento de CBUQ: <b>${r.nMat}</b>. Só pela equipe seriam ${nf(r.dEx,1)} dias e só pelo material ${nf(r.dMat,1)} dias; como as duas restrições valem em cada jornada, a soma dia a dia pode passar do maior dos dois (dias com espessura maior esgotam o CBUQ antes da área).</p>
      <div class="tscroll"><table class="q an-t"><thead><tr><th class="l sticky">Jornada</th><th class="l">Segmentos (ordem de execução)</th><th>Metros<small>m</small></th><th>Área<small>m²</small></th><th>CBUQ<small>t</small></th><th>Cargas</th><th class="l">Fim da jornada</th></tr></thead><tbody>
      ${r.days.map(x=>`<tr><td class="l sticky"><b>Dia ${x.n}</b></td><td class="l an-items">${x.items.map(it=>{const s=it.s,dec=s.side==='D';if(it.skip)return `<span class="an-it sk">${esc(s.p.tag)} · sem dados para a unidade da capacidade</span>`;
        return `<span class="an-it">${tagH(s.p.info)} ${esc(s.p.tag)} · ${D.nameAt(it.ini)}–${D.nameAt(it.fim)} · ${nf(it.len,0)} m${it.part?' (parte do segmento)':''}</span>`}).join('')}</td><td>${nf(x.m,0)}</td><td>${nf(x.m2,0)}</td><td>${nf(x.t,1)}</td><td>${x.loads}</td><td class="l">${x.lim==='equipe'?'capacidade da equipe':x.lim==='material'?'fornecimento de CBUQ':'fim do trecho'}</td></tr>`).join('')}</tbody></table></div>
      <div class="an-prem"><b>Premissas:</b> capacidade de execução ${nf(r.cap,2)} ${UN[r.U]}; disponibilidade de CBUQ ${nf(r.disp,1)} t/dia; caminhão de ${nf(r.truck,1)} t. Segmentos na ordem de execução (crescente da menor para a maior estaca, depois decrescente da maior para a menor; faixa 1, faixa 2/3, acostamento). Um segmento que não cabe na jornada continua no dia seguinte (parcial). Quantidades pelo projeto (${RES.k==='B4'?'largura e espessura do unifilar':'largura e espessura do cadastro da calculadora'}, densidade ${nf(RES.C.dens,3)} t/m³); segmentos sem dados não entram nas toneladas. Não considera deslocamentos, clima, mobilização nem tempo de usina.</div>`;
    LASTSIM=r}
  let LASTSIM=null;

  /* ---------- exportação (Excel) ---------- */
  const XLSX_URL='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  const loadX=()=>new Promise((res,rej)=>{if(window.XLSX)return res();const s=document.createElement('script');s.src=XLSX_URL;s.onload=res;s.onerror=()=>rej(new Error('sem internet para carregar a biblioteca de planilhas'));document.head.appendChild(s)});
  async function exportX(){const m=$('aExpMsg');m.hidden=false;m.textContent='Gerando planilha…';try{await loadX()}catch(e){m.textContent='Não foi possível gerar: '+e.message;return}
    const X=window.XLSX,wb=X.utils.book_new(),{ks,A}=scopeA(),D=RES.SRC.Data;
    const resumo=[['Painel de análise por km'],['Obra',OBRAS[RES.k].nome],['Fonte',OBRAS[RES.k].fonte],['Escopo',selLbl()],['Km filtrados',F.kA||F.kB?`${F.kA||'início'} a ${F.kB||'fim'}`:'todos'],
      ['Pistas',F.lanes.map(g=>grpName(RES.k,g)).join(', ')],['Sentido',F.sent==='ALL'?'Ambos':RES.SRC.SIDE[F.sent]],['Soluções',RES.sol.join(', ')],['Status',RES.stOn?(F.st||Object.keys(STATUS)).map(s=>STATUS[s]).join(', '):'sem dados de execução para esta obra'],
      [],['Metros de serviço (m)',A.m],['Área (m²)',A.area],['Volume de CBUQ (m³)',A.vol],['Massa de CBUQ (t)',A.tNone?'sem dados':A.t],['CBUQ parcial',A.tPartial?`sim (${A.missN} segmentos sem largura ou espessura)`:'não'],
      ['Segmentos (únicos)',A.n],['Segmentos ≥ 100 m',A.nL],['Segmentos < 100 m',A.nS],['Extensão média (m)',A.avg],['Fragmentação (seg./100 m)',A.frag],
      [],['Regras'],['Porte do segmento','pela extensão total do segmento (≥ 100 m ou < 100 m), mesmo quando só parte dele está no km'],['Rateio por km','extensão, área e CBUQ pela parcela do segmento dentro de cada km (blocos de 20 m)'],
      ['Metros de serviço','soma das extensões de todas as faixas; pode passar de 1.000 m por km'],['Sequência contínua',`mesma pista e sentido, mesma solução e espessura, intervalos até ${F.gap} m`],['Dados ausentes','segmentos sem largura ou espessura ficam fora das toneladas e são sinalizados (não contam como zero)'],
      ...(RES.k==='B4'?[['Solução FS (Bloco 04)','Gap Graded (GAP), sigla G no unifilar, padronizada como FS — Fresagem Superficial 3 cm']]:[])];
    X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet(resumo),'Resumo');
    X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet([['Km','Metros de serviço (m)','Área (m²)','Volume (m³)','CBUQ (t)','CBUQ parcial','Segmentos','≥ 100 m','< 100 m','Ext. média (m)','Fragmentação (seg./100 m)','Maior sequência (m)',...RES.fams.map(f=>f+' (m)')],
      ...ks.map(o=>{const a=o.A;return [o.k,a.m,a.area,a.vol,a.cbuqM?(a.tNone?'sem dados':a.t):'',a.tPartial?'sim':'',a.n,a.nL,a.nS,a.avg,a.frag,a.best?a.best.len:'',...RES.fams.map(f=>a.bySol[f]||0)]})]),'Por km');
    X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet([['Segmento','Km','Sentido','Pista','Sigla','Solução','Sigla e nome no unifilar','Espessura (cm)','Origem da espessura','Largura (m)','Origem da largura','Estaca inicial','Estaca final','Ext. no escopo (m)','Ext. total (m)','Porte','Área (m²)','Volume (m³)','CBUQ (t)',...(RES.stOn?['Status']:[]),'Dist. ao anterior na mesma pista (m)'],
      ...segRows().map(r=>{const s=r.s;return [s.p.tag,r.km,RES.SRC.SIDE[s.side],grpName(RES.k,s.grp),s.p.code,r.sol,r.orig,s.drn||s.excl?'':s.e??'sem dado',s.drn?'':s.eFrom,s.drn?'':s.w??'sem dado',s.drn?'':s.wFrom,r.ini,r.fim,s.len,s.tot,r.porte,s.drn?'':s.area,s.drn||s.excl||s.miss?'':s.vol,s.drn||s.excl||s.miss?r.tTxt:s.t,...(RES.stOn?[r.st]:[]),r.gap??'']})]),'Segmentos');
    const r=simulate();
    if(r.days){X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet([['Programação simulada',selLbl()],['Capacidade de execução',`${r.cap} ${UN[r.U]}`],['Disponibilidade de CBUQ',`${r.disp} t/dia`],['Capacidade do caminhão',`${r.truck} t`],['Dias estimados',r.days.length],['Limitante',r.lim==='equipe'?'capacidade da equipe':'fornecimento de CBUQ'],['Cargas estimadas',r.loads],[],
      ['Dia','Segmento','Solução','Estaca inicial','Estaca final','Metros (m)','Parcial','CBUQ (t)','Fim da jornada'],
      ...r.days.flatMap(x=>x.items.filter(it=>!it.skip).map(it=>{const s=it.s,dec=s.side==='D';return [x.n,s.p.tag,s.p.code,D.nameAt(it.ini),D.nameAt(it.fim),it.len,it.part?'sim':'',it.t,x.lim==='equipe'?'capacidade da equipe':x.lim==='material'?'fornecimento de CBUQ':'fim do trecho']}))]),'Programação simulada')}
    const name=`Analise_km_${RES.k==='B4'?'BR-373_B4':'BR-277_B2B3'}_${SEL?('km'+SEL.a+(SEL.b!==SEL.a?'-'+SEL.b:'')):'filtrado'}.xlsx`;
    const blob=new Blob([X.write(wb,{bookType:'xlsx',type:'array'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),file=new File([blob],name,{type:blob.type});
    if(navigator.canShare&&navigator.canShare({files:[file]})&&/iPhone|iPad|Android/i.test(navigator.userAgent)){try{await navigator.share({files:[file],title:'Análise por km'});m.textContent='Planilha gerada e compartilhada.';return}catch(e){if(e&&e.name==='AbortError'){m.textContent='Compartilhamento cancelado.';return}}}
    const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);m.textContent=`Planilha gerada (${name}): resumo, por km, segmentos${r.days?' e programação simulada':''}.`}

  /* ---------- eventos ---------- */
  function init(){
    $('aObra').onchange=()=>{$('aExpMsg').hidden=true;F.obra=$('aObra').value;F.sol=null;F.st=null;SEL=null;mapKey='';saveF();refresh()};
    [['aKA','kA'],['aKB','kB']].forEach(([id,k])=>$(id).onchange=()=>{const v=$(id).value.trim();if(v===F[k])return;F[k]=v;saveF();refresh()});
    $('aSent').onchange=()=>{F.sent=$('aSent').value;saveF();refresh()};
    $('aInd').onchange=()=>{F.ind=$('aInd').value;saveF();renderDiag();styleMap()};
    $('aGap').onchange=()=>{const g=Math.max(0,num($('aGap').value)??20);if(g===F.gap)return;saveF();refresh()};
    $('aSort').onchange=()=>{F.sort=$('aSort').value;saveF();renderKmTab()};
    $('aRange').onchange=()=>{F.range=$('aRange').checked;anchor=SEL&&SEL.a===SEL.b?SEL.a:null;saveF()};
    $('aSolAll').onclick=()=>{F.sol=RES&&RES.fams?RES.fams.slice():null;saveF();refresh()};$('aSolPav').onclick=()=>{F.sol=null;saveF();refresh()};
    $('aReset').onclick=()=>{const o=F.obra;F=Object.assign({},DEF,{obra:o});SEL=null;saveF();refresh()};
    [['aSimCap','cap'],['aSimDisp','disp'],['aSimTruck','truck']].forEach(([id,k])=>$(id).addEventListener('input',()=>{SIM[k]=$(id).value;saveSim();renderSim()}));
    $('aSimU').onchange=()=>{SIM.capU=$('aSimU').value;saveSim();renderSim()};
    $('aExp').onclick=()=>exportX();
    refresh()}
  Router.onInit('analise',init);
  on('page',p=>{if(p==='analise'&&map)setTimeout(()=>map.invalidateSize(),60)});
  window.__ana=()=>({RES,SEL,F,sim:simulate(),scope:scopeA()});
})();

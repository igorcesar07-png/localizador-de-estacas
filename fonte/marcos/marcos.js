/* =====================================================================
   PÁGINA 7 — Marcos do trecho (bota-esperas, rotatórias, perímetros urbanos, entradas, água outorgada e observações)
   ===================================================================== */
(function MarcosPage(){
  const LF=window.L;
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  /*__UTM__*/
  const CATS={
    bota:{t:'Bota-espera',p:'Bota-esperas',c:'#8D5524',g:'<path d="M5 17h14l-3.2-6.5-2.3 2.6-2.4-4.6z" fill="#fff"/>'},
    rot:{t:'Rotatória',p:'Rotatórias',c:'#1565C0',g:'<circle cx="12" cy="12" r="5" fill="none" stroke="#fff" stroke-width="2.2"/><path d="M16.6 8.2l.9-3 1.6 3.4z" fill="#fff"/>'},
    perim:{t:'Perímetro urbano',p:'Perímetros urbanos',c:'#6A1B9A',g:'<path d="M6 18v-6l4-3 4 3v6zM14 18v-8l2.5-2 2.5 2v8z" fill="#fff"/>'},
    ent:{t:'Entrada',p:'Entradas',c:'#E65100',g:'<path d="M5 12h9M11 7.5l4.5 4.5L11 16.5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 6v12" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>'},
    agua:{t:'Coleta de água outorgada',p:'Coleta de água outorgada',c:'#00838F',g:'<path d="M12 5.5c-2.6 3.4-4.4 5.9-4.4 8a4.4 4.4 0 0 0 8.8 0c0-2.1-1.8-4.6-4.4-8z" fill="#fff"/>'},
    obs:{t:'Observação',p:'Observações',c:'#C8101A',g:'<path d="M12 6.5v7" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.5" fill="#fff"/>'}};
  const SHAPE={bota:'rect',rot:'circle',perim:'rect',ent:'diamond',agua:'circle',obs:'pin'};
  const ROD={'BR-277':{t:'BR-277 — Lotes 02 e 03',src:()=>typeof __SRC277!=='undefined'?__SRC277:null},'BR-373':{t:'BR-373 — Lote 04',src:()=>window.__SRC_B4||null}};
  const LOTE_C={2:'#1A1A1A',3:'#5B6770',4:'#C8101A'};
  const SENT={C:'Crescente',D:'Decrescente',A:'Ambos'};
  const FAR=300,VERYFAR=5000; // distância (m) entre a coordenada e o km informado para pedir conferência
  const canC=()=>can('marcos','create'),canE=()=>can('marcos','edit'),canD=()=>can('marcos','delete');
  let map=null,base=null,sat=null,routeL=null,stakeL=null,kmL=null,mkL=null,perimL=null,drnL=null;
  let ALL=[],SELID=null,PLACING=false,EDIT=null,unsub=null,MSG='';
  const F=Object.assign({cats:Object.keys(CATS),rod:'ALL',q:'',drn:true,flag:false},store.get('mkF',{}));
  const saveF=()=>store.set('mkF',F);

  /* ---------- armazenamento: Firestore (coleção "marcos", compartilhada) ou, sem login, o próprio aparelho ---------- */
  const DB=window.MarcosDB||{local:true,
    subscribe(cb){cb(store.get('marcos',[]));return ()=>{}},
    async save(m){const a=store.get('marcos',[]).filter(x=>x.id!==m.id);a.push(m);store.set('marcos',a);refreshLocal()},
    async saveMany(ms){const ids=new Set(ms.map(m=>m.id));const a=store.get('marcos',[]).filter(x=>!ids.has(x.id)).concat(ms);store.set('marcos',a);refreshLocal()},
    async del(id){store.set('marcos',store.get('marcos',[]).filter(x=>x.id!==id));refreshLocal()}};
  let localCb=null;function refreshLocal(){if(localCb)localCb(store.get('marcos',[]))}
  if(DB.local){const sub=DB.subscribe;DB.subscribe=cb=>{localCb=cb;return sub(cb)}}

  /* ---------- geometria: estaca ↔ coordenada ---------- */
  const hav=(a,b,c,d)=>{const r=Math.PI/180;const x=Math.sin((c-a)*r/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;return 2*6371000*Math.asin(Math.sqrt(x))};
  const ll=(S,i)=>[S.R[i][1]/1e5,S.R[i][2]/1e5];
  // posição de um km (ex.: 223+270) na base da rodovia, interpolada entre as estacas de 20 m
  function kmPos(rod,km){const S=ROD[rod]&&ROD[rod].src();if(!S||!km)return null;const r=S.Data.parseKm(km);if(r.err)return {err:r.err};
    const O=S.ODO;let lo=0,hi=O.length-1;if(r.s<=O[0])return {lat:ll(S,0)[0],lon:ll(S,0)[1],i:0,name:r.name,s:r.s};
    while(hi-lo>1){const m=(lo+hi)>>1;if(O[m]<=r.s)lo=m;else hi=m}const t=Math.max(0,Math.min(1,(r.s-O[lo])/Math.max(1,O[hi]-O[lo]))),a=ll(S,lo),b=ll(S,hi);
    return {lat:a[0]+(b[0]-a[0])*t,lon:a[1]+(b[1]-a[1])*t,i:lo,name:r.name,s:r.s}}
  // estaca mais próxima de uma coordenada (nas duas rodovias)
  function nearest(lat,lon,only){let best=null;for(const rod of Object.keys(ROD)){if(only&&rod!==only)continue;const S=ROD[rod].src();if(!S)continue;
      for(let i=0;i<S.R.length;i++){const d=hav(lat,lon,S.R[i][1]/1e5,S.R[i][2]/1e5);if(!best||d<best.d)best={rod,i,d,name:S.R[i][0],lote:S.R[i][4]}}}
    return best}
  const loteOf=(rod,km)=>{const p=kmPos(rod,km),S=ROD[rod]&&ROD[rod].src();return p&&!p.err&&S?S.R[p.i][4]:null};
  const fmtD=d=>d>=1000?nf(d/1000,1)+' km':nf(d,0)+' m';
  // posição usada no mapa e conferência entre coordenada e km
  function placeOf(m){let lat=m.lat,lon=m.lon;const kp=kmPos(m.rod,m.km);if((lat==null||lon==null)&&kp&&!kp.err){lat=kp.lat;lon=kp.lon}
    let dKm=null;if(kp&&!kp.err&&m.lat!=null&&m.lon!=null)dKm=hav(m.lat,m.lon,kp.lat,kp.lon);
    return {lat,lon,kp,dKm,flag:dKm!=null&&dKm>FAR?(dKm>VERYFAR?'muito longe':'conferir'):(kp&&kp.err?'km fora do trecho':null)}}

  /* ---------- ícones ---------- */
  function svgIcon(cat,o={}){const c=CATS[cat]||CATS.obs,sh=SHAPE[cat]||'circle',sz=o.sz||30;
    const bg=sh==='rect'?`<rect x="2" y="2" width="20" height="20" rx="5" fill="${c.c}" stroke="#fff" stroke-width="1.6"/>`:sh==='diamond'?`<rect x="4" y="4" width="16" height="16" rx="3" transform="rotate(45 12 12)" fill="${c.c}" stroke="#fff" stroke-width="1.6"/>`:
      sh==='pin'?`<path d="M12 23s-8-7.3-8-13a8 8 0 0 1 16 0c0 5.7-8 13-8 13z" fill="${c.c}" stroke="#fff" stroke-width="1.6"/>`:`<circle cx="12" cy="12" r="10" fill="${c.c}" stroke="#fff" stroke-width="1.6"/>`;
    const g=sh==='pin'?c.g.replace(/cy="17.2"/,'cy="15"').replace('M12 6.5v7','M12 5.5v6'):c.g;
    return `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" aria-hidden="true">${bg}${g}</svg>`}
  const divIcon=(m,pl)=>LF.divIcon({className:'mk-ic'+(pl.flag?' mk-flag':'')+(m.id===SELID?' mk-sel':''),html:svgIcon(m.cat)+(pl.flag?'<i class="mk-w">!</i>':''),iconSize:[30,30],iconAnchor:[15,m.cat==='obs'?28:15],popupAnchor:[0,-14]});

  /* ---------- mapa ---------- */
  function initMap(){if(map||!LF)return;map=LF.map('mkMap',{zoomControl:true,preferCanvas:true,maxZoom:20});
    base=LF.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:20,maxNativeZoom:19,attribution:'© OpenStreetMap'});
    sat=LF.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:20,maxNativeZoom:19,attribution:'Imagem © Esri'});
    (store.get('mkBase','osm')==='sat'?sat:base).addTo(map);
    routeL=LF.layerGroup().addTo(map);kmL=LF.layerGroup().addTo(map);stakeL=LF.layerGroup().addTo(map);perimL=LF.layerGroup().addTo(map);drnL=LF.layerGroup().addTo(map);mkL=LF.layerGroup().addTo(map);
    const all=[];for(const rod of Object.keys(ROD)){const S=ROD[rod].src();if(!S)continue;let seg=[],lote=null;
      const flush=()=>{if(seg.length>1)LF.polyline(seg,{color:LOTE_C[lote]||'#333',weight:5,opacity:.85}).bindTooltip(`${ROD[rod].t.split(' — ')[0]} · Lote ${String(lote).padStart(2,'0')}`,{sticky:true}).addTo(routeL)};
      for(let i=0;i<S.R.length;i++){const lo=S.R[i][4],p=ll(S,i);if(lo!==lote){flush();seg=seg.length?[seg[seg.length-1]]:[];lote=lo}seg.push(p);all.push(p)}flush()}
    if(all.length)map.fitBounds(LF.latLngBounds(all),{padding:[20,20]});
    map.on('zoomend moveend',drawStakes);map.on('click',e=>{if(PLACING){PLACING=false;$('mkMap').classList.remove('placing');openForm(null,{lat:e.latlng.lat,lng:e.latlng.lng})}});
    drawStakes()}
  // marcos de km sempre; estacas de 20 m a partir do zoom 15 (só na área visível)
  function drawStakes(){if(!map)return;kmL.clearLayers();stakeL.clearLayers();const z=map.getZoom(),b=map.getBounds().pad(.2);
    for(const rod of Object.keys(ROD)){const S=ROD[rod].src();if(!S)continue;let lastKm=null;
      for(let i=0;i<S.R.length;i++){const nm=S.R[i][0],k=S.R[i][5],p=ll(S,i);const first=k!==lastKm;lastKm=k;
        if(!b.contains(p))continue;
        if(first&&z>=11){const every=z>=13?1:z>=12?2:5;if(k%every===0)LF.marker(p,{icon:LF.divIcon({className:'mk-km',html:`<span>${rod==='BR-373'?'373':'277'} · km ${k}</span>`,iconSize:null}),interactive:false,keyboard:false}).addTo(kmL)}
        if(z>=15){LF.circleMarker(p,{radius:z>=17?4:2.6,color:'#fff',weight:1,fillColor:LOTE_C[S.R[i][4]]||'#333',fillOpacity:1,interactive:z>=16}).bindTooltip(`${nm} · ${rod} · Lote ${String(S.R[i][4]).padStart(2,'0')}`).addTo(stakeL);
          const mm=+String(nm).split('+')[1]||0,stp=z>=19?20:z>=18?40:100;if(z>=17&&!first&&mm%stp===0)LF.marker(p,{icon:LF.divIcon({className:'mk-st',html:`<span>${nm}</span>`,iconSize:null}),interactive:false,keyboard:false}).addTo(stakeL)}}}}
  function drawMarcos(){if(!map)return;mkL.clearLayers();perimL.clearLayers();drnL.clearLayers();
    for(const m of view()){const pl=placeOf(m);if(pl.lat==null)continue;
      if(m.cat==='perim'&&m.km&&m.kmFim){const a=kmPos(m.rod,m.km),b=kmPos(m.rod,m.kmFim);const S=ROD[m.rod].src();
        if(a&&b&&!a.err&&!b.err&&S){const i0=Math.min(a.i,b.i),i1=Math.max(a.i,b.i),pts=[];for(let i=i0;i<=i1+1&&i<S.R.length;i++)pts.push(ll(S,i));LF.polyline(pts,{color:CATS.perim.c,weight:14,opacity:.28,lineCap:'butt'}).addTo(perimL)}}
      const mk=LF.marker([pl.lat,pl.lon],{icon:divIcon(m,pl),draggable:false,title:`${CATS[m.cat].t}: ${m.nome||''} ${m.km||''}`,keyboard:true}).addTo(mkL);
      mk.bindPopup(()=>popupHtml(m,placeOf(m)),{maxWidth:340,minWidth:280,maxHeight:300,autoPanPadding:[16,16]});mk.on('popupopen',()=>{SELID=m.id;markList()});m.__mk=mk}
    if(F.drn)for(const o of drnObs()){LF.marker([o.lat,o.lon],{icon:LF.divIcon({className:'mk-ic mk-drn',html:svgIcon('obs',{sz:22}),iconSize:[22,22],iconAnchor:[11,21]}),title:'Observação da programação de dreno'}).bindPopup(`<div class="mk-pop"><b class="mk-pt">Observação da programação de dreno</b><div class="mk-kv"><span>Segmento</span><b>${esc(o.tag)}</b><span>Rodovia</span><b>${esc(o.rod)}</b><span>Estaca</span><b>${esc(o.km)}</b></div><p class="mk-obs">${esc(o.obs)}</p><p class="mk-note">Registrada na Calculadora de programação deste aparelho.</p></div>`).addTo(drnL)}}
  // observações escritas nos segmentos de dreno da Calculadora (deste aparelho)
  function drnObs(){const c=store.get('calc',null)||{},out=[];const bs=c.bySrc||{'277':c};
    for(const [k,b] of Object.entries(bs)){const rod=k==='B4'?'BR-373':'BR-277',S=ROD[rod].src();if(!S||!b||!b.obs)continue;
      for(const [tag,txt] of Object.entries(b.obs)){if(!txt)continue;const p=S.PANOS.find(x=>x.tag===tag);if(!p)continue;const q=ll(S,p.i0);out.push({tag,rod,km:S.R[p.i0][0],obs:txt,lat:q[0],lon:q[1]})}}
    return out}

  /* ---------- lista e filtros ---------- */
  const kmVal=m=>{const k=String(m.km||'').match(/^(\d+)\+(\d+)$/);return k?(+k[1])*10000+(+k[2]):1e9};
  function view(){const q=F.q.trim().toLowerCase();return ALL.filter(m=>F.cats.includes(m.cat)&&(F.rod==='ALL'||m.rod===F.rod)&&(!F.flag||placeOf(m).flag)&&
      (!q||[m.nome,m.km,m.kmFim,m.mun,m.obs,m.cad,CATS[m.cat].t,m.pdf&&m.pdf.tipo].join(' ').toLowerCase().includes(q))).sort((a,b)=>(a.rod>b.rod?1:a.rod<b.rod?-1:0)||kmVal(a)-kmVal(b))}
  function renderLegend(){const cnt=c=>ALL.filter(m=>m.cat===c).length;
    $('mkLeg').innerHTML=Object.entries(CATS).map(([k,c])=>`<button type="button" class="mk-lg" data-k="${k}" aria-pressed="${F.cats.includes(k)}">${svgIcon(k,{sz:24})}<span>${c.p}</span><b>${cnt(k)}</b></button>`).join('')+
      `<button type="button" class="mk-lg" data-k="drn" aria-pressed="${!!F.drn}">${svgIcon('obs',{sz:20})}<span>Observações do dreno (calculadora)</span><b>${drnObs().length}</b></button>`+
      `<div class="mk-lot">${[2,3,4].map(l=>`<span><i style="background:${LOTE_C[l]}"></i>Lote ${String(l).padStart(2,'0')}${l===4?' · BR-373':' · BR-277'}</span>`).join('')}<span><i class="mk-pb"></i>Perímetro urbano (trecho)</span><span><i class="mk-fl">!</i>Coordenada a conferir</span></div>`;
    $('mkLeg').querySelectorAll('.mk-lg').forEach(b=>b.onclick=()=>{const k=b.dataset.k;if(k==='drn')F.drn=!F.drn;else F.cats=F.cats.includes(k)?F.cats.filter(x=>x!==k):F.cats.concat(k);saveF();render()})}
  function renderList(){const v=view();$('mkCount').textContent=`${v.length} de ${ALL.length} marco${ALL.length!==1?'s':''}`;
    let h='',rod=null;for(const m of v){if(m.rod!==rod){rod=m.rod;h+=`<h4 class="mk-gh">${esc(ROD[rod]?ROD[rod].t:rod)}</h4>`}const pl=placeOf(m),lo=loteOf(m.rod,m.km);
      h+=`<button type="button" class="mk-it${m.id===SELID?' on':''}" data-id="${esc(m.id)}">${svgIcon(m.cat,{sz:26})}<span class="mk-t"><b>${esc(m.nome||CATS[m.cat].t)}</b><small>${esc(CATS[m.cat].t)} · km ${esc(m.km||'—')}${m.kmFim?' a '+esc(m.kmFim):''}${m.sent?' · '+SENT[m.sent]:''}${lo?' · Lote '+String(lo).padStart(2,'0'):''}${m.mun?' · '+esc(m.mun):''}</small></span>${pl.flag?`<span class="mk-fb" title="Coordenada a ${pl.dKm!=null?fmtD(pl.dKm):''} do km informado">conferir</span>`:''}</button>`}
    $('mkList').innerHTML=h||'<p class="note" style="padding:12px">Nenhum marco com estes filtros.</p>';
    $('mkList').querySelectorAll('.mk-it').forEach(b=>b.onclick=()=>focusMk(b.dataset.id))}
  function markList(){document.querySelectorAll('#mkList .mk-it').forEach(b=>b.classList.toggle('on',b.dataset.id===SELID))}
  function focusMk(id){const m=ALL.find(x=>x.id===id);if(!m)return;SELID=id;const pl=placeOf(m);if(pl.lat==null)return;$('mkMap').scrollIntoView({behavior:'smooth',block:'nearest'});
    map.setView([pl.lat,pl.lon],Math.max(map.getZoom(),16));setTimeout(()=>{if(m.__mk&&!m.__mk.isPopupOpen())m.__mk.openPopup()},250)}

  /* ---------- detalhe ---------- */
  function popupHtml(m,pl){const c=CATS[m.cat],lo=loteOf(m.rod,m.km),near=pl.lat!=null?nearest(pl.lat,pl.lon,m.rod):null,P=m.pdf||{};
    const kv=[['Rodovia',`${m.rod}${lo?' · Lote '+String(lo).padStart(2,'0'):''}`],['Km',`${m.km||'—'}${m.kmFim?' a '+m.kmFim:''}`],m.sent?['Sentido',SENT[m.sent]]:null,m.mun?['Município',m.mun]:null,
      ['Posição',m.lat!=null?(m.posSrc==='utm'?'coordenada UTM do documento':m.posSrc==='mapa'?'ajustada no mapa':'coordenada informada'):'na estaca do km'],
      near?['Estaca mais próxima',`${near.name} (${fmtD(near.d)})`]:null,pl.dKm!=null?['Distância ao km informado',fmtD(pl.dKm)]:null].filter(Boolean);
    const pk=[['Nº de cadastro',m.cad],['Tipo no documento',P.tipo],['Obra ou atividade',P.obra],['Data do cadastro',P.data],['Empreiteira',P.emp],['UTM (x · y)',P.x!=null?`${nf(P.x,2)} · ${nf(P.y,2)} (fuso ${P.zone||22}S)`:null],['Documento',P.doc]].filter(x=>x[1]);
    return `<div class="mk-pop"><div class="mk-ph" style="border-color:${c.c}">${svgIcon(m.cat,{sz:26})}<div><b class="mk-pt">${esc(m.nome||c.t)}</b><small>${esc(c.t)}</small></div></div>
      ${pl.flag?`<p class="mk-warn"><b>Conferir:</b> ${pl.flag==='km fora do trecho'?'o km informado não está no trecho desta rodovia.':`a coordenada está a ${fmtD(pl.dKm)} do km informado${near?`; a estaca mais próxima é ${esc(near.name)}`:''}.`}</p>`:''}
      <div class="mk-kv">${kv.map(([k,v])=>`<span>${k}</span><b>${esc(v)}</b>`).join('')}</div>${m.obs?`<p class="mk-obs">${esc(m.obs)}</p>`:''}
      ${pk.length?`<details class="mk-pdf"${m.pdf?' open':''}><summary>Informações do documento</summary><div class="mk-kv">${pk.map(([k,v])=>`<span>${k}</span><b>${esc(v)}</b>`).join('')}</div></details>`:''}
      ${m.upd?`<p class="mk-note">Atualizado em ${new Date(m.upd).toLocaleString('pt-BR')}${m.by?' por '+esc(m.by):''}</p>`:''}
      <div class="mk-pb2" data-id="${esc(m.id)}">${canE()?'<button type="button" class="secondary sm" data-a="edit">Editar</button><button type="button" class="secondary sm" data-a="move">Reposicionar no mapa</button>':''}${canE()&&m.km&&m.lat!=null?'<button type="button" class="secondary sm" data-a="tokm">Levar para o km</button>':''}${canD()?'<button type="button" class="secondary sm mk-del" data-a="del">Excluir</button>':''}</div></div>`}
  // botões do balão: um ouvinte só (captura), vale mesmo quando o balão é redesenhado
  async function popupAct(id,a){const m=ALL.find(x=>x.id===id),mk=m&&m.__mk;if(!m||!mk)return;
      if(a==='edit'){mk.closePopup();openForm(m)}
      if(a==='del'){if(!confirm(`Excluir "${m.nome||CATS[m.cat].t}" (km ${m.km||'—'})?`))return;mk.closePopup();await act(()=>DB.del(m.id),'Marco excluído.')}
      if(a==='tokm'){const kp=kmPos(m.rod,m.km);if(!kp||kp.err)return;mk.closePopup();await act(()=>DB.save(stamp(Object.assign({},clean(m),{lat:null,lon:null,posSrc:'km'}))),'Marco levado para a estaca do km '+m.km+'.')}
      if(a==='move'){mk.closePopup();mk.dragging.enable();mk.getElement().classList.add('mk-drag');info(`Arraste o marco "${esc(m.nome||CATS[m.cat].t)}" para a posição certa e solte para salvar.`);
        mk.once('dragend',async e=>{const p=e.target.getLatLng();mk.dragging.disable();const n=nearest(p.lat,p.lng,m.rod);
          await act(()=>DB.save(stamp(Object.assign({},clean(m),{lat:p.lat,lon:p.lng,posSrc:'mapa'}))),`Posição salva. Estaca mais próxima: ${n?n.name+' ('+fmtD(n.d)+')':'—'}.`)})}}
  const clean=m=>{const o={};for(const [k,v] of Object.entries(m))if(!k.startsWith('__')&&v!==undefined)o[k]=v;return o};
  const stamp=m=>Object.assign(m,{upd:Date.now(),by:(window.ACL&&ACL.user&&ACL.user.email)||''});
  async function act(fn,ok){try{await fn();info(ok,'ok')}catch(e){info('Não foi possível salvar: '+(e&&e.code==='permission-denied'?'sem permissão no servidor.':(e.message||e)),'bad')}}
  function info(t,k){const el=$('mkMsg');el.hidden=!t;el.className='mk-msg '+(k||'');el.innerHTML=t||''}

  /* ---------- formulário (novo / editar) ---------- */
  function openForm(m,at){if(m?!canE():!canC())return;EDIT=m?Object.assign({},clean(m)):{cat:'bota',rod:'BR-277',sent:'',posSrc:'km'};
    if(at){const n=nearest(at.lat,at.lng);EDIT.lat=at.lat;EDIT.lon=at.lng;EDIT.posSrc='mapa';if(n){EDIT.rod=n.rod;EDIT.km=n.name}}
    const e=EDIT,P=e.pdf||{};$('mkFT').textContent=m?'Editar marco':'Novo marco';
    $('mkFCat').innerHTML=Object.entries(CATS).map(([k,c])=>`<option value="${k}"${k===e.cat?' selected':''}>${c.t}</option>`).join('');
    $('mkFRod').value=e.rod||'BR-277';$('mkFKm').value=e.km||'';$('mkFKmF').value=e.kmFim||'';$('mkFSent').value=e.sent||'';$('mkFNome').value=e.nome||'';$('mkFMun').value=e.mun||'';$('mkFObs').value=e.obs||'';
    $('mkFCad').value=e.cad||'';$('mkFPTipo').value=P.tipo||'';$('mkFPObra').value=P.obra||'';$('mkFPData').value=P.data||'';$('mkFPEmp').value=P.emp||'';$('mkFPDoc').value=P.doc||'';
    $('mkFPos').value=e.lat!=null?(e.posSrc==='utm'?'utm':'coord'):'km';$('mkFLat').value=e.lat!=null?e.lat.toFixed(6):'';$('mkFLon').value=e.lon!=null?e.lon.toFixed(6):'';
    $('mkFE').value=P.x!=null?P.x:'';$('mkFN').value=P.y!=null?P.y:'';$('mkFErr').hidden=true;formSync();$('mkForm').hidden=false;setTimeout(()=>$('mkFKm').focus(),60)}
  function formSync(){const pos=$('mkFPos').value;$('mkFKmFW').hidden=$('mkFCat').value!=='perim';$('mkFLL').hidden=pos!=='coord';$('mkFUTM').hidden=pos!=='utm';
    const kp=kmPos($('mkFRod').value,$('mkFKm').value.trim());$('mkFKmHint').textContent=!$('mkFKm').value.trim()?'Formato 185+300.':kp&&kp.err?kp.err:kp?`Estaca ${kp.name} · Lote ${String(ROD[$('mkFRod').value].src().R[kp.i][4]).padStart(2,'0')}`:''}
  function readForm(){const e=EDIT,err=[];const km=$('mkFKm').value.trim(),rod=$('mkFRod').value,cat=$('mkFCat').value;
    const kp=km?kmPos(rod,km):null;if(!km)err.push('informe o km');else if(kp&&kp.err)err.push('km: '+kp.err);
    const kmFim=$('mkFKmF').value.trim();if(cat==='perim'&&kmFim){const k2=kmPos(rod,kmFim);if(k2&&k2.err)err.push('km final: '+k2.err)}
    const pos=$('mkFPos').value;let lat=null,lon=null,posSrc='km';const P=Object.assign({},e.pdf||{});
    const n=v=>{const x=parseFloat(String(v).replace(',','.'));return isFinite(x)?x:null};
    if(pos==='coord'){lat=n($('mkFLat').value);lon=n($('mkFLon').value);if(lat==null||lon==null||Math.abs(lat)>90||Math.abs(lon)>180)err.push('latitude e longitude em graus decimais (ex.: -25.4655 e -50.5080)');posSrc=e.posSrc==='mapa'?'mapa':'coord'}
    if(pos==='utm'){const E=n($('mkFE').value),N=n($('mkFN').value);if(E==null||N==null||E<100000||E>900000||N<1000000)err.push('coordenadas UTM (x entre 100.000 e 900.000; y em metros, fuso 22 Sul)');else{const q=utmToLL(E,N,22,true);lat=q.lat;lon=q.lon;posSrc='utm';P.x=E;P.y=N;P.zone=22}}
    ['tipo','obra','data','emp','doc'].forEach((k,i)=>{const v=$(['mkFPTipo','mkFPObra','mkFPData','mkFPEmp','mkFPDoc'][i]).value.trim();if(v)P[k]=v;else delete P[k]});
    const o={id:e.id||('m-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)),cat,rod,km:kp&&!kp.err?kp.name:km,sent:$('mkFSent').value||'',nome:$('mkFNome').value.trim(),mun:$('mkFMun').value.trim(),obs:$('mkFObs').value.trim(),cad:$('mkFCad').value.trim(),lat,lon,posSrc};
    if(cat==='perim'&&kmFim)o.kmFim=kmFim;if(Object.keys(P).length)o.pdf=P;return {o,err}}
  async function submitForm(ev){ev.preventDefault();const {o,err}=readForm();if(err.length){$('mkFErr').hidden=false;$('mkFErr').innerHTML='<b>Confira:</b> '+esc(err.join('; '))+'.';return}
    $('mkForm').hidden=true;SELID=o.id;await act(()=>DB.save(stamp(o)),`Marco "${esc(o.nome||CATS[o.cat].t)}" salvo no km ${esc(o.km)}.`);setTimeout(()=>focusMk(o.id),300)}

  /* ---------- importação: planilha do controle de áreas de apoio (ou CSV/JSON) ---------- */
  const XLSX_URL='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  const loadX=()=>new Promise((res,rej)=>{if(window.XLSX)return res();const s=document.createElement('script');s.src=XLSX_URL;s.onload=res;s.onerror=()=>rej(new Error('sem internet para ler a planilha'));document.head.appendChild(s)});
  const norm=s=>String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  const catOf=(c,t)=>{const s=norm(c+' '+t);return /bota|fresad|deposit/.test(s)?'bota':/rotat/.test(s)?'rot':/perimetro|urban/.test(s)?'perim':/entrada|acesso/.test(s)?'ent':/agua|outorg|captac/.test(s)?'agua':'obs'};
  async function importFile(f){let rows;if(/\.json$/i.test(f.name)){const d=JSON.parse(await f.text());rows=Array.isArray(d)?d:d.marcos||[];return rows.map(clean)}
    await loadX();const wb=XLSX.read(new Uint8Array(await f.arrayBuffer()),{type:'array'});const out=[];
    for(const sn of wb.SheetNames){const A=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:true,defval:''});let hi=A.findIndex(r=>r.some(c=>/^km$/.test(norm(c)))&&r.some(c=>/rodovia/.test(norm(c))));if(hi<0)continue;
      const H=A[hi].map(norm),col=re=>H.findIndex(h=>re.test(h));
      const ix={cad:col(/cadastro/),rod:col(/rodovia/),km:col(/^km( inicial)?$/),kmF:col(/km final/),sent:col(/sentido/),tipo:col(/^tipo/),cat:col(/categoria/),mun:col(/municipio/),x:col(/^x$|^este|^e$/),y:col(/^y$|^norte|^n$/),lat:col(/^lat/),lon:col(/^lon|^long/),obra:col(/obra|atividade/),data:col(/data/),emp:col(/empreiteira|responsavel/),nome:col(/nome|descricao/),obs:col(/observ/)};
      for(const r of A.slice(hi+1)){const g=k=>ix[k]>=0?r[ix[k]]:'';const km=String(g('km')).trim();const rodRaw=String(g('rod')).replace(/\s/g,'').toUpperCase().replace(/^BR(\d)/,'BR-$1');if(!km||!/^BR-(277|373)$/.test(rodRaw))continue;
        const P={};if(g('tipo'))P.tipo=String(g('tipo'));if(g('obra'))P.obra=String(g('obra'));if(g('data'))P.data=typeof g('data')==='number'?XLSX.SSF.format('dd/mm/yyyy',g('data')):String(g('data'));if(g('emp'))P.emp=String(g('emp'));P.doc=f.name;
        let lat=null,lon=null,posSrc='km';const x=parseFloat(String(g('x')).replace(',','.')),y=parseFloat(String(g('y')).replace(',','.'));
        if(isFinite(x)&&isFinite(y)&&x>100000&&y>1000000){const q=utmToLL(x,y,22,true);lat=q.lat;lon=q.lon;posSrc='utm';P.x=x;P.y=y;P.zone=22}
        else{const la=parseFloat(String(g('lat')).replace(',','.')),lo=parseFloat(String(g('lon')).replace(',','.'));if(isFinite(la)&&isFinite(lo)){lat=la;lon=lo;posSrc='coord'}}
        const cad=String(g('cad')).trim(),cat=g('cat')?catOf(g('cat'),''):catOf('',g('tipo'));const s0=norm(g('sent'));
        out.push({id:cad?'cad-'+cad.replace(/[^\w-]/g,'_'):'imp-'+norm(rodRaw+km+cat).replace(/[^\w]/g,''),cat,rod:rodRaw,km,...(g('kmF')?{kmFim:String(g('kmF'))}:{}),sent:/^c/.test(s0)?'C':/^d/.test(s0)?'D':/amb/.test(s0)?'A':'',
          nome:String(g('nome')||'')||(cat==='bota'?`Bota-espera ${cad||km}`:''),mun:String(g('mun')||''),obs:String(g('obs')||''),cad,lat,lon,posSrc,pdf:P})}}
    return out}
  let PEND=null;
  async function onImport(f){const m=$('mkImpMsg');m.hidden=false;m.className='mk-msg';m.textContent='Lendo o arquivo…';
    try{const rows=await importFile(f);if(!rows.length)throw new Error('nenhuma linha com rodovia (BR-277 ou BR-373) e km. Use a planilha do controle de áreas de apoio ou um arquivo exportado por esta página');
      const ids=new Set(ALL.map(x=>x.id)),nNew=rows.filter(r=>!ids.has(r.id)).length,fl=rows.map(r=>({r,p:placeOf(r)})).filter(x=>x.p.flag);
      const byCat=Object.entries(rows.reduce((a,r)=>(a[r.cat]=(a[r.cat]||0)+1,a),{})).map(([k,n])=>`${n} ${n>1?CATS[k].p.toLowerCase():CATS[k].t.toLowerCase()}`).join(', ');
      PEND=rows;m.innerHTML=`<b>${rows.length} marcos lidos</b> (${byCat}): ${nNew} novo${nNew!==1?'s':''} e ${rows.length-nNew} atualizado${rows.length-nNew!==1?'s':''} pelo nº de cadastro.`+
        (fl.length?`<br><b>${fl.length} com coordenada longe do km informado</b> (ficam marcados para conferir): ${fl.map(x=>`${esc(x.r.cad||x.r.km)} (${x.p.dKm!=null?fmtD(x.p.dKm):x.p.flag})`).join(', ')}.`:'')+
        `<div class="mk-ib"><button type="button" class="primary sm" id="mkImpOk">Gravar no mapa</button><button type="button" class="secondary sm" id="mkImpNo">Cancelar</button></div>`;
      $('mkImpOk').onclick=async()=>{const r=PEND;PEND=null;m.textContent='Gravando…';try{await (DB.saveMany?DB.saveMany(r.map(stamp)):Promise.all(r.map(x=>DB.save(stamp(x)))));m.className='mk-msg ok';m.textContent=`${r.length} marcos gravados.`}catch(e){m.className='mk-msg bad';m.textContent='Não foi possível gravar: '+(e.code==='permission-denied'?'sem permissão no servidor.':e.message)}};
      $('mkImpNo').onclick=()=>{PEND=null;m.hidden=true}}
    catch(e){m.className='mk-msg bad';m.textContent='Não foi possível importar: '+(e.message||e)}}
  async function onExport(){try{await loadX()}catch(e){info(e.message,'bad');return}
    const H=['Categoria','Nome','Rodovia','Lote','Km','Km final','Sentido','Município','Latitude','Longitude','Origem da posição','Estaca mais próxima','Distância ao km (m)','Conferir','Nº de cadastro','Tipo no documento','Obra ou atividade','Data do cadastro','Empreiteira','UTM x','UTM y','Documento','Observações','Atualizado em','Por'];
    const rows=view().map(m=>{const pl=placeOf(m),n=pl.lat!=null?nearest(pl.lat,pl.lon,m.rod):null,P=m.pdf||{},lo=loteOf(m.rod,m.km);
      return [CATS[m.cat].t,m.nome||'',m.rod,lo?String(lo).padStart(2,'0'):'',m.km||'',m.kmFim||'',m.sent?SENT[m.sent]:'',m.mun||'',pl.lat,pl.lon,m.lat==null?'estaca do km':m.posSrc==='utm'?'UTM do documento':m.posSrc==='mapa'?'ajustada no mapa':'coordenada informada',n?n.name:'',pl.dKm!=null?Math.round(pl.dKm):'',pl.flag||'',m.cad||'',P.tipo||'',P.obra||'',P.data||'',P.emp||'',P.x??'',P.y??'',P.doc||'',m.obs||'',m.upd?new Date(m.upd).toLocaleString('pt-BR'):'',m.by||'']});
    const ws=XLSX.utils.aoa_to_sheet([H,...rows]),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Marcos do trecho');
    const name=`Marcos_do_trecho_${new Date().toISOString().slice(0,10)}.xlsx`,blob=new Blob([XLSX.write(wb,{bookType:'xlsx',type:'array'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const file=new File([blob],name,{type:blob.type});if(navigator.canShare&&navigator.canShare({files:[file]})&&/iPhone|iPad|Android/i.test(navigator.userAgent)){try{await navigator.share({files:[file],title:'Marcos do trecho'});return}catch(e){if(e&&e.name==='AbortError')return}}
    const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);info(`Planilha gerada (${name}) com ${rows.length} marcos.`,'ok')}

  /* ---------- tela ---------- */
  function render(){renderLegend();renderList();drawMarcos()}
  function init(){
    $('mkMode').hidden=!DB.local;$('mkMode').innerHTML=DB.local?'Sem login: os marcos ficam salvos só neste aparelho.':'';
    ['mkAdd','mkImpL'].forEach(id=>$(id).hidden=!canC());
    $('mkRod').value=F.rod;$('mkQ').value=F.q;$('mkFlag').checked=!!F.flag;
    $('mkRod').onchange=()=>{F.rod=$('mkRod').value;saveF();render()};$('mkQ').oninput=()=>{F.q=$('mkQ').value;saveF();renderList();drawMarcos()};$('mkFlag').onchange=()=>{F.flag=$('mkFlag').checked;saveF();render()};
    $('mkAdd').onclick=()=>{PLACING=!PLACING;$('mkMap').classList.toggle('placing',PLACING);info(PLACING?'Toque no mapa onde fica o novo marco. O km e a rodovia vêm da estaca mais próxima e podem ser ajustados. <button type="button" class="linkbtn" id="mkAddKm">Prefiro informar pelo km</button>':'');
      const k=$('mkAddKm');if(k)k.onclick=()=>{PLACING=false;$('mkMap').classList.remove('placing');info('');openForm(null)}};
    $('mkSat').onclick=()=>{const s=map.hasLayer(sat);if(s){map.removeLayer(sat);base.addTo(map)}else{map.removeLayer(base);sat.addTo(map)}store.set('mkBase',s?'osm':'sat');$('mkSat').textContent=s?'Satélite':'Mapa'};$('mkSat').textContent=store.get('mkBase','osm')==='sat'?'Mapa':'Satélite';
    $('mkFile').onchange=e=>{const f=e.target.files&&e.target.files[0];e.target.value='';if(f)onImport(f)};
    $('mkExp').onclick=onExport;
    $('mkFormEl').onsubmit=submitForm;$('mkFCancel').onclick=()=>$('mkForm').hidden=true;['mkFCat','mkFPos','mkFRod'].forEach(id=>$(id).onchange=formSync);$('mkFKm').oninput=formSync;
    $('mkForm').addEventListener('click',e=>{if(e.target.id==='mkForm')$('mkForm').hidden=true});
    initMap();
    $('mkMap').addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.mk-pb2 [data-a]');if(!b)return;e.stopPropagation();popupAct(b.parentElement.dataset.id,b.dataset.a)},true);
    unsub=DB.subscribe((list,err)=>{if(err){info('Não foi possível ler os marcos do servidor ('+(err.code||err.message)+').','bad');return}ALL=(list||[]).filter(m=>m&&CATS[m.cat]&&ROD[m.rod]);render()})}
  Router.onInit('marcos',init);
  on('page',p=>{if(p==='marcos'&&map)setTimeout(()=>{map.invalidateSize();drawStakes();renderLegend()},60)});
  window.__marcos=()=>({ALL,view:view(),placeOf,kmPos,nearest,utmToLL,drn:drnObs()});
})();

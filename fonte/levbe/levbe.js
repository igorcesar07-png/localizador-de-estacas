/* =====================================================================
   PÁGINA 8 — Levantamento de Bota-Espera (registro em deslocamento + lista de registros)
   Página nova e independente: só LÊ o que já existe (Road.pick, Loc/GPS, store, can, Router).
   Dados: coleção "levantamento_bota_espera" (um documento por registro, id gerado no aparelho)
   e "levantamento_bota_espera_midia" (fotos e áudios comprimidos, um documento por arquivo).
   ===================================================================== */
(function LevBotaEsperaPage(){
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const pad2=n=>String(n).padStart(2,'0');
  const fmtDT=t=>{const d=new Date(t);return `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`};
  const fmtD=t=>{const d=new Date(t);return `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${d.getFullYear()}`};
  const canC=()=>can('levbe','create'),canE=()=>can('levbe','edit'),canD=()=>can('levbe','delete');
  const MODEL_V=1;
  // contratos informados pelo usuário (Lotes 02 e 03 → BR-277; Lote 04 → BR-373)
  const CONTRATO={'277':'VIAR-GDA-430/2026','B4':'VIAR-GDA-470/2026'};
  const ORD_ROD={'BR-277/PR':0,'BR-373/PR':1};
  const OCUP={VAZIO:{t:'Vazio',c:'lv-g'},PELA_METADE:{t:'Pela metade',c:'lv-y'},LOTADO:{t:'Lotado',c:'lv-r'}};
  const TIPO={EXISTENTE:'Bota-espera existente',LOCAL_POSSIVEL:'Local possível'};
  const PISTA={CRESCENTE:'Pista Crescente',DECRESCENTE:'Pista Decrescente'};
  const BTN=[
    {k:'VAZIO',tipo:'EXISTENTE',oc:'VAZIO',t:'VAZIO',s:'Bota-espera existente',c:'lv-g',ic:'<rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/>'},
    {k:'PELA_METADE',tipo:'EXISTENTE',oc:'PELA_METADE',t:'PELA METADE',s:'Bota-espera existente',c:'lv-y',ic:'<rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M5 12h14v6H5z" fill="currentColor"/>'},
    {k:'LOTADO',tipo:'EXISTENTE',oc:'LOTADO',t:'LOTADO',s:'Bota-espera existente',c:'lv-r',ic:'<rect x="4" y="5" width="16" height="14" rx="2" fill="currentColor"/><path d="M8 9l8 6M16 9l-8 6" stroke="#fff" stroke-width="2"/>'},
    {k:'LOCAL',tipo:'LOCAL_POSSIVEL',oc:null,t:'LOCAL POSSÍVEL',s:'para bota-espera',c:'lv-b',ic:'<path d="M12 21s-6-5.4-6-10a6 6 0 0 1 12 0c0 4.6-6 10-6 10z" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 8v6M9 11h6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'}];
  const BY_K=Object.fromEntries(BTN.map(b=>[b.k,b]));
  const uuid=()=>{try{if(crypto.randomUUID)return crypto.randomUUID()}catch(e){}const b=new Uint8Array(16);crypto.getRandomValues(b);b[6]=b[6]&15|64;b[8]=b[8]&63|128;const h=[...b].map(x=>x.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`};
  const me=()=>{const u=window.ACL&&ACL.user;return u?{email:u.email,name:u.name||u.email}:{email:'local',name:'Este aparelho'}};

  /* ---------- armazenamento: Firestore (LevDB, criado no login) ou, sem login, só o aparelho ---------- */
  const IDB=(()=>{let p=null;const open=()=>p||(p=new Promise((res,rej)=>{const r=indexedDB.open('levbe_midia',1);r.onupgradeneeded=()=>r.result.createObjectStore('m',{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
    const tx=async(mode,fn)=>{const db=await open();return new Promise((res,rej)=>{const x=db.transaction('m',mode);const q=fn(x.objectStore('m'));x.oncomplete=()=>res(q&&q.result);x.onerror=()=>rej(x.error)})};
    return {put:o=>tx('readwrite',s=>s.put(o)),get:id=>tx('readonly',s=>s.get(id))}})();
  const DB=window.LevDB||{local:true,
    subscribe(cb){LCB=cb;cb(store.get('levbe.recs',[]).map(r=>({...r,__pend:false})));return ()=>{}},
    async save(r){const a=store.get('levbe.recs',[]).filter(x=>x.id!==r.id);a.push(r);store.set('levbe.recs',a);if(LCB)LCB(a.map(x=>({...x,__pend:false})))},
    saveMedia:m=>IDB.put(m),getMedia:id=>IDB.get(id)};
  let LCB=null;
  const clean=r=>{const x={};for(const [k,v] of Object.entries(r))if(!k.startsWith('__'))x[k]=v===undefined?null:v;return x};
  const put=r=>{const p=DB.save(clean(r));if(p&&p.catch)p.catch(e=>toast(`Não foi possível gravar no servidor: ${e&&e.code==='permission-denied'?'sem permissão':(e&&e.message)||e}`,'bad'));return p};

  let ALL=[];const BYID=new Map();
  function setAll(list,err){if(err){toast('Sem acesso aos registros do levantamento.','bad');return}ALL=list||[];BYID.clear();ALL.forEach(r=>BYID.set(r.id,r));refresh()}

  /* ---------- posição e sentido ---------- */
  // sentido pela tendência das estacas: 3 leituras seguidas no mesmo sentido somando ≥ 20 m (para inverter um sentido já definido: 4 leituras e ≥ 40 m);
  // abaixo de ~5 km/h mantém o último sentido; saltos do GPS são ignorados; o usuário pode travar o sentido
  const DIR=(()=>{const st={sent:null,mode:store.get('levbe.mode','AUTO'),run:null,prev:null,k:null};
    const V_MIN=5/3.6;
    function reset(){st.run=null;st.prev=null}
    function feed(o,t){if(!o||o.r.outside){return}const s=o.r.s;
      if(st.k!==o.k){if(st.k!=null)st.sent=null;st.k=o.k;reset()}   // outra rodovia: a tendência anterior não vale
      const p=st.prev;st.prev={s,t};if(!p)return;const dt=(t-p.t)/1000;if(dt<0.3)return;const ds=s-p.s;
      if(Math.abs(ds)>Math.max(300,70*dt)){st.run=null;return}           // salto do GPS
      if(Math.abs(ds)/dt<V_MIN){st.run=null;return}                     // parado ou devagar: mantém o sentido
      const sg=Math.sign(ds);if(!st.run||st.run.sg!==sg)st.run={sg,n:0,cum:0};
      st.run.n++;st.run.cum+=Math.abs(ds);
      const want=sg>0?'C':'D';if(want===st.sent)return;
      const need=st.sent?{n:4,m:40}:{n:3,m:20};
      if(st.run.n>=need.n&&st.run.cum>=need.m)st.sent=want}
    const cur=()=>st.mode==='C'||st.mode==='D'?st.mode:st.sent;
    function setMode(m){st.mode=m;store.set('levbe.mode',m)}
    return {feed,cur,setMode,st}})();
  let FIX=null;   // última leitura do GPS já resolvida para rodovia/estaca
  function onPos(s){if(s.src!=='gps'||s.lat==null)return;const t=Loc.gps.lastFix||Date.now();
    if(FIX&&FIX.lat===s.lat&&FIX.lon===s.lon&&t-FIX.t<500)return;   // mesma leitura vinda do espelho da outra rodovia
    const o=Road.pick(s.lat,s.lon,s.acc);FIX={lat:s.lat,lon:s.lon,acc:s.acc,t,o};DIR.feed(o,t);if(Router.cur()==='levbe')renderTop()}
  on('position',onPos);on('gps',()=>{if(Router.cur()==='levbe')renderTop()});

  /* ---------- tela de registro ---------- */
  let ORIENT=null;
  function renderTop(){const g=Loc.gps,f=FIX,o=f&&f.o,sent=DIR.cur(),age=f?(Date.now()-f.t)/1000:Infinity;
    const sEl=$('lvSent');sEl.className='lv-sent '+(sent==='C'?'up':sent==='D'?'down':'none');
    sEl.innerHTML=sent==='C'?'<b>↑ CRESCENTE</b>':sent==='D'?'<b>↓ DECRESCENTE</b>':'<b>SENTIDO ?</b>';
    $('lvSentHow').textContent=DIR.st.mode==='AUTO'?(sent?'automático':'ande alguns metros ou trave'):'travado';
    document.querySelectorAll('#lvMode [data-m]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.m===DIR.st.mode)));
    $('lvCtr').textContent=o?`${CONTRATO[o.k]} · ${o.rod}`:'—';$('lvLote').textContent=o?(o.r.outside?'fora do trecho':o.loteTxt):'—';
    const acc=f&&age<=15?f.acc:null;const ge=$('lvAcc');ge.textContent=acc==null?(g.status==='waiting'?'buscando':g.status==='error'?'sem permissão':'sem GPS'):`±${Math.round(acc)} m`;
    ge.className=acc==null?'bad':acc<=10?'good':acc<=20?'mid':'poor';
    if(o&&!o.r.outside){$('lvSt').textContent=o.name;$('lvSt').classList.remove('out');$('lvRod').textContent=o.label;$('lvAx').textContent=Math.abs(o.r.main.lat)<1?'no eixo':`${nf(Math.abs(o.r.main.lat),1)} m do eixo`}
    else if(o){$('lvSt').textContent='Fora do trecho';$('lvSt').classList.add('out');$('lvRod').textContent='mais próxima: '+o.nearest+' · '+o.rod;$('lvAx').textContent=fmtM(o.r.dist)}
    else{$('lvSt').textContent='—';$('lvRod').textContent=g.status==='waiting'?'Buscando sua posição…':'Aguardando GPS';$('lvAx').textContent=''}
    const stale=f&&age>15;$('lvWarn').hidden=!stale;if(stale)$('lvWarn').textContent=`Última posição há ${Math.round(age)} s: procure céu aberto.`;
    fit();orient(sent)}
  // estaca sempre inteira no quadro central (mesmo ajuste da tela de localização)
  function fit(){const el=$('lvSt'),box=el.parentElement.clientWidth-16;if(!box)return;el.style.fontSize='';const w=el.scrollWidth;if(w>box)el.style.fontSize=Math.floor(parseFloat(getComputedStyle(el).fontSize)*box/w)+'px'}
  window.addEventListener('resize',()=>{if(Router.cur()==='levbe')fit()});
  // lado DIREITO = pista em que estou; ESQUERDO = pista oposta (sem sentido definido: crescente à direita)
  function orient(sent){const right=sent==='D'?'DECRESCENTE':'CRESCENTE';if(ORIENT===right)return;
    const cols=[...document.querySelectorAll('#lvGrid .lv-col')];const before=new Map(cols.map(c=>[c,c.getBoundingClientRect()]));
    cols.forEach(c=>{const isR=c.dataset.p===right;c.classList.toggle('lv-right',isR);c.classList.toggle('lv-left',!isR);
      c.querySelector('.lv-side').textContent=isR?'minha pista':'pista oposta'});
    if(ORIENT!=null)cols.forEach(c=>{const a=before.get(c),b=c.getBoundingClientRect(),dx=a.left-b.left;if(!dx)return;
      c.style.transition='none';c.style.transform=`translateX(${dx}px)`;requestAnimationFrame(()=>requestAnimationFrame(()=>{c.style.transition='transform .45s cubic-bezier(.2,.7,.2,1)';c.style.transform=''}))});
    ORIENT=right}
  function colHtml(p){return `<div class="lv-col" data-p="${p}"><div class="lv-ch"><b>PISTA ${p}</b><small class="lv-side"></small></div>
    ${BTN.map(b=>`<button type="button" class="lv-btn ${b.c}" data-k="${b.k}" data-p="${p}" data-acl="levbe:create" aria-label="${b.t} — ${b.s} — ${PISTA[p]}"><svg viewBox="0 0 24 24" aria-hidden="true">${b.ic}</svg><span><b>${b.t}</b><small>${b.s}</small></span></button>`).join('')}</div>`}

  // registro com um toque
  let LASTTAP=0;
  function tap(k,pista){if(!canC()){toast('Sem permissão para registrar.','bad');return}const now=Date.now();if(now-LASTTAP<600)return;LASTTAP=now;
    const f=FIX,b=BY_K[k];if(!f||now-f.t>10000||!f.o){buzz([60,60,60]);toast('Sem posição do GPS: registro não feito. Aguarde o sinal.','bad');return}
    const o=f.o,out=o.r.outside,S=o.S,sent=DIR.cur(),u=me();
    const i=out?o.r.nearest:o.i;
    const r={id:uuid(),v:MODEL_V,criado_em:now,criado_por:u.email,usuario:u.name,lat:+f.lat.toFixed(7),lon:+f.lon.toFixed(7),precisao_m:f.acc==null?null:Math.round(f.acc*10)/10,
      rodovia:o.rod,contrato:CONTRATO[o.k],lote:S.R[i][4],estaca:S.R[i][0],offset_m:out?null:o.d,estaca_txt:out?null:o.name,odometro_m:out?Math.round(S.ODO[i]):Math.round(o.r.s*10)/10,
      dist_eixo_m:out?Math.round(o.r.dist):Math.round(o.r.main.lat*10)/10,fora_trecho:out,
      sentido_desloc:sent==='C'?'CRESCENTE':sent==='D'?'DECRESCENTE':null,sentido_modo:DIR.st.mode==='AUTO'?'AUTO':'TRAVADO',
      pista,tipo:b.tipo,ocupacao:b.oc,obs:'',fotos:[],audios:[],complemento_ok:false,
      excluido:false,excluido_em:null,excluido_por:null,excluido_motivo:null,atualizado_em:now,atualizado_por:u.email,area_m2:null,dmt_fresado_km:null};
    BYID.set(r.id,{...r,__pend:true});put(r);buzz(40);
    const what=b.tipo==='EXISTENTE'?OCUP[b.oc].t:'Local possível';
    toast(`${what} registrado: Est. ${out?r.estaca+' (fora do trecho)':r.estaca_txt}, ${PISTA[pista]}`,b.c,()=>undo(r.id));flash(k,pista)}
  function undo(id){const r=BYID.get(id);if(!r)return;const u=me();put({...r,excluido:true,excluido_em:Date.now(),excluido_por:u.email,excluido_motivo:'DESFEITO',atualizado_em:Date.now(),atualizado_por:u.email});toast('Registro desfeito.','')}
  function buzz(p){try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}}
  function flash(k,p){const el=document.querySelector(`#lvGrid .lv-btn[data-k="${k}"][data-p="${p}"]`);if(!el)return;el.classList.remove('lv-hit');void el.offsetWidth;el.classList.add('lv-hit')}
  let TT=0;function toast(msg,cls,undoFn){const t=$('lvToast');clearTimeout(TT);t.className='lv-toast '+(cls||'');t.innerHTML=`<span>${esc(msg)}</span>${undoFn?'<button type="button" id="lvUndo">DESFAZER</button>':''}`;t.hidden=false;
    if(undoFn)$('lvUndo').onclick=()=>{clearTimeout(TT);t.hidden=true;undoFn()};TT=setTimeout(()=>{t.hidden=true},undoFn?5000:3500)}

  /* ---------- tela ligada enquanto a página estiver aberta ---------- */
  let WL=null;async function wake(){try{if('wakeLock' in navigator&&!WL){WL=await navigator.wakeLock.request('screen');WL.addEventListener('release',()=>{WL=null})}}catch(e){WL=null}}
  function sleep(){try{WL&&WL.release()}catch(e){}WL=null}
  document.addEventListener('visibilitychange',()=>{if(Router.cur()==='levbe'&&document.visibilityState==='visible')wake()});

  /* ---------- lista de registros ---------- */
  const F=Object.assign({ctr:'ALL',lote:'ALL',pista:'ALL',tipo:'ALL',oc:'ALL',data:'ALL',pend:false,exc:false},store.get('levbe.f',{}));
  const saveF=()=>store.set('levbe.f',F);
  const live=()=>ALL.filter(r=>!r.excluido);
  const pendC=r=>!r.excluido&&!r.complemento_ok&&!(r.obs||'').trim()&&!(r.fotos||[]).length&&!(r.audios||[]).length;
  // possível duplicado: mesmo tipo, mesma pista e mesma rodovia a menos de 50 m (pela estaca), sem bloquear
  function dupOf(r){if(r.excluido)return [];return live().filter(x=>x.id!==r.id&&x.rodovia===r.rodovia&&x.pista===r.pista&&x.tipo===r.tipo&&Math.abs((x.odometro_m||0)-(r.odometro_m||0))<50)}
  const sync=r=>DB.local?'SÓ NO APARELHO':r.__pend?'PENDENTE DE ENVIO':'SINCRONIZADO';
  const sortK=(a,b)=>(ORD_ROD[a.rodovia]-ORD_ROD[b.rodovia])||((a.odometro_m||0)-(b.odometro_m||0))||(a.criado_em-b.criado_em);
  function filtered(){return ALL.filter(r=>(F.exc||!r.excluido)&&(F.ctr==='ALL'||r.contrato===F.ctr)&&(F.lote==='ALL'||String(r.lote)===F.lote)&&(F.pista==='ALL'||r.pista===F.pista)
    &&(F.tipo==='ALL'||r.tipo===F.tipo)&&(F.oc==='ALL'||r.ocupacao===F.oc)&&(F.data==='ALL'||fmtD(r.criado_em)===F.data)&&(!F.pend||pendC(r))).sort(sortK)}
  function renderFilters(){const opt=(id,vals,cur)=>{$(id).innerHTML=vals.map(([v,t])=>`<option value="${esc(v)}"${String(v)===String(cur)?' selected':''}>${esc(t)}</option>`).join('')};
    opt('lvFCtr',[['ALL','Todos'],[CONTRATO['277'],CONTRATO['277']+' · BR-277/PR'],[CONTRATO.B4,CONTRATO.B4+' · BR-373/PR']],F.ctr);
    opt('lvFLote',[['ALL','Todos'],['2','Lote 02'],['3','Lote 03'],['4','Lote 04']],F.lote);
    opt('lvFPista',[['ALL','Ambas'],['CRESCENTE','Crescente'],['DECRESCENTE','Decrescente']],F.pista);
    opt('lvFTipo',[['ALL','Todos'],['EXISTENTE','Bota-espera existente'],['LOCAL_POSSIVEL','Local possível']],F.tipo);
    opt('lvFOc',[['ALL','Todas'],['VAZIO','Vazio'],['PELA_METADE','Pela metade'],['LOTADO','Lotado']],F.oc);
    const ds=[...new Set(ALL.map(r=>fmtD(r.criado_em)))].sort((a,b)=>b.split('/').reverse().join('').localeCompare(a.split('/').reverse().join('')));
    if(F.data!=='ALL'&&!ds.includes(F.data))F.data='ALL';opt('lvFData',[['ALL','Todas'],...ds.map(d=>[d,d])],F.data);
    $('lvFPend').checked=F.pend;$('lvFExc').checked=F.exc}
  function renderList(){if(!$('lvList'))return;renderFilters();const L=filtered(),np=ALL.filter(pendC).length;
    $('lvCnt').textContent=`${L.length} de ${live().length}`;$('lvTabN').textContent=live().length||'';
    $('lvPendBtn').textContent=np?`Pendentes de complemento: ${np}`:'Nenhum pendente de complemento';$('lvPendBtn').disabled=!np;
    $('lvMode0').hidden=!DB.local;
    $('lvItems').innerHTML=L.length?L.map(r=>{const d=dupOf(r),b=r.tipo==='EXISTENTE'?BY_K[r.ocupacao]:BY_K.LOCAL;
      return `<div class="lv-it${r.excluido?' lv-exc':''}${pendC(r)?' lv-pendit':''}" data-id="${esc(r.id)}"><i class="lv-dot ${b?b.c:''}" aria-hidden="true"></i><div class="lv-itb">
        <b>${esc(r.estaca_txt||r.estaca)}${r.fora_trecho?' <em class="lv-tag">fora do trecho</em>':''} · ${esc(PISTA[r.pista]||r.pista)}</b>
        <span>${esc(r.tipo==='EXISTENTE'?'Existente — '+(OCUP[r.ocupacao]||{t:r.ocupacao}).t:'Local possível')}</span>
        <small>${esc(r.rodovia)} · Lote ${pad2(r.lote)} · ${esc(r.contrato)} · ${fmtDT(r.criado_em)} · ${esc(r.usuario||r.criado_por)}</small>
        <small>${(r.fotos||[]).length?`📷 ${(r.fotos||[]).length} `:''}${(r.audios||[]).length?`🎙 ${(r.audios||[]).length} `:''}${r.obs?'📝 '+esc(r.obs.slice(0,80)):''}</small>
        <div class="lv-tags">${r.excluido?`<em class="lv-tag bad">excluído${r.excluido_motivo==='DESFEITO'?' (desfeito)':''}</em>`:''}${pendC(r)?'<em class="lv-tag">pendente de complemento</em>':''}${d.length?`<em class="lv-tag warn">possível duplicado (${d.length} a menos de 50 m)</em>`:''}<em class="lv-tag ${r.__pend?'warn':''}">${sync(r)}</em><em class="lv-tag lv-dist" hidden></em></div></div>
        ${r.excluido?'':`<button type="button" class="secondary lv-ed" data-ed="${esc(r.id)}">${canE()||(canC()&&r.criado_por===me().email)?'Complementar':'Ver'}</button>`}</div>`}).join(''):'<p class="note">Nenhum registro neste filtro.</p>';
    $('lvItems').querySelectorAll('[data-ed]').forEach(b=>b.onclick=()=>openEd(b.dataset.ed));near()}
  function refresh(){renderList();upPend();if($('lvEd')&&!$('lvEd').hidden&&ED)edMedia()}
  [['lvFCtr','ctr'],['lvFLote','lote'],['lvFPista','pista'],['lvFTipo','tipo'],['lvFOc','oc'],['lvFData','data']].forEach(([id,k])=>$(id).onchange=e=>{F[k]=e.target.value;saveF();renderList()});
  $('lvFPend').onchange=e=>{F.pend=e.target.checked;saveF();renderList()};$('lvFExc').onchange=e=>{F.exc=e.target.checked;saveF();renderList()};
  $('lvPendBtn').onclick=()=>{F.pend=true;saveF();renderList()};

  /* ---------- complemento / edição ---------- */
  let ED=null,REC=null;
  const mayEdit=r=>canE()||(canC()&&r.criado_por===me().email);
  function openEd(id){const r=BYID.get(id);if(!r)return;ED={...r,fotos:[...(r.fotos||[])],audios:[...(r.audios||[])]};const w=mayEdit(r);
    $('lvEdT').textContent=`${r.estaca_txt||r.estaca} · ${PISTA[r.pista]}`;
    $('lvEdInfo').innerHTML=`${esc(r.rodovia)} · Lote ${pad2(r.lote)} · ${esc(r.contrato)}<br>${fmtDT(r.criado_em)} · ${esc(r.usuario||r.criado_por)} · ${r.lat}, ${r.lon} (±${r.precisao_m==null?'—':nf(r.precisao_m,1)} m)<br>Sentido de deslocamento: ${esc(r.sentido_desloc?r.sentido_desloc.toLowerCase():'não definido')} (${r.sentido_modo==='TRAVADO'?'travado':'automático'})`;
    $('lvEdTipo').value=r.tipo==='EXISTENTE'?r.ocupacao:'LOCAL';$('lvEdPista').value=r.pista;$('lvEdObs').value=r.obs||'';$('lvEdOk').checked=!!r.complemento_ok;
    ['lvEdTipo','lvEdPista','lvEdObs','lvEdOk'].forEach(i=>$(i).disabled=!w);$('lvEdAddF').hidden=!w;$('lvEdRec').hidden=!w||!window.MediaRecorder;$('lvEdSave').hidden=!w;
    $('lvEdDel').hidden=!(canD()||(canC()&&r.criado_por===me().email));$('lvEdMsg').textContent='';edMedia();$('lvEd').hidden=false}
  const MEDIA=new Map();
  async function media(id){if(MEDIA.has(id))return MEDIA.get(id);try{const m=await DB.getMedia(id);if(m)MEDIA.set(id,m);return m}catch(e){return null}}
  async function edMedia(){if(!ED)return;const box=$('lvEdMedia');const ids=[...ED.fotos.map(i=>['foto',i]),...ED.audios.map(i=>['audio',i])];
    if(!ids.length){box.innerHTML='<p class="note">Sem fotos nem áudios.</p>';return}
    box.innerHTML=ids.map(([t,i])=>`<div class="lv-m" data-mid="${esc(i)}">${t==='foto'?'<span class="note">carregando foto…</span>':'<span class="note">carregando áudio…</span>'}</div>`).join('');
    for(const [t,i] of ids){const m=await media(i);const el=box.querySelector(`[data-mid="${CSS.escape(i)}"]`);if(!el)continue;
      el.innerHTML=!m?'<span class="note">arquivo ainda não disponível neste aparelho (sem internet?)</span>':t==='foto'?`<img src="${m.data}" alt="Foto do registro">`:`<audio controls src="${m.data}"></audio>`}}
  async function comprImg(file){const u=URL.createObjectURL(file);try{const img=await new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=u});
      let side=1600,q=0.72,out='';for(let k=0;k<8;k++){const sc=Math.min(1,side/Math.max(img.naturalWidth,img.naturalHeight));const c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*sc);c.height=Math.round(img.naturalHeight*sc);
        c.getContext('2d').drawImage(img,0,0,c.width,c.height);out=c.toDataURL('image/jpeg',q);if(out.length<700000)break;if(q>0.5)q-=0.1;else side=Math.round(side*0.8)}
      return out}finally{URL.revokeObjectURL(u)}}
  async function addMedia(tipo,mime,data){if(data.length>950000)throw new Error('arquivo grande demais');const m={id:uuid(),reg:ED.id,tipo,mime,data,bytes:Math.round(data.length*0.75),criado_em:Date.now(),criado_por:me().email};
    const p=DB.saveMedia(m);if(p&&p.catch)p.catch(e=>toast('Não foi possível gravar o arquivo no servidor.','bad'));MEDIA.set(m.id,m);(tipo==='foto'?ED.fotos:ED.audios).push(m.id);edMedia();return m}
  $('lvEdFile').onchange=async e=>{const fs=[...(e.target.files||[])];e.target.value='';for(const f of fs){try{$('lvEdMsg').textContent='Comprimindo foto…';await addMedia('foto','image/jpeg',await comprImg(f));$('lvEdMsg').textContent='Foto adicionada. Toque em Salvar.'}catch(x){$('lvEdMsg').textContent='Não foi possível usar a foto: '+(x.message||x)}}};
  $('lvEdRec').onclick=async()=>{if(REC){REC.stop();return}try{const st=await navigator.mediaDevices.getUserMedia({audio:true});
      const mt=['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(t=>MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(t))||'';
      const mr=new MediaRecorder(st,mt?{mimeType:mt,audioBitsPerSecond:32000}:undefined),ch=[];REC=mr;let left=30;$('lvEdRec').textContent='■ Parar (30 s)';
      const iv=setInterval(()=>{left--;$('lvEdRec').textContent=`■ Parar (${left} s)`;if(left<=0)mr.stop()},1000);
      mr.ondataavailable=e=>e.data.size&&ch.push(e.data);
      mr.onstop=async()=>{clearInterval(iv);st.getTracks().forEach(t=>t.stop());REC=null;$('lvEdRec').textContent='🎙 Gravar áudio (até 30 s)';
        const blob=new Blob(ch,{type:mr.mimeType||mt||'audio/webm'});const data=await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(blob)});
        try{await addMedia('audio',blob.type,data);$('lvEdMsg').textContent='Áudio adicionado. Toque em Salvar.'}catch(x){$('lvEdMsg').textContent='Áudio grande demais.'}};
      mr.start()}catch(e){$('lvEdMsg').textContent='Microfone indisponível ou sem permissão.'}};
  $('lvEdSave').onclick=()=>{if(!ED)return;const k=$('lvEdTipo').value,b=BY_K[k],u=me();const prev=BYID.get(ED.id)||ED;
    const n={...prev,tipo:b.tipo,ocupacao:b.oc,pista:$('lvEdPista').value,obs:$('lvEdObs').value.trim().slice(0,2000),fotos:ED.fotos,audios:ED.audios,complemento_ok:$('lvEdOk').checked,
      atualizado_em:Date.now(),atualizado_por:u.email};
    if(n.tipo!==prev.tipo||n.ocupacao!==prev.ocupacao||n.pista!==prev.pista)n.corrigido_de=`${prev.tipo}/${prev.ocupacao||'-'}/${prev.pista}`;
    BYID.set(n.id,{...n,__pend:true});put(n);closeEd();toast('Registro atualizado.','')};
  $('lvEdDel').onclick=()=>{if(!ED)return;if(!confirm('Excluir este registro? Ele fica marcado como excluído e não aparece mais na lista nem na exportação.'))return;const u=me(),prev=BYID.get(ED.id)||ED;
    put({...prev,excluido:true,excluido_em:Date.now(),excluido_por:u.email,excluido_motivo:'EXCLUIDO',atualizado_em:Date.now(),atualizado_por:u.email});closeEd();toast('Registro excluído.','')};
  function closeEd(){if(REC)try{REC.stop()}catch(e){}$('lvEd').hidden=true;ED=null}
  $('lvEdClose').onclick=closeEd;$('lvEd').addEventListener('click',e=>{if(e.target.id==='lvEd')closeEd()});

  /* ---------- exportação (Excel e CSV) ---------- */
  const link=id=>`${location.origin}${location.pathname}?lbmidia=${encodeURIComponent(id)}#levbe`;
  const HEAD=['ID','Data/hora','Usuário','E-mail','Latitude','Longitude','Precisão GPS (m)','Rodovia','Contrato','Lote','Estaca','Offset (m)','Estaca + offset','Odômetro (m)','Distância ao eixo (m)','Fora do trecho',
    'Sentido de deslocamento','Sentido (modo)','Pista do registro','Tipo','Ocupação','Status de sincronização','Possível duplicado','Pendente de complemento','Observação','Fotos (links)','Áudios (links)',
    'Correção (antes)','Excluído','Excluído em','Excluído por','Motivo da exclusão','Atualizado em','Atualizado por','Área (m²) — etapa futura','DMT do fresado (km) — etapa futura'];
  function rowOf(r){const sn=b=>b?'Sim':'Não';return [r.id,fmtDT(r.criado_em),r.usuario||'',r.criado_por||'',r.lat,r.lon,r.precisao_m,r.rodovia,r.contrato,r.lote==null?'':'Lote '+pad2(r.lote),r.estaca,r.offset_m,r.estaca_txt||'',r.odometro_m,r.dist_eixo_m,sn(r.fora_trecho),
    r.sentido_desloc||'NÃO DEFINIDO',r.sentido_modo,r.pista,r.tipo,r.ocupacao||'',sync(r),sn(dupOf(r).length),sn(pendC(r)),r.obs||'',(r.fotos||[]).map(link).join(' | '),(r.audios||[]).map(link).join(' | '),
    r.corrigido_de||'',sn(r.excluido),r.excluido_em?fmtDT(r.excluido_em):'',r.excluido_por||'',r.excluido_motivo||'',r.atualizado_em?fmtDT(r.atualizado_em):'',r.atualizado_por||'',r.area_m2==null?'':r.area_m2,r.dmt_fresado_km==null?'':r.dmt_fresado_km]}
  const fname=ext=>`Levantamento_bota-espera_${new Date().toISOString().slice(0,10)}.${ext}`;
  async function give(blob,name){const file=new File([blob],name,{type:blob.type});if(navigator.canShare&&navigator.canShare({files:[file]})&&/iPhone|iPad|Android/i.test(navigator.userAgent)){try{await navigator.share({files:[file],title:'Levantamento de bota-espera'});return}catch(e){if(e&&e.name==='AbortError')return}}
    const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000)}
  function exportCsv(){const L=filtered();if(!L.length){toast('Nada para exportar neste filtro.','');return}
    // separador ";" e decimal com vírgula: abre direto no Excel em português; BOM para os acentos
    const cell=v=>{if(v==null)return '';if(typeof v==='number')return String(v).replace('.',',');const s=String(v);return /[;"\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
    const txt='﻿'+[HEAD,...L.map(rowOf)].map(r=>r.map(cell).join(';')).join('\r\n');give(new Blob([txt],{type:'text/csv;charset=utf-8'}),fname('csv'));toast(`CSV gerado com ${L.length} registros.`,'')}
  const XLSX_URL='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  const loadX=()=>new Promise((res,rej)=>{if(window.XLSX)return res();const s=document.createElement('script');s.src=XLSX_URL;s.onload=res;s.onerror=()=>rej(new Error('sem internet para carregar a biblioteca do Excel: use Exportar CSV'));document.head.appendChild(s)});
  async function exportXlsx(){const L=filtered();if(!L.length){toast('Nada para exportar neste filtro.','');return}
    try{await loadX()}catch(e){toast(e.message,'bad');return}
    const ws=XLSX.utils.aoa_to_sheet([HEAD,...L.map(rowOf)]);ws['!cols']=HEAD.map((h,i)=>({wch:i===0?38:Math.max(10,Math.min(40,h.length+2))}));ws['!autofilter']={ref:XLSX.utils.encode_range({s:{r:0,c:0},e:{r:L.length,c:HEAD.length-1}})};
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Levantamento');
    give(new Blob([XLSX.write(wb,{bookType:'xlsx',type:'array'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),fname('xlsx'));toast(`Excel gerado com ${L.length} registros.`,'')}
  $('lvXlsx').onclick=exportXlsx;$('lvCsv').onclick=exportCsv;

  /* ---------- link de foto/áudio da exportação (?lbmidia=id) ---------- */
  async function openMediaLink(){const id=new URLSearchParams(location.search).get('lbmidia');if(!id)return;
    $('lvMv').hidden=false;$('lvMvBody').innerHTML='<p class="note">Carregando…</p>';const m=await media(id);
    $('lvMvBody').innerHTML=!m?'<p class="note">Arquivo não encontrado ou sem acesso.</p>':m.tipo==='foto'?`<img src="${m.data}" alt="Foto do levantamento">`:`<audio controls src="${m.data}"></audio>`;
    const r=m&&BYID.get(m.reg);$('lvMvT').textContent=r?`${r.estaca_txt||r.estaca} · ${PISTA[r.pista]} · ${fmtDT(r.criado_em)}`:'Arquivo do levantamento'}
  $('lvMvClose').onclick=()=>{$('lvMv').hidden=true;try{history.replaceState(null,'',location.pathname+location.hash)}catch(e){}};

  /* ---------- aba Registros: estaca atual e pendentes de complemento por perto ---------- */
  // Só lê o que já existe: a mesma leitura do GPS da tela de registro (FIX) e o sentido detectado (DIR).
  // Pendente "por perto" = registro sem complemento, que este usuário pode complementar, a até NEAR_M da posição atual.
  const NEAR_M=500;
  const hav=(a,b,c,d)=>{const R=6371000,k=Math.PI/180,x=(c-a)*k,y=(d-b)*k,h=Math.sin(x/2)**2+Math.cos(a*k)*Math.cos(c*k)*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(h))};
  const fmtDist=m=>m<1000?Math.max(10,Math.round(m/10)*10)+'\u00a0m':nf(m/1000,1)+'\u00a0km';
  // distância até o registro: pela estaca, na mesma rodovia (com lado: à frente / atrás conforme o sentido); senão, em linha reta
  function rel(r,f){const o=f.o,sent=DIR.cur();
    if(o&&!o.r.outside&&r.rodovia===o.rod&&r.odometro_m!=null){const ds=r.odometro_m-o.r.s,dist=Math.abs(ds);
      return {dist,side:dist<20?'aqui':!sent?null:(sent==='C'?ds>0:ds<0)?'frente':'atras'}}
    return r.lat==null||f.lat==null?null:{dist:hav(f.lat,f.lon,r.lat,r.lon),side:null}}
  const relTxt=x=>x.side==='aqui'?'você está aqui':fmtDist(x.dist)+(x.side==='frente'?' à frente':x.side==='atras'?' atrás':'');
  const kindTxt=r=>r.tipo==='EXISTENTE'?'Existente — '+(OCUP[r.ocupacao]||{t:r.ocupacao}).t:'Local possível';
  const NOTIF=new Set();let UTOUCH=0,HN='';
  function setHN(cls,key,html,dyn){const hn=$('lvHNear');hn.hidden=false;hn.className='lv-hnear '+cls;
    if(HN!==key){HN=key;hn.innerHTML=html}else{const d=hn.querySelector('.lv-hnd');if(d&&d.textContent!==dyn)d.textContent=dyn}}
  function near(){if(!$('lvHere')||$('lvList').hidden)return;const f=FIX,o=f&&f.o,age=f?(Date.now()-f.t)/1000:Infinity,sent=DIR.cur(),ok=!!f&&age<=30;
    // posição atual
    if(o&&!o.r.outside){$('lvHSt').textContent=o.name;$('lvHSt').classList.remove('out');$('lvHRod').textContent=o.label+(sent?` · ${sent==='C'?'↑\u00a0crescente':'↓\u00a0decrescente'}`:'')}
    else if(o){$('lvHSt').textContent='Fora do trecho';$('lvHSt').classList.add('out');$('lvHRod').textContent='mais próxima: '+o.nearest+' · '+o.rod}
    else{$('lvHSt').textContent='—';$('lvHSt').classList.remove('out');$('lvHRod').textContent=Loc.gps.status==='waiting'?'Buscando sua posição…':'Aguardando GPS'}
    $('lvHAcc').textContent=!f?'':age>15?`posição de ${Math.round(age)} s atrás: procure céu aberto`:f.acc==null?'':`GPS ±${Math.round(f.acc)} m`;
    // pendentes que eu posso complementar, do mais perto ao mais longe
    const P=ok?ALL.filter(r=>pendC(r)&&mayEdit(r)).map(r=>({r,x:rel(r,f)})).filter(p=>p.x).sort((a,b)=>a.x.dist-b.x.dist):[];
    const close=P.filter(p=>p.x.dist<=NEAR_M),isClose=new Set(close.map(p=>p.r.id));
    // registros da lista: distância de cada um e destaque dos pendentes por perto
    const els=[...$('lvItems').querySelectorAll('.lv-it[data-id]')];
    els.forEach(el=>{const r=BYID.get(el.dataset.id),t=el.querySelector('.lv-dist');if(!r||!t)return;const x=ok&&!r.excluido?rel(r,f):null,nr=isClose.has(r.id);
      el.classList.toggle('lv-near',nr);t.hidden=!x;t.classList.toggle('near',nr);if(x){const s=(nr?'PERTO · ':'')+'📍 '+relTxt(x);if(t.textContent!==s)t.textContent=s}});
    marker(els,ok?o:null);
    // aviso no topo
    if(!ok)$('lvHNear').hidden=true;
    else if(close.length){const p=close.find(q=>q.x.side==='aqui')||close.find(q=>q.x.side==='frente')||close[0],r=p.r,dyn=relTxt(p.x);   // prefere o que ainda vem pela frente
      setHN('on',`near|${r.id}|${close.length}`,`<div class="lv-hnt"><b>⚠ Pendente de complemento · <span class="lv-hnd">${esc(dyn)}</span></b><span>Est. ${esc(r.estaca_txt||r.estaca)} · ${esc(PISTA[r.pista]||r.pista)} · ${esc(kindTxt(r))}</span>${close.length>1?`<small>+${close.length-1} pendente${close.length>2?'s':''} a menos de ${NEAR_M} m</small>`:''}</div><button type="button" class="lv-hb lv-hb1" data-hed="${esc(r.id)}">Complementar</button><button type="button" class="lv-hb" data-hgo="${esc(r.id)}">Ver na lista</button>`,dyn)}
    else if(P.length){const p=P.find(q=>q.x.side==='frente')||P[0],r=p.r,dyn=relTxt(p.x);
      setHN('',`next|${r.id}|${P.length}`,`<div class="lv-hnt"><span>Próximo pendente: <b>Est. ${esc(r.estaca_txt||r.estaca)}</b> · ${esc(PISTA[r.pista]||r.pista)} · <b class="lv-hnd">${esc(dyn)}</b></span><small>${P.length} pendente${P.length>1?'s':''} de complemento</small></div><button type="button" class="lv-hb" data-hgo="${esc(r.id)}">Ver</button>`,dyn)}
    else setHN('none','none','<div class="lv-hnt"><span>✓ Nenhum registro seu pendente de complemento</span></div>','');
    // chegou perto de um pendente: vibra, pisca o aviso e mostra o registro (se a pessoa não estiver mexendo na lista)
    for(const id of [...NOTIF]){const p=P.find(q=>q.r.id===id);if(!p||p.x.dist>NEAR_M*1.5)NOTIF.delete(id)}
    const fresh=close.find(p=>!NOTIF.has(p.r.id));
    if(fresh){close.forEach(p=>NOTIF.add(p.r.id));buzz([90,60,90]);const h=$('lvHere');h.classList.remove('lv-flash');void h.offsetWidth;h.classList.add('lv-flash');if(Date.now()-UTOUCH>10000)goTo(fresh.r.id,true)}}
  // linha "VOCÊ ESTÁ AQUI" entre os registros (a lista já é ordenada por rodovia e estaca)
  function marker(els,o){const box=$('lvItems');let mk=$('lvHereMk');
    if(!o||o.r.outside||!els.length){if(mk)mk.remove();return}
    if(!mk){mk=document.createElement('div');mk.id='lvHereMk';mk.className='lv-mk';mk.setAttribute('role','separator');mk.innerHTML='<span></span>'}
    const s=`VOCÊ ESTÁ AQUI · Est. ${o.name}`;if(mk.firstChild.textContent!==s)mk.firstChild.textContent=s;
    const cur={rodovia:o.rod,odometro_m:o.r.s,criado_em:Date.now()},nx=els.find(el=>{const r=BYID.get(el.dataset.id);return r&&sortK(r,cur)>0})||null;
    if(nx){if(mk.nextElementSibling!==nx)box.insertBefore(mk,nx)}else if(box.lastElementChild!==mk)box.appendChild(mk)}
  function goTo(id,soft){const q=()=>$('lvItems').querySelector(`.lv-it[data-id="${CSS.escape(id)}"]`);let el=q();
    if(!el&&!soft){Object.assign(F,{ctr:'ALL',lote:'ALL',pista:'ALL',tipo:'ALL',oc:'ALL',data:'ALL'});saveF();renderList();el=q()}
    if(!el)return;el.scrollIntoView({block:'center',behavior:'smooth'});el.classList.remove('lv-flash');void el.offsetWidth;el.classList.add('lv-flash')}
  $('lvHNear').addEventListener('click',e=>{const a=e.target.closest('[data-hed]'),b=e.target.closest('[data-hgo]');if(a)openEd(a.dataset.hed);else if(b){UTOUCH=Date.now();goTo(b.dataset.hgo)}});
  ['touchstart','wheel','mousedown'].forEach(ev=>$('lvList').addEventListener(ev,()=>{UTOUCH=Date.now()},{passive:true}));
  on('position',()=>{if(Router.cur()==='levbe')near()});
  setInterval(()=>{if(Router.cur()==='levbe')near()},2000);

  /* ---------- montagem ---------- */
  function view(v){$('lvReg').hidden=v!=='reg';$('lvList').hidden=v!=='list';document.querySelectorAll('#pLev .lv-tab').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.v===v)));store.set('levbe.view',v);if(v==='list')renderList();else renderTop()}
  $('lvGrid').insertAdjacentHTML('afterbegin',colHtml('DECRESCENTE'));$('lvGrid').insertAdjacentHTML('beforeend',colHtml('CRESCENTE'));
  $('lvGrid').addEventListener('click',e=>{const b=e.target.closest('.lv-btn');if(b)tap(b.dataset.k,b.dataset.p)});
  document.querySelectorAll('#lvMode [data-m]').forEach(b=>b.onclick=()=>{DIR.setMode(b.dataset.m);renderTop()});
  document.querySelectorAll('#pLev .lv-tab').forEach(b=>b.onclick=()=>view(b.dataset.v));
  $('lvGoList').onclick=()=>{F.pend=true;saveF();view('list')};
  setInterval(()=>{if(Router.cur()==='levbe'&&!$('lvReg').hidden)renderTop()},2000);
  Router.onInit('levbe',()=>{view(store.get('levbe.view','reg')==='list'?'list':'reg');openMediaLink()});
  on('page',p=>{if(p==='levbe'){if(!Loc.gps.on)Loc.start();wake();renderTop()}else sleep()});
  // pendentes de complemento na tela de registro
  function upPend(){const n=ALL.filter(pendC).length;$('lvGoList').textContent=`Pendentes de complemento: ${n}`;$('lvGoList').disabled=!n}
  DB.subscribe(setAll);upPend();
  window.__LEVBE={DIR,tap,rec:()=>ALL,fix:()=>FIX,near,NEAR_M};
})();

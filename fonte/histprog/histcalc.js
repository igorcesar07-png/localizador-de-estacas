  /* ---------- Histórico de programações: salvar a programação validada, reabrir, editar e emitir de novo ----------
     Gravação em dois documentos: resumo leve (lista do histórico) e dados completos (parâmetros da Calculadora, edições por
     segmento, formulário do relatório e a relação de segmentos calculada), lidos só ao abrir.
     Abrir = a Calculadora volta exatamente ao estado salvo (o trabalho em andamento fica guardado e volta ao fechar). */
  let HM=(()=>{const h=store.get('histMode',null);return h&&h.id?h:null})();
  const huid=()=>{try{return crypto.randomUUID()}catch(e){return 'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,12)}};
  const hMe=()=>{const u=window.ACL&&ACL.user;return u?{email:u.email,name:u.name||u.email}:{email:'local',name:'Este aparelho'}};
  const encOf=eq=>{const p=String(eq||'').trim().split(/\s+/);return p.length>1?p.slice(1).join(' '):''};
  const HKEY=r=>[r.obra,r.data,r.equipe].join('|');
  const canHSave=()=>can('histprog','create')||can('histprog','edit');
  const nrm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  function histRec(id,prev){const P=PROG,I=P.info,L=P.L,b=S.bySrc[P.srck]||{},u=hMe(),now=Date.now();
    const rows=[...P.seq.map(r=>({k:'pav',ord:r.ord,tag:r.p.tag,code:r.p.code,L:r.p.L,a:r.a,b:r.b,len:r.len,w:r.w,e:r.e,t:r.t,serial:r.serial||'',obs:r.obs||'',manual:!!r.manual})),
      ...P.dseq.map(r=>({k:'drn',ord:r.ord,tag:r.p.tag,code:r.p.code,L:r.p.L,a:r.a,b:r.b,len:r.len,w:null,e:null,t:null,serial:r.serial||'',obs:r.obs||'',manual:!!r.manual}))];
    const sv=new Map();for(const r of [...P.seq,...P.dseq]){const k=r.p.code;if(!sv.has(k))sv.set(k,{code:k,desc:(r.p.info&&r.p.info.desc)||k,tipo:r.drn?'drn':'pav',n:0,len:0,area:0,t:0});
      const o=sv.get(k);o.n++;o.len+=r.len||0;if(!r.drn&&r.w>0)o.area+=r.len*r.w;o.t+=r.t||0}
    const servicos=[...sv.values()].map(o=>({...o,len:Math.round(o.len*100)/100,area:Math.round(o.area*100)/100,t:Math.round(o.t*100)/100}));
    const totais={t:Math.round((L.totT||0)*100)/100,len:Math.round((L.totLen||0)*100)/100,area:Math.round((L.totA||0)*100)/100,vol:Math.round((L.totV||0)*1000)/1000,perdaT:Math.round((L.perdaT||0)*100)/100,drnLen:Math.round(P.dseq.reduce((a,r)=>a+(r.len||0),0)*100)/100};
    const busca=nrm([I.obra,I.equipe,encOf(I.equipe),I.data.split('-').reverse().join('/'),S.kmA,S.kmB,I.tempo,I.tempoMsg,...servicos.map(s=>s.code+' '+s.desc),...rows.map(r=>[r.tag,r.serial,r.obs].join(' '))].join(' ')).replace(/\s+/g,' ').slice(0,6000);
    const sum={id,v:1,obra:I.obra,srck:P.srck,data:I.data,equipe:I.equipe,encarregado:encOf(I.equipe),kmA:S.kmA,kmB:S.kmB,pista:S.pista,sent:S.sent,
      nSeg:P.seq.length,nDrn:P.dseq.length,servicos,totais,busca,status:prev?'ATUALIZADA':'VALIDADA',revisao:prev?(prev.revisao||1)+1:1,
      criado_em:prev?prev.criado_em:now,criado_por:prev?prev.criado_por:u.email,criado_por_nome:prev?(prev.criado_por_nome||''):u.name,
      atualizado_em:now,atualizado_por:u.email,atualizado_por_nome:u.name,excluido:false,excluido_em:null,excluido_por:null,excluido_por_nome:null};
    const data={id,v:1,info:I,repType:P.type||store.get('repType','full'),
      calc:{params:{kmA:S.kmA,kmB:S.kmB,pista:S.pista,sent:S.sent,dens:S.dens,perda:S.perda,w:S.w,esp:S.esp,excl:S.excl,show:S.show,equipe:S.equipe,equipeMan:!!S.equipeMan,ordem:S.ordem},
        src:{rowW:b.rowW||{},rowE:b.rowE||{},rowOff:b.rowOff||{},rowSeg:b.rowSeg||{},serial:b.serial||{},obs:b.obs||{},manual:b.manual||[]}},
      rows,atualizado_em:now};
    return {sum:JSON.parse(JSON.stringify(sum)),data:JSON.parse(JSON.stringify(data))}}
  let HSAVING=false;
  async function histSave(){const msg=$('rvMsg');msg.hidden=false;
    if(!PROG){msg.textContent='Gere a programação primeiro (Gerar relatório).';return false}
    if(!canHSave()){msg.textContent='Sem permissão para salvar no histórico (Administração › Histórico de programações).';return false}
    const H=window.HistStore;if(!H){msg.textContent='Histórico indisponível neste aparelho.';return false}
    if(HSAVING)return false;HSAVING=true;$('rvHist').disabled=true;msg.textContent='Salvando no histórico…';
    try{await H.ready();
      const list=H.all().filter(r=>!r.excluido),key=HKEY(PROG.info);let prev=null,id,novo=false;
      // com uma programação do histórico aberta, só atualiza ela se obra, data e equipe forem as mesmas;
      // outra equipe ou outra data = outra programação (a aberta continua no histórico)
      const origSum=HM?((HM.rec&&HM.rec.sum)||HM.info||{}):null,hk=HM?HKEY(origSum):null;
      if(HM&&key===hk){id=HM.id;prev=list.find(r=>r.id===id)||(HM.rec&&HM.rec.sum)||null}
      else{if(HM)novo=true;const ex=list.find(r=>HKEY(r)===key);
        if(ex){if(PROG.histId!==ex.id&&!confirm(`Já existe programação salva para ${brD(ex.data)} – ${ex.equipe} (por ${ex.atualizado_por_nome||ex.criado_por_nome||'—'} em ${new Date(ex.atualizado_em).toLocaleString('pt-BR')}).\n\nSubstituir pela programação atual? O registro é atualizado (não cria outro).`)){msg.textContent='Nada foi salvo.';return false}prev=ex;id=ex.id}
        else id=(!HM&&PROG.histId)||(PROG.histId=huid())}
      if(prev&&prev.criado_por!==hMe().email&&!can('histprog','edit')){msg.textContent='Esta programação foi salva por outro usuário: para alterá-la é preciso a permissão "editar" do Histórico de programações.';return false}
      const rec=histRec(id,prev);
      const r=await Promise.race([H.save(rec.sum,rec.data).then(()=>'ok'),new Promise(res=>setTimeout(()=>res('fila'),4000))]);
      PROG.histId=id;if(HM){HM={...HM,id,rec:{sum:rec.sum,data:rec.data},info:rec.data.info,diff:''};store.set('histMode',HM);renderHistBar()}
      const orig=novo&&origSum;
      msg.textContent=(prev?`Programação de ${brD(PROG.info.data)} – ${PROG.info.equipe} atualizada no histórico (revisão ${rec.sum.revisao}).`:`Programação de ${brD(PROG.info.data)} – ${PROG.info.equipe} salva no Histórico de programações.`)+(orig&&orig.equipe?` A de ${brD(orig.data)} – ${orig.equipe} continua no histórico, sem alteração.`:'')+(r==='fila'?' Sem confirmação do servidor ainda: ficou gravada no aparelho e é enviada assim que houver internet.':'');
      return true}
    catch(e){msg.textContent='Não foi possível salvar no histórico: '+(e&&e.code==='permission-denied'?'sem permissão.':(e&&e.message||e));return false}
    finally{HSAVING=false;$('rvHist').disabled=false}}
  $('rvHist').onclick=()=>histSave();
  // abrir: guarda o trabalho em andamento (só na primeira abertura), grava o estado salvo e recarrega a Calculadora
  function histOpen(rec,opt){opt=opt||{};const D=rec.data,Sm=rec.sum;
    if(!HM)store.set('histDraft',{calc:store.get('calc',null),progMain:store.get('progMain',null),progHours:store.get('progHours',null),repType:store.get('repType',null),at:Date.now()});
    const c=JSON.parse(JSON.stringify(store.get('calc',null)||S)),k=Sm.srck,p=D.calc.params;
    Object.assign(c,JSON.parse(JSON.stringify(p)));c.bySrc=c.bySrc||{};c.bySrc[k]=Object.assign({},c.bySrc[k]||{},JSON.parse(JSON.stringify(D.calc.src)));
    c.km=c.km||{};c.km[k]={a:p.kmA,b:p.kmB};c.src=k;c.done=true;store.set('calc',c);
    store.set('progMain',{obra:D.info.obra,data:D.info.data,tempo:D.info.tempo||'',tempoMsg:D.info.tempoMsg||''});
    store.set('progHours',{uPrep:D.info.uPrep||'',uIni:D.info.uIni||''});if(D.repType)store.set('repType',D.repType);
    store.set('histMode',{id:Sm.id,rec:{sum:Sm,data:D},info:D.info,autoRep:!!opt.report,at:Date.now()});
    if(location.hash!=='#calculadora')history.replaceState(null,'','#calculadora');location.reload()}
  function histClose(){const d=store.get('histDraft',null);
    if(d){store.set('calc',d.calc);store.set('progMain',d.progMain);store.set('progHours',d.progHours);if(d.repType)store.set('repType',d.repType)}
    store.set('histMode',null);store.set('histDraft',null);location.reload()}
  // conferência: a relação recalculada com a base atual é a mesma que foi salva?
  function histDiff(){if(!HM||!HM.rec||!LAST)return '';const saved=HM.rec.data.rows||[];
    const k=r=>`${r.tag}|${Math.round((r.len||0)*10)}|${Math.round((r.t||0)*10)}`;
    const A=new Set(saved.filter(r=>r.k==='pav').map(k)),B=new Set(LAST.rows.map(r=>k({tag:r.p.tag,len:r.len,t:r.t})));
    const A2=new Set(saved.filter(r=>r.k==='drn').map(k)),B2=new Set(LAST.drn.rows.map(r=>k({tag:r.p.tag,len:r.len,t:null})));
    let n=0;for(const x of A)if(!B.has(x))n++;for(const x of B)if(!A.has(x))n++;for(const x of A2)if(!B2.has(x))n++;for(const x of B2)if(!A2.has(x))n++;
    return n?`Recalculada com a base atual, a relação ficou diferente da salva em ${n} item(ns) — o projeto ou a planilha de seriais pode ter mudado desde ${new Date(HM.rec.sum.atualizado_em).toLocaleDateString('pt-BR')}. Confira antes de salvar.`:''}
  function renderHistBar(){const bar=$('histBar');if(!bar)return;$('rvHist').textContent=HM?'Salvar alterações no histórico':'Salvar no histórico';
    if(!HM){bar.hidden=true;return}const R=(HM.rec&&HM.rec.sum)||{},I=HM.info||{};bar.hidden=false;
    bar.innerHTML=`<div class="hbtx"><b>Programação do histórico · ${escH(brD(I.data||''))} · ${escH(I.equipe||'')}</b>
      <small>${escH(I.obra||'')} · salva por ${escH(R.atualizado_por_nome||R.criado_por_nome||'—')} em ${R.atualizado_em?new Date(R.atualizado_em).toLocaleString('pt-BR'):'—'}${R.revisao>1?` · revisão ${R.revisao}`:''}. As alterações feitas aqui só vão para o histórico em “Validar e salvar alterações”. A programação que estava em andamento volta ao fechar.</small>
      ${HM.diff?`<small class="hbwarn">⚠ ${escH(HM.diff)}</small>`:''}</div>
      <div class="hbbtn">${canHSave()?'<button type="button" class="primary" id="hbSave">Validar e salvar alterações</button>':''}<button type="button" class="secondary" id="hbRep">Emitir relatório</button><button type="button" class="secondary" id="hbClose">Fechar e voltar</button></div>`;
    if($('hbSave'))$('hbSave').onclick=async()=>{const m0=PROG&&PROG.made;emitReport();if(PROG&&PROG.made!==m0&&!$('repView').hidden)await histSave()};
    $('hbRep').onclick=()=>emitReport();$('hbClose').onclick=()=>{if(confirm('Fechar a programação do histórico e voltar à programação que estava em andamento?\n\nAlterações não salvas no histórico são descartadas.'))histClose()}}
  window.CalcHist={open:histOpen,close:histClose,active:()=>HM&&{id:HM.id}};
  renderHistBar();
  if(HM)setTimeout(()=>{try{const I=HM.info||{};TDIRTY=true;
      if(I.equipe&&RFF.equipe.value!==I.equipe){RFF.equipe.value=I.equipe;eqLabel()}
      HKEYS.forEach(k=>{if(I[k]){HV[k]=I[k];RFF[k].value=I[k]}});
      if(I.data){RFF.data.value=I.data;dataHint()}['tempo','tempoMsg'].forEach(k=>{if(I[k]!=null)RFF[k].value=I[k]});wxPrev();grow();
      if(I.usiDr){document.querySelectorAll('input[name=rfUsiDr]').forEach(r=>r.checked=r.value===I.usiDr);$('rfUsiQt').value=I.usiQt>0?String(I.usiQt).replace('.',','):''}
      USIDIRTY=true;usiSync();$('rfHrHint').textContent='Horários da programação salva no histórico.';
      HM.diff=histDiff();renderHistBar();
      if(HM.autoRep){HM.autoRep=false;store.set('histMode',HM);emitReport()}}catch(e){console.error(e)}},60);

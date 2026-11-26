// Página pública de assinaturas (sem login).
//  ?p=<id>  página pessoal do responsável cadastrado: completa nome, função e assinatura padrão e vê os documentos pendentes para ele
//  ?t=<tok> link direto de um documento (RDO, RMP…)
// Ordem do RDO: engenheiro de produção primeiro; encarregado e fiscal só depois dele (também conferido nas regras do servidor).
import {initializeApp} from 'firebase/app';
import {getFirestore,doc,getDoc,updateDoc,connectFirestoreEmulator} from 'firebase/firestore/lite';

const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const PAPEL={eng:'Engenheiro de Produção',enc:'Encarregado de obras',fis:'Fiscalização',sol:'Solicitante (engenharia)',outro:'Responsável'};
const brD=d=>d?String(d).split('-').reverse().join('/'):'—';
const nf=(v,d)=>v==null||v===''?'—':Number(v).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const quando=ms=>ms?new Date(ms).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'';
const box=$('as');
const msg=(t,k)=>{box.innerHTML=`<div class="am ${k||''}">${t}</div>`};
const HEAD='<header class="ah"><img src="logo_neovia.png" alt="Neovia"><img src="logo_via.png" alt="Via Araucária"></header>';
const tipoOf=A=>A.tipo||'RDO';
const titulo=A=>{const R=A.resumo||{},n=String(R.numero||'');return `${n.startsWith(tipoOf(A))?'':esc(tipoOf(A))+' '}${esc(n)} · ${brD(R.data)}`};

const cfg=window.FIREBASE_CONFIG;
const Q=new URLSearchParams(location.search);
const tok=(Q.get('t')||'').trim(),pid=(Q.get('p')||'').trim();
const okId=s=>/^[a-f0-9]{24,64}$/.test(s);
let db=null;
const get=async(c,id)=>{const s=await getDoc(doc(db,c,id));return s.exists()?s.data():null};

// quadro de assinatura (dedo ou mouse); devolve o PNG reduzido
function pad(host){host.innerHTML=`<canvas id="cv" width="900" height="300" aria-label="Quadro de assinatura"></canvas><div class="ar"><button type="button" class="ab sec" id="clr">Limpar</button></div>`;
  const cv=$('cv'),cx=cv.getContext('2d');cx.lineWidth=3;cx.lineCap='round';cx.lineJoin='round';cx.strokeStyle='#0B2A6B';let dn=false,last=null;const P={drew:false};
  const pt=e=>{const r=cv.getBoundingClientRect();return [(e.clientX-r.left)*cv.width/r.width,(e.clientY-r.top)*cv.height/r.height]};
  cv.addEventListener('pointerdown',e=>{dn=true;last=pt(e);try{cv.setPointerCapture(e.pointerId)}catch(x){}e.preventDefault()});
  cv.addEventListener('pointermove',e=>{if(!dn)return;const p=pt(e);cx.beginPath();cx.moveTo(last[0],last[1]);cx.lineTo(p[0],p[1]);cx.stroke();last=p;P.drew=true;e.preventDefault()});
  ['pointerup','pointercancel','pointerleave'].forEach(t=>cv.addEventListener(t,()=>{dn=false}));
  $('clr').onclick=()=>{cx.clearRect(0,0,cv.width,cv.height);P.drew=false};
  P.png=()=>{const t=document.createElement('canvas');t.width=450;t.height=150;t.getContext('2d').drawImage(cv,0,0,450,150);return t.toDataURL('image/png')};return P}

/* ---------- página pessoal ---------- */
async function portal(){msg('Carregando as suas assinaturas…');
  let P;try{P=await get('assinantes',pid)}catch(e){return msg('Não foi possível abrir a página: '+esc(e.message||e),'bad')}
  if(!P)return msg('Este endereço de assinaturas não existe ou foi removido.','bad');
  if(P.ativo===false)return msg(`O cadastro de ${esc(P.nome)} para assinaturas está desativado. Fale com a equipe da obra.`,'bad');
  if(!P.assinatura||!P.perfil_em)return perfil(P,true);
  box.innerHTML=`${HEAD}<h1>Minhas assinaturas</h1><p class="as-sub"><b>${esc(P.nome)}</b> · ${esc(P.funcao||PAPEL[P.papel]||'')}</p>
    <div class="ar" style="justify-content:flex-start"><button type="button" class="ab sec" id="edp">Editar meu cadastro e assinatura padrão</button></div>
    <section class="ac"><h2>Para assinar</h2><div id="lp"><p class="as-sub">Carregando…</p></div></section>
    <section class="ac"><h2>Aguardando outra assinatura</h2><div id="la"></div></section>
    <section class="ac"><h2>Assinados e devolvidos</h2><div id="ls"></div></section>`;
  $('edp').onclick=()=>perfil(P,false);
  const toks=[...new Set(P.docs||[])].reverse().slice(0,300);
  const L=(await Promise.all(toks.map(t=>get('rdo_assin',t).then(a=>a&&Object.assign(a,{__t:t})).catch(()=>null)))).filter(Boolean);
  const deps=new Map();await Promise.all([...new Set(L.map(a=>a.dep).filter(Boolean))].map(d=>get('rdo_assin',d).then(x=>deps.set(d,x)).catch(()=>{})));
  const lib=a=>!a.dep||(deps.get(a.dep)||{}).status==='assinado';
  const it=(a,btn)=>{const R=a.resumo||{};return `<li class="ai"><div><b>${titulo(a)}</b><span>${esc([R.obra,R.equipe,R.trecho].filter(Boolean).join(' · '))} · como <b>${esc(PAPEL[a.papel]||a.papel)}</b>${a.status==='assinado'?` · assinado em ${quando(a.assinado_em)}`:a.status==='devolvido'?` · <b class="dv">devolvido para correção</b> em ${quando(a.devolvido_em)}`:depDv(a)?' · <b class="dv">devolvido na 1ª assinatura</b>':''}</span></div><button type="button" class="ab ${btn?'':'sec'}" data-open="${esc(a.__t)}">${btn?'Abrir e assinar':'Abrir'}</button></li>`};
  const depDv=a=>!!a.dep&&(deps.get(a.dep)||{}).status==='devolvido';
  const pend=L.filter(a=>a.status==='pendente'&&lib(a)),ag=L.filter(a=>a.status==='pendente'&&!lib(a)&&!depDv(a)),fe=L.filter(a=>a.status==='assinado'||a.status==='devolvido'||(a.status==='pendente'&&depDv(a))).sort((x,y)=>(y.assinado_em||y.devolvido_em||0)-(x.assinado_em||x.devolvido_em||0)).slice(0,50);
  $('lp').innerHTML=pend.length?`<ul class="al">${pend.map(a=>it(a,true)).join('')}</ul>`:'<p class="am ok">Nenhuma assinatura pendente para você.</p>';
  $('la').innerHTML=ag.length?`<ul class="al">${ag.map(a=>it(a,false)).join('')}</ul><p class="as-sub">Liberam depois da primeira assinatura (Engenheiro de Produção no RDO, Solicitante no RMP).</p>`:'<p class="as-sub">Nada aguardando.</p>';
  $('ls').innerHTML=fe.length?`<ul class="al">${fe.map(a=>it(a,false)).join('')}</ul>`:'<p class="as-sub">Nenhum documento assinado ou devolvido ainda.</p>';
  box.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openDoc(b.dataset.open,P))}

// cadastro da própria pessoa: nome completo, função e assinatura padrão
function perfil(P,primeiro){box.innerHTML=`${HEAD}<h1>${primeiro?'Cadastro para assinaturas':'Meu cadastro'}</h1>
  <p class="as-sub">${primeiro?'Antes da primeira assinatura, confirme os seus dados e desenhe a sua assinatura padrão. Ela será usada nos documentos que você assinar por esta página (RDO, RMP e outros).':'Altere os seus dados ou a assinatura padrão. Documentos já assinados não mudam.'}</p>
  <section class="ac"><label class="af">Nome completo<input id="nm" value="${esc(P.nome||'')}" maxlength="120" autocomplete="name"></label>
    <label class="af">Função<input id="fn" value="${esc(P.funcao||'')}" maxlength="80" placeholder="ex.: Engenheiro de Produção"></label>
    ${P.assinatura?`<p class="as-sub">Assinatura padrão atual:</p><img class="asig" src="${P.assinatura}" alt="Assinatura padrão atual"><p class="as-sub">Desenhe abaixo só se quiser trocar.</p>`:'<p class="as-sub">Assinatura padrão (dedo ou mouse):</p>'}
    <div id="pd"></div><button type="button" class="ab" id="sv">Salvar cadastro</button>${primeiro?'':' <button type="button" class="ab sec" id="vt">Voltar</button>'}<p id="em" class="am bad" hidden></p></section>`;
  const S=pad($('pd'));if($('vt'))$('vt').onclick=portal;
  $('sv').onclick=async()=>{const em=$('em');em.hidden=true;const nm=$('nm').value.trim(),fn=$('fn').value.trim();
    if(nm.length<3||!/\s/.test(nm)){em.textContent='Informe o nome completo (nome e sobrenome).';em.hidden=false;return}
    if(fn.length<2){em.textContent='Informe a função.';em.hidden=false;return}
    if(!S.drew&&!P.assinatura){em.textContent='Desenhe a sua assinatura padrão no quadro.';em.hidden=false;return}
    const o={nome:nm,funcao:fn,assinatura:S.drew?S.png():P.assinatura,perfil_em:Date.now()};$('sv').disabled=true;
    try{await updateDoc(doc(db,'assinantes',pid),o);Object.assign(P,o);portal()}
    catch(e){$('sv').disabled=false;em.textContent='Não foi possível salvar: '+(e.code==='permission-denied'?'cadastro desativado ou dados inválidos.':(e.message||e));em.hidden=false}}}

/* ---------- documento ---------- */
async function openDoc(t,P){msg('Carregando o documento…');window.scrollTo(0,0);
  let A;try{A=await get('rdo_assin',t);if(!A)return msg('Este link de assinatura não existe ou foi cancelado.','bad')}
  catch(e){return msg('Não foi possível abrir o documento: '+esc(e.message||e),'bad')}
  let dep=null;if(A.dep){try{dep=await get('rdo_assin',A.dep)}catch(e){}}
  const R=A.resumo||{},rdo=tipoOf(A)==='RDO';
  const sit=x=>x.status==='assinado'?`assinado por ${esc(x.assinado_nome)} em ${quando(x.assinado_em)}${x.obs?`<br><i>Obs.: ${esc(x.obs)}</i>`:''}`:x.status==='devolvido'?`<b class="dv">devolvido para correção</b> por ${esc(x.devolvido_nome)} em ${quando(x.devolvido_em)}<br><i>${esc(x.devolvido_motivo||'')}</i>`:'';
  const assLin=p=>p===A.papel?(A.status==='pendente'?'você — pendente':sit(A)):dep&&dep.papel===p?(sit(dep)||'pendente'):'—';
  const DEPN=dep?(PAPEL[dep.papel]||'primeiro responsável'):'Engenheiro de Produção';
  box.innerHTML=`${HEAD}${P?'<p><button type="button" class="ab sec" id="bk">← Minhas assinaturas</button></p>':''}
    <h1>${titulo(A)}</h1>
    <p class="as-sub">${esc([R.obra,R.equipe,R.trecho].filter(Boolean).join(' · '))}</p>
    ${rdo?`<dl class="ak"><div><dt>Segmentos</dt><dd>${nf(R.n,0)}</dd></div><div><dt>Usinado</dt><dd>${nf(R.usinado,2)} t</dd></div><div><dt>Aplicado</dt><dd>${nf(R.aplicado,2)} t</dd></div><div><dt>Sobra</dt><dd>${nf(R.sobra,2)} t</dd></div></dl>`:''}
    <section class="ac"><h2>Documento</h2><div id="pdfv"><p class="as-sub">Carregando o PDF…</p></div><p><a id="pdfa" class="ab sec" hidden download="${esc(tipoOf(A))}.pdf">Abrir o PDF</a></p></section>
    <section class="ac"><h2>Assinaturas</h2><ul class="al">${(rdo?['eng','enc','fis']:tipoOf(A)==='RMP'?['sol','fis']:[A.papel]).map(p=>`<li id="st-${p}"><b>${esc(PAPEL[p]||p)}</b><span>${assLin(p)}</span></li>`).join('')}</ul></section>
    <section class="ac" id="sig"></section>`;
  if($('bk'))$('bk').onclick=portal;
  loadPdf(A.pdf);
  const S=$('sig'),papel=esc(PAPEL[A.papel]||A.papel);
  if(A.status==='assinado'){S.innerHTML=`<h2>Sua assinatura</h2><p class="am ok">Assinado como <b>${papel}</b> por ${esc(A.assinado_nome)} em ${quando(A.assinado_em)}.${A.obs?`<br>Observação: ${esc(A.obs)}`:''}</p>${A.assinatura?`<img class="asig" src="${A.assinatura}" alt="Assinatura">`:''}`;return}
  if(A.status==='devolvido'){S.innerHTML=`<h2>Devolvido para correção</h2><p class="am bad">Devolvido por ${esc(A.devolvido_nome)} em ${quando(A.devolvido_em)}: ${esc(A.devolvido_motivo||'')}<br>O apontador corrige e envia um novo documento.</p>`;return}
  if(dep&&dep.status==='devolvido'){S.innerHTML=`<h2>Assinatura · ${papel}</h2><p class="am bad">O ${esc(DEPN)} devolveu este documento para correção: ${esc(dep.devolvido_motivo||'')}<br>Não é preciso assinar: um novo documento será enviado depois da correção.</p>`;return}
  if(A.dep&&(!dep||dep.status!=='assinado')){S.innerHTML=`<h2>Assinatura · ${papel}</h2><p class="am">Este documento ainda aguarda a assinatura do <b>${esc(DEPN)}</b>. ${P?'Ele aparece em "Para assinar" assim que for liberado.':'O link continua valendo: abra de novo depois que ele assinar.'}</p>`;return}
  // pela página pessoal: assinatura padrão (pode trocar só neste documento)
  const useP=!!(P&&P.assinatura);
  S.innerHTML=`<h2>Assinatura · ${papel}</h2>
    ${useP?`<p>Assinar como <b>${esc(P.nome)}</b> · ${esc(P.funcao||'')}</p><div id="sd"><img class="asig" src="${P.assinatura}" alt="Sua assinatura padrão"><div class="ar" style="justify-content:flex-start"><button type="button" class="ab sec" id="outra">Usar outra assinatura neste documento</button></div></div>`
      :`<label class="af">Nome completo<input id="nm" value="${esc(A.nome||'')}" maxlength="120" autocomplete="name"></label><p class="as-sub">Assine no quadro abaixo (dedo ou mouse).</p><div id="sd"></div>`}
    <label class="af">Observação <small>(opcional ao assinar; obrigatória para devolver) — vai para o campo Observações do RDO</small><textarea id="ob" rows="3" maxlength="600"></textarea></label>
    <label class="ack"><input type="checkbox" id="ok"> Li o documento e confirmo o seu conteúdo.</label>
    <div class="abr"><button type="button" class="ab" id="go">${useP?'Assinar com a minha assinatura':'Assinar'}</button><button type="button" class="ab dvb" id="dv">Devolver para correção</button></div><p id="em" class="am bad" hidden></p>
    ${!P&&A.pessoa?`<p class="as-sub">Você também encontra este e os próximos documentos na sua página de assinaturas: <a href="?p=${esc(A.pessoa)}">abrir minhas assinaturas</a>.</p>`:''}`;
  let Pd=useP?null:pad($('sd'));bindDev(t,A,P,useP);
  if($('outra'))$('outra').onclick=()=>{Pd=pad($('sd'))};
  $('go').onclick=async()=>{const em=$('em');em.hidden=true;const nm=useP?P.nome:$('nm').value.trim();
    if(nm.length<3){em.textContent='Informe o nome completo.';em.hidden=false;return}
    if(Pd&&!Pd.drew){em.textContent='Faça a assinatura no quadro.';em.hidden=false;return}
    if(!$('ok').checked){em.textContent='Confirme que leu o documento.';em.hidden=false;return}
    const png=Pd?Pd.png():P.assinatura,ob=$('ob').value.trim().slice(0,600);
    $('go').disabled=true;$('go').textContent='Enviando…';
    try{const at=Date.now();await updateDoc(doc(db,'rdo_assin',t),{status:'assinado',assinado_nome:nm,...(useP&&P.funcao?{assinado_funcao:String(P.funcao).slice(0,80)}:{}),...(ob?{obs:ob}:{}),assinado_em:at,assinatura:png,ua:String(navigator.userAgent||'').slice(0,200)});
      S.innerHTML=`<h2>Assinatura registrada</h2><p class="am ok">Obrigado, ${esc(nm)}. O documento foi assinado como <b>${papel}</b> em ${quando(at)}.${ob?`<br>Observação: ${esc(ob)}`:''}${rdo&&A.papel==='eng'?' A produção deste RDO já entra na base do aplicativo, e as assinaturas do encarregado e da fiscalização foram liberadas.':A.papel==='sol'?' A assinatura do fiscal foi liberada.':''}</p><img class="asig" src="${png}" alt="Assinatura">${P?'<p><button type="button" class="ab sec" id="bk2">← Minhas assinaturas</button></p>':''}`;
      if($('bk2'))$('bk2').onclick=portal;
      const li=$('st-'+A.papel);if(li)li.querySelector('span').textContent=`assinado por ${nm} em ${quando(at)}`}
    catch(e){$('go').disabled=false;$('go').textContent='Assinar';em.textContent='Não foi possível registrar a assinatura: '+(e.code==='permission-denied'?'o documento já foi assinado ou ainda aguarda o engenheiro.':(e.message||e));em.hidden=false}}}

// devolver para correção: o motivo (observação) é obrigatório; o RDO volta para o apontador corrigir e enviar de novo
function bindDev(t,A,P,useP){const b=$('dv');if(!b)return;b.onclick=async()=>{const em=$('em');em.hidden=true;const nm=useP?P.nome:($('nm')?$('nm').value.trim():'');const ob=$('ob').value.trim();
    if(nm.length<3){em.textContent='Informe o nome completo.';em.hidden=false;return}
    if(ob.length<5){em.textContent='Para devolver, escreva na observação o que precisa ser corrigido.';em.hidden=false;$('ob').focus();return}
    if(!confirm('Devolver este documento para correção? Ele não poderá mais ser assinado; o apontador corrige e envia um novo.'))return;
    b.disabled=true;b.textContent='Enviando…';
    try{const at=Date.now();await updateDoc(doc(db,'rdo_assin',t),{status:'devolvido',devolvido_nome:nm,...(useP&&P.funcao?{devolvido_funcao:String(P.funcao).slice(0,80)}:{}),devolvido_em:at,devolvido_motivo:ob.slice(0,600),ua:String(navigator.userAgent||'').slice(0,200)});
      $('sig').innerHTML=`<h2>Devolvido para correção</h2><p class="am bad">Você devolveu o documento em ${quando(at)}: ${esc(ob)}<br>O apontador recebe o aviso no aplicativo, corrige e envia um novo documento.</p>${P?'<p><button type="button" class="ab sec" id="bk2">← Minhas assinaturas</button></p>':''}`;if($('bk2'))$('bk2').onclick=portal}
    catch(e){b.disabled=false;b.textContent='Devolver para correção';em.textContent='Não foi possível devolver: '+(e.code==='permission-denied'?'o documento já foi assinado ou devolvido.':(e.message||e));em.hidden=false}}}

async function loadPdf(id){const v=$('pdfv');if(!id){v.innerHTML='<p class="as-sub">PDF não anexado.</p>';return}
  try{const s=await getDoc(doc(db,'rdo_pdf',id));if(!s.exists()){v.innerHTML='<p class="as-sub">PDF não encontrado.</p>';return}
    const b64=String(s.data().pdf||'').replace(/^data:[^,]*,/,''),bin=atob(b64),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
    const url=URL.createObjectURL(new Blob([u8],{type:'application/pdf'}));const a=$('pdfa');a.href=url;a.hidden=false;
    if(!window.pdfjsLib){v.innerHTML='';return}
    window.pdfjsLib.GlobalWorkerOptions.workerSrc='lib/pdf.worker.min.js';
    const pdf=await window.pdfjsLib.getDocument({data:u8}).promise;v.innerHTML='';
    for(let n=1;n<=pdf.numPages;n++){const pg=await pdf.getPage(n);const w=Math.min(1400,v.clientWidth*2||1200);const vp0=pg.getViewport({scale:1});const vp=pg.getViewport({scale:w/vp0.width});
      const c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;c.className='apg';v.appendChild(c);await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise}}
  catch(e){v.innerHTML='<p class="as-sub">Não foi possível mostrar o PDF aqui; use "Abrir o PDF".</p>'}}

// início (no fim do arquivo: as funções acima já estão definidas)
if(!cfg){msg('Configuração do servidor indisponível.','bad')}
else if(!okId(tok)&&!okId(pid)){msg('Link de assinatura inválido. Confira o endereço recebido.','bad')}
else{const app=initializeApp(cfg);db=getFirestore(app);
  if(/[?&]emu=1/.test(location.search)||cfg.emulator)connectFirestoreEmulator(db,'127.0.0.1',8080);
  if(okId(pid))portal();else openDoc(tok,null)}

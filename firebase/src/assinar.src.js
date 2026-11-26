// Página pública de assinatura do RDO (link com token, sem login).
// Ordem: engenheiro de produção primeiro; encarregado e fiscal só depois dele (também conferido nas regras do servidor).
import {initializeApp} from 'firebase/app';
import {getFirestore,doc,getDoc,updateDoc,connectFirestoreEmulator} from 'firebase/firestore/lite';

const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const PAPEL={eng:'Engenheiro de Produção',enc:'Encarregado de obras',fis:'Fiscalização'};
const brD=d=>d?String(d).split('-').reverse().join('/'):'—';
const nf=(v,d)=>v==null||v===''?'—':Number(v).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const quando=ms=>ms?new Date(ms).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'';
const box=$('as');
const msg=(t,k)=>{box.innerHTML=`<div class="am ${k||''}">${t}</div>`};

const cfg=window.FIREBASE_CONFIG;
const tok=(new URLSearchParams(location.search).get('t')||'').trim();
if(!cfg){msg('Configuração do servidor indisponível.','bad')}
else if(!/^[a-f0-9]{24,64}$/.test(tok)){msg('Link de assinatura inválido. Confira o endereço recebido.','bad')}
else start();

async function start(){
  const app=initializeApp(cfg);const db=getFirestore(app);
  if(/[?&]emu=1/.test(location.search)||cfg.emulator)connectFirestoreEmulator(db,'127.0.0.1',8080);
  msg('Carregando o RDO…');
  let A;try{const s=await getDoc(doc(db,'rdo_assin',tok));if(!s.exists())return msg('Este link de assinatura não existe ou foi cancelado.','bad');A=s.data()}
  catch(e){return msg('Não foi possível abrir o RDO: '+esc(e.message||e),'bad')}
  let dep=null;if(A.dep){try{const s=await getDoc(doc(db,'rdo_assin',A.dep));dep=s.exists()?s.data():null}catch(e){}}
  const R=A.resumo||{};
  box.innerHTML=`<header class="ah"><img src="logo_neovia.png" alt="Neovia"><img src="logo_via.png" alt="Via Araucária"></header>
    <h1>RDO ${esc(R.numero||'')} · ${brD(R.data)}</h1>
    <p class="as-sub">${esc(R.obra||'')} · ${esc(R.equipe||'')}</p>
    <dl class="ak"><div><dt>Segmentos</dt><dd>${nf(R.n,0)}</dd></div><div><dt>Usinado</dt><dd>${nf(R.usinado,2)} t</dd></div><div><dt>Aplicado</dt><dd>${nf(R.aplicado,2)} t</dd></div><div><dt>Sobra</dt><dd>${nf(R.sobra,2)} t</dd></div></dl>
    <section class="ac"><h2>Documento</h2><div id="pdfv"><p class="as-sub">Carregando o PDF…</p></div><p><a id="pdfa" class="ab sec" hidden download="RDO.pdf">Abrir o PDF</a></p></section>
    <section class="ac"><h2>Assinaturas</h2><ul class="al">${['eng','enc','fis'].map(p=>`<li id="st-${p}"><b>${PAPEL[p]}</b><span>${p===A.papel?(A.status==='assinado'?`assinado por ${esc(A.assinado_nome)} em ${quando(A.assinado_em)}`:'você — pendente'):p==='eng'&&dep?(dep.status==='assinado'?`assinado por ${esc(dep.assinado_nome)} em ${quando(dep.assinado_em)}`:'pendente'):'—'}</span></li>`).join('')}</ul></section>
    <section class="ac" id="sig"></section>`;
  loadPdf(db,A.pdf);
  const S=$('sig');
  if(A.status==='assinado'){S.innerHTML=`<h2>Sua assinatura</h2><p class="am ok">Assinado como <b>${esc(PAPEL[A.papel])}</b> por ${esc(A.assinado_nome)} em ${quando(A.assinado_em)}.</p>${A.assinatura?`<img class="asig" src="${A.assinatura}" alt="Assinatura">`:''}`;return}
  if(A.dep&&(!dep||dep.status!=='assinado')){S.innerHTML=`<h2>Assinatura · ${esc(PAPEL[A.papel])}</h2><p class="am">Este RDO ainda aguarda a assinatura do <b>Engenheiro de Produção</b>. O link continua valendo: abra de novo depois que ele assinar.</p>`;return}
  S.innerHTML=`<h2>Assinatura · ${esc(PAPEL[A.papel])}</h2>
    <label class="af">Nome completo<input id="nm" value="${esc(A.nome||'')}" maxlength="120" autocomplete="name"></label>
    <p class="as-sub">Assine no quadro abaixo (dedo ou mouse).</p><canvas id="cv" width="900" height="300" aria-label="Quadro de assinatura"></canvas>
    <div class="ar"><button type="button" class="ab sec" id="clr">Limpar</button></div>
    <label class="ack"><input type="checkbox" id="ok"> Li o RDO e confirmo o seu conteúdo.</label>
    <button type="button" class="ab" id="go">Assinar</button><p id="em" class="am bad" hidden></p>`;
  const cv=$('cv'),cx=cv.getContext('2d');cx.lineWidth=3;cx.lineCap='round';cx.lineJoin='round';cx.strokeStyle='#0B2A6B';let dn=false,drew=false,last=null;
  const pt=e=>{const r=cv.getBoundingClientRect();return [(e.clientX-r.left)*cv.width/r.width,(e.clientY-r.top)*cv.height/r.height]};
  cv.addEventListener('pointerdown',e=>{dn=true;last=pt(e);cv.setPointerCapture(e.pointerId);e.preventDefault()});
  cv.addEventListener('pointermove',e=>{if(!dn)return;const p=pt(e);cx.beginPath();cx.moveTo(last[0],last[1]);cx.lineTo(p[0],p[1]);cx.stroke();last=p;drew=true;e.preventDefault()});
  ['pointerup','pointercancel','pointerleave'].forEach(t=>cv.addEventListener(t,()=>{dn=false}));
  $('clr').onclick=()=>{cx.clearRect(0,0,cv.width,cv.height);drew=false};
  $('go').onclick=async()=>{const em=$('em');em.hidden=true;const nm=$('nm').value.trim();
    if(nm.length<3){em.textContent='Informe o nome completo.';em.hidden=false;return}
    if(!drew){em.textContent='Faça a assinatura no quadro.';em.hidden=false;return}
    if(!$('ok').checked){em.textContent='Confirme que leu o RDO.';em.hidden=false;return}
    // assinatura reduzida (PNG pequeno) para caber no documento e no PDF
    const t=document.createElement('canvas');t.width=450;t.height=150;t.getContext('2d').drawImage(cv,0,0,450,150);const png=t.toDataURL('image/png');
    $('go').disabled=true;$('go').textContent='Enviando…';
    try{const at=Date.now();await updateDoc(doc(db,'rdo_assin',tok),{status:'assinado',assinado_nome:nm,assinado_em:at,assinatura:png,ua:String(navigator.userAgent||'').slice(0,200)});
      S.innerHTML=`<h2>Assinatura registrada</h2><p class="am ok">Obrigado, ${esc(nm)}. O RDO foi assinado como <b>${esc(PAPEL[A.papel])}</b> em ${quando(at)}.${A.papel==='eng'?' A produção deste RDO já entra na base do aplicativo, e os links do encarregado e da fiscalização foram liberados.':''}</p><img class="asig" src="${png}" alt="Assinatura">`;
      const li=$('st-'+A.papel);if(li)li.querySelector('span').textContent=`assinado por ${nm} em ${quando(at)}`}
    catch(e){$('go').disabled=false;$('go').textContent='Assinar';em.textContent='Não foi possível registrar a assinatura: '+(e.code==='permission-denied'?'o link já foi usado ou ainda aguarda o engenheiro.':(e.message||e));em.hidden=false}}}

async function loadPdf(db,id){const v=$('pdfv');if(!id){v.innerHTML='<p class="as-sub">PDF não anexado.</p>';return}
  try{const s=await getDoc(doc(db,'rdo_pdf',id));if(!s.exists()){v.innerHTML='<p class="as-sub">PDF não encontrado.</p>';return}
    const b64=String(s.data().pdf||'').replace(/^data:[^,]*,/,''),bin=atob(b64),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
    const url=URL.createObjectURL(new Blob([u8],{type:'application/pdf'}));const a=$('pdfa');a.href=url;a.hidden=false;
    if(!window.pdfjsLib){v.innerHTML='';return}
    window.pdfjsLib.GlobalWorkerOptions.workerSrc='lib/pdf.worker.min.js';
    const pdf=await window.pdfjsLib.getDocument({data:u8}).promise;v.innerHTML='';
    for(let n=1;n<=pdf.numPages;n++){const pg=await pdf.getPage(n);const w=Math.min(1400,v.clientWidth*2||1200);const vp0=pg.getViewport({scale:1});const vp=pg.getViewport({scale:w/vp0.width});
      const c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;c.className='apg';v.appendChild(c);await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise}}
  catch(e){v.innerHTML='<p class="as-sub">Não foi possível mostrar o PDF aqui; use "Abrir o PDF".</p>'}}

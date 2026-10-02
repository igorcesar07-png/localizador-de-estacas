// Localizador de Estacas — login, permissões e administração (Firebase Auth + Firestore)
// A base do projeto só é entregue pelo servidor a usuários ativos e autorizados (ver firestore.rules).
import {initializeApp} from 'firebase/app';
import {getAuth,onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signInWithRedirect,getRedirectResult,signInWithEmailAndPassword,
  createUserWithEmailAndPassword,sendPasswordResetEmail,sendEmailVerification,signOut,connectAuthEmulator,updateProfile,
  setPersistence,indexedDBLocalPersistence,browserLocalPersistence} from 'firebase/auth';
import {initializeFirestore,persistentLocalCache,persistentSingleTabManager,memoryLocalCache,doc,getDoc,getDocFromServer,setDoc,collection,getDocs,
  updateDoc,deleteDoc,serverTimestamp,connectFirestoreEmulator,onSnapshot} from 'firebase/firestore';

const ADMIN='igordalmolin.eng@gmail.com';
export const PAGES=[
  {k:'localizacao',t:'Localização estaca',acts:['view'],help:{view:'Ver a estaca atual pelo GPS'}},
  {k:'mapa',t:'Estacas BR-277 B2+B3 (mapa)',acts:['view'],help:{view:'Ver mapa, soluções e filtros'}},
  {k:'calculadora',t:'Calculadora de programação',acts:['view','create','edit'],help:{view:'Calcular trechos',create:'Emitir o relatório da programação',edit:'Alterar larguras, espessuras e densidade'}},
  {k:'foto',t:'Foto georreferenciada',acts:['view','create','delete'],help:{view:'Abrir a câmera e a galeria',create:'Tirar e gravar fotos',delete:'Excluir fotos'}},
  {k:'relatorios',t:'Relatórios',acts:['view','create','edit','delete'],help:{view:'Ver e exportar PDF/Excel',create:'Importar planilha e concluir programações',edit:'Reabrir programações',delete:'Remover dados importados e registros'}}];
const ACTS={view:'Visualizar',create:'Criar',edit:'Editar',delete:'Excluir'};

const cfg=window.FIREBASE_CONFIG;
if(cfg&&/\.(web\.app|firebaseapp\.com)$/.test(location.hostname))cfg.authDomain=location.hostname; // login no mesmo domínio (iPhone/PWA)
const emu=/[?&]emu=1/.test(location.search)||(cfg&&cfg.emulator);
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const normEmail=e=>String(e||'').trim().toLowerCase();

/* ---------------- tela de acesso ---------------- */
const CSS=`
#gate{position:fixed;inset:0;z-index:9000;background:var(--plate,#141715);color:var(--plate-ink,#fff);display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto;font-family:var(--body,system-ui)}
#gate .gbox{width:min(420px,100%);background:#1C211E;border:1px solid #2D3430;border-radius:18px;padding:22px 20px;box-shadow:0 20px 60px rgba(0,0,0,.4)}
#gate h1{margin:0 0 2px;font:700 22px var(--cond,system-ui);letter-spacing:.02em}#gate .gsub{margin:0 0 18px;color:#A9B3AD;font-size:13.5px}
#gate .glogo{display:flex;gap:10px;align-items:center;margin-bottom:14px}#gate .glogo img{height:26px;background:#fff;border-radius:6px;padding:4px 6px}
#gate label{display:block;font:600 13px var(--body);color:#C9D1CC;margin:10px 0 4px}
#gate input{width:100%;box-sizing:border-box;min-height:48px;border-radius:12px;border:1px solid #39413C;background:#111412;color:#fff;font:500 16px var(--body);padding:0 12px}
#gate .gbtn{width:100%;min-height:50px;border-radius:12px;border:0;font:700 15.5px var(--body);cursor:pointer;margin-top:12px}
#gate .gpri{background:#F2B705;color:#111}#gate .ggoo{background:#fff;color:#1A1A1A;display:flex;align-items:center;justify-content:center;gap:10px}
#gate .gsec{background:transparent;color:#fff;border:1px solid #4A534E}
#gate .glink{background:none;border:0;color:#F2B705;font:600 13.5px var(--body);cursor:pointer;padding:8px 0;margin-top:6px}
#gate .gor{display:flex;align-items:center;gap:10px;color:#7E8984;font-size:12px;margin:16px 0 4px}#gate .gor::before,#gate .gor::after{content:'';flex:1;height:1px;background:#2D3430}
#gate .gmsg{margin:12px 0 0;font-size:13.5px;line-height:1.4;border-radius:10px;padding:10px 12px;background:#10263F;color:#CFE3FF}#gate .gmsg.bad{background:#3D1512;color:#FFD9D5}#gate .gmsg.ok{background:#16402B;color:#C9F2DA}
#gate .gwho{font-size:14px;margin:6px 0 0}#gate .gwho b{display:block;font-size:16px}
#gate .gspin{width:34px;height:34px;border-radius:50%;border:3px solid #39413C;border-top-color:#F2B705;animation:gsp 1s linear infinite;margin:10px auto}@keyframes gsp{to{transform:rotate(360deg)}}
.duser{margin:10px 0 0;padding:10px 0 0;border-top:1px solid var(--line,#ddd);display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px}
.duser b{display:block;font-size:14px}.duser button{min-height:38px;border-radius:10px;border:1px solid var(--line,#ccc);background:transparent;color:inherit;font:600 13px var(--body);padding:0 12px;cursor:pointer}
/* administração */
#admRoot{max-width:1100px;margin:0 auto;padding:14px 14px 60px}
.adm-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}.adm-tabs button{min-height:42px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:700 14px var(--body);padding:0 16px;cursor:pointer}.adm-tabs button[aria-pressed="true"]{background:var(--ink);color:var(--surface)}
.adm-card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:12px}
.adm-card h2{margin:0 0 10px;font:700 13px var(--body);letter-spacing:.1em;text-transform:uppercase;color:var(--muted);display:flex;justify-content:space-between;align-items:center;gap:8px}
.adm-list{display:grid;gap:6px}.adm-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--surface);cursor:pointer;text-align:left;font:inherit;color:inherit;width:100%}
.adm-row:hover{background:var(--surface-2)}.adm-row b{display:block;font-size:15px}.adm-row small{color:var(--muted);font-size:12.5px;display:block;overflow:hidden;text-overflow:ellipsis}
.adm-st{font:700 11px var(--body);border-radius:6px;padding:3px 8px;color:#fff;white-space:nowrap}.st-on{background:#1E7A4C}.st-off{background:#7A2B2B}.st-wait{background:#B07A00}.st-inv{background:#1A73E8}.st-adm{background:#111}
.adm-btn{min-height:44px;border-radius:12px;border:0;background:var(--ink);color:var(--surface);font:700 14.5px var(--body);padding:0 16px;cursor:pointer}.adm-btn.sec{background:var(--surface);color:var(--ink);border:1px solid var(--line)}.adm-btn.red{background:#C8101A;color:#fff}.adm-btn.yel{background:#F2B705;color:#111}
.adm-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-bottom:10px}
.adm-form label{display:flex;flex-direction:column;gap:4px;font:600 13px var(--body);color:var(--muted)}
.adm-form input,.adm-form select{min-height:46px;border-radius:10px;border:1px solid var(--line);background:var(--surface-2);color:var(--ink);font:600 16px var(--body);padding:0 10px}
.adm-mx{width:100%;border-collapse:collapse;font-size:14px}.adm-mx th{font:700 12px var(--body);color:var(--muted);text-align:center;padding:6px 4px;border-bottom:1px solid var(--line)}.adm-mx th:first-child{text-align:left}
.adm-mx td{border-bottom:1px solid var(--line);padding:8px 4px;text-align:center}.adm-mx td:first-child{text-align:left;font-weight:600}.adm-mx td small{display:block;color:var(--muted);font-weight:500;font-size:11.5px}
.adm-mx input{width:24px;height:24px;accent-color:#1E7A4C}.adm-mx .na{color:var(--muted);font-size:12px}
.adm-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.adm-note{font-size:13px;color:var(--muted);margin:6px 0 0;line-height:1.4}
.adm-msg{margin:8px 0;padding:10px 12px;border-radius:10px;font-size:14px;background:var(--surface-2)}.adm-msg.ok{background:#E2F4EA;color:#14532D}.adm-msg.bad{background:#FDE8E6;color:#7A1A12}
.adm-toggle{display:flex;align-items:center;gap:8px;font:600 14px var(--body);margin:6px 0}.adm-toggle input{width:22px;height:22px}
@media (max-width:600px){.adm-mx{font-size:13px}.adm-mx td small{display:none}}
`;
function injectCss(){if($('authCss'))return;const s=document.createElement('style');s.id='authCss';s.textContent=CSS;document.head.appendChild(s)}
function gate(html){injectCss();let g=$('gate');if(!g){g=document.createElement('div');g.id='gate';document.body.appendChild(g)}g.hidden=false;
  g.innerHTML=`<div class="gbox"><div class="glogo"><img src="logo_neovia.png" alt="Neovia"><img src="logo_via.png" alt="Via Araucária"></div><h1>Localizador de Estacas</h1><p class="gsub">BR-277/PR · Blocos 2 e 3</p>${html}</div>`;return g}
const closeGate=()=>{const g=$('gate');if(g)g.remove()};
const errTxt=e=>{const c=e&&e.code||'';return ({
  'auth/invalid-credential':'E-mail ou senha incorretos.','auth/wrong-password':'E-mail ou senha incorretos.','auth/user-not-found':'E-mail ou senha incorretos.',
  'auth/email-already-in-use':'Este e-mail já tem conta. Use "Entrar".','auth/weak-password':'A senha precisa de pelo menos 6 caracteres.',
  'auth/invalid-email':'E-mail inválido.','auth/popup-closed-by-user':'Login cancelado.','auth/network-request-failed':'Sem conexão com a internet.',
  'auth/too-many-requests':'Muitas tentativas. Aguarde alguns minutos.','permission-denied':'Acesso negado pelo servidor.','unavailable':'Sem conexão com o servidor.'})[c]||((e&&e.message)||String(e))};

if(!cfg){gate(`<div class="gmsg bad">Configuração do Firebase ausente. A publicação ainda não foi concluída.</div>`);throw new Error('sem FIREBASE_CONFIG')}
const app=initializeApp(cfg);
const auth=getAuth(app);
let db;
try{db=initializeFirestore(app,{localCache:emu?memoryLocalCache():persistentLocalCache({tabManager:persistentSingleTabManager()})})}catch(e){db=initializeFirestore(app,{localCache:memoryLocalCache()})}
if(emu){connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});connectFirestoreEmulator(db,'127.0.0.1',8080)}
setPersistence(auth,indexedDBLocalPersistence).catch(()=>setPersistence(auth,browserLocalPersistence).catch(()=>{}));

/* ---------------- telas de login ---------------- */
let mode='in';
function loginScreen(msg,kind){
  const g=gate(`
    <button type="button" class="gbtn ggoo" id="gGoogle"><svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.8 6.1C12.4 13.5 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.8-6.1a24 24 0 0 0 0 21.6l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4-13.5-9.6l-7.8 6.1C6.6 42.6 14.6 48 24 48z"/></svg>Entrar com Google</button>
    <div class="gor">ou com e-mail</div>
    <form id="gForm" novalidate>
      ${mode==='up'?'<label for="gName">Nome</label><input id="gName" autocomplete="name" required>':''}
      <label for="gEmail">E-mail</label><input id="gEmail" type="email" autocomplete="username" required>
      <label for="gPass">Senha</label><input id="gPass" type="password" autocomplete="${mode==='up'?'new-password':'current-password'}" minlength="6" required>
      <button type="submit" class="gbtn gpri">${mode==='up'?'Criar conta':'Entrar'}</button>
    </form>
    <button type="button" class="glink" id="gMode">${mode==='up'?'Já tenho conta: entrar':'Primeiro acesso: criar conta'}</button>
    ${mode==='in'?'<button type="button" class="glink" id="gReset" style="float:right">Esqueci a senha</button>':''}
    <p class="gsub" style="margin:12px 0 0;clear:both">Contas novas começam sem acesso: o administrador libera as páginas.</p>
    ${msg?`<div class="gmsg ${kind||''}">${esc(msg)}</div>`:''}`);
  $('gGoogle').onclick=async()=>{try{const p=new GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});
      const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
      if(standalone&&!emu)await signInWithRedirect(auth,p);else await signInWithPopup(auth,p)}catch(e){if(e.code==='auth/popup-blocked'){try{await signInWithRedirect(auth,new GoogleAuthProvider())}catch(x){loginScreen(errTxt(x),'bad')}}else loginScreen(errTxt(e),'bad')}};
  $('gMode').onclick=()=>{mode=mode==='up'?'in':'up';loginScreen()};
  if($('gReset'))$('gReset').onclick=async()=>{const e=$('gEmail').value.trim();if(!e){loginScreen('Digite seu e-mail e toque em "Esqueci a senha".','bad');return}
    try{await sendPasswordResetEmail(auth,e);loginScreen('Se o e-mail tiver conta, enviamos o link para criar uma nova senha.','ok')}catch(x){loginScreen(errTxt(x),'bad')}};
  $('gForm').onsubmit=async ev=>{ev.preventDefault();const e=$('gEmail').value.trim(),p=$('gPass').value;
    try{if(mode==='up'){const n=$('gName').value.trim();window.__pendingName=n;const c=await createUserWithEmailAndPassword(auth,e,p);if(n)await updateProfile(c.user,{displayName:n});sendEmailVerification(c.user).catch(()=>{})}
      else await signInWithEmailAndPassword(auth,e,p)}catch(x){loginScreen(errTxt(x),'bad')}};
}
function waitScreen(u,title,txt){
  gate(`<div class="gwho">Conectado como<b>${esc(u.displayName||u.email)}</b>${esc(u.email)}</div>
    <div class="gmsg">${esc(title)} ${esc(txt)}</div>
    <button type="button" class="gbtn gsec" id="gRetry">Verificar de novo</button><button type="button" class="gbtn gsec" id="gOut">Sair</button>`);
  $('gRetry').onclick=()=>location.reload();$('gOut').onclick=()=>signOut(auth).then(()=>location.reload())}

/* ---------------- permissões ---------------- */
const emptyPerms=()=>({});
async function effectivePerms(u){if(!u)return {};if(u.custom||!u.profile)return u.perms||{};
  try{const p=await getDoc(doc(db,'profiles',u.profile));return p.exists()?(p.data().perms||{}):{}}catch(e){return {}}}
const anyView=p=>PAGES.some(pg=>p&&p[pg.k]&&p[pg.k].view);

async function ensureUserDoc(user){const ref=doc(db,'users',user.uid);let s;
  try{s=await getDoc(ref)}catch(e){throw e}
  if(s.exists())return s.data();
  const key=normEmail(user.email);let inv=null;try{const i=await getDoc(doc(db,'invites',key));if(i.exists())inv=i.data()}catch(e){}
  const data=inv?{email:user.email,name:inv.name||user.displayName||window.__pendingName||'',profile:inv.profile??null,custom:inv.custom===true,perms:inv.perms||{},active:inv.active===true,invited:true,createdAt:serverTimestamp()}
    :{email:user.email,name:user.displayName||window.__pendingName||'',profile:null,custom:true,perms:{},active:false,invited:false,createdAt:serverTimestamp()};
  await setDoc(ref,data);return data}

async function loadBase(){const s=await getDoc(doc(db,'base','r08'));if(!s.exists())return null;const d=s.data();return {data:JSON.parse(d.json),version:d.version||'',updatedAt:d.updatedAt}}
function startApp(){if(window.__appStarted)return;window.__appStarted=true;const s=document.createElement('script');s.src='app.js?v='+(window.APP_BUILD||'');s.onload=()=>{closeGate();decorateDrawer()};
  s.onerror=()=>gate('<div class="gmsg bad">Não foi possível carregar o aplicativo. Verifique a conexão e tente de novo.</div>');document.body.appendChild(s)}
function decorateDrawer(){const d=document.querySelector('#drawer .dfoot');if(!d||$('duser'))return;const a=window.ACL;const box=document.createElement('div');box.id='duser';box.className='duser';
  box.innerHTML=`<div><b>${esc(a.user.name||a.user.email)}</b>${esc(a.user.email)}${a.admin?' · administrador':''}</div><button type="button" id="dOut">Sair</button>`;d.appendChild(box);
  $('dOut').onclick=()=>signOut(auth).then(()=>{location.hash='';location.reload()})}

async function baseMissing(isAdm){
  if(!isAdm){gate('<div class="gmsg">A base do projeto ainda não foi carregada pelo administrador. Tente mais tarde.</div><button type="button" class="gbtn gsec" id="gOut">Sair</button>');$('gOut').onclick=()=>signOut(auth).then(()=>location.reload());return}
  gate(`<div class="gmsg">Base do projeto ainda não carregada no servidor. Envie o arquivo <b>data.json</b> do R08 para liberar o aplicativo.</div>
    <label for="gBase">Arquivo da base (data.json)</label><input id="gBase" type="file" accept=".json,application/json" style="padding-top:12px">
    <div id="gBaseMsg"></div><button type="button" class="gbtn gsec" id="gOut">Sair</button>`);
  $('gOut').onclick=()=>signOut(auth).then(()=>location.reload());
  $('gBase').onchange=async e=>{const f=e.target.files[0];if(!f)return;const m=$('gBaseMsg');m.innerHTML='<div class="gmsg">Enviando…</div>';
    try{await uploadBase(f);m.innerHTML='<div class="gmsg ok">Base carregada. Abrindo o aplicativo…</div>';setTimeout(()=>location.reload(),900)}catch(x){m.innerHTML=`<div class="gmsg bad">${esc(errTxt(x))}</div>`}}}
async function uploadBase(file){const txt=await file.text();let d;try{d=JSON.parse(txt)}catch(e){throw new Error('Arquivo não é um JSON válido.')}
  if(!d||!Array.isArray(d.codes)||!Array.isArray(d.rows)||!d.rows.length)throw new Error('O arquivo não tem o formato da base do R08 (codes e rows).');
  if(txt.length>1000000)throw new Error('Arquivo grande demais para o servidor (limite de 1 MB).');
  const ver=new Date().toLocaleString('pt-BR');await setDoc(doc(db,'base','r08'),{json:txt,version:ver,rows:d.rows.length,updatedAt:serverTimestamp(),by:auth.currentUser.email});return ver}

/* ---------------- fluxo principal ---------------- */
gate('<div class="gspin" aria-label="Carregando"></div>');
getRedirectResult(auth).catch(e=>loginScreen(errTxt(e),'bad'));
let handled=false;
onAuthStateChanged(auth,async user=>{
  if(!user){if(handled){location.reload();return}handled=true;loginScreen();return}
  if(handled&&window.__appStarted)return;handled=true;
  gate('<div class="gspin" aria-label="Carregando"></div><p class="gsub" style="text-align:center">Verificando acesso…</p>');
  try{
    const isAdm=normEmail(user.email)===ADMIN&&user.emailVerified===true;
    let ud=null,perms={};
    if(!isAdm){ud=await ensureUserDoc(user);
      if(ud.active!==true){waitScreen(user,ud.invited?'Usuário desativado.':'Cadastro recebido.',ud.invited?'Fale com o administrador para reativar o acesso.':'Seu acesso aguarda liberação do administrador. Você será liberado assim que ele autorizar.');watchUser(user);return}
      perms=await effectivePerms(ud);
      if(!anyView(perms)){waitScreen(user,'Sem páginas liberadas.','O administrador ainda não autorizou nenhuma página para você.');watchUser(user);return}}
    else if(normEmail(user.email)===ADMIN&&!user.emailVerified){waitScreen(user,'E-mail não verificado.','Entre com o Google para usar o acesso de administrador.');return}
    window.ACL={admin:isAdm,perms:isAdm?Object.fromEntries(PAGES.map(p=>[p.k,Object.fromEntries(p.acts.map(a=>[a,true]))])):perms,
      user:{uid:user.uid,email:user.email,name:(ud&&ud.name)||user.displayName||''},pages:PAGES,renderAdmin,signOut:()=>signOut(auth)};
    let base=null;try{base=await loadBase()}catch(e){if(e.code==='permission-denied'){waitScreen(user,'Acesso negado pelo servidor.','Seu usuário não tem permissão para a base do projeto.');return}throw e}
    if(!base){baseMissing(isAdm);return}
    window.PROJECT_DATA=base.data;window.BASE_VERSION=base.version;
    if(!isAdm)watchUser(user,true);
    startApp()}
  catch(e){gate(`<div class="gmsg bad">${esc(errTxt(e))}</div><button type="button" class="gbtn gsec" id="gRetry">Tentar de novo</button><button type="button" class="gbtn gsec" id="gOut">Sair</button>`);
    $('gRetry').onclick=()=>location.reload();$('gOut').onclick=()=>signOut(auth).then(()=>location.reload())}
});
// mudanças feitas pelo administrador (liberar, bloquear, desativar) valem sem precisar sair
let watching=false;
function watchUser(user,running){if(watching)return;watching=true;let first=true;
  onSnapshot(doc(db,'users',user.uid),s=>{if(first){first=false;return}location.reload()},()=>{})}

/* =================== Administração =================== */
let ADM={tab:'users',users:[],invites:[],profiles:[],sel:null};
async function loadAdm(){const [u,i,p]=await Promise.all([getDocs(collection(db,'users')),getDocs(collection(db,'invites')),getDocs(collection(db,'profiles'))]);
  ADM.users=u.docs.map(d=>({id:d.id,...d.data()}));ADM.profiles=p.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.name).localeCompare(b.name,'pt'));
  const used=new Set(ADM.users.map(x=>normEmail(x.email)));ADM.invites=i.docs.map(d=>({id:d.id,...d.data()})).filter(x=>!used.has(x.id))}
function stOf(u){if(u.kind==='invite')return ['st-inv','Convite pendente'];if(u.active)return ['st-on','Ativo'];return u.invited?['st-off','Inativo']:['st-wait','Aguardando autorização']}
const profName=id=>{const p=ADM.profiles.find(x=>x.id===id);return p?p.name:''};
function permsSummary(p){const n=PAGES.filter(pg=>p&&p[pg.k]&&p[pg.k].view).length;return n?`${n} de ${PAGES.length} páginas`:'sem páginas'}
function matrix(perms,editable){return `<table class="adm-mx"><thead><tr><th>Página</th>${Object.values(ACTS).map(a=>`<th>${a}</th>`).join('')}</tr></thead><tbody>
  ${PAGES.map(pg=>`<tr><td>${pg.t}<small>${Object.entries(pg.help).map(([a,t])=>`${ACTS[a]}: ${t}`).join(' · ')}</small></td>${Object.keys(ACTS).map(a=>pg.acts.includes(a)?`<td><input type="checkbox" data-pg="${pg.k}" data-a="${a}" ${perms&&perms[pg.k]&&perms[pg.k][a]?'checked':''} ${editable?'':'disabled'} aria-label="${ACTS[a]} — ${pg.t}"></td>`:'<td class="na">—</td>').join('')}</tr>`).join('')}</tbody></table>`}
function readMatrix(root){const p={};root.querySelectorAll('.adm-mx input[data-pg]').forEach(c=>{const pg=c.dataset.pg,a=c.dataset.a;if(!p[pg])p[pg]={};p[pg][a]=c.checked});
  for(const k in p){if(!p[k].view)for(const a in p[k])p[k][a]=false}return p} // sem visualizar, nenhuma ação
function bindMatrix(root){root.querySelectorAll('.adm-mx input[data-pg]').forEach(c=>c.addEventListener('change',()=>{const row=c.closest('tr');
  if(c.dataset.a==='view'&&!c.checked)row.querySelectorAll('input').forEach(x=>x.checked=false);if(c.dataset.a!=='view'&&c.checked)row.querySelector('input[data-a="view"]').checked=true}))}
function msgA(t,k){const m=$('admMsg');if(!m)return;m.className='adm-msg '+(k||'');m.textContent=t;m.hidden=false;clearTimeout(msgA.h);msgA.h=setTimeout(()=>m.hidden=true,6000)}

async function renderAdmin(root){if(!window.ACL||!window.ACL.admin){root.innerHTML='<p>Acesso restrito ao administrador principal.</p>';return}
  injectCss();root.innerHTML='<div class="gspin" style="margin:30px auto;border-color:#ccc;border-top-color:#C8101A"></div>';
  try{await loadAdm()}catch(e){root.innerHTML=`<div class="adm-msg bad">${esc(errTxt(e))}</div>`;return}
  root.innerHTML=`<div class="adm-tabs" role="tablist">${[['users','Usuários'],['profiles','Perfis de acesso'],['base','Base do projeto']].map(([k,t])=>`<button type="button" data-tab="${k}" aria-pressed="${ADM.tab===k}">${t}</button>`).join('')}</div><div class="adm-msg" id="admMsg" hidden></div><div id="admBody"></div>`;
  root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{ADM.tab=b.dataset.tab;ADM.sel=null;renderAdmin(root)});
  const B=$('admBody');
  if(ADM.tab==='users')return usersTab(B,root);if(ADM.tab==='profiles')return profilesTab(B,root);return baseTab(B,root)}

function usersTab(B,root){const rows=[...ADM.users.map(u=>({...u,kind:'user'})),...ADM.invites.map(i=>({...i,kind:'invite',email:i.email||i.id}))].sort((a,b)=>String(a.name||a.email).localeCompare(String(b.name||b.email),'pt'));
  if(ADM.sel)return userEditor(B,root,ADM.sel);
  B.innerHTML=`<div class="adm-card"><h2>Usuários <button type="button" class="adm-btn yel" id="admNew">+ Novo usuário</button></h2>
    <div class="adm-list"><div class="adm-row" style="cursor:default"><div><b>${esc(window.ACL.user.name||'Administrador principal')}</b><small>${esc(ADMIN)} · todas as páginas e o gerenciamento</small></div><span class="adm-st st-adm">Administrador</span></div>
    ${rows.map((u,k)=>{const [c,t]=stOf(u);const pr=u.custom||!u.profile?'Permissões próprias · '+permsSummary(u.perms):'Perfil: '+(profName(u.profile)||'(excluído)');
      return `<button type="button" class="adm-row" data-k="${k}"><div><b>${esc(u.name||'(sem nome)')}</b><small>${esc(u.email)}</small><small>${esc(pr)}</small></div><span class="adm-st ${c}">${t}</span></button>`}).join('')}
    ${rows.length?'':'<p class="adm-note">Nenhum usuário além do administrador. Toque em "Novo usuário" para cadastrar, ou peça para a pessoa criar a conta: ela aparece aqui aguardando autorização.</p>'}</div></div>`;
  $('admNew').onclick=()=>{ADM.sel={kind:'new'};renderAdmin(root)};
  B.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{ADM.sel=rows[+b.dataset.k];renderAdmin(root)})}

function userEditor(B,root,u){const isNew=u.kind==='new';const custom=isNew?false:(u.custom||!u.profile);const perms=u.perms||{};
  const [c,t]=isNew?['st-wait','Novo']:stOf(u);
  B.innerHTML=`<div class="adm-card"><h2>${isNew?'Novo usuário':'Usuário'} <span class="adm-st ${c}">${t}</span></h2>
    <div class="adm-form"><label>Nome<input id="uName" value="${esc(u.name||'')}" autocomplete="off"></label>
      <label>E-mail<input id="uEmail" type="email" value="${esc(u.email||'')}" ${isNew?'':'disabled'} autocomplete="off"></label>
      <label>Perfil de acesso<select id="uProf"><option value="">Permissões próprias (definidas abaixo)</option>${ADM.profiles.map(p=>`<option value="${esc(p.id)}" ${!custom&&u.profile===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label></div>
    <label class="adm-toggle"><input type="checkbox" id="uAct" ${u.active?'checked':''}> Usuário ativo (pode entrar no aplicativo)</label>
    <div id="uMx"></div>
    <p class="adm-note">${isNew?'O cadastro fica como convite: quando a pessoa entrar pela primeira vez com este e-mail (Google ou e-mail e senha), recebe exatamente estas permissões.':'Com um perfil escolhido, o usuário segue as permissões do perfil. Escolha "Permissões próprias" para liberar ou bloquear páginas só para ele.'}</p>
    <div class="adm-acts"><button type="button" class="adm-btn" id="uSave">Salvar</button><button type="button" class="adm-btn sec" id="uBack">Voltar</button>
      ${isNew?'':`<button type="button" class="adm-btn ${u.active?'red':'sec'}" id="uTog">${u.active?'Desativar':'Ativar'}</button>`}${u.kind==='invite'?'<button type="button" class="adm-btn red" id="uDel">Excluir convite</button>':''}</div></div>`;
  const drawMx=()=>{const pid=$('uProf').value;const p=pid?(ADM.profiles.find(x=>x.id===pid)||{}).perms:perms;$('uMx').innerHTML=(pid?`<p class="adm-note">Permissões do perfil <b>${esc(profName(pid))}</b> (edite em Perfis de acesso):</p>`:'')+matrix(p,!pid);bindMatrix($('uMx'))};
  $('uProf').onchange=drawMx;drawMx();
  $('uBack').onclick=()=>{ADM.sel=null;renderAdmin(root)};
  $('uSave').onclick=async()=>{const pid=$('uProf').value||null;const data={name:$('uName').value.trim(),profile:pid,custom:!pid,perms:pid?{}:readMatrix($('uMx')),active:$('uAct').checked};
    try{if(isNew){const e=normEmail($('uEmail').value);if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)){msgA('Informe um e-mail válido.','bad');return}
        if(e===ADMIN){msgA('Este é o e-mail do administrador principal.','bad');return}
        if(ADM.users.some(x=>normEmail(x.email)===e)){msgA('Já existe um usuário com este e-mail.','bad');return}
        await setDoc(doc(db,'invites',e),{...data,email:e,createdAt:serverTimestamp()})}
      else if(u.kind==='invite')await setDoc(doc(db,'invites',u.id),{...data,email:u.email},{merge:true});
      else await updateDoc(doc(db,'users',u.id),{...data,...(data.active?{invited:true}:{}),updatedAt:serverTimestamp()});
      ADM.sel=null;await renderAdmin(root);msgA('Salvo.','ok')}catch(e){msgA(errTxt(e),'bad')}};
  if($('uTog'))$('uTog').onclick=async()=>{try{const ref=u.kind==='invite'?doc(db,'invites',u.id):doc(db,'users',u.id);await updateDoc(ref,u.kind!=='invite'&&!u.active?{active:true,invited:true}:{active:!u.active});ADM.sel=null;await renderAdmin(root);msgA(u.active?'Usuário desativado.':'Usuário ativado.','ok')}catch(e){msgA(errTxt(e),'bad')}};
  if($('uDel'))$('uDel').onclick=async()=>{if(!confirm('Excluir este convite?'))return;try{await deleteDoc(doc(db,'invites',u.id));ADM.sel=null;await renderAdmin(root);msgA('Convite excluído.','ok')}catch(e){msgA(errTxt(e),'bad')}}}

function profilesTab(B,root){const sel=ADM.sel;
  if(sel){const isNew=sel.kind==='new';const users=ADM.users.filter(u=>!u.custom&&u.profile===sel.id);
    B.innerHTML=`<div class="adm-card"><h2>${isNew?'Novo perfil':'Perfil de acesso'}</h2><div class="adm-form"><label>Nome do perfil<input id="pName" value="${esc(sel.name||'')}" placeholder="ex.: Apontador de campo"></label></div>
      <div id="pMx">${matrix(sel.perms||{},true)}</div>${isNew?'':`<p class="adm-note">${users.length} usuário(s) usam este perfil: ${esc(users.map(u=>u.name||u.email).join(', ')||'nenhum')}. Alterações valem para todos eles.</p>`}
      <div class="adm-acts"><button type="button" class="adm-btn" id="pSave">Salvar</button><button type="button" class="adm-btn sec" id="pBack">Voltar</button>${isNew?'':'<button type="button" class="adm-btn red" id="pDel">Excluir perfil</button>'}</div></div>`;
    bindMatrix($('pMx'));$('pBack').onclick=()=>{ADM.sel=null;renderAdmin(root)};
    $('pSave').onclick=async()=>{const name=$('pName').value.trim();if(!name){msgA('Dê um nome ao perfil.','bad');return}
      const id=isNew?(name.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'perfil')+'-'+Date.now().toString(36):sel.id;
      try{await setDoc(doc(db,'profiles',id),{name,perms:readMatrix($('pMx')),updatedAt:serverTimestamp()});ADM.sel=null;await renderAdmin(root);msgA('Perfil salvo.','ok')}catch(e){msgA(errTxt(e),'bad')}};
    if($('pDel'))$('pDel').onclick=async()=>{if(users.length){msgA('Este perfil está em uso. Troque o perfil desses usuários antes de excluir.','bad');return}if(!confirm('Excluir o perfil?'))return;
      try{await deleteDoc(doc(db,'profiles',sel.id));ADM.sel=null;await renderAdmin(root);msgA('Perfil excluído.','ok')}catch(e){msgA(errTxt(e),'bad')}};return}
  B.innerHTML=`<div class="adm-card"><h2>Perfis de acesso <button type="button" class="adm-btn yel" id="pNew">+ Novo perfil</button></h2><div class="adm-list">
    ${ADM.profiles.map((p,k)=>`<button type="button" class="adm-row" data-k="${k}"><div><b>${esc(p.name)}</b><small>${permsSummary(p.perms)} · ${ADM.users.filter(u=>!u.custom&&u.profile===p.id).length} usuário(s)</small></div><span class="adm-st st-inv">Editar</span></button>`).join('')||'<p class="adm-note">Nenhum perfil criado. Exemplos: "Apontador de campo" (Localização, Mapa e Foto), "Programação" (Calculadora e Relatórios).</p>'}</div></div>`;
  $('pNew').onclick=()=>{ADM.sel={kind:'new',perms:{}};renderAdmin(root)};B.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{ADM.sel=ADM.profiles[+b.dataset.k];renderAdmin(root)})}

async function baseTab(B,root){let info='';try{const s=await getDoc(doc(db,'base','r08'));if(s.exists()){const d=s.data();info=`Versão carregada em ${esc(d.version)} · ${esc(d.rows||'')} estacas · por ${esc(d.by||'')}`}}catch(e){info=esc(errTxt(e))}
  B.innerHTML=`<div class="adm-card"><h2>Base do projeto (R08 + estacas)</h2><p class="adm-note">${info||'Nenhuma base carregada.'}</p>
    <p class="adm-note">A base fica no servidor e só é entregue a usuários ativos com alguma página liberada. Para atualizar, envie um novo arquivo data.json.</p>
    <div class="adm-form"><label>Novo arquivo da base<input type="file" id="bFile" accept=".json,application/json" style="padding-top:10px"></label></div></div>`;
  $('bFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const v=await uploadBase(f);msgA('Base atualizada ('+v+'). Os usuários recebem a nova versão ao abrir o app.','ok');baseTab(B,root)}catch(x){msgA(errTxt(x),'bad')}}}

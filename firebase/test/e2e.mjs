// Teste de ponta a ponta no emulador: login, liberação pelo administrador, páginas por permissão,
// bloqueio por URL direta, desativação e convite. Gera relatório e capturas de tela em ../ci-report.
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const OUT=process.env.OUT||'ci-report';mkdirSync(OUT,{recursive:true});
const PJ='demo-estacas',FS=`http://127.0.0.1:8080/v1/projects/${PJ}/databases/(default)/documents`,AU='http://127.0.0.1:9099';
const BASE='http://127.0.0.1:5000/?emu=1';
const ADMIN='igordalmolin.eng@gmail.com';
const results=[];const ok=(c,n)=>{results.push([c?'OK':'FALHOU',n]);console.log(c?'OK':'FALHOU',n)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// base sintética (não usa dados do projeto real)
const rows=[];for(let k=0;k<200;k++){const odo=196000+20*k,km=Math.floor(odo/1000),o=odo%1000;
  const c=k<60?2:k<120?3:k<160?4:0;rows.push([`${km}+${String(o).padStart(3,'0')}`,Math.round((-25.47+k*0.00015)*1e5),Math.round((-50.0+k*0.00012)*1e5),odo,2,km,[c,c,0,c,c,0],'....',1])}
const base={codes:['RF','FE','FF','FS'],rows,odo0:196000};
await fetch(`${FS}/base/r08`,{method:'PATCH',headers:{'Authorization':'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:{json:{stringValue:JSON.stringify(base)},version:{stringValue:'teste'},rows:{integerValue:String(rows.length)}}})}).then(r=>ok(r.ok,'base sintética gravada no emulador'));
// administrador: conta de e-mail/senha com e-mail verificado (no emulador)
const su=await (await fetch(`${AU}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:ADMIN,password:'admin123',returnSecureToken:true})})).json();
await fetch(`${AU}/identitytoolkit.googleapis.com/v1/projects/${PJ}/accounts:update`,{method:'POST',headers:{'Authorization':'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({localId:su.localId,emailVerified:true})});

const browser=await chromium.launch();
async function session(name){const ctx=await browser.newContext({viewport:{width:393,height:852}});const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('dialog',d=>d.accept());p.shot=async n=>p.screenshot({path:`${OUT}/${name}-${n}.png`});return p}
async function signup(p,name,email,pass){await p.goto(BASE);await p.waitForSelector('#gGoogle');await p.click('#gMode');await p.fill('#gName',name);await p.fill('#gEmail',email);await p.fill('#gPass',pass);await p.click('#gForm button[type=submit]')}
async function signin(p,email,pass){await p.goto(BASE);await p.waitForSelector('#gGoogle');await p.fill('#gEmail',email);await p.fill('#gPass',pass);await p.click('#gForm button[type=submit]')}
const gateText=async p=>(await p.locator('#gate').count())?(await p.textContent('#gate')):'';
const drawerPages=p=>p.$$eval('#drawer a[data-page]',as=>as.filter(a=>getComputedStyle(a).display!=='none'&&!a.hidden).map(a=>a.dataset.page));

try{
  // 1. novo usuário cria conta e fica sem acesso
  const u=await session('usuario');await signup(u,'Apontador Teste','apontador@teste.com','senha123');await sleep(2500);
  ok(/aguarda liberação/i.test(await gateText(u)),'conta nova fica aguardando liberação do administrador');await u.shot('1-aguardando');
  ok(!(await u.evaluate(()=>!!window.PROJECT_DATA)),'conta nova não recebe a base do projeto');

  // 2. administrador entra e libera Localização + Mapa
  const a=await session('admin');await signin(a,ADMIN,'admin123');await a.waitForFunction(()=>window.__appStarted&&!document.getElementById('gate'),null,{timeout:20000});
  ok(true,'administrador entra no aplicativo');
  ok((await drawerPages(a)).includes('admin'),'menu Administração visível para o administrador');
  await a.goto(BASE.replace('/?','/?')+'#admin');await a.waitForSelector('.adm-row',{timeout:15000});await a.shot('2-admin-lista');
  const row=a.locator('.adm-row',{hasText:'apontador@teste.com'});ok(await row.count()===1,'usuário novo aparece na lista');ok(/Apontador Teste/.test(await row.textContent()),'nome informado no cadastro aparece na lista');
  ok(/Aguardando autorização/.test(await row.textContent()),'status do usuário novo: Aguardando autorização');
  await row.click();await a.waitForSelector('#uMx .adm-mx');
  await a.check('#uMx input[data-pg="localizacao"][data-a="view"]');await a.check('#uMx input[data-pg="mapa"][data-a="view"]');await a.check('#uAct');
  await a.shot('3-admin-permissoes');await a.click('#uSave');await a.waitForSelector('.adm-msg.ok',{timeout:10000});ok(true,'administrador salva as permissões');

  // 3. usuário recarrega e vê só as páginas liberadas
  await u.goto(BASE);await u.waitForFunction(()=>window.__appStarted&&!document.getElementById('gate'),null,{timeout:20000});
  const pg=await drawerPages(u);ok(pg.join(',')==='localizacao,mapa','usuário vê só Localização e Mapa no menu ('+pg.join(',')+')');
  await u.goto(BASE+'#calculadora');await u.waitForFunction(()=>window.__appStarted,null,{timeout:20000});await sleep(1200);
  ok(await u.evaluate(()=>document.querySelector('#pCalc').hidden&&location.hash!=='#calculadora'),'URL direta da Calculadora é bloqueada');
  await u.goto(BASE+'#admin');await sleep(2500);ok(await u.evaluate(()=>document.querySelector('#pAdmin').hidden),'URL direta da Administração é bloqueada');
  await u.shot('4-usuario-liberado');
  const direct=await u.evaluate(async()=>{try{const r=await fetch('http://127.0.0.1:8080/v1/projects/demo-estacas/databases/(default)/documents/users');return r.status}catch(e){return 'erro'}});
  ok(direct===401||direct===403,'API do banco recusa leitura sem credencial ('+direct+')');

  // 4. administrador desativa: usuário perde acesso
  await a.goto(BASE+'#admin');await a.waitForSelector('.adm-row');await a.locator('.adm-row',{hasText:'apontador@teste.com'}).click();await a.click('#uTog');await a.waitForSelector('.adm-msg.ok');
  await u.goto(BASE);await sleep(3000);ok(/desativado/i.test(await gateText(u)),'usuário desativado não entra');await u.shot('5-desativado');

  // 5. convite com perfil: acesso imediato no primeiro login
  await a.goto(BASE+'#admin');await a.waitForSelector('.adm-tabs');await a.click('[data-tab="profiles"]');await a.click('#pNew');await a.fill('#pName','Programação');
  await a.check('#pMx input[data-pg="calculadora"][data-a="view"]');await a.check('#pMx input[data-pg="relatorios"][data-a="view"]');await a.click('#pSave');await a.waitForSelector('.adm-msg.ok');
  await a.click('[data-tab="users"]');await a.click('#admNew');await a.fill('#uName','Programador');await a.fill('#uEmail','prog@teste.com');
  await a.selectOption('#uProf',{label:'Programação'});await a.check('#uAct');await a.click('#uSave');await a.waitForSelector('.adm-msg.ok');await a.shot('6-convite');
  const c=await session('convidado');await signup(c,'Programador','prog@teste.com','senha123');await c.waitForFunction(()=>window.__appStarted&&!document.getElementById('gate'),null,{timeout:20000});
  const pc=await drawerPages(c);ok(pc.join(',')==='calculadora,relatorios','convidado entra direto com as páginas do perfil ('+pc.join(',')+')');
  ok(await c.evaluate(()=>getComputedStyle(document.getElementById('cRep')).display==='none'),'sem "Criar" na Calculadora, botão de emitir programação fica oculto');
  await c.shot('7-convidado');
  for(const p of [u,a,c])if(p.errs.length)ok(false,'erros de JavaScript: '+p.errs.join(' | '));
}catch(e){ok(false,'erro no teste: '+(e.stack||e))}
await browser.close();
const n=results.filter(r=>r[0]==='OK').length;
writeFileSync(`${OUT}/e2e-report.txt`,`Teste de ponta a ponta: ${n}/${results.length} OK\n\n`+results.map(r=>r.join('  ')).join('\n')+'\n');
process.exit(n===results.length?0:1);

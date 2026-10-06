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
// base sintética da BR-373 B4 (mesmo formato do arquivo real, valores fictícios)
const F4=['n','tipo_solucao','sigla','sentido','faixa_elemento','coluna_unifilar','marco_km','linha_inicial_unifilar','linha_final_unifilar','estaca_inicial','estaca_final','hodometro_inicial_km','hodometro_final_km','qtd_quadrados','extensao_m','extensao_hodometro_m','largura_media_m','espessura_m','area_m2_ou_secao_m2','quantidade','unidade','observacao','hodometro_linha_seguinte_km','estaca_linha_seguinte','conferencia'];
const r4=[];for(let k=0;k<100;k++){const odo=183600+20*k,km=183+Math.floor((400+20*k)/1000),o=(400+20*k)%1000;r4.push([`${km}+${String(o).padStart(3,'0')}`,Math.round((-25.04+k*0.00012)*1e5),Math.round((-50.28-k*0.00015)*1e5),odo,4,km,[0,0,0,0,0,0],'....',null])}
const nm=i=>r4[i][0];const rec=(n,L,i0,i1,sig,tipo,sent,fx,un,q)=>[L,i0,i1,n,tipo,sig,sent,fx,'Y',r4[i0][5],1,2,nm(i0),i1+1<100?nm(i1+1):'Sem linha no unifilar',r4[i0][3]/1000,(r4[i1][3]+20)/1000,i1-i0+1,20*(i1-i0+1),20*(i1-i0+1),3.5,0.06,70*(i1-i0+1),q,un,null,(r4[i1][3]+20)/1000,'x','OK'];
for(let k=10;k<=14;k++)r4[k][6][2]=1;for(let k=20;k<=29;k++)r4[k][6][5]=2;r4[40][7]='...o';
const base4={codes:['FF','PA2,0'],rows:r4,odo0:183600,base:'BR-373 B4',src:{metadados:{arquivo:'teste.xlsx',aba_panos:'Panos',total_panos:3},premissas:{},resumo:[],campos:F4,textos:[],avisos:[],kmz:{estacas:100,sem_coordenada:[]},
  panos:[rec(1,2,10,14,'FF','Fresagem Funcional + recomposição CBUQ','Crescente','Faixa 1','t',10.6),rec(2,5,20,29,'PA2,0','Preenchimento do Acostamento com RAP','Decrescente','Acostamento / bordo','m³',10),rec(3,'SC',40,40,'●','Encaixe Saída Boca de Dreno','Crescente','Saída de dreno','un',1)]}};
await fetch(`${FS}/base/b4`,{method:'PATCH',headers:{'Authorization':'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:{json:{stringValue:JSON.stringify(base4)},version:{stringValue:'teste'}}})}).then(r=>ok(r.ok,'base sintética B4 gravada no emulador'));
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
  ok(await u.evaluate(()=>window.PROJECT_DATA_B4===null),'sem a aba BR-373 B4 liberada, a base B4 não é entregue');
  await u.goto(BASE+'#mapab4');await sleep(2000);ok(await u.evaluate(()=>document.querySelector('#b4_pMap').hidden),'URL direta da aba BR-373 B4 é bloqueada');
  await u.goto(BASE+'#calculadora');await u.waitForFunction(()=>window.__appStarted,null,{timeout:20000});await sleep(1200);
  ok(await u.evaluate(()=>document.querySelector('#pCalc').hidden&&location.hash!=='#calculadora'),'URL direta da Calculadora é bloqueada');
  await u.goto(BASE+'#admin');await sleep(2500);ok(await u.evaluate(()=>document.querySelector('#pAdmin').hidden),'URL direta da Administração é bloqueada');
  await u.shot('4-usuario-liberado');
  const direct=await u.evaluate(async()=>{try{const r=await fetch('http://127.0.0.1:8080/v1/projects/demo-estacas/databases/(default)/documents/users');return r.status}catch(e){return 'erro'}});
  ok(direct===401||direct===403,'API do banco recusa leitura sem credencial ('+direct+')');

  // 3b. administrador libera a aba BR-373 B4
  await a.goto(BASE+'#admin');await a.waitForSelector('.adm-row');await a.locator('.adm-row',{hasText:'apontador@teste.com'}).click();await a.waitForSelector('#uMx .adm-mx');
  await a.check('#uMx input[data-pg="mapab4"][data-a="view"]');await a.click('#uSave');await a.waitForSelector('.adm-msg.ok');
  await u.goto(BASE+'#mapab4');await u.waitForFunction(()=>window.__appStarted&&!document.getElementById('gate'),null,{timeout:20000});await sleep(2500);
  const pg4=await drawerPages(u);ok(pg4.includes('mapab4'),'com a aba liberada, "Estacas BR-373 B4" aparece no menu ('+pg4.join(',')+')');
  const s4=await u.evaluate(()=>window.__b4&&window.__b4());ok(s4&&s4.panos===3&&s4.ligados===2&&s4.saidas===1&&s4.erros.length===0,'aba B4 recebe a base do servidor e liga os panos às estacas '+JSON.stringify(s4&&{...s4,erros:s4.erros.length}));
  await u.shot('4b-aba-b4');
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

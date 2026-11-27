// Responsáveis pelas assinaturas: cadastro, endereço pessoal e RDO enviado para a página de cada um (stub do banco)
const {chromium}=require('/home/claude/localizador-de-estacas/firebase/node_modules/playwright');const W=ms=>new Promise(r=>setTimeout(r,ms));
const res=[];const ok=(c,n)=>{res.push(!!c);console.log((c?'OK  ':'FALHOU ')+n)};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const ctx=await b.newContext({viewport:{width:1280,height:900}});
await ctx.addInitScript(()=>{const rd={},subs=[],as={},asubs=[],ps={},psubs=[];window.__RD=rd;const fire=()=>setTimeout(()=>subs.forEach(cb=>cb(Object.values(rd))),10);const afire=()=>setTimeout(()=>asubs.forEach(cb=>cb(Object.values(as))),10);const pfire=()=>setTimeout(()=>psubs.forEach(cb=>cb(Object.values(ps))),10);
  window.__AS=as;window.__PS=ps;window.__PFIRE=pfire;window.__CV={};const cvfire=()=>setTimeout(()=>window.__CVS&&window.__CVS(Object.values(window.__CV)),10);
  window.RdoDB={subscribe:cb=>{subs.push(cb);setTimeout(()=>cb(Object.values(rd)),50);return()=>{}},save:async s=>{rd[s.id]=Object.assign({},s,{status:'aguardando',enviado_por:'t@x',enviado_em:Date.now()});fire()},exists:async id=>!!rd[id],
    assSubscribe:cb=>{asubs.push(cb);setTimeout(()=>cb(Object.values(as)),60);return()=>{}},assCreate:async docs=>{for(const o of docs){as[o.tok]=Object.assign({},o,{status:'pendente'});if(o.pessoa){if(!ps[o.pessoa])throw new Error('pessoa inexistente');ps[o.pessoa].docs=[...ps[o.pessoa].docs,o.tok]}}afire();pfire()},
    pesSubscribe:cb=>{psubs.push(cb);setTimeout(()=>cb(Object.values(ps)),70);return()=>{}},pesCreate:async o=>{ps[o.id]=Object.assign({},o,{ativo:true,docs:[]});pfire()},pesUpd:async(id,o)=>{Object.assign(ps[id],o);pfire()},pesDel:async id=>{delete ps[id];pfire()},convCreate:async o=>{window.__CV[o.tok]=Object.assign({},o,{usado:false,criado_em:Date.now()});cvfire()},convSubscribe:cb=>{window.__CVS=cb;setTimeout(()=>cb(Object.values(window.__CV)),40);return()=>{}},convDel:async t=>{delete window.__CV[t];cvfire()},
    cfg:async()=>({}),setCfg:async()=>{},can:true,val:true,admin:false}});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>{errs.push(e.message);console.log('ERR',e.message,(e.stack||'').split('\n')[1])});p.on('dialog',d=>d.accept());await p.route(/(openstreetmap|arcgisonline)/,r=>r.abort());
await p.goto('http://localhost:8772/#rdo');await W(1500);await p.evaluate(()=>localStorage.removeItem('br277.massa.dia'));await p.reload();await W(2000);
ok(await p.isVisible('#rdPesCard'),'card "Responsáveis pelas assinaturas" na página RDO');
const cad=async(nm,fn,pp)=>{await p.fill('#rpNome',nm);await p.fill('#rpFun',fn);await p.selectOption('#rpPap',pp);await p.click('#rpAdd');await W(400)};
await cad('Ana Engenheira','Engenheira de Produção','eng');ok(/Ana Engenheira cadastrado/.test(await p.textContent('#rpMsg'))&&!!(await p.$('#rpMsg [data-pslk]')),'cadastro gera o endereço da página de assinaturas');
await cad('Bruno Encarregado','Encarregado de obras','enc');await cad('Carla Fiscal','Fiscal Via Araucária','fis');
ok((await p.$$('#rdPes table tbody tr')).length===3&&/aguarda a pessoa/.test(await p.textContent('#rdPes')),'3 responsáveis listados, cadastro aguardando cada pessoa');
await p.evaluate(()=>{const x=Object.values(window.__PS).find(y=>/Ana/.test(y.nome));Object.assign(x,{nome:'Ana Maria Souza',assinatura:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',perfil_em:Date.now()});window.__PFIRE()});await W(400);
ok(/Ana Maria Souza/.test(await p.textContent('#rdPes'))&&(await p.$$('#rdPes .rdp-sig')).length===1,'cadastro completado pela pessoa aparece (nome completo e assinatura padrão)');
// RDO com os responsáveis cadastrados
await p.fill('#cmUsi','30');await p.dispatchEvent('#cmUsi','change');await W(150);
await p.click('#cmRoot [data-cm="add"] >> nth=0');await W(200);await p.fill('#cfIni','236+300');await p.fill('#cfLen','100');await p.fill('#cfW','3.6');await p.fill('#cfE','5');await p.click('#cfBus');await W(100);await p.click('#cmDlg button[type=submit]');await W(300);
await p.click('#cmRoot [data-cm="add"] >> nth=0');await W(200);await p.fill('#cfIni','2341042');await p.fill('#cfLen','20');await p.fill('#cfW','3.6');await p.fill('#cfE','5');await p.click('#cmDlg button[type=submit]');await W(300);
{const t=await p.textContent('#cmRoot');ok((await p.$$('#cmRoot .cm-seg')).length===2&&/234\+1042/.test(t)&&/235\+0[56]2/.test(t),'estaca com mais de 1000 m aceita (234+1042 → final no km 235)')}
const fillHor=async()=>{for(const el of await p.$$('#cmRoot input[type=time]'))await el.fill('07:00');await W(150)};await fillHor();
{const t0=await p.textContent('#cmRoot .cm-kpi');await p.click('#cmRoot [data-cm="nfres"][data-i="1"]');await W(300);const t1=await p.textContent('#cmRoot .cm-kpi');
  ok(!!(await p.$('#cmRoot .cm-seg[data-i="1"].cm-off'))&&/ainda não fresado/.test(t1)&&/fora da conta/.test(await p.textContent('#cmRoot .cm-seg[data-i="1"]'))&&t0!==t1,'segmento "ainda não fresado": apagado e fora das contas ('+t1.replace(/\s+/g,' ').slice(0,80)+')')}
ok(!!(await p.$('#cmRoot select[data-relp="eng"]')),'RDO: responsáveis escolhidos entre os cadastrados');
await p.selectOption('#cmEq','Equipe Pavimentação Johonatan');await p.dispatchEvent('#cmEq','change');await W(200);
await p.click('#cmRoot [data-cm="send"]');await W(800);ok(/Escolha o Engenheiro/.test(await p.textContent('#cmMsg')),'sem engenheiro escolhido o RDO não é enviado');
const pid=n=>p.evaluate(n=>Object.values(window.__PS).find(y=>y.nome.startsWith(n)).id,n);
await p.selectOption('#cmRoot select[data-relp="eng"]',await pid('Ana'));await p.selectOption('#cmRoot select[data-relp="enc"]',await pid('Bruno'));await p.selectOption('#cmRoot select[data-relp="fis"]',await pid('Carla'));await W(200);
await p.click('#cmRoot [data-cm="send"]');await W(3000);const sm=await p.textContent('#cmMsg');
ok(/pendente na página de assinaturas de Ana Maria Souza/.test(sm)&&!!(await p.$('#cmMsg [data-pslk]')),'RDO gerado e pendente na página da engenheira ('+sm.slice(0,90)+')');
{const R=await p.evaluate(()=>{const r=Object.values(window.__RD||{})[0];return r?r.segs.length:null});ok(R===1&&!!(await p.$('#cmRoot .cm-seg.cm-off [data-cm="nfres"]')),'não fresado fica fora do RDO enviado e continua no aparelho para o próximo envio')}
const A=await p.evaluate(()=>Object.values(window.__AS).map(a=>[a.papel,!!a.pessoa,a.nome,a.tipo]));ok(A.length===3&&A.every(a=>a[1]&&a[3]==='RDO')&&A.find(a=>a[0]==='eng')[2]==='Ana Maria Souza','assinaturas ligadas às pessoas cadastradas '+JSON.stringify(A));
const D=await p.evaluate(()=>Object.values(window.__PS).map(y=>y.docs.length));ok(D.every(n=>n===1),'cada pessoa recebeu o RDO na sua caixa de assinaturas');
await W(300);ok(/aguardando o engenheiro/.test(await p.textContent("#rdPes"))&&(await p.$$('#rdCentral [data-pslk]')).length===1,'pendentes por pessoa e endereço pessoal na Central de RDOs');
await p.$eval('#rdPesCard',e=>e.scrollIntoView());await p.screenshot({path:'/tmp/claude-0/rdo_pes.png'});
// devolução para correção pelo engenheiro: RDO devolvido, segmentos voltam para o apontador
await p.evaluate(()=>{const a=Object.values(window.__AS).find(x=>x.papel==='eng');Object.assign(a,{status:'devolvido',devolvido_nome:'Ana Maria Souza',devolvido_em:Date.now(),devolvido_motivo:'Horário da fresagem errado'});for(const cb of [])cb()});
await p.evaluate(()=>window.RdoDB.assCreate([]));await W(1200);
ok(/devolvido/.test(await p.textContent('#rdCentral'))&&/Horário da fresagem errado/.test(await p.textContent('#rdCentral')),'Central mostra a devolução com o motivo');
ok((await p.$$('#cmRoot .cm-dev')).length===1&&/Horário da fresagem errado/.test(await p.textContent('#cmRoot .cm-dev')),'segmentos voltam para o RDO do apontador com o motivo da devolução');
// editar cadastro
{const bid=await p.evaluate(()=>Object.values(window.__PS).find(y=>/Bruno/.test(y.nome)).id);await p.click(`#rdPes [data-psed="${bid}"]`);await W(200);await p.fill('#rpEdN','Bruno Carvalho Lima');await p.fill('#rpEdF','Encarregado de Pavimentação');await p.selectOption('#rpEdP','enc');await p.click('#rpEdS');await W(400);
  ok(/Bruno Carvalho Lima/.test(await p.textContent('#rdPes'))&&/Encarregado de Pavimentação/.test(await p.textContent('#rdPes')),'editar o cadastro (nome, função e assina como)')}
// link de cadastro
await p.click('#rpConv');await W(400);ok(!!(await p.$('#rpCvMsg [data-cvlk]'))&&/Links de cadastro ainda não usados/.test(await p.textContent('#rdPes')),'gera o link para a pessoa se cadastrar');
// desativar
await p.click(`#rdPes [data-psoff="${await pid('Carla')}"]`);await W(400);ok(/desativado/.test(await p.textContent('#rdPes'))&&!(await p.$$eval('#cmRoot select[data-relp="fis"] option',a=>a.map(o=>o.textContent))).some(t=>/Carla/.test(t)),'desativado some da escolha no RDO');
ok(!errs.length,'sem erros JS '+JSON.stringify(errs.slice(0,3)));console.log(`\n${res.filter(Boolean).length}/${res.length}`);await b.close()})();

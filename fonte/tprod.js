// Produção executada: importação manual e monitoramento automático (pasta simulada), com o servidor simulado em memória.
// Uso: node fonte/tprod.js <porta> <arquivo .xlsb servido na raiz>   (dados reais não ficam no repositório)
const {chromium}=require('/home/claude/localizador-de-estacas/firebase/node_modules/playwright');const W=ms=>new Promise(r=>setTimeout(r,ms));
const PORT=process.argv[2]||8772,XF=process.argv[3]||'prod_test.xlsb';
const res=[];const ok=(c,n)=>{res.push(c);console.log((c?'OK  ':'FALHOU ')+n)};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const ctx=await b.newContext({viewport:{width:1366,height:900}});
await ctx.addInitScript(()=>{window.__PROD_T={poll:1500,stable:2500};const docs=JSON.parse(localStorage.getItem('__pdocs')||'{}'),subs=[];window.__DOCS=docs;window.__SAVES=0;const keep=()=>{try{localStorage.setItem('__pdocs',JSON.stringify(docs))}catch(e){}};
  const fire=id=>subs.forEach(cb=>cb(id,docs[id]||null));
  window.ProdDB={subscribe:cb=>{subs.push(cb);setTimeout(()=>['producao_meta','producao_b23','producao_b4','producao_status'].forEach(id=>cb(id,docs[id]||null)),50);return ()=>{}},
    save:async parts=>{for(const [k,o] of Object.entries(parts)){const txt=JSON.stringify(o);if(txt.length>1000000)throw new Error('grande demais '+k+' '+txt.length);docs['producao_'+k]={json:txt}}keep();window.__SAVES++;setTimeout(()=>Object.keys(parts).forEach(k=>fire('producao_'+k)),30)},
    status:async st=>{docs.producao_status=Object.assign({},st,{by:'teste@x'});keep();fire('producao_status')},saveNotas:async all=>{docs.producao_notas={json:JSON.stringify(all)};keep();fire('producao_notas')}};
  // controle de RMPs simulado (coleção e fotos em memória/localStorage)
  const rm=JSON.parse(localStorage.getItem('__rmp')||'{}'),rmM={},rsubs=[];window.__RA={};const rkeep=()=>{try{localStorage.setItem('__rmp',JSON.stringify(rm))}catch(e){}};const rfire=()=>rsubs.forEach(cb=>cb(Object.values(rm)));
  window.RmpDB={subscribe:cb=>{rsubs.push(cb);setTimeout(()=>cb(Object.values(rm)),60);return ()=>{}},save:async r=>{rm[r.id]=Object.assign({},r,{atualizado_por:'teste@x',atualizado_em:Date.now()});rkeep();setTimeout(rfire,20)},
    saveMedia:async m=>{rmM[m.id]=m},getMedia:async id=>rmM[id]||null,can:true,admin:true,
    assSubscribe:cb=>{window.__RAS=cb;setTimeout(()=>cb(Object.values(window.__RA)),80);return ()=>{}},assCreate:async(docs,pdf)=>{for(const o of docs)window.__RA[o.tok]=Object.assign({},o,{status:'pendente'});window.__RPDF=pdf;setTimeout(()=>window.__RAS&&window.__RAS(Object.values(window.__RA)),10)},assDel:async t=>{for(const x of t)delete window.__RA[x]},
    pesSubscribe:cb=>{setTimeout(()=>cb([{id:'p'.repeat(32),nome:'Ana Maria Souza',funcao:'Engenheira de Produção',papel:'eng',ativo:true,docs:[]},{id:'q'.repeat(32),nome:'Carla Fiscal Lima',funcao:'Fiscal da Via Araucária',papel:'fis',ativo:true,docs:[]}]),90);return ()=>{}},
    mailCfg:async()=>JSON.parse(localStorage.getItem('__rmmail')||'null'),setMailCfg:async c=>localStorage.setItem('__rmmail',JSON.stringify(c)),claimMail:async id=>{const m=(rm[id]||{}).email||{};if(m.st==='enviado'||m.st==='enviando')return false;rm[id]=Object.assign({},rm[id],{email:{st:'enviando',em:Date.now()}});return true},cfg:async()=>JSON.parse(localStorage.getItem('__rmcfg')||'{}'),setCfg:async c=>localStorage.setItem('__rmcfg',JSON.stringify(c))};
  // versões do projeto (B4: R03 REV1 até 21/11/2026, R01 a partir de 22/11/2026)
  const VL=[{id:'B4-r03',obra:'B4',rev:'R03 REV1',arquivo:'base_B4_R03_REV1.json',corte:'2026-01-01',atual:false},{id:'B4-r01',obra:'B4',rev:'R01',arquivo:'base-BR373-B4_R01.json',corte:'2026-11-22',atual:true}];
  window.VersDB={subscribe:cb=>{setTimeout(()=>cb(VL),80);return ()=>{}},get:async id=>id==='B4-r03'?(await fetch('v_r03.json')).json():(await fetch('data_b4.json')).json()};
  // RDO de massa simulado
  const rd=JSON.parse(localStorage.getItem('__rdo')||'{}'),dsubs=[];const dkeep=()=>{try{localStorage.setItem('__rdo',JSON.stringify(rd))}catch(e){}};
  window.RdoDB={subscribe:cb=>{dsubs.push(cb);setTimeout(()=>cb(Object.values(rd)),70);return ()=>{}},save:async(sum,raw)=>{rd[sum.id]=Object.assign({},sum,{enviado_por:'teste@x',enviado_em:Date.now()});dkeep();setTimeout(()=>dsubs.forEach(cb=>cb(Object.values(rd))),20)},
    exists:async id=>!!rd[id],cfg:async()=>({}),setCfg:async()=>{},can:true,admin:true};
  // pasta simulada: o arquivo pode "mudar" (lastModified) e ficar "bloqueado"
  window.__FS={mod:Date.now()-3600e3,lock:false,buf:null,name:'Acompanhamento de produção REV 12.xlsb'};
  const fh={kind:'file',get name(){return __FS.name},getFile:async()=>{if(__FS.lock){const e=new Error('locked');e.name='NotReadableError';throw e}return new File([__FS.buf],__FS.name,{lastModified:__FS.mod})}};
  const other={kind:'file',name:'Controle de Produção - PVA.xlsx',getFile:async()=>new File(['x'],'x')};
  const dir={kind:'directory',name:'03 - Produção',values:async function*(){yield other;yield fh},queryPermission:async()=>'granted',requestPermission:async()=>'granted'};
  window.showDirectoryPicker=async()=>dir});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.route(/(openstreetmap|arcgisonline)/,r=>r.abort());
await p.goto(`http://localhost:${PORT}/#producao`);await W(2500);
await p.evaluate(async f=>{const r=await fetch(f);window.__FS.buf=await r.arrayBuffer()},XF);
ok(await p.isVisible('#pdLink'),'botão "Vincular pasta" visível (navegador com acesso a pastas)');
// 1) importação manual
const buf=await p.evaluate(()=>Array.from(new Uint8Array(window.__FS.buf)));
await p.setInputFiles('#pdFile',{name:'Acompanhamento de produção REV 12.xlsb',mimeType:'application/octet-stream',buffer:Buffer.from(buf)});
for(let i=0;i<40&&!(await p.evaluate(()=>window.__SAVES));i++)await W(500);await W(800);
const st=await p.evaluate(()=>{const R=PROD.resolve();const c=a=>({n:a.length,ap:a.filter(r=>r.ap).length,err:a.filter(r=>r.iss.some(x=>x.sev==='erro')).length});
  return {B2:c(R.B23.filter(r=>r.blk==='B2')),B3:c(R.B23.filter(r=>r.blk==='B3')),semBl:R.B23.filter(r=>!r.blk).length,B4:c(R.B4),sizes:Object.fromEntries(Object.entries(__DOCS).map(([k,v])=>[k,(v.json||'').length])),hist:PROD.meta().hist.length}});
console.log(JSON.stringify(st));
ok(st.B2.n+st.B3.n+st.semBl===1468&&st.B4.n===185,'B2/B3 e B4 separados pelas abas (1468 + 185 segmentos)');
ok(st.B2.n>0&&st.B3.n>0,'BR-277 dividida em Bloco 02 e Bloco 03 pela base');
ok(Object.values(st.sizes).every(v=>v<1000000),'cada documento abaixo de 1 MB');
const txt=await p.textContent('#pdBlocks');console.log(txt.replace(/\s+/g,' ').slice(0,600));
await p.screenshot({path:'/tmp/claude-0/prod_page.png',fullPage:true});
// 2) reimportar o mesmo arquivo: sem duplicar, nada novo
await p.setInputFiles('#pdFile',{name:'Acompanhamento de produção REV 12.xlsb',mimeType:'application/octet-stream',buffer:Buffer.from(buf)});
for(let i=0;i<40&&(await p.evaluate(()=>window.__SAVES))<2;i++)await W(500);await W(500);
const h2=await p.evaluate(()=>PROD.meta().hist[0].n);console.log(JSON.stringify(h2));
ok(h2.B23.novos===0&&h2.B23.alt===0&&h2.B23.rem===0&&h2.B4.novos===0&&h2.B23.total===1468,'reimportação não duplica nem altera');
// 3) monitoramento: vincular pasta → detecta → espera estabilizar → importa
await p.click('#pdLink');await W(400);
let s1=await p.evaluate(()=>[PROD.W.state,PROD.W.msg]);console.log('após vincular',s1);
await p.evaluate(()=>{window.__FS.mod=Date.now()});await W(1800);
s1=await p.evaluate(()=>[PROD.W.state,PROD.W.msg]);console.log('alteração',s1);ok(s1[0]==='wait','alteração detectada: aguarda a gravação terminar');
const sv0=await p.evaluate(()=>window.__SAVES);
for(let i=0;i<30&&(await p.evaluate(()=>window.__SAVES))===sv0;i++)await W(500);await W(500);
s1=await p.evaluate(()=>[PROD.W.state,PROD.W.msg,PROD.meta().origem]);console.log('importou',s1);ok(s1[2]==='automática'&&s1[0]==='ok','importação automática depois de estabilizar');
// 4) arquivo bloqueado/em gravação: informa e mantém os dados
await p.evaluate(()=>{window.__FS.lock=true});await W(2000);
s1=await p.evaluate(()=>[PROD.W.state,PROD.W.msg,PROD.resolve().all.length]);console.log('bloqueado',s1);ok(s1[0]==='erro'&&/bloqueada|gravada/.test(s1[1])&&s1[2]===1653,'arquivo bloqueado: avisa e mantém os dados anteriores');
// 5) arquivo incompleto (corrompido)
await p.evaluate(()=>{window.__FS.lock=false;window.__FS.buf=window.__FS.buf.slice(0,200000);window.__FS.mod=Date.now()});await W(6000);
s1=await p.evaluate(()=>[PROD.W.state,PROD.W.msg,PROD.resolve().all.length]);console.log('incompleto',s1);ok(s1[0]==='erro'&&/ler a planilha/.test(s1[1])&&s1[2]===1653,'arquivo incompleto: não importa e avisa');
await p.selectOption('#pdSev','rmp');await W(300);await p.click('#pdList [data-nota] >> nth=0');await p.check('#pdNM input[value="Segregação"]');await p.check('#pdNM input[value="Chuva"]');await p.fill('#pdNX','teste de motivo');await p.click('#pdNS');await W(500);
ok(await p.evaluate(()=>Object.values(PROD.resolve().all).some(r=>r.notas.length===1&&r.notas[0].txt==='teste de motivo'&&r.notas[0].motivos.length===2))&&!(await p.$$eval('#pdList tbody td.pd-is',a=>a.map(x=>x.innerText).join(' '))).includes('teste de motivo'),'motivo salvo (um registro, fora da coluna pendências)');
await p.selectOption('#pdSev','all');await W(300);const hd=await p.$$eval('#pdList thead tr:first-child th',a=>a.map(x=>x.innerText.replace(/[▲▼]/g,'').trim()));console.log(hd.join(' | '));
ok(hd[0]==='Data'&&hd.includes('Pista')&&hd.includes('Faixa')&&hd.includes('Solução de projeto')&&hd.includes('Solução executada')&&hd.includes('Est. inicial')&&hd.includes('Est. final')&&!hd.some(h=>/Linha/.test(h)),'tabela: data primeiro, pista e faixa separadas, soluções e estacas separadas, sem linhas');
await p.selectOption('#pdList select[data-cf="rmp"]','Sim');await W(500);const rm=await p.$$eval('#pdList tbody tr td:nth-child(4)',a=>a.map(x=>x.innerText.split('\n')[0]));ok(rm.length>0&&rm.every(x=>/^Sim/.test(x)),'filtro por coluna (RMP = Sim)');
await p.click('#pdList [data-rmp] >> nth=0');await W(300);const pop=await p.textContent('#pdRmpPop').catch(()=>'');ok(/o que mudou/.test(pop)&&!(await p.textContent('#pdList tbody tr td:nth-child(4)')).includes('Comprimento'),'RMP só Sim/Não; detalhe no balão ao tocar');await p.keyboard.press('Escape');
const ext=await p.$$eval('#pdList tbody tr',a=>a.map(r=>{const s=r.children[2].querySelector('select');return s?s.value:r.children[2].innerText}));ok(!ext.some(x=>/TRO|Monitoramento|Ramo|Marginal/.test(x)),'sem RMP em TRO, monitoramento e alça');const sts=await p.evaluate(()=>[...new Set(PROD.resolve().all.map(r=>r.extra||'Projeto'))]);console.log('status:',sts.join(', '));
const sid=await p.getAttribute('#pdList [data-st] >> nth=0','data-st');await p.selectOption('#pdList select[data-st] >> nth=0','TRO');await W(800);
const so=await p.evaluate(id=>{const r=PROD.resolve().all.find(x=>x.id===id);return r&&[r.stMan,r.cls,r.rmp.length]},sid);await p.selectOption('#pdList select[data-cf="rmp"]','');await p.selectOption('#pdList select[data-cf="st"]','TRO');await W(500);
const naTxt=await p.textContent('#pdList tbody');console.log('status manual',so);ok(so&&so[0]==='TRO'&&so[1]==='extra'&&so[2]===0&&/não se aplica/.test(naTxt)&&/TRO ✎/.test(naTxt)&&!(await p.$('#pdNotaDlg:not([hidden])')),'status alterado para TRO: RMP passa a "não se aplica"');
ok(/Corrigir na planilha base/.test(naTxt),'aviso de divergência com a planilha base');
await p.selectOption(`#pdList select[data-st="${sid}"]`,'Projeto');await W(800);
const so2=await p.evaluate(id=>{const r=PROD.resolve().all.find(x=>x.id===id);return [r.stMan||'',r.cls,r.iss.some(x=>x.cod==='st_divergente')]},sid);console.log('volta',so2);ok(so2[1]==='projeto'&&!so2[2],'igual à planilha: aviso some');
await p.selectOption('#pdList select[data-cf="st"]','');await W(400);await p.selectOption(`#pdList select[data-st="${sid}"]`,'TRO');await W(800);
await p.selectOption('#pdList select[data-cf="st"]','Editados no app');await W(500);const edl=await p.$$eval('#pdList tbody tr',a=>a.length);ok(edl>=1&&edl<20,'filtro de status: editados no app');
const mb=await p.$(`#pdList tr:has(select[data-st="${sid}"]) [data-nota]`);ok(!!mb,'lápis na coluna RMP (vermelho quando sem motivo)');if(mb){await mb.click();await W(300);await p.check('#pdNM input[value="Sola"]');await p.fill('#pdNX','teste TRO');await p.click('#pdNS');await W(600);const pen=await p.$eval(`#pdList tr:has(select[data-st="${sid}"]) .pd-pen`,e=>[e.className,e.title]);const tip=await p.$eval(`#pdList tr:has(select[data-st="${sid}"]) .pd-rc > :first-child`,e=>e.title);ok(/ok/.test(pen[0])&&/Sola, Chuva: teste TRO/.test(tip)&&!/teste TRO/.test(await p.textContent('#pdList tbody')),'lápis verde e motivo só ao passar o mouse')}
await p.selectOption('#pdList select[data-cf="st"]','');await W(300);
await p.click('#pdList [data-sort="qt"]');await W(300);await p.click('#pdList [data-sort="qt"]');await W(300);const ts=await p.$$eval('#pdList tbody tr td:nth-child(14)',a=>a.slice(0,5).map(x=>parseFloat(x.innerText.replace(/\./g,'').replace(',','.'))||0));ok(ts.every((v,i)=>!i||v<=ts[i-1]),'ordenação por coluna (CBUQ decrescente)');
await p.click('#pdCClr');await W(300);
const [dp]=await Promise.all([p.waitForEvent('download',{timeout:30000}).catch(()=>null),p.click('#pdPX')]);ok(!!dp,'Excel de pendências e motivos gerado');if(dp)await dp.saveAs('/tmp/claude-0/pendencias.xlsx');
await p.$eval('#pdList',e=>e.scrollIntoView());await p.screenshot({path:'/tmp/claude-0/pd_tab.png'});
const stTxt=await p.textContent('#pdStatus');ok(/Última verificação/.test(stTxt)&&/Última atualização dos dados/.test(stTxt),'mostra última verificação e última atualização');
await p.screenshot({path:'/tmp/claude-0/prod_status.png'});
// 5b) Controle de RMPs: lista, registro de motivo e 3 fotos → completo; reflexo na Produção executada
{await p.goto(`http://localhost:${PORT}/#rmp`);await W(1500);const n0=await p.$$eval('#rmList tbody tr',a=>a.length);ok(n0>0,'Controle de RMPs lista os RMPs pendentes ('+n0+')');
  const rid=await p.getAttribute('#rmList [data-rmstep="tipo"] >> nth=0','data-id');
  ok(!(await p.$('#rmList [data-rm]'))&&(await p.$$(`#rmList [data-id="${rid}"][data-rmstep]`)).length===4,'RMP: um botão por etapa, na coluna de cada etapa (sem o botão único do começo)');
  // etapa 1: tipo e patologia
  await p.click(`#rmList [data-rmstep="tipo"][data-id="${rid}"]`);await W(300);await p.click('#rmDS');await W(200);ok(/patologia/.test(await p.textContent('#rmDE')),'RMP: tipo exige a patologia');
  await p.check('#rmTp input[value="espessura"]');await p.check('#rmPt input[value="Sola"]');await p.click('#rmDS');await W(600);
  const jpg=Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=','base64');
  const big=Buffer.from(await p.evaluate(async()=>{const c=document.createElement('canvas');c.width=800;c.height=600;const g=c.getContext('2d');g.fillStyle='#7a6';g.fillRect(0,0,800,600);g.fillStyle='#333';g.fillRect(100,280,600,40);const b=await new Promise(r=>c.toBlob(r,'image/jpeg',0.9));return Array.from(new Uint8Array(await b.arrayBuffer()))}));
  // etapas 2 e 3: fotos, cada uma no botão da sua coluna
  for(const c of ['patologia','espessura']){await p.click(`#rmList [data-rmstep="${c}"][data-id="${rid}"]`);await W(300);ok(!!(await p.$(`#rmDlg input[data-cat="${c}"]`))&&!(await p.$('#rmDlg input[data-cat]:not([data-cat="'+c+'"])')),'RMP: diálogo só da etapa '+c);
    await p.setInputFiles(`#rmDlg input[data-cat="${c}"]`,{name:c+'.jpg',mimeType:'image/jpeg',buffer:big});await W(1200);await p.click('#rmDS');await W(600)}
  let st=await p.evaluate(id=>{const r=PROD.resolve().all.find(x=>x.id===id);return PROD.rmpFalta(r)},rid);ok(JSON.stringify(st)==='["arquivo","assinado"]','RMP: depois de tipo e fotos falta o arquivo e as assinaturas '+JSON.stringify(st));
  // etapa 4: arquivo do RMP (dados automáticos) → assinatura do solicitante e do fiscal
  await p.click(`#rmList [data-rmstep="arquivo"][data-id="${rid}"]`);await W(500);
  const au=await p.evaluate(()=>['estIni','estFim','pista','faixa','comp','larg','esp'].map(k=>document.getElementById('ra_'+k).value));console.log('auto',au);ok(au.every(Boolean),'RMP: estacas, pista, faixa e dimensões vêm automáticas '+JSON.stringify(au));
  await p.click('#rmAG');await W(200);ok(/motivação/.test(await p.textContent('#rmAE')),'RMP: exige motivação, solicitante e fiscal para enviar');
  await p.selectOption('#ra_solP','p'.repeat(32));await p.selectOption('#ra_fisP','q'.repeat(32));await p.fill('#ra_mot','Durante a fresagem foi constatada sola na camada inferior; necessário aumentar a espessura.');
  await p.click('#rmAG');await W(3500);
  const RA=await p.evaluate(()=>Object.values(window.__RA).map(a=>[a.papel,a.tipo,a.resumo.numero,!!a.pessoa,a.dep?1:0]));console.log('assin RMP',JSON.stringify(RA));
  ok(RA.length===2&&RA.every(a=>a[1]==='RMP'&&/^RMP-4[37]0-001$/.test(a[2])&&a[3])&&RA.find(a=>a[0]==='fis')[4]===1,'RMP: arquivo numerado (RMP-contrato-001) e enviado ao solicitante e depois ao fiscal');
  ok(await p.evaluate(()=>window.__RPDF&&window.__RPDF.data.length>20000&&window.__RPDF.data.length<1000000),'RMP: PDF para a página de assinaturas (< 1 MB)');
  // e-mail automático: configuração (administrador) + assinaturas concluídas
  await p.route(/script\.google\.com/,async rt=>{const b=JSON.parse(rt.request().postData()||'{}');await p.evaluate(x=>{window.__MAILB=x},{para:b.para,assunto:b.assunto,n:(b.anexos||[]).length,nomes:(b.anexos||[]).map(a=>a.nome),chave:b.chave});rt.fulfill({contentType:'application/json',body:'{"ok":true,"cota":99}'})});
  await p.click('#rmMail summary');await p.fill('#rmMu','https://script.google.com/macros/s/TESTE/exec');await p.fill('#rmMk','chave-teste');await p.fill('#rmMp','destino@exemplo.com');await p.click('#rmMt');await W(1200);
  ok(/Teste enviado/.test(await p.textContent('#rmMm')),'RMP: e-mail de teste pelo script');await p.check('#rmMa');await p.click('#rmMs');await W(500);
  await p.evaluate(()=>{const P='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';for(const a of Object.values(window.__RA))Object.assign(a,{status:'assinado',assinado_nome:a.papel==='sol'?'Ana Maria Souza':'Carla Fiscal Lima',assinado_funcao:a.papel==='sol'?'Engenheira de Produção':'Fiscal da Via Araucária',assinado_em:Date.now()+5000,assinatura:P});window.__RAS(Object.values(window.__RA))});
  await W(5000);const MB=await p.evaluate(()=>window.__MAILB);console.log('email',JSON.stringify(MB));
  st=await p.evaluate(id=>{const r=PROD.resolve().all.find(x=>x.id===id);return [PROD.rmpOk(r),PROD.rmpFalta(r)]},rid);
  ok(st[0]===true&&MB&&/RMP-4[37]0-001/.test(MB.assunto)&&MB.n===3&&MB.nomes.some(n=>/\.pdf$/.test(n))&&MB.para[0]==='destino@exemplo.com','RMP completo e assinado → e-mail automático com PDF e fotos');
  ok(/enviado/.test(await p.textContent(`#rm-${rid}`)),'RMP: coluna E-mail mostra enviado');
  {const [dp]=await Promise.all([p.waitForEvent('download',{timeout:30000}).catch(()=>null),p.click(`#rmList [data-rmpdf="${rid}"]`)]);ok(!!dp,'RMP: PDF no modelo da Via Araucária');if(dp)await dp.saveAs('/tmp/claude-0/rmp.pdf')}
  {await p.fill('#rmZde','2020-01-01');await p.fill('#rmZate','2030-12-31');const [dz]=await Promise.all([p.waitForEvent('download',{timeout:60000}).catch(()=>null),p.click('#rmZip')]);ok(!!dz&&/\.zip$/.test(dz.suggestedFilename()),'RMP: ZIP do período');if(dz)await dz.saveAs('/tmp/claude-0/rmp.zip')}
  await p.$eval('#rm-'+rid,e=>e.scrollIntoView({block:'center'}));await p.screenshot({path:'/tmp/claude-0/rmp_lista.png'});
  // câmera pela Foto georreferenciada (arquivo do aparelho como câmera) e excluir foto
  await p.click(`#rmList [data-rmstep="patologia"][data-id="${rid}"]`);await W(400);await p.click('#rmDlg [data-cam="patologia"]');await W(1200);ok(await p.evaluate(()=>location.hash)==='#foto'&&await p.isVisible('#fAlvo'),'RMP: câmera abre a Foto georreferenciada no modo RMP');
  await p.setInputFiles('#fFile',{name:'cam.jpg',mimeType:'image/jpeg',buffer:big});await W(3500);
  const np=await p.$$eval('#rmDlg [data-th="patologia"] .rm-img',a=>a.length);ok(await p.evaluate(()=>location.hash)==='#rmp'&&np===2,'RMP: foto da câmera volta com marca-d\'água para o RMP ('+np+')');
  p.once('dialog',dg=>dg.accept());await p.click('#rmDlg [data-th="patologia"] [data-rmx] >> nth=0');await W(400);ok((await p.$$eval('#rmDlg [data-th="patologia"] .rm-img',a=>a.length))===1,'RMP: excluir foto');await p.click('#rmDS');await W(600);
  // buscar fotos já salvas na Foto georreferenciada
  await p.evaluate(async()=>{const c=document.createElement('canvas');c.width=400;c.height=300;c.getContext('2d').fillRect(0,0,400,300);const b=await new Promise(r=>c.toBlob(r,'image/jpeg',0.8));
    await new Promise((res,rej)=>{const r=indexedDB.open('br277fotos',1);r.onupgradeneeded=()=>r.result.createObjectStore('fotos',{keyPath:'id',autoIncrement:true});r.onsuccess=()=>{const x=r.result.transaction('fotos','readwrite');x.objectStore('fotos').add({name:'t.jpg',blob:b,t:Date.now(),stake:'Estaca 999',note:'teste app'});x.oncomplete=res;x.onerror=rej}})});
  await p.click(`#rmList [data-rmstep="espessura"][data-id="${rid}"]`);await W(400);const ne0=await p.$$eval('#rmDlg [data-th="espessura"] .rm-img',a=>a.length);await p.click('#rmDlg [data-app="espessura"]');await W(600);
  await p.fill('#rmPkQ','999');await W(200);const npk=await p.$$eval('#rmPkG [data-pk]',a=>a.length);await p.click('#rmPkG [data-pk] >> nth=0');await p.click('#rmPkOk');await W(1500);
  const ne1=await p.$$eval('#rmDlg [data-th="espessura"] .rm-img',a=>a.length);ok(npk>=1&&ne1===ne0+1,'RMP: busca e adiciona foto salva na Foto georreferenciada ('+npk+' encontrada, '+ne0+'→'+ne1+')');await p.click('#rmDS');await W(600);
  // data de corte do controle de pendências
  const pend0=await p.$eval('#rmCards .pd-blk .pd-n div:nth-child(2) b',e=>+e.textContent);
  await p.fill('#rmCorteD','2099-01-01');await p.click('#rmCorteS');await W(500);
  const pend1=await p.$eval('#rmCards .pd-blk .pd-n div:nth-child(2) b',e=>+e.textContent);const pc=await p.$eval('#rmCards .pd-blk .pd-n div:nth-child(4) b',e=>+e.textContent).catch(()=>-1);
  await p.selectOption('#rmSit','pre');await W(300);const npre=await p.$$eval('#rmList tbody tr',a=>a.length);
  ok(pend0>0&&pend1===0&&pc===pend0&&npre===pend0&&/a partir de/.test(await p.textContent('#rmCorte')),'RMP: data de corte tira os anteriores das pendências ('+pend0+'→'+pend1+', antes do corte '+pc+')');
  p.once('dialog',dg=>dg.accept());await p.click('#rmCorteX');await W(500);await p.selectOption('#rmSit','all');await W(300);
  ok((await p.$eval('#rmCards .pd-blk .pd-n div:nth-child(2) b',e=>+e.textContent))===pend0,'RMP: remover a data de corte volta as pendências');
  ok(await p.inputValue('#rmSit')==='all','RMP: padrão mostra todos (pendentes e completos)');
  await p.selectOption('#rmSit','pend');await p.fill('#rmQ','zzz');await W(500);await p.click('#rmClr');await W(300);ok(await p.inputValue('#rmSit')==='all'&&await p.inputValue('#rmQ')==='','RMP: botão Limpar filtros');
  await p.selectOption('#rmList select[data-rcf="sit"]','Completo');await W(400);const nc=await p.$$eval('#rmList tbody tr',a=>a.length);await p.click('#rmList [data-rsort="data"]');await W(300);
  ok(nc>=1&&(await p.$$eval('#rmList tbody tr',a=>a.length))===nc&&/Data ▲/.test(await p.textContent('#rmList thead')),'RMP: filtro e ordenação nas colunas');await p.click('#rmList [data-rclr]');await W(300);
  await p.selectOption('#rmSit','ok');await W(400);ok((await p.$$eval('#rmList tbody tr',a=>a.length))>=1,'filtro de completos');
  const [dx]=await Promise.all([p.waitForEvent('download',{timeout:30000}).catch(()=>null),p.click('#rmXls')]);ok(!!dx,'relatório de pendências de RMP em Excel');
  await p.goto(`http://localhost:${PORT}/#producao`);await p.reload();await W(2500);{const sv=await p.$eval('#pdSev',e=>e.value);const ds=await p.$$eval('#pdList tbody tr td.n:first-child',a=>a.slice(0,40).map(x=>x.textContent.slice(0,10).split('/').reverse().join('-')));ok(sv==='all'&&ds.length>1&&ds.every((d,i)=>!i||ds[i-1]>=d),'ao abrir: Mostrar = Todos e do mais recente para o mais antigo ('+ds[0]+' → '+ds[ds.length-1]+')')}await p.selectOption('#pdSev','all');await W(500);await p.fill('#pdList input[data-cf="ini"]','');
  const okMark=await p.evaluate(id=>{const t=[...document.querySelectorAll('#pdList [data-rmp]')].find(b=>b.dataset.rmp===id);return t?!!t.parentElement.querySelector('.rm-ok'):null},rid);
  const pend=await p.$$('#pdList .rm-pd');ok(okMark!==false&&pend.length>0,'Produção executada: ✓ verde no RMP completo e "!" nos pendentes')}
// Calculadora: pano parcialmente executado entra só com o saldo; executado (com sobra < 5 m) fica bloqueado
{await p.goto(`http://localhost:${PORT}/#calculadora`);await W(2500);await p.click('#cRep').catch(()=>{});await W(300);await p.selectOption('#rfObra','Restauração BR-373 – Bloco 04');await W(600);await p.keyboard.press('Escape');
 await p.fill('#cKmA','237+000');await p.fill('#cKmB','238+000');await p.selectOption('#cPista','F1').catch(()=>{});await p.selectOption('#cSent','C').catch(()=>{});await p.click('#cForm button[type=submit]');await W(1500);
 const t=await p.$eval('#cOut table.q tbody tr[data-tag="237-F1-C-01"]',tr=>tr.innerText.replace(/\s+/g,' ')).catch(()=>'');
 ok(/saldo 20 m/.test(t)&&/237\+000 237\+020 20,0/.test(t),'Calculadora: pano parcialmente executado só com o saldo (237+000 a 237+020)')}
// 5c) versões: RMP pela revisão válida na data; mapa com execução e comparação de revisões
{await p.goto(`http://localhost:${PORT}/#producao`);await W(2500);const vr=await p.evaluate(()=>{const R=PROD.resolve().B4;return [R.filter(r=>r.iss.some(x=>x.cod==='revisao')).length,R.filter(r=>r.iss.some(x=>x.cod==='revisao_pend')).length,R.length]});
  console.log('versões B4',vr);ok(vr[0]>0&&vr[1]===0,'B4: lançamentos antes do corte comparados com a revisão R03 REV1');
  await p.goto(`http://localhost:${PORT}/#mapab4`);await W(3000);const ne=await p.evaluate(()=>window.__mxB4&&window.__mxB4.n());ok(ne>0,'mapa B4: panos executados desenhados ('+ne+')');
  await p.evaluate(()=>window.__mxB4.setRev('B4-r03'));await W(2500);const nd=await p.evaluate(()=>[window.__mxB4.difs(),window.__mxB4.rev()]);console.log('difs',nd);ok(nd[1]>0,'mapa B4: revisão R03 REV1 exibida e diferenças listadas ('+nd[0]+')');
  await p.screenshot({path:'/tmp/claude-0/mapa_rev.png'});
  // Produção executada → "ver no mapa" (rodovia certa, local destacado e janela com "Executado em:")
  await p.goto(`http://localhost:${PORT}/#producao`);await W(2000);await p.selectOption('#pdBlk','B4');await W(800);
  const bm=await p.$('#pdList [data-pdmap][title*="BR-373"]');ok(!!bm,'Produção executada: botão "ver no mapa" nas linhas');
  if(bm){await bm.click();await W(2500);const h=await p.evaluate(()=>location.hash);const pop=await p.$eval('.leaflet-popup-content .mx-pop',e=>e.textContent).catch(()=>'');
    ok(h==='#mapab4'&&/Executado em: \d\d\/\d\d\/\d{4}/.test(pop),'ver no mapa abre o mapa da BR-373 B4 no local, com "Executado em:" ('+h+')');await p.screenshot({path:'/tmp/claude-0/vernomapa.png'});
    // 2ª camada de permissões: campos da janela ocultos por perfil
    const id=await p.evaluate(()=>PROD.resolve().B4.find(r=>r.a!=null).id);
    const sem=await p.evaluate(async id=>{const A0=window.ACL;window.ACL={admin:false,perms:{mapab4:{view:true,f:{pf_eq:false,pf_qtd:false,pf_data:false}},producao:{view:true}}};
      window.__mxB4.focus(id);await new Promise(r=>setTimeout(r,900));const t=document.querySelector('.leaflet-popup-content .mx-pop').innerHTML;window.ACL=A0;return t},id);
    ok(!/Equipe/.test(sem)&&!/Quantidade/.test(sem)&&!/Executado em/.test(sem)&&/Dimensões/.test(sem),'funcionalidades desmarcadas somem da janela do executado')}
  await p.goto(`http://localhost:${PORT}/#mapa`);await W(3000);const n2=await p.evaluate(()=>window.__mxB23&&window.__mxB23.n());ok(n2>0,'mapa BR-277: panos executados desenhados ('+n2+')')}
// 5d) RDO de massa: envio do arquivo, conferência com a planilha e Excel
{await p.goto(`http://localhost:${PORT}/#rdo`);await W(1500);const buf=await p.evaluate(async()=>Array.from(new Uint8Array(await (await fetch('rdo_test.json')).arrayBuffer())));
  await p.setInputFiles('#rdFile',{name:'apontamento-massa-BR277.json',mimeType:'application/json',buffer:Buffer.from(buf)});await W(800);
  ok(/segmentos/.test(await p.textContent('#rdPrev'))&&!!(await p.$('#rdSend')),'RDO: arquivo conferido e resumo exibido');
  await p.selectOption('#rdEq','Equipe Pavimentação Johonatan');await p.click('#rdSend');await W(800);const nr=await p.$$eval('#rdList > table > tbody > tr:not(.rd-segs)',a=>a.length);ok(nr===1&&/enviado/.test(await p.textContent('#rdPrev')),'RDO enviado e listado com a conferência da planilha');
  await p.setInputFiles('#rdFile',{name:'apontamento-massa-BR277.json',mimeType:'application/json',buffer:Buffer.from(buf)});await W(800);ok(/já foi enviado/.test(await p.textContent('#rdPrev')),'RDO: o mesmo arquivo não é enviado duas vezes');
  const [dx]=await Promise.all([p.waitForEvent('download',{timeout:30000}).catch(()=>null),p.click('#rdXls')]);ok(!!dx,'RDO: planilha em Excel')}
// 6) Relatórios (BR-277) e Painel (B4) usam os dados
await p.goto(`http://localhost:${PORT}/#relatorios`);await W(2500);
await W(1000);const rq=await p.textContent('#rQuick').catch(()=>'');console.log('relatórios:',rq);ok(/exec/.test(rq)&&!/ 0% exec/.test(rq),'Relatórios (BR-277) com % executado vindo da planilha');
await p.selectOption('#rObra','B4');await W(1500);const rq4=await p.textContent('#rQuick');const ps4=await p.textContent('#rProdSum');console.log('relatórios B4:',rq4,'|',ps4.replace(/\s+/g,' '));
ok(/exec/.test(rq4)&&!/ 0% exec/.test(rq4)&&/Extra-projeto/.test(ps4),'Relatórios do Bloco 04 com execução e separação projeto / extra-projeto');
ok(await p.isVisible('#rVisMap')&&(await p.$$('#pRel .vheat td')).length>20,'Relatórios com gestão visual por km (mapa, barras e mapa de calor)');await p.screenshot({path:'/tmp/claude-0/rel_vis.png'});
const [dx]=await Promise.all([p.waitForEvent('download',{timeout:40000}).catch(()=>null),p.click('#rXls').catch(()=>{})]);ok(!!dx,'Excel do relatório do Bloco 04 gerado');
await p.selectOption('#rObra','277');await W(800);
// comparativo projeto inicial x revisado x executado (impacto das RMPs)
await p.waitForSelector('#rCmpBody .cmp-kpi',{timeout:15000}).catch(()=>{});const c23=(await p.textContent('#rCmpBody').catch(()=>'')).replace(/\s+/g,' ');console.log('comparativo 277:',c23.slice(0,400));
ok(/seguiram o projeto/i.test(c23)&&/alterad/i.test(c23)&&/por km/.test(c23)&&/Projeto inicial/.test(c23)&&/Projeto revisado/.test(c23),'Relatórios: comparativo projeto inicial x revisado x executado (BR-277)');
await p.selectOption('#rCmpObra','B4');await W(1500);const c4=(await p.textContent('#rCmpBody')).replace(/\s+/g,' ');console.log('comparativo B4:',c4.slice(0,400));
ok(/aumento de espessura/i.test(c4)&&/extens/i.test(c4)&&(await p.$$('#rCmpBody table tbody tr')).length>5,'Relatórios: comparativo do Bloco 04 com RMPs por tipo e por km');
await p.$eval('#rCmp',e=>e.scrollIntoView());await p.screenshot({path:'/tmp/claude-0/rel_cmp.png',fullPage:false});
{const [dc]=await Promise.all([p.waitForEvent('download',{timeout:40000}).catch(()=>null),p.click('#rCmpXls').catch(()=>{})]);ok(!!dc,'Excel do comparativo gerado')}
await p.goto(`http://localhost:${PORT}/#analise`);await W(2500);
await p.selectOption('#aObra','B4').catch(()=>{});await W(1500);
ok(await p.isVisible('#aStBox'),'Painel do Bloco 04 com filtro de status de execução');
ok(!errs.length,'sem erros JS '+JSON.stringify(errs.slice(0,3)));
console.log(`\n${res.filter(Boolean).length}/${res.length}`);await b.close()})();

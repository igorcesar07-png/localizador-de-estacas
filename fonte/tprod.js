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
  const rm=JSON.parse(localStorage.getItem('__rmp')||'{}'),rmM={},rsubs=[];const rkeep=()=>{try{localStorage.setItem('__rmp',JSON.stringify(rm))}catch(e){}};const rfire=()=>rsubs.forEach(cb=>cb(Object.values(rm)));
  window.RmpDB={subscribe:cb=>{rsubs.push(cb);setTimeout(()=>cb(Object.values(rm)),60);return ()=>{}},save:async r=>{rm[r.id]=Object.assign({},r,{atualizado_por:'teste@x',atualizado_em:Date.now()});rkeep();setTimeout(rfire,20)},
    saveMedia:async m=>{rmM[m.id]=m},getMedia:async id=>rmM[id]||null,can:true};
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
await p.selectOption('#pdList select[data-cf="rmp"]','Sim');await W(500);const rm=await p.$$eval('#pdList tbody tr td:nth-child(4)',a=>a.map(x=>x.innerText.split('\n')[0]));ok(rm.length>0&&rm.every(x=>x==='Sim'),'filtro por coluna (RMP = Sim)');
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
  const rid=await p.getAttribute('#rmList [data-rm] >> nth=0','data-rm');await p.click('#rmList [data-rm] >> nth=0');await W(400);
  await p.check('#rmMot input[value="Chuva"]');await p.check('#rmMot input[value="Reprovação de IRI"]');await p.check('.rm-pats input[value="Sola"]');
  const jpg=Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=','base64');
  for(const c of ['assinado','patologia','espessura'])await p.setInputFiles(`#rmDlg input[data-cat="${c}"]`,{name:c+'.jpg',mimeType:'image/jpeg',buffer:jpg});
  await W(1500);const th=await p.$$eval('#rmDlg .rm-img',a=>a.length);await p.click('#rmDS');await W(800);
  const st=await p.evaluate(id=>{const r=PROD.resolve().all.find(x=>x.id===id);return [PROD.rmpOk(r),PROD.rmpFalta(r)]},rid);console.log('rmp',th,st);ok(th===3&&st[0]===true,'RMP com motivo e 3 fotos fica completo');
  await p.selectOption('#rmSit','ok');await W(400);ok((await p.$$eval('#rmList tbody tr',a=>a.length))>=1,'filtro de completos');
  const [dx]=await Promise.all([p.waitForEvent('download',{timeout:30000}).catch(()=>null),p.click('#rmXls')]);ok(!!dx,'relatório de pendências de RMP em Excel');
  await p.goto(`http://localhost:${PORT}/#producao`);await W(1500);await p.selectOption('#pdSev','all');await W(500);await p.fill('#pdList input[data-cf="ini"]','');
  const okMark=await p.evaluate(id=>{const t=[...document.querySelectorAll('#pdList [data-rmp]')].find(b=>b.dataset.rmp===id);return t?!!t.parentElement.querySelector('.rm-ok'):null},rid);
  const pend=await p.$$('#pdList .rm-pd');ok(okMark!==false&&pend.length>0,'Produção executada: ✓ verde no RMP completo e "!" nos pendentes')}
// 6) Relatórios (BR-277) e Painel (B4) usam os dados
await p.goto(`http://localhost:${PORT}/#relatorios`);await W(2500);
await W(1000);const rq=await p.textContent('#rQuick').catch(()=>'');console.log('relatórios:',rq);ok(/exec/.test(rq)&&!/ 0% exec/.test(rq),'Relatórios (BR-277) com % executado vindo da planilha');
await p.selectOption('#rObra','B4');await W(1500);const rq4=await p.textContent('#rQuick');const ps4=await p.textContent('#rProdSum');console.log('relatórios B4:',rq4,'|',ps4.replace(/\s+/g,' '));
ok(/exec/.test(rq4)&&!/ 0% exec/.test(rq4)&&/Extra-projeto/.test(ps4),'Relatórios do Bloco 04 com execução e separação projeto / extra-projeto');
ok(await p.isVisible('#rVisMap')&&(await p.$$('#pRel .vheat td')).length>20,'Relatórios com gestão visual por km (mapa, barras e mapa de calor)');await p.screenshot({path:'/tmp/claude-0/rel_vis.png'});
const [dx]=await Promise.all([p.waitForEvent('download',{timeout:40000}).catch(()=>null),p.click('#rXls').catch(()=>{})]);ok(!!dx,'Excel do relatório do Bloco 04 gerado');
await p.selectOption('#rObra','277');await W(800);
await p.goto(`http://localhost:${PORT}/#analise`);await W(2500);
await p.selectOption('#aObra','B4').catch(()=>{});await W(1500);
ok(await p.isVisible('#aStBox'),'Painel do Bloco 04 com filtro de status de execução');
ok(!errs.length,'sem erros JS '+JSON.stringify(errs.slice(0,3)));
console.log(`\n${res.filter(Boolean).length}/${res.length}`);await b.close()})();

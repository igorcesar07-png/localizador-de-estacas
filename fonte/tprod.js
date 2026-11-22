// Produção executada: importação manual e monitoramento automático (pasta simulada), com o servidor simulado em memória.
// Uso: node fonte/tprod.js <porta> <arquivo .xlsb servido na raiz>   (dados reais não ficam no repositório)
const {chromium}=require('/home/claude/localizador-de-estacas/firebase/node_modules/playwright');const W=ms=>new Promise(r=>setTimeout(r,ms));
const PORT=process.argv[2]||8772,XF=process.argv[3]||'prod_test.xlsb';
const res=[];const ok=(c,n)=>{res.push(c);console.log((c?'OK  ':'FALHOU ')+n)};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const ctx=await b.newContext({viewport:{width:1366,height:900}});
await ctx.addInitScript(()=>{window.__PROD_T={poll:1500,stable:2500};const docs={},subs=[];window.__DOCS=docs;window.__SAVES=0;
  const fire=id=>subs.forEach(cb=>cb(id,docs[id]||null));
  window.ProdDB={subscribe:cb=>{subs.push(cb);setTimeout(()=>['producao_meta','producao_b23','producao_b4','producao_status'].forEach(id=>cb(id,docs[id]||null)),50);return ()=>{}},
    save:async parts=>{for(const [k,o] of Object.entries(parts)){const txt=JSON.stringify(o);if(txt.length>1000000)throw new Error('grande demais '+k+' '+txt.length);docs['producao_'+k]={json:txt}}window.__SAVES++;setTimeout(()=>Object.keys(parts).forEach(k=>fire('producao_'+k)),30)},
    status:async st=>{docs.producao_status=Object.assign({},st,{by:'teste@x'});fire('producao_status')}};
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
ok(st.B2.n+st.B3.n+st.semBl===1472&&st.B4.n===186,'B2/B3 e B4 separados pelas abas (1472 + 186 segmentos)');
ok(st.B2.n>0&&st.B3.n>0,'BR-277 dividida em Bloco 02 e Bloco 03 pela base');
ok(Object.values(st.sizes).every(v=>v<1000000),'cada documento abaixo de 1 MB');
const txt=await p.textContent('#pdBlocks');console.log(txt.replace(/\s+/g,' ').slice(0,600));
await p.screenshot({path:'/tmp/claude-0/prod_page.png',fullPage:true});
// 2) reimportar o mesmo arquivo: sem duplicar, nada novo
await p.setInputFiles('#pdFile',{name:'Acompanhamento de produção REV 12.xlsb',mimeType:'application/octet-stream',buffer:Buffer.from(buf)});
for(let i=0;i<40&&(await p.evaluate(()=>window.__SAVES))<2;i++)await W(500);await W(500);
const h2=await p.evaluate(()=>PROD.meta().hist[0].n);console.log(JSON.stringify(h2));
ok(h2.B23.novos===0&&h2.B23.alt===0&&h2.B23.rem===0&&h2.B4.novos===0&&h2.B23.total===1472,'reimportação não duplica nem altera');
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
s1=await p.evaluate(()=>[PROD.W.state,PROD.W.msg,PROD.resolve().all.length]);console.log('bloqueado',s1);ok(s1[0]==='erro'&&/bloqueada|gravada/.test(s1[1])&&s1[2]===1658,'arquivo bloqueado: avisa e mantém os dados anteriores');
// 5) arquivo incompleto (corrompido)
await p.evaluate(()=>{window.__FS.lock=false;window.__FS.buf=window.__FS.buf.slice(0,200000);window.__FS.mod=Date.now()});await W(6000);
s1=await p.evaluate(()=>[PROD.W.state,PROD.W.msg,PROD.resolve().all.length]);console.log('incompleto',s1);ok(s1[0]==='erro'&&/ler a planilha/.test(s1[1])&&s1[2]===1658,'arquivo incompleto: não importa e avisa');
const stTxt=await p.textContent('#pdStatus');ok(/Última verificação/.test(stTxt)&&/Última atualização dos dados/.test(stTxt),'mostra última verificação e última atualização');
await p.screenshot({path:'/tmp/claude-0/prod_status.png'});
// 6) Relatórios (BR-277) e Painel (B4) usam os dados
await p.goto(`http://localhost:${PORT}/#relatorios`);await W(2500);
const rq=await p.textContent('#rQuick').catch(()=>'');console.log('relatórios:',rq);ok(/exec/.test(rq)&&!/ 0% exec/.test(rq),'Relatórios (BR-277) com % executado vindo da planilha');
await p.goto(`http://localhost:${PORT}/#analise`);await W(2500);
await p.selectOption('#aObra','B4').catch(()=>{});await W(1500);
ok(await p.isVisible('#aStBox'),'Painel do Bloco 04 com filtro de status de execução');
ok(!errs.length,'sem erros JS '+JSON.stringify(errs.slice(0,3)));
console.log(`\n${res.filter(Boolean).length}/${res.length}`);await b.close()})();

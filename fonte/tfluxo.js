const {chromium}=require('/home/claude/localizador-de-estacas/firebase/node_modules/playwright');const W=ms=>new Promise(r=>setTimeout(r,ms));
const res=[];const ok=(c,n)=>{res.push(!!c);console.log((c?'OK  ':'FALHOU ')+n)};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const ctx=await b.newContext({viewport:{width:1280,height:900}});
await ctx.addInitScript(()=>{const rd=JSON.parse(localStorage.getItem('__rdo2')||'{}'),subs=[];const keep=()=>localStorage.setItem('__rdo2',JSON.stringify(rd));const fire=()=>setTimeout(()=>subs.forEach(cb=>cb(Object.values(rd))),10);
  window.RdoDB={subscribe:cb=>{subs.push(cb);setTimeout(()=>cb(Object.values(rd)),50);return()=>{}},save:async s=>{rd[s.id]=Object.assign({},s,{status:'aguardando',enviado_por:'apontador@x',enviado_em:Date.now()});keep();fire()},
    validate:async(id,st,obs)=>{Object.assign(rd[id],{status:st,validado_por:'fiscal@x',validado_em:Date.now(),validacao_obs:obs||''});keep();fire()},excl:async(id,list,hist)=>{Object.assign(rd[id],{excl:list,excl_hist:hist});keep();fire()},exists:async id=>!!rd[id],cfg:async()=>({}),setCfg:async()=>{},can:true,val:true,admin:false}});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>{errs.push(e.message);console.log('ERR',e.message,(e.stack||'').split('\n')[1])});p.on('dialog',d=>d.accept(''));await p.route(/(openstreetmap|arcgisonline)/,r=>r.abort());
await p.goto('http://localhost:8772/#calculadora');await W(2500);await p.evaluate(()=>{['br277.histProgs','br277.massa.dia','__rdo2'].forEach(k=>localStorage.removeItem(k))});await p.reload();await W(2500);
await p.selectOption('#rfObra','Restauração BR-277 – Blocos 02 e 03');await W(300);await p.selectOption('#rfEquipe','Pavimentação Johonatan');await W(200);await p.fill('#rfData','2026-11-24');await p.dispatchEvent('#rfData','change');
for(const [i,v] of Object.entries({rfSCafe:'04:45',rfSDds:'05:15',rfSSai:'05:30',rfECafe:'05:00',rfEDds:'05:30',rfESai:'05:45'})){await p.fill('#'+i,v);await p.press('#'+i,'Tab')}await p.selectOption('#rfTempo','Nublado');
await p.fill('#cKmA','236+000');await p.fill('#cKmB','236+600');await p.selectOption('#cPista','F1');await p.selectOption('#cSent','C');await p.click('#cForm button[type=submit]');await W(1000);
const tags=await p.$$eval('#cOut table.q tbody tr[data-tag]',a=>a.map(t=>t.dataset.tag));console.log('panos',tags);
await p.click('#cRep');await W(1800);let H=await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('br277.histProgs')||'{}')));ok(H.length===1,'1) programação gerada vai sozinha para o Histórico');
await p.click('#rvClose').catch(()=>{});
await p.evaluate(()=>location.hash='#histprog');await W(900);ok(await p.$('.hpcard [data-rdo]'),'2) Histórico tem "Exportar para o RDO"');
await p.click('.hpcard [data-rdo]');await W(1500);ok(await p.evaluate(()=>location.hash)==='#rdo','   e leva para a página RDO de Massa');
const cm=await p.evaluate(()=>window.__CM.get());ok(cm.fres.length===tags.length&&cm.fres.every(f=>f.prog&&f.tag)&&/Johonatan/.test(cm.equipe),'3) segmentos programados com o programado guardado como referência ('+cm.fres.length+')');
ok(/Segmento programado/.test(await p.textContent('#cmRoot'))&&(await p.$$('#cmRoot .cm-in.req')).length>0,'   status Programado e campos a preencher destacados');
// largura real 3,76 no 1º; espessura 10 cm no 2º (sola) → RMP
await p.fill('#cmRoot [data-fi="0"][data-fk="width"]','3.76');await p.press('#cmRoot [data-fi="0"][data-fk="width"]','Tab');await W(500);
await p.fill('#cmRoot [data-fi="1"][data-fk="thickness"]','13');await p.press('#cmRoot [data-fi="1"][data-fk="thickness"]','Tab');await W(600);
const t2=await p.textContent('#cmRoot');ok(/RMP de espessura \(13,0 × 10,0 cm\)/.test(t2)&&/\+0,16/.test(t2)&&!!(await p.$('#cmRoot .cm-rmp a.cm-rmpb[href="#rmp"]'))&&!/Programado: /.test(t2),'4) largura 3,76 (▲ +0,16) e espessura 13 cm (projeto 10) com RMP');
await p.screenshot({path:'/tmp/claude-0/fl_rdo.png'});await p.setViewportSize({width:390,height:844});await W(300);await p.screenshot({path:'/tmp/claude-0/fl_rdo_m.png'});await p.setViewportSize({width:1280,height:900});await p.click('[data-cmtab="fres"]');await W(200);
await p.click('#cmRoot [data-cm="send"]');await W(900);ok(/enviado para validação/.test(await p.textContent('#cmMsg')),'5) RDO enviado para validação ('+(await p.textContent('#cmMsg')).slice(0,80)+')');
ok(/Aguardando validação/.test(await p.textContent('#cmRoot')),'   segmentos ficam "Aguardando validação"');
let pr=await p.evaluate(()=>PROD.resolve().all.filter(r=>r.origem==='RDO').length);ok(pr===0,'   antes da validação nada entra na Produção executada');
await p.click('#rdList [data-rddet]');await W(200);ok(/Programado/.test(await p.textContent('#rdList'))&&/RMP/.test(await p.textContent('#rdList')),'6) conferência: programado × executado e RMP no envio');
await p.click('#rdList [data-rdval]');await W(1200);ok(/Validado/.test(await p.textContent('#rdList')),'   RDO validado');
const R=await p.evaluate(()=>PROD.resolve().all.filter(r=>r.origem==='RDO').map(r=>({ap:r.ap,L:r.L,fam:r.fam,larg:r.larg,esp:r.esp,rmp:r.rmp.length,mot:(r.notas[0]||{}).motivos})));console.log(JSON.stringify(R));
ok(R.length===tags.length&&R.every(r=>r.ap)&&R.some(r=>r.larg===3.76)&&R.some(r=>r.rmp>0),'7) validado → Produção executada (com RMP; motivo vai no Controle de RMPs)');
ok(/Validado/.test(await p.textContent('#cmRoot')),'   RDO do aparelho mostra "Validado"');
await p.evaluate(()=>location.hash='#producao');await W(1500);await p.selectOption('#pdSev','all').catch(()=>{});await W(400);ok((await p.$$('#pdList .pd-org')).length>=1,'   linhas com selo RDO na Produção executada');
{const nR=()=>p.evaluate(()=>PROD.resolve().all.filter(r=>r.origem==='RDO').length);ok(!/RDO ✓/.test(await p.textContent('#pdList')),'   sem selo "RDO ✓" nas linhas da planilha');
  await p.click('#pdList [data-rdx] >> nth=0');await W(800);const n1=await nR();ok(n1===tags.length-1&&(await p.$$('#pdList [data-rdx]')).length===tags.length-1,'11) excluir segmento do RDO na Produção executada ('+n1+')');
  await p.evaluate(()=>location.hash='#rdo');await W(1200);const vis=await p.$('#rdList [data-rdrest]');ok(!!vis&&/excluído/.test(await p.textContent('#rdList')),'   aba RDO mostra o excluído e permite restaurar');
  await p.click('#rdList [data-rdrest]');await W(800);ok(await nR()===tags.length,'   restaurar na aba RDO volta para a produção');
  await p.click('#rdList [data-rdxs] >> nth=0');await W(800);ok(await nR()===tags.length-1,'12) excluir o validado na aba RDO tira da Produção executada');
  await p.click('#rdList [data-rdrest]');await W(800);ok(await nR()===tags.length,'   e restaurar devolve')}
await p.evaluate(()=>location.hash='#producao');await W(1500);
const [dx]=await Promise.all([p.waitForEvent('download',{timeout:30000}).catch(()=>null),p.click('#pdBX')]);ok(dx&&/planilha-base-RDO/.test(dx.suggestedFilename()),'8) Excel "RDO validado" para a planilha base');
await p.evaluate(()=>location.hash='#calculadora');await W(1500);await p.click('#cForm button[type=submit]');await W(1200);
await p.screenshot({path:'/tmp/claude-0/fl_calc.png'});const fl=await p.$$eval('#cOut table.q tbody tr[data-tag]',a=>a.map(t=>[t.dataset.tag,(t.querySelector('.flw')||{}).textContent||'',!!t.querySelector('.rprog')]));console.log(JSON.stringify(fl));
ok(fl.filter(x=>x[1]==='Validado'&&!x[2]).length===tags.length,'9) Calculadora: os executados aparecem "Validado" e não podem ser programados');

await p.evaluate(()=>location.hash='#mapa');await W(2500);const ne=await p.evaluate(()=>window.__mxB23&&window.__mxB23.n());ok(ne>0,'10) mapa B2/B3 com os executados ('+ne+')');
ok(!errs.length,'sem erros JS');console.log(`\n${res.filter(Boolean).length}/${res.length}`);await b.close()})();

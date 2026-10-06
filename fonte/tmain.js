const {chromium}=require('/home/claude/work/node_modules/playwright');const fs=require('fs');process.chdir('/home/claude/work');
const LIB={'xlsx.full.min.js':'npmlib/xlsx/package/dist/xlsx.full.min.js','jspdf.umd.min.js':'npmlib/jspdf-2.5.1/package/dist/jspdf.umd.min.js','jspdf.plugin.autotable.min.js':'npmlib/jspdf-autotable-3.8.2/package/dist/jspdf.plugin.autotable.min.js','pdf.min.js':'npmlib/pdfjs/package/build/pdf.min.js','pdf.worker.min.js':'npmlib/pdfjs/package/build/pdf.worker.min.js'};
const out=[];const ok=(c,n)=>{out.push((c?'OK  ':'FALHOU ')+n);console.log((c?'OK  ':'FALHOU ')+n)};const D='/tmp/claude-0/main/';fs.mkdirSync(D,{recursive:true});
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const ctx=await b.newContext({viewport:{width:1280,height:900},acceptDownloads:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
await p.route('**/cdnjs.cloudflare.com/**',r=>{const f=r.request().url().split('/').pop();r.fulfill({body:fs.readFileSync(LIB[f]||'package/dist/leaflet.js'),contentType:'application/javascript'})});await p.route(/(jsdelivr|fonts\.g|openstreetmap|arcgisonline)/,r=>r.abort());
await p.goto('http://localhost:8765/#calculadora');await p.waitForTimeout(1500);
await p.setInputFiles('#cSerFile','/tmp/claude-0/apj/apontamentos_BR-277.json');await p.waitForSelector('#cSerMsg .sermsg b',{state:'attached'});
// ordem dos campos
const order=await p.$$eval('#cForm .form > .fld',a=>a.map(f=>(f.querySelector('select,input')||{}).id));ok(order.slice(0,3).join(',')==='rfObra,rfEquipe,rfData'&&order.indexOf('cKmA')>2,'obra, equipe e data antes do km: '+order.join(','));
ok(!(await p.$('#repForm')),'sem janela de dados na emissão');
// horários padrão na primeira utilização
const H=async()=>p.evaluate(()=>['rfSCafe','rfSDds','rfSSai','rfECafe','rfEDds','rfESai','rfUPrep','rfUIni'].map(i=>document.getElementById(i).value).join(' '));
console.log('horários iniciais',await H());ok(/^(\d\d:\d\d ){7}\d\d:\d\d$/.test(await H()),'horários nunca vazios');
// ±15 e meia-noite
await p.fill('#rfSCafe','23:50');await p.press('#rfSCafe','Tab');await p.click('#cHor [data-k="rfSCafe"][data-hstep="15"]');ok(await p.inputValue('#rfSCafe')==='00:05','+15 min passa da meia-noite (23:50 → 00:05)');
await p.click('#cHor [data-k="rfSCafe"][data-hstep="-15"]');ok(await p.inputValue('#rfSCafe')==='23:50','−15 min volta (00:05 → 23:50)');
await p.fill('#rfSCafe','430');await p.press('#rfSCafe','Tab');ok(await p.inputValue('#rfSCafe')==='04:30','digitação 430 → 04:30');
await p.fill('#rfSCafe','');await p.press('#rfSCafe','Tab');ok(await p.inputValue('#rfSCafe')==='04:30','apagado volta ao último válido');
await p.fill('#rfSCafe','25:99');await p.press('#rfSCafe','Tab');ok(await p.inputValue('#rfSCafe')==='04:30','inválido volta ao último válido');
await p.click('#cHor [data-k="rfESai"][data-hstep="15"]');const esai=await p.inputValue('#rfESai');
// data
await p.fill('#rfData','2026-12-31');await p.dispatchEvent('#rfData','change');await p.click('#rfNext');ok(await p.inputValue('#rfData')==='2027-01-01'&&/Sexta-feira/.test(await p.textContent('#rfDataHint')),'+1 dia vira o ano: '+await p.textContent('#rfDataHint'));
await p.click('#rfPrev');await p.click('#rfPrev');ok(await p.inputValue('#rfData')==='2026-12-30','−1 dia ×2 → 30/12/2026');
await p.fill('#rfData','2026-03-01');await p.dispatchEvent('#rfData','change');await p.click('#rfPrev');ok(await p.inputValue('#rfData')==='2026-02-28','−1 dia muda o mês (01/03 → 28/02)');
await p.fill('#rfData','2026-10-07');await p.dispatchEvent('#rfData','change');
// previsão
for(const [st,un] of [['Ensolarado',0],['Parcialmente nublado',0],['Nublado',0],['Chuva fraca / garoa',1],['Chuva moderada',1],['Chuva forte',1],['Risco de temporal',1]]){await p.selectOption('#rfTempo',st);await p.waitForTimeout(80);
  const lab=await p.textContent('#rfWxLab'),msg=await p.inputValue('#rfTempoMsg'),bg=await p.$eval('#rfWxPrev',e=>e.style.backgroundImage.length);
  ok((un?/instável/:/estável/).test(lab)&&msg===(un?'A previsão do tempo está instável. Seguiremos monitorando.':'A previsão do tempo está estável. Seguiremos monitorando.')&&bg>1000,`${st}: ${lab} · ${msg.slice(26,34)}`)}
await p.selectOption('#rfTempo','Ensolarado');
// equipe pavimentação BR-277
await p.selectOption('#rfObra','Restauração BR-277 – Blocos 02 e 03');await p.selectOption('#rfEquipe','Pavimentação Johonatan');await p.waitForTimeout(300);
await p.fill('#cKmA','233+726');await p.fill('#cKmB','232+220');await p.selectOption('#cPista','F1');await p.selectOption('#cSent','D');await p.click('#cForm button[type=submit]');await p.waitForTimeout(500);
await p.screenshot({path:D+'main_top.png',fullPage:false});await p.locator('#cHor').scrollIntoViewIfNeeded();await p.screenshot({path:D+'main_hor.png'});
await p.click('#cRep');await p.waitForTimeout(1200);ok(!(await p.isHidden('#repView')),'emitido direto, sem pedir dados');
await p.click('.rtype button[data-rt="simp"]');await p.waitForTimeout(600);let t=await p.textContent('#repDoc');
ok(/07\/10\/2026 \(quarta-feira\)/i.test(t)&&t.includes(esai)&&/Pavimentação Johonatan/.test(t)&&/BR-277/.test(t),'relatório com data/dia da semana, equipe e horário ajustado ('+esai+')');
let dl=p.waitForEvent('download',{timeout:60000});await p.click('#rvPng');await (await dl).saveAs(D+'pav277.png');
await p.click('#rvClose');
// muda parâmetro e emite de novo: resultado atualizado
await p.selectOption('#cPista','ALL');await p.click('#cRep');await p.waitForTimeout(1200);t=await p.textContent('#repDoc');ok(/Todas as faixas/.test(t),'parâmetro alterado reflete no relatório');await p.click('#rvClose');
// equipe dreno: modo somente drenagem
await p.selectOption('#rfEquipe','Dreno Sandro');await p.waitForTimeout(300);ok(await p.inputValue('#cPista')==='DRN','Dreno ativa "Somente drenagem"');
await p.fill('#cKmA','196+000');await p.fill('#cKmB','197+000');await p.selectOption('#cSent','ALL');
await p.click('#cRep');await p.waitForTimeout(600);ok(/Haverá usinagem/.test(await p.textContent('#rfPend')),'dreno: pede usinagem na tela principal');
const hPrep=await p.inputValue('#rfUPrep');await p.check('input[name=rfUsiDr][value=N]');ok(await p.isHidden('#rfURow'),'Não oculta horários da usina');
await p.click('#cRep');await p.waitForTimeout(1200);ok(!(await p.isHidden('#repView')),'dreno emitido');await p.click('#rvClose');
await p.check('input[name=rfUsiDr][value=S]');ok(await p.inputValue('#rfUPrep')===hPrep,'horários da usina preservados depois de ocultar ('+hPrep+')');await p.check('input[name=rfUsiDr][value=N]');
// BR-373 B4
await p.selectOption('#rfObra','Restauração BR-373 – Bloco 04');await p.waitForTimeout(500);
console.log('obra hint',await p.textContent('#rfObraHint'),'| km',await p.inputValue('#cKmA'),await p.inputValue('#cKmB'));
await p.fill('#cKmA','230+000');await p.fill('#cKmB','232+000');await p.selectOption('#rfEquipe','Pavimentação Raimundo');await p.waitForTimeout(300);await p.selectOption('#cSent','ALL');await p.click('#cForm button[type=submit]');await p.waitForTimeout(600);
const hdr=await p.$$eval('#cOut table.q thead th',a=>a.map(x=>x.textContent));ok(hdr.includes('Serial Kartado'),'coluna Serial Kartado na BR-373');
const r373=await p.$$eval('#cOut table.q tbody tr[data-tag]',a=>a.map(tr=>({tag:tr.dataset.tag,ser:(tr.querySelector('.rser')||{}).value})));console.log('B4 segmentos',r373.length,r373.slice(0,3));
ok(r373.length>0&&r373.every(r=>!r.ser),'BR-373: seriais vazios (não usa os da BR-277)');
const t0=r373[0].tag;await p.fill(`tr[data-tag="${t0}"] .rser`,'KART-373-001');await p.press(`tr[data-tag="${t0}"] .rser`,'Tab');await p.waitForTimeout(400);
const segTxt=await p.textContent('#cOut');ok(!/Página do PDF/.test(segTxt),'sem dados do R08 da BR-277');
await p.click('#cRep');await p.waitForTimeout(1200);await p.click('.rtype button[data-rt="simp"]');await p.waitForTimeout(600);t=await p.textContent('#repDoc');
ok(/BR-373 — Bloco 04/.test(t)&&/KART-373-001/.test(t)&&/unifilar de soluções da BR-373/.test(t)&&!/R08/.test(t),'relatório da BR-373 com Serial Kartado e fonte B4');
dl=p.waitForEvent('download',{timeout:60000});await p.click('#rvPng');await (await dl).saveAs(D+'pav373.png');
dl=p.waitForEvent('download',{timeout:60000});await p.click('#rvPdf');await (await dl).saveAs(D+'pav373.pdf');await p.click('#rvClose');
// volta para BR-277: seriais e km da BR-277 preservados, sem misturar
await p.selectOption('#rfObra','Restauração BR-277 – Blocos 02 e 03');await p.waitForTimeout(500);ok(await p.inputValue('#cKmA')==='196+000','BR-277 volta com o seu trecho ('+await p.inputValue('#cKmA')+')');
await p.reload();await p.waitForTimeout(1500);
ok(await p.inputValue('#rfObra')==='Restauração BR-277 – Blocos 02 e 03'&&await p.inputValue('#rfData')==='2026-10-07'&&await p.inputValue('#rfESai')===esai&&await p.inputValue('#rfTempo')==='Ensolarado','recarregar mantém obra, data, horários e previsão');
await p.selectOption('#rfObra','Restauração BR-373 – Bloco 04');await p.waitForTimeout(500);await p.click('#cForm button[type=submit]');await p.waitForTimeout(500);
ok(await p.inputValue(`tr[data-tag="${t0}"] .rser`).catch(()=>'')==='KART-373-001','Serial Kartado salvo para o segmento da BR-373');
await p.screenshot({path:D+'b4calc.png'});
await p.setViewportSize({width:390,height:844});await p.goto('http://localhost:8765/#calculadora');await p.waitForTimeout(1200);await p.screenshot({path:D+'mob1.png'});await p.locator('#cHor').scrollIntoViewIfNeeded();await p.screenshot({path:D+'mob2.png'});await p.locator('#cTempo').scrollIntoViewIfNeeded();await p.screenshot({path:D+'mob3.png'});
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'celular sem rolagem lateral');
ok(errs.length===0,'sem erros JS '+JSON.stringify(errs.slice(0,3)));await b.close()})();

// Calculadora: seriais dos apontamentos, horários do dia anterior e imagem PNG
const {chromium}=require('playwright');const fs=require('fs');
const XLSX_FILE=process.env.XLSX||'/tmp/claude-0/apont/ap.xlsx';
const out=[];const ok=(c,n)=>{out.push((c?'OK  ':'FALHOU ')+n);console.log((c?'OK  ':'FALHOU ')+n)};
const LIB={'xlsx.full.min.js':'npmlib/xlsx/package/dist/xlsx.full.min.js','jspdf.umd.min.js':'npmlib/jspdf-2.5.1/package/dist/jspdf.umd.min.js','jspdf.plugin.autotable.min.js':'npmlib/jspdf-autotable-3.8.2/package/dist/jspdf.plugin.autotable.min.js',
  'pdf.min.js':'npmlib/pdfjs/package/build/pdf.min.js','pdf.worker.min.js':'npmlib/pdfjs/package/build/pdf.worker.min.js','leaflet.js':'package/dist/leaflet.js'};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:1280,height:900},acceptDownloads:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
await p.route('**/cdnjs.cloudflare.com/**',r=>{const f=r.request().url().split('/').pop().split('?')[0];const loc=LIB[f]||LIB['leaflet.js'];r.fulfill({body:fs.readFileSync(loc),contentType:'application/javascript'})});
await p.route(/(jsdelivr|fonts\.g|openstreetmap|arcgisonline)/,r=>r.abort());
await p.goto('http://localhost:8765/#calculadora');await p.waitForTimeout(1500);
// programação anterior registrada (03/10, mesma obra e equipe) para o preenchimento dos horários
await p.evaluate(()=>{const H={'2026-10-06|Restauração BR-277 – Blocos 02 e 03|Pavimentação Johonatan':{data:'2026-10-06',obra:'Restauração BR-277 – Blocos 02 e 03',equipe:'Pavimentação Johonatan',sCafe:'04:30',sDds:'04:45',sSai:'05:00',eCafe:'05:00',eDds:'05:15',eSai:'05:30',uPrep:'04:00',uIni:'05:00',tempo:'Ensolarado',tempoMsg:'A previsão do tempo está estável. Seguiremos monitorando.'}};localStorage.setItem('br277.progHist',JSON.stringify(H))});
await p.reload();await p.waitForTimeout(1200);
// 1) importar a planilha
await p.setInputFiles('#cSerFile',XLSX_FILE);await p.waitForSelector('#cSerMsg .sermsg b',{timeout:30000,state:'attached'});await p.waitForTimeout(500);
const imsg=await p.textContent('#cSerMsg');console.log(imsg);ok(/1\.237 registros importados/.test(imsg),'planilha importada: 1.237 registros com serial');
// 2) trecho da referência: 233+726 a 232+220, decrescente, faixa 1
await p.fill('#cKmA',process.env.KA||'233+726');await p.fill('#cKmB',process.env.KB||'232+220');await p.selectOption('#cPista',process.env.PI||'F1');await p.selectOption('#cSent',process.env.SE||'D');await p.click('#cForm button[type=submit]');await p.waitForTimeout(700);
const rows=await p.$$eval('#cOut table.q tbody tr[data-tag]',a=>a.map(tr=>({tag:tr.dataset.tag,ser:(tr.querySelector('.rser')||{}).value,st:(tr.querySelector('.rser')||{className:''}).className.replace('rser ',''),txt:[...tr.children].map(x=>x.innerText.trim().replace(/\s+/g,' '))})));
rows.forEach(r=>console.log(r.tag,'|',r.ser,'|',r.st,'|',r.txt.slice(4,8).join(' | ')));
ok(rows.length>0&&rows.filter(r=>r.st==='auto').length>=rows.length-1,`seriais automáticos: ${rows.filter(r=>r.st==='auto').length} de ${rows.length}`);
ok(rows.every(r=>!r.ser||/^VA-PavFl-2026\.\d{5}$/.test(r.ser)),'formato original do serial preservado (VA-PavFl-2026.nnnnn)');
// 3) correção manual e persistência
const t0=rows[0].tag;await p.fill(`tr[data-tag="${t0}"] .rser`,'VA-TESTE-007');await p.press(`tr[data-tag="${t0}"] .rser`,'Tab');await p.waitForTimeout(500);
ok(await p.inputValue(`tr[data-tag="${t0}"] .rser`)==='VA-TESTE-007'&&/manual/.test(await p.getAttribute(`tr[data-tag="${t0}"] .rser`,'class')),'serial corrigido manualmente');
await p.reload();await p.waitForTimeout(1500);ok(await p.inputValue(`tr[data-tag="${t0}"] .rser`)==='VA-TESTE-007','serial digitado mantido depois de reabrir');
await p.click(`tr[data-tag="${t0}"] .rserReset`);await p.waitForTimeout(400);ok(await p.inputValue(`tr[data-tag="${t0}"] .rser`)===rows[0].ser,'↺ volta ao serial automático');
// pano sem correspondência: campo vazio e editável; emitir sem serial não é bloqueado
await p.fill(`tr[data-tag="${t0}"] .rser`,'');await p.press(`tr[data-tag="${t0}"] .rser`,'Tab');await p.waitForTimeout(400);
ok(await p.inputValue(`tr[data-tag="${t0}"] .rser`)==='','serial pode ficar vazio');
// 4) emitir: horários do dia anterior
await p.click('#cRep');await p.waitForTimeout(300);
await p.fill('#rfData','2026-10-07');await p.dispatchEvent('#rfData','change');
await p.selectOption('#rfObra','Restauração BR-277 – Blocos 02 e 03');await p.selectOption('#rfEquipe','Pavimentação Johonatan');await p.dispatchEvent('#rfEquipe','change');await p.waitForTimeout(200);
const hrs=await p.evaluate(()=>['rfSCafe','rfSDds','rfSSai','rfECafe','rfEDds','rfESai','rfUPrep','rfUIni'].map(i=>document.getElementById(i).value));console.log(hrs.join(' '),'|',await p.textContent('#rfHrHint'));
ok(hrs.join(' ')==='04:30 04:45 05:00 05:00 05:15 05:30 04:00 05:00','horários copiados da programação de 06/10');ok(/06\/10\/2026/.test(await p.textContent('#rfHrHint')),'data de referência informada');
await p.fill('#rfSSai','05:10');await p.fill('#rfData','2026-10-08');await p.dispatchEvent('#rfData','change');await p.waitForTimeout(150);
ok(/Não há programação salva em <b>07\/10\/2026|07\/10\/2026/.test(await p.textContent('#rfHrHint'))&&await p.inputValue('#rfSSai')==='05:10'&&await p.inputValue('#rfSCafe')==='','sem programação no dia anterior: horários vazios para preencher, o alterado pelo usuário é mantido');
await p.fill('#rfData','2026-10-07');await p.dispatchEvent('#rfData','change');await p.waitForTimeout(150);
ok(await p.inputValue('#rfSSai')==='05:10'&&await p.inputValue('#rfSCafe')==='04:30','volta para 07/10: preenche de novo sem sobrescrever o horário alterado');
if(!(await p.inputValue('#rfTempo')))await p.selectOption('#rfTempo','Ensolarado');if(!(await p.inputValue('#rfTempoMsg')))await p.fill('#rfTempoMsg','A previsão do tempo está estável. Seguiremos monitorando.');
await p.click('#rfForm button[type=submit]');await p.waitForTimeout(1200);ok(!(await p.isHidden('#repView')),'relatório emitido mesmo com pano sem serial');
const repTxt=await p.textContent('#repDoc');ok(/Serial/.test(repTxt)&&rows.slice(1).every(r=>!r.ser||repTxt.includes(r.ser)),'relatório completo mostra o serial de cada pano');
await p.click('.rtype button[data-rt="simp"]');await p.waitForTimeout(800);const simp=await p.textContent('#repDoc');ok(/Serial/.test(simp)&&rows.slice(1).every(r=>!r.ser||simp.includes(r.ser)),'relatório simplificado com coluna Serial');
await p.screenshot({path:'ser_simp.png'});
const reg=await p.evaluate(()=>JSON.parse(localStorage.getItem('br277.execProgs')).find(x=>x.data==='2026-10-07').items.map(i=>i.serial));ok(reg.filter(Boolean).length===rows.slice(1).filter(r=>r.ser).length,'programação registrada guarda os seriais');
// 5) imagem PNG
const dl=p.waitForEvent('download',{timeout:60000});await p.click('#rvPng');const d=await dl;const path=process.env.PNG||'prog.png';await d.saveAs(path);if(process.env.FULL){await p.click('.rtype button[data-rt="full"]');await p.waitForTimeout(1500);await p.screenshot({path:'ser_full.png'});const d2=p.waitForEvent('download',{timeout:60000});await p.click('#rvPdf');const dd=await d2;await dd.saveAs('full.pdf');ok(fs.statSync('full.pdf').size>20000,'PDF completo gerado com o campo Serial');await p.setViewportSize({width:390,height:844});await p.waitForTimeout(400);await p.screenshot({path:'ser_mob.png'})}
console.log(await p.textContent('#rvMsg'));const st=fs.statSync(path);ok(st.size>50000&&/\.png$/.test(d.suggestedFilename()),'PNG gerado: '+d.suggestedFilename()+' '+Math.round(st.size/1024)+' KB');
ok(errs.length===0,'sem erros de JavaScript '+JSON.stringify(errs.slice(0,3)));
fs.writeFileSync('tser-report.txt',out.join('\n'));await b.close()})();

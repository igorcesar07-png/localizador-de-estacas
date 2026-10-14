const {chromium}=require('/home/claude/work/node_modules/playwright');const fs=require('fs');process.chdir('/home/claude/work');
const LIB={'xlsx.full.min.js':'npmlib/xlsx/package/dist/xlsx.full.min.js','jspdf.umd.min.js':'npmlib/jspdf-2.5.1/package/dist/jspdf.umd.min.js','jspdf.plugin.autotable.min.js':'npmlib/jspdf-autotable-3.8.2/package/dist/jspdf.plugin.autotable.min.js','pdf.min.js':'npmlib/pdfjs/package/build/pdf.min.js','pdf.worker.min.js':'npmlib/pdfjs/package/build/pdf.worker.min.js'};
const out=[];const ok=(c,n)=>{out.push((c?'OK  ':'FALHOU ')+n);console.log((c?'OK  ':'FALHOU ')+n)};const D='/tmp/claude-0/obs/';fs.mkdirSync(D,{recursive:true});
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const ctx=await b.newContext({viewport:{width:1280,height:900},acceptDownloads:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('**/cdnjs.cloudflare.com/**',r=>{const f=r.request().url().split('/').pop();r.fulfill({body:fs.readFileSync(LIB[f]||'package/dist/leaflet.js'),contentType:'application/javascript'})});await p.route(/(jsdelivr|fonts\.g|openstreetmap|arcgisonline)/,r=>r.abort());
await p.goto('http://localhost:8765/#calculadora');await p.waitForTimeout(1500);
await p.setInputFiles('#cSerFile','/tmp/claude-0/apj/apontamentos_BR-277.json');await p.waitForSelector('#cSerMsg .sermsg b',{state:'attached'});
await p.selectOption('#rfObra','Restauração BR-277 – Blocos 02 e 03');await p.selectOption('#rfEquipe','Dreno Sandro');await p.waitForTimeout(300);
await p.fill('#cKmA','186+000');await p.fill('#cKmB','192+000');await p.selectOption('#cSent','C');await p.click('#cForm button[type=submit]');await p.waitForTimeout(600);
await p.fill('#rfData','2026-10-15');await p.dispatchEvent('#rfData','change');await p.selectOption('#rfTempo','Nublado');await p.check('input[name=rfUsiDr][value=N]');
const rowsInfo=()=>p.$$eval('#cOut tr[data-tag]',a=>a.filter(tr=>tr.querySelector('.robs')).map(tr=>({tag:tr.dataset.tag,on:tr.querySelector('.rprog').checked,off:tr.classList.contains('off'),obs:tr.classList.contains('hasobs'),txt:tr.innerText.replace(/\s+/g,' ').slice(0,90)})));
const kpi=()=>p.evaluate(()=>{const k=[...document.querySelectorAll('#cOut .kpi')].map(x=>x.innerText.replace(/\s+/g,' '));return k.filter(x=>/dreno|drenagem|saídas/i.test(x)).join(' | ')});
let R0=await rowsInfo();console.log(R0.map(r=>r.tag).join(', '));ok(R0.length>=4&&R0.every(r=>r.on),`${R0.length} segmentos de dreno, todos marcados`);
const k0=await kpi();console.log(k0);
const proj0=await p.evaluate(()=>JSON.stringify(PROJECT_DATA.rows.length));
// 1) desmarcar o 2º e o 4º
const t2=R0[1].tag,t4=R0[3].tag;
await p.uncheck(`tr[data-tag="${t2}"] .rprog`);await p.waitForTimeout(300);await p.uncheck(`tr[data-tag="${t4}"] .rprog`);await p.waitForTimeout(300);
let R1=await rowsInfo();ok(R1.length===R0.length&&R1.find(r=>r.tag===t2).off&&R1.find(r=>r.tag===t4).off,'desmarcados continuam visíveis na lista, como "não programado"');
const k1=await kpi();console.log(k1);ok(k1!==k0,'totais recalculados sem os desmarcados');
// 3) observações diferentes em segmentos distintos
const t1=R0[0].tag,t3=R0[2].tag;
await p.fill(`tr[data-tag="${t1}"] .robs`,'Interferência com rede de água: conferir antes de escavar.');await p.press(`tr[data-tag="${t1}"] .robs`,'Tab');await p.waitForTimeout(200);
await p.fill(`tr[data-tag="${t3}"] .robs`,'Saída para o bueiro existente no 187+340.');await p.press(`tr[data-tag="${t3}"] .robs`,'Tab');await p.waitForTimeout(200);
let R2=await rowsInfo();ok(R2.find(r=>r.tag===t1).obs&&R2.find(r=>r.tag===t3).obs&&R2.filter(r=>r.obs).length===2,'linhas com observação destacadas na calculadora (2)');
// emitir
await p.click('#cRep');await p.waitForTimeout(1200);ok(!(await p.isHidden('#repView')),'relatório emitido');
await p.click('.rtype button[data-rt="simp"]');await p.waitForTimeout(600);
const rep=await p.$$eval('.sr-t',ts=>{const t=ts.find(x=>/Qtd. de saídas/.test(x.innerText));return {hd:[...t.querySelectorAll('thead th')].map(x=>x.textContent),rows:[...t.querySelectorAll('tbody tr')].map(tr=>({hl:tr.classList.contains('hasobs'),bg:getComputedStyle(tr.children[2]).backgroundColor,obs:tr.lastElementChild.textContent,ser:tr.children[3].textContent,ini:tr.children[4].textContent}))}});
console.log(JSON.stringify(rep));
ok(rep.hd[rep.hd.length-1]==='Observações','coluna Observações no relatório');
const nOn=R0.length-2;ok(rep.rows.length===nOn,`só os ${nOn} marcados entram no relatório`);
const progInfo=await p.evaluate(()=>{const L=window.__lastProg;return null});
ok(rep.rows.filter(r=>r.hl).length===2&&rep.rows.filter(r=>r.obs).length===2,'2 linhas com observação, destacadas');
ok(rep.rows.filter(r=>!r.obs).every(r=>r.obs===''&&!r.hl),'sem observação: célula vazia e sem destaque');
const allTxt=await p.textContent('#repDoc');ok(/Interferência com rede de água/.test(allTxt)&&/bueiro existente/.test(allTxt),'textos no relatório');
await p.screenshot({path:D+'simp_view.png',fullPage:false});
let dl=p.waitForEvent('download',{timeout:60000});await p.click('#rvPng');await (await dl).saveAs(D+'simp.png');
dl=p.waitForEvent('download',{timeout:60000});await p.click('#rvPdf');await (await dl).saveAs(D+'simp.pdf');
await p.click('.rtype button[data-rt="full"]');await p.waitForTimeout(800);ok(await p.locator('#repDoc .npc.hasobs').count()===2,'relatório completo: 2 cartões destacados com a observação');
dl=p.waitForEvent('download',{timeout:60000});await p.click('#rvPdf');await (await dl).saveAs(D+'full.pdf');
const reg=await p.evaluate(()=>JSON.parse(localStorage.getItem('br277.execProgs')).find(x=>x.data==='2026-10-15').items);ok(reg.length===nOn&&reg.filter(i=>i.obs).length===2,'programação registrada guarda as observações');
await p.click('#rvClose');
// 2) dados do projeto preservados: remarcar devolve os mesmos valores
await p.check(`tr[data-tag="${t2}"] .rprog`);await p.waitForTimeout(300);await p.check(`tr[data-tag="${t4}"] .rprog`);await p.waitForTimeout(300);
ok(await kpi()===k0,'remarcar devolve os totais originais');ok(await p.evaluate(()=>JSON.stringify(PROJECT_DATA.rows.length))===proj0,'base do projeto intacta');
// persistência após recarregar e vínculo correto
await p.reload();await p.waitForTimeout(1500);await p.click('#cForm button[type=submit]');await p.waitForTimeout(600);
const o1=await p.inputValue(`tr[data-tag="${t1}"] .robs`),o3=await p.inputValue(`tr[data-tag="${t3}"] .robs`),o2=await p.inputValue(`tr[data-tag="${t2}"] .robs`);
ok(/rede de água/.test(o1)&&/bueiro/.test(o3)&&o2==='','cada observação continua no seu segmento depois de recarregar');
// edição depois de emitir atualiza a programação; remover tira o destaque
await p.fill(`tr[data-tag="${t3}"] .robs`,'');await p.press(`tr[data-tag="${t3}"] .robs`,'Tab');await p.waitForTimeout(300);
ok(!(await rowsInfo()).find(r=>r.tag===t3).obs,'apagar a observação tira o destaque na calculadora');
await p.click('#cRep');await p.waitForTimeout(1200);await p.click('.rtype button[data-rt="simp"]');await p.waitForTimeout(600);
const rep2=await p.$$eval('.sr-t',ts=>{const t=ts.find(x=>/Qtd. de saídas/.test(x.innerText));return [...t.querySelectorAll('tbody tr')].map(tr=>({hl:tr.classList.contains('hasobs'),obs:tr.lastElementChild.textContent}))});
ok(rep2.filter(r=>r.hl).length===1&&rep2.filter(r=>r.obs).length===1&&rep2.length===R0.length,'reemissão: 1 observação, destaque só nela, todos os segmentos marcados');
// celular
await p.setViewportSize({width:390,height:844});await p.waitForTimeout(500);await p.screenshot({path:D+'mob_rep.png'});await p.click('#rvClose');await p.waitForTimeout(300);
await p.locator(`tr[data-tag="${t1}"]`).scrollIntoViewIfNeeded();await p.screenshot({path:D+'mob_calc.png'});
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'celular sem rolagem lateral da página');
ok(errs.length===0,'sem erros JS '+JSON.stringify(errs.slice(0,3)));fs.writeFileSync(D+'rep.txt',out.join('\n'));await b.close()})();

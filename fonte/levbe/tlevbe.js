// Teste da página "Levantamento de Bota-Espera" (critérios de aceite) — build local (site/), GPS simulado
const {chromium}=require('/home/claude/work/node_modules/playwright');const fs=require('fs');process.chdir('/home/claude/work');
const [B4,P277]=fs.readFileSync('/tmp/claude-0/lvpts.json','utf8').trim().split('\n').map(JSON.parse);
const D=process.env.SHOTS||'/tmp/claude-0/';const res=[];const ok=(c,n)=>{res.push(c);console.log((c?'OK  ':'FALHOU ')+n)};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:393,height:852},hasTouch:true,permissions:['geolocation'],geolocation:{latitude:B4[0][1],longitude:B4[0][2],accuracy:4},acceptDownloads:true});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('**/cdnjs.cloudflare.com/**',r=>{const u=r.request().url();r.fulfill({body:fs.readFileSync(/xlsx/.test(u)?'npmlib/xlsx/package/dist/xlsx.full.min.js':'package/dist/leaflet.js'),contentType:'application/javascript'})});
await p.route('**/cdn.jsdelivr.net/**',r=>r.fulfill({body:fs.readFileSync('npmlib/lr/package/dist/leaflet-rotate-src.js'),contentType:'application/javascript'}));
await p.route(/(fonts\.g|openstreetmap|arcgisonline)/,r=>r.abort());
await p.goto('http://localhost:8765/#levbe');await p.waitForTimeout(2500);
ok(await p.isVisible('#drawer a[data-page="levbe"]').catch(()=>false)||await p.$('#drawer a[data-page="levbe"]')!==null,'item novo no menu');
const go=async(pt,ms=1000)=>{await ctx.setGeolocation({latitude:pt[1],longitude:pt[2],accuracy:4});await wait(ms)};
const sent=()=>p.textContent('#lvSent');
const rightP=async()=>p.evaluate(()=>{const c=[...document.querySelectorAll('#lvGrid .lv-col')].map(c=>[c.dataset.p,c.getBoundingClientRect().left]);c.sort((a,b)=>b[1]-a[1]);return c[0][0]});
ok(/SENTIDO \?/.test(await sent())&&await rightP()==='CRESCENTE','sem deslocamento: sentido não definido (crescente à direita por padrão)');
// 1) andando no crescente
for(let k=1;k<=6;k++)await go(B4[k]);
console.log('sentido',await sent(),'estaca',await p.textContent('#lvSt'),await p.textContent('#lvCtr'),await p.textContent('#lvLote'));
ok(/CRESCENTE/.test(await sent())&&!/DECRESCENTE/.test(await sent()),'estacas aumentando → ↑ CRESCENTE');
ok(await rightP()==='CRESCENTE','no crescente, botões da pista crescente à direita');
ok(await p.textContent('#lvCtr')==='VIAR-GDA-470/2026 · BR-373/PR'&&await p.textContent('#lvLote')==='Lote 04','topo: contrato e lote do Lote 04');
await p.screenshot({path:D+'lv_retrato.png'});
// 2) parado e GPS oscilando: não troca de lado
const here=B4[6];for(const dm of [0,-3,2,-4,3,-2,0,-3]){await go([here[0],here[1],here[2]+dm*1e-5/1.0],700)}
ok(/↑ CRESCENTE/.test(await sent())&&await rightP()==='CRESCENTE','parado com GPS oscilando: lado não muda');
// 3) virou: estacas diminuindo
await go(B4[5]);await go(B4[4]);ok(/↑ CRESCENTE/.test(await sent()),'2 leituras voltando: ainda crescente (histerese)');
await go(B4[3]);await go(B4[2]);await go(B4[1]);await p.waitForTimeout(700);
console.log('sentido',await sent());ok(/↓ DECRESCENTE/.test(await sent()),'estacas diminuindo de forma consistente → ↓ DECRESCENTE');
ok(await rightP()==='DECRESCENTE','no decrescente, os lados invertem sozinhos');
// 4) um toque = um registro (pista da coluna da direita = decrescente)
await p.click('#lvGrid .lv-col[data-p="DECRESCENTE"] .lv-btn[data-k="LOTADO"]');await p.waitForTimeout(300);
const toast=await p.textContent('#lvToast');console.log(toast);ok(/^Lotado registrado: Est\. 225\+0\d\d, Pista Decrescente/.test(toast)&&/DESFAZER/.test(toast),'aviso "Lotado registrado: Est. …, Pista Decrescente" com DESFAZER');
await p.screenshot({path:D+'lv_toque.png'});
let recs=await p.evaluate(()=>window.__LEVBE.rec());let r=recs[recs.length-1];console.log(JSON.stringify(r));
ok(r&&r.lote===4&&r.contrato==='VIAR-GDA-470/2026'&&r.rodovia==='BR-373/PR'&&r.pista==='DECRESCENTE'&&r.tipo==='EXISTENTE'&&r.ocupacao==='LOTADO'&&r.sentido_desloc==='DECRESCENTE'
  &&Math.abs(r.lat-B4[1][1])<1e-4&&Math.abs(r.lon-B4[1][2])<1e-4&&r.estaca==='225+020'&&r.offset_m>=0&&r.offset_m<20&&/^[0-9a-f-]{36}$/.test(r.id)&&r.precisao_m===4,'registro com estaca, offset, lote, contrato, pista, sentido, coordenadas, precisão e id');
await p.click('#lvUndo');await p.waitForTimeout(300);recs=await p.evaluate(()=>window.__LEVBE.rec());ok(recs.find(x=>x.id===r.id).excluido===true&&recs.find(x=>x.id===r.id).excluido_motivo==='DESFEITO','DESFAZER marca o registro como desfeito (exclusão lógica)');
// 5) dois registros próximos → possível duplicado; local possível na pista oposta (esquerda)
await p.click('#lvGrid .lv-col[data-p="DECRESCENTE"] .lv-btn[data-k="VAZIO"]');await p.waitForTimeout(900);
await go(B4[0]);await p.click('#lvGrid .lv-col[data-p="DECRESCENTE"] .lv-btn[data-k="VAZIO"]');await p.waitForTimeout(900);
await p.click('#lvGrid .lv-col[data-p="CRESCENTE"] .lv-btn[data-k="LOCAL"]');await p.waitForTimeout(300);
recs=await p.evaluate(()=>window.__LEVBE.rec().filter(x=>!x.excluido));ok(recs.length===3&&recs.some(x=>x.tipo==='LOCAL_POSSIVEL'&&x.ocupacao==null&&x.pista==='CRESCENTE'),'local possível na pista oposta, sem ocupação');
// 6) trava manual
await p.click('#lvMode [data-m="C"]');for(let k=1;k<=5;k++)await go(B4[k]);ok(/↑ CRESCENTE/.test(await sent())&&/travado/.test(await p.textContent('#lvSentHow')),'travado: mantém o sentido escolhido');
for(let k=4;k>=0;k--)await go(B4[k]);ok(/↑ CRESCENTE/.test(await sent()),'travado: não muda mesmo andando ao contrário');
await p.click('#lvMode [data-m="AUTO"]');await p.waitForTimeout(300);
// 7) BR-277 → Contrato VIAR-GDA-430/2026, Lote 02
await go(P277[0],1500);await go(P277[1]);await go(P277[2]);await p.waitForTimeout(500);
ok(await p.textContent('#lvCtr')==='VIAR-GDA-430/2026 · BR-277/PR'&&await p.textContent('#lvLote')==='Lote 02','BR-277: contrato VIAR-GDA-430/2026 e Lote 02');
// 8) sem internet
await ctx.setOffline(true);await p.click('#lvGrid .lv-col[data-p="CRESCENTE"] .lv-btn[data-k="PELA_METADE"]');await p.waitForTimeout(300);
recs=await p.evaluate(()=>window.__LEVBE.rec().filter(x=>!x.excluido));const r277=recs.find(x=>x.ocupacao==='PELA_METADE');
ok(r277&&r277.lote===2&&r277.sentido_desloc===null&&r277.contrato==='VIAR-GDA-430/2026'&&/^236\+0/.test(r277.estaca_txt),'sem internet: registro na BR-277 gravado no aparelho (sentido zerado ao trocar de rodovia)');
await ctx.setOffline(false);
// 9) paisagem
await p.setViewportSize({width:852,height:393});await p.waitForTimeout(600);await p.screenshot({path:D+'lv_paisagem.png'});
const hs=await p.$$eval('#lvGrid .lv-btn',a=>a.map(x=>x.getBoundingClientRect().height));ok(hs.every(h=>h>=64),'botões com ≥ 64 px em paisagem ('+Math.min(...hs).toFixed(0)+' px)');
const bot=await p.$$eval('#lvGrid .lv-btn',a=>Math.max(...a.map(x=>x.getBoundingClientRect().bottom)));ok(bot<=393,'paisagem: os 8 botões cabem na tela (base em '+Math.round(bot)+' px de 393)');
await p.setViewportSize({width:393,height:852});await p.waitForTimeout(400);
const hs2=await p.$$eval('#lvGrid .lv-btn',a=>a.map(x=>x.getBoundingClientRect().height));const bot2=await p.$$eval('#lvGrid .lv-btn',a=>Math.max(...a.map(x=>x.getBoundingClientRect().bottom)));ok(bot2<=852,'retrato: os 8 botões cabem na tela');ok(hs2.every(h=>h>=64),'botões com ≥ 64 px em retrato ('+Math.min(...hs2).toFixed(0)+' px)');
// 10) lista: filtros, duplicado, complemento
await p.click('#pLev .lv-tab[data-v="list"]');await p.waitForTimeout(400);
let items=await p.$$eval('#lvItems .lv-it',a=>a.map(x=>x.textContent.trim()));console.log(items.length,items.map(t=>t.slice(0,90)));
ok(items.length===4,'lista com os 4 registros válidos (desfeito oculto)');
ok(items.filter(t=>/possível duplicado/.test(t)).length===2,'dois "Vazio" na mesma pista a menos de 50 m: possível duplicado sinalizado');
ok(/^236\+/.test(items[0])&&/^225\+0[0-2]/.test(items[1]),'ordenado por estaca (BR-277 e depois BR-373)');
await p.selectOption('#lvFLote','4');await p.waitForTimeout(200);ok((await p.$$('#lvItems .lv-it')).length===3,'filtro Lote 04');
await p.selectOption('#lvFPista','CRESCENTE');await p.waitForTimeout(200);ok((await p.$$('#lvItems .lv-it')).length===1,'filtro pista crescente');
await p.selectOption('#lvFPista','ALL');await p.selectOption('#lvFTipo','EXISTENTE');await p.selectOption('#lvFOc','VAZIO');await p.waitForTimeout(200);ok((await p.$$('#lvItems .lv-it')).length===2,'filtro tipo + ocupação');
await p.selectOption('#lvFLote','ALL');await p.selectOption('#lvFTipo','ALL');await p.selectOption('#lvFOc','ALL');
await p.check('#lvFPend');await p.waitForTimeout(200);ok((await p.$$('#lvItems .lv-it')).length===4,'pendentes de complemento: todos os novos');
// complementar com observação e foto
await p.click('#lvItems .lv-ed >> nth=0');await p.waitForTimeout(300);
await p.fill('#lvEdObs','Portão de acesso pela marginal');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
await p.setInputFiles('#lvEdFile',{name:'f.png',mimeType:'image/png',buffer:png});await p.waitForTimeout(1200);
ok(await p.$('#lvEdMedia img')!==null,'foto comprimida aparece no registro');
await p.click('#lvEdSave');await p.waitForTimeout(400);
ok((await p.$$('#lvItems .lv-it')).length===3,'complementado sai dos pendentes');
await p.uncheck('#lvFPend');await p.waitForTimeout(200);
recs=await p.evaluate(()=>window.__LEVBE.rec().filter(x=>x.obs));ok(recs.length===1&&recs[0].fotos.length===1,'observação e foto gravadas no registro');
await p.screenshot({path:D+'lv_lista.png',fullPage:true});
// 11) exportação
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#lvCsv')]);const csv=fs.readFileSync(await dl.path(),'utf8');
const lines=csv.replace(/^﻿/,'').split('\r\n');console.log(lines[0].slice(0,160));console.log(lines[1].slice(0,200));
ok(csv.charCodeAt(0)===0xFEFF&&lines.length===5&&lines[0].split(';').length===36&&/;Lote 0[24];/.test(lines[1])&&/\?lbmidia=/.test(csv),'CSV: BOM, separador ";", 4 linhas, 36 colunas e link da foto');
const [dx]=await Promise.all([p.waitForEvent('download'),p.click('#lvXlsx')]);const xp=await dx.path();
const XLSX=require('/home/claude/work/npmlib/xlsx/package/xlsx.js');const wb=XLSX.readFile(xp);const A=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1});
console.log(wb.SheetNames,A.length,A[0].length,A[1].slice(0,12));
ok(A.length===5&&A[0].length===36&&A.slice(1).some(r=>r[8]==='VIAR-GDA-470/2026')&&typeof A[1][4]==='number','Excel abre: 4 registros, 36 colunas, coordenadas numéricas');
// 12) link da foto
const link=lines.find(l=>/lbmidia=/.test(l)).match(/https?:[^ ;"]+lbmidia=[^ ;"|]+/)[0];await p.goto(link);await p.waitForTimeout(2500);
ok(!(await p.isHidden('#lvMv'))&&await p.$('#lvMvBody img')!==null,'link da foto da exportação abre a foto no app');
ok(errs.length===0,'sem erros JS '+JSON.stringify(errs.slice(0,3)));
console.log(`\n${res.filter(Boolean).length}/${res.length} OK`);await b.close()})();

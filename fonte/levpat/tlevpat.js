const {chromium}=require('/home/claude/localizador-de-estacas/firebase/node_modules/playwright');const fs=require('fs');
const PT=JSON.parse(fs.readFileSync('/tmp/claude-0/off/lppts.json','utf8'));const D='/tmp/claude-0/off/';
const res=[];const ok=(c,n)=>{res.push(c);console.log((c?'OK  ':'FALHOU ')+n)};const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:393,height:852},hasTouch:true,permissions:['geolocation'],geolocation:{latitude:PT.L2[0][1],longitude:PT.L2[0][2],accuracy:4},acceptDownloads:true,colorScheme:'dark'});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.route(/(openstreetmap|arcgisonline)/,r=>r.abort());
await p.goto('http://localhost:8771/#levpat');await p.waitForTimeout(2500);
ok(await p.$('#drawer a[data-page="levpat"]')!==null,'item "Levantamento de Patologias" no menu');
ok(await p.textContent('#pPat .topbar h1')==='Levantamento de Patologias','página aberta');
const go=async(pt,ms=900)=>{await ctx.setGeolocation({latitude:pt[1],longitude:pt[2],accuracy:4});await wait(ms)};
const lay=()=>p.evaluate(()=>[...document.querySelectorAll('#lpGrid .lv-col')].map(c=>({p:c.dataset.p,x:c.getBoundingClientRect().left,fx:[...c.querySelectorAll('.lv-btn')].map(b=>[b.dataset.fx,b.getBoundingClientRect().left]).sort((a,b)=>a[1]-b[1]).map(a=>a[0]).join(',')})).sort((a,b)=>a.x-b.x));
ok((await p.$$('#lpGrid .lv-btn[data-k="PANELA"]')).length===4,'4 botões PANELA: 2 pistas × faixas 1 e 2');
for(let k=1;k<=6;k++)await go(PT.L2[k]);
const L=await lay();console.log(JSON.stringify(L),await p.textContent('#lpSent'),await p.textContent('#lpSt'));
ok(/↑ CRESCENTE/.test(await p.textContent('#lpSent'))&&L[1].p==='CRESCENTE','andando no crescente: minha pista (crescente) à direita');
ok(L[1].fx==='F1,F2'&&L[0].fx==='F2,F1','faixa 1 junto ao centro nas duas pistas (como na pista real)');
await p.screenshot({path:D+'lp_retrato.png'});
// toque: panela na faixa 2 da pista crescente
await p.click('#lpGrid .lv-btn[data-k="PANELA"][data-fx="F2"][data-p="CRESCENTE"]');await wait(300);
const t=await p.textContent('#lpToast');console.log(t);ok(/^Panela registrada: Est\. \d+\+\d+, Pista Crescente · Faixa 2/.test(t)&&/DESFAZER/.test(t),'aviso "Panela registrada: Est. …, Pista Crescente · Faixa 2" com DESFAZER');
await p.screenshot({path:D+'lp_toque.png'});
let R=await p.evaluate(()=>window.__LEVPAT.rec());let r=R[R.length-1];console.log(JSON.stringify(r));
ok(r.patologia==='PANELA'&&r.pista==='CRESCENTE'&&r.faixa==='F2'&&r.rodovia==='BR-277/PR'&&r.lote===2&&r.contrato==='VIAR-GDA-430/2026'&&Math.abs(r.lat-PT.L2[6][1])<1e-6&&Math.abs(r.lon-PT.L2[6][2])<1e-6&&r.precisao_m===4&&r.estaca===PT.L2[6][0]&&r.sentido_desloc==='CRESCENTE','ocorrência Lote 02: estaca do KMZ, lat/lon do GPS, pista, faixa, contrato');
// Lote 03
for(let k=0;k<4;k++)await go(PT.L3[k]);await p.click('#lpGrid .lv-btn[data-fx="F1"][data-p="DECRESCENTE"]');await wait(300);
R=await p.evaluate(()=>window.__LEVPAT.rec());r=R[R.length-1];ok(r.lote===3&&r.estaca===PT.L3[3][0]&&r.faixa==='F1'&&r.pista==='DECRESCENTE'&&Math.abs(r.lat-PT.L3[3][1])<1e-6,'ocorrência Lote 03: estaca '+r.estaca_txt+', decrescente faixa 1');
// Lote 04 (BR-373)
for(let k=0;k<5;k++)await go(PT.B4[k]);await p.click('#lpGrid .lv-btn[data-fx="F1"][data-p="CRESCENTE"]');await wait(300);
R=await p.evaluate(()=>window.__LEVPAT.rec());r=R[R.length-1];console.log(JSON.stringify(r));ok(r.lote===4&&r.rodovia==='BR-373/PR'&&r.contrato==='VIAR-GDA-470/2026'&&r.estaca===PT.B4[4][0]&&Math.abs(r.lon-PT.B4[4][2])<1e-6,'ocorrência Lote 04 (BR-373): estaca '+r.estaca_txt);
ok(await p.textContent('#lpCtr')==='VIAR-GDA-470/2026 · BR-373/PR'&&await p.textContent('#lpLote')==='Lote 04','topo mostra contrato e lote do Lote 04');
// desfazer a última
await p.click('#lpUndo');await wait(300);R=await p.evaluate(()=>window.__LEVPAT.rec());ok(R.find(x=>x.id===r.id).excluido&&R.find(x=>x.id===r.id).excluido_motivo==='DESFEITO','DESFAZER marca como desfeita');
// lista
await p.click('#pPat .lv-tab[data-v="list"]');await wait(500);
const n=(await p.$$('#lpItems .lv-it')).length;ok(n===2,'lista: 2 ocorrências ativas (a desfeita sai)');
await p.selectOption('#lpFFaixa','F2');await wait(200);ok((await p.$$('#lpItems .lv-it')).length===1,'filtro por faixa');await p.selectOption('#lpFFaixa','ALL');
ok(/Faixa 2/.test(await p.textContent('#lpItems'))&&/Panela/.test(await p.textContent('#lpItems')),'item mostra pista, faixa e patologia');
await p.screenshot({path:D+'lp_lista.png'});
// complementar: corrigir faixa e observação
await p.click('#lpItems [data-ed]');await wait(300);await p.selectOption('#lpEdFaixa','F1');await p.fill('#lpEdObs','panela de 40 cm');await p.click('#lpEdSave');await wait(300);
R=await p.evaluate(()=>window.__LEVPAT.rec());const c=R.find(x=>x.obs==='panela de 40 cm');ok(c&&c.corrigido_de&&/\/F[12]$/.test(c.corrigido_de),'complemento grava observação e a correção ('+(c&&c.corrigido_de)+')');
// CSV
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#lpCsv')]);const txt=fs.readFileSync(await dl.path(),'utf8');const h=txt.split('\r\n')[0];
ok(/Levantamento_patologias_/.test(dl.suggestedFilename())&&/;Pista;Faixa;Patologia;/.test(h)&&txt.split('\r\n').length===3,'CSV com Pista, Faixa e Patologia ('+dl.suggestedFilename()+')');
// bota-espera continua igual e separado
const lb=await p.evaluate(()=>window.__LEVBE.rec().length);ok(lb===0,'Levantamento de Bota-Espera não recebe as ocorrências de patologia');
await p.click('#pPat .lv-tab[data-v="reg"]');await p.setViewportSize({width:852,height:393});await wait(600);await p.screenshot({path:D+'lp_paisagem.png'});
const fit=await p.evaluate(()=>[...document.querySelectorAll('#lpGrid .lv-btn')].every(b=>{const r=b.getBoundingClientRect();return r.bottom<=innerHeight+1&&r.height>=60}));ok(fit,'paisagem: os 4 botões cabem na tela, altura ≥ 60 px');
await p.emulateMedia({colorScheme:'light'});await p.setViewportSize({width:393,height:852});await wait(400);await p.screenshot({path:D+'lp_claro.png'});
ok(errs.length===0,'sem erros JS '+JSON.stringify(errs.slice(0,3)));
console.log(`\n${res.filter(x=>x).length}/${res.length}`);await b.close()})();

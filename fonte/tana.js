const {chromium}=require('/home/claude/work/node_modules/playwright');const fs=require('fs');process.chdir('/home/claude/work');
const LIB={'xlsx.full.min.js':'npmlib/xlsx/package/dist/xlsx.full.min.js','jspdf.umd.min.js':'npmlib/jspdf-2.5.1/package/dist/jspdf.umd.min.js','jspdf.plugin.autotable.min.js':'npmlib/jspdf-autotable-3.8.2/package/dist/jspdf.plugin.autotable.min.js'};
const out=[];const ok=(c,n)=>{out.push((c?'OK  ':'FALHOU ')+n);console.log((c?'OK  ':'FALHOU ')+n)};const D='/tmp/claude-0/ana/';fs.mkdirSync(D,{recursive:true});
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const ctx=await b.newContext({viewport:{width:1280,height:900},acceptDownloads:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('**/cdnjs.cloudflare.com/**',r=>{const f=r.request().url().split('/').pop();r.fulfill({body:fs.readFileSync(LIB[f]||'package/dist/leaflet.js'),contentType:'application/javascript'})});await p.route(/(jsdelivr|fonts\.g|openstreetmap|arcgisonline)/,r=>r.abort());
await p.goto('http://localhost:8765/#analise');await p.waitForTimeout(2500);
ok(await p.locator('#drawer a[data-page="analise"]').count()===1,'item "Análise por km" no menu');
let s=await p.evaluate(()=>{const a=window.__ana();return {km:a.RES.kms.length,first:a.RES.kms[0].k,last:a.RES.kms[a.RES.kms.length-1].k,m:a.scope.A.m,n:a.scope.A.n,t:a.scope.A.t,sol:a.RES.sol}});console.log(JSON.stringify(s));
ok(s.km>100&&s.n>0,'BR-277: '+s.km+' km, '+s.n+' segmentos');
// consistência: soma por km = total do escopo; segmentos únicos não duplicados
const c=await p.evaluate(()=>{const a=window.__ana(),ks=a.RES.kms;const sumM=ks.reduce((x,o)=>x+o.A.m,0),sumN=ks.reduce((x,o)=>x+o.A.n,0),sumT=ks.reduce((x,o)=>x+o.A.t,0);
  const multi=a.scope.A.ps.filter(s=>s.kms.size>1).length;return {sumM,m:a.scope.A.m,sumN,n:a.scope.A.n,multi,sumT,t:a.scope.A.t,over:ks.filter(o=>o.A.m>1000).length}});console.log(JSON.stringify(c));
ok(Math.abs(c.sumM-c.m)<1e-6&&Math.abs(c.sumT-c.t)<1e-6,'extensão e CBUQ rateados por km somam o total');
ok(c.n<=c.sumN&&c.sumN-c.n===c.sumN-c.n&&(c.multi===0?c.n===c.sumN:c.n<c.sumN),`segmentos únicos (${c.n}) sem duplicar os ${c.multi} que passam de um km (soma por km ${c.sumN})`);
// comparação com a calculadora: trecho 233 inteiro F1 decrescente
await p.fill('#aKA','233');await p.dispatchEvent('#aKA','change');await p.fill('#aKB','233');await p.dispatchEvent('#aKB','change');await p.waitForTimeout(400);
const k233=await p.evaluate(()=>{const A=window.__ana().scope.A;return {m:A.m,t:A.t,n:A.n,nL:A.nL,nS:A.nS}});console.log('km 233',JSON.stringify(k233));
ok(k233.nL+k233.nS===k233.n,'≥100 m + <100 m = segmentos');
await p.fill('#aKA','186');await p.dispatchEvent('#aKA','change');await p.fill('#aKB','195');await p.dispatchEvent('#aKB','change');await p.waitForTimeout(500);
ok(await p.locator('#aDiag .an-km').count()===10,'diagrama com 10 km (186 a 195)');
await p.click('#aDiag .an-km[data-k="188"]');await p.waitForTimeout(300);ok(/km 188/.test(await p.textContent('#aSegHead')),'clique seleciona o km 188');
await p.check('#aRange');await p.click('#aDiag .an-km[data-k="191"]');await p.waitForTimeout(400);ok(/km 188 a 191/.test(await p.textContent('#aSegHead')),'intervalo km 188 a 191');
const sel=await p.evaluate(()=>{const a=window.__ana();return {ks:a.scope.ks.map(o=>o.k).join(','),n:a.scope.A.n}});ok(sel.ks==='188,189,190,191','km consecutivos: '+sel.ks);
await p.screenshot({path:D+'top.png'});
await p.locator('#aDiagCard').scrollIntoViewIfNeeded();await p.screenshot({path:D+'diag.png'});
await p.locator('#aMap').scrollIntoViewIfNeeded();await p.waitForTimeout(500);ok(await p.evaluate(()=>window.__ana().RES.kms.filter(o=>o.line&&o.line.getLatLngs().length>=2).length)===10&&await p.evaluate(()=>!!document.querySelector('#aMap canvas')),'mapa com as linhas dos 10 km');
await p.locator('#aStrat').scrollIntoViewIfNeeded();await p.screenshot({path:D+'strat.png'});
const st=await p.textContent('#aStrat');ok(/Maior continuidade/.test(st)&&/Mais fragmentados/.test(st)&&/Maior demanda/.test(st)&&/Potencial produtivo, não produtividade medida/.test(st),'destaques com critérios');
// simulação sem parâmetros: não inventa
ok(/Informe capacidade diária de execução/.test(await p.textContent('#aSimOut')),'sem parâmetros: pede os valores');
await p.fill('#aSimCap','2500');await p.selectOption('#aSimU','m2');await p.fill('#aSimDisp','300');await p.fill('#aSimTruck','14');await p.waitForTimeout(400);
const sim=await p.evaluate(()=>{const r=window.__ana().sim;return {d:r.days.length,t:r.tot.t,loads:r.loads,lim:r.lim,dEx:r.dEx,dMat:r.dMat,sumT:r.days.reduce((a,x)=>a+x.t,0),sumM2:r.days.reduce((a,x)=>a+x.m2,0),m2:r.tot.m2,maxT:Math.max(...r.days.map(x=>x.t)),maxM2:Math.max(...r.days.map(x=>x.m2))}});console.log(JSON.stringify(sim));
ok(Math.abs(sim.sumT-sim.t)<1e-6&&Math.abs(sim.sumM2-sim.m2)<1e-6,'jornadas somam o total do trecho');ok(sim.maxT<=300+1e-6&&sim.maxM2<=2500+1e-6,'nenhuma jornada passa da capacidade nem do CBUQ disponível');
ok(sim.d>=Math.ceil(Math.max(sim.dEx,sim.dMat)-1e-9)&&sim.d<=Math.ceil(sim.dEx+sim.dMat),'dias coerentes com o limitante ('+sim.lim+')');
await p.locator('#aSimOut').scrollIntoViewIfNeeded();await p.screenshot({path:D+'sim.png'});
// ordenação dos km
await p.selectOption('#aSort','t');await p.waitForTimeout(200);const ord=await p.$$eval('#aKmTab tbody tr td:nth-child(5)',a=>a.map(x=>parseFloat(x.textContent.replace(/\./g,'').replace(',','.'))||0));ok(ord.every((v,i)=>!i||v<=ord[i-1]),'km ordenados por CBUQ');
// exportação
let dl=p.waitForEvent('download',{timeout:60000});await p.click('#aExp');const d=await dl;await d.saveAs(D+'ana277.xlsx');ok(fs.statSync(D+'ana277.xlsx').size>5000,'Excel exportado: '+d.suggestedFilename());
// BR-373 B4: FS no lugar de G
await p.selectOption('#aObra','B4');await p.waitForTimeout(1200);
const b4=await p.evaluate(()=>{const a=window.__ana();return {km:a.RES.kms.length,sol:a.RES.fams,stOn:a.RES.stOn}});console.log(JSON.stringify(b4));
ok(b4.sol.includes('FS')&&!b4.sol.includes('G')&&!b4.stOn,'B4: FS (ex-GAP) nas soluções; status indisponível');
const solTxt=await p.textContent('#aSol');ok(/FS – Fresagem Superficial 3 cm/.test(solTxt),'filtro mostra FS – Fresagem Superficial 3 cm');
await p.fill('#aKA','230');await p.dispatchEvent('#aKA','change');await p.fill('#aKB','232');await p.dispatchEvent('#aKB','change');await p.waitForTimeout(500);
const segT=await p.textContent('#aSegTab');ok(/no unifilar: G – Gap Graded/.test(segT)||!/FS/.test(segT),'rastreabilidade do nome original no segmento');
await p.screenshot({path:D+'b4.png'});
dl=p.waitForEvent('download',{timeout:60000});await p.click('#aExp');await (await dl).saveAs(D+'anab4.xlsx');
await p.setViewportSize({width:390,height:844});await p.waitForTimeout(500);await p.goto('http://localhost:8765/#analise');await p.waitForTimeout(1500);await p.screenshot({path:D+'mob1.png'});
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'celular sem rolagem lateral');
ok(errs.length===0,'sem erros JS '+JSON.stringify(errs.slice(0,3)));fs.writeFileSync(D+'rep.txt',out.join('\n'));await b.close()})();

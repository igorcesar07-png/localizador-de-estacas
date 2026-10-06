const {chromium}=require('/home/claude/work/node_modules/playwright');const fs=require('fs');process.chdir('/home/claude/work');
const LIB={'xlsx.full.min.js':'npmlib/xlsx/package/dist/xlsx.full.min.js','jspdf.umd.min.js':'npmlib/jspdf-2.5.1/package/dist/jspdf.umd.min.js','jspdf.plugin.autotable.min.js':'npmlib/jspdf-autotable-3.8.2/package/dist/jspdf.plugin.autotable.min.js','pdf.min.js':'npmlib/pdfjs/package/build/pdf.min.js','pdf.worker.min.js':'npmlib/pdfjs/package/build/pdf.worker.min.js'};
const out=[];const ok=(c,n)=>{out.push((c?'OK  ':'FALHOU ')+n);console.log((c?'OK  ':'FALHOU ')+n)};const D='/tmp/claude-0/acc/';fs.mkdirSync(D,{recursive:true});
const pn=t=>parseFloat(t.replace(/\./g,'').replace(',','.'));
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const ctx=await b.newContext({viewport:{width:1280,height:900},acceptDownloads:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('**/cdnjs.cloudflare.com/**',r=>{const f=r.request().url().split('/').pop();r.fulfill({body:fs.readFileSync(LIB[f]||'package/dist/leaflet.js'),contentType:'application/javascript'})});await p.route(/(jsdelivr|fonts\.g|openstreetmap|arcgisonline)/,r=>r.abort());
await p.goto('http://localhost:8765/#calculadora');await p.waitForTimeout(1200);
await p.setInputFiles('#cSerFile','/tmp/claude-0/apj/apontamentos_BR-277.json');await p.waitForSelector('#cSerMsg .sermsg b',{state:'attached'});
const runs=[['A','233+726','232+220','F1','D'],['B','186+000','186+400','ALL','ALL']];
for(const [nm,ka,kb,pi,se] of runs){await p.reload();await p.waitForTimeout(1300);
 await p.fill('#cKmA',ka);await p.fill('#cKmB',kb);await p.selectOption('#cPista',pi);await p.selectOption('#cSent',se);await p.click('#cForm button[type=submit]');await p.waitForTimeout(500);
 await p.fill('#rfData','2026-10-07');await p.selectOption('#rfObra','Restauração BR-277 – Blocos 02 e 03');await p.selectOption('#rfEquipe','Pavimentação Johonatan');await p.dispatchEvent('#rfEquipe','change');
 for(const [id,v] of [['rfUPrep','04:00'],['rfUIni','04:30'],['rfSCafe','04:30'],['rfSDds','05:00'],['rfSSai','05:30'],['rfECafe','04:30'],['rfEDds','05:00'],['rfESai','05:30'],['rfTempoMsg','A previsão do tempo está estável. Seguiremos monitorando.']])await p.fill('#'+id,v);
 await p.selectOption('#rfTempo','Ensolarado');await p.click('#cRep');await p.waitForTimeout(1000);await p.click('.rtype button[data-rt="simp"]');await p.waitForTimeout(600);
 const hd=await p.evaluate(()=>{const a=[...document.querySelector('.sr-t').querySelectorAll('thead th')];return a.map(x=>x.textContent)});ok(hd.slice(-2).join('|')==='CBUQ (t)|CBUQ acumulado (t)'&&!hd.includes('Área'),nm+': colunas '+hd.slice(-4).join(', '));
 const rows=await p.evaluate(()=>{const a=[...document.querySelector('.sr-t').querySelectorAll('tbody tr:not(.b)')];return a.map(tr=>[...tr.children].map(x=>x.textContent.trim()))});
 // acumulado esperado a partir do modelo (precisão integral)
 const exp=await p.evaluate(()=>{const M=window.__lastM||null;return null});
 let run=0,good=true;rows.forEach(r=>{const t=r[r.length-2],a=pn(r[r.length-1]);if(/^\d/.test(t))run+=pn(t);if(Math.abs(run-a)>0.011*rows.length)good=false});
 console.log(rows.map(r=>r[0]+' '+r.slice(-2).join(' / ')).join(' | '));
 const tile=await p.$$eval('.sr-sum div',a=>a.map(x=>x.innerText.replace(/\s+/g,' ')).find(x=>/^CBUQ/i.test(x)));
 ok(good,nm+': acumulado segue a sequência');ok(tile&&tile.includes(rows[rows.length-1].slice(-1)[0]),nm+': último acumulado = cartão CBUQ ('+tile+')');
 ok(await p.$$eval('.sr-sum div',a=>a.some(x=>/área/i.test(x.innerText))),nm+': cartão ÁREA mantido');
 const dl=p.waitForEvent('download',{timeout:60000});await p.click('#rvPng');await (await dl).saveAs(D+nm+'.png');
 const d2=p.waitForEvent('download',{timeout:60000});await p.click('#rvPdf');await (await d2).saveAs(D+nm+'.pdf')}
ok(errs.length===0,'sem erros JS '+JSON.stringify(errs.slice(0,3)));await b.close()})();

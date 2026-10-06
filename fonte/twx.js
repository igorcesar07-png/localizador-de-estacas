const {chromium}=require('/home/claude/work/node_modules/playwright');const fs=require('fs');process.chdir('/home/claude/work');
const LIB={'xlsx.full.min.js':'npmlib/xlsx/package/dist/xlsx.full.min.js','jspdf.umd.min.js':'npmlib/jspdf-2.5.1/package/dist/jspdf.umd.min.js','jspdf.plugin.autotable.min.js':'npmlib/jspdf-autotable-3.8.2/package/dist/jspdf.plugin.autotable.min.js','pdf.min.js':'npmlib/pdfjs/package/build/pdf.min.js','pdf.worker.min.js':'npmlib/pdfjs/package/build/pdf.worker.min.js'};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const ctx=await b.newContext({viewport:{width:1280,height:900},acceptDownloads:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('**/cdnjs.cloudflare.com/**',r=>{const f=r.request().url().split('/').pop();r.fulfill({body:fs.readFileSync(LIB[f]||'package/dist/leaflet.js'),contentType:'application/javascript'})});await p.route(/(jsdelivr|fonts\.g|openstreetmap|arcgisonline)/,r=>r.abort());
await p.goto('http://localhost:8765/#calculadora');await p.waitForTimeout(1200);
await p.setInputFiles('#cSerFile','/tmp/claude-0/apj/apontamentos_BR-277.json');await p.waitForSelector('#cSerMsg .sermsg b',{state:'attached'});
const runs=[['Ensolarado','Pavimentação Johonatan','F1','D','233+726','232+220'],['Nublado','Pavimentação Raimundo','ALL','C','186+000','186+400'],['Chuva fraca / garoa','Dreno Sandro','DRN','ALL','196+000','197+000']];
for(const [tempo,eq,pi,se,ka,kb] of runs){await p.evaluate(()=>{location.hash='#calculadora'});await p.reload();await p.waitForTimeout(1500);if(!(await p.isVisible('#cKmA'))){await p.screenshot({path:'/tmp/claude-0/dbg.png'})}
 await p.selectOption('#rfEquipe',eq);await p.fill('#cKmA',ka);await p.fill('#cKmB',kb);await p.selectOption('#cPista',pi);await p.selectOption('#cSent',se);await p.click('#cForm button[type=submit]');await p.waitForTimeout(500);
 await p.fill('#rfData','2026-10-0'+(runs.findIndex(r=>r[0]===tempo)+7));await p.selectOption('#rfObra','Restauração BR-277 – Blocos 02 e 03');await p.selectOption('#rfEquipe',eq);await p.dispatchEvent('#rfEquipe','change');
 console.log('rótulo form:',await p.textContent('#rfELabel'));
 for(const [id,v] of [['rfUPrep','04:00'],['rfUIni','04:30'],['rfSCafe','04:30'],['rfSDds','05:00'],['rfSSai','05:30'],['rfECafe','04:30'],['rfEDds','05:00'],['rfESai','05:30']])await p.fill('#'+id,v);
 const opt=await p.$$eval('#rfTempo option',a=>a.map(o=>o.value||o.textContent));await p.selectOption('#rfTempo',opt.find(o=>o.startsWith(tempo.split(' ')[0])));await p.dispatchEvent('#rfTempo','change');
 if(/Dreno/.test(eq)){await p.check('input[name=rfUsiDr][value=S]');await p.fill('#rfUsiQt','8')}await p.click('#cRep');await p.waitForTimeout(1000);await p.click('.rtype button[data-rt="simp"]');await p.waitForTimeout(600);
 const dl=p.waitForEvent('download',{timeout:60000});await p.click('#rvPng');await (await dl).saveAs(`/tmp/claude-0/wx_${tempo.split(' ')[0]}.png`);
 await p.click('.rtype button[data-rt="full"]');await p.waitForTimeout(900);await p.screenshot({path:`/tmp/claude-0/wxfull_${tempo.split(' ')[0]}.png`});
 const d2=p.waitForEvent('download',{timeout:60000});await p.click('#rvPdf');await (await d2).saveAs(`/tmp/claude-0/wx_${tempo.split(' ')[0]}.pdf`)}
console.log('ERR',errs);await b.close()})();

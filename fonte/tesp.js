const {chromium}=require('/home/claude/work/node_modules/playwright');const fs=require('fs');process.chdir('/home/claude/work');
const ok=(c,n)=>console.log((c?'OK  ':'FALHOU ')+n);
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await b.newPage({viewport:{width:1280,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('**/cdnjs.cloudflare.com/**',r=>{const u=r.request().url();r.fulfill({body:fs.readFileSync(/xlsx/.test(u)?'npmlib/xlsx/package/dist/xlsx.full.min.js':/autotable/.test(u)?'npmlib/jspdf-autotable-3.8.2/package/dist/jspdf.plugin.autotable.min.js':/jspdf/.test(u)?'npmlib/jspdf-2.5.1/package/dist/jspdf.umd.min.js':'package/dist/leaflet.js'),contentType:'application/javascript'})});
await p.route(/(jsdelivr|fonts\.g|openstreetmap|arcgisonline)/,r=>r.abort());
await p.goto('http://localhost:8765/#calculadora');await p.waitForTimeout(1500);
for(const [obra,a,bb] of [['Restauração BR-373 – Bloco 04','230+000','231+000'],['Restauração BR-277 – Blocos 02 e 03','236+000','237+000']]){console.log('==',obra);
await p.selectOption('#rfObra',obra);await p.waitForTimeout(500);await p.selectOption('#rfEquipe','Pavimentação Johonatan');await p.waitForTimeout(300);
await p.fill('#cKmA',a);await p.fill('#cKmB',bb);await p.selectOption('#cPista','F1');await p.selectOption('#cSent','ALL');await p.click('#cForm button[type=submit]');await p.waitForTimeout(800);
const rows=async()=>p.$$eval('#cOut table.q tbody tr[data-tag]',a=>a.filter(tr=>tr.querySelector('.re')).map(tr=>({tag:tr.dataset.tag,w:tr.querySelector('.rw:not(.re)').value,wc:tr.querySelector('.rw:not(.re)').classList.contains('cust'),e:tr.querySelector('.re').value,ec:tr.querySelector('.re').classList.contains('cust'),alt:(tr.querySelector('.ealt')||{}).textContent||'',t:tr.lastElementChild.textContent})));
const tot=()=>p.$eval('#cOut table.q tfoot td.big2',e=>e.textContent);
let R=await rows();console.log(R.slice(0,3),R.length,await tot());const t0=await tot();const r0=R[0];
await p.fill(`tr[data-tag="${r0.tag}"] .re`,'8');await p.press(`tr[data-tag="${r0.tag}"] .re`,'Tab');await p.waitForTimeout(500);
R=await rows();const x=R.find(r=>r.tag===r0.tag);console.log(x,await tot());
ok(x.e==='8'&&x.ec&&/alterada · projeto/.test(x.alt)&&await tot()!==t0,'espessura alterada no pano, sinalizada e recalculada');
ok(/Espessura alterada em 1 pano/.test(await p.textContent('#cOut')),'aviso de espessura alterada na programação');
await p.fill('#cWAll','3,45'.replace(',','.'));await p.click('#cWAllGo');await p.waitForTimeout(500);R=await rows();
ok(R.every(r=>r.w==='3.45'&&r.wc),'largura média copiada para todos os panos da programação ('+R.length+')');
for(const i of ['rfSCafe','rfSDds','rfSSai','rfECafe','rfEDds','rfESai']){await p.fill('#'+i,'06:00');await p.press('#'+i,'Tab')}
await p.selectOption('#rfTempo','Ensolarado');await p.click('#cRep');await p.waitForTimeout(1500);
const rep=await p.textContent('#repDoc');ok(/Espessura alterada em relação ao projeto em 1 pano/.test(rep)&&/alterada \(projeto/.test(rep),'relatório sinaliza a espessura alterada');
ok(/3,45/.test(rep),'relatório com a largura média');
await p.screenshot({path:'/tmp/claude-0/ser/rep_'+(obra.includes('373')?'b4':'277')+'.png'});
await p.click('.rtype button[data-rt="simp"]');await p.waitForTimeout(500);ok(/alterada \(projeto/.test(await p.textContent('#repDoc')),'tabela simplificada sinaliza a espessura alterada');
await p.click('#rvClose');await p.waitForTimeout(300);
await p.locator('#cWAll').scrollIntoViewIfNeeded();await p.screenshot({path:'/tmp/claude-0/ser/calc_'+(obra.includes('373')?'b4':'277')+'.png'});
await p.click('#cWAllRst');await p.waitForTimeout(400);R=await rows();ok(R.every(r=>!r.wc),'voltar às larguras de projeto');
await p.click(`tr[data-tag="${r0.tag}"] .rereset`);await p.waitForTimeout(400);R=await rows();ok(!R.find(r=>r.tag===r0.tag).ec&&await tot()===t0,'↺ volta à espessura de projeto e ao total original');}
ok(errs.length===0,'sem erros JS '+JSON.stringify(errs));await b.close()})();

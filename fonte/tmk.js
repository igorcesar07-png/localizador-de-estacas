const {chromium}=require('/home/claude/work/node_modules/playwright');const fs=require('fs');process.chdir('/home/claude/work');
const LIB={'xlsx.full.min.js':'npmlib/xlsx/package/dist/xlsx.full.min.js'};
const out=[];const ok=(c,n)=>{out.push((c?'OK  ':'FALHOU ')+n);console.log((c?'OK  ':'FALHOU ')+n)};const D='/tmp/claude-0/mk/';fs.mkdirSync(D,{recursive:true});
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const ctx=await b.newContext({viewport:{width:1366,height:900},acceptDownloads:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
await p.route('**/cdnjs.cloudflare.com/**',r=>{const f=r.request().url().split('/').pop();r.fulfill({body:fs.readFileSync(LIB[f]||'package/dist/leaflet.js'),contentType:'application/javascript'})});await p.route(/(jsdelivr|fonts\.g|openstreetmap|arcgisonline)/,r=>r.abort());
// observação de dreno salva na calculadora (deste aparelho)
await p.goto('http://localhost:8765/#calculadora');await p.waitForTimeout(1200);
await p.evaluate(()=>{const c=JSON.parse(localStorage.getItem('br277.calc')||'{}');c.bySrc=c.bySrc||{};c.bySrc['277']=c.bySrc['277']||{rowW:{},rowOff:{},rowSeg:{},serial:{}};c.bySrc['277'].obs={'186-DR-C-01':'Interferência com rede de água'};localStorage.setItem('br277.calc',JSON.stringify(c))});
await p.goto('http://localhost:8765/#marcos');await p.waitForTimeout(2500);
ok(await p.locator('#drawer a[data-page="marcos"]').count()===1,'item "Marcos do trecho" no menu');
const leg=await p.textContent('#mkLeg');ok(['Bota-esperas','Rotatórias','Perímetros urbanos','Entradas','Coleta de água outorgada','Observações'].every(t=>leg.includes(t))&&/Lote 02/.test(leg)&&/Lote 04/.test(leg),'legenda com os 6 tipos e os lotes 02, 03 e 04');
ok(await p.evaluate(()=>window.__marcos().drn.length)===1,'observação do dreno (calculadora) aparece no mapa');
// importar a planilha convertida do PDF
await p.setInputFiles('#mkFile','/tmp/claude-0/marcos/Bota-esperas_areas_de_apoio.xlsx');await p.waitForSelector('#mkImpOk',{timeout:20000});
const im=await p.textContent('#mkImpMsg');console.log(im);ok(/30 marcos lidos/.test(im)&&/30 novos/.test(im)&&/7 com coordenada longe/.test(im),'pré-visualização: 30 bota-esperas, 7 para conferir');
await p.click('#mkImpOk');await p.waitForTimeout(800);
let st=await p.evaluate(()=>{const M=window.__marcos();return {n:M.ALL.length,bota:M.ALL.filter(m=>m.cat==='bota').length,flag:M.ALL.filter(m=>M.placeOf(m).flag).map(m=>m.cad).join(','),s:M.ALL.find(m=>m.cad==='242_277')}});console.log(st.flag);
ok(st.n===30&&st.bota===30,'30 bota-esperas gravadas');ok(st.s.pdf.emp==='NEOVIA-430_2026_Pavimentação'&&st.s.pdf.data==='27/08/2026'&&Math.abs(st.s.lat+25.46781)<1e-4,'dados do PDF e coordenada UTM convertida (242_277)');
ok(st.flag.split(',').sort().join(',')==='005_373,006_373,019_277,033_277,043_277,055_277,062_277','marcados para conferir: '+st.flag);
// reimportar não duplica
await p.setInputFiles('#mkFile','/tmp/claude-0/marcos/Bota-esperas_areas_de_apoio.xlsx');await p.waitForSelector('#mkImpOk');ok(/0 novos e 30 atualizados/.test(await p.textContent('#mkImpMsg')),'reimportar atualiza pelo nº de cadastro (sem duplicar)');await p.click('#mkImpNo');
ok(await p.locator('#mkList .mk-it').count()===30,'lista com 30 marcos');
await p.screenshot({path:D+'geral.png'});
// abrir um marco pela lista
await p.click('#mkList .mk-it[data-id="cad-242_277"]');await p.waitForTimeout(1200);const pop=await p.textContent('.leaflet-popup-content');console.log(pop.replace(/\s+/g,' ').slice(0,300));
ok(/Bota-espera 242_277/.test(pop)&&/233\+700/.test(pop)&&/Lote 02/.test(pop)&&/NEOVIA-430/.test(pop)&&/Estaca mais próxima/.test(pop),'detalhe: km, lote, estaca mais próxima e dados do documento');
await p.screenshot({path:D+'popup.png'});
// marco a conferir
await p.click('#mkList .mk-it[data-id="cad-006_373"]');await p.waitForTimeout(1000);ok(/Conferir/.test(await p.textContent('.leaflet-popup-content')),'006_373 mostra o aviso de conferência');
// levar para o km
await p.click('.leaflet-popup-content [data-a="tokm"]');await p.waitForTimeout(600);ok(await p.evaluate(()=>{const M=window.__marcos();const m=M.ALL.find(x=>x.cad==='006_373');return m.lat==null&&!M.placeOf(m).flag}),'"Levar para o km" posiciona na estaca 280+000 e tira o aviso');
// novo marco pelo mapa: rotatória
await p.click('#mkAdd');const box=await p.locator('#mkMap').boundingBox();await p.mouse.click(box.x+box.width/2,box.y+box.height/2);await p.waitForTimeout(400);
ok(!(await p.isHidden('#mkForm')),'toque no mapa abre o formulário');const kmSug=await p.inputValue('#mkFKm');console.log('km sugerido',kmSug,await p.inputValue('#mkFRod'));
await p.selectOption('#mkFCat','rot');await p.fill('#mkFNome','Rotatória de teste');await p.fill('#mkFObs','Atenção ao desvio');await p.click('#mkFormEl button[type=submit]');await p.waitForTimeout(800);
st=await p.evaluate(()=>window.__marcos().ALL.find(m=>m.nome==='Rotatória de teste'));ok(st&&st.cat==='rot'&&st.posSrc==='mapa'&&st.lat!=null&&/^\d+\+\d{3}$/.test(st.km),'rotatória criada no ponto tocado, com km da estaca mais próxima ('+(st&&st.km)+')');
// perímetro urbano pelo km
await p.click('#mkAdd');await p.click('#mkAddKm');await p.waitForTimeout(300);await p.selectOption('#mkFCat','perim');await p.selectOption('#mkFRod','BR-277');await p.fill('#mkFKm','229+000');await p.fill('#mkFKmF','236+500');await p.fill('#mkFNome','Irati');
ok(/Estaca 229\+000 · Lote 0[23]/.test(await p.textContent('#mkFKmHint')),'km validado com o lote no formulário');await p.click('#mkFormEl button[type=submit]');await p.waitForTimeout(800);
ok(await p.evaluate(()=>{const m=window.__marcos().ALL.find(x=>x.cat==='perim');return m&&m.kmFim==='236+500'}),'perímetro urbano com km inicial e final');
// km inválido
await p.click('#mkAdd');await p.click('#mkAddKm');await p.selectOption('#mkFCat','agua');await p.selectOption('#mkFRod','BR-373');await p.fill('#mkFKm','150+000');await p.click('#mkFormEl button[type=submit]');await p.waitForTimeout(300);
ok(!(await p.isHidden('#mkFErr'))&&!(await p.isHidden('#mkForm')),'km fora do trecho é recusado: '+(await p.textContent('#mkFErr')));
await p.fill('#mkFKm','210+500');await p.selectOption('#mkFPos','utm');await p.fill('#mkFE','551000');await p.fill('#mkFN','7218400');await p.fill('#mkFNome','Captação Rio X');await p.click('#mkFormEl button[type=submit]');await p.waitForTimeout(800);
ok(await p.evaluate(()=>{const m=window.__marcos().ALL.find(x=>x.cat==='agua');return m&&m.posSrc==='utm'&&m.pdf.x===551000}),'ponto de água outorgada por coordenada UTM');
// editar
await p.click(`#mkList .mk-it[data-id="${st.id}"]`);await p.waitForTimeout(900);await p.click('.leaflet-popup-content [data-a="edit"]');await p.fill('#mkFNome','Rotatória do trevo');await p.click('#mkFormEl button[type=submit]');await p.waitForTimeout(700);
ok(await p.evaluate(id=>window.__marcos().ALL.find(m=>m.id===id).nome,st.id)==='Rotatória do trevo','edição salva');
// reposicionar arrastando
await p.click(`#mkList .mk-it[data-id="${st.id}"]`);await p.waitForTimeout(900);await p.click('.leaflet-popup-content [data-a="move"]');await p.waitForTimeout(300);
const mk=await p.locator('.mk-drag').boundingBox();await p.mouse.move(mk.x+15,mk.y+15);await p.mouse.down();await p.mouse.move(mk.x+80,mk.y+60,{steps:8});await p.mouse.up();await p.waitForTimeout(800);
const moved=await p.evaluate(([id,la])=>{const m=window.__marcos().ALL.find(x=>x.id===id);return Math.abs(m.lat-la)>1e-6},[st.id,st.lat]);ok(moved,'arrastar reposiciona e salva');console.log(await p.textContent('#mkMsg'));
// filtro
await p.click('#mkLeg .mk-lg[data-k="bota"]');await p.waitForTimeout(300);ok(await p.locator('#mkList .mk-it').count()===3,'desligar bota-esperas filtra a lista e o mapa');await p.click('#mkLeg .mk-lg[data-k="bota"]');
await p.fill('#mkQ','Imbituva');await p.waitForTimeout(300);ok(await p.locator('#mkList .mk-it').count()===2,'busca por município');await p.fill('#mkQ','');
// excluir
await p.click(`#mkList .mk-it[data-id="${st.id}"]`);await p.waitForTimeout(900);await p.click('.leaflet-popup-content [data-a="del"]');await p.waitForTimeout(600);ok(!(await p.evaluate(id=>window.__marcos().ALL.some(m=>m.id===id),st.id)),'excluir');
// zoom de estacas
await p.evaluate(()=>{});await p.click('#mkList .mk-it[data-id="cad-242_277"]');await p.waitForTimeout(400);await p.evaluate(()=>{const m=document.querySelector('.leaflet-popup-close-button');m&&m.click()});
await p.evaluate(()=>{});await p.click('.leaflet-control-zoom-in');await p.waitForTimeout(900);await p.screenshot({path:D+'zoom.png'});ok(await p.locator('.mk-st').count()>3,'estacas de 20 m com nome no zoom alto');
// exportar
const dl=p.waitForEvent('download',{timeout:60000});await p.click('#mkExp');const d=await dl;await d.saveAs(D+'marcos.xlsx');ok(fs.statSync(D+'marcos.xlsx').size>5000,'exportação: '+d.suggestedFilename());
// persistência
await p.reload();await p.waitForTimeout(2000);ok(await p.evaluate(()=>window.__marcos().ALL.length)===32,'marcos continuam depois de recarregar');
await p.setViewportSize({width:390,height:844});await p.waitForTimeout(700);await p.screenshot({path:D+'mob1.png'});await p.locator('#mkList').scrollIntoViewIfNeeded();await p.screenshot({path:D+'mob2.png'});
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'celular sem rolagem lateral');
ok(errs.length===0,'sem erros JS '+JSON.stringify(errs.slice(0,3)));fs.writeFileSync(D+'rep.txt',out.join('\n'));await b.close()})();

const {chromium}=require('/home/claude/localizador-de-estacas/firebase/node_modules/playwright');const fs=require('fs');
const PTS=JSON.parse(fs.readFileSync('/tmp/claude-0/off/pts.json','utf8'));
const ok=(c,n)=>console.log((c?'OK  ':'FALHOU ')+n);
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:1280,height:900},permissions:['geolocation'],geolocation:{latitude:PTS.p277[0][1],longitude:PTS.p277[0][2],accuracy:4}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/(openstreetmap|arcgisonline)/,r=>r.abort());
await p.goto('http://localhost:8771/#calculadora');await p.waitForTimeout(3000);
await p.selectOption('#rfObra','Restauração BR-277 – Blocos 02 e 03');await p.selectOption('#rfEquipe','Pavimentação Johonatan');await p.waitForTimeout(300);
for(const i of ['rfSCafe','rfSDds','rfSSai','rfECafe','rfEDds','rfESai']){await p.fill('#'+i,'06:00');await p.press('#'+i,'Tab')}await p.selectOption('#rfTempo','Ensolarado');
await p.fill('#cKmA','238+000');await p.fill('#cKmB','236+000');await p.selectOption('#cPista','ALL');await p.selectOption('#cSent','D');await p.click('#cForm button[type=submit]');await p.waitForTimeout(800);
const tot=()=>p.$eval('#cOut table.q tfoot td.big2',e=>e.textContent);const t0=await tot();
const tags=()=>p.$$eval('#cOut table.q tbody tr[data-tag]',a=>a.filter(tr=>tr.querySelector('.re')||tr.classList.contains('exc')).map(tr=>tr.dataset.tag));
console.log('antes',await tags(),t0);
// 1) pano fora do projeto
await p.click('#cManAdd');await p.waitForTimeout(200);ok(!(await p.isHidden('#manDlg')),'formulário de pano fora do projeto abre');
await p.click('#manSave');await p.waitForTimeout(200);ok(/Estaca inicial/.test(await p.textContent('#manErr')),'campos obrigatórios validados ('+await p.textContent('#manErr')+')');
await p.selectOption('#manSol','FF');await p.selectOption('#manSent','D');await p.selectOption('#manFx','F1');
await p.fill('#manIni','237+300');await p.fill('#manFim','237+500');await p.press('#manFim','Tab');await p.fill('#manW','3,5'.replace(',','.'));await p.fill('#manE','5');await p.click('#manSave');await p.waitForTimeout(200);
ok(/decrescente a estaca inicial deve ser maior/.test(await p.textContent('#manErr')),'sentido decrescente exige estaca inicial maior');
await p.fill('#manIni','237+500');await p.fill('#manFim','237+300');await p.press('#manFim','Tab');ok(await p.inputValue('#manLen')==='200','comprimento sugerido pelas estacas (200 m)');
await p.fill('#manObs','Pano extra: remendo profundo antes da fresagem');await p.click('#manSave');await p.waitForTimeout(700);
let T=await tags();console.log('depois',T,await tot());const mt=T.find(t=>/^MAN-/.test(t));
ok(!!mt,'pano manual entra na lista de segmentos ('+mt+')');
const mrow=await p.$eval(`tr[data-tag="${mt}"]`,tr=>({cls:tr.className,txt:tr.textContent,w:tr.querySelector('.rw:not(.re)').value,e:tr.querySelector('.re').value,t:tr.lastElementChild.textContent}));console.log(mrow.t);
ok(/fora do projeto/.test(mrow.txt)&&/\bman\b/.test(mrow.cls)&&mrow.w==='3.5'&&mrow.e==='5','pano manual com destaque, largura e espessura');
const n=v=>parseFloat(v.replace(/\./g,'').replace(',','.'));const dens=await p.evaluate(()=>parseFloat(document.getElementById('cDens').value.replace(',','.')));
ok(Math.abs(n(mrow.t)-200*3.5*0.05*dens)<0.02,`CBUQ do pano manual = 200 × 3,5 × 0,05 × ${dens} = ${mrow.t} t`);
ok(Math.abs(n(await tot())-n(t0)-n(mrow.t))<0.02,'total da programação inclui o pano manual');
// duplicado
await p.click('#cManAdd');await p.selectOption('#manSol','FF');await p.selectOption('#manSent','D');await p.selectOption('#manFx','F1');await p.fill('#manIni','237+500');await p.fill('#manFim','237+300');await p.fill('#manLen','200');await p.fill('#manW','3.5');await p.fill('#manE','5');await p.click('#manSave');await p.waitForTimeout(200);
ok(/Já existe o pano/.test(await p.textContent('#manErr')),'não duplica pano igual');await p.click('#manCancel');
// editar o manual pelo formulário
await p.click(`tr[data-tag="${mt}"] .manEd`);await p.fill('#manLen','150');await p.click('#manSave');await p.waitForTimeout(600);
ok(/150/.test(await p.$eval(`tr[data-tag="${mt}"]`,tr=>tr.cells[7].textContent)),'editar pano manual (comprimento 150 m)');
// 2) observação num pano do projeto
const pt=T.find(t=>!/^MAN-/.test(t));await p.fill(`tr[data-tag="${pt}"] .robs`,'Trinca transversal no início do pano');await p.press(`tr[data-tag="${pt}"] .robs`,'Tab');await p.waitForTimeout(400);
ok(await p.$eval(`tr[data-tag="${pt}"]`,tr=>tr.classList.contains('hasobs')),'observação no pano do projeto');
await p.selectOption('#cOrdem','asc');await p.waitForTimeout(500);await p.selectOption('#cOrdem','desc');await p.waitForTimeout(500);
ok(await p.inputValue(`tr[data-tag="${pt}"] .robs`)==='Trinca transversal no início do pano','observação preservada após reordenar');
// 3) relatório espelho
const tab=await p.$$eval('#cOut table.q tbody tr[data-tag]',a=>a.filter(tr=>!tr.classList.contains('off')&&(tr.querySelector('.re')||tr.classList.contains('exc'))).map(tr=>({tag:tr.dataset.tag,ini:tr.cells[5].textContent.trim(),fim:tr.cells[6].textContent.trim(),len:tr.cells[7].textContent.trim()})));
await p.click('#cRep');await p.waitForTimeout(1200);await p.click('.rtype button[data-rt="simp"]');await p.waitForTimeout(500);
const rep=await p.$$eval('#repDoc table tr',a=>a.map(tr=>[...tr.cells].map(c=>c.textContent.trim())));
const rr=rep.filter(c=>c.length>=10&&/\d+\+\d{3}/.test(c[4]||'')).map(c=>({ini:c[4],fim:c[5],ext:c[9]}));
console.log('tabela',tab.map(x=>x.ini+'→'+x.fim).join(' '),'\nrelat.',rr.map(x=>x.ini+'→'+x.fim).join(' '));
ok(JSON.stringify(tab.map(x=>x.ini+x.fim))===JSON.stringify(rr.map(x=>x.ini+x.fim)),'relatório = mesma relação e ordem da Calculadora (com o pano manual)');
const txt=await p.textContent('#repDoc');
ok(/fora do projeto/.test(txt)&&/Pano extra: remendo profundo/.test(txt)&&/Trinca transversal/.test(txt),'relatório mostra pano fora do projeto e as observações');
await p.screenshot({path:'/tmp/claude-0/off/man_simp.png',fullPage:true});
const ctxDl=await Promise.all([p.waitForEvent('download',{timeout:20000}).catch(()=>null),p.click('#rvPdf')]);ok(ctxDl[0]&&/\.pdf$/.test(ctxDl[0].suggestedFilename()),'PDF simplificado gerado com pano manual e observações');
  await p.click('.rtype button[data-rt="full"]');await p.waitForTimeout(500);const full=await p.textContent('#repDoc');ok(/Fora do projeto/.test(full)&&/Trinca transversal/.test(full),'relatório completo também');
await p.click('#rvClose');await p.waitForTimeout(200);
// excluir
p.once('dialog',d=>d.accept());await p.click(`tr[data-tag="${mt}"] .manDel`);await p.waitForTimeout(500);ok(!(await tags()).includes(mt)&&await tot()===t0,'excluir pano manual volta o total original');
// 4) mapa: pista do seu sentido à direita
for(const [pg,pts,pre] of [['mapa',PTS.p277,''],['mapab4',PTS.pb4,'b4_']]){
  await p.goto('http://localhost:8771/#'+pg);await p.waitForTimeout(2500);
  const st=async()=>p.evaluate(pre=>{const x=document.getElementById(pre+'xs');const lbl=document.getElementById(pre+'xsLbl');return {lbl:lbl.textContent.replace(/\s+/g,' ').trim(),first:x.firstElementChild&&x.firstElementChild.textContent,cells:[...x.querySelectorAll('.cell i')].map(i=>i.textContent).join(',')}},pre);
  await p.click('#'+pre+'gpsBtn').catch(()=>{});await p.waitForTimeout(800);
  for(const q of pts.slice(0,6)){await ctx.setGeolocation({latitude:q[1],longitude:q[2],accuracy:4});await p.waitForTimeout(700)}
  let v=await st();console.log(pg,'crescente',v);ok(/Crescente ▸ seu sentido/.test(v.lbl),pg+': andando no crescente, pista crescente à direita');
  for(const q of pts.slice(0,6).reverse()){await ctx.setGeolocation({latitude:q[1],longitude:q[2],accuracy:4});await p.waitForTimeout(700)}
  v=await st();console.log(pg,'decrescente',v);ok(/^◂ CrescenteDecrescente ▸ seu sentido/.test(v.lbl)&&v.cells==='Acost.,F2/3,F1,F1,F2/3,Acost.'.replace(/F2\/3/g,pre?'F2':'F2/3'),pg+': andando no decrescente, inverte (decrescente à direita)');
  await p.screenshot({path:`/tmp/claude-0/off/xs_${pg}.png`});
  for(let k=0;k<4;k++){await ctx.setGeolocation({latitude:pts[0][1]+(k%2?1e-5:-1e-5),longitude:pts[0][2],accuracy:4});await p.waitForTimeout(500)}
  v=await st();ok(/Decrescente ▸ seu sentido/.test(v.lbl),pg+': parado com GPS oscilando, não inverte')}
ok(errs.length===0,'sem erros JS '+JSON.stringify(errs.slice(0,3)));await b.close()})();

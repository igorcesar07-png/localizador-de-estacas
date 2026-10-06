// Edição de segmentos na Calculadora de programação
const {chromium}=require('playwright');const fs=require('fs');
const out=[];const ok=(c,n)=>{out.push((c?'OK  ':'FALHOU ')+n);console.log((c?'OK  ':'FALHOU ')+n)};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:1280,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
await p.route('**/cdnjs.cloudflare.com/**',r=>{const u=r.request().url();r.fulfill({body:fs.readFileSync(/xlsx/.test(u)?'npmlib/xlsx/package/dist/xlsx.full.min.js':'package/dist/leaflet.js'),contentType:'application/javascript'})});
await p.route(/(jsdelivr|fonts\.g|openstreetmap|arcgisonline)/,r=>{const u=r.request().url();if(/jspdf|autotable/.test(u))return r.continue();r.abort()});
await p.goto('http://localhost:8765/#calculadora');await p.waitForTimeout(1500);
const setCalc=async(a,b,sent)=>{await p.fill('#cKmA',a);await p.fill('#cKmB',b);await p.selectOption('#cSent',sent);await p.click('#cForm button[type=submit]');await p.waitForTimeout(500)};
await setCalc('186+100','186+200','C');
const rowsInfo=async()=>p.$$eval('#cOut table.q tbody tr[data-tag]',a=>a.map(tr=>{const td=[...tr.children].map(x=>x.innerText.trim());return {tag:tr.dataset.tag,td}}));
let R0=await rowsInfo();console.log(R0.slice(0,4).map(r=>r.tag+' | '+r.td.slice(5,13).join(' | ')).join('\n'));
const tag=R0[0].tag;const tot0=await p.textContent('#cOut .kpi.main b');
ok(R0[0].td[5]==='186+100'&&R0[0].td[6]==='186+200'&&R0[0].td[7]==='100,0','pano de 186+100 a 186+200 com 100 m ('+tag+')');
// editar
await p.click(`tr[data-tag="${tag}"] .segEd`);await p.waitForTimeout(200);
ok(await p.locator(`tr[data-tag="${tag}"] .segk`).count()===2,'Editar abre estaca inicial e final na própria linha');
const ini=p.locator(`tr[data-tag="${tag}"] .segk[data-k="ini"]`),fim=p.locator(`tr[data-tag="${tag}"] .segk[data-k="fim"]`),err=p.locator(`tr[data-tag="${tag}"] .segErr`);
// validações
await ini.fill('186+180');await fim.fill('186+120');await p.click(`tr[data-tag="${tag}"] .segSave`);ok(/crescente a estaca inicial deve ser menor/.test(await err.textContent()),'crescente: inicial maior que a final é recusada');
await ini.fill('186+150');await fim.fill('186+150');await p.click(`tr[data-tag="${tag}"] .segSave`);ok(/não pode ser zero/.test(await err.textContent()),'extensão zero é recusada');
await ini.fill('186+1x');await p.click(`tr[data-tag="${tag}"] .segSave`);ok(/Estaca inicial/.test(await err.textContent()),'estaca inválida é recusada: '+(await err.textContent()));
await ini.fill('150+000');await fim.fill('186+180');await p.click(`tr[data-tag="${tag}"] .segSave`);ok((await err.textContent()).length>5,'estaca fora do trecho/pano é recusada: '+(await err.textContent()));
await ini.fill('186+120');await fim.fill('186+400');await p.click(`tr[data-tag="${tag}"] .segSave`);ok(/Fora do pano/.test(await err.textContent()),'estaca além do pano é recusada: '+(await err.textContent()));
// cancelar não altera
await p.click(`tr[data-tag="${tag}"] .segCancel`);await p.waitForTimeout(200);let R1=await rowsInfo();ok(R1[0].td[7]==='100,0'&&await p.locator('.segk').count()===0,'Cancelar mantém 100 m');
// exemplo do pedido
await p.click(`tr[data-tag="${tag}"] .segEd`);await ini.fill('186+120');await fim.fill('186+180');
const prev=await p.textContent(`tr[data-tag="${tag}"] .segprev`);ok(/^60,0/.test(prev),'prévia da extensão: '+prev.replace(/\s+/g,' '));
await p.click(`tr[data-tag="${tag}"] .segSave`);await p.waitForTimeout(400);
R1=await rowsInfo();const r1=R1.find(r=>r.tag===tag);console.log(r1.td.slice(5,13).join(' | '));
ok(r1.td[5]==='186+120'&&r1.td[6]==='186+180'&&r1.td[7]==='60,0','salvo: 186+120 → 186+180 com 60 m');
const w=parseFloat(await p.inputValue(`tr[data-tag="${tag}"] .rw`)),e=parseFloat(r1.td[9].replace(',','.')),area=parseFloat(r1.td[10].replace(/\./g,'').replace(',','.')),vol=parseFloat(r1.td[11].replace(/\./g,'').replace(',','.')),t=parseFloat(r1.td[12].replace(/\./g,'').replace(',','.'));
ok(Math.abs(area-60*w)<0.06&&Math.abs(vol-area*e/100)<0.01&&Math.abs(t-vol*2.528)<0.02,`área ${area} = 60 × ${w}; volume ${vol}; CBUQ ${t} t (largura e espessura mantidas)`);
const tot1=await p.textContent('#cOut .kpi.main b');ok(tot1!==tot0,'total de CBUQ atualizado: '+tot0+' → '+tot1);
console.log('td0',JSON.stringify(r1.td[0]));ok(/editado/i.test(r1.td[0]),'pano marcado como editado, com os limites originais do pano');
ok(/60,0 m \(antes 100,0 m\)/.test(await p.textContent('#cOut .alert.ok')),'mensagem de confirmação');
// decrescente
await setCalc('186+100','186+200','D');let RD=await rowsInfo();const tD=RD[0].tag;console.log('D:',RD[0].td.slice(5,8).join(' | '));
await p.click(`tr[data-tag="${tD}"] .segEd`);const iD=p.locator(`tr[data-tag="${tD}"] .segk[data-k="ini"]`),fD=p.locator(`tr[data-tag="${tD}"] .segk[data-k="fim"]`);
await iD.fill('186+120');await fD.fill('186+180');await p.click(`tr[data-tag="${tD}"] .segSave`);ok(/decrescente a estaca inicial deve ser maior/.test(await p.textContent(`tr[data-tag="${tD}"] .segErr`)),'decrescente: inicial menor que a final é recusada');
await iD.fill('186+180');await fD.fill('186+130');await p.click(`tr[data-tag="${tD}"] .segSave`);await p.waitForTimeout(300);
RD=await rowsInfo();const d1=RD.find(r=>r.tag===tD);ok(d1.td[5]==='186+180'&&d1.td[6]==='186+130'&&d1.td[7]==='50,0','decrescente salvo: 186+180 → 186+130 com 50 m');
// emitir relatório e conferir a programação registrada; depois editar e conferir a atualização
await setCalc('186+100','186+200','C');

const fill=async(id,v)=>{const el=p.locator('#'+id);const tg=await el.evaluate(e=>e.tagName);if(tg==='SELECT'){const o=await el.evaluate(e=>[...e.options].map(o=>o.value).filter(Boolean));await el.selectOption(o[0])}else await el.fill(v)};
for(const [id,v] of [['rfData','2026-10-07'],['rfObra','Restauração BR-277'],['rfEquipe','Equipe teste'],['rfUPrep','05:00'],['rfUIni','06:00'],['rfSCafe','06:00'],['rfSDds','06:30'],['rfSSai','07:00'],['rfECafe','06:00'],['rfEDds','06:30'],['rfESai','07:00'],['rfTempo',''],['rfTempoMsg','ok']])await fill(id,v);
await p.click('#cRep');await p.waitForTimeout(1200);
ok(!(await p.isHidden('#repView')),'relatório emitido');
const repTxt=await p.textContent('#repDoc');ok(/186\+120/.test(repTxt)&&/186\+180/.test(repTxt),'relatório usa o segmento editado (186+120 a 186+180)');
console.log('progs',await p.evaluate(()=>localStorage.getItem('br277.execProgs')));console.log('w',await p.inputValue(`tr[data-tag="${tag}"] .rw`).catch(()=>'?'));const it1=await p.evaluate(t=>JSON.parse(localStorage.getItem('br277.execProgs')).find(x=>x.data==='2026-10-07').items.find(i=>i.tag===t),tag);
ok(it1&&it1.b-it1.a===60,'programação registrada em Relatórios com 60 m');
await p.click('#rvClose');
await p.click(`tr[data-tag="${tag}"] .segEd`);await ini.fill('186+140');await fim.fill('186+180');await p.click(`tr[data-tag="${tag}"] .segSave`);await p.waitForTimeout(500);
const it2=await p.evaluate(t=>JSON.parse(localStorage.getItem('br277.execProgs')).find(x=>x.data==='2026-10-07').items.find(i=>i.tag===t),tag);
ok(it2&&it2.b-it2.a===40,'edição depois de emitir atualiza a programação registrada (40 m)');
ok(/atualizada/.test(await p.textContent('#cOut .alert.ok')),'aviso de programação atualizada');
// persistência e restaurar
await p.reload();await p.waitForTimeout(1500);R1=await rowsInfo();ok(R1.find(r=>r.tag===tag).td[7]==='40,0','edição continua salva depois de recarregar');
await p.screenshot({path:'seg1.png',fullPage:false});
await p.click(`tr[data-tag="${tag}"] .segEd`);await p.waitForTimeout(200);await p.screenshot({path:'seg2.png'});
await p.click(`tr[data-tag="${tag}"] .segOrig`);await p.waitForTimeout(300);R1=await rowsInfo();ok(R1.find(r=>r.tag===tag).td[7]==='100,0','Original restaura 100 m');
// projeto preservado: mapa/relatórios continuam com o pano original
await p.goto('http://localhost:8765/#relatorios');await p.waitForTimeout(1200);
ok(errs.length===0,'sem erros de JavaScript '+JSON.stringify(errs.slice(0,3)));
fs.writeFileSync('tseg-report.txt',out.join('\n'));await b.close()})();

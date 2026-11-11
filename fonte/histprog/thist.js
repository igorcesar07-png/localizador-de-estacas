const {chromium}=require('/home/claude/localizador-de-estacas/firebase/node_modules/playwright');
const res=[];const ok=(c,n)=>{res.push(c);console.log((c?'OK  ':'FALHOU ')+n)};const W=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:1280,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/(openstreetmap|arcgisonline)/,r=>r.abort());let dlg=[];p.on('dialog',d=>{dlg.push(d.message());d.accept()});
const prog=async(o)=>{await p.selectOption('#rfObra',o.obra);await W(400);await p.selectOption('#rfEquipe',o.eq);await W(300);
  await p.fill('#rfData',o.data);await p.dispatchEvent('#rfData','change');
  for(const [i,v] of Object.entries(o.h)){await p.fill('#'+i,v);await p.press('#'+i,'Tab')}await p.selectOption('#rfTempo',o.tempo);
  if(o.usi){await p.check(`input[name=rfUsiDr][value=${o.usi}]`);}
  await p.fill('#cKmA',o.a);await p.fill('#cKmB',o.b);await p.selectOption('#cPista','ALL');await p.selectOption('#cSent',o.sent);await p.click('#cForm button[type=submit]');await W(900)};
const rowsOf=()=>p.$$eval('#cOut table.q tbody tr[data-tag]',a=>a.map(tr=>[tr.dataset.tag,tr.classList.contains('off')?'off':'',(tr.querySelector('.re')||{}).value||'',(tr.querySelector('.robs')||{}).value||'',tr.cells[5]&&tr.cells[5].textContent.trim(),tr.cells[6]&&tr.cells[6].textContent.trim()].join('|')));
const repTxt=()=>p.$eval('#repDoc',e=>e.innerText.replace(/Emitido em[^\n]*/g,'').replace(/\s+/g,' '));
await p.goto('http://localhost:8771/#calculadora');await W(2500);await p.evaluate(()=>{localStorage.removeItem('br277.histProgs')});
// 1) programação do Johonatan, com edições
await prog({obra:'Restauração BR-277 – Blocos 02 e 03',eq:'Pavimentação Johonatan',data:'2026-11-10',h:{rfSCafe:'04:45',rfSDds:'05:15',rfSSai:'05:30',rfECafe:'05:00',rfEDds:'05:30',rfESai:'05:45'},tempo:'Nublado',a:'238+000',b:'236+600',sent:'ALL'});
const tags=await p.$$eval('#cOut table.q tbody tr[data-tag]',a=>a.filter(t=>t.querySelector('.re')).map(t=>t.dataset.tag));
await p.fill(`tr[data-tag="${tags[1]}"] .re`,'4');await p.press(`tr[data-tag="${tags[1]}"] .re`,'Tab');await W(300);
await p.fill(`tr[data-tag="${tags[0]}"] .robs`,'Bueiro rompido no bordo');await p.press(`tr[data-tag="${tags[0]}"] .robs`,'Tab');await W(300);
await p.uncheck(`tr[data-tag="${tags[2]}"] .rprog`);await W(400);
const R1=await rowsOf();
await p.click('#cRep');await W(1200);ok(await p.isVisible('#rvHist')&&await p.textContent('#rvHist')==='Salvar no histórico','relatório: botão "Salvar no histórico"');
const T1=await repTxt();await p.click('#rvHist');await W(500);console.log(await p.textContent('#rvMsg'));
let H=await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('br277.histProgs')||'{}')));ok(H.length===1&&H[0].sum.equipe==='Pavimentação Johonatan'&&H[0].sum.encarregado==='Johonatan'&&H[0].data.rows.length>3,'programação gravada (resumo + dados completos)');
await p.click('#rvHist');await W(500);H=await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('br277.histProgs')||'{}')));ok(H.length===1&&H[0].sum.revisao===2&&/atualizada/.test(await p.textContent('#rvMsg')),'clicar de novo atualiza o mesmo registro (sem duplicar)');
await p.click('#rvClose');
// 2) dreno na mesma data (outra equipe)
await prog({obra:'Restauração BR-277 – Blocos 02 e 03',eq:'Dreno Sandro',data:'2026-11-10',h:{rfSCafe:'06:00',rfSDds:'06:15',rfSSai:'06:30',rfECafe:'06:00',rfEDds:'06:15',rfESai:'06:30'},tempo:'Ensolarado',usi:'N',a:'200+000',b:'215+000',sent:'ALL'});
await p.click('#cRep');await W(1200);await p.click('#rvHist');await W(500);await p.click('#rvClose');
// 3) trabalho em andamento (outra obra) que deve voltar ao fechar
await prog({obra:'Restauração BR-373 – Bloco 04',eq:'Pavimentação Raimundo',data:'2026-11-12',h:{rfSCafe:'04:30',rfSDds:'05:00',rfSSai:'05:30',rfECafe:'04:30',rfEDds:'05:00',rfESai:'05:30'},tempo:'Nublado',a:'228+740',b:'230+600',sent:'C'});
const WIP=await rowsOf();const WIPf={obra:await p.inputValue('#rfObra'),eq:await p.inputValue('#rfEquipe'),data:await p.inputValue('#rfData'),a:await p.inputValue('#cKmA')};
// 4) histórico
await p.evaluate(()=>location.hash='#histprog');await W(800);
ok(await p.isVisible('#pHist')&&(await p.$$('.hpcard[data-id]')).length===2,'Histórico lista as 2 programações');
const day=await p.textContent('#hpList .hpdh');ok(/10\/11\/2026/.test(day)&&/2 programações/.test(day),'agrupadas pela data: '+day.trim());

const row=await p.$eval('.hpcard[data-id]:has-text("Johonatan")',tr=>tr.innerText.replace(/\s+/g,' '));console.log(row);
ok(/PAVIMENTAÇÃO JOHONATAN/i.test(row)&&/BR-277 \| B2\/B3/.test(row)&&/Km 238\+000 ao Km 236\+600/.test(row)&&/toneladas de CBUQ/.test(row)&&!/Programado|Respons|Atualizad|Validada|crescente|rev\./i.test(row),'card só com equipe, trecho e serviços (t de CBUQ)');
ok(await p.$('#hpResp')===null,'filtro "Responsável" removido');
await p.selectOption('#hpEq','Dreno Sandro');ok((await p.$$('.hpcard[data-id]')).length===1,'filtro por equipe');await p.selectOption('#hpEq','ALL');

await p.fill('#hpQ','bueiro');await W(200);ok((await p.$$('.hpcard[data-id]')).length===1,'pesquisa por palavra-chave (observação do pano)');await p.fill('#hpQ','');await p.dispatchEvent('#hpQ','input');
await p.fill('#hpDe','2026-11-11');await p.dispatchEvent('#hpDe','change');ok((await p.$$('.hpcard[data-id]')).length===0,'filtro por período');await p.click('#hpClr');await W(200);
await p.screenshot({path:'/tmp/claude-0/off/hist_lista.png'});
// 5) abrir
const idJ=H[0].sum.id;await p.click(`#hpList button[data-open="${idJ}"]`);await p.waitForLoadState();await W(3000);
ok(location=await p.evaluate(()=>location.hash)==='#calculadora'&&await p.isVisible('#histBar'),'abre na Calculadora com o aviso "Programação do histórico"');
ok(await p.inputValue('#rfEquipe')==='Pavimentação Johonatan'&&await p.inputValue('#rfData')==='2026-11-10'&&await p.inputValue('#cKmA')==='238+000'&&await p.inputValue('#rfSCafe')==='04:45','obra, equipe, data, trecho e horários da programação salva');
const R2=await rowsOf();ok(JSON.stringify(R2)===JSON.stringify(R1),'relação de segmentos igual à salva (espessura alterada, observação, desmarcado)');
await p.screenshot({path:'/tmp/claude-0/off/hist_aberta.png'});
await p.click('#hbRep');await W(1200);const T2=await repTxt();ok(T1===T2,'relatório emitido de novo idêntico ao original');
if(T1!==T2){for(let i=0;i<T1.length;i++)if(T1[i]!==T2[i]){console.log('dif:',T1.slice(i-60,i+80),'\n   :',T2.slice(i-60,i+80));break}}
ok(await p.textContent('#rvHist')==='Salvar alterações no histórico','no relatório: "Salvar alterações no histórico"');await p.click('#rvClose');
// 6) editar e salvar
await p.fill(`tr[data-tag="${tags[0]}"] .robs`,'Bueiro rompido no bordo — refazer antes');await p.press(`tr[data-tag="${tags[0]}"] .robs`,'Tab');await W(300);
await p.click('#hbSave');await W(1200);console.log(await p.textContent('#rvMsg'));
H=await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('br277.histProgs')||'{}')));const hj=H.find(x=>x.sum.id===idJ);
ok(H.length===2&&hj.sum.revisao===3&&hj.sum.status==='ATUALIZADA'&&hj.data.rows.some(r=>/refazer antes/.test(r.obs)),'editar e salvar atualiza o mesmo registro (revisão 3), sem criar outro');
const hd=H.find(x=>x.sum.equipe==='Dreno Sandro');ok(hd.sum.revisao===1,'a outra programação não muda');
await p.click('#rvClose');
// 7) fechar e voltar ao trabalho em andamento
dlg=[];await p.click('#hbClose');await p.waitForLoadState();await W(3000);
ok(!(await p.isVisible('#histBar'))&&await p.inputValue('#rfObra')===WIPf.obra&&await p.inputValue('#rfEquipe')===WIPf.eq&&await p.inputValue('#rfData')===WIPf.data&&await p.inputValue('#cKmA')===WIPf.a,'fechar volta à programação em andamento');
ok(JSON.stringify(await rowsOf())===JSON.stringify(WIP),'segmentos da programação em andamento intactos');
// 8) emitir relatório direto do histórico
await p.evaluate(()=>location.hash='#histprog');await W(800);await p.click(`#hpList button[data-rep="${idJ}"]`);await p.waitForLoadState();await W(3500);
ok(!(await p.isHidden('#repView'))&&/refazer antes/.test(await repTxt()),'"Relatório" no histórico abre o relatório da programação salva');
await p.click('#rvClose');dlg=[];await p.click('#hbClose');await p.waitForLoadState();await W(2500);
// 9) mesma data e equipe sem abrir pelo histórico: pergunta e substitui
await prog({obra:'Restauração BR-277 – Blocos 02 e 03',eq:'Pavimentação Johonatan',data:'2026-11-10',h:{rfSCafe:'04:45',rfSDds:'05:15',rfSSai:'05:30',rfECafe:'05:00',rfEDds:'05:30',rfESai:'05:45'},tempo:'Nublado',a:'238+000',b:'236+600',sent:'ALL'});
await p.click('#cRep');await W(1200);dlg=[];await p.click('#rvHist');await W(600);
H=await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('br277.histProgs')||'{}')));ok(dlg.some(m=>/Já existe programação salva/.test(m))&&H.length===2&&H.find(x=>x.sum.id===idJ).sum.revisao===4,'mesma data e equipe: confirma e substitui o registro existente');
await p.click('#rvClose');
// 10) excluir
await p.evaluate(()=>location.hash='#histprog');await W(800);dlg=[];const idD=hd.sum.id;await p.click(`#hpList button[data-del="${idD}"]`);await W(600);
ok(dlg.some(m=>/Excluir do histórico/.test(m))&&(await p.$$('.hpcard[data-id]')).length===1,'excluir pede confirmação e tira da lista');
await p.check('#hpExc');await W(200);ok(/Excluída/.test(await p.textContent('#hpList')),'"Mostrar excluídas" mostra a excluída');
await p.setViewportSize({width:393,height:852});await p.uncheck('#hpExc');await W(300);await p.screenshot({path:'/tmp/claude-0/off/hist_celular.png',fullPage:true});
ok(errs.length===0,'sem erros JS '+JSON.stringify(errs.slice(0,3)));console.log(`\n${res.filter(x=>x).length}/${res.length}`);await b.close()})();

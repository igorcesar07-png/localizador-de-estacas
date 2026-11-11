const {chromium}=require('/home/claude/localizador-de-estacas/firebase/node_modules/playwright');
const res=[];const ok=(c,n)=>{res.push(c);console.log((c?'OK  ':'FALHOU ')+n)};const W=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:1280,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/(openstreetmap|arcgisonline)/,r=>r.abort());let dlg=[];p.on('dialog',d=>{dlg.push(d.message());d.accept()});
const prog=async(o)=>{if(o.obra){await p.selectOption('#rfObra',o.obra);await W(400)}await p.selectOption('#rfEquipe',o.eq);await W(300);
  if(o.data){await p.fill('#rfData',o.data);await p.dispatchEvent('#rfData','change')}
  for(const [i,v] of Object.entries(o.h||{})){await p.fill('#'+i,v);await p.press('#'+i,'Tab')}if(o.tempo)await p.selectOption('#rfTempo',o.tempo);
  if(o.usi)await p.check(`input[name=rfUsiDr][value=${o.usi}]`);
  if(o.a){await p.fill('#cKmA',o.a);await p.fill('#cKmB',o.b);await p.selectOption('#cSent','ALL')}await p.click('#cForm button[type=submit]');await W(900)};
const HL=()=>p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('br277.histProgs')||'{}')).map(x=>x.sum).filter(s=>!s.excluido).map(s=>s.data+' '+s.equipe+' r'+s.revisao).sort());
const H6={rfSCafe:'04:45',rfSDds:'05:15',rfSSai:'05:30',rfECafe:'05:00',rfEDds:'05:30',rfESai:'05:45'};
await p.goto('http://localhost:8771/#calculadora');await W(2500);await p.evaluate(()=>{localStorage.removeItem('br277.histProgs');localStorage.removeItem('br277.histMode');localStorage.removeItem('br277.histDraft')});await p.reload();await W(2500);
// equipe A salva
await prog({obra:'Restauração BR-277 – Blocos 02 e 03',eq:'Pavimentação Johonatan',data:'2026-11-11',h:H6,tempo:'Nublado',a:'238+000',b:'236+600'});
await p.click('#cRep');await W(1200);await p.click('#rvHist');await W(500);await p.click('#rvClose');
// equipe B direto (sem histórico aberto)
await prog({eq:'Pavimentação Raimundo',h:H6});await p.click('#cRep');await W(1200);await p.click('#rvHist');await W(500);await p.click('#rvClose');
console.log(await HL());ok((await HL()).length===2,'sem histórico aberto: A e B ficam separadas');
// abre A pelo histórico (aviso azul) e troca para a equipe de dreno, mesma data
await p.evaluate(()=>location.hash='#histprog');await W(800);const idA=await p.$eval('.hpcard[data-id]:has-text("Johonatan")',tr=>tr.dataset.id);
await p.click(`#hpList button[data-open="${idA}"]`);await p.waitForLoadState();await W(3000);ok(await p.isVisible('#histBar'),'programação A aberta pelo histórico');
await prog({eq:'Dreno Sandro',h:{rfSCafe:'06:00',rfSDds:'06:15',rfSSai:'06:30',rfECafe:'06:00',rfEDds:'06:15',rfESai:'06:30'},usi:'N',a:'200+000',b:'215+000'});
await p.click('#hbSave');await W(1500);console.log('msg:',await p.textContent('#rvMsg'));await p.click('#rvClose').catch(()=>{});
const L=await HL();console.log(L);ok(L.length===3&&L.some(x=>/Johonatan r1/.test(x))&&L.some(x=>/Dreno Sandro/.test(x)),'com o histórico aberto, salvar outra equipe cria outra programação e mantém a original');
// salvar de novo a de dreno atualiza ela (não volta para A)
await p.click('#hbSave');await W(1500);await p.click('#rvClose').catch(()=>{});const L2=await HL();console.log(L2);ok(L2.length===3&&L2.some(x=>/Dreno Sandro r2/.test(x))&&L2.some(x=>/Johonatan r1/.test(x)),'salvar de novo atualiza a nova (Dreno), A intacta');
ok(errs.length===0,'sem erros JS '+JSON.stringify(errs.slice(0,3)));console.log(`\n${res.filter(x=>x).length}/${res.length}`);await b.close()})();

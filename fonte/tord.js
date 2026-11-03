const {chromium}=require('/home/claude/localizador-de-estacas/firebase/node_modules/playwright');
const ok=(c,n)=>console.log((c?'OK  ':'FALHOU ')+n);
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await b.newPage({viewport:{width:1280,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/(openstreetmap|arcgisonline)/,r=>r.abort());
await p.goto('http://localhost:8771/#calculadora');await p.waitForTimeout(2500);
await p.selectOption('#rfObra','Restauração BR-277 – Blocos 02 e 03');await p.selectOption('#rfEquipe','Pavimentação Johonatan');
for(const i of ['rfSCafe','rfSDds','rfSSai','rfECafe','rfEDds','rfESai']){await p.fill('#'+i,'06:00');await p.press('#'+i,'Tab')}await p.selectOption('#rfTempo','Ensolarado');
const n=v=>{const [k,m]=v.split('+');return +k*1000+ +m};
for(const [sent,ordem] of [['D','asc'],['D','desc'],['D','auto'],['ALL','asc']]){
  await p.fill('#cKmA','236+000');await p.fill('#cKmB','238+000');await p.selectOption('#cPista','ALL');await p.selectOption('#cSent',sent);await p.click('#cForm button[type=submit]');await p.waitForTimeout(700);
  await p.selectOption('#cOrdem',ordem);await p.waitForTimeout(500);
  const tab=await p.$$eval('#cOut table.q tbody tr[data-tag]',a=>a.filter(tr=>tr.querySelector('.re')||tr.querySelector('.rw')).map(tr=>({s:tr.querySelector('.l')?tr.cells[2].textContent:'',ini:tr.cells[5].textContent.trim()})));
  await p.click('#cRep');await p.waitForTimeout(1200);await p.click('.rtype button[data-rt="simp"]');await p.waitForTimeout(500);
  const rep=await p.$$eval('#repDoc table tr:not(.b)',a=>a.map(tr=>[...tr.cells].map(c=>c.textContent.trim())).filter(c=>c.length>5&&/\d+\+\d{3}/.test(c[4]||'')).map(c=>({p:c[1],ini:c[4]})));
  const note=await p.textContent('#repDoc');
  const tIni=tab.map(r=>r.ini),rIni=rep.map(r=>r.ini);
  console.log(sent,ordem,'tabela:',tIni.slice(0,6).join(' '),'| relatório:',rIni.slice(0,6).join(' '));
  if(sent==='D')ok(JSON.stringify(tIni)===JSON.stringify(rIni),`decrescente · ${ordem}: relatório na mesma ordem da tabela (${rIni.length} panos)`);
  else{const C=rep.filter(r=>/^C/.test(r.p)).map(r=>n(r.ini)),Dd=rep.filter(r=>/^D/.test(r.p)).map(r=>n(r.ini));ok(C.every((v,i)=>!i||v>=C[i-1])&&Dd.every((v,i)=>!i||v>=Dd[i-1]),'ambos os sentidos · menor→maior: cada pista em ordem crescente de estaca inicial')}
  if(ordem!=='auto')ok(/ordem escolhida na Calculadora/.test(note),'nota do relatório cita a ordem escolhida');
  await p.click('#rvClose');await p.waitForTimeout(300)}
ok(errs.length===0,'sem erros JS '+JSON.stringify(errs.slice(0,2)));await b.close()})();

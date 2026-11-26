const {chromium}=require('/home/claude/localizador-de-estacas/firebase/node_modules/playwright');const W=ms=>new Promise(r=>setTimeout(r,ms));
const out=[];const ok=(c,n)=>{out.push(c);console.log((c?'OK  ':'FALHOU ')+n)};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await (await b.newContext({viewport:{width:1280,height:900}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
await p.route(/(openstreetmap|arcgisonline|fonts\.g)/,r=>r.abort());
await p.goto('http://localhost:8772/#calculadora');await W(2000);
await p.click('#cRep').catch(()=>{});await W(300);await p.selectOption('#rfObra','Restauração BR-373 – Bloco 04').catch(e=>console.log('obra',e.message));await W(500);await p.keyboard.press('Escape');
await p.setInputFiles('#cSerFile',process.env.SERJSON||'/mnt/user-data/outputs/apontamentos_B4_seriais.json');await p.waitForSelector('#cSerMsg .sermsg b',{timeout:30000,state:'attached'});await W(600);
const msg=await p.textContent('#cSerMsg');console.log(msg.replace(/\s+/g,' ').slice(0,700));
const n=await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('br277.seriais')||localStorage.getItem('seriais')||'null');return s&&s.b4?s.b4.recs.length:-1});
ok(n===1826,'registros da BR-373 importados: '+n);
let tot=0,auto=0;const miss=[];
for(const [a,bb,pi,se] of [['183+400','200+000','F1','C'],['183+400','200+000','F1','D'],['183+400','200+000','AC','C'],['250+000','282+480','F1','D']]){
  await p.fill('#cKmA',a);await p.fill('#cKmB',bb);await p.selectOption('#cPista',pi).catch(()=>{});await p.selectOption('#cSent',se).catch(()=>{});await p.click('#cForm button[type=submit]');await W(1200);
  const rows=await p.$$eval('#cOut table.q tbody tr[data-tag]',a=>a.map(tr=>({tag:tr.dataset.tag,ser:(tr.querySelector('.rser')||{}).value,st:(tr.querySelector('.rser')||{className:''}).className})));
  tot+=rows.length;const au=rows.filter(r=>/auto/.test(r.st));auto+=au.length;rows.filter(r=>!/auto/.test(r.st)).slice(0,3).forEach(r=>miss.push(r.tag+':'+r.st))}
console.log('panos',tot,'auto',auto,miss);ok(tot>0&&auto>=tot*0.95,'seriais automáticos nos panos do Bloco 04 ('+auto+' de '+tot+')');
ok(!errs.length,'sem erros JS '+JSON.stringify(errs.slice(0,2)));console.log(out.filter(Boolean).length+'/'+out.length);await b.close()})();

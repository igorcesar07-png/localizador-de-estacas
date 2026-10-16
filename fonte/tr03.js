const {chromium}=require('/home/claude/work/node_modules/playwright');const fs=require('fs');const {execSync}=require('child_process');process.chdir('/home/claude/work');
const out=[];const ok=(c,n)=>{out.push((c?'OK  ':'FALHOU ')+n);console.log((c?'OK  ':'FALHOU ')+n)};
const build=f=>{fs.copyFileSync(f,'b4/data_b4.json');execSync('python3 build.py',{stdio:'ignore'})};
(async()=>{build('b4/data_b4_r00.json');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const ctx=await b.newContext({viewport:{width:1280,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('**/cdnjs.cloudflare.com/**',r=>r.fulfill({body:fs.readFileSync('package/dist/leaflet.js'),contentType:'application/javascript'}));await p.route(/(jsdelivr|fonts\.g|openstreetmap|arcgisonline)/,r=>r.abort());
await p.goto('http://localhost:8765/#calculadora');await p.waitForTimeout(1500);
await p.selectOption('#rfObra','Restauração BR-373 – Bloco 04');await p.waitForTimeout(400);await p.selectOption('#rfEquipe','Pavimentação Johonatan');await p.waitForTimeout(300);
await p.fill('#cKmA','224+000');await p.fill('#cKmB','226+000');await p.selectOption('#cPista','ALL');await p.selectOption('#cSent','C');await p.click('#cForm button[type=submit]');await p.waitForTimeout(700);
const tags0=await p.$$eval('#cOut tr[data-tag]',a=>a.map(t=>t.dataset.tag));console.log(tags0.slice(0,12).join(' '));
const TT=JSON.parse(fs.readFileSync('/tmp/claude-0/r03/tags.json'));const AFF=new Set(TT.chg.concat(TT.gone));const A='225-F1-C-01',K=tags0.find(t=>!AFF.has(t));console.log('controle',K);
for(const [t,v] of [[A,'KART-A'],[K,'KART-K']]){await p.fill(`tr[data-tag="${t}"] .rser`,v);await p.press(`tr[data-tag="${t}"] .rser`,'Tab');await p.waitForTimeout(400)}
ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('br277.calc')).bySrc.B4.serial['225-F1-C-01'])==='KART-A','R00: Serial Kartado digitado no 225-F1-C-01 e no '+K);
// troca para a base R03
build('/tmp/claude-0/r03/base-BR373-B4.json');await p.reload();await p.waitForTimeout(1800);
await p.click('#cForm button[type=submit]');await p.waitForTimeout(700);
const st=await p.evaluate(()=>JSON.parse(localStorage.getItem('br277.calc')).bySrc.B4);
ok(!st.serial['225-F1-C-01']&&st.serial[process.argv?'x':'x']===undefined&&st.orphans&&st.orphans.some(o=>o.tag==='225-F1-C-01'&&o.valor==='KART-A'),'R03: serial do segmento que mudou foi retirado e guardado à parte');
ok(st.serial[K]==='KART-K','segmento que não mudou mantém o serial ('+K+': '+st.serial[K]+')');
const note=await p.textContent('#revNote').catch(()=>'');console.log(note);ok(/R03 REV1/.test(note)&&/225-F1-C-01/.test(note)&&/KART-A/.test(note),'aviso mostra o dado retirado');
await p.screenshot({path:'/tmp/claude-0/r03/aviso.png'});
await p.click('#revAck');await p.waitForTimeout(300);await p.reload();await p.waitForTimeout(1500);await p.click('#cForm button[type=submit]');await p.waitForTimeout(600);
ok(await p.locator('#revNote').count()===0,'"Entendi" esconde o aviso');
// novo serial digitado já na R03 não é apagado em recargas
await p.fill(`tr[data-tag="225-F1-C-01"] .rser`,'KART-NOVO');await p.press(`tr[data-tag="225-F1-C-01"] .rser`,'Tab');await p.waitForTimeout(400);await p.reload();await p.waitForTimeout(1500);
ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('br277.calc')).bySrc.B4.serial['225-F1-C-01'])==='KART-NOVO','serial digitado na R03 continua depois de recarregar');
// calculadora: km 227 na R03
await p.click('#cForm button[type=submit]');await p.waitForTimeout(500);
ok(errs.length===0,'sem erros JS '+JSON.stringify(errs.slice(0,3)));fs.writeFileSync('/tmp/claude-0/r03/tr03.txt',out.join('\n'));await b.close()})();

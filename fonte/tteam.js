const {chromium}=require('/home/claude/work/node_modules/playwright');const fs=require('fs');process.chdir('/home/claude/work');
const LIB={'jspdf.umd.min.js':'npmlib/jspdf-2.5.1/package/dist/jspdf.umd.min.js','jspdf.plugin.autotable.min.js':'npmlib/jspdf-autotable-3.8.2/package/dist/jspdf.plugin.autotable.min.js'};
const out=[];const ok=(c,n)=>{out.push((c?'OK  ':'FALHOU ')+n);console.log((c?'OK  ':'FALHOU ')+n)};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const ctx=await b.newContext({viewport:{width:1280,height:900}});
// servidor simulado: guarda o callback e as gravações
await ctx.addInitScript(()=>{window.__srv={saves:[],cb:null};window.EquipeHorasDB={subscribe(cb){window.__srv.cb=cb;cb([]);return ()=>{}},save(eq,h,at){window.__srv.saves.push({eq,h,at});return Promise.resolve()}}});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('**/cdnjs.cloudflare.com/**',r=>{const f=r.request().url().split('/').pop();r.fulfill({body:fs.readFileSync(LIB[f]||'package/dist/leaflet.js'),contentType:'application/javascript'})});await p.route(/(jsdelivr|fonts\.g|openstreetmap|arcgisonline)/,r=>r.abort());
await p.goto('http://localhost:8765/#calculadora');await p.waitForTimeout(1500);
const T=['rfSCafe','rfSDds','rfSSai','rfECafe','rfEDds','rfESai'],U=['rfUPrep','rfUIni'];
const get=ids=>p.evaluate(ids=>ids.map(i=>document.getElementById(i).value).join(' '),ids);
const fillT=async vals=>{for(let i=0;i<T.length;i++){await p.fill('#'+T[i],vals[i]);await p.press('#'+T[i],'Tab')}};
const team=async eq=>{await p.selectOption('#rfEquipe',eq);await p.waitForTimeout(400)};
await p.selectOption('#rfObra','Restauração BR-277 – Blocos 02 e 03');
await p.fill('#rfData','2026-10-19');await p.dispatchEvent('#rfData','change');await p.selectOption('#rfTempo','Ensolarado');
const emit=async()=>{await p.fill('#cKmA','186+000');await p.fill('#cKmB','186+400');await p.selectOption('#cPista','ALL');await p.selectOption('#cSent','ALL');await p.click('#cRep');await p.waitForTimeout(1200);const v=!(await p.isHidden('#repView'));if(v)await p.click('#rvClose');await p.waitForTimeout(300);return v};
// equipe A sem histórico → vazio
await team('Pavimentação Johonatan');ok((await get(T)).trim()==='','equipe sem histórico: horários de sinalização e equipe vazios');
await p.fill('#rfUPrep','03:45');await p.press('#rfUPrep','Tab');const usi0=await get(U);
await fillT(['06:30','06:45','07:00','06:30','06:45','07:00']);ok(await emit(),'equipe A (Johonatan) emitida com 07:00 de saída');
await team('Pavimentação Raimundo');ok((await get(T)).trim()==='','equipe B sem histórico: vazio');ok(await get(U)===usi0,'usinagem não mudou ao trocar de equipe ('+usi0+')');
await fillT(['05:00','05:15','05:30','05:00','05:15','05:45']);ok(await emit(),'equipe B (Raimundo) emitida');
// 1) A → B
await team('Pavimentação Johonatan');ok(await get(T)==='06:30 06:45 07:00 06:30 06:45 07:00','voltar para A mostra o horário de A');
await p.fill('#rfESai','09:00');await p.press('#rfESai','Tab');// edição não salva
await team('Pavimentação Raimundo');ok(await get(T)==='05:00 05:15 05:30 05:00 05:15 05:45','trocar para B substitui o que estava editado pelo horário de B');ok(await get(U)===usi0,'usinagem continua a mesma');
await team('Pavimentação Johonatan');ok(await get(T)==='06:30 06:45 07:00 06:30 06:45 07:00','2) voltar para A: horário de A (a edição não salva foi descartada)');
// 3) editar B para 06:30 e salvar
await team('Pavimentação Raimundo');await p.fill('#rfESai','06:30');await p.press('#rfESai','Tab');await p.click('#cHor [data-k="rfECafe"][data-hstep="15"]');ok(await emit(),'B emitida com saída 06:30');
await p.reload();await p.waitForTimeout(1500);await team('Pavimentação Johonatan');await team('Pavimentação Raimundo');
ok(await get(T)==='05:00 05:15 05:30 05:15 05:15 06:30','3) próximo apontamento de B já abre com 06:30 (e o +15 min salvo)');
ok(await p.evaluate(()=>window.__srv.saves.filter(s=>s.eq==='Pavimentação Raimundo').length)>=1,'registro enviado ao servidor');
// 4) equipe sem histórico
await team('Reciclagem Leandro');ok((await get(T)).trim()==='','4) equipe sem histórico: vazios');ok(await get(U)===usi0,'usinagem não muda');
await p.click('#cHor [data-k="rfSCafe"][data-hstep="15"]');ok(await p.inputValue('#rfSCafe')==='','+15 min num campo vazio não inventa horário');
console.log(await p.textContent('#rfHrHint'));
// 5) sem internet
await ctx.setOffline(true);
await team('Pavimentação Johonatan');ok(await get(T)==='06:30 06:45 07:00 06:30 06:45 07:00','5) offline: A');await team('Pavimentação Raimundo');ok(await get(T)==='05:00 05:15 05:30 05:15 05:15 06:30','5) offline: B');
await p.fill('#rfESai','06:00');await p.press('#rfESai','Tab');ok(await emit(),'5) offline: emitir B');await team('Reciclagem Leandro');await team('Pavimentação Raimundo');ok(await p.inputValue('#rfESai')==='06:00','5) offline: novo padrão de B salvo no aparelho');
await team('Dreno Sandro');ok((await get(T)).trim()==='','5) offline: equipe sem histórico vazia');
await ctx.setOffline(false);
// sincronização: servidor mais novo para A; aparelho mais novo para B
await p.evaluate(()=>window.__srv.cb([{equipe:'Pavimentação Johonatan',h:{sCafe:'07:00',sDds:'07:15',sSai:'07:30',eCafe:'07:00',eDds:'07:15',eSai:'17:00'},at:Date.now()+60000},{equipe:'Pavimentação Raimundo',h:{sCafe:'01:00',sDds:'01:00',sSai:'01:00',eCafe:'01:00',eDds:'01:00',eSai:'01:00'},at:1}]));
await team('Pavimentação Johonatan');ok(await get(T)==='07:00 07:15 07:30 07:00 07:15 17:00','sincronização: registro mais novo do servidor vence (A 07:00–17:00)');
await team('Pavimentação Raimundo');ok(await p.inputValue('#rfESai')==='06:00','sincronização: registro do aparelho, mais novo, vence (B)');
ok(await p.evaluate(()=>window.__srv.saves.some(s=>s.eq==='Pavimentação Raimundo'&&s.h.eSai==='06:00')),'registro do aparelho mais novo é enviado ao servidor');
ok(errs.length===0,'sem erros JS '+JSON.stringify(errs.slice(0,3)));await b.close()})();

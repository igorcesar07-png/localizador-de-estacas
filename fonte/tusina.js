// Calculadora: horário da usina comum às três equipes e a todos os aparelhos (registro comum no servidor)
const {chromium}=require('/home/claude/localizador-de-estacas/firebase/node_modules/playwright');const W=ms=>new Promise(r=>setTimeout(r,ms));
const res=[];const ok=(c,n)=>{res.push(!!c);console.log((c?'OK  ':'FALHOU ')+n)};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const ctx=await b.newContext({viewport:{width:1280,height:900}});
await ctx.addInitScript(()=>{window.__srv={saves:[],cb:null};window.EquipeHorasDB={subscribe(cb){window.__srv.cb=cb;setTimeout(()=>cb([]),30);return ()=>{}},save(eq,h,at){window.__srv.saves.push({eq,h,at});return Promise.resolve()}}});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.route(/(openstreetmap|arcgisonline)/,r=>r.abort());
await p.goto('http://localhost:8772/#calculadora');await W(2500);
await p.selectOption('#rfObra','Restauração BR-277 – Blocos 02 e 03');await W(200);
await p.selectOption('#rfEquipe','Pavimentação Johonatan');await W(300);await p.fill('#rfUIni','05:10');await p.press('#rfUIni','Tab');await W(300);
ok(await p.evaluate(()=>window.__srv.saves.some(s=>/Usina/.test(s.eq)&&s.h.uIni==='05:10')),'alterar o início da usinagem grava o horário comum no servidor');
for(const eq of ['Pavimentação Raimundo','Pavimentação Johonatan']){await p.selectOption('#rfEquipe',eq).catch(()=>{});await W(300);ok(await p.inputValue('#rfUIni')==='05:10','mesmo início da usinagem na equipe '+eq)}
// outro aparelho altera → este atualiza
await p.evaluate(()=>window.__srv.cb([{equipe:'Usina (comum a todas as equipes)',h:{uPrep:'04:20',uIni:'04:50'},at:Date.now()+60000}]));await W(300);
ok(await p.inputValue('#rfUIni')==='04:50'&&await p.inputValue('#rfUPrep')==='04:20','alteração feita em outro aparelho atualiza a usina aqui');
ok(!errs.length,'sem erros JS '+JSON.stringify(errs.slice(0,3)));console.log(`\n${res.filter(Boolean).length}/${res.length}`);await b.close()})();

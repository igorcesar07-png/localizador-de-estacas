// Busca de estaca (consulta) não pode ser desfeita pelo GPS ligado na outra rodovia (espelho BR-277 ⇄ BR-373)
const {chromium}=require('/home/claude/localizador-de-estacas/firebase/node_modules/playwright');
const res=[];const ok=(c,n)=>{res.push(c);console.log((c?'OK  ':'FALHOU ')+n)};const W=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const HOME={latitude:-25.4284,longitude:-49.2733,accuracy:4}; // ponto qualquer longe da rodovia (fora do trecho)
const ctx=await b.newContext({viewport:{width:393,height:852},permissions:['geolocation'],geolocation:HOME});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/(openstreetmap|arcgisonline)/,r=>r.abort());
let tick=0;const feed=async(n)=>{for(let k=0;k<n;k++){tick++;await ctx.setGeolocation({...HOME,latitude:HOME.latitude+tick*1e-6});await W(400)}};
await p.goto('http://localhost:8771/#localizacao');await W(2500);
await p.click('#lGo');await feed(3);ok(/Pausar/.test(await p.textContent('#lGoTxt')),'GPS ligado na Localização estaca');
const B4P=JSON.parse(require('fs').readFileSync('/tmp/claude-0/off/lppts.json','utf8')).B4;
await ctx.setGeolocation({latitude:B4P[2][1],longitude:B4P[2][2],accuracy:4});await W(800);await p.evaluate(()=>location.hash='#mapab4');await W(1200);
ok((await p.textContent('#b4_big'))===B4P[2][0].replace(/\+(\d+)/,(m,x)=>'+'+x)||/^\d+\+\d+/.test(await p.textContent('#b4_big')),'sem consulta, o GPS da Localização estaca continua chegando ao mapa B4 ('+await p.textContent('#b4_big')+')');
await ctx.setGeolocation(HOME);await W(800);
for(const [pg,pre] of [['mapab4','b4_'],['mapa','']]){if(pg==='mapa'){await p.evaluate(()=>location.hash='#localizacao');await W(600);ok(/Pausar/.test(await p.textContent('#lGoTxt')),'buscar no mapa B4 não desliga o GPS da Localização estaca')}
  await p.evaluate(x=>location.hash=x,'#'+pg);await W(1200);
  const sb=pre?'#b4_searchBtn':'#searchBtn',q=pre?'#b4_q':'#q',box=pre?'#b4_searchBox':'#searchBox',big='#'+pre+'big',mt='#'+pre+'modeTxt';
  await p.evaluate(s=>document.querySelector(s).click(),sb);await W(200);await p.fill(q,'237');await p.press(q,'Enter');await W(500);
  const a={big:await p.textContent(big),mode:await p.textContent(mt)};
  await feed(5); // o GPS do aparelho continua mandando leituras
  const c={big:await p.textContent(big),mode:await p.textContent(mt)};
  console.log(pg,JSON.stringify(a),'→',JSON.stringify(c));
  ok(/^237/.test(a.big)&&/consulta/.test(a.mode)&&c.big===a.big&&/consulta/.test(c.mode),`${pg}: a estaca buscada (237) permanece depois de 5 leituras do GPS`);
}
// o espelho continua valendo onde não houve consulta: Localização estaca segue o GPS

ok(errs.length===0,'sem erros JS '+JSON.stringify(errs.slice(0,3)));console.log(`\n${res.filter(x=>x).length}/${res.length}`);await b.close()})();

// Calculadora: marcar / desmarcar todos (coluna Programar) na pavimentação e na drenagem
const {chromium}=require('/home/claude/localizador-de-estacas/firebase/node_modules/playwright');
const res=[];const ok=(c,n)=>{res.push(c);console.log((c?'OK  ':'FALHOU ')+n)};const W=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const ctx=await b.newContext({viewport:{width:1280,height:900}});const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.route(/(openstreetmap|arcgisonline)/,r=>r.abort());
await p.goto('http://localhost:8771/#calculadora');await W(2500);
await p.selectOption('#rfObra','Restauração BR-277 – Blocos 02 e 03');await W(400);
await p.fill('#cKmA','236+000');await p.fill('#cKmB','239+000');await p.selectOption('#cPista','ALL');await p.selectOption('#cSent','ALL');await p.click('#cForm button[type=submit]');await W(900);
const pav=()=>p.evaluate(()=>{const tb=[...document.querySelectorAll('#cOut table.q')].find(t=>t.querySelector('.rprogAll[aria-label*="panos"]'));const cbs=[...tb.querySelectorAll('tbody .rprog')];const a=tb.querySelector('.rprogAll');return {n:cbs.length,on:cbs.filter(c=>c.checked).length,all:a.checked,ind:a.indeterminate}});
const tot=()=>p.$eval('#cOut',e=>(e.innerText.match(/PANOS PROGRAMADOS\s*(\d+)/i)||[])[1]);
let s=await pav();console.log(s,'programados:',await tot());ok(s.n>3&&s.on===s.n&&s.all&&!s.ind,'cabeçalho "Programar" com a caixa marcada quando todos estão marcados');
await p.uncheck('#cOut .rprogAll[aria-label*="panos"]');await W(600);s=await pav();ok(s.on===0&&!s.all&&!s.ind,`desmarcar todos: 0 de ${s.n} marcados`);
console.log('msg:',await p.textContent('#cOut .segmsg, #cOut .alert').catch(()=>''));ok((await tot())==='0'||(await tot())===undefined,'totais zerados (programados: '+await tot()+')');
const t0=await p.$eval('#cOut tbody tr[data-tag] .rprog',e=>e.closest('tr').dataset.tag);await p.check(`tr[data-tag="${t0}"] .rprog`);await W(500);s=await pav();ok(s.on===1&&s.ind,'um marcado: caixa do cabeçalho fica parcial');
await p.check('#cOut .rprogAll[aria-label*="panos"]');await W(600);s=await pav();ok(s.on===s.n&&s.all,`marcar todos: ${s.on} de ${s.n}`);
// drenagem
const dr=await p.$('#cOut .rprogAll[aria-label*="drenagem"]');
if(dr){await p.uncheck('#cOut .rprogAll[aria-label*="drenagem"]');await W(600);const d=await p.evaluate(()=>{const tb=document.querySelector('#cOut .rprogAll[aria-label*="drenagem"]').closest('table');const c=[...tb.querySelectorAll('tbody .rprog')];return [c.length,c.filter(x=>x.checked).length]});
  s=await pav();ok(d[1]===0&&s.on===s.n,`drenagem: desmarca só os ${d[0]} segmentos de drenagem (pavimentação intacta)`);await p.check('#cOut .rprogAll[aria-label*="drenagem"]');await W(500)}
else console.log('(sem drenagem neste trecho)');
await p.reload();await W(2500);s=await pav();ok(s.on===s.n,'escolha mantida depois de recarregar');
ok(!errs.length,'sem erros JS '+JSON.stringify(errs.slice(0,2)));console.log(`\n${res.filter(x=>x).length}/${res.length}`);await b.close()})();

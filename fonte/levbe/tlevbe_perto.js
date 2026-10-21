// Teste da melhoria na aba Registros: estaca atual no topo e destaque dos pendentes de complemento por perto.
// Rodado com o app de firebase/public servido localmente, com um stub no lugar do auth.js (base R08 da BR-277 e ACL=null), GPS simulado.
// Teste: aba Registros mostra a estaca atual e destaca os pendentes de complemento por perto (GPS simulado na BR-277)
const {chromium}=require('/opt/node-tools/node_modules/playwright-core');const fs=require('fs');
const S='/tmp/claude-0/-home-claude/50c6f81f-0ea5-5212-bef3-49bbb374de28/scratchpad';const D=S+'/shots/';fs.mkdirSync(D,{recursive:true});
const PTS=JSON.parse(fs.readFileSync(S+'/bw/pts277.json','utf8'));
const res=[];const ok=(c,n)=>{res.push(c);console.log((c?'OK      ':'FALHOU  ')+n)};const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,hasTouch:true,permissions:['geolocation'],geolocation:{latitude:PTS[2990][1],longitude:PTS[2990][2],accuracy:4}});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('**/cdnjs.cloudflare.com/**',r=>r.fulfill({body:fs.readFileSync(S+'/bw/package/dist/leaflet.js'),contentType:'application/javascript'}));
await p.route('**/cdn.jsdelivr.net/**',r=>r.fulfill({body:fs.readFileSync(S+'/bw/lr/package/dist/leaflet-rotate-src.js'),contentType:'application/javascript'}));
await p.route(/(fonts\.g|openstreetmap|arcgisonline)/,r=>r.abort());
await p.goto('http://localhost:8765/test.html#levbe');await p.waitForTimeout(2500);
const go=async(i,ms=650)=>{await ctx.setGeolocation({latitude:PTS[i][1],longitude:PTS[i][2],accuracy:4});await wait(ms)};
const drive=async(a,z,st=1)=>{for(let i=a;st>0?i<=z:i>=z;i+=st)await go(i)};
const tap=async(k,pista)=>{await p.click(`#lvGrid .lv-col[data-p="${pista}"] .lv-btn[data-k="${k}"]`);await p.waitForTimeout(700)};
const recs=()=>p.evaluate(()=>window.__LEVBE.rec().filter(x=>!x.excluido));
// 1) primeira passada: três registros
await drive(2990,2996);ok(/CRESCENTE/.test(await p.textContent('#lvSent')),'sentido crescente detectado');
await tap('LOTADO','DECRESCENTE');await drive(2997,3010);await tap('VAZIO','CRESCENTE');await drive(3011,3013);await tap('LOCAL','CRESCENTE');
let R=await recs();ok(R.length===3,'3 registros feitos ('+R.length+')');
const [A,B,C]=R.sort((x,y)=>x.odometro_m-y.odometro_m);console.log('A',A.estaca_txt,A.pista,'B',B.estaca_txt,'C',C.estaca_txt);
// complementa C (observação) pela lista
await p.click('#pLev .lv-tab[data-v="list"]');await p.waitForTimeout(500);
await p.click(`#lvItems [data-ed="${C.id}"]`);await p.fill('#lvEdObs','Acesso pela lateral');await p.click('#lvEdSave');await p.waitForTimeout(500);
await p.click('#pLev .lv-tab[data-v="reg"]');await p.waitForTimeout(300);
// 2) volta depois, 1,8 km antes, andando no crescente
await drive(2890,2905,3);
await p.click('#pLev .lv-tab[data-v="list"]');await p.waitForTimeout(800);
const st=await p.textContent('#lvHSt');console.log('estaca no topo:',st,'|',await p.textContent('#lvHRod'),'|',await p.textContent('#lvHAcc'));
ok(/^22[23]\+\d{3}/.test(st),'aba Registros mostra a estaca atual no topo');
const hn=async()=>p.evaluate(()=>({cls:document.querySelector('#lvHNear').className,txt:document.querySelector('#lvHNear').innerText.replace(/\s+/g,' '),hidden:document.querySelector('#lvHNear').hidden}));
let h=await hn();console.log('aviso:',h);ok(!h.hidden&&!/on/.test(h.cls)&&/Próximo pendente/.test(h.txt)&&h.txt.includes(A.estaca_txt)&&/km à frente/.test(h.txt)&&/2 pendentes/.test(h.txt),'longe: "Próximo pendente" com a estaca do registro e "km à frente"');
const it=async id=>p.evaluate(id=>{const e=document.querySelector(`#lvItems .lv-it[data-id="${id}"]`);return e&&{cls:e.className,dist:e.querySelector('.lv-dist').hidden?null:e.querySelector('.lv-dist').textContent}},id);
let a=await it(A.id),bb=await it(B.id),c=await it(C.id);console.log(a,bb,c);
ok(/lv-pendit/.test(a.cls)&&/lv-pendit/.test(bb.cls)&&!/lv-pendit/.test(c.cls),'pendentes destacados; o já complementado não');
ok(!/lv-near/.test(a.cls)&&/km à frente/.test(a.dist),'cada registro mostra a distância (ainda longe, sem destaque forte)');
ok(await p.evaluate(()=>{const m=document.getElementById('lvHereMk');return !!m&&m.nextElementSibling&&m.nextElementSibling.classList.contains('lv-it')&&!m.previousElementSibling}),'"VOCÊ ESTÁ AQUI" antes de todos (todos à frente)');
await p.screenshot({path:D+'1_longe.png'});
// 3) chegando a 400 m do registro A
await drive(2910,2976,6);await go(2976,900);
h=await hn();console.log('aviso:',h);a=await it(A.id);console.log(a);
ok(/on/.test(h.cls)&&/Pendente de complemento/.test(h.txt)&&h.txt.includes(A.estaca_txt)&&/m à frente/.test(h.txt),'perto: aviso amarelo com estaca, pista e distância à frente');
ok(/lv-near/.test(a.cls)&&/^PERTO/.test(a.dist),'perto: registro destacado na lista com "PERTO"');
const vis=await p.evaluate(id=>{const e=document.querySelector(`#lvItems .lv-it[data-id="${id}"]`).getBoundingClientRect();return e.top>=0&&e.bottom<=innerHeight},A.id);ok(vis,'lista rolou sozinha até o registro pendente');
await p.waitForTimeout(1500);await p.screenshot({path:D+'2_perto.png'});
// 4) botão Complementar do aviso abre o registro
await p.click('#lvHNear [data-hed]');await p.waitForTimeout(300);ok(!(await p.isHidden('#lvEd'))&&(await p.textContent('#lvEdT')).includes(A.estaca_txt),'"Complementar" abre o registro certo');
await p.screenshot({path:D+'3_editor.png'});await p.click('#lvEdClose');
// 5) passou do A: fica atrás; marcador entre A e B
await drive(2982,3000,6);await go(3000,900);h=await hn();a=await it(A.id);bb=await it(B.id);console.log('aviso:',h,a,bb);
ok(/atrás/.test(a.dist)&&/à frente/.test(bb.dist),'depois de passar: A "atrás", B "à frente"');
ok(await p.evaluate(([ia,ib])=>{const m=document.getElementById('lvHereMk');return m.previousElementSibling.dataset.id===ia&&m.nextElementSibling.dataset.id===ib},[A.id,B.id]),'"VOCÊ ESTÁ AQUI" entre A e B');
ok(/\+1 pendente a menos de 500 m/.test(h.txt),'aviso conta os outros pendentes por perto');
// 6) complementar pelo aviso tira o destaque
await p.click('#lvHNear [data-hed]');await p.click('#lvEdOk');await p.click('#lvEdSave');await p.waitForTimeout(800);
const ids=await p.evaluate(()=>[...document.querySelectorAll('#lvItems .lv-pendit')].map(e=>e.dataset.id));ok(ids.length===1,'depois de complementar, sobra 1 pendente destacado ('+ids.length+')');
// 7) paisagem e modo escuro
await p.setViewportSize({width:852,height:393});await p.waitForTimeout(800);await p.screenshot({path:D+'4_paisagem.png'});
await p.setViewportSize({width:393,height:852});await p.emulateMedia({colorScheme:'dark'});await go(2985,1200);await p.screenshot({path:D+'5_escuro.png'});
// 8) tela de registro continua igual
await p.click('#pLev .lv-tab[data-v="reg"]');await p.waitForTimeout(600);ok(!(await p.isHidden('#lvReg'))&&/^22\d\+/.test(await p.textContent('#lvSt'))&&(await p.$$('#lvGrid .lv-btn')).length===8,'tela Registrar inalterada (estaca e 8 botões)');
ok(errs.length===0,'sem erros de JavaScript'+(errs.length?': '+errs.join(' | '):''));
console.log(res.filter(Boolean).length+'/'+res.length+' OK');await b.close();process.exit(res.every(Boolean)?0:1)})().catch(e=>{console.error(e);process.exit(2)});

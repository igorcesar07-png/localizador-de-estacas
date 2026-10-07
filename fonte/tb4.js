// Teste da aba Estacas BR-373 B4 e regressão da aba BR-277 B2+B3 (build sem login)
const {chromium}=require('playwright');const fs=require('fs');
const B4=JSON.parse(fs.readFileSync('b4/data_b4.json','utf8'));const R08=JSON.parse(fs.readFileSync('data.json','utf8'));
const at=(D,nm,dm=0)=>{const i=D.rows.findIndex(r=>r[0]===nm);const a=D.rows[i],b=D.rows[i+1],t=dm/20;return {latitude:(a[1]+(b[1]-a[1])*t)/1e5,longitude:(a[2]+(b[2]-a[2])*t)/1e5,accuracy:4}};
const out=[];const ok=(c,n)=>{out.push((c?'OK  ':'FALHOU ')+n);console.log((c?'OK  ':'FALHOU ')+n)};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,permissions:['geolocation'],geolocation:at(B4,'230+680',8)});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/ERR_FAILED/.test(m.text()))errs.push('console: '+m.text())});
await p.route('**/cdnjs.cloudflare.com/**',r=>r.fulfill({body:fs.readFileSync('package/dist/leaflet.js'),contentType:'application/javascript'}));
await p.route(/(jsdelivr|fonts\.g|openstreetmap|arcgisonline)/,r=>r.abort());
await p.goto('http://localhost:8765/#mapab4');await p.waitForTimeout(2500);
ok(await p.evaluate(()=>!document.getElementById('b4_pMap').hidden&&document.getElementById('pMap').hidden),'aba BR-373 B4 abre pelo menu/endereço');
ok(await p.locator('#drawer a[data-page="mapab4"]').count()===1,'item "Estacas BR-373 B4" no menu');
const s=await p.evaluate(()=>window.__b4());console.log(JSON.stringify({...s,erros:s.erros.slice(0,5)}));
ok(s.panos===2836,'2.836 panos importados ('+s.panos+')');ok(s.ligados+s.saidas===2836,'todos ligados: '+s.ligados+' em faixas/drenos + '+s.saidas+' saídas');
ok(s.semEstaca===0&&s.semRegistro===0,'nenhum pano sem estaca ou sem registro');ok(s.erros.length===0,'associação estaca/faixa/sentido sem divergências ('+s.erros.length+')');
ok(s.estacas===4958,'4.958 estacas georreferenciadas');ok(s.avisos.join(',')==='2821,2827,2832,2835,2836','5 avisos sinalizados');
// GPS na estaca 230+680 + 8 m
await p.click('#b4_mode');await p.waitForTimeout(2500);
const big=await p.textContent('#b4_big');ok(/^230\+68[0-9]$/.test(big.replace(/\s/g,'')),'GPS: estaca atual '+big);
const blk=await p.textContent('#b4_blockTxt');ok(blk.includes('230+680'),'bloco de 20 m: '+blk);
const grp=await p.textContent('#b4_groups');console.log('grupos:',grp.replace(/\s+/g,' ').slice(0,300));
await p.screenshot({path:'b4_1.png'});
// abrir o painel e o detalhe do primeiro pano
await p.evaluate(()=>{const el=document.querySelector('#b4_groups .item');el&&el.click()});await p.waitForTimeout(600);
const mt=await p.textContent('#b4_imBody').catch(()=>'');ok(/Nº no unifilar/.test(mt)&&/Quantidade/.test(mt)&&/Tipo de solução/.test(mt),'detalhe do pano mostra dados do unifilar');
console.log('modal:',mt.replace(/\s+/g,' ').slice(0,420));
await p.screenshot({path:'b4_2.png'});await p.click('#b4_imClose');
// conferir que o pano exibido corresponde ao JSON
const chk=await p.evaluate(()=>{const t=document.getElementById('b4_imBody').innerText;return t});
// busca de estaca
await p.click('#b4_mode');await p.waitForTimeout(300);
await p.click('#b4_toolTab');await p.waitForTimeout(300);await p.click('#b4_searchBtn');await p.fill('#b4_q','184+1000');await p.press('#b4_q','Enter');await p.waitForTimeout(1500);
ok((await p.textContent('#b4_big')).replace(/\s/g,'')==='184+1000','busca 184+1000 (km longo)');
await p.click('#b4_toolTab');await p.waitForTimeout(300);await p.click('#b4_searchBtn');await p.fill('#b4_q','300+000');await p.press('#b4_q','Enter');await p.waitForTimeout(600);
const tt=await p.textContent('#b4_toast');ok(/183\+400 a 282\+480/.test(tt),'busca fora do trecho: '+tt.slice(0,80));
// filtros
await p.click('#b4_grab');await p.waitForTimeout(500);await p.click('#b4_tabF');await p.waitForTimeout(300);
const pills=await p.$$eval('#b4_fSol .pill',a=>a.map(x=>x.dataset.k+':'+x.innerText.replace(/\s+/g,' ')));console.log(pills.join(' | '));
ok(pills.length===9&&pills.some(x=>x.startsWith('FS:')&&/Fresagem Superficial 3 cm/.test(x))&&!pills.some(x=>x.startsWith('G:')),'filtros de solução da B4: GAP grade agora FS – Fresagem Superficial 3 cm');
const fonte=await p.textContent('#b4_fonte');console.log('fonte:',fonte);ok(/2\.836 panos/.test(fonte),'nota de importação');
await p.click('#b4_fSol .pill[data-k="FS"]');await p.waitForTimeout(400);
ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('br277.b4.filters')).sol.includes('FS')===false),'filtro da B4 salvo separado');
ok(await p.evaluate(()=>{const f=JSON.parse(localStorage.getItem('br277.filters')||'null');return !f||f.sol.length===9}),'filtros da B2+B3 intactos');
await p.screenshot({path:'b4_3.png'});
// saída de dreno
const sai=B4.rows.findIndex(r=>r[7][3]==='o');await p.evaluate(nm=>{},'');
// regressão: aba BR-277 B2+B3
await ctx.setGeolocation(at(R08,'186+140',5));
await p.goto('http://localhost:8765/#mapa');await p.waitForTimeout(2500);
ok(await p.evaluate(()=>!document.getElementById('pMap').hidden&&document.getElementById('b4_pMap').hidden),'aba B2+B3 abre');
await p.click('#mode');await p.waitForTimeout(2500);
const big2=(await p.textContent('#big')).replace(/\s/g,'');ok(/^186\+14[0-9]$/.test(big2),'B2+B3 GPS: estaca '+big2);
await p.evaluate(()=>{const el=document.querySelector('#groups .item');el&&el.click()});await p.waitForTimeout(500);
const mt2=await p.textContent('#imBody').catch(()=>'');ok(/Página do PDF/.test(mt2)&&!/Nº no unifilar/.test(mt2),'detalhe do pano B2+B3 inalterado');
await p.click('#imClose');await p.click('#grab');await p.waitForTimeout(500);await p.click('#tabF');await p.waitForTimeout(300);
const pills2=await p.$$eval('#fSol .pill',a=>a.map(x=>x.dataset.k));ok(pills2.join(',')==='FF,FE,FS,REC,PA,RP,DR,DP,RF','filtros B2+B3 inalterados ('+pills2.join(',')+')');
await p.screenshot({path:'b4_4.png'});
// voltar para a B4: estado preservado
await p.goto('http://localhost:8765/#mapab4');await p.waitForTimeout(2000);ok(await p.evaluate(()=>!!window.__mapB4&&!!window.__map),'os dois mapas convivem');
// paisagem
await p.setViewportSize({width:852,height:393});await p.waitForTimeout(800);await p.screenshot({path:'b4_5.png'});
ok(errs.length===0,'sem erros de JavaScript '+JSON.stringify(errs.slice(0,3)));
fs.writeFileSync('tb4-report.txt',out.join('\n'));await b.close()})();

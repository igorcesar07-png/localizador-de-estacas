// Calculadora: saídas de dreno nos drenos incluídos fora do projeto (espaçamento padrão 40 m, comprimento padrão com ajuste individual)
const {chromium}=require('/home/claude/localizador-de-estacas/firebase/node_modules/playwright');
const res=[];const ok=(c,n)=>{res.push(c);console.log((c?'OK  ':'FALHOU ')+n)};const W=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const ctx=await b.newContext({viewport:{width:1280,height:900},acceptDownloads:true});const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.route(/(openstreetmap|arcgisonline)/,r=>r.abort());
await p.goto('http://localhost:8771/#calculadora');await W(2500);
await p.selectOption('#rfObra','Restauração BR-277 – Blocos 02 e 03');await W(400);
await p.fill('#cKmA','236+000');await p.fill('#cKmB','239+000');await p.selectOption('#cPista','DRN');await p.selectOption('#cSent','ALL');await p.click('#cForm button[type=submit]');await W(900);
const kpi=()=>p.$eval('#cOut',e=>{const t=e.innerText;return {sai:(t.match(/SAÍDAS DE DRENO\s*([\d.,]+)\s*m\s*([^\n]*)/i)||[]).slice(1).join(' | '),tot:(t.match(/DRENAGEM PROGRAMADA\s*([\d.,]+)/i)||[])[1]}});
const k0=await kpi();console.log('antes',k0);
// pano de pavimento: bloco de saídas não aparece
await p.click('#cManAdd');await W(200);ok(await p.isHidden('#manSaiF'),'pano de pavimento: sem bloco de saídas');await p.click('#manCancel');
await p.click('#cManDrn');await W(200);ok(await p.isVisible('#manSaiF'),'dreno fora do projeto: bloco de saídas visível');
ok(await p.inputValue('#manSaiEsp')==='40'&&await p.inputValue('#manSaiComp')==='8','padrões: 40 m de espaçamento e 8 m por saída');
await p.selectOption('#manSent','C');await p.fill('#manIni','237+010');await p.fill('#manFim','237+170');await p.dispatchEvent('#manFim','change');
await p.check('#manSaiOn');await W(200);
let L=await p.$$eval('#manSaiList .msai-r b',a=>a.map(x=>x.textContent));console.log(L);ok(L.length===4&&L[0]==='237+050'&&L[3]==='237+170','4 saídas a cada 40 m: '+L.join(', '));
await p.fill('#manSaiComp','10');await p.dispatchEvent('#manSaiComp','change');await W(150);
ok((await p.$$eval('#manSaiList .msai-r input',a=>a.map(x=>x.value))).every(v=>v==='10'),'comprimento padrão aplicado a todas (10 m)');
const i2=(await p.$$('#manSaiList .msai-r input'))[1];await i2.fill('15');await i2.dispatchEvent('change');await W(150);
const i4=(await p.$$('#manSaiList .msai-r input'))[3];await i4.fill('0');await i4.dispatchEvent('change');await W(150);
let tt=await p.textContent('#manSaiList .msai-t');ok(/3 saídas · 35 m/.test(tt),'edição individual (15 m) e 0 retira: '+tt);
await p.fill('#manSaiComp','12');await p.dispatchEvent('#manSaiComp','change');await W(150);
tt=await p.textContent('#manSaiList .msai-t');ok(/3 saídas · 39 m/.test(tt),'mudar o padrão mantém as editadas (12+15+12): '+tt);
await p.screenshot({path:'/tmp/claude-0/sai_dlg.png'});
await p.click('#manSave');await W(900);
const k1=await kpi();console.log('depois',k1);
const n=s=>+String(s).replace(/\./g,'').replace(',','.');
ok(Math.abs(n(k1.tot)-n(k0.tot)-(160+39))<0.6,`total da drenagem soma 160 m de dreno + 39 m de saídas (${k0.tot} → ${k1.tot})`);
const row=await p.$eval('#cOut tr.man[data-tag^="MAN-"]',tr=>tr.lastElementChild.innerText);ok(/237\+050 · 12 m/.test(row)&&/237\+090 · 15 m/.test(row),'coluna de saídas do dreno manual: '+row.replace(/\n/g,' / '));
// reabrir para editar: dados preservados
await p.click('#cOut tr.man[data-tag^="MAN-"] .manEd');await W(300);
ok(await p.isChecked('#manSaiOn')&&await p.inputValue('#manSaiComp')==='12'&&/3 saídas · 39 m/.test(await p.textContent('#manSaiList .msai-t')),'editar: saídas e comprimentos preservados');
await p.fill('#manSaiEsp','80');await p.dispatchEvent('#manSaiEsp','change');await W(150);L=await p.$$eval('#manSaiList .msai-r b',a=>a.map(x=>x.textContent));ok(L.join()==='237+090,237+170','espaçamento alterado para 80 m: '+L.join(', '));
await p.fill('#manSaiEsp','40');await p.dispatchEvent('#manSaiEsp','change');await p.click('#manSave');await W(700);
// relatório
const eq=await p.$$eval('#rfEquipe option',a=>a.map(o=>o.value).filter(v=>/dren/i.test(v)));if(eq[0]){await p.selectOption('#rfEquipe',eq[0]);await p.dispatchEvent('#rfEquipe','change')}
await W(300);
for(const [id,v] of [['rfUPrep','04:00'],['rfUIni','04:30'],['rfSCafe','04:30'],['rfSDds','05:00'],['rfSSai','05:30'],['rfECafe','04:30'],['rfEDds','05:00'],['rfESai','05:30'],['rfTempoMsg','Tempo estável.']])await p.fill('#'+id,v).catch(()=>{});
await p.fill('#rfData','2026-11-19').catch(()=>{});await p.selectOption('#rfTempo','Ensolarado').catch(()=>{});
if(await p.isVisible('#rfUsiSet'))await p.check('input[name=rfUsiDr][value=N]');
await p.click('#cRep');await W(1200);console.log('pend:',(await p.textContent('#rfPend').catch(()=>'')).slice(0,200));
const t=await p.textContent('#repDoc').catch(()=>'');ok(/237\+050 · 12 m/.test(t)&&/237\+090 · 15 m/.test(t),'relatório: estacas das saídas com o comprimento');
const ntot=(t.match(/Total drenagem:[^\n]*/)||[''])[0];console.log(ntot);ok(/comprimento informado/.test(t),'nota do relatório explica o comprimento das saídas manuais');
await p.screenshot({path:'/tmp/claude-0/sai_rep.png',fullPage:false});
for(const rt of ['full','simp']){await p.click(`.rtype button[data-rt="${rt}"]`);await W(500);const [d]=await Promise.all([p.waitForEvent('download',{timeout:30000}).catch(()=>null),p.click('#rvPdf')]);
  let ok2=false;if(d){const f='/tmp/claude-0/sai_'+rt+'.pdf';await d.saveAs(f);ok2=require('fs').statSync(f).size>5000}ok(ok2,'PDF '+rt+' gerado')}
ok(!errs.length,'sem erros JS '+JSON.stringify(errs.slice(0,2)));console.log(`\n${res.filter(x=>x).length}/${res.length}`);await b.close()})();

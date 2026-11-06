const {chromium}=require('/home/claude/localizador-de-estacas/firebase/node_modules/playwright');const fs=require('fs');
const ok=(c,n)=>console.log((c?'OK  ':'FALHOU ')+n);
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:1280,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/(openstreetmap|arcgisonline)/,r=>r.abort());
await p.goto('http://localhost:8771/#calculadora');await p.waitForTimeout(3000);
await p.selectOption('#rfObra','Restauração BR-277 – Blocos 02 e 03');
const eq=await p.$$eval('#rfEquipe option',a=>a.map(o=>o.value).filter(v=>/dren/i.test(v)));await p.selectOption('#rfEquipe',eq[0]);await p.waitForTimeout(300);
for(const i of ['rfSCafe','rfSDds','rfSSai','rfECafe','rfEDds','rfESai']){await p.fill('#'+i,'06:00');await p.press('#'+i,'Tab')}await p.selectOption('#rfTempo','Ensolarado');
await p.check('input[name=rfUsiDr][value=N]').catch(()=>{});
const KA=process.env.KA||'200+000',KB=process.env.KB||'215+000';
await p.fill('#cKmA',KA);await p.fill('#cKmB',KB);await p.selectOption('#cPista','ALL');await p.selectOption('#cSent','ALL');await p.click('#cForm button[type=submit]');await p.waitForTimeout(900);
const drTot=()=>p.$eval('#cDrn tfoot td.big2',e=>e.textContent).catch(()=>null);const kDR=()=>p.$eval('#cDrn .kpi',e=>e.querySelector('b').textContent).catch(()=>null);
const dtags=()=>p.$$eval('#cDrn tbody tr[data-tag]',a=>a.map(t=>t.dataset.tag)).catch(()=>[]);
const t0=await drTot(),k0=await kDR();console.log('drenos do projeto',(await dtags()).length,'total',t0,'DR',k0);
await p.click('#cManDrn');await p.waitForTimeout(200);
ok(!(await p.isHidden('#manDlg'))&&await p.textContent('#manT')==='Dreno fora do projeto','formulário "Dreno fora do projeto" abre');
const sols=await p.$$eval('#manSol option',a=>a.map(o=>o.value));ok(JSON.stringify(sols)==='["DR","DP"]','soluções: DR e DP');
ok(await p.isHidden('#manWF')&&await p.isHidden('#manEF')&&await p.inputValue('#manFx')==='DRN','sem largura e espessura (dreno em metros); faixa = Dreno');
await p.selectOption('#manSol','DR');await p.selectOption('#manSent','C');await p.fill('#manIni','205+100');await p.fill('#manFim','205+260');await p.press('#manFim','Tab');
ok(await p.inputValue('#manLen')==='160','comprimento sugerido pelas estacas (160 m)');
await p.fill('#manObs','Dreno extra: surgência na saia do aterro');await p.click('#manSave');await p.waitForTimeout(700);
const T=await dtags();const mt=T.find(t=>/^MAN-/.test(t));ok(!!mt,'dreno manual entra na relação de drenagem ('+mt+')');
const row=await p.$eval(`#cDrn tr[data-tag="${mt}"]`,tr=>({cls:tr.className,txt:tr.textContent,obs:tr.querySelector('.robs').value}));
ok(/fora do projeto/.test(row.txt)&&/\bman\b/.test(row.cls)&&/hasobs/.test(row.cls)&&row.obs==='Dreno extra: surgência na saia do aterro','destaque "fora do projeto" e observação no segmento');
const n=v=>parseFloat(String(v).replace(/\./g,'').replace(',','.'))||0;
ok(n(await drTot())-n(t0)===160&&n(await kDR())-n(k0)===160,`total de dreno e DR somam os 160 m (${t0}→${await drTot()})`);
// duplicado
await p.click('#cManDrn');await p.selectOption('#manSol','DR');await p.selectOption('#manSent','C');await p.fill('#manIni','205+100');await p.fill('#manFim','205+260');await p.fill('#manLen','160');await p.click('#manSave');await p.waitForTimeout(200);
ok(/Já existe o dreno/.test(await p.textContent('#manErr')),'não duplica dreno igual');await p.click('#manCancel');
// pano de pavimento continua com largura e espessura obrigatórias
await p.click('#cManAdd');await p.waitForTimeout(150);ok(!(await p.isHidden('#manWF'))&&!(await p.isHidden('#manEF'))&&!(await p.$eval('#manSol',s=>[...s.options].some(o=>o.value==='DR'))),'pano de pavimentação continua igual (largura/espessura, sem DR/DP)');await p.click('#manCancel');
// editar
await p.click(`#cDrn tr[data-tag="${mt}"] .manEd`);await p.waitForTimeout(150);ok(await p.textContent('#manT')===`Editar dreno ${mt} (fora do projeto)`,'editar abre como dreno');
await p.selectOption('#manSol','DP');await p.fill('#manLen','150');await p.click('#manSave');await p.waitForTimeout(600);
const kDP=await p.$$eval('#cDrn .kpi b',a=>a[1].textContent);ok(/150/.test(await p.$eval(`#cDrn tr[data-tag="${mt}"]`,tr=>tr.textContent))&&n(await drTot())-n(t0)===150,'edição: DP 150 m refletida no total (DP '+kDP+')');
// observação num dreno do projeto e filtro "somente DP"
const pt=T.find(t=>!/^MAN-/.test(t));if(pt){await p.fill(`#cDrn tr[data-tag="${pt}"] .robs`,'Saída obstruída');await p.press(`#cDrn tr[data-tag="${pt}"] .robs`,'Tab');await p.waitForTimeout(300)}
await p.selectOption('#cPista','DRN_DR');await p.click('#cForm button[type=submit]');await p.waitForTimeout(600);ok(!(await dtags()).includes(mt),'filtro somente DR esconde o DP manual');
await p.selectOption('#cPista','ALL');await p.click('#cForm button[type=submit]');await p.waitForTimeout(600);ok((await dtags()).includes(mt)&&await p.inputValue(`#cDrn tr[data-tag="${mt}"] .robs`)==='Dreno extra: surgência na saia do aterro','observação preservada após recalcular');
// relatório espelho
const tab=await p.$$eval('#cDrn tbody tr[data-tag]',a=>a.filter(tr=>!tr.classList.contains('off')).map(tr=>{const c=[...tr.cells];return c[4].textContent.trim()+'→'+c[5].textContent.trim()}));
await p.click('#cRep');await p.waitForTimeout(1200);await p.click('.rtype button[data-rt="simp"]');await p.waitForTimeout(500);
const rep=await p.$$eval('#repDoc .sr-tw table',ts=>{const t=ts[ts.length-1];return [...t.querySelectorAll('tbody tr')].map(tr=>tr.cells[4].textContent.trim()+'→'+tr.cells[5].textContent.trim())});
console.log('tela ',tab.join(' '),'\nrelat',rep.join(' '));ok(JSON.stringify(tab)===JSON.stringify(rep),'relatório de drenagem = mesma relação e ordem da Calculadora (com o dreno manual)');
const txt=await p.textContent('#repDoc');ok(new RegExp('fora do projeto \\('+mt+'\\)').test(txt)&&/surgência na saia do aterro/.test(txt)&&(!pt||/Saída obstruída/.test(txt))&&/dreno\(s\) incluído\(s\) fora do projeto/.test(txt),'relatório mostra o dreno fora do projeto, as observações e o aviso');
await p.screenshot({path:'/tmp/claude-0/off/mandrn_simp.png',fullPage:true});
const dl=await Promise.all([p.waitForEvent('download',{timeout:20000}).catch(()=>null),p.click('#rvPdf')]);ok(dl[0]&&/\.pdf$/.test(dl[0].suggestedFilename()),'PDF gerado');
await p.click('.rtype button[data-rt="full"]');await p.waitForTimeout(500);ok(new RegExp(mt).test(await p.textContent('#repDoc')),'relatório completo também');
await p.click('#rvClose');await p.waitForTimeout(200);
// Relatórios (controle por pano) não recebe
const lp=await p.evaluate(()=>JSON.stringify(localStorage)).catch(()=>'');ok(!new RegExp('"tag\\\\?":\\\\?"'+mt).test(lp),'controle de execução (Relatórios) não recebe o dreno manual');
p.once('dialog',d=>d.accept());await p.click(`#cDrn tr[data-tag="${mt}"] .manDel`);await p.waitForTimeout(500);ok(!(await dtags()).includes(mt)&&await drTot()===t0,'excluir volta o total original');
await p.screenshot({path:'/tmp/claude-0/off/mandrn_calc.png'});
ok(errs.length===0,'sem erros JS '+JSON.stringify(errs.slice(0,3)));await b.close()})();

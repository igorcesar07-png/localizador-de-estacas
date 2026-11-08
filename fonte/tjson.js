const {chromium}=require('/home/claude/localizador-de-estacas/firebase/node_modules/playwright');const fs=require('fs');
const REF=JSON.parse(fs.readFileSync(''+(process.env.REF||'/tmp/claude-0/off/ref-massa.json')+'','utf8'));
const res=[];const ok=(c,n)=>{res.push(c);console.log((c?'OK  ':'FALHOU ')+n)};
const typeOf=v=>v===null?'null':Array.isArray(v)?'array':typeof v;
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:1280,height:900},acceptDownloads:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/(openstreetmap|arcgisonline)/,r=>r.abort());
for(const C of [{obra:'Restauração BR-373 – Bloco 04',eq:'Pavimentação Raimundo',a:'228+740',b:'230+600',sent:'C',job:'BR373'},{obra:'Restauração BR-277 – Blocos 02 e 03',eq:'Pavimentação Johonatan',a:'238+000',b:'236+000',sent:'ALL',job:'BR277'}]){
  console.log('\n=== '+C.obra);
  await p.goto('http://localhost:8771/#calculadora');await p.waitForTimeout(2500);
  await p.selectOption('#rfObra',C.obra);await p.waitForTimeout(500);const eqs=await p.$$eval('#rfEquipe option',a=>a.map(o=>o.value));await p.selectOption('#rfEquipe',eqs.includes(C.eq)?C.eq:eqs.find(v=>/Pavim/.test(v)));await p.waitForTimeout(300);
  await p.fill('#rfData','2026-11-08').catch(()=>{});
  for(const i of ['rfSCafe','rfSDds','rfSSai','rfECafe','rfEDds','rfESai']){await p.fill('#'+i,'05:00');await p.press('#'+i,'Tab')}await p.selectOption('#rfTempo','Nublado').catch(()=>p.selectOption('#rfTempo',{index:1}));
  await p.fill('#cKmA',C.a);await p.fill('#cKmB',C.b);await p.selectOption('#cPista','ALL');await p.selectOption('#cSent',C.sent);await p.click('#cForm button[type=submit]');await p.waitForTimeout(900);
  const tags=await p.$$eval('#cOut table.q tbody tr[data-tag]',a=>a.filter(tr=>tr.querySelector('.re')&&!tr.closest('#cDrn')).map(tr=>tr.dataset.tag));
  // espessura alterada, observação e um pano fora de programação
  await p.fill(`tr[data-tag="${tags[1]}"] .re`,'4');await p.press(`tr[data-tag="${tags[1]}"] .re`,'Tab');await p.waitForTimeout(300);
  await p.fill(`tr[data-tag="${tags[0]}"] .robs`,'Remendo antes da fresagem');await p.press(`tr[data-tag="${tags[0]}"] .robs`,'Tab');await p.waitForTimeout(300);
  const offT=tags[2];await p.uncheck(`tr[data-tag="${offT}"] input[type=checkbox]`).catch(()=>{});await p.waitForTimeout(400);
  const tab=await p.$$eval('#cOut table.q tbody tr[data-tag]',a=>a.filter(tr=>!tr.classList.contains('off')&&tr.querySelector('.re')&&!tr.closest('#cDrn')).map(tr=>({tag:tr.dataset.tag,ini:tr.cells[5].textContent.trim(),fim:tr.cells[6].textContent.trim(),len:tr.cells[7].textContent.trim(),w:tr.querySelector('.rw:not(.re)').value,e:tr.querySelector('.re').value,obs:(tr.querySelector('.robs')||{}).value||'',txt:tr.textContent})));
  await p.click('#cRep');await p.waitForTimeout(1200);await p.click('.rtype button[data-rt="simp"]');await p.waitForTimeout(400);
  ok(await p.isVisible('#rvJson')&&await p.evaluate(()=>{const a=document.getElementById('rvPng'),b=document.getElementById('rvJson');return a.nextElementSibling===b}),'botão "Exportar JSON" ao lado de Gerar PDF / Baixar imagem (PNG)');
  const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#rvJson')]);const path='/tmp/claude-0/off/'+dl.suggestedFilename();await dl.saveAs(path);
  const msg=await p.textContent('#rvMsg');console.log(dl.suggestedFilename(),'\n',msg);
  let J;try{J=JSON.parse(fs.readFileSync(path,'utf8'));ok(true,'arquivo é JSON válido')}catch(e){ok(false,'JSON válido');continue}
  ok(JSON.stringify(Object.keys(J))===JSON.stringify(Object.keys(REF)),'mesmas propriedades e na mesma ordem do modelo');
  ok(Object.keys(REF).every(k=>typeOf(J[k])===typeOf(REF[k])),'mesmos tipos do modelo ('+Object.keys(REF).filter(k=>typeOf(J[k])!==typeOf(REF[k])).join(',')+')');
  ok(J.fres.every(f=>JSON.stringify(Object.keys(f))===JSON.stringify(Object.keys(REF.fres[0]))&&Object.keys(REF.fres[0]).every(k=>typeOf(f[k])===typeOf(REF.fres[0][k]))),'cada segmento com os campos e tipos do modelo');
  ok(J.version===3&&J.job===C.job&&J.date==='2026-11-08'&&J.density>2&&J.planWidth>0&&J.planThickness>0&&J.planThickness<0.2,`cabeçalho: job ${J.job}, data ${J.date}, densidade ${J.density}, planWidth ${J.planWidth} m, planThickness ${J.planThickness} m`);
  ok(J.fres.length===tab.length,`todos os panos programados exportados (${J.fres.length} de ${tab.length}); o desmarcado fica fora`);
  const nm=s=>parseFloat(String(s).replace(/\./g,'').replace(',','.'));
  const bad=J.fres.map((f,i)=>{const t=tab[i];const e=[];if(!t)return 'faltou';if(f.start!==t.ini)e.push('ini '+f.start+'≠'+t.ini);if(Math.abs(f.length-nm(t.len))>0.01)e.push('len');if(Math.abs(f.width-parseFloat(t.w))>0.001)e.push('w');if(Math.abs(f.thickness-parseFloat(t.e)/100)>1e-9)e.push('e '+f.thickness+'/'+t.e);
    const dir=/Decresc|-D-/.test(t.tag)?'Decrescente':'Crescente';if(f.direction!==dir)e.push('dir');const lane=/-F1-/.test(t.tag)?1:/-F23-/.test(t.tag)?2:3;if(f.lane!==lane)e.push('lane');if(J.rdo[f.id].obs!==t.obs)e.push('obs');return e.join(',')}).filter(Boolean);
  ok(!bad.length,'estaca inicial, comprimento, largura, espessura (m), sentido, faixa e observação iguais à Calculadora '+bad.slice(0,4).join(' | '));
  const endDiff=J.fres.filter((f,i)=>f.end!==tab[i].fim).length;console.log('estacas finais diferentes da Calculadora:',endDiff);
  ok(new Set(J.fres.map(f=>f.id)).size===J.fres.length&&JSON.stringify(Object.keys(J.rdo))===JSON.stringify(J.fres.map(f=>f.id))&&J.fres.every(f=>/^[0-9a-z]{11}$/.test(f.id)),'ids únicos (11 caracteres como no modelo) e rdo ligado a cada segmento');
  ok(J.fres.some(f=>Math.abs(f.thickness-0.04)<1e-9)&&J.rdo[J.fres[0].id].obs==='Remendo antes da fresagem','espessura alterada (4 cm → 0,04 m) e observação vão no arquivo');
  console.log('sequenciais:',J.fres.map(f=>f.sequential?'S':'·').join(''));
  // importação no próprio Controle de Massa
  const q=await ctx.newPage();q.on('dialog',d=>d.accept());const qerr=[];q.on('pageerror',e=>qerr.push(e.message));
  await q.goto('http://localhost:8772/index.html');await q.waitForTimeout(1500);
  await q.setInputFiles('#import',path);await q.waitForTimeout(1200);
  const S=await q.evaluate(()=>JSON.parse(JSON.stringify({job:S.job,date:S.date,density:S.density,fres:S.fres,rdo:S.rdo,planWidth:S.planWidth,planThickness:S.planThickness,status:document.getElementById('status')&&document.getElementById('status').textContent})));
  console.log('Controle de Massa:',S.status);
  ok(S.fres.length===J.fres.length&&S.job===J.job&&S.date===J.date&&S.density===J.density,`Controle de Massa importou o arquivo: ${S.fres.length} segmentos, obra ${S.job}, ${S.date}`);
  ok(S.fres.every((f,i)=>f.id===J.fres[i].id&&f.start===J.fres[i].start&&f.end===J.fres[i].end&&f.lane===J.fres[i].lane&&f.width===J.fres[i].width&&f.thickness===J.fres[i].thickness&&f.direction===J.fres[i].direction&&f.sequential===J.fres[i].sequential),'segmentos idênticos depois da importação (estacas recalculadas pelo Controle de Massa batem com o arquivo)');
  ok(S.fres.every(f=>S.rdo[f.id]&&S.rdo[f.id].obs===J.rdo[f.id].obs),'observações no RDO do Controle de Massa');
  await q.screenshot({path:`/tmp/claude-0/off/cm_${C.job}.png`});ok(!qerr.length,'Controle de Massa sem erros '+JSON.stringify(qerr.slice(0,2)));await q.close();
  await p.click('#rvClose');await p.waitForTimeout(200);
}
ok(errs.length===0,'sem erros JS '+JSON.stringify(errs.slice(0,3)));console.log(`\n${res.filter(x=>x).length}/${res.length}`);await b.close()})();

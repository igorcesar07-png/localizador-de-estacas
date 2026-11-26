const {chromium}=require('/home/claude/localizador-de-estacas/firebase/node_modules/playwright');const W=ms=>new Promise(r=>setTimeout(r,ms));
const res=[];const ok=(c,n)=>{res.push(!!c);console.log((c?'OK  ':'FALHOU ')+n)};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const ctx=await b.newContext({viewport:{width:1280,height:900}});
await ctx.addInitScript(()=>{const rd={},subs=[];window.__RD=rd;window.RdoDB={subscribe:cb=>{subs.push(cb);setTimeout(()=>cb(Object.values(rd)),50);return()=>{}},save:async(s)=>{rd[s.id]=Object.assign({},s,{enviado_por:'t@x',enviado_em:Date.now()});subs.forEach(cb=>cb(Object.values(rd)))},exists:async id=>!!rd[id],cfg:async()=>({}),setCfg:async()=>{},can:true,admin:false}});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>{errs.push(e.message);console.log('STACK',(e.stack||'').split('\n').slice(0,4).join(' | '))});p.on('dialog',d=>d.accept());await p.route(/(openstreetmap|arcgisonline)/,r=>r.abort());
await p.goto('http://localhost:8772/#rdo');await W(2000);ok(await p.$('#cmRoot .cm-tabs'),'Controle de massa aparece na página RDO');
await p.fill('#cmUsi','60');await p.dispatchEvent('#cmUsi','change');await W(200);
const add=async(ini,len,e)=>{await p.click('#cmRoot [data-cm="add"] >> nth=0');await W(200);await p.fill('#cfIni',ini);await p.fill('#cfLen',String(len));await p.fill('#cfW','3.6');await p.fill('#cfE',String(e));await p.click('#cfBus');await W(100);await p.click('#cmDlg button[type=submit]');await W(300)};
await add('236300',200,6);await add('236,5',100,6);const n=await p.$$eval('#cmRoot .cm-seg',a=>a.length);ok(n===2,'2 panos adicionados (estaca 236300 e 236,5)');
const t1=await p.textContent('#cmRoot');ok(/236\+300/.test(t1)&&/236\+500/.test(t1)&&/236\+600/.test(t1),'estacas inicial e final calculadas');
ok((await p.$$('#cmRoot .cm-in input')).length>=6,'campos de campo por segmento');
// dividir: 130/6 + 20/7.5 + 65/6 = 215 (acréscimo de 15 no final)
await p.click('#cmRoot [data-cm="cut"][data-i="0"]');await W(300);await p.fill('#ctE','6');await p.dispatchEvent('#ctE','change');await W(100);
const setSeg=async(k,len,e)=>{await p.fill(`[data-sk="length"][data-k="${k}"]`,String(len));await p.dispatchEvent(`[data-sk="length"][data-k="${k}"]`,'change');await W(80);await p.fill(`[data-sk="thickness"][data-k="${k}"]`,String(e));await p.dispatchEvent(`[data-sk="thickness"][data-k="${k}"]`,'change');await W(80)};
await setSeg(0,130,6);await p.click('#ctAdd');await W(80);await setSeg(1,20,7.5);await p.click('#ctAdd');await W(80);await setSeg(2,65,6);
const ext=await p.textContent('#cmDlg');ok(/excede 15,00 m/.test(ext),'soma comparada com o projeto (excede 15 m)');await p.click('#ctOk');await W(400);
const rm=await p.evaluate(()=>window.__CM.rmp());console.log(JSON.stringify(rm));ok(rm.length===4&&!rm[0]&&rm[1]&&rm[1].esp&&!rm[1].ext&&rm[2]&&rm[2].ext===15&&!rm[2].esp,'RMP: espessura só no 2º segmento; extensão de 15 m só no último');
// RDO
await p.click('[data-cmtab="rdo"]');await W(200);await p.click('#cmRoot [data-cm="red"][data-i="0"]');await W(200);await p.fill('#cfLen','128');await p.fill('#cfObs','chuva');await p.click('#cmDlg button[type=submit]');await W(300);
ok(/Diferenças RDO × fresagem/.test(await p.textContent('#cmRoot'))&&/▼ −2,00 m/.test(await p.textContent('#cmRoot')),'RDO: diferença campo a campo');
await p.click('#cmRoot [data-cm="rres"][data-i="0"]');await W(200);ok(!/Diferenças RDO/.test(await p.textContent('#cmRoot')),'RDO: restaurar');
// acompanhamento
await p.click('[data-cmtab="aco"]');await W(200);await p.fill('#cmAc','20');await p.dispatchEvent('#cmAc','change');await W(200);
const a1=await p.textContent('#cmRoot');ok(/Falta CBUQ/.test(a1),'acompanhamento: falta CBUQ');
for(let i=0;i<3;i++){await p.check('#cmRoot [data-cmap] >> nth=0');await W(150)}
const a2=await p.textContent('#cmRoot');ok(/Falta: 14,60 t/.test(a2)&&/Aplicados \(3\)/.test(a2),'marcar aplicados muda o saldo');
await p.click('#cmRoot [data-cm="xadd"]');await W(200);await p.fill('#cfIni','237+000');await p.fill('#cfLen','10');await p.fill('#cfW','3');await p.fill('#cfE','5');await p.click('#cmDlg button[type=submit]');await W(300);ok(/extra/.test(await p.textContent('#cmRoot')),'+ Extra');
await p.screenshot({path:'/tmp/claude-0/cm_aco.png'});
// envio
await p.click('[data-cmtab="fres"]');await W(200);{const v=await p.$$eval('#cmRoot .cm-seg',a=>a.map(x=>[x.querySelector('.cm-mass').textContent,x.querySelector('.cm-acc').textContent,x.querySelectorAll('.cm-kv dd').length]));const num=t=>+t.replace(' t','').replace(/\./g,'').replace(',','.');
  let ac=0,okA=true;for(const [m,a] of v){ac+=num(m);if(Math.abs(ac-num(a))>0.02)okA=false}ok(okA&&v.every(x=>x[2]===6),'toneladas do segmento e acumuladas na sequência + 6 campos (estacas, sentido, faixa, solução, serial) '+JSON.stringify(v.slice(-1)))}
ok(!(await p.$('#cmRoot [data-cm="camp"]'))&&!(await p.$('#cmRoot [data-fmot]')),'sem "Marcar executado" e sem motivo no RDO (vai para o Controle de RMPs)');
{const st0=await p.$$eval('#cmRoot .cm-seg',a=>a.map(x=>x.querySelector('.cm-kv dd').textContent));const c=await p.$('#cmRoot .cm-seg[data-i="0"] .cm-sh>span:last-child');const bb=await c.boundingBox();const b1=await (await p.$('#cmRoot .cm-seg[data-i="1"]')).boundingBox();
  await W(800);await p.mouse.move(bb.x+5,bb.y+5);await p.mouse.down();await W(600);ok(await p.$('#cmRoot .cm-seg.cm-drag'),'tocar e segurar destaca o segmento');for(let k=1;k<=10;k++){await p.mouse.move(bb.x+5,bb.y+5+(b1.y+b1.height*0.6-bb.y)*k/10);await W(20)}await p.mouse.up();await W(800);
  const st1=await p.$$eval('#cmRoot .cm-seg',a=>a.map(x=>x.querySelector('.cm-kv dd').textContent));ok(st1[1]===st0[0]&&st1[0]===st0[1],'arrastar para baixo muda a posição na sequência')}
// serial do Kartado: editável no pano e levado ao RDO assinado
await p.click('#cmRoot [data-cm="ed"][data-i="0"]');await W(250);await p.fill('#cfSer','KT-2026-0451');await p.click('#cmDlg button[type=submit]');await W(300);
ok(/KT-2026-0451/.test(await p.textContent('#cmRoot .cm-seg[data-i="0"]')),'serial Kartado informado no pano aparece no cartão');
await p.selectOption('#cmEq','Equipe Pavimentação Johonatan');await p.dispatchEvent('#cmEq','change');await W(300);await p.fill('#cmRoot [data-rel="numero"]','12');await p.fill('#cmRoot [data-rel="eng"]','Eng. Teste');const fillHor=async()=>{for(const el of await p.$$('#cmRoot input[type=time]'))await el.fill('07:00');await W(150)};
await p.click('#cmRoot [data-cm="send"]');await W(700);ok(/Preencha os horários/.test(await p.textContent('#cmMsg'))&&(await p.$$('#cmRoot input.rel-miss')).length===14,'RDO não vai para assinatura sem os horários de início e término de todas as atividades');
await fillHor();ok((await p.$$('#cmRoot input.rel-miss')).length===0,'marca some ao preencher os horários');
await p.click('#cmRoot [data-cm="send"]');await W(2500);
ok(/RDO nº 12 .* gerado/.test(await p.textContent('#cmMsg')),'RDO do dia gerado e enviado para assinatura');{const sg=await p.evaluate(()=>{const r=Object.values(window.__RD||{})[0];return r&&r.segs||null});if(sg)ok(sg.some(x=>x.ser==='KT-2026-0451'),'serial Kartado gravado no RDO enviado (vai para a coluna "Serial Kartado" do PDF)')}
ok((await p.$$eval('#rdList > table > tbody > tr:not(.rd-segs)',a=>a.length))===1,'envio aparece na lista de conferência');
await p.click('[data-cmtab="fres"]');await W(200);await p.screenshot({path:'/tmp/claude-0/cm_fres.png'});
const pm=await b.newPage({viewport:{width:390,height:800}});await pm.goto('http://localhost:8772/#rdo');await W(1500);await pm.screenshot({path:'/tmp/claude-0/cm_mob.png'});
ok(!errs.length,'sem erros JS '+JSON.stringify(errs.slice(0,3)));console.log(`\n${res.filter(Boolean).length}/${res.length}`);await b.close()})();

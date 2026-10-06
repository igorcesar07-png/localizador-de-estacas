// Equivalência funcional: o mesmo roteiro de uso roda nas duas abas (prefixo '' = BR-277 B2+B3, 'b4_' = BR-373 B4)
const {chromium}=require('playwright');const fs=require('fs');
const B4=JSON.parse(fs.readFileSync('b4/data_b4.json','utf8'));const R08=JSON.parse(fs.readFileSync('data.json','utf8'));
const at=(D,nm,dm=0)=>{const i=D.rows.findIndex(r=>r[0]===nm);const a=D.rows[i],b=D.rows[i+1],t=dm/20;return {latitude:(a[1]+(b[1]-a[1])*t)/1e5,longitude:(a[2]+(b[2]-a[2])*t)/1e5,accuracy:4}};
const PORT=process.env.PORT||8765;
async function roteiro(b,page,P,D,stk,saidaStk){
  const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,permissions:['geolocation'],geolocation:at(D,stk,6)});
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.route('**/cdnjs.cloudflare.com/**',r=>r.fulfill({body:fs.readFileSync('package/dist/leaflet.js'),contentType:'application/javascript'}));
  await p.route(/(jsdelivr|fonts\.g|openstreetmap|arcgisonline)/,r=>r.abort());
  await p.goto(`http://localhost:${PORT}/#${page}`);await p.waitForTimeout(2000);const $=id=>'#'+P+id;const res={};
  const tool=async id=>{if(await p.getAttribute($('toolTab'),'aria-expanded')!=='true')await p.click($('toolTab'));await p.waitForTimeout(250);await p.click($(id));await p.waitForTimeout(400)};
  res.ferramentas=await p.$$eval($('tools')+' .trow',a=>a.map(x=>x.id.replace(/^b4_/,'')).join(','));
  await tool('gpsBtn');await p.waitForTimeout(2200);res.gps=await p.textContent($('modeTxt'));
  res.estaca=(await p.textContent($('big'))).replace(/\s/g,'');res.precisao=await p.textContent($('eAcc'));
  res.grupos=await p.locator($('groups')+' .grp').count();res.celulas=await p.locator($('xs')+' .cell').count();
  res.unifilar=await p.evaluate(id=>{const c=document.querySelector(id);const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i])n++;return n>500},$('reti'));
  await tool('baseBtn');res.fundo=await p.textContent($('baseTxt'));
  await tool('posBtn');res.posicionamento=/Probabilidade por estaca/.test(await p.textContent($('imBody')));await p.click($('imClose'));
  await p.evaluate(m=>window[m].setBearing&&window[m].setBearing(30),P?'__mapB4':'__map');await p.waitForTimeout(300);res.rotacao=await p.textContent($('bearTxt'));
  await tool('northBtn2');res.norte=await p.textContent($('bearTxt'));
  await tool('followBtn');res.seguir=await p.getAttribute($('followBtn'),'aria-pressed');
  await tool('centerBtn');
  // pano pelo painel, estaca pelo mapa, saída de dreno
  await p.evaluate(id=>document.querySelector(id+' .item').click(),$('groups'));await p.waitForTimeout(300);
  res.pano=(await p.textContent($('imTitle'))).replace(/\s+/g,' ').slice(0,40);await p.click($('imClose'));
  await p.evaluate(id=>document.querySelector(id+' .cell:not(.empty)').click(),$('xs'));await p.waitForTimeout(300);res.celulaAbrePano=!(await p.isHidden($('infoModal')));await p.click($('imClose'));
  // desliga GPS e consulta estaca pela busca; abre a estaca e a saída pelo código da própria aba
  await tool('gpsBtn');await tool('searchBtn');await p.fill($('q'),saidaStk);await p.press($('q'),'Enter');await p.waitForTimeout(1200);res.busca=(await p.textContent($('big'))).replace(/\s/g,'');
  res.saidaNoPainel=/Saída de dreno nesta estaca/.test(await p.textContent($('groups')));
  // toque no mapa simula posição
  const box=await p.locator($('map')).boundingBox();await p.mouse.click(box.x+box.width-60,box.y+150);await p.waitForTimeout(600);if(!(await p.isHidden($('infoModal'))))await p.click($('imClose'));res.toqueSimula=await p.textContent($('modeTxt'));
  // painel: arrastar/abrir, filtros
  await p.click($('grab'));await p.waitForTimeout(500);res.painelAberto=await p.evaluate(id=>!document.querySelector(id).classList.contains('collapsed'),$('panel'));
  await p.click($('tabF'));await p.waitForTimeout(300);
  await p.click($('fSent')+' [data-k="C"]');await p.waitForTimeout(300);res.filtroSentido=await p.textContent($('fcnt'));
  await p.click($('solNone'));await p.waitForTimeout(300);res.nenhuma=await p.evaluate(id=>[...document.querySelectorAll(id+' .pill')].every(b=>b.getAttribute('aria-pressed')==='false'),$('fSol'));
  await p.click($('solAll'));await p.click($('faixaAll'));await p.click($('fSent')+' [data-k="ALL"]');await p.waitForTimeout(300);res.limpo=await p.textContent($('fcnt'))===''?'sem filtros':'filtros ativos';
  await p.fill($('acc'),'12');await p.dispatchEvent($('acc'),'input');res.simPrecisao=await p.textContent($('accTxt'));
  await p.screenshot({path:`eq_${P||'b2b3'}.png`});
  res.erros=errs.length;await ctx.close();return res}
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const s277=R08.rows.find(r=>r[7][3]==='o')[0],s373=B4.rows.find(r=>r[7][3]==='o')[0];
  const A=await roteiro(b,'mapa','',R08,'186+140',s277);const B=await roteiro(b,'mapab4','b4_',B4,'230+680',s373);
  const rows=Object.keys(A).map(k=>[k,JSON.stringify(A[k]),JSON.stringify(B[k])]);
  let txt='Recurso | BR-277 B2+B3 | BR-373 B4\n'+rows.map(r=>r.join(' | ')).join('\n');console.log(txt);fs.writeFileSync('tb4eq-report.txt',txt);await b.close()})();

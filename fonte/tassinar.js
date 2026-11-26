// Página pública de assinaturas (assinar.html) com o Firestore simulado na rede: página pessoal (?p=) e link direto (?t=)
const {chromium}=require('/home/claude/localizador-de-estacas/firebase/node_modules/playwright');const W=ms=>new Promise(r=>setTimeout(r,ms));
const res=[];const ok=(c,n)=>{res.push(!!c);console.log((c?'OK  ':'FALHOU ')+n)};
const PID='a'.repeat(32),TE='e'.repeat(32),TC='c'.repeat(32),TF='f'.repeat(32);
const DB={};const put=(c,id,o)=>{DB[c+'/'+id]=o};
const RS={numero:'501',data:'2026-11-26',obra:'BR-277',equipe:'Equipe Pavimentação Johonatan',n:3,usinado:30,aplicado:28.5,sobra:1.5};
put('assinantes',PID,{id:PID,nome:'Bruno',funcao:'Encarregado',papel:'enc',ativo:true,docs:[TC]});
put('rdo_assin',TE,{tok:TE,papel:'eng',nome:'Ana',status:'pendente',dep:null,envio:'r1',tipo:'RDO',resumo:RS});
put('rdo_assin',TC,{tok:TC,papel:'enc',nome:'Bruno',status:'pendente',dep:TE,envio:'r1',tipo:'RDO',resumo:RS,pessoa:PID});
// valores no formato REST do Firestore
const enc=v=>v===null||v===undefined?{nullValue:null}:typeof v==='string'?{stringValue:v}:typeof v==='boolean'?{booleanValue:v}:Number.isInteger(v)?{integerValue:String(v)}:typeof v==='number'?{doubleValue:v}:Array.isArray(v)?{arrayValue:{values:v.map(enc)}}:{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,enc(x)]))}};
const dec=f=>'stringValue' in f?f.stringValue:'integerValue' in f?+f.integerValue:'doubleValue' in f?f.doubleValue:'booleanValue' in f?f.booleanValue:'nullValue' in f?null:'arrayValue' in f?(f.arrayValue.values||[]).map(dec):'mapValue' in f?Object.fromEntries(Object.entries(f.mapValue.fields||{}).map(([k,x])=>[k,dec(x)])):null;
const T='2026-11-26T19:00:00.000000Z';const writes=[];
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const ctx=await b.newContext({viewport:{width:430,height:900}});
await ctx.route(/firebase-config\.js/,r=>r.fulfill({contentType:'application/javascript',body:'window.FIREBASE_CONFIG={apiKey:"x",projectId:"demo-t",appId:"1:1:web:1",authDomain:"x"};'}));
await ctx.route(/firestore\.googleapis\.com/,async r=>{const u=r.request().url(),body=JSON.parse(r.request().postData()||'{}');
  if(/:batchGet/.test(u)){const out=(body.documents||[]).map(n=>{const k=n.split('/documents/')[1];const o=DB[k];return o?{found:{name:n,fields:enc(o).mapValue.fields,createTime:T,updateTime:T},readTime:T}:{missing:n,readTime:T}});return r.fulfill({contentType:'application/json',body:JSON.stringify(out)})}
  if(/:commit/.test(u)){for(const w of body.writes||[]){const k=w.update.name.split('/documents/')[1];const f=dec({mapValue:{fields:w.update.fields}});writes.push([k,f,(w.updateMask||{}).fieldPaths]);
      // regras: mesma checagem de ordem do servidor (encarregado só depois do engenheiro)
      const cur=DB[k]||{};if(k.startsWith('rdo_assin/')&&cur.dep&&DB['rdo_assin/'+cur.dep].status!=='assinado')return r.fulfill({status:403,contentType:'application/json',body:JSON.stringify({error:{code:403,message:'Missing or insufficient permissions.',status:'PERMISSION_DENIED'}})});
      DB[k]=Object.assign({},cur,f)}
    return r.fulfill({contentType:'application/json',body:JSON.stringify({writeResults:(body.writes||[]).map(()=>({updateTime:T})),commitTime:T})})}
  return r.fulfill({status:404,body:'{}'})});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
const draw=async()=>{const c=await p.$('#cv');const bb=await c.boundingBox();await p.mouse.move(bb.x+30,bb.y+40);await p.mouse.down();for(let i=1;i<12;i++)await p.mouse.move(bb.x+30+i*20,bb.y+40+(i%2)*30);await p.mouse.up()};
// 1º acesso pela página pessoal: cadastro
await p.goto(`http://localhost:8772/assinar.html?p=${PID}`);await p.waitForSelector('#sv',{timeout:15000});ok(/Cadastro para assinaturas/.test(await p.textContent('h1')),'1º acesso pede o cadastro (nome completo, função, assinatura padrão)');
await p.click('#sv');await W(200);ok(/nome completo/i.test(await p.textContent('#em')),'exige nome completo');
await p.fill('#nm','Bruno Carvalho Lima');await p.fill('#fn','Encarregado de obras');await p.click('#sv');await W(200);ok(/assinatura padrão/.test(await p.textContent('#em')),'exige a assinatura padrão');
await draw();await p.click('#sv');await p.waitForSelector('#lp .am, #lp ul',{timeout:10000});await W(300);
const P=DB['assinantes/'+PID];ok(P.nome==='Bruno Carvalho Lima'&&P.funcao==='Encarregado de obras'&&/^data:image\/png/.test(P.assinatura)&&P.perfil_em>0,'cadastro salvo (nome, função e assinatura padrão)');
ok(/Nenhuma assinatura pendente/.test(await p.textContent('#lp'))&&/RDO 501/.test(await p.textContent('#la')),'RDO do encarregado em "aguardando" enquanto o engenheiro não assina');
await p.screenshot({path:'/tmp/claude-0/ass_portal1.png',fullPage:true});
// engenheiro assina → libera
DB['rdo_assin/'+TE].status='assinado';DB['rdo_assin/'+TE].assinado_nome='Ana Souza';DB['rdo_assin/'+TE].assinado_em=Date.now();
await p.reload();await p.waitForSelector('#lp [data-open]',{timeout:10000});ok(/RDO 501/.test(await p.textContent('#lp')),'depois do engenheiro, o RDO aparece em "Para assinar"');
await p.click('#lp [data-open]');await p.waitForSelector('#go');ok(/Bruno Carvalho Lima/.test(await p.textContent('#sig'))&&!!(await p.$('#sd img.asig')),'abre o RDO com a assinatura padrão pronta');
await p.screenshot({path:'/tmp/claude-0/ass_doc.png',fullPage:true});
await p.click('#go');await W(200);ok(/Confirme/.test(await p.textContent('#em')),'exige confirmar a leitura');await p.check('#ok');await p.click('#go');await p.waitForSelector('#sig .am.ok',{timeout:10000});
const C=DB['rdo_assin/'+TC];ok(C.status==='assinado'&&C.assinado_nome==='Bruno Carvalho Lima'&&C.assinado_funcao==='Encarregado de obras'&&C.assinatura===P.assinatura,'assinado com nome, função e assinatura padrão');
await p.click('#bk2');await p.waitForSelector('#ls ul',{timeout:10000});ok(/RDO 501/.test(await p.textContent('#ls'))&&/Nenhuma assinatura pendente/.test(await p.textContent('#lp')),'volta para a página: RDO em "Assinados"');
// link direto antigo continua funcionando
put('rdo_assin',TF,{tok:TF,papel:'fis',nome:'Carla',status:'pendente',dep:TE,envio:'r1',resumo:RS});
await p.goto(`http://localhost:8772/assinar.html?t=${TF}`);await p.waitForSelector('#go',{timeout:10000});await p.fill('#nm','Carla Fiscal');await draw();await p.check('#ok');await p.click('#go');await p.waitForSelector('#sig .am.ok',{timeout:10000});
ok(DB['rdo_assin/'+TF].status==='assinado','link direto (?t=) continua assinando como antes');
await p.goto(`http://localhost:8772/assinar.html?p=${'0'.repeat(32)}`);await W(1500);ok(/não existe/.test(await p.textContent('#as')),'endereço inexistente avisa');
ok(!errs.length,'sem erros JS '+JSON.stringify(errs.slice(0,3)));console.log(`\n${res.filter(Boolean).length}/${res.length}`);await b.close()})();

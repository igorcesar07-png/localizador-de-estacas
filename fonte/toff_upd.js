const {chromium}=require('/home/claude/localizador-de-estacas/firebase/node_modules/playwright');const fs=require('fs');
const ok=(c,n)=>console.log((c?'OK  ':'FALHOU ')+n);
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const ctx=await b.newContext();const p=await ctx.newPage();
await p.goto('http://localhost:8772/index.html');await p.evaluate(async()=>{await navigator.serviceWorker.register('sw.js');await navigator.serviceWorker.ready});await p.waitForTimeout(1500);
const f='/tmp/claude-0/off/pub2/index.html';fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace('<meta charset="utf-8">','<meta charset="utf-8"><meta name="nova" content="1">'));
await p.reload();await p.waitForTimeout(1000);ok(await p.evaluate(()=>!!document.querySelector('meta[name=nova]')),'com internet: a página vem do servidor (versão nova entra)');
await ctx.setOffline(true);await p.reload();await p.waitForTimeout(1000);ok(await p.evaluate(()=>!!document.querySelector('meta[name=nova]')),'sem internet: abre a última versão guardada');
await b.close()})();

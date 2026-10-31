// App sem internet: na instalação o aparelho guarda o app inteiro (páginas, código, bibliotecas e fontes).
// Abre do aparelho na hora; com internet, a página principal é conferida no servidor (versão nova entra no próximo acesso).
// Login e banco de dados nunca passam por aqui (o banco tem a própria fila offline).
const C='estacas-app-20261031012656';
const CORE=["./", "index.html", "app.js?v=20261031012656", "auth.js?v=20261031012656", "native.js?v=20261031012656", "firebase-config.js?v=20261031012656", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png", "logo_neovia.png", "logo_via.png"];
const LIBS=["lib/barlow-condensed-latin-500-normal.woff2", "lib/barlow-condensed-latin-600-normal.woff2", "lib/barlow-condensed-latin-700-normal.woff2", "lib/barlow-latin-400-normal.woff2", "lib/barlow-latin-500-normal.woff2", "lib/barlow-latin-600-normal.woff2", "lib/barlow-latin-700-normal.woff2", "lib/fonts.css", "lib/jspdf.plugin.autotable.min.js", "lib/jspdf.umd.min.js", "lib/leaflet-rotate-src.js", "lib/leaflet.js", "lib/pdf.min.js", "lib/pdf.worker.min.js", "lib/xlsx.full.min.js"];
const TILE=/tile\.openstreetmap|arcgisonline/;
const EXT=/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com/;
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(async c=>{await c.addAll(CORE.map(u=>new Request(u,{cache:'reload'})));
  await Promise.all(LIBS.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})))}).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C&&k!=='tiles277').map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
const put=(r,x)=>{if(x&&(x.ok||x.type==='opaque')){const cp=x.clone();caches.open(C).then(c=>c.put(r,cp))}return x};
const timeout=(p,ms)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms))]);
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(TILE.test(u.host)){e.respondWith(caches.open('tiles277').then(async c=>{const hit=await c.match(r);if(hit)return hit;try{const x=await fetch(r);if(x.ok||x.type==='opaque')c.put(r,x.clone());return x}catch(_){return new Response('',{status:504})}}));return}
  const same=u.origin===self.location.origin;
  if(same&&(u.pathname.startsWith('/__/')||u.pathname.startsWith('/app-bundle/')))return; // login do Firebase e pacote do app Android: sempre na rede
  if(!same&&!EXT.test(u.host))return;              // Firestore, Auth etc.: direto na rede
  const page=same&&(r.mode==='navigate'||u.pathname==='/'||u.pathname.endsWith('/index.html'));
  if(page){e.respondWith(timeout(fetch(u.href,{cache:'no-store',credentials:'same-origin'}),4000).then(x=>put(new Request('index.html'),x)).catch(()=>caches.match('index.html').then(x=>x||caches.match('./'))));return}
  // demais arquivos: do aparelho; se faltar, busca e guarda
  e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(x=>put(r,x)).catch(()=>same?new Response('',{status:504}):undefined)))});

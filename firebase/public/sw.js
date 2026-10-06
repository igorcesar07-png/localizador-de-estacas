// cache só do app e das bibliotecas; nunca dos serviços de login e banco de dados
const C='estacas277-fb-20261006224200';
const LIB=/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com/;
const TILE=/tile\.openstreetmap|arcgisonline/;
self.addEventListener('install',e=>{self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C&&k!=='tiles277').map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(TILE.test(u.host)){e.respondWith(caches.open('tiles277').then(async c=>{const hit=await c.match(r);if(hit)return hit;try{const x=await fetch(r);if(x.ok||x.type==='opaque')c.put(r,x.clone());return x}catch(_){return new Response('',{status:504})}}));return}
  const same=u.origin===self.location.origin;
  if(same&&u.pathname.startsWith('/__/'))return; // páginas internas do login do Firebase
  if(!same&&!LIB.test(u.host))return;              // Firestore, Auth etc.: sempre direto na rede
  e.respondWith(fetch(r,same?{cache:'no-store'}:undefined).then(x=>{if(x.ok){const cp=x.clone();caches.open(C).then(c=>c.put(r,cp))}return x}).catch(()=>caches.match(r).then(x=>x||(same?caches.match('/index.html'):undefined))))});

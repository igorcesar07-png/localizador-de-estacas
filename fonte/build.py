import json
t=open('app.template.html',encoding='utf-8').read()
css=open('package/dist/leaflet.css').read()
data=open('data.json').read()
import base64
b64=lambda f:'data:image/png;base64,'+base64.b64encode(open(f,'rb').read()).decode()
import datetime
VER=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3))).strftime('%d/%m/%Y %H:%M')
body=t.replace('/*__VERSION__*/',VER).replace('/*__LEAFLET_CSS__*/',css).replace('/*__DATA__*/',data).replace('/*__LOGO_NEOVIA__*/',b64('logo_neovia.png')).replace('/*__LOGO_VIA__*/',b64('logo_via.png'))
open('estacas-br277.html','w').write(body)
import os
os.makedirs('site',exist_ok=True)
head='''<!doctype html>
<html lang="pt-BR" data-pwa="1">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Estacas">
<meta name="theme-color" content="#1A1E1C">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icon-180.png">
<style>*,*::before,*::after{box-sizing:border-box}body{margin:0}[hidden]{display:none!important}</style>
'''
b2=body.replace('<div id="app">','</head>\n<body>\n<div id="app">',1)
open('site/index.html','w').write(head+b2+'\n</body>\n</html>\n')
json.dump({"name":"Localizador de Estacas","short_name":"Estacas","start_url":"./","display":"standalone","background_color":"#1A1E1C","theme_color":"#1A1E1C",
 "icons":[{"src":"icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icon-512.png","sizes":"512x512","type":"image/png"}]},open('site/manifest.webmanifest','w'),ensure_ascii=False)
open('site/sw.js','w').write('''const C='estacas277-v7';
const CORE=['./','index.html','manifest.webmanifest','icon-192.png','https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js','https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js','https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C&&k!=='tiles277').map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const u=e.request.url;if(e.request.method!=='GET')return;
  const tile=/tile\\.openstreetmap|arcgisonline/.test(u);
  if(tile){e.respondWith(caches.open('tiles277').then(async c=>{const hit=await c.match(e.request);if(hit)return hit;try{const r=await fetch(e.request);if(r.ok||r.type==='opaque')c.put(e.request,r.clone());return r}catch(x){return new Response('',{status:504})}}));return}
  const same=new URL(u).origin===self.location.origin;
  e.respondWith(fetch(e.request,same?{cache:'no-store'}:undefined).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))));
});
''')
from PIL import Image,ImageDraw,ImageFont
for s in (180,192,512):
  im=Image.new('RGB',(s,s),'#1A1E1C');d=ImageDraw.Draw(im)
  w=s*0.07
  for k in range(4):
    y0=s*(0.12+k*0.21);d.rectangle([s/2-w/2,y0,s/2+w/2,y0+s*0.12],fill='#F2B705')
  r=s*0.13;d.ellipse([s*0.68-r,s*0.5-r,s*0.68+r,s*0.5+r],fill='#1A73E8',outline='white',width=max(2,int(s*0.025)))
  im.save(f'site/icon-{s}.png')
print('ok',os.path.getsize('estacas-br277.html'))

# Gera firebase/public: app sem a base do projeto embutida (a base vem do Firestore depois do login)
import re,os,shutil,json,subprocess,datetime,base64
import os;W=os.environ.get('W',os.path.dirname(os.path.abspath(__file__)));REPO=os.path.dirname(W);OUT=REPO+'/firebase/public'
os.makedirs(OUT,exist_ok=True)
import sys;sys.path.insert(0,W+'/b4')
from b4build import add_b4
t=add_b4(open(W+'/app.template.html',encoding='utf-8').read())
css=open(W+'/package/dist/leaflet.css').read()
b64=lambda f:'data:image/png;base64,'+base64.b64encode(open(W+'/'+f,'rb').read()).decode()
VER=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3))).strftime('%d/%m/%Y %H:%M')
BUILD=datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')
body=t.replace('/*__VERSION__*/',VER).replace('/*__LEAFLET_CSS__*/',css).replace('/*__LOGO_NEOVIA__*/',b64('logo_neovia.png')).replace('/*__LOGO_VIA__*/',b64('logo_via.png'))
m=re.search(r'<script>\nconst PROJECT_DATA = /\*__DATA__\*/;(.*?)</script>',body,re.S)
assert m
g=m.group(1)
assert g.count('const PROJECT_DATA_B4 = /*__DATA_B4__*/;')==1
app_js='const PROJECT_DATA = window.PROJECT_DATA;'+g.replace('const PROJECT_DATA_B4 = /*__DATA_B4__*/;','const PROJECT_DATA_B4 = window.PROJECT_DATA_B4||null;')
shell=body[:m.start()]+f'<script>window.APP_BUILD="{BUILD}";</script>\n<script src="native.js?v={BUILD}"></script>\n<script src="firebase-config.js?v={BUILD}"></script>\n<script src="auth.js?v={BUILD}"></script>'+body[m.end():]
assert '/*__DATA__*/' not in shell and 'rows' not in shell[:0]
# app sem internet: as bibliotecas e as fontes vão junto com o app (mesmas versões que vinham do CDN)
LIBMAP={'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js':'lib/leaflet.js',
  'https://cdn.jsdelivr.net/npm/leaflet-rotate@0.2.8/dist/leaflet-rotate-src.js':'lib/leaflet-rotate-src.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js':'lib/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js':'lib/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js':'lib/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/':'lib/'}
for a,b in LIBMAP.items():shell=shell.replace(a,b);app_js=app_js.replace(a,b)
shell=shell.replace('<link rel="preconnect" href="https://fonts.googleapis.com">\n','').replace('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@500;600;700&display=swap">','<link rel="stylesheet" href="lib/fonts.css">')
assert 'cdnjs.cloudflare' not in shell+app_js and 'cdn.jsdelivr' not in shell+app_js and 'fonts.googleapis' not in shell,'URL de CDN que não foi trocada'
os.makedirs(OUT+'/lib',exist_ok=True)
VEND=sorted(os.listdir(W+'/vendor'))
for f in VEND:shutil.copy(W+'/vendor/'+f,OUT+'/lib/'+f)
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
<meta name="robots" content="noindex,nofollow">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icon-180.png">
<style>*,*::before,*::after{box-sizing:border-box}body{margin:0}[hidden]{display:none!important}</style>
'''
open(OUT+'/index.html','w').write(head+shell+'\n</body>\n</html>\n')
open(OUT+'/app.js','w').write(app_js)
for f in ['icon-180.png','icon-192.png','icon-512.png']:shutil.copy(W+'/site/'+f,OUT+'/'+f)
shutil.copy(W+'/logo_neovia.png',OUT+'/logo_neovia.png');shutil.copy(W+'/logo_via.png',OUT+'/logo_via.png')
json.dump({"name":"Localizador de Estacas","short_name":"Estacas","start_url":"./","display":"standalone","background_color":"#1A1E1C","theme_color":"#1A1E1C",
 "icons":[{"src":"icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icon-512.png","sizes":"512x512","type":"image/png"}]},open(OUT+'/manifest.webmanifest','w'),ensure_ascii=False)
CORE=['./','index.html',f'app.js?v={BUILD}',f'auth.js?v={BUILD}',f'native.js?v={BUILD}',f'firebase-config.js?v={BUILD}','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png','logo_neovia.png','logo_via.png']
open(OUT+'/sw.js','w').write('''// App sem internet: na instalação o aparelho guarda o app inteiro (páginas, código, bibliotecas e fontes).
// Abre do aparelho na hora; com internet, a página principal é conferida no servidor (versão nova entra no próximo acesso).
// Login e banco de dados nunca passam por aqui (o banco tem a própria fila offline).
const C='estacas-app-%s';
const CORE=%s;
const LIBS=%s;
const TILE=/tile\\.openstreetmap|arcgisonline/;
const EXT=/cdnjs\\.cloudflare\\.com|cdn\\.jsdelivr\\.net|fonts\\.(googleapis|gstatic)\\.com/;
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
''' % (BUILD,json.dumps(CORE),json.dumps(['lib/'+f for f in VEND])))
if not os.path.exists(OUT+'/firebase-config.js'):
    open(OUT+'/firebase-config.js','w').write('// gerado na publicação (GitHub Actions)\nwindow.FIREBASE_CONFIG=null;\n')
r=subprocess.run(['npm','run','-s','bundle'],capture_output=True,text=True,cwd=REPO+'/firebase')
r2=subprocess.run(['../firebase/node_modules/.bin/esbuild','native.src.js','--bundle','--minify','--format=iife','--target=es2019','--legal-comments=none','--outfile=../firebase/public/native.js'],cwd=REPO+'/mobile',capture_output=True,text=True);print(r2.stderr[-400:])
print(r.stdout,r.stderr[-800:]);print('ok',VER,BUILD,os.path.getsize(OUT+'/index.html'),os.path.getsize(OUT+'/app.js'),os.path.getsize(OUT+'/auth.js'))

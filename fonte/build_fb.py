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
open(OUT+'/sw.js','w').write('''// cache só do app e das bibliotecas; nunca dos serviços de login e banco de dados
const C='estacas277-fb-%s';
const LIB=/cdnjs\\.cloudflare\\.com|cdn\\.jsdelivr\\.net|fonts\\.(googleapis|gstatic)\\.com/;
const TILE=/tile\\.openstreetmap|arcgisonline/;
self.addEventListener('install',e=>{self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C&&k!=='tiles277').map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(TILE.test(u.host)){e.respondWith(caches.open('tiles277').then(async c=>{const hit=await c.match(r);if(hit)return hit;try{const x=await fetch(r);if(x.ok||x.type==='opaque')c.put(r,x.clone());return x}catch(_){return new Response('',{status:504})}}));return}
  const same=u.origin===self.location.origin;
  if(same&&u.pathname.startsWith('/__/'))return; // páginas internas do login do Firebase
  if(!same&&!LIB.test(u.host))return;              // Firestore, Auth etc.: sempre direto na rede
  e.respondWith(fetch(r,same?{cache:'no-store'}:undefined).then(x=>{if(x.ok){const cp=x.clone();caches.open(C).then(c=>c.put(r,cp))}return x}).catch(()=>caches.match(r).then(x=>x||(same?caches.match('/index.html'):undefined))))});
''' % BUILD)
if not os.path.exists(OUT+'/firebase-config.js'):
    open(OUT+'/firebase-config.js','w').write('// gerado na publicação (GitHub Actions)\nwindow.FIREBASE_CONFIG=null;\n')
r=subprocess.run(['npm','run','-s','bundle'],capture_output=True,text=True,cwd=REPO+'/firebase')
r2=subprocess.run(['../firebase/node_modules/.bin/esbuild','native.src.js','--bundle','--minify','--format=iife','--target=es2019','--legal-comments=none','--outfile=../firebase/public/native.js'],cwd=REPO+'/mobile',capture_output=True,text=True);print(r2.stderr[-400:])
print(r.stdout,r.stderr[-800:]);print('ok',VER,BUILD,os.path.getsize(OUT+'/index.html'),os.path.getsize(OUT+'/app.js'),os.path.getsize(OUT+'/auth.js'))

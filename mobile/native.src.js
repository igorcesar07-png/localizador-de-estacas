// Ponte com os recursos nativos do app Android/iOS (Capacitor). No navegador não faz nada.
import {Capacitor,registerPlugin} from '@capacitor/core';

if(Capacitor.isNativePlatform()){
  const Share=registerPlugin('Share'),Filesystem=registerPlugin('Filesystem'),Media=registerPlugin('Media'),FA=registerPlugin('FirebaseAuthentication');
  const b64=blob=>new Promise((ok,bad)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(',')[1]);r.onerror=()=>bad(r.error);r.readAsDataURL(blob)});
  const N=window.NATIVE={platform:Capacitor.getPlatform()};
  document.documentElement.classList.add('native-app');

  // compartilhar/salvar arquivos (PDF, Excel, planilha, fotos): grava no cache do app e abre a folha de compartilhamento do sistema
  navigator.canShare=o=>!!(o&&o.files&&o.files.length);
  navigator.share=async o=>{
    const uris=[];
    for(const f of (o&&o.files)||[]){
      const name=String(f.name||'arquivo').replace(/[^\w.\-]+/g,'_');
      const r=await Filesystem.writeFile({path:`share/${Date.now()}_${name}`,data:await b64(f),directory:'CACHE',recursive:true});
      uris.push(r.uri);
    }
    try{await Share.share({title:(o&&o.title)||'',files:uris,dialogTitle:(o&&o.title)||'Salvar ou enviar'})}
    catch(e){const m=String((e&&e.message)||e);if(/cancel/i.test(m)){const a=new Error('Cancelado');a.name='AbortError';throw a}throw e}
  };

  // galeria do aparelho: álbum próprio "Localizador Estacas"
  const ALBUM='Localizador Estacas';let albumId=null;
  async function album(){
    if(albumId)return albumId;
    let base='';try{base=(await Media.getAlbumsPath()).path||''}catch(e){}
    const find=async()=>((await Media.getAlbums()).albums||[]).find(a=>a.name===ALBUM&&(!base||String(a.identifier).startsWith(base)));
    let a=await find();
    if(!a){await Media.createAlbum({name:ALBUM});a=await find()}
    if(!a)throw new Error('não foi possível criar o álbum');
    return albumId=a.identifier;
  }
  N.saveToGallery=async(blob,name)=>{
    const id=await album();
    await Media.savePhoto({path:'data:image/jpeg;base64,'+await b64(blob),albumIdentifier:id,fileName:String(name||'foto').replace(/\.jpe?g$/i,'')});
    return true;
  };

  // login Google nativo (o Google não permite o login pela página dentro de apps)
  N.googleIdToken=async()=>{
    const r=await FA.signInWithGoogle({skipNativeAuth:true});
    const t=r&&r.credential&&r.credential.idToken;
    if(!t)throw new Error('o login Google não retornou a credencial');
    return t;
  };
  N.googleSignOut=()=>FA.signOut().catch(()=>{});

  // ── atualização automática do app (telas e funções) sem reinstalar o APK ──
  // version.json e o pacote .zip são publicados junto com o site no Firebase Hosting.
  const UPDATE_URL='https://localizador-estacas.web.app/app-bundle/version.json';
  const UP=registerPlugin('CapacitorUpdater');
  const hasUP=Capacitor.isPluginAvailable('CapacitorUpdater');
  const toast=(html,ms)=>{let t=document.getElementById('nUpd');if(!t){t=document.createElement('div');t.id='nUpd';
      t.style.cssText='position:fixed;left:12px;right:12px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:99999;background:#1f2a24;color:#fff;border:1px solid #3c4a42;border-radius:12px;padding:12px 14px;font:14px/1.4 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.4)';
      document.body.appendChild(t)}
    t.innerHTML=html;t.hidden=false;clearTimeout(toast.h);if(ms)toast.h=setTimeout(()=>t.hidden=true,ms);return t};
  // só confirma que a versão nova abriu bem quando o app (ou a tela de login) realmente aparece; senão volta à anterior sozinho
  if(hasUP){const t0=Date.now();const ready=setInterval(()=>{if(window.__appStarted||document.getElementById('gate')){clearInterval(ready);UP.notifyAppReady().catch(()=>{})}else if(Date.now()-t0>18000)clearInterval(ready)},400)}
  // aviso de versão aplicada
  try{const last=localStorage.getItem('br277.nativeBuild');if(last&&last!==window.APP_BUILD)setTimeout(()=>toast('✓ App atualizado para a versão mais recente.',4000),2500);localStorage.setItem('br277.nativeBuild',window.APP_BUILD||'')}catch(e){}
  let checking=false,lastCheck=0,staged=null;
  async function checkUpdate(){
    if(checking||!navigator.onLine||Date.now()-lastCheck<10*60*1000)return;checking=true;lastCheck=Date.now();
    try{
      const v=await (await fetch(UPDATE_URL+'?t='+Date.now(),{cache:'no-store'})).json();
      if(!v||!v.build||v.build===window.APP_BUILD||v.build===staged)return;
      const miss=(v.requires||[]).filter(p=>!Capacitor.isPluginAvailable(p));
      if(!hasUP||miss.length){ // a versão nova precisa de recursos nativos que este APK não tem
        const t=toast(`<b>Nova versão do app disponível.</b><br>Esta atualização precisa reinstalar o aplicativo (seus dados e fotos continuam).<div style="display:flex;gap:8px;margin-top:10px"><button id="nUpdGo" style="flex:1;background:#f5b400;color:#111;border:0;border-radius:9px;padding:10px;font-weight:700">Baixar e instalar</button><button id="nUpdNo" style="background:transparent;color:#ccc;border:1px solid #556;border-radius:9px;padding:10px 14px">Depois</button></div>`);
        t.querySelector('#nUpdGo').onclick=()=>{location.href=v.apk};t.querySelector('#nUpdNo').onclick=()=>{t.hidden=true};return}
      const list=((await UP.list()).bundles||[]);
      let b=list.find(x=>x.version===v.build&&x.status!=='error');
      if(!b)b=await UP.download({url:v.url,version:v.build,checksum:v.sha256});
      await UP.next({id:b.id});staged=v.build;
      toast('Atualização do app baixada. Ela será aplicada quando você sair e voltar ao aplicativo.',6000);
    }catch(e){console.log('atualização não verificada: '+((e&&e.message)||e))}
    finally{checking=false}
  }
  N.checkUpdate=()=>{lastCheck=0;return checkUpdate()};
  setTimeout(checkUpdate,6000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkUpdate()});
  window.addEventListener('online',()=>checkUpdate());
  console.log('NATIVE pronto: '+N.platform+' build '+window.APP_BUILD);
}

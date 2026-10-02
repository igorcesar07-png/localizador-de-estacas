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
  console.log('NATIVE pronto: '+N.platform);
}

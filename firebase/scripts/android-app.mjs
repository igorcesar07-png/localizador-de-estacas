// Registra o app Android no projeto Firebase (se faltar), cadastra a impressão digital da chave de assinatura
// (necessária para o login Google nativo) e grava o google-services.json.
// Uso: node scripts/android-app.mjs <projectId> <pacote> <sha1> <sha256> <saída>
import {execSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const [pj,pkg,sha1,sha256,out]=process.argv.slice(2);
const fb=a=>{const t=execSync(`npx firebase ${a} --project ${pj} --json`,{encoding:'utf8'});return JSON.parse(t)};
let apps=fb('apps:list ANDROID').result||[];
let app=apps.find(a=>a.packageName===pkg);
if(!app){console.log('criando app Android',pkg);fb(`apps:create ANDROID "Localizador de Estacas (Android)" --package-name ${pkg}`);
  for(let i=0;i<10&&!app;i++){apps=fb('apps:list ANDROID').result||[];app=apps.find(a=>a.packageName===pkg);if(!app)execSync('sleep 3')}}
if(!app)throw new Error('app Android não encontrado após a criação');
const norm=s=>String(s||'').replace(/:/g,'').toLowerCase();
const have=(fb(`apps:android:sha:list ${app.appId}`).result||[]).map(c=>norm(c.shaHash));
for(const s of [sha1,sha256])if(s&&!have.includes(norm(s))){console.log('cadastrando impressão digital',s);fb(`apps:android:sha:create ${app.appId} ${norm(s)}`)}
// o cliente OAuth do Android pode levar alguns segundos para aparecer no google-services.json
let json=null;
for(let i=0;i<12;i++){
  const r=fb(`apps:sdkconfig ANDROID ${app.appId}`).result||{};
  const txt=r.fileContents||(r.sdkConfig?JSON.stringify(r.sdkConfig):'');
  json=JSON.parse(txt);
  const cl=(json.client||[]).flatMap(c=>c.oauth_client||[]);
  if(cl.some(c=>c.client_type===1)&&cl.some(c=>c.client_type===3))break;
  console.log('aguardando clientes OAuth no google-services.json…');execSync('sleep 10');
}
const cl=(json.client||[]).flatMap(c=>c.oauth_client||[]);
console.log('clientes OAuth:',cl.map(c=>c.client_type).join(','));
if(!cl.some(c=>c.client_type===3))console.log('AVISO: sem cliente web OAuth (tipo 3); o login Google nativo pode falhar');
writeFileSync(out,JSON.stringify(json,null,2));
console.log('google-services.json gravado para',app.appId);

// Gera public/firebase-config.js a partir do projeto Firebase da conta de serviço.
// Uso: node scripts/write-config.mjs <projectId>   (ou EMU=1 para o emulador)
import {execSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const out='public/firebase-config.js';
if(process.env.EMU){
  writeFileSync(out,'window.FIREBASE_CONFIG='+JSON.stringify({apiKey:'fake-api-key',authDomain:'127.0.0.1',projectId:'demo-estacas',appId:'1:1:web:1',emulator:true})+';\n');
  console.log('config do emulador gravada');process.exit(0);
}
const pj=process.argv[2];
const fb=a=>JSON.parse(execSync(`npx firebase ${a} --project ${pj} --json`,{encoding:'utf8'}));
let cfg=null;
if(process.env.FIREBASE_WEB_CONFIG){cfg=JSON.parse(process.env.FIREBASE_WEB_CONFIG)}
else{
  let apps=(fb('apps:list WEB').result||[]);
  if(!apps.length){fb('apps:create WEB "Localizador de Estacas"');apps=fb('apps:list WEB').result||[]}
  const r=fb(`apps:sdkconfig WEB ${apps[0].appId}`).result||{};
  cfg=r.sdkConfig||(r.fileContents?JSON.parse(r.fileContents.slice(r.fileContents.indexOf('{'),r.fileContents.lastIndexOf('}')+1)):null);
}
if(!cfg||!cfg.apiKey||!cfg.projectId)throw new Error('não foi possível obter a configuração web do Firebase');
cfg.authDomain=cfg.authDomain||`${cfg.projectId}.firebaseapp.com`;
writeFileSync(out,'window.FIREBASE_CONFIG='+JSON.stringify(cfg)+';\n');
console.log('config gravada para',cfg.projectId);

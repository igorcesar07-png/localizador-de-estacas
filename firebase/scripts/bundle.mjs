// Gera o pacote de atualização do app Android (public/app-bundle/): zip com o app e version.json.
// Rodar depois de gerar o firebase-config.js e antes do deploy.
import {readFileSync,writeFileSync,mkdirSync,rmSync,readdirSync,statSync} from 'node:fs';
import {execSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const PUB='public',DIR=PUB+'/app-bundle',HOST='https://localizador-estacas.web.app';
const build=(readFileSync(PUB+'/index.html','utf8').match(/window\.APP_BUILD="([^"]+)"/)||[])[1];
if(!build)throw new Error('APP_BUILD não encontrado no index.html');
if(/FIREBASE_CONFIG=null/.test(readFileSync(PUB+'/firebase-config.js','utf8')))throw new Error('firebase-config.js ainda sem configuração');
rmSync(DIR,{recursive:true,force:true});mkdirSync(DIR,{recursive:true});
const zip=`app-${build}.zip`;
const files=readdirSync(PUB).filter(f=>f!=='app-bundle'&&statSync(PUB+'/'+f).isFile());
execSync(`cd ${PUB} && zip -q -X ../${DIR}/${zip} ${files.map(f=>JSON.stringify(f)).join(' ')}`.replace('../'+DIR,'app-bundle'));
const sha=createHash('sha256').update(readFileSync(`${DIR}/${zip}`)).digest('hex');
const requires=JSON.parse(readFileSync('../mobile/native-plugins.json','utf8'));
const v={build,url:`${HOST}/app-bundle/${zip}`,sha256:sha,requires,apk:'https://github.com/igorcesar07-png/localizador-de-estacas/releases/latest/download/Localizador-Estacas.apk',files:files.length};
writeFileSync(`${DIR}/version.json`,JSON.stringify(v,null,1));
console.log('pacote de atualização',zip,(statSync(`${DIR}/${zip}`).size/1024|0)+' KB',files.length,'arquivos');

// Testes das regras do Firestore (rodam no emulador, no GitHub Actions)
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,updateDoc,getDocs,collection,deleteDoc} from 'firebase/firestore';
import {readFileSync,writeFileSync} from 'node:fs';

const ADMIN='igordalmolin.eng@gmail.com';
const env=await initializeTestEnvironment({projectId:'demo-estacas',firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8'),host:'127.0.0.1',port:8080}});
const results=[];
async function t(name,fn){try{await fn();results.push(['OK',name])}catch(e){results.push(['FALHOU',name+' — '+(e.message||e)])}}
const ctx=(uid,email,verified=true)=>env.authenticatedContext(uid,{email,email_verified:verified}).firestore();
const admin=ctx('admin',ADMIN,true),fakeAdmin=ctx('fake',ADMIN,false),anon=env.unauthenticatedContext().firestore();
const P_MAPA={mapa:{view:true}};

await env.withSecurityRulesDisabled(async c=>{const d=c.firestore();
  await setDoc(doc(d,'profiles','campo'),{name:'Campo',perms:{localizacao:{view:true},foto:{view:true,create:true}}});
  await setDoc(doc(d,'profiles','vazio'),{name:'Vazio',perms:{}});
  await setDoc(doc(d,'users','ativo'),{email:'ativo@x.com',name:'Ativo',profile:null,custom:true,perms:P_MAPA,active:true,invited:true});
  await setDoc(doc(d,'users','perfil'),{email:'perfil@x.com',name:'Perfil',profile:'campo',custom:false,perms:{},active:true,invited:true});
  await setDoc(doc(d,'users','perfilvazio'),{email:'pv@x.com',name:'PV',profile:'vazio',custom:false,perms:{},active:true,invited:true});
  await setDoc(doc(d,'users','inativo'),{email:'inativo@x.com',name:'Inativo',profile:null,custom:true,perms:P_MAPA,active:false,invited:true});
  await setDoc(doc(d,'users','semperm'),{email:'semperm@x.com',name:'Sem',profile:null,custom:true,perms:{},active:true,invited:false});
  await setDoc(doc(d,'invites','convidado@x.com'),{email:'convidado@x.com',name:'Conv',profile:'campo',custom:false,perms:{},active:true});
  await setDoc(doc(d,'base','r08'),{json:'{"codes":[],"rows":[]}',version:'t'});
});

// base do projeto
await t('sem login não lê a base',()=>assertFails(getDoc(doc(anon,'base','r08'))));
await t('administrador lê e grava a base',async()=>{await assertSucceeds(getDoc(doc(admin,'base','r08')));await assertSucceeds(setDoc(doc(admin,'base','r08'),{json:'{}',version:'2'}))});
await t('e-mail do admin sem verificação não grava a base',()=>assertFails(setDoc(doc(fakeAdmin,'base','r08'),{json:'x'})));
await t('usuário ativo com página liberada lê a base',()=>assertSucceeds(getDoc(doc(ctx('ativo','ativo@x.com'),'base','r08'))));
await t('usuário com perfil liberado lê a base',()=>assertSucceeds(getDoc(doc(ctx('perfil','perfil@x.com'),'base','r08'))));
await t('usuário com perfil sem páginas não lê a base',()=>assertFails(getDoc(doc(ctx('perfilvazio','pv@x.com'),'base','r08'))));
await t('usuário inativo não lê a base',()=>assertFails(getDoc(doc(ctx('inativo','inativo@x.com'),'base','r08'))));
await t('usuário sem permissões não lê a base',()=>assertFails(getDoc(doc(ctx('semperm','semperm@x.com'),'base','r08'))));
await t('usuário sem cadastro não lê a base',()=>assertFails(getDoc(doc(ctx('novo','novo@x.com'),'base','r08'))));
await t('usuário comum não grava a base',()=>assertFails(setDoc(doc(ctx('ativo','ativo@x.com'),'base','r08'),{json:'x'})));

// base da BR-373 B4
await env.withSecurityRulesDisabled(async c=>{const d=c.firestore();
  await setDoc(doc(d,'base','b4'),{json:'{"codes":[],"rows":[]}',version:'t'});
  await setDoc(doc(d,'users','b4user'),{email:'b4@x.com',name:'B4',profile:null,custom:true,perms:{mapab4:{view:true}},active:true,invited:true});
  await setDoc(doc(d,'users','b4inativo'),{email:'b4i@x.com',name:'B4i',profile:null,custom:true,perms:{mapab4:{view:true}},active:false,invited:true});
  await setDoc(doc(d,'users','anauser'),{email:'ana@x.com',name:'Ana',profile:null,custom:true,perms:{analise:{view:true}},active:true,invited:true});
  await setDoc(doc(d,'users','mkver'),{email:'mkv@x.com',name:'MV',profile:null,custom:true,perms:{marcos:{view:true}},active:true,invited:true});
  await setDoc(doc(d,'users','mkedit'),{email:'mke@x.com',name:'ME',profile:null,custom:true,perms:{marcos:{view:true,create:true,edit:true}},active:true,invited:true});
  await setDoc(doc(d,'marcos','m1'),{id:'m1',cat:'bota',rod:'BR-277',km:'233+700'});
  await setDoc(doc(d,'users','admcalc'),{email:'ac@x.com',name:'AC',profile:null,custom:true,perms:{calculadora:{view:true,create:true}},active:true,invited:true});
  await setDoc(doc(d,'users','calcver'),{email:'cv@x.com',name:'CV',profile:null,custom:true,perms:{calculadora:{view:true}},active:true,invited:true});
  await setDoc(doc(d,'users','locuser'),{email:'loc@x.com',name:'Loc',profile:null,custom:true,perms:{localizacao:{view:true}},active:true,invited:true});
  await setDoc(doc(d,'users','fotouser'),{email:'foto@x.com',name:'Foto',profile:null,custom:true,perms:{foto:{view:true,create:true}},active:true,invited:true});
  await setDoc(doc(d,'users','outracoisa'),{email:'oc@x.com',name:'OC',profile:null,custom:true,perms:{mapa:{view:true}},active:true,invited:true});
  await setDoc(doc(d,'base','zz'),{json:'x'})});
await t('B4: usuário com a aba BR-373 B4 lê a base B4',()=>assertSucceeds(getDoc(doc(ctx('b4user','b4@x.com'),'base','b4'))));
await t('B4: usuário com a aba B4 lê a base BR-277 (o app precisa dela para abrir)',()=>assertSucceeds(getDoc(doc(ctx('b4user','b4@x.com'),'base','r08'))));
await t('B4: usuário só com a aba BR-277 não lê a base B4',()=>assertFails(getDoc(doc(ctx('outracoisa','oc@x.com'),'base','b4'))));
await t('Análise por km: usuário só com o painel lê a base B4',()=>assertSucceeds(getDoc(doc(ctx('anauser','ana@x.com'),'base','b4'))));
await t('Análise por km: usuário só com o painel lê a base BR-277',()=>assertSucceeds(getDoc(doc(ctx('anauser','ana@x.com'),'base','r08'))));
await t('Marcos: quem tem a página lê os marcos',()=>assertSucceeds(getDoc(doc(ctx('mkver','mkv@x.com'),'marcos','m1'))));
await t('Marcos: quem não tem a página não lê',()=>assertFails(getDoc(doc(ctx('outracoisa','oc@x.com'),'marcos','m1'))));
await t('Marcos: só visualizar não grava',()=>assertFails(setDoc(doc(ctx('mkver','mkv@x.com'),'marcos','m2'),{id:'m2',cat:'rot',rod:'BR-373',km:'200+000'})));
await t('Marcos: com permissão de criar, grava',()=>assertSucceeds(setDoc(doc(ctx('mkedit','mke@x.com'),'marcos','m3'),{id:'m3',cat:'ent',rod:'BR-373',km:'200+000'})));
await t('Marcos: tipo desconhecido é recusado',()=>assertFails(setDoc(doc(ctx('mkedit','mke@x.com'),'marcos','m4'),{id:'m4',cat:'xyz',rod:'BR-373',km:'200+000'})));
await t('Marcos: sem permissão de excluir não exclui',()=>assertFails(deleteDoc(doc(ctx('mkedit','mke@x.com'),'marcos','m1'))));
await t('Marcos: quem tem a página lê a base B4',()=>assertSucceeds(getDoc(doc(ctx('mkver','mkv@x.com'),'base','b4'))));
await t('Horário da equipe: quem emite programação grava',()=>assertSucceeds(setDoc(doc(ctx('admcalc','ac@x.com'),'equipeHoras','Equipe_A'),{equipe:'Equipe A',h:{eCafe:'07:00'},at:1760000000000,by:'ac@x.com'})));
await t('Horário da equipe: sem a Calculadora não lê',()=>assertFails(getDoc(doc(ctx('outracoisa','oc@x.com'),'equipeHoras','Equipe_A'))));
await t('Horário da equipe: só visualizar a Calculadora não grava',()=>assertFails(setDoc(doc(ctx('calcver','cv@x.com'),'equipeHoras','Equipe_A'),{equipe:'Equipe A',h:{},at:1,by:'cv@x.com'})));
await t('Lote 04: quem tem Localização estaca lê a base B4',()=>assertSucceeds(getDoc(doc(ctx('locuser','loc@x.com'),'base','b4'))));
await t('Lote 04: quem tem Foto georreferenciada lê a base B4',()=>assertSucceeds(getDoc(doc(ctx('fotouser','foto@x.com'),'base','b4'))));
await t('B4: usuário inativo não lê a base B4',()=>assertFails(getDoc(doc(ctx('b4inativo','b4i@x.com'),'base','b4'))));
await t('B4: sem login não lê a base B4',()=>assertFails(getDoc(doc(anon,'base','b4'))));
await t('B4: usuário comum não grava a base B4',()=>assertFails(setDoc(doc(ctx('b4user','b4@x.com'),'base','b4'),{json:'x'})));
await t('B4: administrador grava a base B4',()=>assertSucceeds(setDoc(doc(admin,'base','b4'),{json:'{}',version:'2'})));
await t('outros documentos da coleção base ficam bloqueados',()=>assertFails(getDoc(doc(ctx('ativo','ativo@x.com'),'base','zz'))));

await env.withSecurityRulesDisabled(async c=>{await setDoc(doc(c.firestore(),'base','seriais'),{json:'{}'})});
await t('seriais: usuário ativo lê',()=>assertSucceeds(getDoc(doc(ctx('ativo','ativo@x.com'),'base','seriais'))));
await t('seriais: sem login não lê',()=>assertFails(getDoc(doc(anon,'base','seriais'))));
await t('seriais: usuário comum não grava',()=>assertFails(setDoc(doc(ctx('ativo','ativo@x.com'),'base','seriais'),{json:'x'})));
await t('seriais: administrador grava',()=>assertSucceeds(setDoc(doc(admin,'base','seriais'),{json:'{}'})));

// cadastro e autoatribuição
const nu=ctx('novo','novo@x.com');
await t('novo usuário cria o próprio cadastro sem acesso',()=>assertSucceeds(setDoc(doc(nu,'users','novo'),{email:'novo@x.com',name:'Novo',profile:null,custom:true,perms:{},active:false,invited:false})));
const nu2=ctx('novo2','novo2@x.com');
await t('novo usuário não se cria ativo',()=>assertFails(setDoc(doc(nu2,'users','novo2'),{email:'novo2@x.com',name:'N',profile:null,custom:true,perms:{},active:true,invited:false})));
await t('novo usuário não se dá permissões',()=>assertFails(setDoc(doc(nu2,'users','novo2'),{email:'novo2@x.com',name:'N',profile:null,custom:true,perms:P_MAPA,active:false,invited:false})));
await t('novo usuário não escolhe perfil',()=>assertFails(setDoc(doc(nu2,'users','novo2'),{email:'novo2@x.com',name:'N',profile:'campo',custom:false,perms:{},active:false,invited:false})));
await t('não cria cadastro de outra pessoa',()=>assertFails(setDoc(doc(nu2,'users','outro'),{email:'novo2@x.com',name:'N',profile:null,custom:true,perms:{},active:false,invited:false})));
const cv=ctx('conv','convidado@x.com');
await t('convidado cria cadastro com o perfil do convite',()=>assertSucceeds(setDoc(doc(cv,'users','conv'),{email:'convidado@x.com',name:'Conv',profile:'campo',custom:false,perms:{},active:true,invited:true})));
const cv2=ctx('conv2','convidado@x.com');
await t('convidado não altera o perfil do convite',()=>assertFails(setDoc(doc(cv2,'users','conv2'),{email:'convidado@x.com',name:'Conv',profile:'vazio',custom:true,perms:{relatorios:{view:true}},active:true,invited:true})));
await t('usuário não altera o próprio cadastro',()=>assertFails(updateDoc(doc(ctx('ativo','ativo@x.com'),'users','ativo'),{perms:{relatorios:{view:true}}})));
await t('usuário não se reativa',()=>assertFails(updateDoc(doc(ctx('inativo','inativo@x.com'),'users','inativo'),{active:true})));

// leitura e gerenciamento
await t('usuário lê o próprio cadastro',()=>assertSucceeds(getDoc(doc(ctx('ativo','ativo@x.com'),'users','ativo'))));
await t('usuário não lê cadastro de outro',()=>assertFails(getDoc(doc(ctx('ativo','ativo@x.com'),'users','perfil'))));
await t('usuário não lista usuários',()=>assertFails(getDocs(collection(ctx('ativo','ativo@x.com'),'users'))));
await t('usuário não cria perfis',()=>assertFails(setDoc(doc(ctx('ativo','ativo@x.com'),'profiles','x'),{name:'x',perms:{}})));
await t('usuário não cria convites',()=>assertFails(setDoc(doc(ctx('ativo','ativo@x.com'),'invites','a@b.com'),{active:true})));
await t('administrador lista e altera usuários',async()=>{await assertSucceeds(getDocs(collection(admin,'users')));await assertSucceeds(updateDoc(doc(admin,'users','semperm'),{active:false}))});
await t('administrador cria perfis e convites',async()=>{await assertSucceeds(setDoc(doc(admin,'profiles','p2'),{name:'P2',perms:P_MAPA}));await assertSucceeds(setDoc(doc(admin,'invites','z@z.com'),{email:'z@z.com',profile:null,custom:true,perms:P_MAPA,active:true}))});
await t('e-mail do admin sem verificação não gerencia',()=>assertFails(getDocs(collection(fakeAdmin,'users'))));
await t('coleções desconhecidas bloqueadas',()=>assertFails(setDoc(doc(admin,'outra','x'),{a:1})));


// Levantamento de Bota-Espera (coleção nova)
await env.withSecurityRulesDisabled(async c=>{const d=c.firestore();
  const U=(id,email,perms)=>setDoc(doc(d,'users',id),{email,name:id,profile:null,custom:true,perms,active:true,invited:true});
  await U('lvreg','lvreg@x.com',{levbe:{view:true,create:true}});await U('lvreg2','lvreg2@x.com',{levbe:{view:true,create:true}});
  await U('lved','lved@x.com',{levbe:{view:true,edit:true}});await U('lvdel','lvdel@x.com',{levbe:{view:true,delete:true}});await U('lvver','lvver@x.com',{levbe:{view:true}});
});
const LREC=(id,by,o={})=>({id,v:1,criado_em:1760000000000,criado_por:by,usuario:'U',lat:-25.1,lon:-50.1,precisao_m:4,rodovia:'BR-373/PR',contrato:'VIAR-GDA-470/2026',lote:4,
  estaca:'225+080',offset_m:3,estaca_txt:'225+083',odometro_m:225243,dist_eixo_m:1.2,fora_trecho:false,sentido_desloc:'CRESCENTE',sentido_modo:'AUTO',pista:'CRESCENTE',tipo:'EXISTENTE',ocupacao:'LOTADO',
  obs:'',fotos:[],audios:[],complemento_ok:false,excluido:false,excluido_em:null,excluido_por:null,excluido_motivo:null,atualizado_em:1760000000000,atualizado_por:by,area_m2:null,dmt_fresado_km:null,...o});
const lv=(u)=>ctx(u,u+'@x.com');
await t('Levantamento: quem registra cria o próprio registro',()=>assertSucceeds(setDoc(doc(lv('lvreg'),'levantamento_bota_espera','r1'),LREC('r1','lvreg@x.com'))));
await t('Levantamento: não cria em nome de outro usuário',()=>assertFails(setDoc(doc(lv('lvreg'),'levantamento_bota_espera','r2'),LREC('r2','lvreg2@x.com'))));
await t('Levantamento: só visualizar não cria',()=>assertFails(setDoc(doc(lv('lvver'),'levantamento_bota_espera','r3'),LREC('r3','lvver@x.com'))));
await t('Levantamento: local possível não aceita ocupação',()=>assertFails(setDoc(doc(lv('lvreg'),'levantamento_bota_espera','r4'),LREC('r4','lvreg@x.com',{tipo:'LOCAL_POSSIVEL',ocupacao:'LOTADO'}))));
await t('Levantamento: existente exige ocupação válida',()=>assertFails(setDoc(doc(lv('lvreg'),'levantamento_bota_espera','r5'),LREC('r5','lvreg@x.com',{ocupacao:'CHEIO'}))));
await t('Levantamento: quem tem a página lê',()=>assertSucceeds(getDoc(doc(lv('lvver'),'levantamento_bota_espera','r1'))));
await t('Levantamento: sem a página não lê',()=>assertFails(getDoc(doc(ctx('outracoisa','oc@x.com'),'levantamento_bota_espera','r1'))));
await t('Levantamento: o autor complementa e desfaz o próprio registro',async()=>{await assertSucceeds(setDoc(doc(lv('lvreg'),'levantamento_bota_espera','r1'),LREC('r1','lvreg@x.com',{obs:'portão fechado'})));
  await assertSucceeds(setDoc(doc(lv('lvreg'),'levantamento_bota_espera','r1'),LREC('r1','lvreg@x.com',{obs:'portão fechado',excluido:true,excluido_motivo:'DESFEITO'})));
  await assertSucceeds(setDoc(doc(lv('lvreg'),'levantamento_bota_espera','r1'),LREC('r1','lvreg@x.com',{obs:'portão fechado'})))});
await t('Levantamento: outro usuário só com "registrar" não altera o registro alheio',()=>assertFails(setDoc(doc(lv('lvreg2'),'levantamento_bota_espera','r1'),LREC('r1','lvreg@x.com',{obs:'x'}))));
await t('Levantamento: "editar" corrige registro alheio',()=>assertSucceeds(setDoc(doc(lv('lved'),'levantamento_bota_espera','r1'),LREC('r1','lvreg@x.com',{ocupacao:'PELA_METADE'}))));
await t('Levantamento: "editar" não exclui',()=>assertFails(setDoc(doc(lv('lved'),'levantamento_bota_espera','r1'),LREC('r1','lvreg@x.com',{ocupacao:'PELA_METADE',excluido:true}))));
await t('Levantamento: ninguém troca o autor do registro',()=>assertFails(setDoc(doc(lv('lved'),'levantamento_bota_espera','r1'),LREC('r1','lved@x.com',{ocupacao:'PELA_METADE'}))));
await t('Levantamento: "excluir" só marca a exclusão',async()=>{await assertFails(setDoc(doc(lv('lvdel'),'levantamento_bota_espera','r1'),LREC('r1','lvreg@x.com',{ocupacao:'VAZIO',excluido:true})));
  await assertSucceeds(updateDoc(doc(lv('lvdel'),'levantamento_bota_espera','r1'),{excluido:true,excluido_em:1760000001000,excluido_por:'lvdel@x.com',excluido_motivo:'EXCLUIDO',atualizado_em:1760000001000,atualizado_por:'lvdel@x.com'}))});
await t('Levantamento: o documento nunca é apagado',()=>assertFails(deleteDoc(doc(admin,'levantamento_bota_espera','r1'))));
await t('Levantamento: foto comprimida do registro é gravada e lida',async()=>{await assertSucceeds(setDoc(doc(lv('lvreg'),'levantamento_bota_espera_midia','m1'),{id:'m1',reg:'r1',tipo:'foto',mime:'image/jpeg',data:'data:image/jpeg;base64,AAAA',bytes:3,criado_em:1,criado_por:'lvreg@x.com'}));
  await assertSucceeds(getDoc(doc(lv('lvver'),'levantamento_bota_espera_midia','m1')))});
await t('Levantamento: só visualizar não grava foto',()=>assertFails(setDoc(doc(lv('lvver'),'levantamento_bota_espera_midia','m2'),{id:'m2',reg:'r1',tipo:'foto',mime:'image/jpeg',data:'x',bytes:1,criado_em:1,criado_por:'lvver@x.com'})));
await t('Levantamento: quem tem a página lê a base B4 (estacas do Lote 04)',()=>assertSucceeds(getDoc(doc(lv('lvver'),'base','b4'))));
await env.cleanup();
const ok=results.filter(r=>r[0]==='OK').length;
const txt=`Regras do Firestore: ${ok}/${results.length} testes OK\n\n`+results.map(r=>r.join('  ')).join('\n')+'\n';
console.log(txt);writeFileSync(process.env.REPORT||'rules-report.txt',txt);
process.exit(ok===results.length?0:1);

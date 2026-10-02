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

await env.cleanup();
const ok=results.filter(r=>r[0]==='OK').length;
const txt=`Regras do Firestore: ${ok}/${results.length} testes OK\n\n`+results.map(r=>r.join('  ')).join('\n')+'\n';
console.log(txt);writeFileSync(process.env.REPORT||'rules-report.txt',txt);
process.exit(ok===results.length?0:1);

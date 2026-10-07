# Gera a aba "Estacas BR-373 B4" a partir da aba de referência "Estacas BR-277 B2+B3".
# A aba de referência não é alterada: o build copia a marcação, o CSS e o código dela,
# troca os ids (prefixo b4_), separa eventos/armazenamento/GPS e usa a base PROJECT_DATA_B4.
# Qualquer mudança futura na aba de referência é herdada pela B4 no próximo build.
import re

P='b4_'

def _cut(s,a,b,incl_b=False):
    i=s.index(a);j=s.index(b,i)
    return s[i:j+(len(b) if incl_b else 0)]

def _rep(s,a,b,n=1,what=''):
    c=s.count(a)
    if n is not None and c!=n:raise SystemExit(f'B4: esperado {n}x, achado {c}x: {what or a[:70]!r}')
    return s.replace(a,b)

def add_b4(t):
    # ---------- HTML: seção do mapa + janela de detalhes ----------
    sec=_cut(t,'<section class="page" id="pMap"','</section>',True)
    modal=_cut(t,'<div class="modal" id="infoModal"','</div>\n</div>',True)
    ids=re.findall(r'\bid="([^"]+)"',sec)+re.findall(r'\bid="([^"]+)"',modal)+['imGo','imGoD']
    ids=sorted(set(ids),key=len,reverse=True)
    def ren_html(h):
        for a in ('id','for','aria-labelledby','aria-controls','aria-describedby'):
            h=re.sub(rf'\b{a}="([^"]+)"',lambda m:f'{a}="{P}{m.group(1)}"' if m.group(1) in ids else m.group(0),h)
        return h
    sec2=ren_html(sec)
    sec2=_rep(sec2,'data-page="mapa"','data-page="mapab4"')
    sec2=_rep(sec2,'placeholder="Estaca, ex. 181+040 ou 181"','placeholder="Estaca, ex. 230+040 ou 230"')
    sec2=_rep(sec2,'faixa 2/3 C','faixa 2 C')
    sec2=_rep(sec2,'faixa 2/3 D','faixa 2 D')
    sec2=re.sub(r'<p class="note">Fonte: R08[^<]*</p>','<p class="note" id="b4_fonte">Fonte: unifilar de soluções B4 – BR-373/PR e KMZ de estacas da BR-373 B4.</p>',sec2)
    if 'b4_fonte' not in sec2:raise SystemExit('B4: nota de fonte não encontrada')
    modal2=ren_html(modal)
    t=_rep(t,'<!--__B4_SECTION__-->','<!-- ===== 2b. Estacas BR-373 B4 (gerada a partir da aba BR-277 B2+B3) ===== -->\n'+sec2+'\n'+modal2)

    # ---------- CSS: cada seletor com id da aba de referência ganha a versão b4_ ----------
    idre=re.compile(r'#('+'|'.join(map(re.escape,ids))+r')(?![\w-])')
    def css_block(css):
        def fix(m):
            sel=m.group(1)
            if sel.lstrip().startswith('@') or not idre.search(sel):return m.group(0)
            parts=[x for x in sel.split(',')]
            extra=[idre.sub(lambda k:'#'+P+k.group(1),x) for x in parts if idre.search(x)]
            return sel.rstrip()+','+','.join(x.strip() for x in extra)+'{'
        return re.sub(r'([^{}]+)\{',fix,css)
    t=re.sub(r'(<style[^>]*>)(.*?)(</style>)',lambda m:m.group(1)+css_block(m.group(2))+m.group(3),t,flags=re.S)

    # ---------- JS: Data/Geo/Loc/Filtros + página do mapa ----------
    core=_cut(t,'/* ------------------------------ Data ------------------------------ */','/* ------------------------------ Menu e páginas')
    page=_cut(t,"Router.onInit('mapa',function(){","/*__B4_JS__*/")
    js=core+'\n'+page
    # ids
    alt='|'.join(map(re.escape,ids))
    for pat in (r"(\$\(')("+alt+r")('\))",r"(getElementById\(')("+alt+r")('\))",r"(L\.map\(')("+alt+r")(')",r'(id=")('+alt+r')(")',r"(\.id===')("+alt+r")(')"):
        js=re.sub(pat,lambda m:m.group(1)+P+m.group(2)+m.group(3),js)
    # listas de ids percorridas com forEach(id=>...)
    js=re.sub(r"\[((?:'[A-Za-z0-9_]+',?)+)\]\.forEach\(id=>",lambda m:'['+re.sub(r"'([A-Za-z0-9_]+)'",lambda k:f"'{P}{k.group(1)}'" if k.group(1) in ids else k.group(0),m.group(1))+'].forEach(id=>',js)
    left=sorted({i for i in ids if re.search(r"['\"]"+re.escape(i)+r"['\"]",js)})
    if left:print('B4: strings iguais a ids mantidas (classes/chaves):',left)
    js=_rep(js,'PROJECT_DATA.codes,R=PROJECT_DATA.rows','PROJECT_DATA_B4.codes,R=PROJECT_DATA_B4.rows')
    js=_rep(js,"Router.onInit('mapa',","Router.onInit('mapab4',")
    js=_rep(js,"Router.cur()==='mapa'","Router.cur()==='mapab4'",None)
    js=_rep(js,"if(p==='mapa')","if(p==='mapab4')")
    js=_rep(js,'window.__map=map','window.__mapB4=map')
    js=_rep(js,'164+700 a 303+800','183+400 a 282+480',None)
    js=_rep(js,'Exemplos: 181+040 ou 181.','Exemplos: 230+040 ou 230.')
    js=_rep(js,'Nenhuma saída marcada no R08 para este trecho.','Nenhuma saída marcada no unifilar para este trecho.')
    js=_rep(js,'não há dreno marcado no R08 nesta estaca','não há dreno marcado no unifilar nesta estaca')
    js=_rep(js,"['Parâmetro no R08',inf.param]","['Parâmetro da sigla',inf.param]")
    # famílias de solução da BR-373 B4 (descrições vêm do próprio unifilar)
    fam_a=js.index('  const FAM={');fam_b=js.index('  const PA_SHADES=')
    js=js[:fam_a]+FAM_B4+js[fam_b:]
    info_a=js.index('  function info(code){');info_b=js.index('  const LANES=[')
    js=js[:info_a]+INFO_B4+js[info_b:]
    js=_rep(js,"{i:1,name:'Faixa 2/3',","{i:1,name:'Faixa 2',")
    js=_rep(js,"{i:4,name:'Faixa 2/3',","{i:4,name:'Faixa 2',")
    js=_rep(js,"{i:0,name:'Acostamento',","{i:0,name:'Acostamento / bordo',")
    js=_rep(js,"{i:5,name:'Acostamento',","{i:5,name:'Acostamento / bordo',")
    js=_rep(js,"GRP={F1:'Faixa 1',F23:'Faixa 2/3',AC:'Acostamento'}","GRP={F1:'Faixa 1',F23:'Faixa 2',AC:'Acostamento / bordo'}")
    js=_rep(js,"L0.grp==='F23'?'F2/3':'Acost.'","L0.grp==='F23'?'F2':'Acost.'")
    js=_rep(js,"[['F1','Faixa 1'],['F23','Faixa 2/3'],['AC','Acostamento']]","[['F1','Faixa 1'],['F23','Faixa 2 / adicional'],['AC','Acostamento / bordo']]")
    js=_rep(js,"${k==='AC'?'AC':k==='F1'?'1':'2/3'}","${k==='AC'?'AC':k==='F1'?'1':'2'}")
    js=_rep(js,"const sub=f==='FF'?'6 cm':f==='FE'?'10 cm':f==='FS'?'3 cm':f==='DR'?'0,60 m':f==='DP'?'1,50 m':'';",
               "const sub=f==='FF'?'6 cm':f==='FE'?'10 cm':f==='FS'?'3 cm':f==='REC'||f==='RP'?'25 cm':'';")
    js=_rep(js,"Data.info(f==='REC'?'RECe25':f==='PA'?'PA3,0':f==='RP'?'RPe25':f)","Data.info(f==='PA'?'PA3,0':f)")
    # detalhes do pano e da saída com os dados do unifilar
    pr_a=js.index('function panoRows(p){');pr_b=js.index('const dl=rows=>')
    js=js[:pr_a]+PANOROWS_B4+js[pr_b:]
    js=_rep(js,"p?['Pano',p.tag]:null,['Marco km',R[i][5]],['Página do PDF',R[i][8]]].filter(Boolean))",
               "p?['Pano',p.tag]:null,['Marco km',R[i][5]],...saidaRows(side,i)].filter(Boolean))")
    js=_rep(js,"['Bloco do contrato','B'+R[i][4]],['Página do PDF',R[i][8]],","['Bloco do contrato','B'+R[i][4]],")
    if 'Página do PDF' in js:raise SystemExit('B4: ainda há referência à página do PDF do R08')
    # nota de validação na aba Filtros
    js=_rep(js,"Layers.init();renderFilters();","Layers.init();renderFilters();B4.renderNote();")
    block=f'''
/* =====================================================================
   PÁGINA 2b — Estacas BR-373 B4 (GERADA no build a partir da página 2; não editar aqui)
   ===================================================================== */
const __G={{emit,on,store}};
if(PROJECT_DATA_B4){{(function(){{
// Bloco 04: "Gap Graded (GAP)" (sigla G no unifilar) passa a FS — Fresagem Superficial 3 cm; o nome original fica no registro do unifilar
if(!PROJECT_DATA_B4.__fs){{PROJECT_DATA_B4.codes=PROJECT_DATA_B4.codes.map(c=>c==='G'?'FS':c);PROJECT_DATA_B4.__fs=1}}
try{{const f=__G.store.get('b4.filters',null);if(f&&Array.isArray(f.sol)&&f.sol.includes('G')){{f.sol=f.sol.map(x=>x==='G'?'FS':x);__G.store.set('b4.filters',f)}}}}catch(e){{}}
const emit=(e,d)=>__G.emit('b4:'+e,d),on=(e,f)=>__G.on(e==='page'?e:'b4:'+e,f);
const store={{get:(k,d)=>__G.store.get('b4.'+k,d),set:(k,v)=>__G.store.set('b4.'+k,v)}};
{js}
{B4_SRC}
// fonte de dados da Calculadora de programação para a obra BR-373 — Bloco 04
window.__SRC_B4={{Data,R,LANES,SIDE,PANOS,ODO,Loc,B4,orig:p=>p.src?{{sigla:p.src.sigla,nome:p.src.tipo_solucao}}:null}};
// GPS: se o acompanhamento já estava ligado no app, liga também nesta aba
on('page',p=>{{if(p!=='mapab4'||Loc.gps.on||!__G.store.get('gpsOn',false))return;try{{navigator.permissions&&navigator.permissions.query({{name:'geolocation'}}).then(q=>{{if(q.state==='granted')Loc.start()}}).catch(()=>{{}})}}catch(e){{}}}});
}})()}}else Router.onInit('mapab4',()=>{{const m=document.getElementById('{P}map'),pn=document.getElementById('{P}panel');if(pn)pn.hidden=true;
  if(m)m.innerHTML=`<div style="max-width:440px;margin:80px auto 0;padding:22px;background:#fff;color:#141715;border:1px solid #d5d8d3;border-radius:14px;font:15px/1.5 system-ui;box-shadow:0 6px 24px rgba(0,0,0,.12)"><b style="font-size:17px">Base da BR-373 B4 ainda não carregada</b><p style="margin:8px 0 0">${{ACL&&ACL.admin?'Envie o arquivo <b>base-BR373-B4.json</b> em Administração › Base do projeto, no quadro "Base da BR-373 B4". Depois reabra o app.':'O administrador precisa enviar a base da BR-373 B4. Tente de novo mais tarde.'}}</p>${{ACL&&ACL.admin?'<a href="#admin" style="display:block;margin-top:14px;text-align:center;background:#f5b400;color:#111;font-weight:700;padding:11px;border-radius:10px;text-decoration:none">Ir para Administração</a>':''}}</div>`}});
'''
    t=_rep(t,'/*__B4_JS__*/',block)
    return t

FAM_B4='''  const FAM={FF:{desc:'',color:'#2E86C1'},FE:{desc:'',color:'#1D3F8F'},FS:{desc:'Fresagem Superficial 3 cm',color:'#7FCBD9'},
    REC:{desc:'',color:'#D62839'},PA:{desc:'',color:'#F08A2C'},RP:{desc:'',color:'#B0177A'},
    DR:{desc:'',color:'#23A26B'},DP:{desc:'',color:'#0B5E43'},RF:{desc:'',color:'#8C7BC4'}};
  (function(){const S=PROJECT_DATA_B4.src,T=S.textos,F=S.campos,iS=F.indexOf('sigla')+3,iT=F.indexOf('tipo_solucao')+3,tx=v=>typeof v==='string'&&v[0]==='#'?T[+v.slice(1)]:v;
    const fam=c=>c==='R'?'DR':c==='P'?'DP':c==='G'?'FS':/^PA/.test(c)?'PA':c;
    for(const r of S.panos){const f=fam(tx(r[iS]));if(FAM[f]&&!FAM[f].desc)FAM[f].desc=tx(r[iT])}
    for(const k in FAM)if(!FAM[k].desc)FAM[k].desc=k})();
  const FAM_ORDER=['FF','FE','FS','REC','PA','RP','RF','DR','DP'].filter(f=>PROJECT_DATA_B4.codes.some(c=>c===f||(f==='PA'&&/^PA/.test(c)))||((f==='DR'||f==='DP')&&PROJECT_DATA_B4.rows.some(r=>r[7].includes(f==='DR'?'R':'P'))));
'''
INFO_B4='''  function info(code){let fam,param=null,esp=null;
    if(code==='FF'){fam='FF';esp='6 cm'}else if(code==='FE'){fam='FE';esp='10 cm'}else if(code==='FS'){fam='FS';esp='3 cm'}
    else if(code==='DR'){fam='DR'}else if(code==='DP'){fam='DP'}
    else if(code==='REC'){fam='REC';esp='25 cm'}else if(code==='RP'){fam='RP';esp='25 cm'}
    else if(/^PA/.test(code)){fam='PA';param=code.slice(2);esp=param+' cm'}else if(code==='RF'){fam='RF'}else fam='RF';
    let color=FAM[fam].color;if(fam==='PA'&&PA_SHADES[param])color=PA_SHADES[param];
    return {code,fam,param,esp,color,desc:FAM[fam].desc,ink:inkOn(color)}}
'''
PANOROWS_B4='''function panoRows(p){const inf=p.info,L0=LANES[p.L],e=panoEnds(p),drn=L0.grp==='DRN',s=p.src;
  const nn=(v,d)=>typeof v==='number'?v.toLocaleString('pt-BR',{maximumFractionDigits:d==null?6:d}):v;
  const av=s?B4.avisos.get(s.n):null;
  return [
  ['Pano',p.tag],s?['Nº no unifilar',s.n]:null,['Sigla',s?(s.sigla==='G'?'FS (no unifilar: G)':s.sigla):inf.code],['Tipo de solução',s?(s.sigla==='G'?`Fresagem Superficial 3 cm (no unifilar: ${s.tipo_solucao})`:s.tipo_solucao):inf.desc],
  ['Sentido',SIDE[L0.side]],[drn?'Lado':'Faixa / elemento',s?s.faixa_elemento:L0.name],['Estaca inicial',e.ini,1],['Estaca final',e.fim,1],
  s?['No unifilar',`${s.estaca_inicial} → ${s.estaca_final}`]:null,
  ['Extensão',s&&s.extensao_m!=null?nn(s.extensao_m)+' m':fmtM(20*(p.i1-p.i0+1)),1],['Blocos de 20 m',s?s.qtd_quadrados:p.i1-p.i0+1],
  s?['Largura média',s.largura_media_m==null?'não informada no unifilar':nn(s.largura_media_m)+' m']:null,
  s?['Espessura',s.espessura_m==null?'não informada no unifilar':`${nn(s.espessura_m)} m (${nn(s.espessura_m*100,2)} cm)`]:null,
  s&&s.area_m2_ou_secao_m2!=null?[/^PA/.test(s.sigla)?'Seção (largura × espessura)':'Área',nn(s.area_m2_ou_secao_m2)+' m²']:null,
  s?['Quantidade',s.quantidade==null?'—':`${nn(s.quantidade,3)} ${s.unidade||''}`,1]:null,
  ['Marco km',R[p.i0][5]],['Hodômetro',`${fmtKm(e.oIni)} → ${fmtKm(e.oFim)}`],
  s?['Unifilar',`coluna ${s.coluna_unifilar} · linhas ${s.linha_inicial_unifilar} a ${s.linha_final_unifilar}`]:null,
  s&&s.observacao?['Observação',s.observacao]:null,s?['Conferência',s.conferencia]:null,
  av?['Aviso',av,1]:null,s?null:['Aviso','Pano sem registro correspondente no unifilar',1]].filter(Boolean)}
function saidaRows(side,i){const o=B4.sai[side].get(i);if(!o)return [['Aviso','Saída sem registro correspondente no unifilar',1]];
  return [['Nº no unifilar',o.n],['Sigla',o.sigla],['Tipo de solução',o.tipo_solucao],['Trecho no unifilar',`${o.estaca_inicial} → ${o.estaca_final}`],
    ['Quantidade do grupo',`${o.quantidade} ${o.unidade||''}`],['Unifilar',`coluna ${o.coluna_unifilar} · linhas ${o.linha_inicial_unifilar} a ${o.linha_final_unifilar}`],
    o.observacao?['Observação',o.observacao]:null,B4.avisos.get(o.n)?['Aviso',B4.avisos.get(o.n),1]:null].filter(Boolean)}
'''
B4_SRC='''// ligação de cada pano do mapa ao registro do unifilar (JSON), sem recalcular quantidades
const B4=(function(){const S=PROJECT_DATA_B4.src,T=S.textos,F=S.campos;
  const val=v=>typeof v==='string'&&v[0]==='#'?T[+v.slice(1)]:v;
  const recs=S.panos.map(r=>{const o={L:r[0],i0:r[1],i1:r[2]};F.forEach((k,j)=>o[k]=val(r[j+3]));return o});
  const byKey=new Map(),sai={C:new Map(),D:new Map()};let sem=0;
  recs.forEach(o=>{if(o.i0==null){sem++;return}if(o.L==='SC'||o.L==='SD'){for(let k=o.i0;k<=o.i1;k++)sai[o.L[1]].set(k,o)}else byKey.set(o.L+'|'+o.sigla+'|'+o.i0+'|'+o.i1,o)});
  let lig=0;PANOS.forEach(p=>{const c=p.L>=6?(p.code==='DR'?'R':'P'):p.code==='FS'?'G':p.code;p.src=byKey.get(p.L+'|'+c+'|'+p.i0+'|'+p.i1)||null;if(p.src)lig++});
  const nSai=recs.filter(o=>o.L==='SC'||o.L==='SD').length;
  const avisos=new Map(S.avisos.map(a=>[a[0],a[1]]));
  const semCoord=(S.kmz&&S.kmz.sem_coordenada)||[];
  function renderNote(){const el=document.getElementById('b4_fonte');if(!el)return;
    el.innerHTML=`Fonte: ${S.metadados.arquivo} (aba ${S.metadados.aba_panos}) e KMZ de estacas da BR-373 B4 (${N.toLocaleString('pt-BR')} estacas, ${R[0][0]} a ${R[N-1][0]}).<br>`+
      `Importação: ${recs.length.toLocaleString('pt-BR')} panos de ${S.metadados.total_panos.toLocaleString('pt-BR')} — ${lig.toLocaleString('pt-BR')} em faixas, acostamentos e drenos ligados às estacas, ${nSai} de saídas de dreno`+
      `${sem?`, <b>${sem} sem estaca correspondente</b>`:''}${recs.length-lig-nSai-sem>0?`, <b>${recs.length-lig-nSai-sem} sem pano no mapa</b>`:''}.`+
      `${avisos.size?` Avisos: ${[...avisos.keys()].map(n=>'nº '+n).join(', ')} (estaca final "Sem linha no unifilar", fim pelo nº de blocos).`:''}`+
      `${semCoord.length?` <b>Estacas sem coordenada: ${semCoord.join(', ')}</b>.`:' Todas as estacas têm coordenada no KMZ.'}`}
  // conferência usada nos testes: cada registro do unifilar cobre exatamente as estacas e a faixa do pano no mapa
  function check(){const bad=[];for(const o of recs){if(o.i0==null){bad.push([o.n,'sem estaca']);continue}
      if(o.L==='SC'||o.L==='SD'){for(let k=o.i0;k<=o.i1;k++)if(!Data.saidaAt(o.L[1],k)){bad.push([o.n,'saída ausente em '+R[k][0]]);break}continue}
      for(let k=o.i0;k<=o.i1;k++){const id=PANO_AT[o.L][k];if(id<0||PANOS[id].src!==o){bad.push([o.n,'estaca '+R[k][0]]);break}}
      if(R[o.i0][0]!==o.estaca_inicial)bad.push([o.n,'estaca inicial '+R[o.i0][0]+' ≠ '+o.estaca_inicial]);
      const fim=o.i1+1<N?R[o.i1+1][0]:null;if(fim&&fim!==o.estaca_final)bad.push([o.n,'estaca final '+fim+' ≠ '+o.estaca_final]);
      const lado=o.L==='SC'?'C':o.L==='SD'?'D':LANES[o.L].side;if(SIDE[lado]!==o.sentido)bad.push([o.n,'sentido'])}
    return bad}
  window.__b4=()=>({panos:recs.length,ligados:lig,saidas:nSai,semEstaca:sem,mapa:PANOS.length,semRegistro:PANOS.filter(p=>!p.src).length,avisos:[...avisos.keys()],estacas:N,erros:check()});
  return {recs,sai,avisos,renderNote}})();
'''

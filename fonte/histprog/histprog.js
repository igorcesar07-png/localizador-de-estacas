/* =====================================================================
   PÁGINA 10 — Histórico de programações (lista das programações validadas e salvas na Calculadora)
   Banco: coleção "programacoes" (resumo, carregado na lista) + "programacoes_dados" (dados completos, lidos ao abrir).
   Sem servidor (modo local/testes): guarda no aparelho.
   ===================================================================== */
(function HistProgPage(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const brD=iso=>iso?iso.split('-').reverse().join('/'):'';
  const nf=(v,d=0)=>Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
  const nrm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  const me=()=>{const u=window.ACL&&ACL.user;return u?{email:u.email,name:u.name||u.email}:{email:'local',name:'Este aparelho'}};
  const WD=iso=>{const [y,m,d]=iso.split('-').map(Number);const w=new Date(y,m-1,d).toLocaleDateString('pt-BR',{weekday:'long'});return w.charAt(0).toUpperCase()+w.slice(1)};
  // armazenamento local (sem login / testes)
  const LKEY='histProgs';
  const LOCAL={local:true,
    subscribe(cb){const f=()=>cb(Object.values(store.get(LKEY,{})||{}).map(x=>x.sum));f();window.addEventListener('histlocal',f);return ()=>window.removeEventListener('histlocal',f)},
    save(sum,data){const m=store.get(LKEY,{})||{};m[sum.id]={sum,data};store.set(LKEY,m);setTimeout(()=>window.dispatchEvent(new Event('histlocal')),0);return Promise.resolve()},
    get(id){const m=store.get(LKEY,{})||{};return Promise.resolve(m[id]?m[id].data:null)},
    remove(id,patch){const m=store.get(LKEY,{})||{};if(m[id])Object.assign(m[id].sum,patch);store.set(LKEY,m);setTimeout(()=>window.dispatchEvent(new Event('histlocal')),0);return Promise.resolve()}};
  const DB=()=>window.HistDB||LOCAL;
  let ALL=[],SUB=null,READY=false,ERR=null;const waiters=[];
  function start(){if(SUB)return;try{SUB=DB().subscribe((list,err)=>{if(err){ERR=err;READY=true;waiters.splice(0).forEach(f=>f());render();return}
      ALL=list||[];ERR=null;READY=true;waiters.splice(0).forEach(f=>f());render()})}catch(e){ERR=e;READY=true}}
  window.HistStore={all:()=>ALL.slice(),
    ready:()=>{start();return READY?Promise.resolve():new Promise(res=>{waiters.push(res);setTimeout(res,4000)})},
    save:(sum,data)=>{start();const p=DB().save(sum,data);const i=ALL.findIndex(x=>x.id===sum.id);if(i>=0)ALL[i]={...sum,__pend:true};else ALL.push({...sum,__pend:true});render();return p}};
  // filtros
  const F={de:'',ate:'',eq:'ALL',resp:'ALL',q:'',exc:false};
  const respOf=r=>[r.encarregado,r.atualizado_por_nome,r.criado_por_nome].filter(Boolean);
  function filtered(){const qs=nrm(F.q).split(/\s+/).filter(Boolean);
    return ALL.filter(r=>(F.exc||!r.excluido)&&(!F.de||r.data>=F.de)&&(!F.ate||r.data<=F.ate)&&(F.eq==='ALL'||r.equipe===F.eq)&&(F.resp==='ALL'||respOf(r).includes(F.resp))&&
      (!qs.length||qs.every(w=>(r.busca||nrm([r.equipe,r.obra,r.encarregado,brD(r.data)].join(' '))).includes(w)||nrm(r.atualizado_por_nome+' '+r.criado_por_nome).includes(w))))}
  function opts(id,list,cur,all){const el=$(id);el.innerHTML=`<option value="ALL">${all}</option>`+list.map(([v,t])=>`<option value="${esc(v)}"${v===cur?' selected':''}>${esc(t)}</option>`).join('');if(![...el.options].some(o=>o.value===cur)){el.value='ALL';return 'ALL'}return cur}
  function renderFilters(){const live=ALL.filter(r=>F.exc||!r.excluido);
    F.eq=opts('hpEq',[...new Set(live.map(r=>r.equipe))].sort().map(v=>[v,v]),F.eq,'Todas');
    const enc=[...new Set(live.map(r=>r.encarregado).filter(Boolean))].sort(),pro=[...new Set(live.flatMap(r=>[r.atualizado_por_nome,r.criado_por_nome]).filter(Boolean))].sort();
    const el=$('hpResp');el.innerHTML='<option value="ALL">Todos</option>'+(enc.length?`<optgroup label="Responsável da equipe">${enc.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}</optgroup>`:'')+(pro.length?`<optgroup label="Programado por">${pro.filter(v=>!enc.includes(v)).map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}</optgroup>`:'');
    if([...el.options].some(o=>o.value===F.resp))el.value=F.resp;else{F.resp='ALL';el.value='ALL'}}
  const servTxt=r=>{const t=r.totais||{},p=[];if(r.nSeg)p.push(`${r.nSeg} pano${r.nSeg>1?'s':''}${t.t>0?` · ${nf(t.t,2)} t CBUQ`:''}`);if(r.nDrn)p.push(`${r.nDrn} dreno${r.nDrn>1?'s':''} · ${nf(t.drnLen,0)} m`);return p.join('<br>')||'—'};
  const solTxt=r=>(r.servicos||[]).map(s=>`<span class="hpsol" title="${esc(s.desc)}">${esc(s.code)}</span>`).join(' ');
  const SENT={C:'crescente',D:'decrescente',ALL:'ambos os sentidos'};
  const stTxt=r=>r.excluido?'<span class="hpst exc">Excluída</span>':`<span class="hpst ${r.status==='ATUALIZADA'?'upd':'ok'}">${r.status==='ATUALIZADA'?`Atualizada · rev. ${r.revisao||2}`:'Validada'}</span>${r.__pend?'<span class="hpst pend">aguardando envio</span>':''}`;
  function render(){if(!$('hpList'))return;renderFilters();const L=filtered();const open=window.CalcHist&&CalcHist.active();
    $('hpCount').textContent=`${L.length} programaç${L.length===1?'ão':'ões'}`;
    if(ERR){$('hpMsg').hidden=false;$('hpMsg').textContent='Não foi possível ler o histórico'+(ERR.code==='permission-denied'?': sem permissão.':'. Confira a conexão.')}else if(!$('hpMsg').dataset.keep)$('hpMsg').hidden=true;
    if(!READY){$('hpList').innerHTML='<div class="card"><p class="hpempty">Carregando o histórico…</p></div>';return}
    if(!L.length){$('hpList').innerHTML=`<div class="card"><p class="hpempty">${ALL.length?'Nenhuma programação com estes filtros.':'Nenhuma programação salva ainda. Na Calculadora, gere o relatório e toque em <b>Salvar no histórico</b>.'}</p></div>`;return}
    const by=new Map();for(const r of L.sort((a,b)=>a.data<b.data?1:a.data>b.data?-1:a.equipe.localeCompare(b.equipe,'pt'))){if(!by.has(r.data))by.set(r.data,[]);by.get(r.data).push(r)}
    $('hpList').innerHTML=[...by].map(([d,rs])=>`<section class="card hpday"><h2>${esc(WD(d))}, ${brD(d)} <small>${rs.length} programaç${rs.length===1?'ão':'ões'}</small></h2>
      <div class="hptw"><table class="hptab"><thead><tr><th>Equipe</th><th>Responsável</th><th>Programado por</th><th>Trecho</th><th>Serviços</th><th>Atualizado em</th><th>Status</th><th><span class="sr">Ações</span></th></tr></thead><tbody>
      ${rs.map(r=>`<tr data-id="${esc(r.id)}" class="${r.excluido?'exc':''}${open&&open.id===r.id?' cur':''}">
        <td data-l="Equipe"><b>${esc(r.equipe)}</b>${open&&open.id===r.id?'<span class="hpst cur">aberta na Calculadora</span>':''}</td>
        <td data-l="Responsável">${esc(r.encarregado||'—')}</td>
        <td data-l="Programado por">${esc(r.atualizado_por_nome||r.criado_por_nome||'—')}</td>
        <td data-l="Trecho">${esc(/373/.test(r.obra)?'BR-373 B4':'BR-277 B2/B3')} · ${esc(r.kmA)} a ${esc(r.kmB)}<small>${esc(r.pista==='ALL'?'todas as faixas':r.pista)} · ${esc(SENT[r.sent]||r.sent||'')}</small></td>
        <td data-l="Serviços">${servTxt(r)}<small>${solTxt(r)}</small></td>
        <td data-l="Atualizado em">${new Date(r.atualizado_em).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}</td>
        <td data-l="Status">${stTxt(r)}</td>
        <td class="hpact">${r.excluido?'':`<button type="button" class="secondary" data-open="${esc(r.id)}">Abrir / editar</button><button type="button" class="secondary" data-rep="${esc(r.id)}">Relatório</button><button type="button" class="secondary hpdel" data-del="${esc(r.id)}" data-acl="histprog:delete">Excluir</button>`}</td></tr>`).join('')}
      </tbody></table></div></section>`).join('')}
  function say(t){const m=$('hpMsg');m.hidden=false;m.textContent=t;m.dataset.keep='1';setTimeout(()=>{delete m.dataset.keep},6000)}
  async function load(id,report){const sum=ALL.find(r=>r.id===id);if(!sum)return;
    if(!can('calculadora')){say('Para abrir a programação é preciso ter acesso à Calculadora de programação.');return}
    if(!window.CalcHist){say('Calculadora indisponível.');return}
    const cur=CalcHist.active();if(cur&&cur.id!==id&&!confirm('Já há uma programação do histórico aberta na Calculadora. Alterações não salvas dela serão descartadas. Abrir esta?'))return;
    say('Abrindo a programação…');let data=null;
    try{data=await Promise.race([DB().get(id),new Promise((_,rej)=>setTimeout(()=>rej(new Error('tempo esgotado')),12000))])}catch(e){say('Não foi possível ler os dados desta programação'+(e&&e.code==='unavailable'||/tempo/.test(e&&e.message||'')?': sem internet e ainda não guardada neste aparelho.':'.'));return}
    if(!data||!data.calc){say('Dados desta programação não encontrados.');return}
    CalcHist.open({sum,data},{report:!!report})}
  async function del(id){const r=ALL.find(x=>x.id===id);if(!r)return;
    if(!confirm(`Excluir do histórico a programação de ${brD(r.data)} – ${r.equipe}?\n\nEla deixa de aparecer na lista (fica marcada como excluída, visível em “Mostrar excluídas”).`))return;
    const u=me();try{await Promise.race([DB().remove(id,{excluido:true,excluido_em:Date.now(),excluido_por:u.email,excluido_por_nome:u.name}),new Promise(res=>setTimeout(res,4000))]);
      const i=ALL.findIndex(x=>x.id===id);if(i>=0&&!ALL[i].excluido)ALL[i]={...ALL[i],excluido:true};render();say(`Programação de ${brD(r.data)} – ${r.equipe} excluída do histórico.`)}
    catch(e){say('Não foi possível excluir: '+(e&&e.code==='permission-denied'?'sem permissão.':(e&&e.message||e)))}}
  function init(){if(!$('pHist'))return;
    [['hpDe','de'],['hpAte','ate'],['hpEq','eq'],['hpResp','resp']].forEach(([id,k])=>$(id).addEventListener('change',()=>{F[k]=$(id).value;render()}));
    $('hpQ').addEventListener('input',()=>{F.q=$('hpQ').value;render()});$('hpExc').addEventListener('change',()=>{F.exc=$('hpExc').checked;render()});
    $('hpClr').onclick=()=>{Object.assign(F,{de:'',ate:'',eq:'ALL',resp:'ALL',q:''});['hpDe','hpAte','hpQ'].forEach(i=>$(i).value='');render()};
    $('hpList').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.open)load(b.dataset.open,false);else if(b.dataset.rep)load(b.dataset.rep,true);else if(b.dataset.del)del(b.dataset.del)});
    const show=()=>{if(location.hash==='#histprog'){start();render()}};window.addEventListener('hashchange',show);show();
    if(can('histprog')&&can('calculadora'))setTimeout(start,1500)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  window.__HISTPROG={all:()=>ALL,F};
})();

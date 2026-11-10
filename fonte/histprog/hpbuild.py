# Injeta o "Histórico de programações" no template (idempotente). Só adições, mais 1 ajuste no emitir relatório:
# com uma programação do histórico aberta, emitir não muda o "último horário da equipe" nem a última programação.
import os,sys
D=os.path.dirname(os.path.abspath(__file__));P=os.path.join(D,'..','app.template.html')
s=open(P).read()
if 'id="pHist"' in s: print('já aplicado'); sys.exit()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,a[:100]);s=s.replace(a,b)
CALC=open(os.path.join(D,'histcalc.js')).read();PAGE=open(os.path.join(D,'histprog.js')).read()
NAV='<span>Calculadora de programação<small>CBUQ por pano no trecho</small></span></a>'
rep(NAV,NAV+'''
    <a href="#histprog" data-page="histprog"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/></svg><span>Histórico de programações<small>Programações salvas por data e equipe</small></span></a>''')
HTML='''<section class="page" id="pHist" data-page="histprog" hidden>
  <div class="topbar"><button class="menuBtn" type="button" data-menu aria-label="Abrir menu"></button><h1>Histórico de programações</h1></div>
  <div class="cscroll"><div class="cwrap">
    <div class="card hpfil">
      <h2>Filtros</h2>
      <div class="form hpgrid">
        <div class="fld"><label for="hpDe">De</label><input type="date" id="hpDe"></div>
        <div class="fld"><label for="hpAte">Até</label><input type="date" id="hpAte"></div>
        <div class="fld"><label for="hpEq">Equipe</label><select id="hpEq"><option value="ALL">Todas</option></select></div>
        <div class="fld"><label for="hpResp">Responsável</label><select id="hpResp"><option value="ALL">Todos</option></select></div>
        <div class="fld hpq"><label for="hpQ">Pesquisa</label><input type="search" id="hpQ" placeholder="Palavra-chave: estaca, solução, serial, observação, obra…" autocomplete="off"></div>
      </div>
      <div class="hprow"><label class="hpchk"><input type="checkbox" id="hpExc"> Mostrar excluídas</label><button type="button" class="secondary" id="hpClr">Limpar filtros</button><span id="hpCount" aria-live="polite"></span></div>
    </div>
    <div id="hpMsg" class="alert info" role="status" hidden></div>
    <div id="hpList"></div>
  </div></div>
</section>
'''
rep('<section class="page" id="pAna" data-page="analise" hidden>',HTML+'<section class="page" id="pAna" data-page="analise" hidden>')
CSS='''.histbar{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;justify-content:space-between;margin:0 0 14px;padding:12px 14px;border-radius:12px;background:var(--hl-man);border:1.5px solid var(--hl-man-bd);color:var(--ink)}
.histbar .hbtx{flex:1 1 320px;min-width:0}.histbar .hbtx b{display:block;font:800 16px/1.25 var(--cond)}.histbar small{display:block;margin-top:4px;color:var(--muted);line-height:1.35}
.histbar .hbwarn{color:var(--hl-chip-warn-ink,#8A4B00);font-weight:700}.histbar .hbbtn{display:flex;flex-wrap:wrap;gap:8px}.histbar .hbbtn button{min-height:42px}
#pHist{display:flex;flex-direction:column;background:var(--ground);color:var(--ink)}#pHist .topbar{background:var(--plate);color:var(--plate-ink)}
.hpgrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px 12px}.hpgrid .hpq{grid-column:1/-1}
.hprow{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;padding:4px 16px 16px}.hprow #hpCount{margin-left:auto;color:var(--muted);font-weight:700}
.hpchk{display:flex;align-items:center;gap:8px;font-weight:600}
.hpday h2 small{font:600 13px var(--sans,inherit);color:var(--muted);margin-left:6px;letter-spacing:0;text-transform:none}
.hptw{overflow-x:auto;-webkit-overflow-scrolling:touch;padding:0 12px 10px}
.hptab{width:100%;border-collapse:collapse;font-size:14px}.hptab th{text-align:left;font:800 12px/1.2 var(--cond);letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:8px 8px;border-bottom:2px solid var(--line);white-space:nowrap}
.hptab td{padding:10px 8px;border-bottom:1px solid var(--line);vertical-align:top}.hptab td small{display:block;color:var(--muted);margin-top:3px}
.hptab tr.cur td{background:var(--hl-man)}.hptab tr.exc td{opacity:.6}
.hpact{white-space:nowrap;text-align:right}.hpact button{min-height:38px;padding:6px 10px;margin:2px 0 2px 6px}
.hpsol{display:inline-block;font:800 11px/1 var(--cond);padding:3px 5px;border-radius:5px;border:1px solid var(--line);margin:2px 2px 0 0}
.hpst{display:inline-block;font:700 12px/1.2 var(--cond);padding:3px 8px;border-radius:999px;margin:2px 4px 2px 0;white-space:nowrap}
.hpst.ok{background:#E3F4EA;color:#14653C}.hpst.upd{background:#E6EEFB;color:#1D4E9E}.hpst.exc{background:#F3E1E1;color:#8E1B1B}.hpst.pend{background:#FFF2D6;color:#7A5200}.hpst.cur{background:var(--hl-man-badge,#DCE8FF);color:var(--hl-man-ink,#1D4E9E);display:block;width:max-content;margin-top:4px}
:root[data-theme="dark"] .hpst.ok{background:#173A28;color:#9FE0BC}:root[data-theme="dark"] .hpst.upd{background:#1B2B48;color:#A9C6F5}:root[data-theme="dark"] .hpst.exc{background:#3E1D1D;color:#F0B1B1}:root[data-theme="dark"] .hpst.pend{background:#3D3015;color:#F2D18C}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .hpst.ok{background:#173A28;color:#9FE0BC}:root:not([data-theme="light"]) .hpst.upd{background:#1B2B48;color:#A9C6F5}:root:not([data-theme="light"]) .hpst.exc{background:#3E1D1D;color:#F0B1B1}:root:not([data-theme="light"]) .hpst.pend{background:#3D3015;color:#F2D18C}}
.hpempty{margin:0;color:var(--muted)}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@media (max-width:760px){.hpgrid{grid-template-columns:1fr 1fr}
  .hptab thead{display:none}.hptab,.hptab tbody,.hptab tr,.hptab td{display:block;width:100%}.hptab tr{border:1px solid var(--line);border-radius:12px;padding:6px 10px;margin:0 0 10px}
  .hptab td{border:0;padding:5px 0;display:grid;grid-template-columns:118px 1fr;gap:8px}.hptab td::before{content:attr(data-l);font:800 11px/1.5 var(--cond);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
  .hptab td.hpact{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-start;padding-top:8px}.hptab td.hpact::before{display:none}.hpact button{margin:0;flex:1 1 30%}}
'''
rep('.pend{margin:0 16px;',CSS+'.pend{margin:0 16px;')
for a in ["for(const pg of ['localizacao','mapa','mapab4','calculadora','analise','marcos','levbe','levpat','foto','relatorios']){if(!can(pg))",
          "const PAGES=['localizacao','mapa','mapab4','calculadora','analise','marcos','levbe','levpat','foto','relatorios'].filter(p=>can(p))"]:
    rep(a,a.replace("'calculadora',","'calculadora','histprog',"))
rep('title="Arquivo para importar no Controle de Massa">Exportar JSON</button>','title="Arquivo para importar no Controle de Massa">Exportar JSON</button><button type="button" class="go2" id="rvHist" data-acl="histprog:create">Salvar no histórico</button>')
rep('''<div class="cscroll">
    <div class="cwrap">
      <form class="card" id="cForm" novalidate>''','''<div class="cscroll">
    <div class="cwrap">
      <div class="histbar" id="histBar" role="status" hidden></div>
      <form class="card" id="cForm" novalidate>''')
rep("store.set('progLast',info);saveMain();saveTeam(info.equipe,info);TDIRTY=false;","if(!HM){store.set('progLast',info);saveTeam(info.equipe,info);TDIRTY=false}saveMain(); // programação do histórico aberta: não vira o último horário da equipe")
rep('  const esc=s=>String(s).replace(/[&<>"]/g',CALC+'  const esc=s=>String(s).replace(/[&<>"]/g')
i=s.index("\non('page',p=>{if(p==='admin'&&ACL&&ACL.admin&&ACL.renderAdmin)")
s=s[:i]+'\n'+PAGE+s[i:]
open(P,'w').write(s);print('ok')

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
      <div class="hpfh"><h2>Filtros</h2><span id="hpCount" aria-live="polite"></span></div>
      <div class="hpgrid">
        <div class="fld"><label for="hpDe">De</label><input type="date" id="hpDe"></div>
        <div class="fld"><label for="hpAte">Até</label><input type="date" id="hpAte"></div>
        <div class="fld hpeqf"><label for="hpEq">Equipe</label><select id="hpEq"><option value="ALL">Todas</option></select></div>
        <div class="fld hpq"><label for="hpQ">Pesquisa</label><input type="search" id="hpQ" placeholder="Estaca, solução, serial, observação…" autocomplete="off"></div>
      </div>
      <div class="hprow"><label class="hpchk"><input type="checkbox" id="hpExc"> Mostrar excluídas</label><button type="button" class="hplimpa" id="hpClr">Limpar filtros</button></div>
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
#pHist .cwrap{max-width:1180px}
.hpfil{padding:14px 16px 12px}.hpfh{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:10px}
.hpfh h2{margin:0;font:800 13px/1 var(--cond);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}#hpCount{font:700 13px var(--body);color:var(--muted)}
.hpgrid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1.3fr) minmax(0,2fr);gap:10px 12px}
.hpgrid>.fld{grid-column:auto}
.hpfil .fld input,.hpfil .fld select{min-height:44px;font-size:16px;font-weight:600}
.hpfil input[type=date]{-webkit-appearance:none;appearance:none;display:block;width:100%;min-width:0;max-width:100%;line-height:44px}
.hpfil input[type=date]::-webkit-date-and-time-value{text-align:left}
.hprow{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 16px;margin-top:10px}
.hpchk{display:flex;align-items:center;gap:8px;font:600 14px var(--body);color:var(--ink)}.hpchk input{width:18px;height:18px}
.hplimpa{min-height:36px;padding:6px 14px;border-radius:999px;border:1px solid var(--line);background:transparent;color:var(--ink);font:700 14px var(--body)}
.hpday{margin:18px 0 0}.hpdh{display:flex;align-items:baseline;gap:10px;margin:0 2px 8px}
.hpdh h2{margin:0;font:800 14px/1.2 var(--cond);letter-spacing:.1em;text-transform:uppercase;color:var(--ink)}
.hpcnt{font:700 12px/1 var(--body);color:var(--muted);background:var(--surface-2);border:1px solid var(--line);padding:4px 9px;border-radius:999px}
.hpcards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px}
.hpcard{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 14px 10px;display:flex;flex-direction:column;min-width:0}
.hpcard.exc{opacity:.6}
.hpeq{margin:0;font:800 18px/1.2 var(--cond);letter-spacing:.04em;text-transform:uppercase;color:var(--ink);overflow-wrap:anywhere}
.hpx{font:700 11px/1 var(--body);letter-spacing:0;text-transform:none;color:var(--bad);border:1px solid currentColor;border-radius:999px;padding:2px 7px;vertical-align:middle}
.hptr{margin:8px 0 0;display:flex;flex-wrap:wrap;align-items:center;gap:6px;font:700 14px/1.3 var(--body);color:var(--ink)}
.hpfx{font:700 12px/1 var(--body);color:var(--muted);border:1px solid var(--line);border-radius:6px;padding:3px 6px}
.hpkm{margin:3px 0 0;font:600 15px/1.3 var(--body);color:var(--ink);font-variant-numeric:tabular-nums}
.hpsv{margin-top:10px;padding:8px 10px;border-radius:10px;background:var(--surface-2)}
.hpsvh{display:block;font:800 11px/1 var(--cond);letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:5px}
.hpsvl{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 8px;font:600 14px/1.35 var(--body);color:var(--ink)}
.hpsep{color:var(--muted)}.hpt b{font:800 19px/1 var(--cond);letter-spacing:.01em;color:var(--ink)}
.hpbtns{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;padding-top:9px;border-top:1px solid var(--line)}
.hpb{flex:1 1 auto;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:36px;padding:5px 10px;border-radius:9px;border:1px solid var(--line);background:transparent;color:var(--ink);font:600 13.5px var(--body);white-space:nowrap;cursor:pointer}
.hpb svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none}
.hpb:hover{background:var(--surface-2)}.hpb.del{flex:0 1 auto;color:var(--bad);border-color:color-mix(in srgb,var(--bad) 35%,var(--line))}
.hpempty{margin:18px 2px;color:var(--muted)}
@media (max-width:760px){.hpgrid{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.hpgrid>.hpeqf,.hpgrid>.hpq{grid-column:1/-1}.hpcards{grid-template-columns:1fr}}
@media (max-width:760px){.hpbtns{flex-wrap:nowrap;gap:5px}.hpb{flex:1 1 auto;min-width:0;padding:5px 7px;gap:5px;font-size:13px}.hpb span{overflow:hidden;text-overflow:ellipsis}}
@media (max-width:350px){.hpb svg{display:none}}
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

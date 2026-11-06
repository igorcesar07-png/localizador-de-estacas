# Injeta a página "Levantamento de Patologias" no template (idempotente).
# Só adições: item no menu, nome da página nas 2 listas de páginas, HTML/CSS/JS novos.
# O HTML é clonado da página de bota-espera (mesmas classes lv-*, ids lp*) e adaptado (faixa e patologia).
import os,re,sys
D=os.path.dirname(os.path.abspath(__file__));P=os.path.join(D,'..','app.template.html')
s=open(P).read()
if 'id="pPat"' in s: print('já aplicado'); sys.exit()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,a[:100]);s=s.replace(a,b)
JS=open(os.path.join(D,'levpat.js')).read()
a=s.index('<section class="page" id="pLev"');b=s.index('</div></div></div>\n',s.index('<div class="modal" id="lvMv"'))+len('</div></div></div>\n')
H=s[a:b]
H=re.sub(r'\blv([A-Z])',r'lp\1',H).replace('id="pLev" data-page="levbe"','id="pPat" data-page="levpat"')
def hr(x,y):
    global H
    assert H.count(x)==1,(H.count(x),x[:80]);H=H.replace(x,y)
hr('<h1>Levantamento de Bota-Espera</h1>','<h1>Levantamento de Patologias</h1>')
hr('<div class="fld"><label for="lpFTipo">Tipo</label><select id="lpFTipo"></select></div>','<div class="fld"><label for="lpFFaixa">Faixa</label><select id="lpFFaixa"></select></div>')
hr('<div class="fld"><label for="lpFOc">Ocupação</label><select id="lpFOc"></select></div>','<div class="fld"><label for="lpFPat">Patologia</label><select id="lpFPat"></select></div>')
hr('<h2>Registros por estaca','<h2>Ocorrências por estaca')
m=re.search(r'<div class="fld"><label for="lpEdTipo">.*?</select></div>',H);H=H.replace(m.group(0),'<div class="fld"><label for="lpEdPat">Patologia</label><select id="lpEdPat"><option value="PANELA">Panela</option></select></div>')
hr('<option value="DECRESCENTE">Pista Decrescente</option></select></div>','<option value="DECRESCENTE">Pista Decrescente</option></select></div>\n      <div class="fld"><label for="lpEdFaixa">Faixa</label><select id="lpEdFaixa"><option value="F1">Faixa 1</option><option value="F2">Faixa 2</option></select></div>')
hr('<h2 id="lpEdT">Registro</h2>','<h2 id="lpEdT">Ocorrência</h2>')
assert not re.search(r'\blv[A-Z]',H)
CSS='''#pPat{display:flex;flex-direction:column;background:var(--ground);color:var(--ink)}#pPat .topbar{background:var(--plate);color:var(--plate-ink);gap:10px}
#pPat .topbar h1{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lp-fx{flex:1;display:flex;gap:8px;min-height:0}.lv-left .lp-fx{flex-direction:row-reverse}
.lv-btn.lp-btn{flex:1 1 0;min-width:0;flex-direction:column;justify-content:center;text-align:center;gap:6px;padding:10px 6px}
.lp-btn span{align-items:center}.lp-btn svg{width:44px;height:44px}.lv-btn.lp-btn b{font-size:clamp(20px,3.2vw,30px)}
.lv-btn.lp-btn small{font:800 clamp(14px,2.1vw,19px)/1.1 var(--cond);letter-spacing:.06em;opacity:1;padding:3px 8px;border-radius:999px;background:rgba(0,0,0,.22);white-space:nowrap}
.lp-pan{background:#A8480C}.lv-toast.lp-pan{background:#7E3508}
@media (orientation:portrait),(max-width:700px){#pPat .topbar h1{font-size:15px}.lp-fx{gap:6px}.lp-btn svg{width:34px;height:34px}}
@media (orientation:landscape) and (max-height:520px){#pPat .topbar{padding:3px 10px;gap:8px}#pPat .topbar .menuBtn{width:38px;height:38px}.lv-btn.lp-btn{gap:4px}.lp-btn svg{width:30px;height:30px}}
'''
NAV='''    <a href="#levpat" data-page="levpat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><ellipse cx="12" cy="14" rx="8.5" ry="5"/><path d="M7.5 13.5c1.4 1.5 7.6 1.5 9 0"/><path d="M6 6l2 2M12 4v3M18 6l-2 2"/></svg><span>Levantamento de Patologias<small>Panelas por pista e faixa</small></span></a>
    <a href="#analise" data-page="analise">'''
rep('    <a href="#analise" data-page="analise">',NAV)
rep('<section class="page" id="pAna" data-page="analise" hidden>',H+'<section class="page" id="pAna" data-page="analise" hidden>')
rep('.pend{margin:0 16px;',CSS+'.pend{margin:0 16px;')
rep("for(const pg of ['localizacao','mapa','mapab4','calculadora','analise','marcos','levbe','foto','relatorios']){if(!can(pg))","for(const pg of ['localizacao','mapa','mapab4','calculadora','analise','marcos','levbe','levpat','foto','relatorios']){if(!can(pg))")
rep("const PAGES=['localizacao','mapa','mapab4','calculadora','analise','marcos','levbe','foto','relatorios'].filter(p=>can(p))","const PAGES=['localizacao','mapa','mapab4','calculadora','analise','marcos','levbe','levpat','foto','relatorios'].filter(p=>can(p))")
i=s.index("\non('page',p=>{if(p==='admin'&&ACL&&ACL.admin&&ACL.renderAdmin)")
s=s[:i]+'\n'+JS+s[i:]
open(P,'w').write(s);print('ok')

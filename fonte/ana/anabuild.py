# injeta a página "Análise por km" no template (idempotente: só aplica se ainda não existir)
import re,sys
P='/home/claude/work/app.template.html'
s=open(P).read()
if 'id="pAna"' in s: print('já aplicado'); sys.exit()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,a[:100]);s=s.replace(a,b)
JS=open('/home/claude/work/ana/ana.js').read()
HTML='''<section class="page" id="pAna" data-page="analise" hidden>
  <div class="topbar"><button class="menuBtn" type="button" data-menu aria-label="Abrir menu"></button><h1>Análise por km</h1></div>
  <div class="cscroll">
    <div class="cwrap">
      <div class="card"><h2>Filtros</h2>
        <div class="form">
          <div class="fld"><label for="aObra">Obra</label><select id="aObra"><option value="277">BR-277 — Blocos 02 e 03</option><option value="B4">BR-373 — Bloco 04</option></select></div>
          <div class="fld s1"><label for="aKA">Km inicial</label><input id="aKA" type="number" inputmode="numeric" placeholder="início"></div>
          <div class="fld s1"><label for="aKB">Km final</label><input id="aKB" type="number" inputmode="numeric" placeholder="fim"></div>
          <div class="fld"><label for="aSent">Sentido</label><select id="aSent"><option value="ALL">Ambos</option><option value="C">Crescente</option><option value="D">Decrescente</option></select></div>
          <div class="fld"><label for="aInd">Cor do mapa e do diagrama</label><select id="aInd"><option value="m">Metros de serviço</option><option value="t">CBUQ (t)</option><option value="n">Nº de segmentos</option><option value="frag">Fragmentação (seg./100 m)</option><option value="pL">% dos metros em segmentos ≥ 100 m</option></select></div>
          <div class="fld"><label for="aGap">Sequência contínua: intervalo máximo <em>(m)</em></label><input id="aGap" type="number" inputmode="numeric" min="0" step="20"><span class="hint">Distância entre segmentos da mesma pista para considerar a frente contínua.</span></div>
        </div>
        <div class="an-pg"><h3>Pista</h3><div class="an-pills" id="aLanes"></div></div>
        <div class="an-pg"><h3>Solução <button type="button" class="linkbtn" id="aSolPav">só pavimento</button> · <button type="button" class="linkbtn" id="aSolAll">todas</button></h3><div class="an-pills" id="aSol"></div></div>
        <div class="an-pg" id="aStBox"><h3>Status de execução</h3><div class="an-pills" id="aSt"></div></div>
        <p class="note an-pad" id="aStNone" hidden>Status de execução: sem dados para esta obra (os registros de execução da página Relatórios são da BR-277).</p>
        <p class="note an-pad" id="aSrcNote"></p>
        <div class="an-act"><button type="button" class="secondary" id="aReset">Limpar filtros</button><button type="button" class="primary" id="aExp">Exportar análise e programação (Excel)</button></div>
        <p class="note an-pad" id="aExpMsg" hidden aria-live="polite"></p>
      </div>
      <div class="alert warn" id="aMsg" hidden></div>
      <div class="an-sum" id="aSum"></div>
      <div class="card" id="aDiagCard"><h2>Diagrama linear por km</h2>
        <div class="an-dh"><label class="an-chk"><input type="checkbox" id="aRange"> Selecionar intervalo (toque no km inicial e no final)</label><span id="aSelTxt" class="note"></span></div>
        <div class="an-leg" id="aLegend"></div>
        <div class="an-diag" id="aDiag" role="group" aria-label="Quilômetros da rodovia"></div>
        <p class="note an-pad">Faixa colorida: indicador escolhido. Barras: metros de serviço por solução, com altura relativa ao km de maior serviço.</p></div>
      <div class="card"><h2>Mapa por km</h2><div id="aMap" class="an-map"></div><p class="note an-pad">Cada km desenhado pelas coordenadas das estacas do KMZ e colorido pelo indicador. Toque em um km para selecionar.</p></div>
      <div class="card"><h2>Estratégia de execução</h2><div class="an-in" id="aStrat"></div></div>
      <div class="card"><h2>Simulação da programação</h2>
        <div class="form">
          <div class="fld s1"><label for="aSimCap">Capacidade diária de execução</label><input id="aSimCap" type="number" inputmode="decimal" min="0" placeholder="informe"></div>
          <div class="fld s1"><label for="aSimU">Unidade</label><select id="aSimU"><option value="m2">m²/dia</option><option value="m">m de serviço/dia</option><option value="t">t/dia</option></select></div>
          <div class="fld"><label for="aSimDisp">Disponibilidade diária de CBUQ <em>(t/dia)</em></label><input id="aSimDisp" type="number" inputmode="decimal" min="0" placeholder="informe"></div>
          <div class="fld"><label for="aSimTruck">Capacidade do caminhão <em>(t)</em></label><input id="aSimTruck" type="number" inputmode="decimal" min="0" placeholder="informe"></div>
        </div><div class="an-in" id="aSimOut"></div></div>
      <div class="card"><h2>Quilômetros <span class="an-sort"><label for="aSort">ordenar por</label><select id="aSort"><option value="km">km (ordem da rodovia)</option><option value="m">metros de serviço</option><option value="t">CBUQ (t)</option><option value="n">nº de segmentos</option><option value="frag">fragmentação</option></select></span></h2><div class="tscroll" id="aKmTab"></div></div>
      <div class="card"><h2 id="aSegHead">Segmentos</h2><div class="tscroll" id="aSegTab"></div></div>
    </div>
  </div>
</section>
'''
CSS='''.an-pg{padding:0 16px 12px}.an-pg h3{margin:0 0 8px;font:700 12px var(--body);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.an-pills{display:flex;flex-wrap:wrap;gap:8px}.an-p{min-height:42px}.an-p .sw{width:14px;height:14px;border-radius:4px;flex:none}
.an-pad{padding:0 16px;margin:0 0 10px}.an-act{display:flex;flex-wrap:wrap;gap:10px;padding:4px 16px 14px}.an-act button{min-height:48px}
.linkbtn{background:none;border:0;padding:0;color:var(--accent-text,#B00E17);font:inherit;font-weight:700;text-decoration:underline;cursor:pointer;text-transform:none;letter-spacing:0}
.an-sum{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
.an-dist{grid-column:1 / -1;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
.an-db{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:10px 12px}.an-db h4{margin:0 0 6px;font:700 12px var(--body);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.an-dr{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr) auto;gap:8px;align-items:center;font-size:13px;padding:2px 0}.an-dn{display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.an-dn i{width:10px;height:10px;border-radius:3px;flex:none}
.an-dbar{height:8px;background:var(--surface-2);border-radius:4px;overflow:hidden}.an-dbar b{display:block;height:100%}.an-dv{font-variant-numeric:tabular-nums;color:var(--muted);white-space:nowrap}
.an-dh{display:flex;flex-wrap:wrap;gap:6px 18px;align-items:center;padding:10px 16px 4px}.an-chk{display:flex;gap:8px;align-items:center;font-weight:600;font-size:14px}.an-chk input{width:20px;height:20px}
.an-leg{display:flex;flex-wrap:wrap;gap:4px 14px;padding:6px 16px;font-size:12.5px;color:var(--muted)}.an-leg b{color:var(--ink)}.an-leg span{display:flex;align-items:center;gap:5px}.an-leg i{width:14px;height:10px;border-radius:2px;border:1px solid rgba(0,0,0,.12)}
.an-diag{display:flex;gap:2px;overflow-x:auto;padding:8px 16px 10px;-webkit-overflow-scrolling:touch}
.an-km{flex:1 0 22px;min-width:22px;max-width:56px;display:flex;flex-direction:column;align-items:stretch;gap:3px;background:none;border:0;padding:2px 0;cursor:pointer;border-radius:6px}
.an-km .an-c{height:26px;border-radius:4px;border:1px solid rgba(0,0,0,.08)}.an-km .an-bars{height:90px;display:flex;flex-direction:column-reverse;background:var(--surface-2);border-radius:3px;overflow:hidden}.an-km .an-bars b{display:block;width:100%}
.an-km .an-kl{font:600 10.5px var(--body);color:var(--muted);text-align:center;writing-mode:vertical-rl;transform:rotate(180deg);height:30px}
.an-km.on{background:color-mix(in srgb,var(--ink) 12%,transparent);outline:2px solid var(--ink)}.an-km.on .an-kl{color:var(--ink);font-weight:800}
.an-map{height:400px;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.an-in{padding:10px 16px 16px;display:grid;gap:12px}.an-in .tscroll{border:1px solid var(--line);border-radius:10px}
.an-hl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.an-hl > div{border:1px solid var(--line);border-radius:12px;padding:10px 12px}.an-hl h4{margin:0 0 4px;font:700 13px var(--body)}.an-hl .note{margin:0 0 6px;font-size:12px}.an-hl ol{margin:0;padding-left:18px;font-size:13.5px;line-height:1.5}
.an-warn{margin:0;padding:10px 12px;border-radius:10px;background:var(--warn-bg);border:1px solid var(--warn);font-size:13.5px}
.an-h3{margin:4px 0 0;font:700 14px var(--body)}.an-h4{margin:4px 0 0;font:700 13px var(--body)}
.an-kv{display:flex;flex-wrap:wrap;gap:8px}.an-kv span{border:1px solid var(--line);border-radius:10px;padding:6px 10px;font-size:13px;color:var(--muted)}.an-kv b{color:var(--ink);margin-left:4px}
table.an-t td small{color:var(--muted)}table.an-t tr.an-on td{background:color-mix(in srgb,var(--accent) 18%,var(--surface))}.an-orig{display:block;font-weight:500}
.an-sort{float:right;display:flex;gap:6px;align-items:center;text-transform:none;letter-spacing:0;font-weight:600}.an-sort select{min-height:36px;border-radius:8px;border:1px solid var(--line);background:var(--surface-2);color:var(--ink);font:600 13px var(--body)}
.an-items{white-space:normal;min-width:320px}.an-it{display:block;padding:2px 0;font-size:13px}.an-it.sk{color:var(--bad)}
.an-prem{font-size:12.5px;color:var(--muted);line-height:1.45}.an-sk{grid-template-columns:repeat(4,minmax(0,1fr))}
@media (max-width:900px){.an-sum{grid-template-columns:repeat(2,minmax(0,1fr))}.an-hl{grid-template-columns:1fr}.an-sk{grid-template-columns:repeat(2,minmax(0,1fr))}.an-map{height:320px}.an-sort{float:none;margin-top:6px}}
'''
NAV='''    <a href="#analise" data-page="analise"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 20h18"/><path d="M5 17V9M9 17V5M13 17v-6M17 17V7"/></svg><span>Análise por km<small>Estratégia de execução e simulação</small></span></a>
    <a href="#relatorios" data-page="relatorios">'''
rep('    <a href="#relatorios" data-page="relatorios">',NAV)
rep('<section class="page" id="pRel" data-page="relatorios" hidden>',HTML+'<section class="page" id="pRel" data-page="relatorios" hidden>')
rep('.pend{margin:0 16px;',CSS+'.pend{margin:0 16px;')
rep("for(const pg of ['localizacao','mapa','mapab4','calculadora','foto','relatorios']){if(!can(pg))","for(const pg of ['localizacao','mapa','mapab4','calculadora','analise','foto','relatorios']){if(!can(pg))")
rep("const PAGES=['localizacao','mapa','mapab4','calculadora','foto','relatorios'].filter(p=>can(p))","const PAGES=['localizacao','mapa','mapab4','calculadora','analise','foto','relatorios'].filter(p=>can(p))")
# status de execução por trecho, a partir dos registros da página Relatórios (BR-277)
rep('''    return byL}

  /* ---------- estado dos filtros ---------- */''','''    return byL}
  window.ExecIdx=()=>{const idx=indexRecords();return (L,a,b)=>{const o=idx[L];if(!o)return {st:'nao',exLen:0,prLen:0,anLen:0};const hit=r=>Math.min(b,r.b)-Math.max(a,r.a)>1e-6;
    const exU=unite(o.ex.filter(hit).map(r=>[r.a,r.b])),exLen=clipLen(exU,a,b),anLen=clipLen(unite(o.an.filter(hit).map(r=>[r.a,r.b])),a,b);let prLen=0;
    for(const x of unite(o.pr.filter(hit).map(r=>[r.a,r.b]))){const xa=Math.max(a,x[0]),xb=Math.min(b,x[1]);if(xb>xa)prLen+=(xb-xa)-clipLen(exU,xa,xb)}
    const len=b-a;return {st:exLen>=len-0.5?'exec':exLen>0.5||anLen>0.5?'and':prLen>0.5?'prog':'nao',exLen,prLen,anLen}}};

  /* ---------- estado dos filtros ---------- */''')
# Relatórios: larguras por pano da BR-277 (a calculadora guarda o estado por obra)
rep("rowW:t=>num((c.rowW||{})[t]),dens}}","rowW:t=>num((((c.bySrc&&c.bySrc['277'])||c).rowW||{})[t]),dens}}")
rep("on('page',p=>{if(p==='admin'&&ACL&&ACL.admin&&ACL.renderAdmin)ACL.renderAdmin($('admRoot'))});",JS+"\non('page',p=>{if(p==='admin'&&ACL&&ACL.admin&&ACL.renderAdmin)ACL.renderAdmin($('admRoot'))});")
open(P,'w').write(s);print('ok')

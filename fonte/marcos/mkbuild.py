# injeta a página "Marcos do trecho" no template (idempotente)
import sys
P='/home/claude/work/app.template.html'
s=open(P).read()
if 'id="pMk"' in s: print('já aplicado'); sys.exit()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,a[:100]);s=s.replace(a,b)
UTM=open('/home/claude/work/marcos/utm.js').read().split("if(typeof module")[0]
JS=open('/home/claude/work/marcos/marcos.js').read().replace('  /*__UTM__*/','  '+UTM.strip())
HTML='''<section class="page" id="pMk" data-page="marcos" hidden>
  <div class="topbar"><button class="menuBtn" type="button" data-menu aria-label="Abrir menu"></button><h1>Marcos do trecho</h1></div>
  <div class="cscroll">
    <div class="cwrap mk-wrap">
      <div class="card mk-top">
        <div class="mk-tools">
          <div class="fld"><label for="mkRod">Rodovia</label><select id="mkRod"><option value="ALL">Lotes 02, 03 e 04</option><option value="BR-277">BR-277 — Lotes 02 e 03</option><option value="BR-373">BR-373 — Lote 04</option></select></div>
          <div class="fld mk-q"><label for="mkQ">Buscar</label><input id="mkQ" type="search" placeholder="nome, km, município, nº de cadastro…" autocomplete="off"></div>
          <label class="an-chk mk-fl2"><input type="checkbox" id="mkFlag"> Só os que pedem conferência</label>
        </div>
        <div class="mk-btns"><button type="button" class="primary" id="mkAdd">＋ Novo marco</button>
          <label class="secondary mk-imp" id="mkImpL" tabindex="0"><input type="file" id="mkFile" accept=".xlsx,.xls,.csv,.json" hidden>Importar planilha</label>
          <button type="button" class="secondary" id="mkExp">Exportar (Excel)</button><button type="button" class="secondary" id="mkSat">Satélite</button></div>
        <p class="note mk-pad" id="mkMode" hidden></p>
        <div class="mk-msg" id="mkMsg" hidden aria-live="polite"></div><div class="mk-msg" id="mkImpMsg" hidden aria-live="polite"></div>
        <div class="mk-leg" id="mkLeg" role="group" aria-label="Legenda e camadas"></div>
      </div>
      <div class="mk-body">
        <div class="card mk-mapc"><div id="mkMap" class="mk-map" aria-label="Mapa do trecho"></div></div>
        <div class="card mk-side"><h2>Marcos <em class="rcnt" id="mkCount"></em></h2><div class="mk-list" id="mkList"></div></div>
      </div>
      <p class="note mk-pad">Estacas dos lotes 02 e 03 (BR-277) e do lote 04 (BR-373) pelas coordenadas do KMZ: marcos de km a partir do zoom 11 e estacas de 20 m a partir do zoom 15. Coordenadas UTM em SIRGAS 2000, fuso 22 Sul. Um marco fica marcado para conferir quando a coordenada está a mais de 300 m do km informado.</p>
    </div>
  </div>
</section>
<div class="modal" id="mkForm" hidden role="dialog" aria-modal="true" aria-labelledby="mkFT">
  <form class="mbox" id="mkFormEl" novalidate>
    <h2 id="mkFT">Novo marco</h2>
    <div class="mgrid">
      <div class="fld"><label for="mkFCat">Tipo</label><select id="mkFCat"></select></div>
      <div class="fld"><label for="mkFRod">Rodovia</label><select id="mkFRod"><option value="BR-277">BR-277 — Lotes 02 e 03</option><option value="BR-373">BR-373 — Lote 04</option></select></div>
      <div class="fld"><label for="mkFKm">Km</label><input id="mkFKm" autocomplete="off" placeholder="185+300"><span class="hint" id="mkFKmHint"></span></div>
      <div class="fld" id="mkFKmFW"><label for="mkFKmF">Km final <em>(fim do perímetro)</em></label><input id="mkFKmF" autocomplete="off" placeholder="187+100"></div>
      <div class="fld"><label for="mkFSent">Sentido</label><select id="mkFSent"><option value="">—</option><option value="C">Crescente</option><option value="D">Decrescente</option><option value="A">Ambos</option></select></div>
      <div class="fld"><label for="mkFNome">Nome</label><input id="mkFNome" maxlength="120" placeholder="ex.: Bota-espera Ponta Grossa"></div>
      <div class="fld"><label for="mkFMun">Município</label><input id="mkFMun" maxlength="80"></div>
      <div class="fld"><label for="mkFPos">Posição no mapa</label><select id="mkFPos"><option value="km">Na estaca do km</option><option value="coord">Latitude e longitude</option><option value="utm">UTM (x, y) — fuso 22 Sul</option></select></div>
      <div class="fld" id="mkFLL"><label>Latitude · longitude</label><div class="drow"><input id="mkFLat" inputmode="decimal" placeholder="-25.4655"><input id="mkFLon" inputmode="decimal" placeholder="-50.5080"></div></div>
      <div class="fld" id="mkFUTM"><label>UTM x · y <em>(m)</em></label><div class="drow"><input id="mkFE" inputmode="decimal" placeholder="549458.16"><input id="mkFN" inputmode="decimal" placeholder="7183158.89"></div></div>
      <div class="fld w2"><label for="mkFObs">Observações</label><textarea id="mkFObs" rows="3" maxlength="1000"></textarea></div>
    </div>
    <fieldset class="mset"><legend>Informações do documento (PDF / planilha)</legend><div class="mgrid">
      <div class="fld"><label for="mkFCad">Nº de cadastro</label><input id="mkFCad" maxlength="40" placeholder="242_277"></div>
      <div class="fld"><label for="mkFPTipo">Tipo no documento</label><input id="mkFPTipo" maxlength="80" placeholder="Depósito Fresado"></div>
      <div class="fld"><label for="mkFPObra">Obra ou atividade</label><input id="mkFPObra" maxlength="80"></div>
      <div class="fld"><label for="mkFPData">Data do cadastro</label><input id="mkFPData" maxlength="20" placeholder="dd/mm/aaaa"></div>
      <div class="fld"><label for="mkFPEmp">Empreiteira responsável</label><input id="mkFPEmp" maxlength="80"></div>
      <div class="fld"><label for="mkFPDoc">Documento de origem</label><input id="mkFPDoc" maxlength="120" placeholder="ÁREAS FRESADO.pdf"></div></div></fieldset>
    <div class="pend" id="mkFErr" hidden></div>
    <div class="mfoot"><button type="button" class="secondary" id="mkFCancel">Cancelar</button><button type="submit" class="primary">Salvar marco</button></div>
  </form>
</div>
'''
CSS='''#pMk{display:flex;flex-direction:column;background:var(--ground)}#pMk .topbar{background:var(--plate);color:var(--plate-ink)}
.mk-wrap{max-width:1400px}.mk-top{padding:12px 16px;display:grid;gap:10px}.mk-pad{margin:0}
.mk-tools{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr) auto;gap:10px;align-items:end}.mk-tools .fld{grid-column:auto}.mk-fl2{padding-bottom:12px}
.mk-btns{display:flex;flex-wrap:wrap;gap:8px}.mk-btns > *{min-height:46px}.mk-imp{display:inline-flex;align-items:center;padding:0 16px;border-radius:12px;cursor:pointer;font-weight:700;border:1px solid var(--line);background:var(--surface);color:var(--ink)}
.mk-leg{display:flex;flex-wrap:wrap;gap:6px 8px}.mk-lg{display:flex;align-items:center;gap:6px;min-height:40px;padding:3px 10px 3px 5px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:600 13px var(--body);cursor:pointer}
.mk-lg b{font-variant-numeric:tabular-nums;color:var(--muted)}.mk-lg[aria-pressed="false"]{background:var(--surface-2);color:var(--muted)}.mk-lg[aria-pressed="false"] svg{filter:grayscale(1) opacity(.45)}
.mk-lot{display:flex;flex-wrap:wrap;gap:4px 14px;align-items:center;font-size:12.5px;color:var(--muted);padding:4px 2px}.mk-lot span{display:flex;align-items:center;gap:5px}.mk-lot i{width:22px;height:5px;border-radius:3px;display:inline-block}
.mk-lot i.mk-pb{height:10px;background:rgba(106,27,154,.3)}.mk-lot i.mk-fl,.mk-w{width:15px;height:15px;border-radius:50%;background:#F5B400;color:#111;font:800 11px/15px var(--body);text-align:center;font-style:normal}
.mk-body{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:16px;align-items:start}
.mk-map{height:calc(100vh - 290px);min-height:420px;border-radius:14px}.mk-map.placing{cursor:crosshair;outline:3px solid var(--accent)}
.mk-side{max-height:calc(100vh - 290px);min-height:420px;display:flex;flex-direction:column}.mk-list{overflow:auto;padding:4px 8px 10px}
.mk-gh{margin:10px 6px 4px;font:700 12px var(--body);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.mk-it{display:flex;gap:8px;align-items:center;width:100%;text-align:left;border:1px solid transparent;background:none;border-radius:10px;padding:6px;cursor:pointer;color:var(--ink)}.mk-it:hover{background:var(--surface-2)}.mk-it.on{border-color:var(--ink);background:var(--surface-2)}
.mk-it svg{flex:none}.mk-t{display:flex;flex-direction:column;min-width:0;font-size:13.5px}.mk-t small{color:var(--muted);font-size:12px;line-height:1.3}.mk-fb{margin-left:auto;flex:none;font:700 11px var(--body);background:#FFF1C2;color:#6B4E00;border:1px solid #F5B400;border-radius:6px;padding:2px 6px}
.mk-ic{background:none;border:0}.mk-ic svg{filter:drop-shadow(0 1px 2px rgba(0,0,0,.45))}.mk-ic .mk-w{position:absolute;right:-5px;top:-5px;box-shadow:0 0 0 2px #fff}.mk-sel svg{transform:scale(1.25)}.mk-drag svg{outline:3px dashed #F5B400;outline-offset:2px;border-radius:6px}
.mk-km span{display:inline-block;transform:translate(8px,-50%);background:#1A1A1A;color:#fff;font:700 11px var(--body);padding:2px 6px;border-radius:6px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.3)}
.mk-st span{display:inline-block;transform:translate(6px,-50%);font:600 10.5px var(--body);color:#1A1A1A;background:rgba(255,255,255,.85);padding:0 3px;border-radius:3px;white-space:nowrap}
.mk-pop{font:14px/1.35 var(--body);color:#1A1A1A}.mk-ph{display:flex;gap:8px;align-items:center;border-left:4px solid;padding-left:8px;margin-bottom:8px}.mk-ph small{display:block;color:#6B6B6B}.mk-pt{font-size:15px}
.mk-kv{display:grid;grid-template-columns:minmax(0,40%) minmax(0,1fr);gap:3px 10px;font-size:13px}.mk-kv span{color:#6B6B6B}.mk-kv b{font-weight:600;overflow-wrap:anywhere}
.mk-obs{margin:8px 0 0;padding:6px 8px;background:#FBECEC;border-radius:8px;white-space:pre-wrap}.mk-warn{margin:0 0 8px;padding:6px 8px;background:#FFF1C2;border:1px solid #F5B400;border-radius:8px;font-size:13px}
.mk-pdf{margin-top:8px;font-size:13px}.mk-pdf summary{cursor:pointer;font-weight:700}.mk-pdf .mk-kv{margin-top:4px}.mk-note{margin:6px 0 0;font-size:11.5px;color:#6B6B6B}
.mk-pb2{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.mk-pb2 button{min-height:36px;padding:0 10px;font-size:13px}.mk-pb2 .mk-del{color:var(--bad);border-color:var(--bad)}
.mk-msg{padding:10px 12px;border-radius:10px;background:var(--surface-2);border:1px solid var(--line);font-size:14px}.mk-msg.ok{background:color-mix(in srgb,var(--ok) 12%,var(--surface));border-color:var(--ok)}.mk-msg.bad{background:var(--bad-bg);border-color:var(--bad)}
.mk-ib{display:flex;gap:8px;margin-top:8px}.mk-ib button{min-height:40px}
#mkForm .mbox{width:min(720px,100%)}#mkForm textarea{width:100%;box-sizing:border-box;border-radius:10px;border:1px solid var(--line);background:var(--surface-2);color:var(--ink);font:500 15px var(--body);padding:8px 10px}
@media (max-width:980px){.mk-body{grid-template-columns:1fr}.mk-map{height:62vh;min-height:360px}.mk-side{max-height:none;min-height:0}.mk-tools{grid-template-columns:1fr 1fr}.mk-q{grid-column:1 / -1}.mk-fl2{padding:0}}
'''
NAV='''    <a href="#marcos" data-page="marcos"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 21s-6-5.4-6-10a6 6 0 0 1 12 0c0 4.6-6 10-6 10z"/><path d="M3 21h18"/><circle cx="12" cy="11" r="2"/></svg><span>Marcos do trecho<small>Bota-esperas, rotatórias, entradas e observações</small></span></a>
    <a href="#analise" data-page="analise">'''
rep('    <a href="#analise" data-page="analise">',NAV)
rep('<section class="page" id="pAna" data-page="analise" hidden>',HTML+'<section class="page" id="pAna" data-page="analise" hidden>')
rep('.pend{margin:0 16px;',CSS+'.pend{margin:0 16px;')
rep("for(const pg of ['localizacao','mapa','mapab4','calculadora','analise','foto','relatorios']){if(!can(pg))","for(const pg of ['localizacao','mapa','mapab4','calculadora','analise','marcos','foto','relatorios']){if(!can(pg))")
rep("const PAGES=['localizacao','mapa','mapab4','calculadora','analise','foto','relatorios'].filter(p=>can(p))","const PAGES=['localizacao','mapa','mapab4','calculadora','analise','marcos','foto','relatorios'].filter(p=>can(p))")
i=s.index("\non('page',p=>{if(p==='admin'&&ACL&&ACL.admin&&ACL.renderAdmin)")
s=s[:i]+'\n'+JS+s[i:]
open(P,'w').write(s);print('ok')

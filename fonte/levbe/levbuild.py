# Injeta a página "Levantamento de Bota-Espera" no template (idempotente).
# Alterações em código existente: só adições (item no menu, nome da página nas 2 listas de páginas, CSS e JS novos).
import sys
P='/home/claude/work/app.template.html'
s=open(P).read()
if 'id="pLev"' in s: print('já aplicado'); sys.exit()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,a[:100]);s=s.replace(a,b)
JS=open('/home/claude/work/levbe/levbe.js').read()
HTML='''<section class="page" id="pLev" data-page="levbe" hidden>
  <div class="topbar"><button class="menuBtn" type="button" data-menu aria-label="Abrir menu"></button><h1>Levantamento de Bota-Espera</h1>
    <div class="lv-tabs" role="tablist"><button type="button" class="lv-tab" role="tab" data-v="reg" aria-selected="true">Registrar</button><button type="button" class="lv-tab" role="tab" data-v="list" aria-selected="false">Registros <em id="lvTabN"></em></button></div></div>
  <div id="lvReg" class="lv-reg">
    <div class="lv-top">
      <div class="lv-sent none" id="lvSent" aria-live="polite"><b>SENTIDO ?</b></div>
      <div class="lv-ti"><b id="lvCtr">—</b><span><span id="lvLote">—</span> · GPS <b id="lvAcc" class="bad">sem GPS</b></span></div>
      <div class="lv-mode" id="lvMode" role="group" aria-label="Sentido"><small id="lvSentHow">automático</small>
        <button type="button" data-m="AUTO" aria-pressed="true">Auto</button><button type="button" data-m="C" aria-pressed="false">Travar ↑</button><button type="button" data-m="D" aria-pressed="false">Travar ↓</button></div>
    </div>
    <div class="lv-warn" id="lvWarn" hidden></div>
    <div class="lv-grid" id="lvGrid">
      <div class="lv-mid"><div class="lbl">Estaca</div><div class="lv-st" id="lvSt">—</div><div class="lrod lv-rod"><i aria-hidden="true"></i><span id="lvRod">Aguardando GPS</span></div><small id="lvAx"></small><div class="lv-toast" id="lvToast" hidden role="status" aria-live="assertive"></div></div>
    </div>
    <div class="lv-foot"><button type="button" class="lv-pend" id="lvGoList">Pendentes de complemento: 0</button><small>Foto, áudio e observação: complete depois, com o carro parado.</small></div>
  </div>
  <div id="lvList" class="cscroll" hidden>
    <div class="cwrap lv-lw">
      <div class="card lv-fil">
        <p class="note" id="lvMode0" hidden>Sem login: os registros ficam salvos só neste aparelho.</p>
        <div class="lv-fg">
          <div class="fld"><label for="lvFCtr">Contrato</label><select id="lvFCtr"></select></div>
          <div class="fld"><label for="lvFLote">Lote</label><select id="lvFLote"></select></div>
          <div class="fld"><label for="lvFPista">Pista</label><select id="lvFPista"></select></div>
          <div class="fld"><label for="lvFTipo">Tipo</label><select id="lvFTipo"></select></div>
          <div class="fld"><label for="lvFOc">Ocupação</label><select id="lvFOc"></select></div>
          <div class="fld"><label for="lvFData">Data</label><select id="lvFData"></select></div>
        </div>
        <div class="lv-fr"><label class="an-chk"><input type="checkbox" id="lvFPend"> Só pendentes de complemento</label><label class="an-chk"><input type="checkbox" id="lvFExc"> Mostrar excluídos</label>
          <button type="button" class="secondary" id="lvPendBtn">Pendentes de complemento</button>
          <span class="lv-sp"></span><button type="button" class="secondary" id="lvCsv">Exportar CSV</button><button type="button" class="primary" id="lvXlsx">Exportar Excel</button></div>
      </div>
      <div class="card"><h2>Registros por estaca <em class="rcnt" id="lvCnt"></em></h2><div class="lv-items" id="lvItems"></div></div>
    </div>
  </div>
</section>
<div class="modal" id="lvEd" hidden role="dialog" aria-modal="true" aria-labelledby="lvEdT">
  <div class="mbox lv-edb"><h2 id="lvEdT">Registro</h2><p class="msub" id="lvEdInfo"></p>
    <div class="mgrid">
      <div class="fld"><label for="lvEdTipo">Tipo / ocupação</label><select id="lvEdTipo"><option value="VAZIO">Existente — Vazio</option><option value="PELA_METADE">Existente — Pela metade</option><option value="LOTADO">Existente — Lotado</option><option value="LOCAL">Local possível</option></select></div>
      <div class="fld"><label for="lvEdPista">Pista</label><select id="lvEdPista"><option value="CRESCENTE">Pista Crescente</option><option value="DECRESCENTE">Pista Decrescente</option></select></div>
      <div class="fld w2"><label for="lvEdObs">Observação</label><textarea id="lvEdObs" rows="3" maxlength="2000"></textarea></div>
    </div>
    <div class="lv-edm"><label class="secondary lv-addf" id="lvEdAddF" tabindex="0"><input type="file" id="lvEdFile" accept="image/*" capture="environment" multiple hidden>📷 Adicionar foto</label>
      <button type="button" class="secondary" id="lvEdRec">🎙 Gravar áudio (até 30 s)</button></div>
    <div class="lv-media" id="lvEdMedia"></div>
    <label class="an-chk"><input type="checkbox" id="lvEdOk"> Não precisa de complemento</label>
    <p class="note" id="lvEdMsg" aria-live="polite"></p>
    <div class="mfoot"><button type="button" class="secondary lv-del" id="lvEdDel">Excluir</button><span class="lv-sp"></span><button type="button" class="secondary" id="lvEdClose">Fechar</button><button type="button" class="primary" id="lvEdSave">Salvar</button></div>
  </div>
</div>
<div class="modal" id="lvMv" hidden role="dialog" aria-modal="true" aria-labelledby="lvMvT"><div class="mbox lv-edb"><h2 id="lvMvT">Arquivo do levantamento</h2><div class="lv-media" id="lvMvBody"></div><div class="mfoot"><span class="lv-sp"></span><button type="button" class="primary" id="lvMvClose">Fechar</button></div></div></div>
'''
CSS='''#pLev{display:flex;flex-direction:column;background:var(--ground);color:var(--ink)}#pLev .topbar{background:var(--plate);color:var(--plate-ink);gap:10px}
#pLev .topbar h1{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lv-tabs{display:flex;gap:4px;flex:none}.lv-tab{min-height:40px;padding:0 12px;border-radius:10px;border:1px solid var(--plate-line);background:var(--plate-2);color:var(--plate-ink);font:700 14px var(--body);cursor:pointer}
.lv-tab[aria-selected="true"]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}.lv-tab em{font-style:normal;opacity:.8;margin-left:2px}
.lv-reg{flex:1;min-height:0;display:flex;flex-direction:column;position:relative}
.lv-top{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px 12px;align-items:center;padding:8px 12px;background:var(--surface);border-bottom:1px solid var(--line)}
.lv-sent{font:800 clamp(18px,5vw,26px)/1 var(--cond);letter-spacing:.03em;padding:8px 12px;border-radius:10px;color:#fff;background:#56605A;white-space:nowrap}
.lv-sent.up{background:#0B6E3A}.lv-sent.down{background:#8E1B12}
.lv-ti{display:flex;flex-direction:column;min-width:0;font-size:14px;line-height:1.3}.lv-ti>b{font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lv-ti span{color:var(--muted)}
#lvAcc.good{color:var(--ok)}#lvAcc.mid{color:var(--warn)}#lvAcc.poor,#lvAcc.bad{color:var(--bad)}
.lv-mode{display:flex;gap:4px;align-items:center;flex-wrap:wrap;justify-content:flex-end}.lv-mode small{width:100%;text-align:right;color:var(--muted);font-size:12px}
.lv-mode button{min-height:40px;padding:0 10px;border-radius:9px;border:1px solid var(--line);background:var(--surface-2);color:var(--ink);font:700 13px var(--body);cursor:pointer}
.lv-mode button[aria-pressed="true"]{background:var(--ink);color:var(--surface);border-color:var(--ink)}
.lv-warn{margin:6px 12px 0;padding:8px 10px;border-radius:9px;background:var(--warn-bg,#FFF1C2);border:1px solid var(--warn);font-size:14px}
.lv-grid{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr) minmax(0,1fr);grid-template-areas:"l m r";gap:10px;padding:10px 12px}
.lv-mid{grid-area:m;position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:var(--plate);color:var(--plate-ink);border-radius:16px;padding:10px;min-width:0}
.lv-mid small{color:var(--plate-muted);font-size:14px;margin-top:6px}
.lv-st{font:700 clamp(40px,8.5vw,110px)/1 var(--cond);font-variant-numeric:tabular-nums;white-space:nowrap;max-width:100%}.lv-st.out{font-size:clamp(28px,5vw,54px)}
.lv-rod{margin-top:10px;max-width:100%;overflow:hidden;text-overflow:ellipsis}
.lv-col{display:flex;flex-direction:column;gap:8px;min-width:0;will-change:transform}.lv-col.lv-left{grid-area:l}.lv-col.lv-right{grid-area:r}
.lv-ch{display:flex;flex-direction:column;align-items:center;padding:4px 0}.lv-ch b{font:800 clamp(15px,2.6vw,20px)/1.1 var(--cond);letter-spacing:.06em}.lv-ch small{color:var(--muted);font:700 11px var(--body);text-transform:uppercase;letter-spacing:.12em}
.lv-right .lv-ch b{color:var(--ink)}.lv-right .lv-ch small{color:var(--accent)}
.lv-btn{flex:1;min-height:64px;display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:14px;border:3px solid rgba(0,0,0,.25);color:#fff;font:inherit;text-align:left;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;box-shadow:0 2px 0 rgba(0,0,0,.25)}
.lv-btn svg{width:34px;height:34px;flex:none}.lv-btn span{display:flex;flex-direction:column;min-width:0}.lv-btn b{font:800 clamp(17px,2.6vw,24px)/1.05 var(--cond);letter-spacing:.02em}.lv-btn small{font:600 12px/1.2 var(--body);opacity:.92}
.lv-btn:active{transform:translateY(2px);box-shadow:none}.lv-btn.lv-hit{animation:lvhit .5s ease-out}@keyframes lvhit{0%{outline:5px solid #fff;outline-offset:-5px}100%{outline:0 solid transparent}}
.lv-g{background:#13803F}.lv-y{background:#F2B705;color:#141715}.lv-r{background:#C62828}.lv-b{background:#1557B0}
.lv-foot{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;padding:0 12px 10px}.lv-foot small{color:var(--muted)}
.lv-pend{min-height:44px;padding:0 14px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:700 14px var(--body);cursor:pointer}.lv-pend:disabled{opacity:.6;cursor:default}
.lv-toast{position:absolute;left:6px;right:6px;bottom:6px;top:auto;z-index:5;display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:10px 12px;border-radius:12px;text-align:left;background:#141715;color:#fff;font:700 16px/1.3 var(--body);box-shadow:0 8px 24px rgba(0,0,0,.35)}
.lv-toast span{flex:1;min-width:0}.lv-toast button{flex:none;min-height:48px;padding:0 16px;border-radius:10px;border:2px solid #fff;background:transparent;color:#fff;font:800 15px var(--body);cursor:pointer}
.lv-toast.lv-g{background:#0E6B33}.lv-toast.lv-y{background:#7A5C00}.lv-toast.lv-r{background:#9B1C1C}.lv-toast.lv-b{background:#0F4A97}.lv-toast.bad{background:#7A1A12}
.lv-lw{max-width:1100px}.lv-fil{padding:12px 16px;display:grid;gap:10px}.lv-fg{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}.lv-fg .fld{grid-column:auto}
.lv-fr{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center}.lv-fr button{min-height:44px}.lv-sp{flex:1}
.lv-items{display:flex;flex-direction:column;gap:6px;padding:4px 10px 12px}
.lv-it{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:10px;border:1px solid var(--line);border-radius:12px;background:var(--surface)}.lv-it.lv-exc{opacity:.6}
.lv-dot{width:14px;height:14px;border-radius:50%;flex:none;border:2px solid rgba(0,0,0,.2)}.lv-itb{flex:1 1 220px;min-width:0;display:flex;flex-direction:column;gap:2px;font-size:14px}.lv-itb small{color:var(--muted);font-size:12.5px;overflow-wrap:anywhere}
.lv-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:2px}.lv-tag{font:700 11px var(--body);font-style:normal;padding:2px 7px;border-radius:999px;background:var(--surface-2);border:1px solid var(--line);color:var(--muted)}
.lv-tag.warn{background:#FFF1C2;border-color:#F5B400;color:#6B4E00}.lv-tag.bad{background:var(--bad-bg,#FBECEC);border-color:var(--bad);color:var(--bad)}.lv-ed{flex:none;min-height:44px}
.lv-edb{width:min(640px,100%)}.lv-edb textarea{width:100%;box-sizing:border-box;border-radius:10px;border:1px solid var(--line);background:var(--surface-2);color:var(--ink);font:500 15px var(--body);padding:8px 10px}
.lv-edm{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.lv-edm>*{min-height:46px}.lv-addf{display:inline-flex;align-items:center;padding:0 14px;border-radius:12px;cursor:pointer;font-weight:700;border:1px solid var(--line);background:var(--surface);color:var(--ink)}
.lv-media{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-bottom:8px}.lv-media img{width:100%;border-radius:10px;display:block}.lv-media audio{width:100%}
#lvMv .lv-media{grid-template-columns:1fr}.lv-del{color:var(--bad);border-color:var(--bad)}
@media (orientation:portrait),(max-width:700px){
  .lv-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);grid-template-areas:"m m" "l r";gap:8px;padding:8px}
  .lv-mid{padding:8px 6px}.lv-st{font-size:clamp(52px,17vw,96px)}
  .lv-top{grid-template-columns:auto minmax(0,1fr);padding:8px}.lv-mode{grid-column:1 / -1;justify-content:flex-start}.lv-mode small{width:100%;text-align:left}
  .lv-ch b{white-space:nowrap;font-size:clamp(12px,3.9vw,18px);letter-spacing:.02em}
  .lv-btn{gap:8px;padding:6px 8px}.lv-btn svg{width:28px;height:28px}
  .lv-tab{padding:0 9px;font-size:13px}#pLev .topbar h1{font-size:15px}
  .lv-fg{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (orientation:landscape) and (max-height:520px){
  #pLev .topbar{padding:3px 10px;gap:8px}#pLev .topbar .menuBtn{width:38px;height:38px}.lv-tab{min-height:34px}
  .lv-top{padding:3px 10px;gap:4px 10px}.lv-sent{padding:4px 10px;font-size:18px}.lv-ti{font-size:12.5px;line-height:1.2}.lv-ti>b{font-size:13.5px}
  .lv-mode small{display:none}.lv-mode button{min-height:34px}
  .lv-grid{padding:4px 10px;gap:4px 10px}.lv-col{gap:4px}.lv-ch{flex-direction:row;gap:8px;align-items:baseline;justify-content:center;padding:0;height:18px;line-height:1;white-space:nowrap;overflow:hidden}.lv-ch b{font-size:15px;line-height:1;letter-spacing:.03em}.lv-ch small{line-height:1}.lv-left .lv-ch small{display:none}
  .lv-btn{min-height:64px;padding:3px 10px}.lv-btn small{font-size:11px}.lv-mid .lbl{font-size:12px}.lv-mid small{font-size:12px;margin-top:2px}.lv-rod{margin-top:4px}
  .lv-foot{display:none}.lv-toast{font-size:13px;padding:6px 8px}.lv-toast button{min-height:40px;padding:0 10px;font-size:13px}}
'''
NAV='''    <a href="#levbe" data-page="levbe"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 18h16l-3.6-7-2.5 2.8-2.6-5z"/><path d="M12 3v3M19 5l-2 2M5 5l2 2"/></svg><span>Levantamento de Bota-Espera</span></a>
    <a href="#analise" data-page="analise">'''
rep('    <a href="#analise" data-page="analise">',NAV)
rep('<section class="page" id="pAna" data-page="analise" hidden>',HTML+'<section class="page" id="pAna" data-page="analise" hidden>')
rep('.pend{margin:0 16px;',CSS+'.pend{margin:0 16px;')
rep("for(const pg of ['localizacao','mapa','mapab4','calculadora','analise','marcos','foto','relatorios']){if(!can(pg))","for(const pg of ['localizacao','mapa','mapab4','calculadora','analise','marcos','levbe','foto','relatorios']){if(!can(pg))")
rep("const PAGES=['localizacao','mapa','mapab4','calculadora','analise','marcos','foto','relatorios'].filter(p=>can(p))","const PAGES=['localizacao','mapa','mapab4','calculadora','analise','marcos','levbe','foto','relatorios'].filter(p=>can(p))")
i=s.index("\non('page',p=>{if(p==='admin'&&ACL&&ACL.admin&&ACL.renderAdmin)")
s=s[:i]+'\n'+JS+s[i:]
open(P,'w').write(s);print('ok')

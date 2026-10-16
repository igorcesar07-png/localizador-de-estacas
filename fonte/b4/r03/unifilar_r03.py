# Gera o JSON do unifilar B4 revisado (R03) no mesmo formato do R00 usado pelo prep_b4.py.
# Panos iguais aos do R00 (mesmo sentido, elemento, linhas e sigla) mantêm o registro original; os demais são recalculados
# com as mesmas regras do R00 (FF/FE/G em t pela densidade do CBUQ; REC/RP em m³; dreno em m; saída em un).
# Uso: python3 -I unifilar_r03.py <harm.json> <data_b4_atual.json> <arquivo_xlsx_nome> <saida.json>
import sys,json
hj,oldb,xname,out=sys.argv[1:5]
H=json.load(open(hj));E=H['estacas'];O=json.load(open(oldb));S=O['src'];F=S['campos'];T=S['textos']
v=lambda x:T[int(x[1:])] if isinstance(x,str) and x.startswith('#') else x
old=[{k:v(r[j+3]) for j,k in enumerate(F)} for r in S['panos']]
grp=lambda f:'Acost' if f in ('Acostamento / bordo','Bordo') else f
okey=lambda r:(r['sentido'],grp(r['faixa_elemento']),r['linha_inicial_unifilar'],r['linha_final_unifilar'],r['sigla'])
OLD={okey(r):r for r in old}
DESC={}
for r in old:DESC.setdefault(r['sigla'],r['tipo_solucao'])
FXN={}
for r in old:FXN.setdefault((r['sentido'],grp(r['faixa_elemento']),r['sigla']),r['faixa_elemento'])
ESP={'FF':0.06,'FE':0.1,'G':0.03,'FS':0.03,'REC':0.25,'RP':0.25};DENS=2.528
line={e[0]:k for k,e in enumerate(E)}
new=[];kept=0;calc=[]
order={'Decrescente':0,'Crescente':1}
H['panos'].sort(key=lambda p:(p['linha_inicial_unifilar'],order[p['sentido']],p['coluna_unifilar']))
for p in H['panos']:
    k=(p['sentido'],p['faixa_elemento'],p['linha_inicial_unifilar'],p['linha_final_unifilar'],p['sigla'])
    if k in OLD:
        r=dict(OLD[k]);r['coluna_unifilar']=p['coluna_unifilar'];kept+=1
    else:
        s=p['sigla'];li,lf=p['linha_inicial_unifilar'],p['linha_final_unifilar'];q=lf-li+1;nx=line.get(lf)+1
        nxt=E[nx] if nx<len(E) else None;ext=20*q;w=round(sum(p['ws'])/len(p['ws']),6) if p['ws'] else None
        fx=FXN.get((p['sentido'],p['faixa_elemento'],s)) or ('Bordo' if (p['faixa_elemento']=='Acost' and s=='RF') else 'Acostamento / bordo' if p['faixa_elemento']=='Acost' else p['faixa_elemento'])
        esp=ESP.get(s);area=round(ext*w,6) if (w and s in ESP) else None;qt=None;un=None;obs=None
        if s in ('FF','FE','G','FS'):qt=area*esp*DENS if area is not None else None;un='t';obs='Densidade adotada igual à do CBUQ (2,528 t/m³)' if s=='G' else None
        elif s in ('REC','RP'):qt=area*esp if area is not None else None;un='m³';obs='Volume = extensão × largura × espessura'
        elif s in ('R','P','RF'):qt=ext;un='m'
        elif s=='●':qt=1;un='un';obs='Dispositivo pontual – contado por unidade (●)'
        else:raise SystemExit('sigla sem regra de cálculo: '+s)
        r={'n':0,'tipo_solucao':DESC.get(s,s),'sigla':s,'sentido':p['sentido'],'faixa_elemento':fx,'coluna_unifilar':p['coluna_unifilar'],'marco_km':p['marco_km'],
           'linha_inicial_unifilar':li,'linha_final_unifilar':lf,'estaca_inicial':p['estaca_inicial'],'estaca_final':nxt[1] if nxt else 'Sem linha no unifilar',
           'hodometro_inicial_km':p['hod0'],'hodometro_final_km':nxt[2] if nxt else None,'qtd_quadrados':q,'extensao_m':ext,
           'extensao_hodometro_m':round((nxt[2]-p['hod0'])*1000) if nxt else None,'largura_media_m':w if s in ESP else None,'espessura_m':esp,'area_m2_ou_secao_m2':area,
           'quantidade':qt,'unidade':un,'observacao':obs,'hodometro_linha_seguinte_km':nxt[2] if nxt else None,'estaca_linha_seguinte':nxt[1] if nxt else None,'conferencia':'OK'}
        calc.append(r)
    new.append(r)
for n,r in enumerate(new,1):r['n']=n
# resumo por sigla: valores do R00 corrigidos pela diferença entre os panos novos e os retirados
gone=[r for r in old if okey(r) not in {(x['sentido'],grp(x['faixa_elemento']),x['linha_inicial_unifilar'],x['linha_final_unifilar'],x['sigla']) for x in new}]
res=[dict(x) for x in S['resumo']]
def add(rr,sg):
    for x in res:
        if x.get('Sigla')==rr['sigla']:
            x['Nº de panos']+=sg;x['Qtd. quadrados']+=sg*rr['qtd_quadrados'];x['Extensão (m)']+=sg*rr['extensao_m']
            if rr['area_m2_ou_secao_m2'] is not None and x.get('Área (m²)') is not None:x['Área (m²)']=round(x['Área (m²)']+sg*rr['area_m2_ou_secao_m2'],6)
            if rr['quantidade'] is not None and x.get('Quantidade') is not None:x['Quantidade']=round(x['Quantidade']+sg*rr['quantidade'],6)
for r in calc:add(r,1)
for r in gone:add(r,-1)
U={'metadados':{'arquivo':xname,'aba_base':'BR-373.PR - 5km','aba_panos':'BR-373.PR - 5km, colunas harmonizadas AU–AZ e BB–BK','total_panos':len(new),'gerado_em':'2026-10-16',
     'revisao_anterior':S['metadados']['arquivo']},'premissas':S['premissas'],'resumo':res,'panos':new}
json.dump(U,open(out,'w',encoding='utf-8'),ensure_ascii=False)
print('panos',len(new),'mantidos do R00',kept,'recalculados',len(calc),'retirados do R00',len(gone))
json.dump({'novos':calc,'retirados':gone},open(out.replace('.json','_diff.json'),'w',encoding='utf-8'),ensure_ascii=False)

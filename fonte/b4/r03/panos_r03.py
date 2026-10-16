# Remonta os panos do unifilar B4 a partir das colunas por estaca (aba "BR-373.PR - 5km").
# Uso: python3 -I panos_r03.py <unifilar.xlsx> <PI|HARM> <saida.json>
import sys,json,openpyxl
from openpyxl.utils import column_index_from_string as C
xl,blk,out=sys.argv[1:4]
COLS={'PI':{'D':{'Faixa 1':('Y','U'),'Faixa 2 / Faixa adicional':('Z','V'),'Acost':('AA','W'),'Dreno':('AC',None),'Saída de dreno':('AD',None)},
             'C':{'Faixa 1':('AJ','AF'),'Faixa 2 / Faixa adicional':('AK','AG'),'Acost':('AL','AH'),'Dreno':('AN',None),'Saída de dreno':('AO',None)}},
      'HARM':{'D':{'Faixa 1':('AU','AQ'),'Faixa 2 / Faixa adicional':('AV','AR'),'Acost':('AW','AS'),'Dreno':('AY',None),'Saída de dreno':('AZ',None)},
             'C':{'Faixa 1':('BF','BB'),'Faixa 2 / Faixa adicional':('BG','BC'),'Acost':('BH','BD'),'Dreno':('BJ',None),'Saída de dreno':('BK',None)}}}[blk]
wb=openpyxl.load_workbook(xl,read_only=True,data_only=True);ws=wb['BR-373.PR - 5km']
rows=[]
for i,r in enumerate(ws.iter_rows(min_row=6,values_only=True),start=6):
    if r[C('M')-1] in (None,''):continue
    rows.append((i,r))
DESC={'FF':'Fresagem Funcional + recomposição CBUQ','FE':'Fresagem Estrutural + recomposição CBUQ','G':'Gap Graded (GAP)','REC':'Reciclagem','RP':'Reparo Profundo (FATC ou BSM)',
      'RF':'Refilamento de bordo','R':'Dreno Longitudinal Raso','P':'Dreno Longitudinal Profundo','●':'Encaixe Saída Boca de Dreno','M':'Microrevestimento à frio (MRAF)'}
ESP={'FF':0.06,'FE':0.1,'G':0.03,'FS':0.03,'REC':0.25,'RP':0.25}
panos=[]
for sent,el in COLS.items():
    for fx,(sc,wc) in el.items():
        cur=None
        def close():
            if cur:panos.append(cur)
        for i,r in rows:
            v=r[C(sc)-1];v=str(v).strip() if v not in (None,'') else None
            km=r[C('P')-1];est=r[C('M')-1];w=r[C(wc)-1] if wc else None
            if cur and (v!=cur['sigla'] or km!=cur['marco_km']):close();cur=None
            if v is None:continue
            if cur is None:cur={'sigla':v,'sentido':'Decrescente' if sent=='D' else 'Crescente','faixa_elemento':fx,'coluna_unifilar':sc,'marco_km':km,'linha_inicial_unifilar':i,'estaca_inicial':est,'ws':[],'hod0':r[C('L')-1]}
            cur['linha_final_unifilar']=i;cur['ultima']=est;cur['hod1']=r[C('L')-1]
            if isinstance(w,(int,float)):cur['ws'].append(w)
        close()
json.dump({'panos':panos,'estacas':[[i,r[C('M')-1],r[C('L')-1],r[C('N')-1],r[C('O')-1],r[C('P')-1]] for i,r in rows]},open(out,'w'),ensure_ascii=False,default=str)
print(blk,len(panos),'panos',len(rows),'estacas')

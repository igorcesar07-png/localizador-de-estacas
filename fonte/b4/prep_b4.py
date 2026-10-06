# Gera a base da BR-373 B4 (data_b4.json) a partir do KMZ de estacas e do unifilar (JSON).
# Uso: python3 -I prep_b4.py <estacas.kmz|doc.kml> <unifilar.json> <saida.json>
# Não interpola coordenadas: cada estaca usa a latitude/longitude do KMZ.
import sys,json,re,zipfile,io
import xml.etree.ElementTree as ET
K='{http://www.opengis.net/kml/2.2}'
src,ujs,out=sys.argv[1:4]
raw=zipfile.ZipFile(src).read([n for n in zipfile.ZipFile(src).namelist() if n.endswith('.kml')][0]) if src.endswith('.kmz') else open(src,'rb').read()
root=ET.parse(io.BytesIO(raw)).getroot()
rows=[];idx={};nocoord=[]
num=lambda v:float(v.replace('.','').replace(',','.')) if v.count(',')==1 and v.count('.')>=1 else float(v.replace(',','.'))
for pm in root.iter(K+'Placemark'):
    ed={d.get('name'):d.findtext(K+'value') for d in pm.iter(K+'Data')}
    nm=ed['coluna_2'].strip();c=pm.find('.//'+K+'coordinates')
    lat=float(ed['coluna_3'].replace(',','.'));lon=float(ed['coluna_4'].replace(',','.'))
    if c is not None and c.text:
        glon,glat=map(float,c.text.strip().split(',')[:2])
        assert abs(glat-lat)<1e-7 and abs(glon-lon)<1e-7,('coordenada diferente',nm)
    if not (-90<=lat<=90 and -180<=lon<=180):nocoord.append(nm);continue
    hod=round(float(ed['coluna_1'].replace(',','.'))*1000);km=int(ed['coluna_5'])
    assert int(nm.split('+')[0])==km,(nm,km);assert nm not in idx,('estaca repetida',nm)
    idx[nm]=len(rows);rows.append([nm,round(lat*1e5),round(lon*1e5),hod,4,km,[0]*6,['.']*4,None])
N=len(rows)
for a,b in zip(rows,rows[1:]):assert b[3]-a[3]==20,('hodômetro não contínuo',a[0],b[0])
U=json.load(open(ujs,encoding='utf-8'))
LANE={('Crescente','Acostamento / bordo'):0,('Crescente','Bordo'):0,('Crescente','Faixa 2 / Faixa adicional'):1,('Crescente','Faixa 1'):2,
      ('Decrescente','Faixa 1'):3,('Decrescente','Faixa 2 / Faixa adicional'):4,('Decrescente','Acostamento / bordo'):5,('Decrescente','Bordo'):5}
DRN={('Decrescente','Saída de dreno'):0,('Decrescente','Dreno'):1,('Crescente','Dreno'):2,('Crescente','Saída de dreno'):3}
codes=[];flags=[];fields=list(U['panos'][0].keys());recs=[]
for p in U['panos']:
    i0=idx.get(p['estaca_inicial']);key=(p['sentido'],p['faixa_elemento']);f=[]
    if i0 is None:flags.append([p['n'],'Estaca inicial sem correspondência no KMZ: '+str(p['estaca_inicial'])]);recs.append([None,None,None]+[p[k] for k in fields]);continue
    i1=i0+p['qtd_quadrados']-1
    if i1>=N:flags.append([p['n'],'Pano passa do fim do KMZ']);i1=N-1
    ef=p['estaca_final']
    if ef in idx:
        if idx[ef]!=i1+1:flags.append([p['n'],f'Estaca final {ef} não confere com {p["qtd_quadrados"]} blocos de 20 m'])
    else:flags.append([p['n'],f'Estaca final "{ef}": sem estaca correspondente; fim calculado pelos {p["qtd_quadrados"]} blocos de 20 m'])
    if abs(rows[i0][3]-round(p['hodometro_inicial_km']*1000))>0:flags.append([p['n'],'Hodômetro inicial difere do KMZ'])
    c=p['sigla']
    if key in LANE:
        L=LANE[key]
        if c not in codes:codes.append(c)
        ci=codes.index(c)+1
        for k in range(i0,i1+1):
            assert rows[k][6][L] in (0,ci),('sobreposição',p['n'])
            rows[k][6][L]=ci
    elif key in DRN:
        D=DRN[key];L=6 if key==('Crescente','Dreno') else 7 if key==('Decrescente','Dreno') else ('S'+('C' if D==3 else 'D'))
        ch='o' if c=='●' else c
        for k in range(i0,i1+1):
            assert rows[k][7][D] in ('.',ch),('sobreposição',p['n'])
            rows[k][7][D]=ch
    else:raise SystemExit('sentido/elemento desconhecido: '+str(key))
    recs.append([LANE.get(key,L if key not in LANE else None),i0,i1]+[p[k] for k in fields])
for r in rows:r[7]=''.join(r[7])
# textos repetidos vão para um dicionário ("#n" aponta para src.textos[n]); números ficam como estão
P2=[];txt=[];ti={}
for r in recs:
    row=[r[0],r[1],r[2]]
    for v in r[3:]:
        if isinstance(v,str):
            if v not in ti:ti[v]=len(txt);txt.append(v)
            row.append('#'+str(ti[v]))
        else:row.append(v)
    P2.append(row)
out_d={'codes':codes,'rows':rows,'odo0':rows[0][3],'base':'BR-373 B4',
  'src':{'metadados':U['metadados'],'premissas':U['premissas'],'resumo':U['resumo'],'campos':fields,'textos':txt,'panos':P2,'avisos':flags,
         'kmz':{'estacas':N,'sem_coordenada':nocoord,'primeira':rows[0][0],'ultima':rows[-1][0]}}}
s=json.dumps(out_d,ensure_ascii=False,separators=(',',':'))
open(out,'w',encoding='utf-8').write(s)
print('estacas',N,'panos',len(P2),'avisos',len(flags),'tamanho',len(s.encode()),'bytes')
for f in flags:print(' ',f)

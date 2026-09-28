import json,re,collections
d=json.load(open('/root/.claude/uploads/f76ae45c-a763-5f01-aab9-ab6cd77b6412/8291b5e0-R08_unifilar_solucoes_BR277.json'))['estacas']
t=open('doc.kml',encoding='utf-8').read()
pm=re.findall(r'<Placemark>\s*<name>(.*?)</name>.*?Hodômetro Contínuo\">\s*<value>(.*?)</value>.*?Bloco\">\s*<value>(.*?)</value>',t,re.S)
kml={n:(float(o),int(float(b))) for n,o,b in pm}
LANES=[('crescente','acostamento_crescente'),('crescente','faixa_2_adicional_crescente'),('crescente','faixa_1_crescente'),
       ('decrescente','faixa_1_decrescente'),('decrescente','faixa_2_adicional_decrescente'),('decrescente','acostamento_decrescente')]
DR=['saida_decrescente','dreno_decrescente','dreno_crescente','saida_crescente']
codes=[]
def ci(c):
  if c is None: return 0
  if c not in codes: codes.append(c)
  return codes.index(c)+1
rows=[]
for e in d:
  o,b=kml[e['estaca']]
  rows.append([e['estaca'],round(e['latitude']*1e5),round(e['longitude']*1e5),int(o),b,e['marco_km'],
    [ci(e['pavimento'][s][k]) for s,k in LANES],
    ''.join({None:'.', 'R':'R','P':'P','●':'o'}[e['drenos'][k]] for k in DR), e['pagina_pdf']])
# panos
panos=[]
for L in range(6):
  i=0;n=len(rows)
  while i<n:
    c=rows[i][6][L]
    if c==0: i+=1;continue
    j=i
    while j+1<n and rows[j+1][6][L]==c and rows[j+1][5]==rows[i][5]: j+=1
    panos.append([L,c,i,j]); i=j+1
print(len(panos), codes)
out={'codes':codes,'rows':rows,'odo0':rows[0][3]}
s=json.dumps(out,separators=(',',':'),ensure_ascii=False)
open('data.json','w').write(s);print(len(s))
# csv of panos
LN=['Acostamento Cresc.','Faixa 2/Adic. Cresc.','Faixa 1 Cresc.','Faixa 1 Decresc.','Faixa 2/Adic. Decresc.','Acostamento Decresc.']
import csv
with open('panos_R08_B2B3.csv','w',newline='',encoding='utf-8-sig') as f:
  w=csv.writer(f,delimiter=';');w.writerow(['Sentido','Faixa','Solução','Km','Estaca inicial','Estaca final','Extensão (m)','Hodômetro inicial','Hodômetro final','Bloco'])
  for L,c,i,j in sorted(panos,key=lambda p:(p[2],p[0])):
    endname=rows[j+1][0] if j+1<len(rows) else f"{rows[j][0]}(+20)"
    w.writerow([LANES[L][0].capitalize(),LN[L],codes[c-1],rows[i][5],rows[i][0],endname,20*(j-i+1),rows[i][3],rows[j][3]+20,rows[i][4]])

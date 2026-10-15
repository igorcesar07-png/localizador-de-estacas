// UTM (SIRGAS 2000 / GRS80) → latitude e longitude; hemisfério sul
function utmToLL(E,N,zone,south){const a=6378137,f=1/298.257222101,k0=0.9996,e2=f*(2-f),ep2=e2/(1-e2);
  const x=E-500000,y=south?N-10000000:N,M=y/k0,mu=M/(a*(1-e2/4-3*e2*e2/64-5*e2*e2*e2/256));
  const e1=(1-Math.sqrt(1-e2))/(1+Math.sqrt(1-e2));
  const p1=mu+(3*e1/2-27*e1**3/32)*Math.sin(2*mu)+(21*e1*e1/16-55*e1**4/32)*Math.sin(4*mu)+(151*e1**3/96)*Math.sin(6*mu)+(1097*e1**4/512)*Math.sin(8*mu);
  const s=Math.sin(p1),c=Math.cos(p1),t=Math.tan(p1),N1=a/Math.sqrt(1-e2*s*s),T1=t*t,C1=ep2*c*c,R1=a*(1-e2)/Math.pow(1-e2*s*s,1.5),D=x/(N1*k0);
  const lat=p1-(N1*t/R1)*(D*D/2-(5+3*T1+10*C1-4*C1*C1-9*ep2)*D**4/24+(61+90*T1+298*C1+45*T1*T1-252*ep2-3*C1*C1)*D**6/720);
  const lon=(D-(1+2*T1+C1)*D**3/6+(5-2*C1+28*T1-3*C1*C1+8*ep2+24*T1*T1)*D**5/120)/c;
  return {lat:lat*180/Math.PI,lon:(zone*6-183)+lon*180/Math.PI}}
if(typeof module!=='undefined')module.exports={utmToLL};

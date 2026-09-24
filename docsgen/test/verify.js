require('../../assets/js/hydro-lib.js');
const H = globalThis.HydroLib, P = Math.PI, ln = Math.log, sq = Math.sqrt;
const Q=1500,k=12,m=25,h=30,a=2e5,al=5e3,t=3650,r=0.15,L=400,L1=150,L2=600,Rc=2000,B=800,S=8,h0=30,h1=22;
const T=k*m;
const ctg=x=>1/Math.tan(x);
const p1=2*L1,p2=2*L2,p3=sq(p1*p1+p2*p2);
const U=(F)=>h-sq(h*h-F);           // unconfined drawdown from "Q/(pi k)*F"-style term
const cases = {
 drawdown_conf_0b_simple:[[Q,k,m,a,t,r], Q/(4*P*T)*ln(2.25*a*t/r**2)],
 drawdown_unconf_0b_simple:[[Q,k,h,al,t,r], U(Q/(2*P*k)*ln(2.25*al*t/r**2))],
 drawdown_conf_ch_simple:[[Q,k,m,r,B], Q/(2*P*T)*ln(1.12*B/r)],
 drawdown_unconf_ch_simple:[[Q,k,h,r,B], U(Q/(P*k)*ln(1.12*B/r))],
 drawdown_conf_hb_simple:[[Q,k,m,r,L], Q/(2*P*T)*ln(2*L/r)],
 drawdown_unconf_hb_simple:[[Q,k,h,r,L], U(Q/(P*k)*ln(2*L/r))],
 drawdown_conf_qb_simple:[[Q,k,m,a,t,r,L], Q/(2*P*T)*ln(1.13*a*t/(L*r))],
 drawdown_unconf_qb_simple:[[Q,k,h,al,t,r,L], U(Q/(P*k)*ln(1.13*al*t/(L*r)))],
 drawdown_conf_strip_h_simple:[[Q,k,m,r,L,L1], Q/(2*P*T)*ln(0.64*L*Math.sin(P*L1/L)/r)],
 drawdown_unconf_strip_h_simple:[[Q,k,h,r,L,L1], U(Q/(P*k)*ln(0.64*L*Math.sin(P*L1/L)/r))],
 drawdown_conf_strip_q_simple:[[Q,k,m,a,t,r,L,L1], Q/(4*P*T)*(ln(7.1*sq(a*t)/L)+2*ln(0.16*L/(r*Math.sin(P*L1/L))))],
 drawdown_unconf_strip_q_simple:[[Q,k,h,al,t,r,L,L1], U(Q/(2*P*k)*(ln(7.1*sq(al*t)/L)+2*ln(0.16*L/(r*Math.sin(P*L1/L)))))],
 drawdown_conf_strip_hq_simple:[[Q,k,m,r,L,L1], Q/(2*P*T)*ln(1.27*L*ctg(P*L1/(2*L))/r)],
 drawdown_unconf_strip_hq_simple:[[Q,k,h,r,L,L1], U(Q/(P*k)*ln(1.27*L*ctg(P*L1/(2*L))/r))],
 drawdown_conf_corner_h_simple:[[Q,k,m,r,L1,L2], Q/(2*P*T)*ln(p1*p2/(r*p3))],
 drawdown_unconf_corner_h_simple:[[Q,k,h,r,L1,L2], U(Q/(P*k)*ln(p1*p2/(r*p3)))],
 drawdown_conf_corner_q_simple:[[Q,k,m,a,t,r,L1,L2], Q/(P*T)*ln(2.25*a*t/sq(r*p1*p2*p3))],
 drawdown_unconf_corner_q_simple:[[Q,k,h,al,t,r,L1,L2], U(2*Q/(P*k)*ln(2.25*al*t/sq(r*p1*p2*p3)))],
 drawdown_conf_corner_hq_simple:[[Q,k,m,r,L1,L2], Q/(2*P*T)*ln(p1*p3/(r*p2))],
 drawdown_unconf_corner_hq_simple:[[Q,k,h,r,L1,L2], U(Q/(P*k)*ln(p1*p3/(r*p2)))],
 drawdown_conf_circle_h_simple:[[Q,k,m,r,Rc], Q/(2*P*T)*ln(Rc/r)],
 drawdown_unconf_circle_h_simple:[[Q,k,h,r,Rc], U(Q/(P*k)*ln(Rc/r))],
 drawdown_conf_circle_q_simple:[[Q,k,m,a,t,r,Rc], Q/(2*P*T)*(ln(Rc/r)+2*a*t/Rc**2-0.75)],
 drawdown_unconf_circle_q_simple:[[Q,k,h,al,t,r,Rc], U(Q/(P*k)*(ln(Rc/r)+2*al*t/Rc**2-0.75))],
 discharge_conf_0b_simple:[[S,k,m,a,t,r], 4*P*T*S/ln(2.25*a*t/r**2)],
 discharge_unconf_0b_simple:[[k,h0,h1,al,t,r], 2*P*k*(h0*h0-h1*h1)/ln(2.25*al*t/r**2)],
 discharge_conf_hb_simple:[[S,k,m,r,L], 2*P*T*S/ln(2*L/r)],
 discharge_unconf_hb_simple:[[k,h0,h1,r,L], P*k*(h0*h0-h1*h1)/ln(2*L/r)],
 discharge_conf_qb_simple:[[S,k,m,a,t,r,L], 2*P*T*S/ln(1.13*a*t/(L*r))],
 discharge_unconf_qb_simple:[[k,h0,h1,al,t,r,L], P*k*(h0*h0-h1*h1)/ln(1.13*al*t/(L*r))],
 discharge_conf_strip_h_simple:[[S,k,m,r,L,L1], 2*P*T*S/ln(0.64*L*Math.sin(P*L1/L)/r)],
 discharge_unconf_strip_h_simple:[[k,h0,h1,r,L,L1], P*k*(h0*h0-h1*h1)/ln(0.64*L*Math.sin(P*L1/L)/r)],
 discharge_conf_strip_q_simple:[[S,k,m,a,t,r,L,L1], 4*P*T*S/(ln(7.1*sq(a*t)/L)+2*ln(0.16*L/(r*Math.sin(P*L1/L))))],
 discharge_unconf_strip_q_simple:[[k,h0,h1,al,t,r,L,L1], 2*P*k*(h0*h0-h1*h1)/(ln(7.1*sq(al*t)/L)+2*ln(0.16*L/(r*Math.sin(P*L1/L))))],
 discharge_conf_strip_hq_simple:[[S,k,m,r,L,L1], 2*P*T*S/ln(1.27*L*ctg(P*L1/(2*L))/r)],
 discharge_unconf_strip_hq_simple:[[k,h0,h1,r,L,L1], P*k*(h0*h0-h1*h1)/ln(1.27*L*ctg(P*L1/(2*L))/r)],
 discharge_conf_corner_h_simple:[[S,k,m,r,L1,L2], 2*P*T*S/ln(p1*p2/(r*p3))],
 discharge_unconf_corner_h_simple:[[k,h0,h1,r,L1,L2], P*k*(h0*h0-h1*h1)/ln(p1*p2/(r*p3))],
 discharge_conf_corner_q_simple:[[S,k,m,a,t,r,L1,L2], P*T*S/ln(2.25*a*t/sq(r*p1*p2*p3))],
 discharge_unconf_corner_q_simple:[[k,h0,h1,al,t,r,L1,L2], P*k*(h0*h0-h1*h1)/(2*ln(2.25*al*t/sq(r*p1*p2*p3)))],
 discharge_conf_corner_hq_simple:[[S,k,m,r,L1,L2], 2*P*T*S/ln(p1*p3/(r*p2))],
 discharge_unconf_corner_hq_simple:[[k,h0,h1,r,L1,L2], P*k*(h0*h0-h1*h1)/ln(p1*p3/(r*p2))],
 discharge_conf_circle_h_simple:[[S,k,m,r,Rc], 2*P*T*S/ln(Rc/r)],
 discharge_unconf_circle_h_simple:[[k,h0,h1,r,Rc], P*k*(h0*h0-h1*h1)/ln(Rc/r)],
 discharge_conf_circle_q_simple:[[S,k,m,a,t,r,Rc], 2*P*T*S/(ln(Rc/r)+2*a*t/Rc**2-0.75)],
 discharge_unconf_circle_q_simple:[[k,h0,h1,al,t,r,Rc], P*k*(h0*h0-h1*h1)/(ln(Rc/r)+2*al*t/Rc**2-0.75)],
 bottom_overflow:[[0.001,5,20,5e4], 0.001*20*5e4/5],
 rain_norm:[[1.6,0.8,2.5], 1000*1.6*0.8*2.5],
 meltwater:[[0.8,0.5,0.25,2.5,240], 0.8*0.5*0.25*2.5/240],
 stormwater:[[1000,0.8,2.5,1], 1000*0.8*2.5],
 intensity_stormwater:[[0.7,90,0.8,10,0.5], 360*20**0.7*90*(1+0.8*Math.log10(10))/0.5**0.7],
};
let bad=0;
for (const [name,[args,exp]] of Object.entries(cases)) {
  const got = H[name](...args);
  const rel = typeof got==='number' ? Math.abs(got-exp)/Math.abs(exp) : NaN;
  if (!(rel < 1e-9)) { bad++; console.log('MISMATCH', name, got, exp); }
}
console.log(Object.keys(cases).length, 'checked,', bad, 'mismatches');

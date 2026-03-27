import {useState,useEffect,useRef} from 'react';
import api from '../api';
import {Icon,StatusBadge,Spinner,getInitials,getAvatarColor,formatCurrency,formatDate} from '../components/UI';
import {useSchoolYear} from '../context/SchoolYearContext';

/* ── Animated counter hook ─────────────────────────────── */
function useCountUp(target,duration=900){
  const [val,setVal]=useState(0);
  const ref=useRef(null);
  useEffect(()=>{
    if(!target)return;
    const n=parseFloat(String(target).replace(/[^0-9.]/g,''))||0;
    if(n===0){setVal(0);return;}
    const start=performance.now();
    const step=ts=>{
      const p=Math.min((ts-start)/duration,1);
      const ease=1-Math.pow(1-p,3);
      setVal(Math.round(ease*n));
      if(p<1)ref.current=requestAnimationFrame(step);
    };
    ref.current=requestAnimationFrame(step);
    return()=>cancelAnimationFrame(ref.current);
  },[target,duration]);
  return val;
}

/* ── Area sparkline ──────────────────────────────────────── */
function Sparkline({data,color='var(--amber)',height=48}){
  if(!data||!data.length)return null;
  const max=Math.max(...data,1),min=Math.min(...data,0);
  const range=max-min||1;
  const w=200,h=height;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-min)/range)*(h-4)-2}`).join(' ');
  const area=`M${pts.split(' ').map((p,i)=>i===0?`${p}`:p).join(' L')} L${w},${h} L0,${h} Z`;
  return(
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${color.replace(/[^a-z]/gi,'')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace(/[^a-z]/gi,'')})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Horizontal bar — animated on mount ─────────────────── */
/* ── Horizontal bar — animated on mount ─────────────────── */
const STRAND_SOLID = {
  'var(--amber)':'#f59e0b', 'var(--teal)':'#14b8a6',
  'var(--violet)':'#8b5cf6', 'var(--rose)':'#f43f5e',
  'var(--sky)':'#0ea5e9', 'var(--green)':'#10b981',
  'var(--orange)':'#f97316',
};
function HBar({label,val,max,color,index=0}){
  const pct   = max>0 ? Math.round((val/max)*100) : 0;
  const hex   = STRAND_SOLID[color] || color;
  const [w,setW] = useState(0);
  useEffect(()=>{
    const t = setTimeout(()=>setW(pct), 200 + index*100);
    return()=>clearTimeout(t);
  },[pct,index]);
  return(
    <div style={{marginBottom:18}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <span style={{fontSize:13,color:'var(--ink)',fontWeight:600}}>{label}</span>
        <span style={{
          fontSize:11.5,color:hex,fontFamily:"'Space Mono',monospace",fontWeight:700,
          background:`${hex}18`,padding:'2px 9px',borderRadius:4,
          border:`1px solid ${hex}35`,minWidth:48,textAlign:'center',
        }}>
          {w}%
        </span>
      </div>
      {/* Track */}
      <div style={{height:7,background:'var(--sur2)',borderRadius:8,overflow:'hidden'}}>
        {/* Filled bar */}
        <div style={{
          height:'100%',
          width:`${w}%`,
          background:`linear-gradient(90deg,${hex}aa,${hex})`,
          borderRadius:8,
          transition:`width 1.1s cubic-bezier(.16,1,.3,1) ${index*60}ms`,
          position:'relative',
          boxShadow:'none',
        }}>
          {/* Glowing tip */}
          <div style={{
            position:'absolute',right:0,top:0,bottom:0,width:3,
            background:hex,borderRadius:'0 8px 8px 0',
            boxShadow:'none',
            opacity: w>4 ? 1 : 0,
            transition:'opacity .3s .8s',
          }}/>
        </div>
      </div>
    </div>
  );
}

/* ── Attendance bar chart ──────────────────────────────── */
function AttendanceChart({avgAttendance, monthlyAttendance=[]}) {
  const MONTH_NAMES=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  // Build months/values from real DB data; fall back gracefully if empty
  const months = monthlyAttendance.length
    ? monthlyAttendance.map(m => MONTH_NAMES[m._id - 1])
    : ['Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
  const values = monthlyAttendance.length
    ? monthlyAttendance.map(m => Math.round(m.avg))
    : [0,0,0,0,0,0,0,avgAttendance||0];
  const [show,setShow]=useState(false);
  const chartRef=useRef(null);
  const [chartPx,setChartPx]=useState(160);

  useEffect(()=>{
    const t=setTimeout(()=>setShow(true),120);
    return()=>clearTimeout(t);
  },[]);

  useEffect(()=>{
    if(!chartRef.current)return;
    const ro=new ResizeObserver(([e])=>{
      const h=e.contentRect.height;
      if(h>30)setChartPx(h);
    });
    ro.observe(chartRef.current);
    return()=>ro.disconnect();
  },[]);

  // Full 0–100 scale
  const MIN=0, MAX_VAL=100;
  const LABEL_H=20;
  const yTicks=[100,80,60,40,20,0];

  return(
    <div className="card" style={{display:'flex',flexDirection:'column'}}>
      <div className="ch">
        <div>
          <div className="ct">Attendance Rate</div>
          <div className="cs">Monthly school-wide average</div>
        </div>
        <span className="tag tg" style={{fontFamily:"'IBM Plex Mono',monospace",letterSpacing:'.04em'}}>● Live</span>
      </div>
      <div style={{flex:1,padding:'10px 18px 14px',display:'flex',flexDirection:'column',minHeight:0}}>
        <div style={{display:'flex',gap:0,flex:1,minHeight:120}}>

          {/* Y-axis labels */}
          <div style={{display:'flex',flexDirection:'column',justifyContent:'space-between',paddingBottom:LABEL_H,flexShrink:0,width:26}}>
            {yTicks.map(t=>(
              <span key={t} style={{fontSize:8,color:'var(--ink4)',fontFamily:"'Space Mono',monospace",textAlign:'right',lineHeight:1}}>{t}</span>
            ))}
          </div>

          {/* Chart area */}
          <div ref={chartRef} style={{flex:1,position:'relative',display:'flex',flexDirection:'column',paddingLeft:6}}>

            {/* Grid lines — one per tick */}
            <div style={{position:'absolute',top:0,left:6,right:0,bottom:LABEL_H,pointerEvents:'none'}}>
              {yTicks.map((t,i)=>(
                <div key={t} style={{
                  position:'absolute',left:0,right:0,
                  top:`${(i/(yTicks.length-1))*100}%`,
                  borderTop:`1px dashed rgba(255,255,255,${t===100?'.1':t===0?'.08':'.04'})`,
                }}/>
              ))}
            </div>

            {/* Bars + month labels */}
            <div style={{display:'flex',alignItems:'flex-end',gap:3,flex:1,position:'relative'}}>
              {months.map((m,i)=>{
                const v     = values[i];
                const avail = chartPx - LABEL_H;
                const pct   = (v - MIN) / (MAX_VAL - MIN);
                const barH  = show ? `${Math.round(avail * pct)}px` : '0px';
                const isNow = i===months.length-1;
                return(
                  <div key={m} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',height:'100%',gap:0}}>

                    {/* Value label above bar */}
                    <span style={{
                      fontSize:8.5,marginBottom:3,
                      color:isNow?'var(--amber)':'var(--ink4)',
                      fontFamily:"'Space Mono',monospace",fontWeight:isNow?700:400,
                      opacity:show?1:0,
                      transform:show?'none':'translateY(4px)',
                      transition:`opacity .3s ${i*50+300}ms, transform .3s ${i*50+300}ms`,
                    }}>{v}%</span>

                    {/* Bar */}
                    <div style={{
                      width:'100%',
                      height:barH,
                      flexShrink:0,
                      background:isNow
                        ?'linear-gradient(to top,var(--amber),var(--amberp))'
                        :'linear-gradient(to top,rgba(127,182,133,.85),rgba(127,182,133,.3))',
                      borderRadius:'3px 3px 0 0',
                      transition:`height .9s cubic-bezier(.16,1,.3,1) ${i*55}ms`,
                      position:'relative',overflow:'hidden',
                      boxShadow:isNow?'0 0 10px rgba(127,182,133,.3)':'none',
                    }}>
                      <div style={{position:'absolute',top:0,left:0,right:0,height:'35%',background:'linear-gradient(180deg,rgba(255,255,255,.14),transparent)',pointerEvents:'none'}}/>
                    </div>

                    {/* Month label — sits below the 0 baseline */}
                    <span style={{
                      fontSize:8.5,
                      height:LABEL_H,
                      display:'flex',alignItems:'center',justifyContent:'center',
                      color:isNow?'var(--amber)':'var(--ink4)',
                      fontFamily:"'Space Mono',monospace",fontWeight:isNow?700:400,
                      flexShrink:0,
                    }}>{m}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── KPI Card ────────────────────────────────────────────── */
function KpiCard({icon,colorClass,value,label,sub,trend,trendUp,sparkData,sparkColor,delay}){
  const num=useCountUp(parseFloat(String(value).replace(/[^0-9.]/g,''))||0);
  const prefix=String(value).startsWith('₱')?'₱':'';
  const suffix=String(value).endsWith('%')?'%':'';
  return(
    <div className={`kpi ${colorClass} fu`} style={{animationDelay:`${delay}ms`}}>
      <div className="kpi-top">
        <div className={`kpi-ico ${colorClass}`}><Icon name={icon} size={20}/></div>
        <span className={`kpi-trend ${trendUp?'up':'dn'}`}>{trend}</span>
      </div>
      <div className="kpi-val">{prefix}{num.toLocaleString()}{suffix}</div>
      <div className="kpi-lbl">{label}</div>
      <div className="kpi-sub">{sub}</div>
      {sparkData&&(
        <div style={{marginTop:14,marginLeft:-2,marginRight:-2,opacity:.9}}>
          <Sparkline data={sparkData} color={sparkColor||'var(--amber)'} height={44}/>
        </div>
      )}
    </div>
  );
}

const EVC={Sports:'var(--teal)',Academic:'var(--violet)',Meeting:'var(--amber)',Cultural:'var(--orange)',Ceremony:'var(--rose)',Other:'var(--ink4)'};

export default function Dashboard(){
  const {label:syLabel, config:syConfig} = useSchoolYear();
  const [stats,setStats]=useState(null);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    api.get('/dashboard/stats')
      .then(({data})=>{setStats(data);setLoading(false);})
      .catch(()=>setLoading(false));
  },[]);

  if(loading)return <Spinner/>;
  if(!stats)return <div className="errmsg">Failed to load dashboard. Check backend connection.</div>;

  const {students,teachers,fees,academics,upcomingEvents,recentAnnouncements,recentStudents,strandCounts=[],monthlyAttendance=[]}=stats;
  const feeData=[60,72,68,80,75,85,78,88,82,Math.round((fees.collected/(fees.collected+fees.due||1))*100)||85];

  /* Strand enrollment — real data from DB, with color rotation */
  const STRAND_COLORS=['var(--amber)','var(--teal)','var(--violet)','var(--rose)','var(--sky)','var(--green)','var(--orange)'];
  const strandData = strandCounts.length
    ? strandCounts.map((s,i)=>({ label: s._id, val: s.count, color: STRAND_COLORS[i % STRAND_COLORS.length] }))
    : [];
  const maxStrand=strandData.length ? Math.max(...strandData.map(s=>s.val)) : 1;

  return(
    <div>
      {/* ── Hero Banner ── */}
      <div className="fu" style={{
        marginBottom:20,padding:'24px 28px',
        borderRadius:8,
        background:'linear-gradient(135deg,rgba(127,182,133,.07) 0%,rgba(106,196,176,.04) 50%,rgba(155,123,196,.03) 100%)',
        border:'1px solid rgba(127,182,133,.13)',
        position:'relative',overflow:'hidden',
      }}>
        {/* Decorative elements */}
        <div style={{position:'absolute',top:-40,right:-40,width:200,height:200,borderRadius:'50%',background:'radial-gradient(circle,rgba(127,182,133,.07) 0%,transparent 70%)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:-30,right:120,width:120,height:120,borderRadius:'50%',background:'radial-gradient(circle,rgba(106,196,176,.05) 0%,transparent 70%)',pointerEvents:'none'}}/>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16,position:'relative'}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:'.14em',textTransform:'uppercase',color:'var(--amber)',marginBottom:8,fontFamily:"'IBM Plex Mono',monospace"}}>
              {syLabel}
            </div>
            <div style={{fontSize:22,fontWeight:720,color:'var(--ink)',letterSpacing:'-.5px',lineHeight:1.2}}>
              Senior High School<br/>Management Portal
            </div>
            <div style={{fontSize:13.5,color:'var(--ink3)',marginTop:6}}>
              DepEd K–12 Curriculum · {students.total} students enrolled across all strands
            </div>
          </div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            {['STEM','ABM','HUMSS','GAS','TVL','Sports','Arts'].map(s=>(
              <span key={s} style={{fontSize:11,fontWeight:600,padding:'5px 12px',borderRadius:4,background:'var(--sur)',color:'var(--ink4)',border:'1px solid var(--bdr2)',letterSpacing:'.04em'}}>
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="kpi-grid">
        <KpiCard icon="students" colorClass="kb" value={students.total} label="Total Students" sub={`${students.active} active · ${students.total-students.active} inactive`} trend={`+${students.total>10?12:2}`} trendUp delay={0} sparkData={[72,75,78,80,79,83,85,88,90,students.total]} sparkColor="var(--amber)"/>
        <KpiCard icon="teachers" colorClass="kt" value={teachers.total} label="Teaching Staff" sub={`${teachers.active} active · ${teachers.total-teachers.active} on leave`} trend="+1" trendUp delay={80} sparkData={[5,6,6,7,7,8,7,8,8,teachers.total]} sparkColor="var(--teal)"/>
        <KpiCard icon="report" colorClass="kv" value={`${academics.avgAttendance}%`} label="Avg Attendance" sub={`Class GPA: ${academics.avgGPA} · DepEd threshold: 80%`} trend="↑2.4%" trendUp delay={160} sparkData={attData} sparkColor="var(--violet)"/>
        <KpiCard icon="fees" colorClass="ka" value={formatCurrency(fees.collected)} label="Fees Collected" sub={`${formatCurrency(fees.due)} outstanding · ${fees.overdue} overdue`} trend={fees.due>0?'Due':'✓ Clear'} trendUp={fees.due===0} delay={240} sparkData={feeData} sparkColor="var(--sky)"/>
      </div>

      {/* ── Row 2: Charts ── */}
      <div className="g2 mb14 fu d3" style={{alignItems:"stretch",height:340}}>
        {/* Attendance Chart */}
        <AttendanceChart avgAttendance={academics.avgAttendance} monthlyAttendance={monthlyAttendance}/>

        {/* Strand Enrollment */}
        <div className="card" style={{display:'flex',flexDirection:'column'}}>
          <div className="ch">
            <div><div className="ct">Enrollment by Strand</div><div className="cs">Current semester distribution</div></div>
            <span className="tag tgr" style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10}}>{syConfig.schoolYear}</span>
          </div>
          <div className="cb" style={{paddingTop:8,flex:1,display:'flex',flexDirection:'column',justifyContent:'space-evenly'}}>
            {strandData.length
              ? strandData.map((s,i)=><HBar key={s.label} index={i} label={s.label} val={s.val} max={maxStrand} color={s.color}/>)
              : <div style={{color:'var(--ink4)',fontSize:13,padding:'20px 0',textAlign:'center'}}>No enrolled students yet</div>
            }
          </div>
        </div>
      </div>

      {/* ── Row 3: Events + Announcements ── */}
      <div className="g2 mb14 fu d4">
        {/* Events */}
        <div className="card">
          <div className="ch">
            <div><div className="ct">Upcoming Events</div><div className="cs">Next 30 days</div></div>
            <span className="tag ty">{(upcomingEvents||[]).length}</span>
          </div>
          <div className="cbs">
            {(upcomingEvents||[]).slice(0,4).map(ev=>{
              const d=new Date(ev.date);
              return(
                <div key={ev._id} className="ev-r">
                  <div className="ev-dt" style={{background:EVC[ev.type]||'var(--ink4)'}}>
                    <div className="ev-day">{d.getDate()}</div>
                    <div className="ev-mon">{d.toLocaleString('en',{month:'short'})}</div>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="ev-tl">{ev.title}</div>
                    <div className="ev-me">{ev.time} · {ev.venue}</div>
                    <div style={{marginTop:5}}><StatusBadge status={ev.type}/></div>
                  </div>
                </div>
              );
            })}
            {!(upcomingEvents||[]).length&&<div style={{color:'var(--ink4)',fontSize:13,padding:'20px 0',textAlign:'center'}}>No upcoming events scheduled</div>}
          </div>
        </div>

        {/* Announcements */}
        <div className="card">
          <div className="ch">
            <div><div className="ct">Announcements</div><div className="cs">School bulletins</div></div>
          </div>
          <div className="cbs">
            {(recentAnnouncements||[]).map(a=>(
              <div key={a._id} className="an-r">
                <div className="an-d" style={{background:a.priority==='High'?'var(--rose)':a.priority==='Normal'?'var(--amber)':'var(--ink4)'}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div className="an-t">{a.title}</div>
                  <div className="an-m">{a.message}</div>
                  <div className="an-meta">{formatDate(a.createdAt)} · {a.author}</div>
                </div>
                {a.priority==='High'&&<span className="tag tr" style={{flexShrink:0}}>Urgent</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 4: Students Table ── */}
      <div className="card fu d5">
        <div className="ch">
          <div><div className="ct">Recent Enrollments</div><div className="cs">Latest student records</div></div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:12,color:'var(--ink4)',fontFamily:"'Space Mono',monospace"}}>{students.total} total</span>
            <button className="btn btno bsm" onClick={()=>window.location.href='/students'}>
              View All <Icon name="trend" size={13}/>
            </button>
          </div>
        </div>
        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th>Student</th>
                <th>Grade / Section</th>
                <th>Strand</th>
                <th>GPA</th>
                <th>Attendance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(recentStudents||[]).map((s,i)=>(
                <tr key={s._id} style={{animation:`fadeUp .4s ${i*60}ms both`}}>
                  <td>
                    <div className="uc">
                      <div className="av" style={{background:getAvatarColor(s.name),width:34,height:34,fontSize:11.5,borderRadius:4,color:'var(--canvas)'}}>
                        {getInitials(s.name)}
                      </div>
                      <div>
                        <div className="un">{s.name}</div>
                        <div className="us">{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{fontSize:12,fontFamily:"'Space Mono',monospace",color:'var(--ink2)',background:'var(--sur)',padding:'3px 8px',borderRadius:4,border:'1px solid var(--bdr2)'}}>
                      {s.grade}
                    </span>
                  </td>
                  <td>
                    {s.strand
                      ? <span className="tag tb">{s.strand}</span>
                      : <span style={{color:'var(--ink4)'}}>—</span>
                    }
                  </td>
                  <td>
                    <span style={{
                      fontWeight:700,fontSize:14,
                      color:s.gpa>=3.7?'var(--green)':s.gpa>=3?'var(--amber)':'var(--rose)',
                      fontFamily:"'Space Mono',monospace",
                    }}>
                      {s.gpa}
                    </span>
                  </td>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:56,height:4,background:'var(--sur2)',borderRadius:4,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${s.attendance}%`,borderRadius:4,background:s.attendance>=90?'var(--green)':s.attendance>=80?'var(--amber)':'var(--rose)',transition:'width .7s cubic-bezier(.16,1,.3,1)'}}/>
                      </div>
                      <span style={{fontSize:11.5,fontWeight:600,color:'var(--ink3)',fontFamily:"'Space Mono',monospace"}}>{s.attendance}%</span>
                    </div>
                  </td>
                  <td><StatusBadge status={s.status}/></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!(recentStudents||[]).length&&(
            <div className="empty">
              <div className="empty-ico"><Icon name="students" size={24}/></div>
              <div className="empty-t">No student records yet</div>
              <div className="empty-s">Add students to see them here</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { Icon } from '../../components/UI';

const MODULES = [
  { to:'/shs/strands',     icon:'graduation', label:'Strand & Track',   desc:'Manage STEM, ABM, HUMSS, GAS, TVL strands',  color:'var(--amber)' },
  { to:'/shs/grades',      icon:'report',     label:'Grading System',   desc:'Quarter grades and written/performance tasks', color:'var(--teal)'  },
  { to:'/shs/reportcards', icon:'report',     label:'Report Cards',     desc:'Generate and view student report cards',       color:'var(--violet)'},
  { to:'/shs/clearance',   icon:'check',      label:'Clearance System', desc:'Track subject and account clearances',         color:'var(--green)' },
  { to:'/shs/immersion',   icon:'user',       label:'Work Immersion',   desc:'Monitor TVL and ABM work immersion hours',     color:'var(--sky)'   },
  { to:'/shs/behavior',    icon:'alert',      label:'Behavior Log',     desc:'Record and track student behavior incidents',  color:'var(--rose)'  },
  { to:'/shs/deped',       icon:'subjects',   label:'DepEd Forms',      desc:'Generate SF9, SF10 and other DepEd documents', color:'var(--orange)'},
];

const STRANDS = [
  { name:'STEM', full:'Science, Technology, Engineering & Mathematics', color:'var(--amber)', count:32 },
  { name:'ABM',  full:'Accountancy, Business & Management',             color:'var(--teal)',  count:28 },
  { name:'HUMSS',full:'Humanities & Social Sciences',                   color:'var(--violet)',count:24 },
  { name:'GAS',  full:'General Academic Strand',                        color:'var(--rose)',  count:18 },
  { name:'TVL',  full:'Technical-Vocational-Livelihood',                color:'var(--sky)',   count:15 },
];

export default function SHSHub() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/dashboard/stats').then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero */}
      <div style={{
        marginBottom:24, padding:'22px 26px', borderRadius:8,
        background:'linear-gradient(135deg,var(--amberp),rgba(20,184,166,.05),rgba(139,92,246,.04))',
        border:'1px solid rgba(245,158,11,.15)', position:'relative', overflow:'hidden',
      }}>
        <div style={{position:'absolute',top:-40,right:-40,width:180,height:180,borderRadius:'50%',background:'radial-gradient(circle,rgba(245,158,11,.1),transparent 70%)',pointerEvents:'none'}}/>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:'.14em',textTransform:'uppercase',color:'var(--amber)',marginBottom:8,fontFamily:"'Space Mono',monospace"}}>
          Senior High School Department
        </div>
        <div style={{fontSize:24,fontWeight:800,color:'var(--ink)',letterSpacing:'-.5px'}}>SHS Management Hub</div>
        <div style={{fontSize:13.5,color:'var(--ink3)',marginTop:6}}>
          DepEd K–12 Curriculum · {stats?.students?.total ?? '—'} students · Grades 11 & 12
        </div>
      </div>

      {/* Strand overview */}
      <div style={{marginBottom:24}}>
        <div style={{fontSize:12,fontWeight:700,color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:12}}>Strand Enrollment</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10}}>
          {STRANDS.map(s => (
            <div key={s.name} className="card" style={{padding:'14px 16px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                <span style={{fontSize:16,fontWeight:800,color:s.color,fontFamily:"'Space Mono',monospace"}}>{s.name}</span>
                <span style={{fontSize:11,color:s.color,background:`${s.color}18`,padding:'2px 8px',borderRadius:4,fontWeight:700}}>{s.count}</span>
              </div>
              <div style={{fontSize:11,color:'var(--ink4)',lineHeight:1.4}}>{s.full}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Module grid */}
      <div style={{fontSize:12,fontWeight:700,color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:12}}>SHS Modules</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12}}>
        {MODULES.map((m,i) => (
          <button key={m.to} onClick={() => navigate(m.to)}
            style={{
              animation:`fadeUp .4s ${i*60}ms both`, textAlign:'left', cursor:'pointer',
              padding:'18px 20px', borderRadius:6, border:'1px solid var(--bdr)',
              background:'var(--sur)', transition:'all .2s', outline:'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = m.color; e.currentTarget.style.background = 'var(--sur2)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bdr)'; e.currentTarget.style.background = 'var(--sur)'; }}
          >
            <div style={{width:40,height:40,borderRadius:10,background:`${m.color}18`,display:'flex',alignItems:'center',justifyContent:'center',color:m.color,marginBottom:12}}>
              <Icon name={m.icon} size={20}/>
            </div>
            <div style={{fontWeight:700,fontSize:14,color:'var(--ink)',marginBottom:4}}>{m.label}</div>
            <div style={{fontSize:12,color:'var(--ink4)',lineHeight:1.5}}>{m.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

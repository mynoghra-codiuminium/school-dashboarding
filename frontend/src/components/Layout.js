import {useState,useEffect,useRef,useCallback} from 'react';
import {Outlet,NavLink,useNavigate,useLocation} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import {Icon,getInitials,getAvatarColor} from './UI';
import {useSchoolYear} from '../context/SchoolYearContext';
import {useShortcuts, SHORTCUT_LIST} from '../hooks/useShortcuts';
import api from '../api';

/* ── Real-time notification builder ───────────────────────── */
function useNotifications() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      // Fetch overdue fees, low-attendance students, and pending clearances in parallel
      const [feesRes, studentsRes, clearanceRes] = await Promise.allSettled([
        api.get('/fees'),
        api.get('/students', { params: { limit: 200 } }),
        api.get('/shs/clearances'),
      ]);

      const built = [];

      // Overdue fees
      if (feesRes.status === 'fulfilled') {
        const overdue = (feesRes.value.data?.fees || feesRes.value.data || [])
          .filter(f => f.status === 'Overdue');
        overdue.slice(0, 3).forEach(f => {
          built.push({
            id: `fee-${f._id}`,
            t: 'Fee Payment Overdue',
            b: `${f.studentName || f.name || 'Student'} — ₱${(f.due||f.amount||0).toLocaleString()} overdue`,
            dot: 'var(--rose)',
            link: '/fees',
          });
        });
        if (overdue.length > 3) {
          built.push({ id:'fee-more', t:'Fee Payments Overdue', b:`${overdue.length} students have overdue payments`, dot:'var(--rose)', link:'/fees' });
        }
      }

      // Low attendance (below 85%)
      if (studentsRes.status === 'fulfilled') {
        const students = studentsRes.value.data?.students || studentsRes.value.data || [];
        const lowAtt = students.filter(s => s.status === 'Active' && s.attendance < 85);
        lowAtt.slice(0, 2).forEach(s => {
          built.push({
            id: `att-${s._id}`,
            t: 'Low Attendance Alert',
            b: `${s.name} — ${s.attendance}% this month`,
            dot: 'var(--amber)',
            link: '/students',
          });
        });
        if (lowAtt.length > 2) {
          built.push({ id:'att-more', t:'Low Attendance Alert', b:`${lowAtt.length} students below 85% attendance`, dot:'var(--amber)', link:'/students' });
        }
      }

      // Pending clearances
      if (clearanceRes.status === 'fulfilled') {
        const clearances = clearanceRes.value.data || [];
        const pending = clearances.filter(c => c.overallStatus !== 'Cleared');
        if (pending.length > 0) {
          built.push({
            id: 'clearance',
            t: 'Clearance Pending',
            b: `${pending.length} student${pending.length > 1 ? 's' : ''} awaiting sign-off`,
            dot: 'var(--teal)',
            link: '/shs/clearance',
          });
        }
      }

      setNotifs(built);
    } catch { setNotifs([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    // Refresh every 5 minutes
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  return { notifs, loading, reload: load };
}

// Role-based nav — returns items visible to the current role
function getNav(role) {
  if (role === 'student') return [
    {sec:'My Account'},
    {to:'/my-portal',label:'My Portal',icon:'dashboard',end:true},
  ];
  const base = [
    {sec:'Overview'},
    {to:'/dashboard',label:'Dashboard',icon:'dashboard',end:true},
    {sec:'Academic'},
    {to:'/students',label:'Students',icon:'students'},
    {to:'/classes',label:'Classes',icon:'classes'},
    {to:'/subjects',label:'Subjects',icon:'subjects'},
    {to:'/exams',label:'Examinations',icon:'exams'},
    {sec:'SHS Department'},
    {to:'/shs',label:'SHS Overview',icon:'graduation',end:true},
    {to:'/shs/strands',label:'Strand & Track',icon:'chart'},
    {to:'/shs/grades',label:'Grading System',icon:'trend'},
    {to:'/shs/reportcards',label:'Report Cards',icon:'report'},
    {to:'/shs/clearance',label:'Clearance',icon:'check'},
    {to:'/shs/immersion',label:'Work Immersion',icon:'user'},
    {to:'/shs/behavior',label:'Behavior Log',icon:'alert'},
    {sec:'Communication'},
    {to:'/events',label:'Events',icon:'events'},
    {to:'/announcements',label:'Announcements',icon:'announce'},
  ];
  if (role === 'admin' || role === 'staff') {
    base.push({sec:'Finance & Reports'});
    base.push({to:'/fees',label:'Fee Management',icon:'fees'});
    base.push({to:'/reports',label:'Analytics',icon:'chart'});
  }
  if (role === 'admin' || role === 'staff') {
    base.push({to:'/teachers',label:'Teachers',icon:'teachers'});
  }
  if (role === 'admin') {
    base.push({sec:'Administration'});
    base.push({to:'/users',label:'User Management',icon:'user'});
    base.push({to:'/graduation',label:'Graduation & Promotion',icon:'graduation'});
    base.push({to:'/settings',label:'Settings',icon:'settings'});
  }
  return base;
}
const NAV = getNav('admin'); // fallback, actual used via getNav(user.role) in component

const TITLES={
  '/dashboard':'Dashboard','/'  :'Dashboard','/students':'Students','/teachers':'Teachers','/classes':'Classes',
  '/subjects':'Subjects','/exams':'Examinations','/fees':'Fee Management',
  '/events':'Events','/announcements':'Announcements',
  '/reports':'Analytics','/settings':'Settings',
  '/shs':'SHS Overview','/shs/strands':'Strand & Track',
  '/shs/grades':'Grading System','/shs/reportcards':'Report Cards',
  '/shs/clearance':'Clearance Management','/shs/immersion':'Work Immersion',
  '/shs/behavior':'Behavior Log',
};

const MOBILE_BP=767;
const isMobileNow=()=>window.innerWidth<=MOBILE_BP;

export default function Layout(){
  const {user,logout}=useAuth();
  const navigate=useNavigate();
  const location=useLocation();
  const nref=useRef(null);
  const {label:syLabel} = useSchoolYear();
  const [isMobile,setIsMobile]=useState(isMobileNow());
  const [open,setOpen]=useState(!isMobileNow());
  const [notif,setNotif]=useState(false);
  const [scrolled,setScrolled]=useState(false);
  const [shortcutsOpen,setShortcutsOpen]=useState(false);
  const { notifs, loading: nLoading } = useNotifications();

  useEffect(()=>{
    const fn=()=>{const m=isMobileNow();setIsMobile(m);if(!m)setOpen(true);};
    window.addEventListener('resize',fn);return()=>window.removeEventListener('resize',fn);
  },[]);
  useEffect(()=>{if(isMobile)setOpen(false);},[location.pathname,isMobile]);
  useEffect(()=>{
    const fn=()=>setScrolled(window.scrollY>4);
    window.addEventListener('scroll',fn,{passive:true});return()=>window.removeEventListener('scroll',fn);
  },[]);
  useEffect(()=>{
    const fn=(e)=>{if(nref.current&&!nref.current.contains(e.target))setNotif(false);};
    document.addEventListener('mousedown',fn);return()=>document.removeEventListener('mousedown',fn);
  },[]);

  useShortcuts({});

  // Listen for '?' custom event from hook
  useEffect(()=>{
    const fn=()=>setShortcutsOpen(v=>!v);
    document.addEventListener('toggle-shortcuts-panel',fn);
    return()=>document.removeEventListener('toggle-shortcuts-panel',fn);
  },[]);

  const toggle=useCallback(()=>setOpen(v=>!v),[]);
  const title=TITLES[location.pathname]||'Dashboard';
  const today=new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  const isSHS=location.pathname.startsWith('/shs');
  const mainMargin=isMobile?0:(open?'var(--sw)':0);

  return(
    <div className="app">
      {isMobile&&<div className={`sb-overlay${open?' show':''}`} onClick={()=>setOpen(false)}/>}

      {/* ── Sidebar ── */}
      <aside className={`sidebar${open?' sb-show':' sb-hidden'}`}>
        <div className="sb-logo">
          <div className="sb-logo-ico"><Icon name="graduation" size={20}/></div>
          <div>
            <div className="sb-logo-name">EduSys</div>
            <div className="sb-logo-sub">SHS Management</div>
          </div>
        </div>
        <nav className="sb-nav">
          {getNav(user?.role||'staff').map((item,i)=>item.sec
            ?<div key={i} className="sb-section">{item.sec}</div>
            :<NavLink key={item.to} to={item.to} end={item.end} className={({isActive})=>`sb-link${isActive?' active':''}`}>
              <span className="sb-link-ico"><Icon name={item.icon} size={15}/></span>
              {item.label}
            </NavLink>
          )}
          <div style={{height:8}}/>
        </nav>
        <div className="sb-foot">
          <div className="sb-user" onClick={()=>{logout();navigate('/login');}}>
            <div className="av av-r" style={{background:getAvatarColor(user?.name||''),width:32,height:32,fontSize:11,color:'var(--canvas)'}}>
              {getInitials(user?.name||'A')}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div className="sb-uname">{user?.name}</div>
              <div className="sb-urole">{user?.role}</div>
            </div>
            <span style={{color:'rgba(245,242,236,.38)',flexShrink:0}}><Icon name="logout" size={14}/></span>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main" style={{marginLeft:mainMargin}}>
        <header className={`topbar${scrolled?' scrolled':''}`}>
          <button className="tb-toggle" onClick={toggle}><Icon name="menu" size={17}/></button>
          <div className="tb-mid">
            {isSHS&&<span className="tb-badge">SHS</span>}
            <div className="tb-title">{title}</div>
            <span style={{fontSize:10.5,color:'rgba(245,242,236,.38)',fontFamily:"'Space Mono',monospace",flexShrink:0,display:'none'}} className="tb-sy-label">{syLabel}</span>
          </div>
          <div className="tb-search">
            <Icon name="search" size={14}/>
            <input placeholder="Search anything…"/>
          </div>
          <div className="tb-actions">
            <div style={{position:'relative'}} ref={nref}>
              <button className="tb-btn" onClick={()=>setNotif(v=>!v)}>
                <Icon name="bell" size={16}/>
                {notifs.length>0&&<div className="tb-ndot">{notifs.length}</div>}
              </button>
              {notif&&(
                <div className="np">
                  <div className="np-h">
                    <span className="np-ht">Notifications</span>
                    {notifs.length>0&&<span className="tag ty" style={{fontSize:10}}>{notifs.length} new</span>}
                  </div>
                  {nLoading&&<div style={{padding:'18px',color:'var(--ink4)',fontSize:13,textAlign:'center'}}>Loading…</div>}
                  {!nLoading&&notifs.length===0&&(
                    <div style={{padding:'24px 18px',color:'var(--ink4)',fontSize:13,textAlign:'center'}}>
                      <div style={{fontSize:22,marginBottom:8}}>✓</div>
                      All clear — no alerts right now
                    </div>
                  )}
                  {!nLoading&&notifs.map((n,i)=>(
                    <div key={n.id||i} className="np-row" style={{cursor:n.link?'pointer':'default'}}
                      onClick={()=>{if(n.link){navigate(n.link);setNotif(false);}}}>
                      <div className="np-dot" style={{background:n.dot}}/>
                      <div><div className="np-t">{n.t}</div><div className="np-b">{n.b}</div></div>
                    </div>
                  ))}
                  {!nLoading&&notifs.length>0&&(
                    <div className="np-ft">
                      <button className="btn btno bsm" style={{width:'100%',justifyContent:'center'}}
                        onClick={()=>{navigate('/fees');setNotif(false);}}>
                        View all alerts
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button className="tb-btn" onClick={()=>setShortcutsOpen(v=>!v)} title="Keyboard shortcuts (?)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M8 14h8"/></svg>
            </button>
            <div className="tb-av">{getInitials(user?.name||'A')}</div>
          </div>
        </header>

        <div className="pw">
          <div className="ph fu">
            <div>
              <div className="ph-title">{title}</div>
              <div className="ph-sub">Welcome back, {user?.name?.split(' ').pop()}. {isSHS?'SHS Dept · DepEd K–12':'Here\'s what\'s happening today.'}</div>
            </div>
            <div className="ph-date">{today}</div>
          </div>
          <Outlet/>
        </div>

        {/* ── Keyboard Shortcuts Panel ── */}
        {shortcutsOpen&&(
          <div style={{
            position:'fixed',top:0,right:0,bottom:0,width:320,
            background:'var(--ink)',borderLeft:'1px solid var(--bdr)',
            zIndex:300,display:'flex',flexDirection:'column',
            animation:'slideRight .22s cubic-bezier(.16,1,.3,1)',
            boxShadow:'-8px 0 32px rgba(0,0,0,.5)',
          }}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 18px',borderBottom:'1px solid rgba(245,242,236,.08)',flexShrink:0}}>
              <div>
                <div style={{fontWeight:700,fontSize:14,color:'rgba(245,242,236,.9)'}}>Keyboard Shortcuts</div>
                <div style={{fontSize:11.5,color:'rgba(245,242,236,.38)',marginTop:2}}>Press <kbd style={kbdStyle}>?</kbd> to toggle</div>
              </div>
              <button className="cbtn" onClick={()=>setShortcutsOpen(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{overflowY:'auto',flex:1,padding:'12px 14px'}}>
              {SHORTCUT_LIST.map(({group,items})=>(
                <div key={group} style={{marginBottom:20}}>
                  <div style={{fontSize:9.5,fontWeight:700,letterSpacing:'.14em',textTransform:'uppercase',color:'var(--red)',marginBottom:10,padding:'0 4px'}}>{group}</div>
                  {items.map(({keys,desc})=>(
                    <div key={desc} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 8px',borderRadius:8,marginBottom:2,transition:'background .15s',cursor:'default'}}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.04)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <span style={{fontSize:13,color:'rgba(245,242,236,.6)'}}>{desc}</span>
                      <div style={{display:'flex',gap:4,flexShrink:0}}>
                        {keys.map((k,i)=>(
                          <span key={i} style={{display:'inline-flex',alignItems:'center',gap:3}}>
                            {i>0&&<span style={{fontSize:10,color:'rgba(245,242,236,.38)'}}>then</span>}
                            <kbd style={kbdStyle}>{k}</kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div style={{padding:'12px 18px',borderTop:'1px solid var(--bdr)',fontSize:12,color:'rgba(245,242,236,.38)',flexShrink:0}}>
              Press <kbd style={kbdStyle}>G</kbd> then a letter to navigate pages instantly
            </div>
          </div>
        )}
        {/* Overlay behind shortcuts panel */}
        {shortcutsOpen&&<div style={{position:'fixed',inset:0,zIndex:299}} onClick={()=>setShortcutsOpen(false)}/>}
      </div>
    </div>
  );
}

const kbdStyle={
  display:'inline-flex',alignItems:'center',justifyContent:'center',
  minWidth:22,padding:'2px 6px',
  background:'rgba(245,242,236,.08)',border:'1px solid rgba(245,242,236,.18)',
  borderBottom:'2px solid rgba(245,242,236,.12)',
  fontSize:11,fontWeight:600,
  color:'rgba(245,242,236,.85)',fontFamily:"'Space Mono',monospace",
  lineHeight:1.4,
};

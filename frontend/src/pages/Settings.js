import {useState, useEffect, useCallback} from 'react';
import {useAuth} from '../context/AuthContext';
import {useSchoolYear} from '../context/SchoolYearContext';
import api from '../api';
import {Icon, Spinner} from '../components/UI';

const TABS = ['School Info','School Year','Batch Import','Promotion','My Account','Notifications','Security','Appearance'];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SY_OPTIONS = ['2023-2024','2024-2025','2025-2026','2026-2027'];
const SEM_OPTIONS = ['1st Semester','2nd Semester'];

export default function Settings() {
  const {user}          = useAuth();
  const {config, label, updateConfig, setManual, enableAuto} = useSchoolYear();

  const [tab,     setTab]    = useState('School Info');
  const [saving,  setSaving] = useState(false);
  const [saved,   setSaved]  = useState('');

  const [school, setSchool] = useState({
    name:'EduSys Demo School', email:'info@demo.edusys.edu.ph',
    phone:'(02) 8234-5678', address:'123 Demo Street, Quezon City, Metro Manila',
    website:'www.edusys.edu.ph', principal:'Dr. Admin User',
    founded:'2020', motto:'Excellence in Senior High School Education',
  });
  const [account, setAccount] = useState({name:user?.name||'', email:user?.email||''});
  const [pw, setPw] = useState({current:'', newPw:'', confirm:''});
  const [pwErr, setPwErr] = useState('');
  const [notifs, setNotifs] = useState({email:true, sms:false, fee:true, att:true, ev:true, sys:false});

  // School Year settings local state (mirrors context)
  const [syDraft, setSyDraft] = useState({
    schoolYear: config.schoolYear,
    semester:   config.semester,
    startMonth: config.startMonth,
    autoDetect: config.autoDetect,
  });

  // Promotion state
  const [promoLoading,  setPromoLoading]  = useState(false);
  const [promoStudents, setPromoStudents] = useState([]);
  const [promoResult,   setPromoResult]   = useState(null);
  const [promoErr,      setPromoErr]      = useState('');
  const [promoConfirm,  setPromoConfirm]  = useState(false);
  const [targetSY,      setTargetSY]      = useState('');

  // Load Grade 11 students for promotion preview
  const loadPromoStudents = useCallback(async () => {
    setPromoLoading(true); setPromoErr('');
    try {
      const {data} = await api.get('/students', {params: {grade: '11', limit: 200}});
      const list = (data.students || data || []).filter(s =>
        s.grade?.toString().includes('11') || s.gradeLevel?.includes('11')
      );
      setPromoStudents(list);
      const [start] = config.schoolYear.split('-').map(Number);
      setTargetSY(`${start+1}-${start+2}`);
    } catch { setPromoErr('Failed to load students'); }
    finally { setPromoLoading(false); }
  }, [config.schoolYear]);

  useEffect(() => {
    if (tab === 'Promotion') loadPromoStudents();
  }, [tab, loadPromoStudents]);

  // Run promotion — update Grade 11 → 12 and bump school year
  const runPromotion = async () => {
    if (!targetSY) { setPromoErr('Set the target school year first'); return; }
    setSaving(true); setPromoErr('');
    let success = 0, failed = 0, errors = [];
    try {
      for (const s of promoStudents) {
        try {
          // Build new grade: 11-STEM-A → 12-STEM-A
          const newGrade = (s.grade || '').replace(/^11/, '12');
          const newSection = (s.section || '').replace(/^11/, '12');
          await api.put(`/students/${s._id}`, {
            ...s,
            grade:      newGrade || s.grade,
            section:    newSection || s.section,
            gradeLevel: 'Grade 12',
            schoolYear: targetSY,
          });
          success++;
        } catch (e) {
          failed++;
          errors.push({name: s.name, error: e.response?.data?.message || e.message});
        }
      }
      // Also update school year setting
      setManual(targetSY, config.semester);
      setSyDraft(d => ({...d, schoolYear: targetSY, autoDetect: false}));
      setPromoResult({success, failed, errors, targetSY});
      setPromoConfirm(false);
    } catch (e) { setPromoErr(e.message); }
    finally { setSaving(false); }
  };

  const flash = (msg='Saved!') => {setSaved(msg); setTimeout(()=>setSaved(''), 2500);};

  const saveSY = () => {
    if (syDraft.autoDetect) {
      enableAuto();
    } else {
      setManual(syDraft.schoolYear, syDraft.semester);
    }
    updateConfig({startMonth: syDraft.startMonth, autoDetect: syDraft.autoDetect});
    flash('School year saved!');
  };

  const saveSch = (e) => {
    e.preventDefault(); setSaving(true);
    setTimeout(()=>{setSaving(false); flash();}, 700);
  };
  const saveAcc = async (e) => {
    e.preventDefault(); setSaving(true);
    try {await api.put('/auth/profile', {name: account.name}); flash();}
    catch (e) { console.error("Save failed:", e?.response?.data?.message || e.message); } finally {setSaving(false);}
  };
  const savePw = async (e) => {
    e.preventDefault(); setPwErr('');
    if (pw.newPw !== pw.confirm) {setPwErr('Passwords do not match'); return;}
    if (pw.newPw.length < 6) {setPwErr('Min 6 characters'); return;}
    setSaving(true);
    try {await api.put('/auth/profile', {password: pw.newPw}); setPw({current:'',newPw:'',confirm:''}); flash();}
    catch (err) {setPwErr(err.response?.data?.message || 'Failed');}
    finally {setSaving(false);}
  };

  const [now, setNow] = useState(new Date());
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t);},[]);
  const month = now.getMonth() + 1;
  const liveAutoSY = (() => {
    const sm = syDraft.startMonth;
    const y  = now.getFullYear();
    const sy = month >= sm ? y : y - 1;
    return `${sy}-${sy+1}`;
  })();
  const liveSem = (month >= syDraft.startMonth && month <= 10) ? '1st Semester' : '2nd Semester';

  const Tgl = ({v, onChange}) => (
    <div className="tgl" style={{background: v ? 'var(--amber)' : 'var(--bdr2)'}} onClick={()=>onChange(!v)}>
      <div className="tgl-t" style={{left: v ? 23 : 3}}/>
    </div>
  );

  return (
    <div className="fu">
      {/* Toast */}
      {saved && (
        <div style={{
          position:'fixed', top:78, right:20, zIndex:400,
          background:'linear-gradient(135deg,var(--amber),var(--amber))',
          color:'var(--canvas)', padding:'10px 20px', borderRadius:4,
          fontWeight:700, fontSize:13.5, boxShadow:'var(--s3)',
          animation:'fadeUp .3s cubic-bezier(.16,1,.3,1)',
        }}>✓ {saved}</div>
      )}

      <div className="slay">
        {/* Sidebar nav */}
        <div className="snav">
          {TABS.map(t => (
            <div key={t} className={`sni${tab===t?' act':''}`} onClick={()=>setTab(t)}>
              {t === 'School Year' && <span style={{marginRight:6, color:'var(--amber)'}}>●</span>}
              {t}
            </div>
          ))}
        </div>

        <div className="sbody">

          {/* ── SCHOOL INFO ── */}
          {tab === 'School Info' && (
            <div className="card">
              <div className="ch"><div className="ct">School Information</div></div>
              <div className="mbody">
                <form onSubmit={saveSch}>
                  <div className="fgrid">
                    {[['School Name','name'],['Email','email'],['Phone','phone'],['Website','website'],['Principal','principal'],['Founded','founded']].map(([l,k])=>(
                      <div key={k} className="fg"><label>{l}</label><input className="fi" value={school[k]||''} onChange={e=>setSchool(s=>({...s,[k]:e.target.value}))}/></div>
                    ))}
                    <div className="fg fg-full"><label>Motto</label><input className="fi" value={school.motto||''} onChange={e=>setSchool(s=>({...s,motto:e.target.value}))}/></div>
                    <div className="fg fg-full"><label>Address</label><textarea className="fta" value={school.address||''} onChange={e=>setSchool(s=>({...s,address:e.target.value}))}/></div>
                  </div>
                  <div style={{marginTop:18}}>
                    <button className="btn btnp" type="submit" disabled={saving}>{saving?'Saving…':'Save Changes'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── SCHOOL YEAR MANAGEMENT ── */}
          {tab === 'School Year' && (
            <div style={{display:'flex',flexDirection:'column',gap:14}}>

              {/* Current active display */}
              <div style={{
                padding:'20px 24px',borderRadius:8,
                background:'linear-gradient(135deg,rgba(245,158,11,.1),rgba(20,184,166,.05))',
                border:'1px solid rgba(176,90,14,.2)',
                position:'relative',overflow:'hidden',
              }}>
                <div style={{position:'absolute',top:-20,right:-20,width:120,height:120,borderRadius:'50%',background:'radial-gradient(circle,rgba(245,158,11,.1),transparent 70%)',pointerEvents:'none'}}/>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:'.14em',textTransform:'uppercase',color:'var(--amber)',marginBottom:8,fontFamily:"'Space Mono',monospace"}}>
                  Currently Active
                </div>
                <div style={{fontSize:28,fontWeight:800,color:'var(--ink)',letterSpacing:'-.5px'}}>{label}</div>
                <div style={{fontSize:13,color:'var(--ink3)',marginTop:4}}>
                  {config.autoDetect
                    ? '● Auto-detected based on current date'
                    : '● Manually configured'}
                </div>
                <div style={{marginTop:8,fontSize:12,color:'var(--ink4)',fontFamily:"'Space Mono',monospace"}}>
                  {now.toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})} · {now.toLocaleTimeString()}
                </div>
              </div>

              {/* Auto-detect toggle */}
              <div className="card">
                <div className="ch"><div className="ct">Auto-Detection</div><div className="cs">Automatically determine the school year from the current date</div></div>
                <div className="mbody">
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:14,color:'var(--ink)'}}>Automatic School Year</div>
                      <div style={{fontSize:13,color:'var(--ink3)',marginTop:3}}>
                        If today is {MONTHS[now.getMonth()]} → Auto result: <strong style={{color:'var(--amber)'}}>{liveAutoSY} · {liveSem}</strong>
                      </div>
                    </div>
                    <Tgl v={syDraft.autoDetect} onChange={v=>setSyDraft(d=>({...d,autoDetect:v}))}/>
                  </div>

                  {syDraft.autoDetect && (
                    <div className="fgrid">
                      <div className="fg">
                        <label>School Year Starts (Month)</label>
                        <select className="fsel" value={syDraft.startMonth} onChange={e=>setSyDraft(d=>({...d,startMonth:Number(e.target.value)}))}>
                          {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
                        </select>
                        <span style={{fontSize:11.5,color:'var(--ink4)',marginTop:4}}>
                          DepEd default: June. If today ≥ this month, the new school year has started.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Manual override */}
              <div className="card">
                <div className="ch">
                  <div><div className="ct">Manual Override</div><div className="cs">Force a specific school year and semester</div></div>
                  {syDraft.autoDetect && <span className="tag tgr">Disabled (Auto-detect is ON)</span>}
                </div>
                <div className="mbody">
                  <div className="fgrid">
                    <div className="fg">
                      <label>School Year</label>
                      <select className="fsel" value={syDraft.schoolYear} disabled={syDraft.autoDetect}
                        onChange={e=>setSyDraft(d=>({...d,schoolYear:e.target.value,autoDetect:false}))}>
                        {SY_OPTIONS.map(s=><option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="fg">
                      <label>Semester</label>
                      <select className="fsel" value={syDraft.semester} disabled={syDraft.autoDetect}
                        onChange={e=>setSyDraft(d=>({...d,semester:e.target.value,autoDetect:false}))}>
                        {SEM_OPTIONS.map(s=><option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  {!syDraft.autoDetect && (
                    <div style={{marginTop:12,padding:'10px 14px',background:'rgba(245,158,11,.06)',borderRadius:4,border:'1px solid rgba(245,158,11,.15)',fontSize:13,color:'var(--amber)'}}>
                      Preview: <strong>S.Y. {syDraft.schoolYear} · {syDraft.semester}</strong>
                    </div>
                  )}
                </div>
              </div>

              <button className="btn btnp" onClick={saveSY} disabled={saving} style={{alignSelf:'flex-start'}}>
                <Icon name="check" size={15}/>{saving ? 'Saving…' : 'Apply School Year Settings'}
              </button>
            </div>
          )}

          {/* ── STUDENT PROMOTION ── */}
          {tab === 'Promotion' && (
            <div style={{display:'flex',flexDirection:'column',gap:14}}>

              {/* Info banner */}
              <div style={{
                padding:'20px 24px',borderRadius:8,
                background:'linear-gradient(135deg,rgba(20,184,166,.08),rgba(139,92,246,.05))',
                border:'1px solid rgba(20,184,166,.2)',
              }}>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:'.14em',textTransform:'uppercase',color:'var(--teal)',marginBottom:8,fontFamily:"'Space Mono',monospace"}}>
                  End of School Year
                </div>
                <div style={{fontSize:20,fontWeight:800,color:'var(--ink)',marginBottom:6}}>Student Promotion</div>
                <div style={{fontSize:13.5,color:'var(--ink3)',lineHeight:1.7}}>
                  Promote all <strong style={{color:'var(--teal)'}}>Grade 11</strong> students to <strong style={{color:'var(--amber)'}}>Grade 12</strong> for the next school year.
                  This will update their grade level, section, and school year in the database.
                </div>
              </div>

              {/* Target SY */}
              <div className="card">
                <div className="ch"><div className="ct">Promotion Settings</div></div>
                <div className="mbody">
                  <div className="fgrid">
                    <div className="fg">
                      <label>Promote FROM</label>
                      <div style={{padding:'9px 13px',background:'rgba(20,184,166,.08)',border:'1px solid rgba(20,184,166,.2)',borderRadius:4,fontSize:14,fontWeight:700,color:'var(--teal)'}}>
                        Grade 11 · {config.schoolYear}
                      </div>
                    </div>
                    <div className="fg">
                      <label>Promote TO</label>
                      <div style={{padding:'9px 13px',background:'var(--amberp)',border:'1px solid rgba(176,90,14,.2)',borderRadius:4,fontSize:14,fontWeight:700,color:'var(--amber)'}}>
                        Grade 12 · {targetSY}
                      </div>
                    </div>
                    <div className="fg">
                      <label>Target School Year</label>
                      <select className="fsel" value={targetSY} onChange={e=>setTargetSY(e.target.value)}>
                        {SY_OPTIONS.map(s=><option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Student list preview */}
              <div className="card">
                <div className="ch">
                  <div><div className="ct">Grade 11 Students to Promote</div><div className="cs">All will be moved to Grade 12</div></div>
                  <span className="tag tb">{promoStudents.length} students</span>
                </div>
                {promoLoading ? <Spinner/> : (
                  <div style={{maxHeight:280,overflowY:'auto'}}>
                    {promoStudents.length === 0 && (
                      <div className="empty">
                        <div className="empty-ico"><Icon name="students" size={24}/></div>
                        <div className="empty-t">No Grade 11 students found</div>
                        <div className="empty-s">Enroll Grade 11 students first</div>
                      </div>
                    )}
                    <table className="tbl">
                      <thead><tr><th>Student</th><th>Current Section</th><th>Strand</th><th>After Promotion</th></tr></thead>
                      <tbody>
                        {promoStudents.map(s=>{
                          const newGrade = (s.grade||'').replace(/^11/,'12');
                          return(
                            <tr key={s._id}>
                              <td style={{fontWeight:600}}>{s.name}</td>
                              <td style={{fontFamily:"'Space Mono',monospace",fontSize:12}}>{s.grade||s.gradeLevel||'—'}</td>
                              <td><span className="tag tb" style={{fontSize:10}}>{s.strand||'—'}</span></td>
                              <td>
                                <div style={{display:'flex',alignItems:'center',gap:8}}>
                                  <span style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:'var(--ink4)',textDecoration:'line-through'}}>{s.grade}</span>
                                  <span style={{color:'var(--amber)',fontSize:14}}>→</span>
                                  <span style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:'var(--amber)',fontWeight:700}}>{newGrade||'Grade 12'}</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {promoErr && <div className="errmsg">{promoErr}</div>}

              {/* Result */}
              {promoResult && (
                <div style={{padding:'20px 24px',borderRadius:8,background:promoResult.failed===0?'rgba(16,185,129,.08)':'rgba(244,63,94,.08)',border:`1px solid ${promoResult.failed===0?'rgba(16,185,129,.2)':'rgba(244,63,94,.2)'}`}}>
                  <div style={{fontWeight:700,fontSize:16,color:promoResult.failed===0?'var(--green)':'var(--rose)',marginBottom:8}}>
                    {promoResult.failed===0 ? '✓ Promotion Complete!' : '⚠ Promotion Finished with Errors'}
                  </div>
                  <div style={{fontSize:13.5,color:'var(--ink2)'}}>
                    <strong style={{color:'var(--green)'}}>{promoResult.success}</strong> students promoted to Grade 12 · S.Y. {promoResult.targetSY}
                    {promoResult.failed>0 && <span> · <strong style={{color:'var(--rose)'}}>{promoResult.failed}</strong> failed</span>}
                  </div>
                  {promoResult.errors?.length>0 && (
                    <div style={{marginTop:10,maxHeight:100,overflowY:'auto'}}>
                      {promoResult.errors.map((e,i)=>(
                        <div key={i} style={{fontSize:12,color:'var(--rose)',padding:'2px 0'}}>{e.name}: {e.error}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Confirm / Run */}
              {!promoResult && (
                <>
                  {!promoConfirm ? (
                    <button className="btn btnt" disabled={promoStudents.length===0||saving}
                      onClick={()=>setPromoConfirm(true)}
                      style={{alignSelf:'flex-start'}}>
                      <Icon name="trend" size={15}/>
                      Promote {promoStudents.length} Students to Grade 12
                    </button>
                  ) : (
                    <div style={{padding:'20px 24px',borderRadius:8,background:'rgba(244,63,94,.06)',border:'1px solid rgba(244,63,94,.2)'}}>
                      <div style={{fontWeight:700,fontSize:15,color:'var(--rose)',marginBottom:8}}>⚠ Confirm Promotion</div>
                      <div style={{fontSize:13.5,color:'var(--ink2)',marginBottom:16}}>
                        This will permanently update <strong>{promoStudents.length} students</strong> from Grade 11 to Grade 12 and change their school year to <strong style={{color:'var(--amber)'}}>{targetSY}</strong>. This action cannot be easily undone.
                      </div>
                      <div style={{display:'flex',gap:10}}>
                        <button className="btn btnx" onClick={()=>setPromoConfirm(false)}>Cancel</button>
                        <button className="btn btnd" disabled={saving} onClick={runPromotion}>
                          {saving ? 'Processing…' : `Yes, Promote ${promoStudents.length} Students`}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
              {promoResult && (
                <button className="btn btno" onClick={()=>{setPromoResult(null);setPromoConfirm(false);loadPromoStudents();}} style={{alignSelf:'flex-start'}}>
                  Refresh Student List
                </button>
              )}
            </div>
          )}

          {/* ── MY ACCOUNT ── */}
          {tab === 'My Account' && (
            <div className="card">
              <div className="ch"><div className="ct">Account Settings</div></div>
              <div className="mbody">
                <div style={{display:'flex',alignItems:'center',gap:14,padding:14,background:'var(--sur2)',borderRadius:6,marginBottom:20,border:'1px solid var(--bdr)'}}>
                  <div style={{width:52,height:52,borderRadius:4,background:'linear-gradient(135deg,var(--amber),var(--amber))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:700,color:'var(--canvas)'}}>
                    {(account.name||'A').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{fontWeight:700,fontSize:15,color:'var(--ink)'}}>{account.name}</div>
                    <div style={{fontSize:13,color:'var(--ink3)',marginTop:2}}>{account.email} · {user?.role}</div>
                  </div>
                </div>
                <form onSubmit={saveAcc}>
                  <div className="fgrid">
                    <div className="fg"><label>Full Name</label><input className="fi" value={account.name} onChange={e=>setAccount(a=>({...a,name:e.target.value}))}/></div>
                    <div className="fg"><label>Email</label><input className="fi" value={account.email} disabled style={{opacity:.5}}/></div>
                  </div>
                  <div style={{marginTop:18}}><button className="btn btnp" type="submit" disabled={saving}>{saving?'Saving…':'Update Profile'}</button></div>
                </form>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {tab === 'Notifications' && (
            <div className="card">
              <div className="ch"><div className="ct">Notification Preferences</div></div>
              <div className="mbody">
                {[['Email Notifications','Receive alerts via email','email'],['SMS Alerts','Urgent SMS alerts','sms'],['Fee Reminders','Automated fee due reminders','fee'],['Attendance Alerts','Low attendance notifications','att'],['Event Reminders','Upcoming event alerts','ev'],['System Updates','Maintenance notices','sys']].map(([l,d,k])=>(
                  <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'13px 0',borderBottom:'1px solid var(--bdr)'}}>
                    <div><div style={{fontWeight:600,fontSize:14,color:'var(--ink)'}}>{l}</div><div style={{fontSize:12.5,color:'var(--ink3)',marginTop:2}}>{d}</div></div>
                    <Tgl v={notifs[k]} onChange={v=>setNotifs(n=>({...n,[k]:v}))}/>
                  </div>
                ))}
                <div style={{marginTop:18}}><button className="btn btnp" onClick={()=>flash()}>Save Preferences</button></div>
              </div>
            </div>
          )}

          {/* ── SECURITY ── */}
          {tab === 'Security' && (
            <div className="card">
              <div className="ch"><div className="ct">Security Settings</div></div>
              <div className="mbody">
                <div style={{fontWeight:700,fontSize:15,color:'var(--ink)',marginBottom:14}}>Change Password</div>
                {pwErr && <div className="errmsg">{pwErr}</div>}
                <form onSubmit={savePw}>
                  <div className="fgrid">
                    {[['Current Password','current'],['New Password','newPw'],['Confirm Password','confirm']].map(([l,k])=>(
                      <div key={k} className="fg fg-full"><label>{l}</label><input className="fi" type="password" placeholder="••••••••" value={pw[k]} onChange={e=>setPw(f=>({...f,[k]:e.target.value}))}/></div>
                    ))}
                  </div>
                  <button className="btn btnp" type="submit" style={{marginTop:16}} disabled={saving}>{saving?'Updating…':'Update Password'}</button>
                </form>
              </div>
            </div>
          )}

          {/* ── APPEARANCE ── */}
          {tab === 'Appearance' && (
            <div className="card">
              <div className="ch"><div className="ct">Appearance</div></div>
              <div className="mbody">
                <div style={{padding:'14px',background:'rgba(245,158,11,.05)',borderRadius:4,border:'1px solid rgba(245,158,11,.15)',fontSize:13.5,color:'var(--ink2)'}}>
                  The current design uses a Dark Tech Glassmorphism theme with Amber Gold accents. Theme customization coming soon.
                </div>
                <div style={{marginTop:20}}>
                  <div style={{fontSize:12,fontWeight:700,color:'var(--ink3)',marginBottom:12,letterSpacing:'.08em',textTransform:'uppercase'}}>Accent Color</div>
                  <div style={{display:'flex',gap:10}}>
                    {['#f59e0b','#14b8a6','#8b5cf6','#f43f5e','#10b981','#0ea5e9'].map(c=>(
                      <div key={c} style={{width:30,height:30,borderRadius:'50%',background:c,cursor:'pointer',border:c==='#f59e0b'?'3px solid #fff':'3px solid transparent',transition:'all .15s'}}/>
                    ))}
                  </div>
                </div>
                <button className="btn btnp" style={{marginTop:24}} onClick={()=>flash()}>Save Appearance</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { Icon, Spinner, StatusBadge, formatDate } from '../components/UI';

export default function StudentPortal() {
  const { user } = useAuth();
  const student = user?.studentId;

  const [tab, setTab]         = useState('overview');
  const [grades, setGrades]   = useState([]);
  const [immersion, setImmersion] = useState(null);
  const [fees, setFees]       = useState([]);
  const [loading, setLoading] = useState(false);

  // Password change state
  const [pwForm, setPwForm]   = useState({ current:'', newPw:'', confirm:'' });
  const [pwErr, setPwErr]     = useState('');
  const [pwOk, setPwOk]       = useState('');
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (!student?._id) return;
    setLoading(true);
    Promise.all([
      api.get('/fees', { params: { search: student.name } }).catch(() => ({ data: [] })),
      api.get('/shs/immersions', { params: { search: student.name } }).catch(() => ({ data: [] })),
    ]).then(([feesRes, immRes]) => {
      setFees(Array.isArray(feesRes.data) ? feesRes.data : []);
      const imms = Array.isArray(immRes.data) ? immRes.data : [];
      setImmersion(imms.find(i => i.studentName === student.name) || null);
    }).finally(() => setLoading(false));
  }, [student]);

  const changePassword = async () => {
    setPwErr(''); setPwOk('');
    if (!pwForm.current)              { setPwErr('Enter your current password'); return; }
    if (pwForm.newPw.length < 6)      { setPwErr('New password must be at least 6 characters'); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwErr('Passwords do not match'); return; }
    setSaving(true);
    try {
      await api.put('/auth/change-password', { currentPassword: pwForm.current, newPassword: pwForm.newPw });
      setPwOk('Password changed successfully!');
      setPwForm({ current:'', newPw:'', confirm:'' });
    } catch (e) { setPwErr(e.response?.data?.message || 'Failed to change password'); }
    finally { setSaving(false); }
  };

  const TABS = ['overview','grades','immersion','fees','account'];

  return (
    <div>
      {/* Must-change password banner */}
      {user?.mustChangePassword && (
        <div style={{marginBottom:20,padding:'14px 18px',background:'rgba(176,90,14,.1)',border:'2px solid var(--amber)',display:'flex',alignItems:'center',gap:12}}>
          <Icon name="alert" size={18}/>
          <div>
            <div style={{fontWeight:700,color:'var(--amber)',fontSize:14}}>Please change your default password</div>
            <div style={{fontSize:12.5,color:'var(--ink3)',marginTop:2}}>Go to the Account tab to set a new password.</div>
          </div>
        </div>
      )}

      {/* Student info header */}
      <div className="card" style={{marginBottom:20,overflow:'visible'}}>
        <div style={{padding:'20px 24px',display:'flex',alignItems:'center',gap:16,borderBottom:'2px solid var(--ink)'}}>
          <div style={{width:56,height:56,background:'var(--amber)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Space Mono',monospace",fontSize:18,fontWeight:700,color:'var(--canvas)',flexShrink:0}}>
            {student?.name?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || 'ST'}
          </div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:900,color:'var(--ink)',letterSpacing:'-.02em'}}>{student?.name || user?.name}</div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:'var(--ink4)',marginTop:4,display:'flex',gap:12,flexWrap:'wrap'}}>
              <span>LRN: {student?.lrn || '—'}</span>
              <span>{student?.gradeLevel} · {student?.strand}</span>
              <span>Section: {student?.section || '—'}</span>
              <span>S.Y. {student?.schoolYear || '2025-2026'}</span>
            </div>
          </div>
          <StatusBadge status={student?.status || 'Active'}/>
        </div>

        {/* Tab nav */}
        <div style={{display:'flex',gap:0,borderBottom:'1px solid var(--bdr2)'}}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{flex:1,padding:'12px',border:'none',borderBottom:`2px solid ${tab===t?'var(--red)':'transparent'}`,cursor:'pointer',fontFamily:"'Space Grotesk',sans-serif",fontSize:11.5,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',background:'transparent',color:tab===t?'var(--ink)':'var(--ink4)',transition:'all .15s'}}>
              {t === 'overview' ? '📊 Overview' : t === 'grades' ? '📝 Grades' : t === 'immersion' ? '🏢 Immersion' : t === 'fees' ? '💰 Fees' : '⚙️ Account'}
            </button>
          ))}
        </div>
      </div>

      {loading ? <Spinner/> : (
        <>
          {/* Overview */}
          {tab === 'overview' && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              {[
                ['Grade Level', student?.gradeLevel || '—', 'var(--teal)'],
                ['Strand', student?.strand || '—', 'var(--amber)'],
                ['GPA', student?.gpa || '—', 'var(--violet)'],
                ['Attendance', (student?.attendance || 0) + '%', 'var(--green)'],
                ['Fee Status', student?.fees || 'Pending', 'var(--sky)'],
                ['Enrollment', student?.enrollmentType || '—', 'var(--orange)'],
              ].map(([l,v,c]) => (
                <div key={l} className="card" style={{padding:'16px 20px'}}>
                  <div style={{fontSize:9.5,fontFamily:"'Space Mono',monospace",fontWeight:700,color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.12em',marginBottom:6}}>{l}</div>
                  <div style={{fontFamily:"'Fraunces',serif",fontSize:24,fontWeight:900,color:c}}>{v}</div>
                </div>
              ))}
            </div>
          )}

          {/* Grades — mock per-quarter */}
          {tab === 'grades' && (
            <div className="card">
              <div className="ch"><div className="ct">My Quarterly Grades</div><div className="cs">S.Y. {student?.schoolYear}</div></div>
              <div className="cb">
                <div style={{padding:'14px',background:'var(--sur)',border:'1px solid var(--bdr2)',marginBottom:16,fontSize:13,color:'var(--ink3)'}}>
                  Grades shown here are computed by your subject teachers. Contact your class adviser for concerns.
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
                  {['1st Quarter','2nd Quarter','3rd Quarter','4th Quarter'].map(q => {
                    const seed = (student?._id||'x' + q).split('').reduce((a,c)=>a+c.charCodeAt(0),0);
                    const g = 80 + (seed % 18);
                    return (
                      <div key={q} style={{padding:'16px',background:'var(--sur)',border:'1.5px solid var(--bdr3)',textAlign:'center'}}>
                        <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,fontWeight:700,color:'var(--ink4)',textTransform:'uppercase',marginBottom:8,letterSpacing:'.1em'}}>{q}</div>
                        <div style={{fontFamily:"'Fraunces',serif",fontSize:32,fontWeight:900,color:g>=90?'var(--green)':g>=85?'var(--teal)':g>=80?'var(--amber)':'var(--rose)'}}>{g}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Work Immersion */}
          {tab === 'immersion' && (
            <div className="card">
              <div className="ch"><div className="ct">Work Immersion Record</div></div>
              {immersion ? (
                <div className="cb">
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
                    {[['Company', immersion.company], ['Supervisor', immersion.supervisor||'—'], ['Start Date', formatDate(immersion.startDate)], ['End Date', formatDate(immersion.endDate)]].map(([l,v])=>(
                      <div key={l}><div style={{fontFamily:"'Space Mono',monospace",fontSize:9,fontWeight:700,color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:4}}>{l}</div><div style={{fontSize:13.5,color:'var(--ink)',fontWeight:600}}>{v}</div></div>
                    ))}
                  </div>
                  <div style={{marginBottom:12}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                      <span style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:'var(--ink4)'}}>HOURS PROGRESS</span>
                      <span style={{fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:700,color:'var(--teal)'}}>{immersion.renderedHours}/{immersion.requiredHours}h</span>
                    </div>
                    <div style={{height:8,background:'var(--sur2)',overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${Math.min(100,Math.round((immersion.renderedHours/immersion.requiredHours)*100))}%`,background:'var(--teal)',transition:'width 1s'}}/>
                    </div>
                  </div>
                  <StatusBadge status={immersion.status}/>
                </div>
              ) : (
                <div className="empty"><div className="empty-t">No immersion record found</div><div className="empty-s">Your teacher will create your record when you are deployed</div></div>
              )}
            </div>
          )}

          {/* Fees */}
          {tab === 'fees' && (
            <div className="card">
              <div className="ch"><div className="ct">Fee Summary</div></div>
              {fees.length === 0 ? (
                <div className="empty"><div className="empty-t">No fee records found</div></div>
              ) : (
                <div className="tw">
                  <table className="tbl">
                    <thead><tr><th>Type</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th><th>Due Date</th></tr></thead>
                    <tbody>
                      {fees.map((f,i)=>(
                        <tr key={f._id}>
                          <td style={{fontWeight:600}}>{f.type}</td>
                          <td style={{fontFamily:"'Space Mono',monospace",fontSize:12}}>₱{(f.amount||0).toLocaleString()}</td>
                          <td style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:'var(--green)'}}>₱{(f.paid||0).toLocaleString()}</td>
                          <td style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:'var(--rose)'}}>₱{(f.due||0).toLocaleString()}</td>
                          <td><StatusBadge status={f.status}/></td>
                          <td style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:'var(--ink4)'}}>{formatDate(f.dueDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Account / Password */}
          {tab === 'account' && (
            <div className="card" style={{maxWidth:440}}>
              <div className="ch"><div className="ct">Change Password</div></div>
              <div className="cb">
                {pwErr && <div className="errmsg" style={{marginBottom:14}}>{pwErr}</div>}
                {pwOk  && <div style={{padding:'10px 14px',background:'rgba(35,107,60,.1)',border:'1.5px solid rgba(35,107,60,.25)',color:'var(--green)',marginBottom:14,fontSize:13,fontWeight:600}}>{pwOk}</div>}
                <div style={{display:'flex',flexDirection:'column',gap:13}}>
                  {[['Current Password','current','current-password'],['New Password','newPw','new-password'],['Confirm New Password','confirm','new-password']].map(([l,k,ac])=>(
                    <div className="fg" key={k}>
                      <label>{l}</label>
                      <input className="fi" type="password" autoComplete={ac} value={pwForm[k]} onChange={e=>setPwForm(f=>({...f,[k]:e.target.value}))} placeholder="••••••••"/>
                    </div>
                  ))}
                  <button className="btn btnp" onClick={changePassword} disabled={saving} style={{marginTop:6}}>
                    {saving ? 'Saving…' : 'Change Password'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

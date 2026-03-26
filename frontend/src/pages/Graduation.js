import { useState, useEffect } from 'react';
import api from '../api';
import { Icon, Spinner, getInitials, getAvatarColor } from '../components/UI';

export default function Graduation() {
  const [preview,   setPreview]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [running,   setRunning]   = useState(false);
  const [result,    setResult]    = useState(null);
  const [err,       setErr]       = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [deleteGrad, setDeleteGrad] = useState(false);

  const now        = new Date();
  const nextSY     = `${now.getFullYear()}-${now.getFullYear()+1}`;
  const [targetSY, setTargetSY] = useState(nextSY);

  useEffect(() => {
    api.get('/graduation/preview')
      .then(({ data }) => setPreview(data.students || []))
      .catch(() => setPreview([]))
      .finally(() => setLoading(false));
  }, []);

  const runGraduation = async () => {
    if (!confirmed) { setErr('Please check the confirmation box first'); return; }
    setRunning(true); setErr('');
    try {
      const { data } = await api.post('/graduation/run', { targetSchoolYear: targetSY, deleteGraduated: deleteGrad });
      setResult(data);
    } catch (e) { setErr(e.response?.data?.message || 'Graduation process failed'); }
    finally { setRunning(false); }
  };

  return (
    <div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:11,fontWeight:700,color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:4}}>System · End of School Year</div>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:28,fontWeight:900,color:'var(--ink)'}}>Grade 12 Graduation & Promotion</div>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:'var(--ink4)',marginTop:6}}>
          Graduates Grade 12 students and promotes Grade 11 → Grade 12 for the new school year.
        </div>
      </div>

      {/* Warning banner */}
      <div style={{marginBottom:20,padding:'16px 20px',background:'rgba(184,38,74,.08)',border:'2px solid var(--rose)',display:'flex',gap:14,alignItems:'flex-start'}}>
        <Icon name="alert" size={20}/>
        <div>
          <div style={{fontWeight:700,color:'var(--rose)',fontSize:14,marginBottom:4}}>This action cannot be undone</div>
          <div style={{fontSize:13,color:'var(--ink3)',lineHeight:1.6}}>
            Running graduation will: (1) mark all Grade 12 students as Graduated and remove their login accounts,
            (2) promote all Grade 11 students to Grade 12, (3) update school year to {targetSY}.
            Make sure all report cards, grades, and clearances are finalized before proceeding.
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
        {/* Configuration */}
        <div className="card">
          <div className="ch"><div className="ct">Graduation Settings</div></div>
          <div className="cb">
            <div className="fg" style={{marginBottom:14}}>
              <label>Target School Year (new year after graduation)</label>
              <input className="fi" value={targetSY} onChange={e=>setTargetSY(e.target.value)} placeholder="e.g. 2026-2027"/>
            </div>

            <div style={{marginBottom:16,padding:'12px 14px',background:'var(--sur)',border:'1.5px solid var(--bdr3)'}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,fontWeight:700,color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:10}}>After Graduation, Grade 12 records:</div>
              {[
                ['archive', false, 'Archive — Keep records, mark as "Graduated", remove login access'],
                ['delete',  true,  'Delete — Remove student records entirely (frees up database)'],
              ].map(([id, val, label]) => (
                <label key={id} style={{display:'flex',alignItems:'flex-start',gap:10,cursor:'pointer',marginBottom:8}}>
                  <input type="radio" name="deleteGrad" checked={deleteGrad===val} onChange={()=>setDeleteGrad(val)} style={{marginTop:3,flexShrink:0}}/>
                  <span style={{fontSize:13,color:'var(--ink2)',lineHeight:1.5}}>{label}</span>
                </label>
              ))}
            </div>

            {/* Confirm checkbox */}
            <label style={{display:'flex',alignItems:'flex-start',gap:10,cursor:'pointer',padding:'12px 14px',background:confirmed?'rgba(35,107,60,.08)':'var(--sur2)',border:`1.5px solid ${confirmed?'rgba(35,107,60,.3)':'var(--bdr3)'}`,transition:'all .2s'}}>
              <input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} style={{marginTop:3,flexShrink:0}}/>
              <span style={{fontSize:13,color:'var(--ink2)',lineHeight:1.5}}>
                I confirm that all grades, report cards, and clearances are finalized. I understand this action cannot be undone.
              </span>
            </label>

            {err && <div className="errmsg" style={{marginTop:12}}>{err}</div>}

            {!result && (
              <button className="btn btnx" style={{marginTop:14,width:'100%',justifyContent:'center',padding:'12px',fontSize:13}}
                onClick={runGraduation} disabled={running || !confirmed}>
                {running ? 'Processing…' : `🎓 Run Graduation — Move to S.Y. ${targetSY}`}
              </button>
            )}
          </div>
        </div>

        {/* Grade 12 preview */}
        <div className="card">
          <div className="ch">
            <div><div className="ct">Grade 12 Students</div><div className="cs">Will be graduated</div></div>
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:700,color:'var(--rose)'}}>{preview.length} students</span>
          </div>
          <div style={{maxHeight:340,overflowY:'auto'}}>
            {loading ? <div style={{padding:30,textAlign:'center'}}><Spinner/></div> :
             preview.length === 0 ? <div className="empty"><div className="empty-t">No Grade 12 students</div></div> : (
              <table className="tbl">
                <thead><tr><th>Student</th><th>Strand</th><th>GPA</th></tr></thead>
                <tbody>
                  {preview.map((s,i)=>(
                    <tr key={s._id}>
                      <td>
                        <div className="uc">
                          <div className="av" style={{background:getAvatarColor(s.name),width:28,height:28,fontSize:10,borderRadius:2,color:'var(--canvas)'}}>{getInitials(s.name)}</div>
                          <div className="un" style={{fontSize:12.5}}>{s.name}</div>
                        </div>
                      </td>
                      <td><span className="tag tb" style={{fontSize:8}}>{s.strand||'—'}</span></td>
                      <td style={{fontFamily:"'Space Mono',monospace",fontSize:12,fontWeight:700,color:'var(--teal)'}}>{s.gpa||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="card">
          <div className="ch"><div className="ct">Graduation Complete</div></div>
          <div className="cb">
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
              {[['Graduated',result.graduated,'var(--green)'],['Promoted',result.promoted,'var(--teal)'],['Accounts Removed',result.accountsDeleted,'var(--amber)'],['Errors',result.errors?.length||0,'var(--rose)']].map(([l,v,c])=>(
                <div key={l} style={{padding:'14px',background:'var(--sur)',border:'1.5px solid var(--bdr3)',textAlign:'center'}}>
                  <div style={{fontFamily:"'Fraunces',serif",fontSize:28,fontWeight:900,color:c}}>{v}</div>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.1em',marginTop:4}}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{padding:'12px 16px',background:'rgba(35,107,60,.08)',border:'1.5px solid rgba(35,107,60,.25)',color:'var(--green)',fontSize:13,fontWeight:600}}>
              ✓ {result.message}
            </div>
            {result.errors?.length > 0 && (
              <div style={{marginTop:12,maxHeight:120,overflowY:'auto',background:'var(--rosep)',border:'1px solid rgba(184,38,74,.2)',padding:'10px 14px'}}>
                {result.errors.map((e,i)=><div key={i} style={{fontSize:12,color:'var(--rose)'}}><strong>{e.name}</strong>: {e.error}</div>)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

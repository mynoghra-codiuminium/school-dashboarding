import { useState, useEffect } from 'react';
import api from '../../api';
import { Icon, Spinner, getInitials, getAvatarColor } from '../../components/UI';

const FORMS = [
  { id:'SF9',  label:'SF9 — Report Card',             desc:'Official DepEd Report Card for learner promotion/retention decisions', icon:'report',   color:'var(--amber)'  },
  { id:'SF10', label:'SF10 — Learner\'s Permanent Record', desc:'Comprehensive learner profile and academic history record',          icon:'students', color:'var(--teal)'   },
  { id:'SF4',  label:'SF4 — Monthly Learner Movement', desc:'Summary of learners enrolled, transferred, dropped per month',         icon:'chart',    color:'var(--violet)' },
  { id:'SF2',  label:'SF2 — Daily Attendance',         desc:'Daily attendance monitoring form for official recording',               icon:'events',   color:'var(--sky)'    },
  { id:'COE',  label:'Certificate of Enrollment',      desc:'Official proof of enrollment for a learner in the current school year', icon:'subjects', color:'var(--green)'  },
  { id:'GF',   label:'Graduation Form',                desc:'Grade 12 graduation clearance and eligibility document',               icon:'graduation',color:'var(--rose)'   },
];

export default function DepEdForms() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading]  = useState(true);
  const [selected, setSelected]= useState(null);   // { form, student }
  const [search, setSearch]    = useState('');
  const [step, setStep]        = useState(1);       // 1=pick form, 2=pick student, 3=preview

  useEffect(() => {
    api.get('/students', { params: { limit: 200 } }).then(({ data }) => setStudents(data.students || data || [])).catch(()=>setStudents([])).finally(()=>setLoading(false));
  }, []);

  const pickForm = (f) => { setSelected(s => ({...s, form:f})); setStep(2); };
  const pickStudent = (s) => { setSelected(prev => ({...prev, student:s})); setStep(3); };
  const reset = () => { setSelected(null); setStep(1); };

  const rows = students.filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:11,fontWeight:700,color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:4}}>SHS · DepEd Forms</div>
        <div style={{fontSize:22,fontWeight:800,color:'var(--ink)'}}>DepEd Official Forms</div>
      </div>

      {/* Step indicator */}
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20}}>
        {['Select Form','Select Student','Preview & Print'].map((l,i)=>(
          <div key={l} style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <div style={{width:24,height:24,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,
                background:step>i+1?'var(--green)':step===i+1?'var(--amber)':'var(--sur2)',
                color:step>i+1?'#fff':step===i+1?'var(--canvas)':'var(--ink4)',
              }}>{step>i+1?'✓':i+1}</div>
              <span style={{fontSize:12.5,fontWeight:600,color:step===i+1?'var(--ink)':'var(--ink4)'}}>{l}</span>
            </div>
            {i<2 && <div style={{width:24,height:1,background:'var(--bdr)'}}/>}
          </div>
        ))}
        {step > 1 && <button className="btn btno bsm" style={{marginLeft:'auto'}} onClick={reset}>← Start Over</button>}
      </div>

      {/* Step 1: Pick form */}
      {step===1 && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12}}>
          {FORMS.map((f,i) => (
            <button key={f.id} onClick={()=>pickForm(f)}
              style={{animation:`fadeUp .4s ${i*60}ms both`,textAlign:'left',cursor:'pointer',padding:'18px 20px',
                borderRadius:6,border:'1px solid var(--bdr)',background:'var(--sur)',outline:'none',transition:'all .2s',
              }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=f.color;e.currentTarget.style.background='var(--sur2)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--bdr)';e.currentTarget.style.background='var(--sur)';}}>
              <div style={{width:40,height:40,borderRadius:10,background:`${f.color}18`,display:'flex',alignItems:'center',justifyContent:'center',color:f.color,marginBottom:12}}>
                <Icon name={f.icon} size={20}/>
              </div>
              <div style={{fontWeight:700,fontSize:14,color:'var(--ink)',marginBottom:5}}>{f.label}</div>
              <div style={{fontSize:12,color:'var(--ink4)',lineHeight:1.5}}>{f.desc}</div>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Pick student */}
      {step===2 && (
        <div>
          <div style={{marginBottom:14,padding:'12px 16px',borderRadius:10,background:'var(--amberp)',border:'1px solid rgba(176,90,14,.2)'}}>
            <span style={{fontSize:13,color:'var(--amber)',fontWeight:600}}>Selected Form: </span>
            <span style={{fontSize:13,color:'var(--ink)'}}>{selected?.form?.label}</span>
          </div>
          <div style={{display:'flex',gap:10,marginBottom:14}}>
            <div className="tsearch" style={{flex:1,maxWidth:320}}><Icon name="search" size={15}/><input placeholder="Search student…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
          </div>
          <div className="card">
            <div className="tw">
              {loading ? <div style={{padding:40,textAlign:'center'}}><Spinner/></div> : (
                <table className="tbl">
                  <thead><tr><th>Student</th><th>Grade</th><th>Strand</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {rows.slice(0,30).map((s,i)=>(
                      <tr key={s._id} style={{animation:`fadeUp .35s ${i*30}ms both`}}>
                        <td>
                          <div className="uc">
                            <div className="av" style={{background:getAvatarColor(s.name),width:32,height:32,fontSize:11,borderRadius:4,color:'var(--canvas)'}}>{getInitials(s.name)}</div>
                            <div><div className="un">{s.name}</div><div className="us">{s.email}</div></div>
                          </div>
                        </td>
                        <td style={{fontSize:12,color:'var(--ink3)'}}>{s.grade}</td>
                        <td><span className="tag tb">{s.strand||'—'}</span></td>
                        <td style={{fontSize:12,color:'var(--ink3)'}}>{s.status}</td>
                        <td><button className="btn btnp bsm" onClick={()=>pickStudent(s)}>Select</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step===3 && selected?.student && (
        <div>
          <div style={{display:'flex',gap:10,marginBottom:16,alignItems:'center'}}>
            <button className="btn btno bsm" onClick={()=>setStep(2)}>← Change Student</button>
            <button className="btn btnp bsm" onClick={()=>window.print()}>🖨 Print Form</button>
          </div>
          <div className="card" style={{padding:'28px 32px'}}>
            {/* Form Header */}
            <div style={{textAlign:'center',marginBottom:24,paddingBottom:20,borderBottom:'2px solid rgba(255,255,255,.1)'}}>
              <div style={{fontSize:11,fontWeight:700,color:'var(--ink4)',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:4}}>Republic of the Philippines · Department of Education</div>
              <div style={{fontSize:20,fontWeight:800,color:'var(--amber)'}}>{selected.form.label}</div>
              <div style={{fontSize:13,color:'var(--ink4)',marginTop:4}}>School Year 2025–2026</div>
            </div>

            {/* Learner Info */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:24,padding:'16px',borderRadius:10,background:'var(--sur)'}}>
              {[
                ['Learner\'s Name', selected.student.name],
                ['LRN', selected.student.lrn || 'Not Assigned'],
                ['Grade Level', selected.student.grade],
                ['Strand / Track', selected.student.strand || '—'],
                ['Section', selected.student.section || '—'],
                ['School Year', '2025–2026'],
                ['Sex', selected.student.gender || '—'],
                ['Date of Birth', selected.student.dob ? new Date(selected.student.dob).toLocaleDateString() : '—'],
                ['Status', selected.student.status || 'Active'],
              ].map(([l,v])=>(
                <div key={l}>
                  <div style={{fontSize:10.5,color:'var(--ink4)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:4}}>{l}</div>
                  <div style={{fontSize:13.5,color:'var(--ink)',fontWeight:600}}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{padding:'14px',borderRadius:8,background:'rgba(245,158,11,.07)',border:'1px solid rgba(176,90,14,.2)',textAlign:'center',color:'var(--amber)',fontSize:13,fontWeight:600}}>
              ✓ Form is ready to print. Use browser Print (Ctrl+P) for best results.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { Icon, Spinner, Modal, formatDate } from '../../components/UI';

// ── DepEd Grade computation helpers ─────────────────────────────────────────
const QUARTERS = ['Q1','Q2','Q3','Q4'];
const Q_LABELS = { Q1:'1st Quarter', Q2:'2nd Quarter', Q3:'3rd Quarter', Q4:'4th Quarter' };
const STRANDS  = ['STEM','ABM','HUMSS','GAS','TVL'];

const SUBJECTS_BY_STRAND = {
  STEM: ['Pre-Calculus','Basic Calculus','General Biology 1','General Biology 2','General Chemistry','General Physics','Statistics & Probability','Research 1','Research 2','Work Immersion'],
  ABM:  ['Fundamentals of ABM','Business Math','Business Finance','Principles of Marketing','Applied Economics','Organization & Management','Work Immersion'],
  HUMSS:['Creative Writing','Introduction to World Religions','Trends in 21st Century Literature','Philippine Politics & Governance','Community Engagement','Media & Information Literacy','Work Immersion'],
  GAS:  ['Earth & Life Science','Living in the IT Era','Empowerment Technologies','Entrepreneurship','Disaster Readiness','Work Immersion'],
  TVL:  ['CSS NC II','Cookery NC II','Computer Systems Servicing','Bread & Pastry Production','Dressmaking NC II','Work Immersion'],
  Core: ['Oral Communication','Komunikasyon at Pananaliksik','21st Century Literature','Contemporary Philippine Arts','PE & Health 1','PE & Health 2','Personal Development','Earth & Life Science','Understanding Culture','Media & Information Literacy'],
};

const TRANSMUTATION = [
  [100,100],[98.40,99],[96.80,98],[95.20,97],[93.60,96],[92.00,95],[90.40,94],[88.80,93],[87.20,92],[85.60,91],
  [84.00,90],[82.40,89],[80.80,88],[79.20,87],[77.60,86],[76.00,85],[74.40,84],[72.80,83],[71.20,82],[69.60,81],
  [68.00,80],[66.40,79],[64.80,78],[63.20,77],[61.60,76],[60.00,75],[56.00,74],[52.00,73],[48.00,72],[44.00,71],
  [40.00,70],[36.00,69],[32.00,68],[28.00,67],[24.00,66],[20.00,65],
];

function transmute(initial) {
  if (initial >= 100) return 100;
  if (initial < 0)    return 65;
  const found = TRANSMUTATION.find(([raw]) => initial >= raw);
  return found ? found[1] : 65;
}

function gradeColor(g) {
  if (g >= 90) return 'var(--green)';
  if (g >= 85) return 'var(--teal)';
  if (g >= 80) return 'var(--amber)';
  if (g >= 75) return 'var(--orange)';
  return 'var(--rose)';
}

function gradeDesc(g) {
  if (g >= 90) return 'Outstanding';
  if (g >= 85) return 'Very Satisfactory';
  if (g >= 80) return 'Satisfactory';
  if (g >= 75) return 'Fairly Satisfactory';
  return 'Did Not Meet';
}

// ── Empty grade form ─────────────────────────────────────────────────────────
const mkEmpty = (student, subjectCode, subjectName, quarter, semester, schoolYear, teacherName) => ({
  studentId:   student._id || null,
  studentName: student.name,
  strand:      student.strand || 'STEM',
  gradeLevel:  student.gradeLevel || 'Grade 11',
  semester, schoolYear,
  subjectCode, subjectName, quarter,
  teacher: teacherName || '',
  writtenWorks: { scores:[], percent:0, weight:25 },
  performanceTasks: { scores:[], percent:0, weight:50 },
  quarterlyAssessment: { score:0, total:100, percent:0, weight:25 },
});

export default function GradingSystem() {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const isAdmin   = user?.role === 'admin';
  const canEdit   = isTeacher || isAdmin;

  const [students,    setStudents]    = useState([]);
  const [grades,      setGrades]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [strand,      setStrand]      = useState('STEM');
  const [quarter,     setQuarter]     = useState('Q1');
  const [semester,    setSemester]    = useState('1st Semester');
  const [schoolYear,  setSchoolYear]  = useState('2025-2026');
  const [subject,     setSubject]     = useState('');
  const [search,      setSearch]      = useState('');
  const [modal,       setModal]       = useState(null); // 'single'|'batch'|'import'
  const [editGrade,   setEditGrade]   = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [err,         setErr]         = useState('');
  const [batchResult, setBatchResult] = useState(null);
  const fileRef = useRef(null);

  // Derived subject list
  const subjects = [...(SUBJECTS_BY_STRAND[strand]||[]), ...SUBJECTS_BY_STRAND.Core].filter((v,i,a)=>a.indexOf(v)===i);
  
  useEffect(() => {
    if (!subject && subjects.length) setSubject(subjects[0]);
  }, [strand]);

  // Load students
  useEffect(() => {
    api.get('/students', { params: { limit: 300 } })
      .then(({ data }) => setStudents((data.students || data || []).filter(s => !strand || s.strand === strand)))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, [strand]);

  // Load grades
  const loadGrades = useCallback(() => {
    if (!subject) return;
    setGradesLoading(true);
    api.get('/shs/grades', { params: { strand, quarter, semester, schoolYear, subjectCode: subject } })
      .then(({ data }) => setGrades(Array.isArray(data) ? data : []))
      .catch(() => setGrades([]))
      .finally(() => setGradesLoading(false));
  }, [strand, quarter, semester, schoolYear, subject]);

  useEffect(() => { loadGrades(); }, [loadGrades]);

  const getStudentGrade = (student) =>
    grades.find(g => g.studentId === student._id || g.studentName === student.name);

  // Save single grade
  const saveSingle = async () => {
    if (!editGrade) return;
    setSaving(true); setErr('');
    try {
      if (editGrade._id) {
        await api.put(`/shs/grades/${editGrade._id}`, editGrade);
      } else {
        await api.post('/shs/grades', editGrade);
      }
      loadGrades();
      setModal(null);
    } catch (e) { setErr(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  // Open single grade editor for a student
  const openGrade = (student) => {
    const existing = getStudentGrade(student);
    setEditGrade(existing || mkEmpty(student, subject, subject, quarter, semester, schoolYear, user?.name || ''));
    setErr(''); setModal('single');
  };

  // Batch: quick-fill transmuted grades for all students
  const [batchGrades, setBatchGrades] = useState({});

  const openBatch = () => {
    const init = {};
    rows.forEach(s => {
      const g = getStudentGrade(s);
      init[s._id] = g?.transmutedGrade || '';
    });
    setBatchGrades(init);
    setBatchResult(null); setErr(''); setModal('batch');
  };

  const saveBatch = async () => {
    setSaving(true); setErr(''); setBatchResult(null);
    try {
      const payload = rows
        .filter(s => batchGrades[s._id] !== '' && batchGrades[s._id] !== undefined)
        .map(s => {
          const g = getStudentGrade(s);
          const transmuted = Number(batchGrades[s._id]);
          return {
            ...(g || mkEmpty(s, subject, subject, quarter, semester, schoolYear, user?.name||'')),
            transmutedGrade: transmuted,
            initialGrade:    transmuted,
            remarks:         transmuted >= 75 ? 'Passed' : 'Failed',
          };
        });
      const { data } = await api.post('/shs/grades/batch', payload);
      setBatchResult(data);
      loadGrades();
    } catch (e) { setErr(e.response?.data?.message || 'Batch save failed'); }
    finally { setSaving(false); }
  };

  const rows = students.filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase()));

  // WW/PT/QA field updater
  const setField = (path, value) => {
    setEditGrade(g => {
      const copy = JSON.parse(JSON.stringify(g));
      const parts = path.split('.');
      let cur = copy;
      for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
      cur[parts[parts.length - 1]] = value;
      return copy;
    });
  };

  const computePreview = (g) => {
    if (!g) return null;
    const ww  = (g.writtenWorks?.percent     || 0) * 0.25;
    const pt  = (g.performanceTasks?.percent  || 0) * 0.50;
    const qa  = (g.quarterlyAssessment?.percent || 0) * 0.25;
    const initial = Math.round(ww + pt + qa);
    return { initial, transmuted: transmute(initial) };
  };

  const preview = computePreview(editGrade);

  return (
    <div>
      <div style={{marginBottom:20,display:'flex',alignItems:'flex-end',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:4}}>SHS · Grading System</div>
          <div style={{fontSize:22,fontWeight:800,color:'var(--ink)'}}>Quarter Grades</div>
        </div>
        {canEdit && (
          <div style={{display:'flex',gap:8}}>
            <button className="btn btno bsm" onClick={openBatch}><Icon name="edit" size={14}/> Batch Enter Grades</button>
          </div>
        )}
      </div>

      {/* Filter controls */}
      <div className="card" style={{marginBottom:16,padding:'14px 18px'}}>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>
          <div className="fg" style={{minWidth:130}}>
            <label>Strand</label>
            <select className="fsel" value={strand} onChange={e=>{setStrand(e.target.value);}}>
              {STRANDS.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="fg" style={{minWidth:130}}>
            <label>Quarter</label>
            <select className="fsel" value={quarter} onChange={e=>setQuarter(e.target.value)}>
              {QUARTERS.map(q=><option key={q} value={q}>{Q_LABELS[q]}</option>)}
            </select>
          </div>
          <div className="fg" style={{minWidth:150}}>
            <label>Semester</label>
            <select className="fsel" value={semester} onChange={e=>setSemester(e.target.value)}>
              <option>1st Semester</option><option>2nd Semester</option>
            </select>
          </div>
          <div className="fg" style={{minWidth:120}}>
            <label>School Year</label>
            <input className="fi" value={schoolYear} onChange={e=>setSchoolYear(e.target.value)} placeholder="2025-2026"/>
          </div>
          <div className="fg" style={{flex:2,minWidth:200}}>
            <label>Subject</label>
            <select className="fsel" value={subject} onChange={e=>setSubject(e.target.value)}>
              {subjects.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="tsearch" style={{flex:1,minWidth:180}}>
            <Icon name="search" size={15}/>
            <input placeholder="Search student…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>
      </div>

      {/* Grade table */}
      <div className="card">
        <div className="ch">
          <div><div className="ct">{Q_LABELS[quarter]} · {strand} · {subject}</div><div className="cs">{rows.length} students</div></div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:'var(--ink4)'}}>
              {grades.length} grades recorded
            </span>
          </div>
        </div>
        <div className="tw">
          {loading ? <div style={{padding:40,textAlign:'center'}}><Spinner/></div> : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Section</th>
                  <th style={{textAlign:'center'}}>WW (25%)</th>
                  <th style={{textAlign:'center'}}>PT (50%)</th>
                  <th style={{textAlign:'center'}}>QA (25%)</th>
                  <th style={{textAlign:'center'}}>Initial</th>
                  <th style={{textAlign:'center'}}>Transmuted</th>
                  <th style={{textAlign:'center'}}>Remarks</th>
                  {canEdit && <th style={{textAlign:'right'}}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((s, i) => {
                  const g = getStudentGrade(s);
                  return (
                    <tr key={s._id} style={{animation:`fadeUp .3s ${i*30}ms both`}}>
                      <td>
                        <div style={{fontWeight:600,color:'var(--ink)',fontSize:13.5}}>{s.name}</div>
                        <div style={{fontSize:11,color:'var(--ink4)'}}>{s.lrn ? `LRN: ${s.lrn}` : s.gradeLevel}</div>
                      </td>
                      <td style={{fontSize:12.5,color:'var(--ink3)'}}>{s.section || s.grade || '—'}</td>
                      <td style={{textAlign:'center',fontFamily:"'Space Mono',monospace",fontSize:13,color:'var(--teal)'}}>
                        {g ? Math.round(g.writtenWorks?.percent||0) : <span style={{color:'var(--bdr3)'}}>—</span>}
                      </td>
                      <td style={{textAlign:'center',fontFamily:"'Space Mono',monospace",fontSize:13,color:'var(--violet)'}}>
                        {g ? Math.round(g.performanceTasks?.percent||0) : <span style={{color:'var(--bdr3)'}}>—</span>}
                      </td>
                      <td style={{textAlign:'center',fontFamily:"'Space Mono',monospace",fontSize:13,color:'var(--sky)'}}>
                        {g ? Math.round(g.quarterlyAssessment?.percent||0) : <span style={{color:'var(--bdr3)'}}>—</span>}
                      </td>
                      <td style={{textAlign:'center',fontFamily:"'Space Mono',monospace",fontSize:13}}>
                        {g ? g.initialGrade ?? '—' : <span style={{color:'var(--bdr3)'}}>—</span>}
                      </td>
                      <td style={{textAlign:'center'}}>
                        {g?.transmutedGrade != null
                          ? <span style={{fontFamily:"'Space Mono',monospace",fontSize:14,fontWeight:800,color:gradeColor(g.transmutedGrade)}}>{g.transmutedGrade}</span>
                          : <span style={{color:'var(--bdr3)',fontSize:12}}>Not entered</span>}
                      </td>
                      <td style={{textAlign:'center'}}>
                        {g?.remarks
                          ? <span style={{fontSize:11.5,fontWeight:600,color:g.remarks==='Passed'?'var(--green)':'var(--rose)',background:g.remarks==='Passed'?'rgba(35,107,60,.1)':'rgba(184,38,74,.08)',padding:'2px 8px',borderRadius:4}}>{g.remarks}</span>
                          : <span style={{color:'var(--bdr3)',fontSize:11}}>—</span>}
                      </td>
                      {canEdit && (
                        <td style={{textAlign:'right'}}>
                          <button className="btn btno bsm" onClick={()=>openGrade(s)}>
                            {g ? <><Icon name="edit" size={12}/> Edit</> : <><Icon name="plus" size={12}/> Enter</>}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!loading && !rows.length && (
            <div className="empty"><div className="empty-ico"><Icon name="report" size={24}/></div><div className="empty-t">No students in {strand}</div><div className="empty-s">Enroll students in this strand first</div></div>
          )}
        </div>
      </div>

      {/* DepEd scale legend */}
      <div className="card" style={{marginTop:14}}>
        <div className="ch"><div className="ct">DepEd Grading Scale — Transmutation Table</div></div>
        <div className="cb" style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          {[['90–100','Outstanding','var(--green)'],['85–89','Very Satisfactory','var(--teal)'],['80–84','Satisfactory','var(--amber)'],['75–79','Fairly Satisfactory','var(--orange)'],['Below 75','Did Not Meet Expectations','var(--rose)']].map(([r,d,c])=>(
            <div key={r} style={{padding:'10px 14px',background:`${c}10`,border:`1px solid ${c}25`,flex:1,minWidth:140}}>
              <div style={{fontSize:15,fontWeight:800,color:c,fontFamily:"'Space Mono',monospace"}}>{r}</div>
              <div style={{fontSize:11,color:'var(--ink4)',marginTop:3}}>{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Single Grade Editor Modal ── */}
      {modal === 'single' && editGrade && (
        <Modal title={`Enter Grade — ${editGrade.studentName}`} onClose={()=>setModal(null)} wide
          footer={<><button className="btn btno" onClick={()=>setModal(null)}>Cancel</button>{canEdit&&<button className="btn btnp" onClick={saveSingle} disabled={saving}>{saving?'Saving…':'Save Grade'}</button>}</>}>
          {err && <div className="errmsg" style={{marginBottom:12}}>{err}</div>}

          {/* Live preview */}
          {preview && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:10,marginBottom:18}}>
              {[['WW Percent',Math.round(editGrade.writtenWorks?.percent||0)+'%','var(--teal)'],
                ['PT Percent',Math.round(editGrade.performanceTasks?.percent||0)+'%','var(--violet)'],
                ['QA Percent',Math.round(editGrade.quarterlyAssessment?.percent||0)+'%','var(--sky)'],
                ['Transmuted',preview.transmuted,'var(--amber)'],
              ].map(([l,v,c])=>(
                <div key={l} style={{padding:'10px',background:'var(--sur)',border:'1.5px solid var(--bdr3)',textAlign:'center'}}>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:18,fontWeight:800,color:c}}>{v}</div>
                  <div style={{fontSize:9,color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.1em',marginTop:3}}>{l}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
            {/* Written Works */}
            <div style={{background:'var(--sur)',border:'1.5px solid var(--bdr3)',padding:'14px'}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,fontWeight:700,color:'var(--teal)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:10}}>Written Works (25%)</div>
              <div className="fg" style={{marginBottom:8}}>
                <label>Percent Score (0–100)</label>
                <input className="fi" type="number" min="0" max="100"
                  value={editGrade.writtenWorks?.percent||0}
                  onChange={e=>setField('writtenWorks.percent', Number(e.target.value))}/>
              </div>
            </div>
            {/* Performance Tasks */}
            <div style={{background:'var(--sur)',border:'1.5px solid var(--bdr3)',padding:'14px'}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,fontWeight:700,color:'var(--violet)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:10}}>Performance Tasks (50%)</div>
              <div className="fg" style={{marginBottom:8}}>
                <label>Percent Score (0–100)</label>
                <input className="fi" type="number" min="0" max="100"
                  value={editGrade.performanceTasks?.percent||0}
                  onChange={e=>setField('performanceTasks.percent', Number(e.target.value))}/>
              </div>
            </div>
            {/* Quarterly Assessment */}
            <div style={{background:'var(--sur)',border:'1.5px solid var(--bdr3)',padding:'14px'}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,fontWeight:700,color:'var(--sky)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:10}}>Quarterly Assessment (25%)</div>
              <div className="fg" style={{marginBottom:8}}>
                <label>Percent Score (0–100)</label>
                <input className="fi" type="number" min="0" max="100"
                  value={editGrade.quarterlyAssessment?.percent||0}
                  onChange={e=>setField('quarterlyAssessment.percent', Number(e.target.value))}/>
              </div>
            </div>
          </div>

          <div className="fg" style={{marginTop:14}}>
            <label>Teacher / Encoder</label>
            <input className="fi" value={editGrade.teacher||''} onChange={e=>setField('teacher',e.target.value)}/>
          </div>
        </Modal>
      )}

      {/* ── Batch Grade Entry Modal ── */}
      {modal === 'batch' && (
        <Modal title={`Batch Grade Entry — ${Q_LABELS[quarter]} · ${strand} · ${subject}`}
          onClose={()=>setModal(null)} wide
          footer={<><button className="btn btno" onClick={()=>setModal(null)}>{batchResult?'Close':'Cancel'}</button>{!batchResult&&<button className="btn btnp" onClick={saveBatch} disabled={saving}>{saving?'Saving…':'Save All Grades'}</button>}</>}>
          {err && <div className="errmsg" style={{marginBottom:12}}>{err}</div>}

          {batchResult ? (
            <div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16}}>
                {[['Saved',batchResult.saved,'var(--green)'],['Errors',batchResult.errors?.length||0,'var(--rose)'],['Total',batchResult.total,'var(--teal)']].map(([l,v,c])=>(
                  <div key={l} style={{padding:'14px',background:'var(--sur)',border:'1.5px solid var(--bdr3)',textAlign:'center'}}>
                    <div style={{fontFamily:"'Fraunces',serif",fontSize:28,fontWeight:900,color:c}}>{v}</div>
                    <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.1em',marginTop:4}}>{l}</div>
                  </div>
                ))}
              </div>
              {batchResult.errors?.length > 0 && (
                <div style={{maxHeight:120,overflowY:'auto',background:'var(--rosep)',padding:'10px 14px',border:'1px solid rgba(184,38,74,.2)'}}>
                  {batchResult.errors.map((e,i)=><div key={i} style={{fontSize:12,color:'var(--rose)'}}><strong>{e.name}</strong>: {e.error}</div>)}
                </div>
              )}
            </div>
          ) : (
            <>
              <div style={{marginBottom:14,padding:'10px 14px',background:'var(--sur)',border:'1px solid var(--bdr2)',fontSize:13,color:'var(--ink3)'}}>
                Enter transmuted grades (75–100) for each student. Leave blank to skip. The system will save all filled entries at once.
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,maxHeight:400,overflowY:'auto',paddingRight:4}}>
                {rows.map(s => {
                  const g = getStudentGrade(s);
                  const val = batchGrades[s._id];
                  const num = Number(val);
                  return (
                    <div key={s._id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'var(--sur)',border:`1.5px solid ${val!==''&&val!==undefined?gradeColor(num):'var(--bdr3)'}`,transition:'border-color .2s'}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,fontSize:13,color:'var(--ink)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.name}</div>
                        <div style={{fontSize:11,color:'var(--ink4)'}}>{s.section||s.grade}</div>
                      </div>
                      <input type="number" min="60" max="100"
                        placeholder={g?.transmutedGrade || '—'}
                        value={batchGrades[s._id] ?? ''}
                        onChange={e=>setBatchGrades(bg=>({...bg,[s._id]:e.target.value}))}
                        style={{width:68,padding:'6px 8px',border:'1.5px solid var(--bdr3)',fontFamily:"'Space Mono',monospace",fontSize:15,fontWeight:700,textAlign:'center',color:val!==''&&val!==undefined?gradeColor(num):'var(--ink)',background:'var(--canvas)',outline:'none'}}/>
                      {val!==''&&val!==undefined&&<span style={{fontSize:10,color:gradeColor(num),fontWeight:700,minWidth:28}}>{gradeDesc(num).split(' ')[0]}</span>}
                    </div>
                  );
                })}
              </div>
              <div style={{marginTop:12,padding:'10px 14px',background:'var(--amberp)',border:'1px solid rgba(176,90,14,.2)',fontSize:12,color:'var(--amber)',fontFamily:"'Space Mono',monospace"}}>
                {rows.filter(s=>batchGrades[s._id]!==''&&batchGrades[s._id]!==undefined).length} of {rows.length} students filled
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

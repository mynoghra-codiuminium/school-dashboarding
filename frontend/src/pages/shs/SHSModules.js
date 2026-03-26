import { useState, useEffect, useCallback } from 'react';
import api from '../../api';
import { Icon, Spinner, Modal, StatusBadge, getInitials, getAvatarColor, formatDate } from '../../components/UI';

// ─── Shared hook ──────────────────────────────────────────────────────────────
function useStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading]  = useState(true);
  useEffect(() => {
    api.get('/students', { params: { limit: 200 } })
      .then(({ data }) => setStudents(data.students || data || []))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, []);
  return { students, loading };
}

// ─── Clearance System ─────────────────────────────────────────────────────────
const CLEARANCE_ITEMS = ['Mathematics','Science','English','Filipino','PE & Health','Library','Finance','Guidance','Registrar'];

export function ClearanceSystem() {
  const { students, loading } = useStudents();
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState(null);
  const [clearance, setClearance] = useState({});

  const toggle = (studentId, item) => {
    setClearance(c => ({
      ...c,
      [studentId]: { ...(c[studentId] || {}), [item]: !(c[studentId] || {})[item] },
    }));
  };

  const getStatus = (studentId) => {
    const c = clearance[studentId] || {};
    const cleared = CLEARANCE_ITEMS.filter(i => c[i]).length;
    if (cleared === CLEARANCE_ITEMS.length) return 'Cleared';
    if (cleared > 0) return 'Partial';
    return 'Pending';
  };

  const rows = students.filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:11,fontWeight:700,color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:4}}>SHS · Clearance</div>
        <div style={{fontSize:22,fontWeight:800,color:'var(--ink)'}}>Clearance System</div>
      </div>
      <div style={{display:'flex',gap:10,marginBottom:16,alignItems:'center'}}>
        <div className="tsearch" style={{flex:1,maxWidth:320}}>
          <Icon name="search" size={15}/>
          <input placeholder="Search student…" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <span style={{fontSize:12.5,color:'var(--ink4)'}}>{rows.length} students</span>
      </div>
      <div className="card">
        <div className="ch"><div><div className="ct">Clearance Records</div><div className="cs">{rows.length} students</div></div></div>
        <div className="tw">
          {loading ? <div style={{padding:40,textAlign:'center'}}><Spinner/></div> : (
            <table className="tbl">
              <thead><tr><th>Student</th><th>Strand</th><th>Progress</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {rows.slice(0,25).map((s, i) => {
                  const c       = clearance[s._id] || {};
                  const cleared = CLEARANCE_ITEMS.filter(item => c[item]).length;
                  const pct     = Math.round((cleared / CLEARANCE_ITEMS.length) * 100);
                  const status  = getStatus(s._id);
                  return (
                    <tr key={s._id} style={{animation:`fadeUp .35s ${i*35}ms both`}}>
                      <td>
                        <div className="uc">
                          <div className="av" style={{background:getAvatarColor(s.name),width:32,height:32,fontSize:11,borderRadius:4,color:'var(--canvas)'}}>{getInitials(s.name)}</div>
                          <div><div className="un">{s.name}</div><div className="us">{s.grade}</div></div>
                        </div>
                      </td>
                      <td><span className="tag tb">{s.strand || '—'}</span></td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{width:80,height:5,background:'var(--sur2)',borderRadius:4,overflow:'hidden'}}>
                            <div style={{height:'100%',width:`${pct}%`,borderRadius:4,background:pct===100?'var(--green)':pct>0?'var(--amber)':'transparent',transition:'width .7s'}}/>
                          </div>
                          <span style={{fontSize:11.5,color:'var(--ink3)',fontFamily:"'Space Mono',monospace"}}>{cleared}/{CLEARANCE_ITEMS.length}</span>
                        </div>
                      </td>
                      <td><StatusBadge status={status}/></td>
                      <td><button className="btn btno bsm" onClick={() => setSelected(s)}>Manage</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!loading && !rows.length && <div className="empty"><div className="empty-t">No students found</div></div>}
        </div>
      </div>

      {selected && (
        <Modal title={`Clearance — ${selected.name}`} onClose={() => setSelected(null)}
          footer={<button className="btn btno" onClick={() => setSelected(null)}>Close</button>}>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {CLEARANCE_ITEMS.map(item => {
              const done = (clearance[selected._id] || {})[item] || false;
              return (
                <div key={item} onClick={() => toggle(selected._id, item)}
                  style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',
                    background:done?'rgba(35,107,60,.08)':'var(--sur)',
                    border:`1px solid ${done?'rgba(35,107,60,.25)':'var(--bdr)'}`,cursor:'pointer',transition:'all .2s'}}>
                  <span style={{fontWeight:600,color:done?'var(--green)':'var(--ink2)',fontSize:14}}>{item}</span>
                  <div style={{width:20,height:20,background:done?'var(--green)':'var(--sur2)',border:`1px solid ${done?'var(--green)':'var(--bdr)'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    {done && <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Work Immersion ───────────────────────────────────────────────────────────
// Hour targets configurable by teacher
const HOUR_OPTIONS = [80, 120, 160, 200, 240, 320, 480];
const ELIGIBLE_STRANDS = ['TVL','ABM','STEM','HUMSS','GAS'];

export function WorkImmersion() {
  const [records,   setRecords]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null); // 'add' | 'log' | 'config'
  const [selected,  setSelected]  = useState(null);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('All');
  const [err,       setErr]       = useState('');
  const [saving,    setSaving]    = useState(false);

  // Global config — teacher sets required hours for each strand
  const [config, setConfig] = useState({
    STEM: 80, ABM: 80, HUMSS: 80, GAS: 80, TVL: 240,
  });
  const [configDraft, setConfigDraft] = useState(null);

  // Form for adding new immersion record
  const EMPTY_FORM = { studentName:'', strand:'TVL', gradeLevel:'Grade 12', schoolYear:'2025-2026', company:'', address:'', supervisor:'', supervisorContact:'', startDate:'', endDate:'', requiredHours:240, remarks:'' };
  const [form, setForm] = useState(EMPTY_FORM);

  // Log entry form
  const [logForm, setLogForm] = useState({ date:'', hours:8, task:'' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/shs/immersions');
      setRecords(Array.isArray(data) ? data : []);
    } catch { setRecords([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setErr(''); setModal('add');
  };

  const saveRecord = async () => {
    if (!form.studentName.trim()) { setErr('Student name is required'); return; }
    if (!form.company.trim())     { setErr('Company / partner is required'); return; }
    setSaving(true); setErr('');
    try {
      const payload = { ...form, requiredHours: Number(form.requiredHours) || config[form.strand] || 80 };
      const { data } = await api.post('/shs/immersions', payload);
      setRecords(r => [data, ...r]);
      setModal(null);
    } catch (e) { setErr(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const addLog = async () => {
    if (!logForm.date)             { setErr('Date is required'); return; }
    if (!logForm.hours || logForm.hours <= 0) { setErr('Hours must be > 0'); return; }
    if (!logForm.task.trim())      { setErr('Task description is required'); return; }
    setSaving(true); setErr('');
    try {
      const { data } = await api.post(`/shs/immersions/${selected._id}/log`, {
        date: logForm.date, hours: Number(logForm.hours), task: logForm.task,
      });
      setRecords(r => r.map(rec => rec._id === data._id ? data : rec));
      setSelected(data);
      setLogForm({ date:'', hours:8, task:'' });
      setErr('');
    } catch (e) { setErr(e.response?.data?.message || 'Failed to add log'); }
    finally { setSaving(false); }
  };

  const deleteRecord = async (id) => {
    if (!window.confirm('Delete this immersion record?')) return;
    try {
      await api.delete(`/shs/immersions/${id}`);
      setRecords(r => r.filter(rec => rec._id !== id));
    } catch { setErr('Delete failed'); }
  };

  const saveConfig = () => {
    setConfig(configDraft);
    setModal(null);
  };

  const F = k => ({ value: form[k] ?? '', onChange: e => setForm(f => ({...f,[k]:e.target.value})) });

  const rows = records.filter(r => {
    const matchSearch = !search || r.studentName?.toLowerCase().includes(search.toLowerCase()) || r.company?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || r.status === filter;
    return matchSearch && matchFilter;
  });

  const STATUS_COL = { Ongoing:'var(--amber)', Completed:'var(--green)', Incomplete:'var(--rose)', Withdrawn:'var(--ink4)' };

  return (
    <div>
      {/* Header */}
      <div style={{marginBottom:20,display:'flex',alignItems:'flex-end',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:4}}>SHS · Work Immersion</div>
          <div style={{fontSize:22,fontWeight:800,color:'var(--ink)'}}>Work Immersion Monitoring</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btno bsm" onClick={() => { setConfigDraft({...config}); setModal('config'); }}>
            <Icon name="settings" size={14}/> Configure Hours
          </button>
          <button className="btn btnp bsm" onClick={openAdd}>
            <Icon name="plus" size={14}/> Add Record
          </button>
        </div>
      </div>

      {/* Hour config banner */}
      <div className="card" style={{marginBottom:16,padding:'12px 18px'}}>
        <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,fontWeight:700,color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.12em'}}>Required Hours by Strand:</span>
          {Object.entries(config).map(([strand, hrs]) => (
            <div key={strand} style={{display:'flex',alignItems:'center',gap:6}}>
              <span className="tag tb">{strand}</span>
              <span style={{fontFamily:"'Space Mono',monospace",fontSize:12,fontWeight:700,color:'var(--ink)'}}>{hrs}h</span>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        <div className="tsearch" style={{flex:1,maxWidth:300}}>
          <Icon name="search" size={15}/>
          <input placeholder="Search student or company…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        {['All','Ongoing','Completed','Incomplete'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{padding:'5px 12px',border:'1.5px solid var(--bdr3)',cursor:'pointer',fontSize:12,fontWeight:600,transition:'all .15s',
              background:filter===s?'var(--sur2)':'transparent',
              color:filter===s?'var(--ink)':'var(--ink3)',
              borderColor:filter===s?'var(--ink)':'var(--bdr3)',
            }}>{s}</button>
        ))}
        <span style={{marginLeft:'auto',fontFamily:"'Space Mono',monospace",fontSize:11,color:'var(--ink4)'}}>{rows.length} records</span>
      </div>

      {err && <div className="errmsg" style={{marginBottom:12}}>{err}</div>}

      {/* Table */}
      <div className="card">
        <div className="tw">
          {loading ? <div style={{padding:40,textAlign:'center'}}><Spinner/></div> : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Student</th><th>Strand</th><th>Company / Partner</th>
                  <th>Hours Rendered</th><th>Progress</th><th>Status</th><th style={{textAlign:'right'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const pct = Math.min(100, Math.round((r.renderedHours / (r.requiredHours || 1)) * 100));
                  return (
                    <tr key={r._id} style={{animation:`fadeUp .35s ${i*35}ms both`}}>
                      <td>
                        <div className="uc">
                          <div className="av" style={{background:getAvatarColor(r.studentName),width:32,height:32,fontSize:11,borderRadius:4,color:'var(--canvas)'}}>{getInitials(r.studentName)}</div>
                          <div><div className="un">{r.studentName}</div><div className="us">{r.gradeLevel} · {r.schoolYear}</div></div>
                        </div>
                      </td>
                      <td><span className="tag tb">{r.strand}</span></td>
                      <td style={{color:'var(--ink2)',fontSize:13}}>
                        <div style={{fontWeight:600}}>{r.company}</div>
                        {r.supervisor && <div style={{fontSize:11,color:'var(--ink4)',marginTop:1}}>Supervisor: {r.supervisor}</div>}
                      </td>
                      <td>
                        <span style={{fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700,color:STATUS_COL[r.status]||'var(--ink)'}}>
                          {r.renderedHours}
                          <span style={{color:'var(--ink4)',fontWeight:400}}>/{r.requiredHours}h</span>
                        </span>
                      </td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{width:70,height:5,background:'var(--sur2)',borderRadius:4,overflow:'hidden'}}>
                            <div style={{height:'100%',width:`${pct}%`,borderRadius:4,background:pct>=100?'var(--green)':'var(--amber)',transition:'width .7s'}}/>
                          </div>
                          <span style={{fontSize:11,color:'var(--ink3)',fontFamily:"'Space Mono',monospace"}}>{pct}%</span>
                        </div>
                      </td>
                      <td><StatusBadge status={r.status}/></td>
                      <td>
                        <div style={{display:'flex',gap:5,justifyContent:'flex-end'}}>
                          <button className="btn btno bsm" onClick={() => { setSelected(r); setLogForm({date:'',hours:8,task:''}); setErr(''); setModal('log'); }}>
                            + Log Hours
                          </button>
                          <button className="btn btno bsm bico" onClick={() => deleteRecord(r._id)}><Icon name="trash" size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!loading && !rows.length && (
            <div className="empty">
              <div className="empty-ico"><Icon name="user" size={24}/></div>
              <div className="empty-t">No immersion records yet</div>
              <div className="empty-s">Click "Add Record" to enroll a student in Work Immersion</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Record Modal ── */}
      {modal === 'add' && (
        <Modal title="Add Work Immersion Record" onClose={() => setModal(null)} wide
          footer={<><button className="btn btno" onClick={() => setModal(null)}>Cancel</button><button className="btn btnp" onClick={saveRecord} disabled={saving}>{saving?'Saving…':'Save Record'}</button></>}>
          {err && <div className="errmsg" style={{marginBottom:12}}>{err}</div>}
          <div className="fgrid">
            <div className="fg fg-full"><label>Student Name *</label><input className="fi" {...F('studentName')} placeholder="Full name"/></div>
            <div className="fg">
              <label>Strand *</label>
              <select className="fsel" {...F('strand')} onChange={e => setForm(f => ({...f, strand:e.target.value, requiredHours: config[e.target.value] || 80}))}>
                {ELIGIBLE_STRANDS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="fg">
              <label>Grade Level</label>
              <select className="fsel" {...F('gradeLevel')}><option>Grade 11</option><option>Grade 12</option></select>
            </div>
            <div className="fg fg-full"><label>Company / Partner Establishment *</label><input className="fi" {...F('company')} placeholder="e.g. SM Corporation, DOST"/></div>
            <div className="fg fg-full"><label>Company Address</label><input className="fi" {...F('address')} placeholder="Full address"/></div>
            <div className="fg"><label>Supervisor Name</label><input className="fi" {...F('supervisor')} placeholder="Immediate supervisor"/></div>
            <div className="fg"><label>Supervisor Contact</label><input className="fi" {...F('supervisorContact')} placeholder="Phone or email"/></div>
            <div className="fg"><label>Start Date</label><input className="fi" type="date" {...F('startDate')}/></div>
            <div className="fg"><label>End Date</label><input className="fi" type="date" {...F('endDate')}/></div>
            <div className="fg">
              <label>Required Hours *</label>
              <select className="fsel" value={form.requiredHours} onChange={e => setForm(f => ({...f, requiredHours: Number(e.target.value)}))}>
                {HOUR_OPTIONS.map(h => <option key={h} value={h}>{h} hours</option>)}
              </select>
            </div>
            <div className="fg"><label>School Year</label><input className="fi" {...F('schoolYear')} placeholder="2025-2026"/></div>
            <div className="fg fg-full"><label>Remarks</label><textarea className="fta" rows={2} {...F('remarks')} placeholder="Optional notes"/></div>
          </div>
        </Modal>
      )}

      {/* ── Log Hours Modal ── */}
      {modal === 'log' && selected && (
        <Modal title={`Log Hours — ${selected.studentName}`} onClose={() => setModal(null)} wide
          footer={<button className="btn btno" onClick={() => setModal(null)}>Close</button>}>
          {err && <div className="errmsg" style={{marginBottom:12}}>{err}</div>}

          {/* Progress summary */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:20}}>
            {[
              ['Rendered', selected.renderedHours + 'h', 'var(--teal)'],
              ['Required', selected.requiredHours + 'h', 'var(--amber)'],
              ['Remaining', Math.max(0, selected.requiredHours - selected.renderedHours) + 'h', 'var(--rose)'],
            ].map(([l,v,c]) => (
              <div key={l} style={{padding:'12px',background:'var(--sur)',border:'1.5px solid var(--bdr3)',textAlign:'center'}}>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:20,fontWeight:800,color:c}}>{v}</div>
                <div style={{fontSize:10,color:'var(--ink4)',marginTop:3,fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em'}}>{l}</div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{marginBottom:20}}>
            <div style={{height:8,background:'var(--sur2)',overflow:'hidden',marginBottom:6}}>
              <div style={{height:'100%',width:`${Math.min(100,Math.round((selected.renderedHours/selected.requiredHours)*100))}%`,background:'var(--teal)',transition:'width .7s'}}/>
            </div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:'var(--ink4)',textAlign:'right'}}>
              {Math.min(100,Math.round((selected.renderedHours/selected.requiredHours)*100))}% complete
            </div>
          </div>

          {/* Add new log entry */}
          <div style={{padding:'14px 16px',background:'var(--sur)',border:'1.5px solid var(--bdr3)',marginBottom:18}}>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,fontWeight:700,color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.12em',marginBottom:12}}>Add Daily Log Entry</div>
            <div className="fgrid">
              <div className="fg"><label>Date *</label><input className="fi" type="date" value={logForm.date} onChange={e=>setLogForm(f=>({...f,date:e.target.value}))}/></div>
              <div className="fg">
                <label>Hours Rendered *</label>
                <select className="fsel" value={logForm.hours} onChange={e=>setLogForm(f=>({...f,hours:Number(e.target.value)}))}>
                  {[1,2,3,4,5,6,7,8,9,10,12].map(h=><option key={h} value={h}>{h} {h===1?'hour':'hours'}</option>)}
                </select>
              </div>
              <div className="fg fg-full"><label>Task / Activities *</label><textarea className="fta" rows={2} value={logForm.task} onChange={e=>setLogForm(f=>({...f,task:e.target.value}))} placeholder="Describe what the student did today…"/></div>
            </div>
            <button className="btn btnp bsm" style={{marginTop:10}} onClick={addLog} disabled={saving}>
              {saving ? 'Saving…' : '+ Add Log Entry'}
            </button>
          </div>

          {/* Existing logs */}
          <div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,fontWeight:700,color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.12em',marginBottom:10}}>
              Daily Log History ({selected.logs?.length || 0} entries)
            </div>
            {(selected.logs || []).length === 0 ? (
              <div style={{padding:'20px',textAlign:'center',color:'var(--ink4)',fontSize:13}}>No log entries yet</div>
            ) : (
              <table className="tbl">
                <thead><tr><th>Date</th><th>Hours</th><th>Tasks / Activities</th></tr></thead>
                <tbody>
                  {[...(selected.logs||[])].reverse().map((log, i) => (
                    <tr key={i}>
                      <td style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:'var(--ink3)',whiteSpace:'nowrap'}}>{formatDate(log.date)}</td>
                      <td>
                        <span style={{fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700,color:'var(--teal)'}}>+{log.hours}h</span>
                      </td>
                      <td style={{fontSize:13,color:'var(--ink2)'}}>{log.task}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Modal>
      )}

      {/* ── Configure Hours Modal ── */}
      {modal === 'config' && configDraft && (
        <Modal title="Configure Required Hours by Strand" onClose={() => setModal(null)}
          footer={<><button className="btn btno" onClick={() => setModal(null)}>Cancel</button><button className="btn btnp" onClick={saveConfig}>Save Configuration</button></>}>
          <div style={{marginBottom:16,padding:'10px 14px',background:'var(--sur)',border:'1px solid var(--bdr2)',fontSize:13,color:'var(--ink3)',lineHeight:1.6}}>
            Set the required number of immersion hours per strand. This will be the default for new records. Teachers can also override per-student when adding a record.
          </div>
          <div className="fgrid">
            {Object.entries(configDraft).map(([strand, hrs]) => (
              <div key={strand} className="fg">
                <label>{strand} Strand</label>
                <select className="fsel" value={hrs} onChange={e => setConfigDraft(d => ({...d,[strand]:Number(e.target.value)}))}>
                  {HOUR_OPTIONS.map(h => <option key={h} value={h}>{h} hours</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{marginTop:14,padding:'10px 14px',background:'var(--amberp)',border:'1px solid rgba(176,90,14,.2)',fontSize:12,color:'var(--amber)',fontFamily:"'Space Mono',monospace"}}>
            Note: DepEd K–12 standard is 80 hrs for Academic strands, 240 hrs for TVL
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Behavior Log ─────────────────────────────────────────────────────────────
const INCIDENT_TYPES = ['Tardiness','Absences','Dress Code','Disruption','Bullying','Vandalism','Cheating','Misconduct','Positive Behavior','Award/Recognition'];

const INITIAL_INCIDENTS = [
  { id:1, student:'Maria Santos',  grade:'Grade 11', strand:'STEM',  type:'Tardiness',        date:'2026-03-10', severity:'Minor',    action:'Verbal Warning',     resolved:true  },
  { id:2, student:'Carlos Reyes',  grade:'Grade 12', strand:'ABM',   type:'Dress Code',        date:'2026-03-12', severity:'Minor',    action:'Written Notice',     resolved:true  },
  { id:3, student:'Ana Dela Cruz', grade:'Grade 11', strand:'HUMSS', type:'Disruption',        date:'2026-03-14', severity:'Moderate', action:'Parent Conference',  resolved:false },
  { id:4, student:'Jose Garcia',   grade:'Grade 12', strand:'TVL',   type:'Absences',          date:'2026-03-15', severity:'Moderate', action:'Counseling Session', resolved:false },
  { id:5, student:'Rosa Aquino',   grade:'Grade 11', strand:'STEM',  type:'Award/Recognition', date:'2026-03-18', severity:'Positive', action:'Recognition',        resolved:true  },
  { id:6, student:'Miguel Torres', grade:'Grade 12', strand:'GAS',   type:'Positive Behavior', date:'2026-03-20', severity:'Positive', action:'Certificate',        resolved:true  },
];

const SEV_COLOR = { Minor:'var(--amber)', Moderate:'var(--orange)', Severe:'var(--rose)', Positive:'var(--green)' };

export function BehaviorLog() {
  const [incidents, setIncidents] = useState(INITIAL_INCIDENTS);
  const [modal, setModal]   = useState(false);
  const [filter, setFilter] = useState('All');
  const [form, setForm]     = useState({ student:'', grade:'Grade 11', strand:'STEM', type:'Tardiness', date:'', severity:'Minor', action:'', notes:'' });

  const save = () => {
    setIncidents(inc => [{ ...form, id: Date.now(), resolved: false }, ...inc]);
    setModal(false);
    setForm({ student:'', grade:'Grade 11', strand:'STEM', type:'Tardiness', date:'', severity:'Minor', action:'', notes:'' });
  };

  const toggleResolve = (id) => setIncidents(inc => inc.map(i => i.id === id ? { ...i, resolved: !i.resolved } : i));
  const rows = filter === 'All' ? incidents : incidents.filter(i => i.severity === filter);
  const F = k => ({ value: form[k] || '', onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  return (
    <div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:11,fontWeight:700,color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:4}}>SHS · Behavior</div>
        <div style={{fontSize:22,fontWeight:800,color:'var(--ink)'}}>Behavior & Incident Log</div>
      </div>
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',gap:6}}>
          {['All','Positive','Minor','Moderate','Severe'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{padding:'5px 12px',border:'1.5px solid var(--bdr3)',cursor:'pointer',fontSize:12.5,fontWeight:600,transition:'all .15s',
                background:filter===f?'var(--sur2)':'transparent',
                color:filter===f?'var(--ink)':'var(--ink3)',
                borderColor:filter===f?'var(--ink)':'var(--bdr3)',
              }}>{f}</button>
          ))}
        </div>
        <button className="btn btnp bsm" onClick={() => setModal(true)}><Icon name="plus" size={14}/> Log Incident</button>
      </div>
      <div className="card">
        <div className="tw">
          <table className="tbl">
            <thead><tr><th>Student</th><th>Incident Type</th><th>Date</th><th>Severity</th><th>Action Taken</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((inc, i) => (
                <tr key={inc.id} style={{animation:`fadeUp .35s ${i*40}ms both`}}>
                  <td>
                    <div style={{fontWeight:600,color:'var(--ink)',fontSize:13.5}}>{inc.student}</div>
                    <div style={{fontSize:11.5,color:'var(--ink4)'}}>{inc.grade} · {inc.strand}</div>
                  </td>
                  <td style={{color:'var(--ink2)',fontSize:13}}>{inc.type}</td>
                  <td style={{fontSize:12,color:'var(--ink4)',fontFamily:"'Space Mono',monospace"}}>{inc.date}</td>
                  <td>
                    <span style={{fontSize:12,fontWeight:600,color:SEV_COLOR[inc.severity]||'var(--ink3)',background:`${SEV_COLOR[inc.severity]||'var(--ink3)'}18`,padding:'2px 8px',borderRadius:4}}>
                      {inc.severity}
                    </span>
                  </td>
                  <td style={{color:'var(--ink3)',fontSize:13}}>{inc.action}</td>
                  <td>
                    <button onClick={() => toggleResolve(inc.id)}
                      style={{fontSize:12,fontWeight:600,padding:'3px 10px',border:'1px solid',cursor:'pointer',
                        background:inc.resolved?'rgba(35,107,60,.1)':'var(--sur)',
                        color:inc.resolved?'var(--green)':'var(--ink4)',
                        borderColor:inc.resolved?'rgba(35,107,60,.3)':'var(--bdr3)',
                        transition:'all .2s',
                      }}>
                      {inc.resolved ? '✓ Resolved' : 'Pending'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <div className="empty"><div className="empty-t">No incidents recorded</div></div>}
        </div>
      </div>

      {modal && (
        <Modal title="Log Incident" onClose={() => setModal(false)}
          footer={<><button className="btn btno" onClick={() => setModal(false)}>Cancel</button><button className="btn btnp" onClick={save}>Save Incident</button></>}>
          <div className="fgrid">
            <div className="fg fg-full"><label>Student Name *</label><input className="fi" {...F('student')} placeholder="Full name"/></div>
            <div className="fg"><label>Grade</label><select className="fsel" {...F('grade')}><option>Grade 11</option><option>Grade 12</option></select></div>
            <div className="fg"><label>Strand</label><select className="fsel" {...F('strand')}>{['STEM','ABM','HUMSS','GAS','TVL'].map(s=><option key={s}>{s}</option>)}</select></div>
            <div className="fg"><label>Incident Type</label><select className="fsel" {...F('type')}>{INCIDENT_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
            <div className="fg"><label>Date *</label><input className="fi" type="date" {...F('date')}/></div>
            <div className="fg"><label>Severity</label><select className="fsel" {...F('severity')}>{['Minor','Moderate','Severe','Positive'].map(s=><option key={s}>{s}</option>)}</select></div>
            <div className="fg"><label>Action Taken</label><input className="fi" {...F('action')} placeholder="e.g. Verbal Warning"/></div>
            <div className="fg fg-full"><label>Notes</label><textarea className="fta" rows={2} {...F('notes')} placeholder="Additional details…"/></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { Icon, Spinner, Modal, StatusBadge, getInitials, getAvatarColor } from '../../components/UI';

const DEPARTMENTS = ['library','finance','guidance','registrar','laboratory','clinic','pe','studentAffairs'];
const DEPT_LABELS = {
  library:'Library', finance:'Finance', guidance:'Guidance', registrar:'Registrar',
  laboratory:'Laboratory', clinic:'Clinic / Health', pe:'PE Office', studentAffairs:'Student Affairs',
};
const DEPT_ICONS = {
  library:'subjects', finance:'fees', guidance:'user', registrar:'report',
  laboratory:'exams', clinic:'alert', pe:'trend', studentAffairs:'announce',
};

function deptStatus(rec) {
  if (!rec?.departments) return 'Not Started';
  const depts = Object.values(rec.departments);
  const cleared = depts.filter(d=>d.cleared).length;
  if (cleared === depts.length) return 'Cleared';
  if (cleared > 0) return 'In Progress';
  return 'Not Started';
}

export default function ClearanceManagement() {
  const { user } = useAuth();
  const isAdmin   = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const isStaff   = user?.role === 'staff';
  const canApprove = isAdmin || isTeacher || isStaff;

  const [records,  setRecords]  = useState([]);
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('All');
  const [selected, setSelected] = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState('');
  const [batchDept,   setBatchDept]   = useState('library');
  const [batchModal,  setBatchModal]  = useState(false);
  const [batchResult, setBatchResult] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [schoolYear,  setSchoolYear]  = useState('2025-2026');
  const [semester,    setSemester]    = useState('1st Semester');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, stuRes] = await Promise.all([
        api.get('/shs/clearances', { params: { schoolYear, semester } }),
        api.get('/students', { params: { limit: 300 } }),
      ]);
      setRecords(Array.isArray(recRes.data) ? recRes.data : []);
      setStudents((stuRes.data?.students || stuRes.data || []).filter(s => s.status === 'Active'));
    } catch { setRecords([]); setStudents([]); }
    finally { setLoading(false); }
  }, [schoolYear, semester]);

  useEffect(() => { load(); }, [load]);

  // Create clearance record for student
  const createRecord = async (student) => {
    setSaving(true); setErr('');
    try {
      const { data } = await api.post('/shs/clearances', {
        studentId:  student._id,
        studentName: student.name,
        strand:     student.strand || '',
        gradeLevel: student.gradeLevel || student.grade || '',
        schoolYear, semester,
      });
      setRecords(r => [data, ...r]);
    } catch (e) { setErr(e.response?.data?.message || 'Failed to create record'); }
    finally { setSaving(false); }
  };

  // Toggle single department clearance
  const toggleDept = async (recordId, dept, currentVal) => {
    setSaving(true); setErr('');
    try {
      const update = {};
      update[`departments.${dept}.cleared`]   = !currentVal;
      update[`departments.${dept}.clearedBy`] = user?.name || '';
      update[`departments.${dept}.date`]       = new Date().toISOString();
      const { data } = await api.put(`/shs/clearances/${recordId}`, update);
      setRecords(r => r.map(rec => rec._id === recordId ? data : rec));
      if (selected?._id === recordId) setSelected(data);
    } catch (e) { setErr(e.response?.data?.message || 'Update failed'); }
    finally { setSaving(false); }
  };

  // Batch approve department for selected students
  const runBatch = async () => {
    if (!selectedIds.size) { setErr('Select at least one student'); return; }
    setSaving(true); setErr(''); setBatchResult(null);
    try {
      const { data } = await api.post('/shs/clearances/batch', {
        studentIds: [...selectedIds],
        department: batchDept,
        cleared: true,
        clearedBy: user?.name || '',
      });
      setBatchResult(data);
      load();
    } catch (e) { setErr(e.response?.data?.message || 'Batch update failed'); }
    finally { setSaving(false); }
  };

  const toggleSelect = (id) => setSelectedIds(ids => {
    const copy = new Set(ids);
    copy.has(id) ? copy.delete(id) : copy.add(id);
    return copy;
  });
  const selectAll = () => setSelectedIds(new Set(rows.map(r => r._id)));
  const clearSel  = () => setSelectedIds(new Set());

  // Map students without records
  const recordMap = Object.fromEntries(records.map(r => [r.studentId?.toString() || r.studentName, r]));
  const getRecord = (s) => recordMap[s._id?.toString()] || recordMap[s.name];

  const allRows = students.map(s => ({ student: s, record: getRecord(s) }));
  const rows = allRows.filter(({ student, record }) => {
    const status = record ? deptStatus(record) : 'Not Started';
    const matchFilter = filter === 'All' || status === filter;
    const matchSearch = !search || student.name?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const stats = {
    cleared:    allRows.filter(r => r.record && deptStatus(r.record) === 'Cleared').length,
    inProgress: allRows.filter(r => r.record && deptStatus(r.record) === 'In Progress').length,
    notStarted: allRows.filter(r => !r.record || deptStatus(r.record) === 'Not Started').length,
  };

  return (
    <div>
      <div style={{marginBottom:20,display:'flex',alignItems:'flex-end',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:4}}>SHS · Clearance</div>
          <div style={{fontSize:22,fontWeight:800,color:'var(--ink)'}}>Clearance Management</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btno bsm" onClick={()=>{setBatchResult(null);setErr('');setBatchModal(true);}}>
            <Icon name="check" size={14}/> Batch Approve Dept
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16}}>
        {[['Fully Cleared', stats.cleared, 'var(--green)'],['In Progress', stats.inProgress, 'var(--amber)'],['Not Started', stats.notStarted, 'var(--rose)']].map(([l,v,c])=>(
          <div key={l} className="card" style={{padding:'14px 18px',cursor:'pointer'}} onClick={()=>setFilter(l==='Fully Cleared'?'Cleared':l==='In Progress'?'In Progress':'Not Started')}>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:28,fontWeight:900,color:c}}>{v}</div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,fontWeight:700,color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.1em',marginTop:4}}>{l}</div>
          </div>
        ))}
      </div>

      {/* School year / semester filters */}
      <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <div className="fg" style={{minWidth:130}}>
          <label style={{fontSize:10,fontWeight:700,color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.08em',display:'block',marginBottom:4}}>School Year</label>
          <input className="fi" value={schoolYear} onChange={e=>setSchoolYear(e.target.value)} style={{padding:'6px 10px'}}/>
        </div>
        <div className="fg" style={{minWidth:150}}>
          <label style={{fontSize:10,fontWeight:700,color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.08em',display:'block',marginBottom:4}}>Semester</label>
          <select className="fsel" value={semester} onChange={e=>setSemester(e.target.value)}>
            <option>1st Semester</option><option>2nd Semester</option>
          </select>
        </div>
        <div className="tsearch" style={{flex:1,maxWidth:280}}>
          <Icon name="search" size={15}/>
          <input placeholder="Search student…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        {['All','Cleared','In Progress','Not Started'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{padding:'5px 12px',border:'1.5px solid var(--bdr3)',cursor:'pointer',fontSize:12,fontWeight:600,transition:'all .15s',
              background:filter===f?'var(--sur2)':'transparent',color:filter===f?'var(--ink)':'var(--ink3)',borderColor:filter===f?'var(--ink)':'var(--bdr3)'}}>
            {f}
          </button>
        ))}
        {selectedIds.size > 0 && (
          <button className="btn btno bsm" onClick={clearSel}>{selectedIds.size} selected · Clear</button>
        )}
        <button className="btn btno bsm" onClick={selectAll}>Select All</button>
      </div>

      {err && <div className="errmsg" style={{marginBottom:12}}>{err}</div>}

      {/* Table */}
      <div className="card">
        <div className="tw">
          {loading ? <div style={{padding:40,textAlign:'center'}}><Spinner/></div> : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{width:32}}><input type="checkbox" onChange={e=>e.target.checked?selectAll():clearSel()} checked={selectedIds.size===rows.length&&rows.length>0}/></th>
                  <th>Student</th>
                  <th>Strand</th>
                  {DEPARTMENTS.slice(0,5).map(d=><th key={d} style={{textAlign:'center',fontSize:11}}>{DEPT_LABELS[d]}</th>)}
                  <th style={{textAlign:'center'}}>Status</th>
                  <th style={{textAlign:'right'}}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ student: s, record: rec }, i) => {
                  const status = rec ? deptStatus(rec) : 'Not Started';
                  return (
                    <tr key={s._id} style={{animation:`fadeUp .3s ${i*30}ms both`,background:selectedIds.has(s._id)?'var(--sur2)':'transparent'}}>
                      <td><input type="checkbox" checked={selectedIds.has(s._id)} onChange={()=>toggleSelect(s._id)}/></td>
                      <td>
                        <div className="uc">
                          <div className="av" style={{background:getAvatarColor(s.name),width:30,height:30,fontSize:10,borderRadius:3,color:'var(--canvas)'}}>{getInitials(s.name)}</div>
                          <div><div className="un">{s.name}</div><div className="us">{s.grade}</div></div>
                        </div>
                      </td>
                      <td><span className="tag tb">{s.strand||'—'}</span></td>
                      {DEPARTMENTS.slice(0,5).map(d=>{
                        const dept = rec?.departments?.[d];
                        return (
                          <td key={d} style={{textAlign:'center'}}>
                            {rec ? (
                              <button
                                onClick={()=>canApprove&&toggleDept(rec._id, d, dept?.cleared)}
                                style={{width:28,height:28,background:dept?.cleared?'var(--green)':'var(--sur2)',border:`1.5px solid ${dept?.cleared?'var(--green)':'var(--bdr3)'}`,cursor:canApprove?'pointer':'default',display:'inline-flex',alignItems:'center',justifyContent:'center',transition:'all .2s'}}
                                title={dept?.cleared?`Cleared by ${dept.clearedBy||'?'}`:'Not cleared'}>
                                {dept?.cleared && <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>}
                              </button>
                            ) : <span style={{color:'var(--bdr3)',fontSize:11}}>—</span>}
                          </td>
                        );
                      })}
                      <td style={{textAlign:'center'}}><StatusBadge status={status}/></td>
                      <td style={{textAlign:'right'}}>
                        {rec
                          ? <button className="btn btno bsm" onClick={()=>{setSelected(rec);setErr('');}}>View All</button>
                          : <button className="btn btnp bsm" onClick={()=>createRecord(s)} disabled={saving}>+ Create</button>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!loading && !rows.length && <div className="empty"><div className="empty-t">No students found</div></div>}
        </div>
      </div>

      {/* Full clearance detail modal */}
      {selected && (
        <Modal title={`Clearance — ${selected.studentName}`} onClose={()=>setSelected(null)} wide
          footer={<button className="btn btno" onClick={()=>setSelected(null)}>Close</button>}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {DEPARTMENTS.map(d=>{
              const dept = selected.departments?.[d];
              return (
                <div key={d} onClick={()=>canApprove&&toggleDept(selected._id, d, dept?.cleared)}
                  style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',
                    background:dept?.cleared?'rgba(35,107,60,.08)':'var(--sur)',
                    border:`1.5px solid ${dept?.cleared?'rgba(35,107,60,.25)':'var(--bdr3)'}`,
                    cursor:canApprove?'pointer':'default',transition:'all .2s'}}>
                  <div style={{width:32,height:32,background:dept?.cleared?'var(--green)':'var(--sur2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:dept?.cleared?'white':'var(--ink4)'}}>
                    {dept?.cleared
                      ? <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
                      : <Icon name={DEPT_ICONS[d]} size={14}/>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13,color:dept?.cleared?'var(--green)':'var(--ink2)'}}>{DEPT_LABELS[d]}</div>
                    {dept?.cleared && <div style={{fontSize:10.5,color:'var(--ink4)',marginTop:1}}>by {dept.clearedBy||'—'} · {dept.date?new Date(dept.date).toLocaleDateString():''}</div>}
                  </div>
                  <span style={{fontSize:11,fontWeight:700,color:dept?.cleared?'var(--green)':'var(--ink4)'}}>{dept?.cleared?'CLEARED':'PENDING'}</span>
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {/* Batch Approve Modal */}
      {batchModal && (
        <Modal title="Batch Approve Clearance Department" onClose={()=>setBatchModal(false)}
          footer={<><button className="btn btno" onClick={()=>setBatchModal(false)}>{batchResult?'Close':'Cancel'}</button>{!batchResult&&<button className="btn btnp" onClick={runBatch} disabled={saving}>{saving?'Processing…':'Approve Selected'}</button>}</>}>
          {err && <div className="errmsg" style={{marginBottom:12}}>{err}</div>}

          {batchResult ? (
            <div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
                {[['Updated',batchResult.updated,'var(--green)'],['Errors',batchResult.errors?.length||0,'var(--rose)']].map(([l,v,c])=>(
                  <div key={l} style={{padding:'14px',background:'var(--sur)',border:'1.5px solid var(--bdr3)',textAlign:'center'}}>
                    <div style={{fontFamily:"'Fraunces',serif",fontSize:28,fontWeight:900,color:c}}>{v}</div>
                    <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.1em',marginTop:4}}>{l}</div>
                  </div>
                ))}
              </div>
              {batchResult.errors?.length > 0 && (
                <div style={{maxHeight:100,overflowY:'auto',background:'var(--rosep)',padding:'8px 12px',border:'1px solid rgba(184,38,74,.2)'}}>
                  {batchResult.errors.map((e,i)=><div key={i} style={{fontSize:12,color:'var(--rose)'}}>{e.error}</div>)}
                </div>
              )}
            </div>
          ) : (
            <>
              <div style={{marginBottom:14}}>
                <label style={{fontFamily:"'Space Mono',monospace",fontSize:9,fontWeight:700,color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.1em',display:'block',marginBottom:6}}>Department to Approve</label>
                <select className="fsel" value={batchDept} onChange={e=>setBatchDept(e.target.value)}>
                  {DEPARTMENTS.map(d=><option key={d} value={d}>{DEPT_LABELS[d]}</option>)}
                </select>
              </div>
              <div style={{padding:'12px 14px',background:'var(--sur)',border:'1.5px solid var(--bdr3)',marginBottom:14}}>
                <div style={{fontWeight:700,fontSize:13,color:'var(--ink)',marginBottom:6}}>
                  Selected students: <span style={{color:'var(--teal)'}}>{selectedIds.size}</span>
                </div>
                {selectedIds.size === 0
                  ? <div style={{fontSize:12.5,color:'var(--rose)'}}>No students selected. Close this modal and check the boxes in the table first.</div>
                  : <div style={{fontSize:12.5,color:'var(--ink3)',lineHeight:1.6}}>Will mark <strong>{DEPT_LABELS[batchDept]}</strong> as cleared for all {selectedIds.size} selected students who have existing clearance records.</div>
                }
              </div>
              <div style={{padding:'10px 14px',background:'var(--amberp)',border:'1px solid rgba(176,90,14,.2)',fontSize:12,color:'var(--amber)',fontFamily:"'Space Mono',monospace"}}>
                ⚠ Students without clearance records will be skipped — create their records first.
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

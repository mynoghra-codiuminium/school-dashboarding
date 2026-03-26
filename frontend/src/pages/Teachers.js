import { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { Icon, StatusBadge, Spinner, Modal, getInitials, getAvatarColor, formatDate } from '../components/UI';

const SUBJECTS = [
  'Mathematics','Science','English','Filipino','Social Studies','PE','TLE','MAPEH','Values Ed',
  'Research','Oral Communication','Reading & Writing','Statistics','General Biology','Pre-Calculus',
  'Basic Calculus','Business Math','Fundamentals of ABM','Oral Communication','Work Immersion',
  'Computer Programming','Philippine Politics & Governance','Creative Writing','Earth & Life Science',
];
const STATUSES = ['Active','On Leave','Inactive'];

const EMPTY = { name:'',email:'',phone:'',subject:'',qualification:'',experience:'',salary:'',status:'Active',gender:'',dob:'' };

const TMPL_HEADERS = ['Name *','Email *','Phone','Subject *','Qualification','Experience','Salary','Status (Active/On Leave/Inactive)','Gender (Male/Female/Other)','Date of Birth (YYYY-MM-DD)'];
const SAMPLE_ROWS  = [
  ['Maria Santos','m.santos@school.edu','09171234501','General Biology','M.Sc Biology','10 years','38000','Active','Female','1985-03-15'],
  ['Juan dela Cruz','j.delacruz@school.edu','09171234502','Business Math','MBA','8 years','35000','Active','Male','1987-07-22'],
];

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([TMPL_HEADERS, ...SAMPLE_ROWS]);
  ws['!cols'] = TMPL_HEADERS.map(()=>({wch:22}));
  XLSX.utils.book_append_sheet(wb, ws, 'Teachers');
  XLSX.writeFile(wb, 'EduSys_Teachers_Template.xlsx');
}

function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target.result, { type:'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval:'' });
        const teachers = rows.map((row, idx) => {
          const r = Object.fromEntries(Object.entries(row).map(([k,v])=>[k.toLowerCase().replace(/[^a-z]/g,''), String(v||'').trim()]));
          return {
            _row:   idx + 2,
            name:   r['name'] || '',
            email:  r['email'] || '',
            phone:  r['phone'] || '',
            subject:r['subject'] || '',
            qualification: r['qualification'] || '',
            experience:    r['experience'] || '',
            salary: r['salary'] ? Number(r['salary']) : 0,
            status: r['status'] || 'Active',
            gender: r['gender'] || '',
            dob:    r['dateofbirth'] || r['dob'] || '',
            _valid: !!(r['name'] && r['email'] && r['subject']),
            _error: !r['name']?'Name required':!r['email']?'Email required':!r['subject']?'Subject required':'',
          };
        }).filter(r=>r.name||r.email);
        resolve(teachers);
      } catch(e) { reject(e); }
    };
    reader.readAsArrayBuffer(file);
  });
}

export default function Teachers() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'staff';

  const [teachers, setTeachers] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [modal,    setModal]    = useState(null); // 'add'|'edit'|'batch'
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState('');
  const [del,      setDel]      = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');

  // Batch import state
  const [batchStep,    setBatchStep]    = useState(1);
  const [batchRecords, setBatchRecords] = useState([]);
  const [batchResult,  setBatchResult]  = useState(null);
  const [dragOver,     setDragOver]     = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/teachers', { params: { search } });
      setTeachers(Array.isArray(data) ? data : []);
    } catch { setTeachers([]); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setErr(''); setModal('add'); };
  const openEdit = (t) => { setEditing(t._id); setForm({ ...t, salary:t.salary||'', dob:t.dob?t.dob.slice(0,10):'' }); setErr(''); setModal('edit'); };

  const save = async () => {
    if (!form.name.trim())    { setErr('Name is required'); return; }
    if (!form.email.trim())   { setErr('Email is required'); return; }
    if (!form.subject.trim()) { setErr('Subject is required'); return; }
    setSaving(true); setErr('');
    try {
      const payload = { ...form, salary: Number(form.salary)||0 };
      if (editing) {
        const { data } = await api.put(`/teachers/${editing}`, payload);
        setTeachers(ts => ts.map(t => t._id===editing ? data : t));
      } else {
        const { data } = await api.post('/teachers', payload);
        setTeachers(ts => [data, ...ts]);
      }
      setModal(null);
    } catch (e) { setErr(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    try { await api.delete(`/teachers/${del._id}`); setTeachers(ts => ts.filter(t => t._id !== del._id)); setDel(null); }
    catch { setErr('Delete failed'); }
  };

  const F = (k) => ({ value: form[k]||'', onChange: e => setForm(f => ({...f,[k]:e.target.value})) });

  // Batch import
  const handleFile = async (file) => {
    if (!file) return;
    try {
      const records = await parseExcelFile(file);
      setBatchRecords(records);
      setBatchStep(2);
    } catch (e) { setErr('Could not read file: ' + e.message); }
  };

  const submitBatch = async () => {
    const valid = batchRecords.filter(r => r._valid);
    if (!valid.length) { setErr('No valid records to import'); return; }
    setSaving(true); setErr('');
    try {
      const { data } = await api.post('/teachers/batch', valid.map(({ _row, _valid, _error, ...rest }) => rest));
      setBatchResult(data);
      setBatchStep(3);
      load();
    } catch (e) { setErr(e.response?.data?.message || 'Import failed'); }
    finally { setSaving(false); }
  };

  const closeBatch = () => { setModal(null); setBatchStep(1); setBatchRecords([]); setBatchResult(null); setErr(''); };

  const rows = teachers.filter(t => {
    const matchSearch = !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.subject?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusCounts = { All: teachers.length, ...STATUSES.reduce((a,s)=>({...a,[s]:teachers.filter(t=>t.status===s).length}),{}) };

  return (
    <div>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,gap:12,flexWrap:'wrap'}}>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {['All',...STATUSES].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)}
              style={{padding:'5px 12px',border:'1.5px solid var(--bdr3)',cursor:'pointer',fontSize:12,fontWeight:600,transition:'all .15s',
                background:filterStatus===s?'var(--sur2)':'transparent',color:filterStatus===s?'var(--ink)':'var(--ink3)',borderColor:filterStatus===s?'var(--ink)':'var(--bdr3)'}}>
              {s} <span style={{fontFamily:"'Space Mono',monospace",fontSize:10,opacity:.7}}>({statusCounts[s]||0})</span>
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <div style={{position:'relative',flex:1,minWidth:200}}>
            <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--ink4)',pointerEvents:'none'}}><Icon name="search" size={14}/></span>
            <input className="fi" style={{paddingLeft:34}} placeholder="Search teachers…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          {canEdit && (
            <>
              <button className="btn btno bsm" onClick={()=>{setBatchStep(1);setBatchRecords([]);setBatchResult(null);setErr('');setModal('batch');}}>
                <Icon name="upload" size={14}/> Batch Import
              </button>
              <button className="btn btnp bsm" onClick={openAdd}><Icon name="plus" size={14}/> Add Teacher</button>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="ch">
          <div><div className="ct">Teaching Staff</div><div className="cs">{rows.length} total</div></div>
          {canEdit && <button className="btn btno bsm" onClick={downloadTemplate}><Icon name="download" size={13}/> Template</button>}
        </div>
        <div className="tw">
          {loading ? <div style={{padding:40,textAlign:'center'}}><Spinner/></div> : (
            <table className="tbl">
              <thead><tr><th>Teacher</th><th>Subject</th><th>Qualification</th><th>Experience</th><th>Salary</th><th>Status</th><th>Joined</th>{canEdit&&<th style={{textAlign:'right'}}>Actions</th>}</tr></thead>
              <tbody>
                {rows.map((t,i)=>(
                  <tr key={t._id} style={{animation:`fadeUp .35s ${i*40}ms both`}}>
                    <td>
                      <div className="uc">
                        <div className="av" style={{background:getAvatarColor(t.name),width:36,height:36,fontSize:12,borderRadius:4,color:'var(--canvas)'}}>{getInitials(t.name)}</div>
                        <div><div className="un">{t.name}</div><div className="us">{t.email}</div></div>
                      </div>
                    </td>
                    <td><span className="tag tb">{t.subject}</span></td>
                    <td style={{color:'var(--ink3)',fontSize:13}}>{t.qualification||'—'}</td>
                    <td style={{color:'var(--ink3)',fontSize:13}}>{t.experience||'—'}</td>
                    <td style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:'var(--ink2)'}}>₱{(t.salary||0).toLocaleString()}</td>
                    <td><StatusBadge status={t.status}/></td>
                    <td style={{color:'var(--ink4)',fontSize:12,fontFamily:"'Space Mono',monospace"}}>{formatDate(t.joinDate)}</td>
                    {canEdit&&<td>
                      <div style={{display:'flex',gap:5,justifyContent:'flex-end'}}>
                        <button className="btn btno bsm bico" onClick={()=>openEdit(t)}><Icon name="edit" size={13}/></button>
                        <button className="btn btnx bsm bico" onClick={()=>setDel(t)}><Icon name="trash" size={13}/></button>
                      </div>
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && !rows.length && (
            <div className="empty"><div className="empty-ico"><Icon name="teachers" size={24}/></div><div className="empty-t">No teachers found</div><div className="empty-s">{canEdit ? 'Add teachers manually or batch import via Excel' : 'No teacher records yet'}</div></div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(modal==='add'||modal==='edit') && (
        <Modal title={editing ? 'Edit Teacher' : 'Add Teacher'} onClose={()=>setModal(null)}
          footer={<><button className="btn btno" onClick={()=>setModal(null)}>Cancel</button><button className="btn btnp" onClick={save} disabled={saving}>{saving?'Saving…':'Save Teacher'}</button></>}>
          {err && <div className="errmsg" style={{marginBottom:12}}>{err}</div>}
          <div className="fgrid">
            <div className="fg"><label>Full Name *</label><input className="fi" {...F('name')} placeholder="e.g. Maria Santos"/></div>
            <div className="fg"><label>Email *</label><input className="fi" type="email" {...F('email')} placeholder="teacher@school.ph"/></div>
            <div className="fg"><label>Phone</label><input className="fi" {...F('phone')} placeholder="+63 9XX XXX XXXX"/></div>
            <div className="fg">
              <label>Subject *</label>
              <select className="fsel" {...F('subject')}><option value="">Select subject</option>{SUBJECTS.map(s=><option key={s}>{s}</option>)}</select>
            </div>
            <div className="fg"><label>Qualification</label><input className="fi" {...F('qualification')} placeholder="e.g. BSED Mathematics"/></div>
            <div className="fg"><label>Experience</label><input className="fi" {...F('experience')} placeholder="e.g. 5 years"/></div>
            <div className="fg"><label>Salary (₱)</label><input className="fi" type="number" {...F('salary')} placeholder="0"/></div>
            <div className="fg">
              <label>Status</label>
              <select className="fsel" {...F('status')}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select>
            </div>
            <div className="fg">
              <label>Gender</label>
              <select className="fsel" {...F('gender')}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select>
            </div>
            <div className="fg"><label>Date of Birth</label><input className="fi" type="date" {...F('dob')}/></div>
          </div>
        </Modal>
      )}

      {/* Batch Import Modal */}
      {modal === 'batch' && (
        <Modal title="Batch Import Teachers" onClose={closeBatch} wide
          footer={
            batchStep===1 ? <button className="btn btno" onClick={closeBatch}>Cancel</button> :
            batchStep===2 ? <><button className="btn btno" onClick={()=>setBatchStep(1)}>Back</button><button className="btn btnp" onClick={submitBatch} disabled={saving||!batchRecords.filter(r=>r._valid).length}>{saving?'Importing…':`Import ${batchRecords.filter(r=>r._valid).length} Teachers`}</button></> :
            <button className="btn btnp" onClick={closeBatch}>Done</button>
          }>
          {err && <div className="errmsg" style={{marginBottom:12}}>{err}</div>}

          {/* Step 1: Upload */}
          {batchStep===1&&(
            <div>
              <div style={{padding:'14px 16px',background:'var(--sur)',border:'1.5px solid var(--bdr3)',marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:'var(--ink)'}}>📥 Download Excel Template</div>
                  <div style={{fontSize:12.5,color:'var(--ink4)',marginTop:3}}>Pre-formatted with all required columns and sample data</div>
                </div>
                <button className="btn btno bsm" onClick={downloadTemplate}><Icon name="download" size={14}/> Template</button>
              </div>
              <div
                onDragOver={e=>{e.preventDefault();setDragOver(true);}}
                onDragLeave={()=>setDragOver(false)}
                onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f)handleFile(f);}}
                onClick={()=>fileRef.current?.click()}
                style={{border:`2px dashed ${dragOver?'var(--red)':'var(--bdr2)'}`,padding:'44px 24px',textAlign:'center',cursor:'pointer',transition:'all .2s',background:dragOver?'var(--sur2)':'transparent'}}>
                <div style={{fontSize:28,marginBottom:10}}>📂</div>
                <div style={{fontWeight:700,fontSize:15,color:'var(--ink)',marginBottom:4}}>Drop Excel file here or click to browse</div>
                <div style={{fontSize:12.5,color:'var(--ink4)'}}>.xlsx or .xls files only</div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={e=>e.target.files[0]&&handleFile(e.target.files[0])}/>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {batchStep===2&&(
            <div>
              <div style={{display:'flex',gap:10,marginBottom:14}}>
                <div style={{flex:1,padding:'10px 14px',background:'rgba(35,107,60,.08)',border:'1px solid rgba(35,107,60,.2)',textAlign:'center'}}>
                  <div style={{fontWeight:800,fontSize:22,color:'var(--green)'}}>{batchRecords.filter(r=>r._valid).length}</div>
                  <div style={{fontSize:11,color:'var(--green)',fontWeight:600}}>Ready</div>
                </div>
                {batchRecords.filter(r=>!r._valid).length>0&&(
                  <div style={{flex:1,padding:'10px 14px',background:'var(--rosep)',border:'1px solid rgba(184,38,74,.25)',textAlign:'center'}}>
                    <div style={{fontWeight:800,fontSize:22,color:'var(--rose)'}}>{batchRecords.filter(r=>!r._valid).length}</div>
                    <div style={{fontSize:11,color:'var(--rose)',fontWeight:600}}>Errors</div>
                  </div>
                )}
                <div style={{flex:1,padding:'10px 14px',background:'var(--sur)',border:'1.5px solid var(--bdr3)',textAlign:'center'}}>
                  <div style={{fontWeight:800,fontSize:22,color:'var(--ink)'}}>{batchRecords.length}</div>
                  <div style={{fontSize:11,color:'var(--ink4)',fontWeight:600}}>Total</div>
                </div>
              </div>
              <div className="tw" style={{maxHeight:320,overflowY:'auto'}}>
                <table className="tbl">
                  <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Subject</th><th>Status</th></tr></thead>
                  <tbody>
                    {batchRecords.map((rec,i)=>(
                      <tr key={i} style={{background:!rec._valid?'var(--rosep)':i%2===0?'transparent':'var(--sur2)'}}>
                        <td style={{fontSize:11,color:'var(--ink4)'}}>{rec._row}</td>
                        <td style={{fontWeight:600,color:rec._valid?'var(--ink)':'var(--rose)'}}>{rec.name||'—'}</td>
                        <td style={{fontSize:12,color:'var(--ink3)'}}>{rec.email||'—'}</td>
                        <td><span className="tag tb" style={{fontSize:10}}>{rec.subject||'—'}</span></td>
                        <td>{rec._valid ? <span style={{color:'var(--green)',fontSize:11,fontWeight:700}}>✓ Ready</span> : <span style={{color:'var(--rose)',fontSize:11}}>{rec._error}</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 3: Result */}
          {batchStep===3&&batchResult&&(
            <div>
              <div style={{display:'flex',gap:10,marginBottom:16,justifyContent:'center'}}>
                {[['Imported',batchResult.created,'var(--green)'],['Skipped (exists)',batchResult.skipped,'var(--amber)'],['Errors',batchResult.errors?.length||0,'var(--rose)']].map(([l,v,c])=>(
                  <div key={l} style={{padding:'16px 24px',background:'var(--sur)',border:'1.5px solid var(--bdr3)',textAlign:'center',minWidth:100}}>
                    <div style={{fontFamily:"'Fraunces',serif",fontSize:34,fontWeight:900,color:c}}>{v}</div>
                    <div style={{fontSize:11,color:'var(--ink4)',fontWeight:600,marginTop:3}}>{l}</div>
                  </div>
                ))}
              </div>
              {batchResult.errors?.length>0&&(
                <div style={{background:'var(--rosep)',padding:'10px 14px',border:'1px solid rgba(184,38,74,.2)',maxHeight:140,overflowY:'auto'}}>
                  {batchResult.errors.map((e,i)=><div key={i} style={{fontSize:12,color:'var(--rose)',padding:'3px 0'}}><strong>{e.name}</strong> — {e.error}</div>)}
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* Delete confirm */}
      {del && (
        <Modal title="Delete Teacher" onClose={()=>setDel(null)}
          footer={<><button className="btn btno" onClick={()=>setDel(null)}>Cancel</button><button className="btn btnx" onClick={remove}>Delete</button></>}>
          <p style={{color:'var(--ink2)',lineHeight:1.6}}>Delete <strong>{del.name}</strong>? This cannot be undone.</p>
        </Modal>
      )}
    </div>
  );
}

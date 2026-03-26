import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { Icon, StatusBadge, Spinner, Modal, formatDate } from '../components/UI';

const STATUSES = ['Scheduled','Upcoming','Completed','Cancelled'];
const SUBJECTS  = ['All Subjects','Mathematics','Science','English','Filipino','Social Studies','PE','TLE','MAPEH','Statistics','Research'];
const EMPTY = { name:'', class:'', subject:'All Subjects', date:'', endDate:'', totalMarks:100, passMarks:40, status:'Scheduled', description:'' };

export default function Exams() {
  const [exams, setExams]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]     = useState('');
  const [del, setDel]         = useState(null);
  const [filter, setFilter]   = useState('All');

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/exams'); setExams(data); }
    catch { setExams([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setErr(''); setModal(true); };
  const openEdit = (e) => { setEditing(e._id); setForm({ ...e, date: e.date?.slice(0,10)||'', endDate: e.endDate?.slice(0,10)||'' }); setErr(''); setModal(true); };

  const save = async () => {
    setSaving(true); setErr('');
    try {
      if (editing) { const { data } = await api.put(`/exams/${editing}`, form); setExams(es => es.map(e => e._id===editing ? data : e)); }
      else         { const { data } = await api.post('/exams', form);           setExams(es => [data, ...es]); }
      setModal(false);
    } catch (err) { setErr(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    try { await api.delete(`/exams/${del._id}`); setExams(es => es.filter(e => e._id !== del._id)); setDel(null); }
    catch { setErr('Delete failed'); }
  };

  const F = k => ({ value: form[k]??'', onChange: e => setForm(f=>({...f,[k]:e.target.value})) });

  const STATUS_COLORS = { Scheduled:'var(--amber)',Upcoming:'var(--teal)',Completed:'var(--green)',Cancelled:'var(--rose)' };
  const filtered = filter==='All' ? exams : exams.filter(e=>e.status===filter);

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,gap:12,flexWrap:'wrap'}}>
        <div style={{display:'flex',gap:8}}>
          {['All',...STATUSES].map(s=>(
            <button key={s} onClick={()=>setFilter(s)}
              style={{padding:'6px 14px',borderRadius:4,border:'1px solid var(--bdr)',cursor:'pointer',fontSize:13,fontWeight:600,transition:'all .15s',
                background: filter===s ? 'rgba(245,158,11,.15)' : 'transparent',
                color: filter===s ? 'var(--amber)' : 'var(--ink3)',
                borderColor: filter===s ? 'rgba(245,158,11,.3)' : 'var(--bdr)',
              }}>{s}</button>
          ))}
        </div>
        <button className="btn btnp bsm" onClick={openAdd}><Icon name="plus" size={14}/> Add Exam</button>
      </div>

      <div className="card">
        <div className="ch"><div><div className="ct">Examinations</div><div className="cs">{filtered.length} records</div></div></div>
        <div className="tw">
          {loading ? <div style={{padding:40,textAlign:'center'}}><Spinner/></div> : (
            <table className="tbl">
              <thead><tr><th>Exam Name</th><th>Class</th><th>Subject</th><th>Date</th><th>Marks</th><th>Status</th><th style={{textAlign:'right'}}>Actions</th></tr></thead>
              <tbody>
                {filtered.map((e,i)=>(
                  <tr key={e._id} style={{animation:`fadeUp .35s ${i*40}ms both`}}>
                    <td>
                      <div style={{fontWeight:600,color:'var(--ink)',fontSize:14}}>{e.name}</div>
                      {e.description && <div style={{fontSize:12,color:'var(--ink4)',marginTop:2}}>{e.description}</div>}
                    </td>
                    <td style={{color:'var(--ink3)',fontSize:13}}>{e.class||'All Classes'}</td>
                    <td><span className="tag tb">{e.subject}</span></td>
                    <td style={{color:'var(--ink3)',fontSize:12,fontFamily:"'Space Mono',monospace"}}>{formatDate(e.date)}</td>
                    <td>
                      <span style={{fontSize:13,color:'var(--ink2)',fontFamily:"'Space Mono',monospace"}}>
                        {e.passMarks}/{e.totalMarks}
                      </span>
                    </td>
                    <td><StatusBadge status={e.status}/></td>
                    <td>
                      <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                        <button className="btn btno bsm bico" onClick={()=>openEdit(e)}><Icon name="edit" size={14}/></button>
                        <button className="btn btno bsm bico" onClick={()=>setDel(e)} style={{color:'var(--rose)'}}><Icon name="trash" size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && !filtered.length && (
            <div className="empty"><div className="empty-ico"><Icon name="exams" size={24}/></div><div className="empty-t">No exams found</div><div className="empty-s">Schedule an exam to get started</div></div>
          )}
        </div>
      </div>

      {modal && (
        <Modal title={editing ? 'Edit Exam' : 'Add Exam'} onClose={()=>setModal(false)} footer={<><button className="btn btno" onClick={()=>setModal(false)}>Cancel</button><button className="btn btnp" onClick={save} disabled={saving}>{saving?'Saving…':'Save Exam'}</button></>}>
          <div className="fgrid">
            <div className="fg fg-full"><label>Exam Name *</label><input className="fi" {...F('name')} placeholder="e.g. 1st Quarter Examination"/></div>
            <div className="fg"><label>Class</label><input className="fi" {...F('class')} placeholder="e.g. Grade 11-STEM-A"/></div>
            <div className="fg">
              <label>Subject</label>
              <select className="fsel" {...F('subject')}>{SUBJECTS.map(s=><option key={s}>{s}</option>)}</select>
            </div>
            <div className="fg"><label>Date *</label><input className="fi" type="date" {...F('date')}/></div>
            <div className="fg"><label>End Date</label><input className="fi" type="date" {...F('endDate')}/></div>
            <div className="fg"><label>Total Marks</label><input className="fi" type="number" {...F('totalMarks')}/></div>
            <div className="fg"><label>Pass Marks</label><input className="fi" type="number" {...F('passMarks')}/></div>
            <div className="fg">
              <label>Status</label>
              <select className="fsel" {...F('status')}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select>
            </div>
            <div className="fg fg-full"><label>Description</label><textarea className="fta" rows={2} {...F('description')} placeholder="Optional notes"/></div>
          </div>
        </Modal>
      )}

      {del && (
        <Modal title="Delete Exam" onClose={()=>setDel(null)} footer={<><button className="btn btno" onClick={()=>setDel(null)}>Cancel</button><button className="btn btnx" onClick={remove}>Delete</button></>}>
          <p style={{color:'var(--ink2)',lineHeight:1.6}}>Delete <strong>{del.name}</strong>? This cannot be undone.</p>
        </Modal>
      )}
    </div>
  );
}

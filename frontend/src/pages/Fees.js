import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { Icon, Spinner, Modal, formatCurrency, formatDate } from '../components/UI';

const FEE_TYPES = ['Tuition','Miscellaneous','Laboratory','Library','Sports','Uniform','ID','Others'];
const STATUSES  = ['Pending','Partial','Paid','Overdue'];
const STRANDS   = ['STEM','ABM','HUMSS','GAS','TVL','Sports','Arts & Design'];
const GRADES    = ['Grade 11','Grade 12'];

const EMPTY = { student:'', grade:'', section:'', strand:'', type:'Tuition', amount:'', paid:'0', dueDate:'', notes:'' };

export default function Fees() {
  const [fees, setFees]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [del, setDel]         = useState(null);
  const [filter, setFilter]   = useState('All');
  const [search, setSearch]   = useState('');
  const [err, setErr]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/fees'); setFees(data); }
    catch { setFees([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setErr(''); setModal(true); };
  const openEdit = (f) => {
    setEditing(f._id);
    setForm({ ...f, dueDate: f.dueDate?.slice(0,10)||'', amount: f.amount||'', paid: f.paid||0 });
    setErr(''); setModal(true);
  };

  const save = async () => {
    if (!form.student.trim())        { setErr('Student name is required'); return; }
    if (!form.amount || Number(form.amount) <= 0) { setErr('Amount must be greater than 0'); return; }
    if (Number(form.paid) > Number(form.amount))  { setErr('Amount paid cannot exceed total amount'); return; }
    setSaving(true); setErr('');
    try {
      const payload = { ...form, amount: Number(form.amount), paid: Number(form.paid) };
      if (editing) { const { data } = await api.put(`/fees/${editing}`, payload); setFees(fs => fs.map(f => f._id===editing ? data : f)); }
      else         { const { data } = await api.post('/fees', payload);           setFees(fs => [data, ...fs]); }
      setModal(false);
    } catch (err) { setErr(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    try { await api.delete(`/fees/${del._id}`); setFees(fs => fs.filter(f => f._id !== del._id)); setDel(null); }
    catch { setErr('Delete failed'); }
  };

  const F = k => ({ value: form[k]??'', onChange: e => setForm(f => ({...f,[k]:e.target.value})) });

  const totals = fees.reduce((a,f) => ({
    collected: a.collected + (f.paid||0),
    due: a.due + (f.due||0),
    overdue: a.overdue + (f.status==='Overdue' ? f.due : 0),
  }), { collected:0, due:0, overdue:0 });

  const rows = fees.filter(f => {
    const matchFilter = filter==='All' || f.status===filter;
    const matchSearch = !search || f.student?.toLowerCase().includes(search.toLowerCase()) || f.strand?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const STATUS_DOT = { Paid:'var(--green)', Partial:'var(--amber)', Pending:'var(--ink4)', Overdue:'var(--rose)' };

  return (
    <div>
      {/* KPI summary */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
        {[
          { label:'Collected', val: formatCurrency(totals.collected), color:'var(--green)', icon:'fees' },
          { label:'Outstanding', val: formatCurrency(totals.due), color:'var(--amber)', icon:'report' },
          { label:'Overdue', val: formatCurrency(totals.overdue), color:'var(--rose)', icon:'alert' },
        ].map(k => (
          <div key={k.label} className="card" style={{padding:'16px 20px',display:'flex',alignItems:'center',gap:14}}>
            <div style={{width:40,height:40,borderRadius:10,background:`${k.color}18`,display:'flex',alignItems:'center',justifyContent:'center',color:k.color,flexShrink:0}}>
              <Icon name={k.icon} size={18}/>
            </div>
            <div>
              <div style={{fontSize:18,fontWeight:800,color:k.color,fontFamily:"'Space Mono',monospace"}}>{k.val}</div>
              <div style={{fontSize:11.5,color:'var(--ink4)',marginTop:2}}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,gap:10,flexWrap:'wrap'}}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {['All',...STATUSES].map(s=>(
            <button key={s} onClick={()=>setFilter(s)}
              style={{padding:'5px 12px',borderRadius:4,border:'1px solid var(--bdr)',cursor:'pointer',fontSize:12.5,fontWeight:600,transition:'all .15s',
                background: filter===s ? 'rgba(245,158,11,.15)':'transparent',
                color: filter===s ? 'var(--amber)':'var(--ink3)',
                borderColor: filter===s ? 'rgba(245,158,11,.3)':'var(--bdr)',
              }}>{s}</button>
          ))}
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <div className="tsearch"><Icon name="search" size={15}/><input placeholder="Search student…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <button className="btn btnp bsm" onClick={openAdd}><Icon name="plus" size={14}/> Add Fee</button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="ch"><div><div className="ct">Fee Records</div><div className="cs">{rows.length} records</div></div></div>
        <div className="tw">
          {loading ? <div style={{padding:40,textAlign:'center'}}><Spinner/></div> : (
            <table className="tbl">
              <thead><tr><th>Student</th><th>Type</th><th>Amount</th><th>Paid</th><th>Due</th><th>Due Date</th><th>Status</th><th style={{textAlign:'right'}}>Actions</th></tr></thead>
              <tbody>
                {rows.map((f,i) => (
                  <tr key={f._id} style={{animation:`fadeUp .35s ${i*35}ms both`}}>
                    <td>
                      <div style={{fontWeight:600,color:'var(--ink)',fontSize:13.5}}>{f.student}</div>
                      <div style={{fontSize:11.5,color:'var(--ink4)',marginTop:1}}>{f.grade} {f.strand && `· ${f.strand}`}</div>
                    </td>
                    <td><span className="tag tb">{f.type}</span></td>
                    <td style={{fontFamily:"'Space Mono',monospace",fontSize:13,color:'var(--ink2)'}}>{formatCurrency(f.amount)}</td>
                    <td style={{fontFamily:"'Space Mono',monospace",fontSize:13,color:'var(--green)'}}>{formatCurrency(f.paid)}</td>
                    <td style={{fontFamily:"'Space Mono',monospace",fontSize:13,color:f.due>0?'var(--rose)':'var(--ink4)'}}>{formatCurrency(f.due)}</td>
                    <td style={{fontSize:12,color:'var(--ink4)',fontFamily:"'Space Mono',monospace"}}>{formatDate(f.dueDate)}</td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <div style={{width:7,height:7,borderRadius:'50%',background:STATUS_DOT[f.status]||'var(--ink4)',flexShrink:0}}/>
                        <span style={{fontSize:12.5,color:'var(--ink2)',fontWeight:600}}>{f.status}</span>
                      </div>
                    </td>
                    <td>
                      <div className="tb-actions">
                        <button className="btn btno bsm bico" onClick={()=>openEdit(f)}><Icon name="edit" size={14}/></button>
                        <button className="btn btnx bsm bico" onClick={()=>setDel(f)}><Icon name="trash" size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && !rows.length && (
            <div className="empty"><div className="empty-ico"><Icon name="fees" size={24}/></div><div className="empty-t">No fee records</div><div className="empty-s">Add a fee record to get started</div></div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <Modal title={editing ? 'Edit Fee Record' : 'Add Fee Record'} onClose={()=>{setModal(false);setErr('');}}
          footer={<><button className="btn btno" onClick={()=>{setModal(false);setErr('');}}>Cancel</button><button className="btn btnp" onClick={save} disabled={saving}>{saving?'Saving…':'Save Record'}</button></>}>
          {err && <div className="errmsg" style={{marginBottom:12}}>{err}</div>}
          <div className="fgrid">
            <div className="fg fg-full"><label>Student Name *</label><input className="fi" {...F('student')} placeholder="Full name"/></div>
            <div className="fg">
              <label>Grade Level</label>
              <select className="fsel" {...F('grade')}><option value="">Select</option>{GRADES.map(g=><option key={g}>{g}</option>)}</select>
            </div>
            <div className="fg">
              <label>Strand</label>
              <select className="fsel" {...F('strand')}><option value="">Select</option>{STRANDS.map(s=><option key={s}>{s}</option>)}</select>
            </div>
            <div className="fg"><label>Section</label><input className="fi" {...F('section')} placeholder="e.g. 11-STEM-A"/></div>
            <div className="fg">
              <label>Fee Type</label>
              <select className="fsel" {...F('type')}>{FEE_TYPES.map(t=><option key={t}>{t}</option>)}</select>
            </div>
            <div className="fg"><label>Total Amount (₱) *</label><input className="fi" type="number" {...F('amount')} placeholder="0"/></div>
            <div className="fg"><label>Amount Paid (₱)</label><input className="fi" type="number" {...F('paid')} placeholder="0"/></div>
            <div className="fg"><label>Due Date</label><input className="fi" type="date" {...F('dueDate')}/></div>
            <div className="fg fg-full"><label>Notes</label><textarea className="fta" rows={2} {...F('notes')} placeholder="Optional notes"/></div>
          </div>
        </Modal>
      )}

      {del && (
        <Modal title="Delete Fee Record" onClose={()=>setDel(null)}
          footer={<><button className="btn btno" onClick={()=>setDel(null)}>Cancel</button><button className="btn btnx" onClick={remove}>Delete</button></>}>
          <p style={{color:'var(--ink2)',lineHeight:1.6}}>Delete fee record for <strong>{del.student}</strong>? This cannot be undone.</p>
        </Modal>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { Icon, Spinner, Modal } from '../components/UI';

const STRANDS   = ['Core','STEM','ABM','HUMSS','GAS','TVL','Sports','Arts & Design'];
const SEMESTERS = ['1st Semester','2nd Semester'];
const GRADE_LVL = ['Grade 11','Grade 12'];

const EMPTY = { name:'', code:'', strand:'Core', gradeLevel:'Grade 11', semester:'1st Semester', type:'Core', units:3, description:'' };

export default function Subjects() {
  const [subjects,  setSubjects]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const [saving,    setSaving]    = useState(false);
  const [del,       setDel]       = useState(null);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('All');
  const [err,       setErr]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Try SHS subjects endpoint first, fall back to mock
      const { data } = await api.get('/shs/subjects');
      setSubjects(Array.isArray(data) ? data : []);
    } catch {
      // Endpoint may not exist — show helpful empty state
      setSubjects([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setErr(''); setModal(true); };
  const openEdit = (s) => { setEditing(s._id); setForm({ ...EMPTY, ...s }); setErr(''); setModal(true); };

  const save = async () => {
    if (!form.name.trim()) { setErr('Subject name is required'); return; }
    setSaving(true); setErr('');
    try {
      const payload = {
        ...form,
        code: form.code.trim() || `${form.strand.replace(/[^A-Z]/gi,'').toUpperCase().slice(0,3)}_${form.name.replace(/\s+/g,'_').toUpperCase().slice(0,8)}`,
      };
      if (editing) {
        const { data } = await api.put(`/shs/subjects/${editing}`, payload);
        setSubjects(ss => ss.map(s => s._id === editing ? data : s));
      } else {
        const { data } = await api.post('/shs/subjects', payload);
        setSubjects(ss => [data, ...ss]);
      }
      setModal(false);
    } catch (e) { setErr(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    try {
      await api.delete(`/shs/subjects/${del._id}`);
      setSubjects(ss => ss.filter(s => s._id !== del._id));
      setDel(null);
    } catch { setErr('Delete failed'); }
  };

  const F = k => ({ value: form[k] ?? '', onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  const STRAND_COLOR = {
    Core:'var(--ink)', STEM:'var(--amber)', ABM:'var(--teal)', HUMSS:'var(--violet)',
    GAS:'var(--rose)', TVL:'var(--sky)', Sports:'var(--green)', 'Arts & Design':'var(--orange)',
  };

  const rows = subjects.filter(s => {
    const matchSearch = !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.code?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || s.strand === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div>
      {/* Controls */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <div className="tsearch" style={{ flex:1, maxWidth:300 }}>
          <Icon name="search" size={15}/>
          <input placeholder="Search subjects…" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {['All', ...STRANDS].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              style={{ padding:'5px 12px', borderRadius:4, border:'1.5px solid var(--bdr3)', cursor:'pointer', fontSize:12, fontWeight:600, transition:'all .15s',
                background: filter===s ? 'var(--sur2)' : 'transparent',
                color:      filter===s ? 'var(--ink)'  : 'var(--ink3)',
                borderColor:filter===s ? 'var(--ink)'  : 'var(--bdr3)',
              }}>{s}</button>
          ))}
        </div>
        <button className="btn btnp bsm" onClick={openAdd}><Icon name="plus" size={14}/> Add Subject</button>
      </div>

      {err && <div className="errmsg" style={{ marginBottom:14 }}>{err}</div>}

      {/* Table */}
      <div className="card">
        <div className="ch">
          <div><div className="ct">Subject Catalogue</div><div className="cs">{rows.length} subjects</div></div>
          <span className="tag tgr">{subjects.length} total</span>
        </div>
        <div className="tw">
          {loading ? (
            <div style={{ padding:40, textAlign:'center' }}><Spinner/></div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Subject Name</th>
                  <th>Code</th>
                  <th>Strand / Track</th>
                  <th>Grade Level</th>
                  <th>Units</th>
                  <th>Semester</th>
                  <th style={{ textAlign:'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s, i) => (
                  <tr key={s._id || i} style={{ animation:`fadeUp .35s ${i*35}ms both` }}>
                    <td>
                      <div style={{ fontWeight:600, color:'var(--ink)', fontSize:13.5 }}>{s.name}</div>
                      {s.description && <div style={{ fontSize:11.5, color:'var(--ink4)', marginTop:2 }}>{s.description}</div>}
                    </td>
                    <td>
                      <span style={{ fontFamily:"'Space Mono',monospace", fontSize:11.5, color:'var(--ink3)',
                        background:'var(--sur)', padding:'2px 8px', border:'1px solid var(--bdr2)' }}>
                        {s.code || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="tag" style={{ background:`${STRAND_COLOR[s.strand]||'var(--ink)'}14`,
                        color: STRAND_COLOR[s.strand]||'var(--ink)',
                        borderColor:`${STRAND_COLOR[s.strand]||'var(--ink)'}30` }}>
                        {s.strand || 'Core'}
                      </span>
                    </td>
                    <td style={{ fontSize:13, color:'var(--ink3)' }}>{s.gradeLevel || '—'}</td>
                    <td style={{ fontFamily:"'Space Mono',monospace", fontSize:13, color:'var(--ink2)' }}>{s.units ?? '—'}</td>
                    <td style={{ fontSize:12.5, color:'var(--ink3)' }}>{s.semester || '—'}</td>
                    <td>
                      <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                        <button className="btn btno bsm bico" onClick={() => openEdit(s)}><Icon name="edit" size={14}/></button>
                        <button className="btn btnx bsm bico" onClick={() => setDel(s)}><Icon name="trash" size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && !rows.length && (
            <div className="empty">
              <div className="empty-ico"><Icon name="subjects" size={24}/></div>
              <div className="empty-t">No subjects found</div>
              <div className="empty-s">{subjects.length === 0 ? 'Add subjects to build your curriculum' : 'Try a different search or filter'}</div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <Modal title={editing ? 'Edit Subject' : 'Add Subject'} onClose={() => setModal(false)}
          footer={<><button className="btn btno" onClick={() => setModal(false)}>Cancel</button><button className="btn btnp" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Subject'}</button></>}>
          {err && <div className="errmsg">{err}</div>}
          <div className="fgrid">
            <div className="fg fg-full"><label>Subject Name *</label><input className="fi" {...F('name')} placeholder="e.g. Pre-Calculus"/></div>
            <div className="fg"><label>Subject Code</label><input className="fi" {...F('code')} placeholder="e.g. STEM-PC11"/></div>
            <div className="fg"><label>Units</label><input className="fi" type="number" min="1" max="6" {...F('units')}/></div>
            <div className="fg">
              <label>Strand / Track</label>
              <select className="fsel" {...F('strand')}>{STRANDS.map(s => <option key={s}>{s}</option>)}</select>
            </div>
            <div className="fg">
              <label>Grade Level</label>
              <select className="fsel" {...F('gradeLevel')}>{GRADE_LVL.map(g => <option key={g}>{g}</option>)}</select>
            </div>
            <div className="fg">
              <label>Semester</label>
              <select className="fsel" {...F('semester')}>{SEMESTERS.map(s => <option key={s}>{s}</option>)}</select>
            </div>
            <div className="fg fg-full"><label>Description</label><textarea className="fta" rows={2} {...F('description')} placeholder="Optional description"/></div>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {del && (
        <Modal title="Delete Subject" onClose={() => setDel(null)}
          footer={<><button className="btn btno" onClick={() => setDel(null)}>Cancel</button><button className="btn btnx" onClick={remove}>Delete</button></>}>
          <p style={{ color:'var(--ink2)', lineHeight:1.6 }}>Delete <strong>{del.name}</strong>? This cannot be undone.</p>
        </Modal>
      )}
    </div>
  );
}

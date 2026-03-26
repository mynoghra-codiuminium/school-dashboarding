import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { Icon, Spinner, StatusBadge, Modal, getInitials, getAvatarColor } from '../components/UI';

const ROLES = ['admin','teacher','staff','student'];
const ROLE_COLOR = { admin:'var(--rose)', teacher:'var(--teal)', staff:'var(--amber)', student:'var(--violet)' };

export default function UserManagement() {
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null); // 'add'|'edit'|'bulk'
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState({ name:'', email:'', password:'', role:'staff', isActive:true });
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState('');
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('All');
  const [bulkResult, setBulkResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/auth/users'); setUsers(data); }
    catch { setUsers([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setForm({ name:'', email:'', password:'', role:'staff', isActive:true }); setEditing(null); setErr(''); setModal('add'); };
  const openEdit = (u) => { setForm({ name:u.name, email:u.email, password:'', role:u.role, isActive:u.isActive }); setEditing(u._id); setErr(''); setModal('edit'); };

  const save = async () => {
    if (!form.name.trim())  { setErr('Name is required'); return; }
    if (!form.email.trim()) { setErr('Email is required'); return; }
    if (!editing && form.password.length < 6) { setErr('Password must be at least 6 characters'); return; }
    setSaving(true); setErr('');
    try {
      if (editing) {
        const payload = { name:form.name, email:form.email, role:form.role, isActive:form.isActive };
        if (form.password) payload.password = form.password;
        const { data } = await api.put(`/auth/users/${editing}`, payload);
        setUsers(us => us.map(u => u._id===editing ? data : u));
      } else {
        const { data } = await api.post('/auth/register', form);
        setUsers(us => [data.user, ...us]);
      }
      setModal(null);
    } catch (e) { setErr(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this user account? This cannot be undone.')) return;
    try { await api.delete(`/auth/users/${id}`); setUsers(us => us.filter(u => u._id !== id)); }
    catch (e) { setErr(e.response?.data?.message || 'Delete failed'); }
  };

  const bulkCreateStudents = async () => {
    setSaving(true); setBulkResult(null);
    try {
      const { data } = await api.post('/auth/bulk-create-students');
      setBulkResult(data);
      load(); // refresh user list
    } catch (e) { setErr(e.response?.data?.message || 'Bulk creation failed'); }
    finally { setSaving(false); }
  };

  const F = k => ({ value: form[k] ?? '', onChange: e => setForm(f => ({...f,[k]:e.target.value})) });

  const rows = users.filter(u => {
    const matchSearch = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || u.role === filter;
    return matchSearch && matchFilter;
  });

  const roleCounts = ROLES.reduce((a, r) => ({ ...a, [r]: users.filter(u => u.role===r).length }), {});

  return (
    <div>
      <div style={{marginBottom:20,display:'flex',alignItems:'flex-end',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:4}}>System · Administration</div>
          <div style={{fontSize:22,fontWeight:800,color:'var(--ink)'}}>User Management</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btno bsm" onClick={() => { setErr(''); setBulkResult(null); setModal('bulk'); }}>
            <Icon name="students" size={14}/> Bulk Create Student Accounts
          </button>
          <button className="btn btnp bsm" onClick={openAdd}>
            <Icon name="plus" size={14}/> Add User
          </button>
        </div>
      </div>

      {/* Role summary */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20}}>
        {ROLES.map(r => (
          <div key={r} className="card" style={{padding:'14px 18px',cursor:'pointer',borderColor:filter===r?'var(--ink)':'var(--bdr3)'}}
            onClick={() => setFilter(filter===r?'All':r)}>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:26,fontWeight:900,color:ROLE_COLOR[r]}}>{roleCounts[r] || 0}</div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,fontWeight:700,color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.1em',marginTop:4}}>{r}s</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{display:'flex',gap:8,marginBottom:16,alignItems:'center'}}>
        <div className="tsearch" style={{flex:1,maxWidth:300}}>
          <Icon name="search" size={15}/>
          <input placeholder="Search name or email…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        {['All',...ROLES].map(r=>(
          <button key={r} onClick={()=>setFilter(r)}
            style={{padding:'5px 10px',border:'1.5px solid var(--bdr3)',cursor:'pointer',fontSize:11.5,fontWeight:600,transition:'all .15s',
              background:filter===r?'var(--sur2)':'transparent',color:filter===r?'var(--ink)':'var(--ink3)',borderColor:filter===r?'var(--ink)':'var(--bdr3)'}}>
            {r === 'All' ? 'All' : r.charAt(0).toUpperCase()+r.slice(1)}
          </button>
        ))}
        <span style={{marginLeft:'auto',fontFamily:"'Space Mono',monospace",fontSize:11,color:'var(--ink4)'}}>{rows.length} users</span>
      </div>

      {/* Table */}
      <div className="card">
        <div className="tw">
          {loading ? <div style={{padding:40,textAlign:'center'}}><Spinner/></div> : (
            <table className="tbl">
              <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Created</th><th style={{textAlign:'right'}}>Actions</th></tr></thead>
              <tbody>
                {rows.map((u,i) => (
                  <tr key={u._id} style={{animation:`fadeUp .35s ${i*30}ms both`}}>
                    <td>
                      <div className="uc">
                        <div className="av" style={{background:getAvatarColor(u.name),width:34,height:34,fontSize:11,borderRadius:4,color:'var(--canvas)'}}>{getInitials(u.name)}</div>
                        <div>
                          <div className="un">{u.name}</div>
                          <div className="us">{u.email}</div>
                          {u.mustChangePassword && <div style={{fontSize:10,color:'var(--amber)',fontWeight:700,marginTop:1}}>⚠ Must change password</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="tag" style={{background:`${ROLE_COLOR[u.role]}14`,color:ROLE_COLOR[u.role],borderColor:`${ROLE_COLOR[u.role]}30`}}>
                        {u.role}
                      </span>
                    </td>
                    <td><StatusBadge status={u.isActive ? 'Active' : 'Inactive'}/></td>
                    <td style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:'var(--ink4)'}}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{display:'flex',gap:5,justifyContent:'flex-end'}}>
                        <button className="btn btno bsm bico" onClick={() => openEdit(u)}><Icon name="edit" size={13}/></button>
                        <button className="btn btnx bsm bico" onClick={() => remove(u._id)}><Icon name="trash" size={13}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && !rows.length && (
            <div className="empty"><div className="empty-ico"><Icon name="user" size={24}/></div><div className="empty-t">No users found</div></div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(modal==='add'||modal==='edit') && (
        <Modal title={editing ? 'Edit User' : 'Add User'} onClose={()=>setModal(null)}
          footer={<><button className="btn btno" onClick={()=>setModal(null)}>Cancel</button><button className="btn btnp" onClick={save} disabled={saving}>{saving?'Saving…':'Save User'}</button></>}>
          {err && <div className="errmsg" style={{marginBottom:12}}>{err}</div>}
          <div className="fgrid">
            <div className="fg fg-full"><label>Full Name *</label><input className="fi" {...F('name')} placeholder="e.g. Maria Santos"/></div>
            <div className="fg"><label>Email *</label><input className="fi" type="email" {...F('email')} placeholder="user@school.edu"/></div>
            <div className="fg">
              <label>Role *</label>
              <select className="fsel" {...F('role')}>{ROLES.map(r=><option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}</select>
            </div>
            <div className="fg">
              <label>{editing ? 'New Password (leave blank to keep)' : 'Password *'}</label>
              <input className="fi" type="password" {...F('password')} placeholder={editing ? 'Leave blank to keep current' : 'Min 6 characters'}/>
            </div>
            <div className="fg">
              <label>Status</label>
              <select className="fsel" value={form.isActive ? 'active' : 'inactive'} onChange={e=>setForm(f=>({...f,isActive:e.target.value==='active'}))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Create Student Accounts Modal */}
      {modal === 'bulk' && (
        <Modal title="Bulk Create Student Accounts" onClose={()=>setModal(null)}
          footer={<><button className="btn btno" onClick={()=>setModal(null)}>Close</button>{!bulkResult && <button className="btn btnp" onClick={bulkCreateStudents} disabled={saving}>{saving?'Creating…':'Create Accounts'}</button>}</>}>
          {err && <div className="errmsg" style={{marginBottom:12}}>{err}</div>}
          {!bulkResult ? (
            <div>
              <div style={{padding:'14px',background:'var(--sur)',border:'1.5px solid var(--bdr3)',marginBottom:16,fontSize:13,color:'var(--ink2)',lineHeight:1.7}}>
                This will create login accounts for <strong>all active students</strong> who don't have one yet.
                <br/><br/>
                <strong>Default Password:</strong> Last 6 digits of LRN (or first 6 letters of name + "123")
                <br/>
                <strong>Students will be required to change their password on first login.</strong>
              </div>
              <div style={{padding:'10px 14px',background:'var(--amberp)',border:'1px solid rgba(176,90,14,.2)',fontSize:12,color:'var(--amber)',fontFamily:"'Space Mono',monospace"}}>
                ⚠ Students already with accounts will be skipped (not duplicated).
              </div>
            </div>
          ) : (
            <div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16}}>
                {[['Created', bulkResult.created, 'var(--green)'],['Skipped', bulkResult.skipped, 'var(--amber)'],['Errors', bulkResult.errors?.length||0, 'var(--rose)']].map(([l,v,c])=>(
                  <div key={l} style={{padding:'14px',background:'var(--sur)',border:'1.5px solid var(--bdr3)',textAlign:'center'}}>
                    <div style={{fontFamily:"'Fraunces',serif",fontSize:28,fontWeight:900,color:c}}>{v}</div>
                    <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.1em',marginTop:4}}>{l}</div>
                  </div>
                ))}
              </div>
              {bulkResult.errors?.length > 0 && (
                <div style={{maxHeight:160,overflowY:'auto',background:'var(--rosep)',border:'1px solid rgba(184,38,74,.2)',padding:'10px 14px'}}>
                  {bulkResult.errors.map((e,i)=><div key={i} style={{fontSize:12,color:'var(--rose)',padding:'3px 0'}}><strong>{e.name}</strong>: {e.error}</div>)}
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

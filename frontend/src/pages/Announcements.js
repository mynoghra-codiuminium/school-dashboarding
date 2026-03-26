import {useState,useEffect,useCallback} from 'react';
import api from '../api';
import {Icon,StatusBadge,Spinner,Modal,formatDate} from '../components/UI';
const E={title:'',message:'',author:'Admin',priority:'Normal',audience:'All'};
export default function Announcements(){
  const [rows,setRows]=useState([]);const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(false);const [form,setForm]=useState(E);
  const [saving,setSaving]=useState(false);const [err,setErr]=useState('');
  const load=useCallback(async()=>{try{setLoading(true);const {data}=await api.get('/announcements');setRows(data);}catch{setErr('Failed');}finally{setLoading(false);}},[ ]);
  useEffect(()=>{load();},[load]);
  const save=async()=>{setSaving(true);setErr('');try{await api.post('/announcements',form);setModal(false);load();}catch(e){setErr(e.response?.data?.message||'Save failed');}finally{setSaving(false);}};
  const del=async(id)=>{if(!window.confirm('Delete?'))return;try{await api.delete(`/announcements/${id}`);load();}catch{setErr('Failed');}};
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return(
    <div className="fu">
      <div className="toolbar"><div className="sp"/><button className="btn btnp" onClick={()=>{setForm(E);setModal(true);}}><Icon name="plus" size={15}/>New Announcement</button></div>
      {err&&<div className="errmsg" style={{marginBottom:14}}>{err}</div>}
      {loading?<Spinner/>:(
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {rows.map(a=>(
            <div key={a._id} className="card si" style={{padding:18}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,flexWrap:'wrap'}}>
                    <StatusBadge status={a.priority}/><span className="tag tgr">{a.audience}</span>
                    <span style={{fontSize:12,color:'var(--ink4)'}}>{formatDate(a.createdAt)} · {a.author}</span>
                  </div>
                  <div style={{fontWeight:700,fontSize:15,color:'var(--ink)',marginBottom:6}}>{a.title}</div>
                  <div style={{fontSize:13.5,color:'var(--ink3)',lineHeight:1.7}}>{a.message}</div>
                </div>
                <button className="btn btnx bsm bico" style={{marginLeft:14,flexShrink:0}} onClick={()=>del(a._id)}><Icon name="trash" size={14}/></button>
              </div>
            </div>
          ))}
          {rows.length===0&&<div className="empty"><div className="empty-ico"><Icon name="announce" size={24}/></div><div className="empty-t">No announcements yet</div></div>}
        </div>
      )}
      {modal&&(
        <Modal title="New Announcement" onClose={()=>setModal(false)} footer={<><button className="btn btno" onClick={()=>setModal(false)}>Cancel</button><button className="btn btnp" onClick={save} disabled={saving}>{saving?'Publishing…':'Publish'}</button></>}>
          {err&&<div className="errmsg">{err}</div>}
          <div className="fgrid">
            <div className="fg fg-full"><label>Title</label><input className="fi" value={form.title||''} onChange={e=>set('title',e.target.value)}/></div>
            <div className="fg fg-full"><label>Message</label><textarea className="fta" style={{minHeight:120}} value={form.message||''} onChange={e=>set('message',e.target.value)}/></div>
            <div className="fg"><label>Author</label><input className="fi" value={form.author||''} onChange={e=>set('author',e.target.value)}/></div>
            <div className="fg"><label>Priority</label><select className="fsel" value={form.priority} onChange={e=>set('priority',e.target.value)}><option>Normal</option><option>High</option><option>Low</option></select></div>
            <div className="fg"><label>Audience</label><select className="fsel" value={form.audience} onChange={e=>set('audience',e.target.value)}>{['All','Students','Teachers','Parents'].map(a=><option key={a}>{a}</option>)}</select></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

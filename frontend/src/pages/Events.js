import {useState,useEffect,useCallback} from 'react';
import api from '../api';
import {Icon,Spinner,Modal} from '../components/UI';
const E={title:'',date:'',time:'',venue:'',type:'Academic',description:''};
const TC={Sports:'#2563eb',Academic:'#059669',Meeting:'#7c3aed',Cultural:'#ea580c',Ceremony:'#d97706',Other:'#6b7280'};
export default function Events(){
  const [rows,setRows]=useState([]);const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(null);const [sel,setSel]=useState(null);const [form,setForm]=useState(E);
  const [saving,setSaving]=useState(false);const [err,setErr]=useState('');
  const load=useCallback(async()=>{try{setLoading(true);const {data}=await api.get('/events');setRows(data);}catch{setErr('Failed');}finally{setLoading(false);}},[ ]);
  useEffect(()=>{load();},[load]);
  const openAdd=()=>{setForm(E);setSel(null);setModal('form');};
  const openEdit=(e)=>{setForm({...e,date:e.date?.split('T')[0]||''});setSel(e);setModal('form');};
  const save=async()=>{setSaving(true);setErr('');try{if(sel)await api.put(`/events/${sel._id}`,form);else await api.post('/events',form);setModal(null);load();}catch(e){setErr(e.response?.data?.message||'Save failed');}finally{setSaving(false);}};
  const del=async(id)=>{if(!window.confirm('Delete?'))return;try{await api.delete(`/events/${id}`);load();}catch{setErr('Failed');}};
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return(
    <div className="fu">
      <div className="toolbar"><div className="sp"/><button className="btn btnp" onClick={openAdd}><Icon name="plus" size={15}/>Add Event</button></div>
      {err&&<div className="errmsg" style={{marginBottom:14}}>{err}</div>}
      {loading?<Spinner/>:(
        <div className="g2">{rows.map(ev=>{
          const d=new Date(ev.date);const c=TC[ev.type]||'#6b7280';
          return(
            <div key={ev._id} className="card si">
              <div style={{background:c,padding:'16px 18px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><div style={{color:'#fff',fontWeight:700,fontSize:16}}>{ev.title}</div><div style={{color:'var(--ink3)',fontSize:12.5,marginTop:3}}>{ev.type}</div></div>
                <div style={{textAlign:'right',color:'var(--ink)'}}><div style={{fontSize:28,fontWeight:800,lineHeight:1}}>{d.getDate()}</div><div style={{fontSize:12,fontWeight:600}}>{d.toLocaleString('en',{month:'short',year:'numeric'})}</div></div>
              </div>
              <div style={{padding:'14px 18px'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                  <div><div className="dlbl">Time</div><div className="dval">{ev.time||'—'}</div></div>
                  <div><div className="dlbl">Venue</div><div className="dval">{ev.venue||'—'}</div></div>
                </div>
                {ev.description&&<div style={{fontSize:13.5,color:'var(--ink3)',lineHeight:1.6,marginBottom:14}}>{ev.description}</div>}
                <div style={{display:'flex',gap:8}}>
                  <button className="btn btno bsm" style={{flex:1}} onClick={()=>openEdit(ev)}>Edit</button>
                  <button className="btn btnx bsm" onClick={()=>del(ev._id)}>Delete</button>
                </div>
              </div>
            </div>
          );
        })}
        {rows.length===0&&<div style={{gridColumn:'1/-1'}}><div className="empty"><div className="empty-ico"><Icon name="events" size={24}/></div><div className="empty-t">No events scheduled</div></div></div>}
        </div>
      )}
      {modal==='form'&&(
        <Modal title={sel?'Edit Event':'Add Event'} onClose={()=>setModal(null)} footer={<><button className="btn btno" onClick={()=>setModal(null)}>Cancel</button><button className="btn btnp" onClick={save} disabled={saving}>{saving?'Saving…':'Save'}</button></>}>
          {err&&<div className="errmsg">{err}</div>}
          <div className="fgrid">
            <div className="fg fg-full"><label>Event Title</label><input className="fi" value={form.title||''} onChange={e=>set('title',e.target.value)}/></div>
            {[['Date','date','date'],['Time','time','time'],['Venue','venue','text']].map(([l,k,t])=>(
              <div key={k} className="fg"><label>{l}</label><input className="fi" type={t} value={form[k]||''} onChange={e=>set(k,e.target.value)}/></div>
            ))}
            <div className="fg"><label>Type</label><select className="fsel" value={form.type} onChange={e=>set('type',e.target.value)}>{['Academic','Sports','Meeting','Cultural','Ceremony','Other'].map(t=><option key={t}>{t}</option>)}</select></div>
            <div className="fg fg-full"><label>Description</label><textarea className="fta" value={form.description||''} onChange={e=>set('description',e.target.value)}/></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

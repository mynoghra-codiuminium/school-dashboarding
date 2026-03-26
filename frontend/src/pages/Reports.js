import {useState,useEffect} from 'react';
import api from '../api';
import {Icon,StatusBadge,Spinner,getInitials,getAvatarColor,formatCurrency} from '../components/UI';
const BarChart=({data,color})=>{const max=Math.max(...data.map(d=>d.value),1);return(<div className="barchart">{data.map((d,i)=>(<div key={i} className="barcol"><div className="barval">{d.value}</div><div className="barfill" style={{height:`${(d.value/max)*90}%`,background:color||'var(--red)',opacity:.8}}/><div className="barlbl">{d.label}</div></div>))}</div>);};
export default function Reports(){
  const [stats,setStats]=useState(null);const [loading,setLoading]=useState(true);
  useEffect(()=>{api.get('/dashboard/stats').then(({data})=>{setStats(data);setLoading(false);}).catch(()=>setLoading(false));},[]);
  if(loading)return <Spinner/>;
  if(!stats)return <div className="errmsg">Failed to load</div>;
  const {students,teachers,fees,academics,recentStudents}=stats;
  const gd=[{label:'Grade 11',value:recentStudents?.filter(s=>s.grade?.toString().includes('11')).length||0},{label:'Grade 12',value:recentStudents?.filter(s=>s.grade?.toString().includes('12')).length||0}];
  return(
    <div className="fu">
      <div className="kpi-grid">
        {[[students.total,'Total Students','kb','students'],[`${academics.avgAttendance}%`,'Avg Attendance','kt','chart'],[academics.avgGPA,'Average GPA','kv','graduation'],[formatCurrency(fees.collected),'Fees Collected','kg','fees']].map(([v,l,k,ic])=>(
          <div key={l} className={`kpi ${k}`}><div className={`kpi-ico ${k}`}><Icon name={ic} size={20}/></div><div className="kpi-val">{v}</div><div className="kpi-lbl">{l}</div></div>
        ))}
      </div>
      <div className="g2 mb14">
        <div className="card"><div className="ch"><div className="ct">Enrollment by Grade</div></div><div className="cb"><BarChart data={gd} color="var(--violet)"/></div></div>
        <div className="card">
          <div className="ch"><div className="ct">Staff Overview</div></div>
          <div className="cb" style={{paddingTop:12}}>
            {(teachers?.active!==undefined?[['Total Staff',teachers.total],['Active',teachers.active],['On Leave',teachers.total-teachers.active]]:[]).map(([l,v])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid var(--bdr)'}}>
                <span style={{fontSize:13.5,color:'var(--ink2)'}}>{l}</span><span style={{fontWeight:700,fontSize:16,color:'var(--ink)'}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="card">
        <div className="ch"><div><div className="ct">Student Performance Report</div></div><button className="btn btno bsm" onClick={()=>window.print()}><Icon name="download" size={13}/>Print</button></div>
        <div className="tw"><table className="tbl">
          <thead><tr><th>Student</th><th>Grade</th><th>GPA</th><th>Attendance</th><th>Performance</th><th>Fee Status</th></tr></thead>
          <tbody>{(recentStudents||[]).map(s=>(
            <tr key={s._id}>
              <td><div className="uc"><div className="av" style={{background:getAvatarColor(s.name),width:32,height:32,fontSize:11,borderRadius:8}}>{getInitials(s.name)}</div><span style={{fontWeight:600}}>{s.name}</span></div></td>
              <td><span className="tag tb">{s.grade}</span></td>
              <td><span style={{fontWeight:700,color:s.gpa>=3.5?'var(--green)':parseFloat(s.gpa)>=3?'var(--amber)':'var(--rose)'}}>{s.gpa}</span></td>
              <td><div style={{display:'flex',alignItems:'center',gap:8}}><div className="pbar" style={{width:60}}><div className="pfill" style={{width:`${s.attendance}%`,background:s.attendance>=90?'var(--green)':'var(--amber)'}}/></div><span style={{fontSize:12}}>{s.attendance}%</span></div></td>
              <td><span className={`tag ${parseFloat(s.gpa)>=3.7?'tg':parseFloat(s.gpa)>=3?'ty':'tr'}`}>{parseFloat(s.gpa)>=3.7?'Excellent':parseFloat(s.gpa)>=3?'Good':'Needs Help'}</span></td>
              <td><StatusBadge status={s.fees}/></td>
            </tr>
          ))}</tbody>
        </table></div>
      </div>
    </div>
  );
}

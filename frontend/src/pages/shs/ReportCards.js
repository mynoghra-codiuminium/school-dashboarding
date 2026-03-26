import { useState, useEffect } from 'react';
import api from '../../api';
import { Icon, Spinner, Modal, getInitials, getAvatarColor } from '../../components/UI';

const QUARTERS = ['1st Quarter','2nd Quarter','3rd Quarter','4th Quarter'];

function gradeColor(g) {
  if (g >= 90) return 'var(--green)';
  if (g >= 85) return 'var(--teal)';
  if (g >= 80) return 'var(--amber)';
  if (g >= 75) return 'var(--orange)';
  return 'var(--rose)';
}

function gradeDesc(g) {
  if (g >= 90) return 'Outstanding';
  if (g >= 85) return 'Very Satisfactory';
  if (g >= 80) return 'Satisfactory';
  if (g >= 75) return 'Fairly Satisfactory';
  return 'Did Not Meet Expectations';
}

const CORE_SUBJECTS = ['Oral Communication','Komunikasyon at Pananaliksik','21st Century Literature','Contemporary Philippine Arts','PE & Health','Personal Development','Earth & Life Science'];

export default function ReportCards() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading]  = useState(true);
  const [search, setSearch]    = useState('');
  const [selected, setSelected]= useState(null);

  useEffect(() => {
    api.get('/students', { params: { limit: 200 } }).then(({ data }) => setStudents(data.students || data || [])).catch(() => setStudents([])).finally(() => setLoading(false));
  }, []);

  const getGrade = (id, subject, q) => {
    const seed = (id+subject+q).split('').reduce((a,c)=>a+c.charCodeAt(0),0);
    return 75 + (seed % 25);
  };

  const getQuarterAvg = (s, q) => {
    const grades = CORE_SUBJECTS.map(sub => getGrade(s._id||s.name, sub, q));
    return Math.round(grades.reduce((a,b)=>a+b,0)/grades.length);
  };

  const getFinalAvg = (s) => {
    const avgs = QUARTERS.map(q => getQuarterAvg(s, q));
    return Math.round(avgs.reduce((a,b)=>a+b,0)/avgs.length);
  };


  const rows = students.filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:11,fontWeight:700,color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:4}}>SHS · Report Cards</div>
        <div style={{fontSize:22,fontWeight:800,color:'var(--ink)'}}>Student Report Cards</div>
      </div>

      <div style={{display:'flex',gap:10,marginBottom:16,alignItems:'center'}}>
        <div className="tsearch" style={{flex:1,maxWidth:320}}><Icon name="search" size={15}/><input placeholder="Search student…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <span style={{fontSize:12.5,color:'var(--ink4)'}}>{rows.length} students</span>
      </div>

      <div className="card">
        <div className="tw">
          {loading ? <div style={{padding:40,textAlign:'center'}}><Spinner/></div> : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Strand</th>
                  {QUARTERS.map(q=><th key={q}>{q.replace(' Quarter',' Qtr')}</th>)}
                  <th>Final Average</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0,30).map((s,i) => {
                  const final = getFinalAvg(s);
                  return (
                    <tr key={s._id} style={{animation:`fadeUp .35s ${i*35}ms both`}}>
                      <td>
                        <div className="uc">
                          <div className="av" style={{background:getAvatarColor(s.name),width:32,height:32,fontSize:11,borderRadius:4,color:'var(--canvas)'}}>{getInitials(s.name)}</div>
                          <div><div className="un">{s.name}</div><div className="us">{s.grade}</div></div>
                        </div>
                      </td>
                      <td><span className="tag tb">{s.strand||'—'}</span></td>
                      {QUARTERS.map(q => {
                        const avg = getQuarterAvg(s, q);
                        return <td key={q}><span style={{fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700,color:gradeColor(avg)}}>{avg}</span></td>;
                      })}
                      <td>
                        <span style={{fontFamily:"'Space Mono',monospace",fontSize:15,fontWeight:800,color:gradeColor(final)}}>{final}</span>
                        <div style={{fontSize:10.5,color:'var(--ink4)',marginTop:2}}>{gradeDesc(final)}</div>
                      </td>
                      <td>
                        <button className="btn btno bsm" onClick={()=>setSelected(s)}>
                          <Icon name="report" size={13}/> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!loading && !rows.length && (
            <div className="empty"><div className="empty-ico"><Icon name="report" size={24}/></div><div className="empty-t">No students found</div></div>
          )}
        </div>
      </div>

      {/* Full Report Card Modal */}
      {selected && (
        <Modal title={`Report Card — ${selected.name}`} onClose={()=>setSelected(null)}
          footer={<><button className="btn btno" onClick={()=>setSelected(null)}>Close</button><button className="btn btnp" onClick={()=>window.print()}>🖨 Print</button></>}
          wide>
          <div style={{padding:'4px 0'}}>
            {/* Student Info */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:20,padding:'14px',borderRadius:10,background:'var(--sur)'}}>
              {[['Name',selected.name],['Grade Level',selected.grade],['Strand',selected.strand||'—'],['Section',selected.section||'—'],['School Year','2025–2026'],['Status',selected.status||'Active']].map(([l,v])=>(
                <div key={l}><div style={{fontSize:10.5,color:'var(--ink4)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:3}}>{l}</div><div style={{fontSize:13.5,color:'var(--ink)',fontWeight:600}}>{v}</div></div>
              ))}
            </div>

            {/* Grades table */}
            <table className="tbl">
              <thead>
                <tr>
                  <th>Subject</th>
                  {QUARTERS.map(q=><th key={q}>{q}</th>)}
                  <th>Final</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {CORE_SUBJECTS.map(sub => {
                  const qs = QUARTERS.map(q => getGrade(selected._id||selected.name, sub, q));
                  const final = Math.round(qs.reduce((a,b)=>a+b,0)/qs.length);
                  return (
                    <tr key={sub}>
                      <td style={{fontWeight:500,color:'var(--ink2)',fontSize:13}}>{sub}</td>
                      {qs.map((g,i)=><td key={i}><span style={{fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:600,color:gradeColor(g)}}>{g}</span></td>)}
                      <td><span style={{fontFamily:"'Space Mono',monospace",fontSize:13.5,fontWeight:800,color:gradeColor(final)}}>{final}</span></td>
                      <td><span style={{fontSize:11,fontWeight:600,color:gradeColor(final)}}>{gradeDesc(final)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Final Average */}
            <div style={{marginTop:16,padding:'16px',borderRadius:10,background:'var(--amberp)',border:'1px solid rgba(176,90,14,.2)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontWeight:700,color:'var(--ink2)'}}>General Average</span>
              <span style={{fontSize:26,fontWeight:900,color:gradeColor(getFinalAvg(selected)),fontFamily:"'Space Mono',monospace"}}>{getFinalAvg(selected)}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );

}

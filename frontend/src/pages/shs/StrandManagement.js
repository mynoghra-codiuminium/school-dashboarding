import { useState, useEffect } from 'react';
import api from '../../api';
import { StatusBadge, Spinner, Modal } from '../../components/UI';

const STRAND_INFO = {
  STEM:  { full:'Science, Technology, Engineering & Mathematics', color:'var(--amber)', tracks:['Core Sciences','Engineering','IT','Mathematics'] },
  ABM:   { full:'Accountancy, Business & Management',             color:'var(--teal)',  tracks:['Accountancy','Business','Entrepreneurship'] },
  HUMSS: { full:'Humanities & Social Sciences',                   color:'var(--violet)',tracks:['Humanities','Social Sciences','Communication'] },
  GAS:   { full:'General Academic Strand',                        color:'var(--rose)',  tracks:['General Academic'] },
  TVL:   { full:'Technical-Vocational-Livelihood',                color:'var(--sky)',   tracks:['Home Economics','ICT','Agri-Fishery','Industrial Arts'] },
  Sports:{ full:'Sports Track',                                   color:'var(--green)', tracks:['Sports'] },
  'Arts & Design': { full:'Arts & Design Track',                  color:'var(--orange)',tracks:['Visual Arts','Music','Dance','Theater'] },
};

const GRADES = ['Grade 11','Grade 12'];

export default function StrandManagement() {
  const [strands, setStrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/students', { params: { limit: 500 } }).then(({ data }) => {
      const students = data.students || data || [];
      // group by strand
      const grouped = {};
      students.forEach(s => {
        const strand = s.strand || 'Unassigned';
        if (!grouped[strand]) grouped[strand] = { students: [], g11: 0, g12: 0 };
        grouped[strand].students.push(s);
        if (String(s.grade).includes('11')) grouped[strand].g11++;
        if (String(s.grade).includes('12')) grouped[strand].g12++;
      });
      setStrands(Object.entries(grouped).map(([name, v]) => ({ name, ...v })));
    }).catch(() => setStrands([])).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner/>;

  return (
    <div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:11,fontWeight:700,color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:4}}>SHS · Strand Management</div>
        <div style={{fontSize:22,fontWeight:800,color:'var(--ink)'}}>Strand & Track Overview</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14}}>
        {Object.entries(STRAND_INFO).map(([name, info], i) => {
          const data = strands.find(s => s.name === name) || { students:[], g11:0, g12:0 };
          const total = data.students.length;
          return (
            <div key={name} className="card" style={{animation:`fadeUp .4s ${i*60}ms both`,cursor:'pointer'}}
              onClick={() => setSelected({ name, info, data })}>
              <div className="ch">
                <div>
                  <div style={{fontSize:18,fontWeight:800,color:info.color}}>{name}</div>
                  <div style={{fontSize:11.5,color:'var(--ink4)',marginTop:3,lineHeight:1.4}}>{info.full}</div>
                </div>
                <div style={{
                  fontSize:22,fontWeight:800,color:info.color,
                  fontFamily:"'Space Mono',monospace",
                  background:`${info.color}12`,padding:'6px 12px',borderRadius:8,
                }}>{total}</div>
              </div>
              <div className="cb" style={{display:'flex',gap:8}}>
                <div style={{flex:1,padding:'10px',borderRadius:8,background:'var(--sur)',textAlign:'center'}}>
                  <div style={{fontSize:18,fontWeight:700,color:'var(--ink)',fontFamily:"'Space Mono',monospace"}}>{data.g11}</div>
                  <div style={{fontSize:11,color:'var(--ink4)'}}>Grade 11</div>
                </div>
                <div style={{flex:1,padding:'10px',borderRadius:8,background:'var(--sur)',textAlign:'center'}}>
                  <div style={{fontSize:18,fontWeight:700,color:'var(--ink)',fontFamily:"'Space Mono',monospace"}}>{data.g12}</div>
                  <div style={{fontSize:11,color:'var(--ink4)'}}>Grade 12</div>
                </div>
              </div>
              <div style={{padding:'0 18px 14px',display:'flex',flexWrap:'wrap',gap:6}}>
                {info.tracks.map(t => (
                  <span key={t} style={{fontSize:11,padding:'3px 8px',borderRadius:4,background:`${info.color}12`,color:info.color,fontWeight:600}}>{t}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <Modal title={`${selected.name} — ${selected.info.full}`} onClose={()=>setSelected(null)}
          footer={<button className="btn btno" onClick={()=>setSelected(null)}>Close</button>} wide>
          <div>
            <div style={{display:'flex',gap:10,marginBottom:16}}>
              {['Total','Grade 11','Grade 12'].map((l,i) => {
                const v = i===0 ? selected.data.students.length : i===1 ? selected.data.g11 : selected.data.g12;
                return (
                  <div key={l} style={{flex:1,padding:'12px',borderRadius:8,background:'var(--sur)',textAlign:'center'}}>
                    <div style={{fontSize:20,fontWeight:800,color:selected.info.color,fontFamily:"'Space Mono',monospace"}}>{v}</div>
                    <div style={{fontSize:11,color:'var(--ink4)',marginTop:2}}>{l}</div>
                  </div>
                );
              })}
            </div>
            {selected.data.students.length > 0 ? (
              <table className="tbl">
                <thead><tr><th>Name</th><th>Grade</th><th>Section</th><th>Status</th></tr></thead>
                <tbody>
                  {selected.data.students.slice(0,20).map(s => (
                    <tr key={s._id}>
                      <td style={{fontWeight:600,color:'var(--ink)'}}>{s.name}</td>
                      <td style={{fontSize:12,color:'var(--ink3)'}}>{s.grade}</td>
                      <td style={{fontSize:12,color:'var(--ink3)'}}>{s.section||'—'}</td>
                      <td><StatusBadge status={s.status}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty"><div className="empty-t">No students in this strand</div></div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

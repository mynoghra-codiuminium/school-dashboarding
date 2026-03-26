import { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../api';
import { Icon, StatusBadge, Spinner, Modal, getInitials, getAvatarColor, formatDate } from '../components/UI';
import {useSchoolYear} from '../context/SchoolYearContext';

// ── Constants ─────────────────────────────────────────────────
const STRANDS = ['STEM','ABM','HUMSS','GAS','TVL','Sports','Arts & Design'];
const SY      = ['2024-2025','2025-2026','2026-2027'];
const STRAND_SECTIONS = {
  STEM:            ['11-STEM-A','11-STEM-B','12-STEM-A','12-STEM-B'],
  ABM:             ['11-ABM-A','11-ABM-B','12-ABM-A','12-ABM-B'],
  HUMSS:           ['11-HUMSS-A','11-HUMSS-B','12-HUMSS-A','12-HUMSS-B'],
  GAS:             ['11-GAS-A','11-GAS-B','12-GAS-A','12-GAS-B'],
  TVL:             ['11-TVL-A','11-TVL-B','12-TVL-A','12-TVL-B'],
  Sports:          ['11-SPORTS-A','12-SPORTS-A'],
  'Arts & Design': ['11-ARTS-A','12-ARTS-A'],
};
// SHS only — Grade 11 & 12
const ALL_GRADES = ['Grade 11','Grade 12'];

const getSHSSections = (strand, gradeLevel) => {
  const all = STRAND_SECTIONS[strand] || [];
  const prefix = gradeLevel === 'Grade 11' ? '11-' : '12-';
  return all.filter(s => s.startsWith(prefix));
};
const getSections = (grade, strand) => getSHSSections(strand, grade);
const isSHS = () => true; // SHS-only system

// ── Excel template columns ─────────────────────────────────────
const TMPL_HEADERS = [
  'Full Name*', 'Email*', 'Phone', 'Date of Birth (YYYY-MM-DD)',
  'Gender (Male/Female/Other)', 'Grade Level* (e.g. Grade 11)',
  'Section (e.g. 11-STEM-A)', 'Strand (STEM/ABM/HUMSS/GAS/TVL/Sports/Arts & Design)',
  'LRN (12-digit)', 'Address', 'Parent/Guardian', 'Parent Phone',
  'Enrollment Type (New/Returnee/Transferee/Continuing)',
  'Semester (1st Semester / 2nd Semester)', 'School Year (e.g. 2024-2025)',
  'Voucher Type (None/ESC/SHS)', 'Voucher Amount', 'Voucher No.',
  'Has Birth Certificate (Yes/No)', 'Has Form 137 (Yes/No)',
  'Has Good Moral (Yes/No)', 'Has Report Card (Yes/No)', 'Has ID Pictures (Yes/No)',
];
const SAMPLE_ROWS = [
  ['Maria Santos','maria@school.edu','09171234567','2007-03-15','Female','Grade 11','11-STEM-A','STEM','111234567890','123 Quezon St, Manila','Elena Santos','09181234567','New','1st Semester','2024-2025','SHS','14000','SHS-2024-001','Yes','Yes','Yes','No','Yes'],
  ['Juan dela Cruz','juan@school.edu','09182345678','2007-07-22','Male','Grade 11','11-ABM-A','ABM','111234567891','45 Rizal Ave, QC','Pedro dela Cruz','09192345678','New','1st Semester','2024-2025','None','','','Yes','Yes','No','No','Yes'],
  ['Ana Reyes','ana@school.edu','09193456789','2006-01-10','Female','Grade 12','12-HUMSS-A','HUMSS','111234567892','78 Bonifacio St','Susan Reyes','09103456789','Continuing','1st Semester','2024-2025','ESC','22000','ESC-2024-015','Yes','Yes','Yes','Yes','Yes'],
];

function parseYN(v) { return String(v||'').toLowerCase().startsWith('y'); }

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet([TMPL_HEADERS, ...SAMPLE_ROWS]);
  ws1['!cols'] = TMPL_HEADERS.map((h,i) => ({ wch: i===0?28:i===9?30:i===1?26:18 }));
  XLSX.utils.book_append_sheet(wb, ws1, 'Students');

  const instr = [
    ['STUDENT BATCH ENROLLMENT — INSTRUCTIONS'],[''],
    ['REQUIRED FIELDS (marked with *)'],
    ['• Full Name — Complete name of the student'],
    ['• Email — Must be unique per student'],
    ['• Grade Level — Grade 11 OR Grade 12 only (SHS)'],[''],
    ['SHS FIELDS (Grade 11 & 12 only)'],
    ['• Strand — STEM, ABM, HUMSS, GAS, TVL, Sports, Arts & Design'],
    ['• Section — Auto-assigned if blank. Format: 11-STEM-A'],
    ['• LRN — 12-digit Learner Reference Number'],
    ['• Voucher — ESC or SHS voucher details'],[''],
    ['DOCUMENT COLUMNS — Enter Yes or No (default: No if blank)'],[''],
    ['SHS SECTION GUIDE'],
    ['STEM:    11-STEM-A, 11-STEM-B, 12-STEM-A, 12-STEM-B'],
    ['ABM:     11-ABM-A, 11-ABM-B, 12-ABM-A, 12-ABM-B'],
    ['HUMSS:   11-HUMSS-A, 11-HUMSS-B, 12-HUMSS-A, 12-HUMSS-B'],
    ['GAS:     11-GAS-A, 11-GAS-B, 12-GAS-A, 12-GAS-B'],
    ['TVL:     11-TVL-A, 11-TVL-B, 12-TVL-A, 12-TVL-B'],

    ['• Do not edit header row | Max 500 students per upload'],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(instr);
  ws2['!cols'] = [{ wch: 65 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Instructions');
  XLSX.writeFile(wb, 'Student_Batch_Enrollment_Template.xlsx');
}

function parseExcelFile(file, defaults) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target.result, { type:'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' });
        if (data.length < 2) { reject(new Error('File has no data rows')); return; }

        const records = data.slice(1)
          .filter(r => String(r[0]||'').trim())
          .map((r, idx) => {
            const name   = String(r[0]||'').trim();
            const email  = String(r[1]||'').trim();
            const phone  = String(r[2]||'').trim();
            const dob    = String(r[3]||'').trim();
            const gender = String(r[4]||'Male').trim() || 'Male';
            const grade  = String(r[5]||defaults.gradeLevel||'Grade 11').trim();
            let   section= String(r[6]||'').trim();
            const strand = String(r[7]||defaults.strand||'').trim();
            const lrn    = String(r[8]||'').trim();
            const address= String(r[9]||'').trim();
            const parent = String(r[10]||'').trim();
            const parentPhone = String(r[11]||'').trim();
            const etype  = String(r[12]||'New').trim() || 'New';
            const sem    = String(r[13]||defaults.semester||'1st Semester').trim();
            const sy     = String(r[14]||defaults.schoolYear||'2024-2025').trim();
            const vtype  = String(r[15]||'None').trim() || 'None';
            const vamt   = Number(r[16])||0;
            const vno    = String(r[17]||'').trim();
            const docBC  = parseYN(r[18]);
            const doc137 = parseYN(r[19]);
            const docGM  = parseYN(r[20]);
            const docRC  = parseYN(r[21]);
            const docID  = parseYN(r[22]);

            // Auto-assign section if blank
            if (!section) {
              const secs = getSections(grade, strand);
              section = secs[0] || '';
            }

            const errors = [];
            if (!name)  errors.push('Name required');
            if (!email) errors.push('Email required');

            return {
              _row: idx + 2, _valid: errors.length === 0, _errors: errors,
              // Student record fields
              name, email, phone, dob, gender,
              grade: section || grade,   // use section as grade field in student model
              address, parent, parentPhone,
              fees: 'Pending', status: 'Active',
              gpa: 0, attendance: 0,
              enrollDate: new Date().toISOString(),
              // SHS-specific fields stored as extra
              _shs: { lrn, strand, gradeLevel: grade, section, semester: sem, schoolYear: sy, enrollmentType: etype,
                      documents: { birthCertificate:docBC, form137:doc137, goodMoral:docGM, reportCard:docRC, idPictures:docID },
                      voucher: { hasVoucher: vtype!=='None'&&vamt>0, voucherType: vtype, voucherAmount: vamt, voucherNo: vno } },
            };
          });
        resolve(records);
      } catch (err) { reject(new Error('Parse error: ' + err.message)); }
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsArrayBuffer(file);
  });
}

// ── Default empty form ──────────────────────────────────────
const EMPTY = {
  name:'', email:'', phone:'', dob:'', gender:'Male',
  grade:'', section:'', strand:'', gradeLevel:'Grade 11',
  address:'', parent:'', parentPhone:'',
  fees:'Pending', status:'Active',
  lrn:'', enrollmentType:'New', semester:'1st Semester', schoolYear:'',  // filled at runtime
  documents:{ birthCertificate:false, form137:false, goodMoral:false, reportCard:false, idPictures:false },
  voucher:{ hasVoucher:false, voucherType:'None', voucherAmount:0, voucherNo:'' },
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function Students() {
  const {config:syConfig} = useSchoolYear();
  const sy = syConfig.schoolYear;

  const [rows, setRows]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [sf, setSf]             = useState('All');
  const [gf, setGf]             = useState('All');
  const [viewMode, setViewMode] = useState('all'); // 'all' | 'shs' | 'jhs'
  const [modal, setModal]       = useState(null);
  const [sel, setSel]           = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');
  const [activeTab, setActiveTab] = useState('info'); // form tabs: info | shs | docs

  // Batch
  const [batchModal, setBatchModal]       = useState(false);
  const [batchStep, setBatchStep]         = useState(1);
  const [batchRecords, setBatchRecords]   = useState([]);
  const [batchDefaults, setBatchDefaults] = useState({ gradeLevel:'Grade 11', strand:'STEM', semester:'1st Semester', schoolYear:sy });
  const [batchResult, setBatchResult]     = useState(null);
  const [batchErr, setBatchErr]           = useState('');
  const [batchSaving, setBatchSaving]     = useState(false);
  const [dragOver, setDragOver]           = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = { search, limit: 100 };
      if (sf !== 'All') params.status = sf;
      if (gf !== 'All') params.grade  = gf;
      const { data } = await api.get('/students', { params });
      let list = data.students || data || [];
      if (viewMode === 'shs') list = list.filter(s => s.grade?.toString().includes('11') || s.grade?.toString().includes('12'));
      setRows(list);
      setTotal(data.total || list.length);
    } catch { setErr('Failed to load'); } finally { setLoading(false); }
  }, [search, sf, gf, viewMode]);

  useEffect(() => { load(); }, [load]);

  // Stats
  const shsCount = rows.filter(s => s.grade?.toString().includes('11') || s.grade?.toString().includes('12')).length;

  const activeCount = rows.filter(s => s.status === 'Active').length;
  const docCount = (docs) => docs ? Object.values(docs).filter(Boolean).length : 0;

  // ── CRUD ──────────────────────────────────────────────────
  const openAdd  = () => { setForm(EMPTY); setSel(null); setActiveTab('info'); setModal('form'); };
  const openEdit = (s) => { setForm({ ...EMPTY, ...s, dob: s.dob?.split('T')[0]||'', gradeLevel: s.gradeLevel||s.grade||'', section: s.section||'' }); setSel(s); setActiveTab('info'); setModal('form'); };
  const openView = (s) => { setSel(s); setModal('view'); };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setDoc = (k, v) => setForm(f => ({ ...f, documents: { ...f.documents, [k]: v } }));
  const setVch = (k, v) => setForm(f => ({ ...f, voucher: { ...f.voucher, [k]: v } }));

  const handleGradeChange = (gl) => {
    set('gradeLevel', gl);
    const secs = getSections(gl, form.strand);
    if (secs.length) { set('section', secs[0]); set('grade', secs[0]); }
  };
  const handleStrandChange = (st) => {
    set('strand', st);
    const secs = getSections(form.gradeLevel, st);
    if (secs.length) { set('section', secs[0]); set('grade', secs[0]); }
  };

  const save = async () => {
    if (!form.name || !form.email) { setErr('Name and email are required'); return; }
    setSaving(true); setErr('');
    try {
      const payload = { ...form, grade: form.section || form.grade || form.gradeLevel };
      if (sel) await api.put(`/students/${sel._id}`, payload);
      else     await api.post('/students', payload);
      // Also create/update SHS enrollment if SHS grade
      if (isSHS(form.gradeLevel) && form.lrn !== undefined) {
        try {
          await api.post('/shs/enrollments', {
            studentName: form.name, lrn: form.lrn,
            strand: form.strand, gradeLevel: form.gradeLevel,
            section: form.section, semester: form.semester,
            schoolYear: form.schoolYear, enrollmentType: form.enrollmentType,
            status: 'Enrolled', documents: form.documents, voucher: form.voucher,
          });
        } catch { /* enrollment record optional */ }
      }
      setModal(null); load();
    } catch (e) { setErr(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this student?')) return;
    try { await api.delete(`/students/${id}`); load(); } catch { setErr('Delete failed'); }
  };

  // ── Batch ──────────────────────────────────────────────────
  const handleFile = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx','xls','csv'].includes(ext)) { setBatchErr('Upload an Excel (.xlsx/.xls) or CSV file'); return; }
    setBatchErr('');
    try {
      const records = await parseExcelFile(file, batchDefaults);
      setBatchRecords(records);
      setBatchStep(2);
    } catch (e) { setBatchErr(e.message); }
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); };
  const editRec = (i, k, v) => setBatchRecords(r => r.map((rec, idx) => idx === i ? { ...rec, [k]: v } : rec));
  const removeRec = (i) => setBatchRecords(r => r.filter((_, idx) => idx !== i));

  const submitBatch = async () => {
    const valid = batchRecords.filter(r => r._valid);
    if (!valid.length) { setBatchErr('No valid records'); return; }
    setBatchSaving(true); setBatchErr('');
    try {
      let success = 0, failed = 0, errors = [];
      for (const rec of valid) {
        try {
          const { _row, _valid, _errors, _shs, ...studentData } = rec;
          await api.post('/students', studentData);
          // Also create SHS enrollment if SHS grade
          if (_shs && isSHS(_shs.gradeLevel)) {
            try {
              await api.post('/shs/enrollments', { studentName: rec.name, ..._shs });
            } catch { /* optional */ }
          }
          success++;
        } catch (e) {
          failed++;
          errors.push({ name: rec.name, error: e.response?.data?.message || e.message });
        }
      }
      setBatchResult({ success, failed, errors });
      setBatchStep(3);
      load();
    } catch (e) { setBatchErr(e.response?.data?.message || 'Batch failed'); }
    finally { setBatchSaving(false); }
  };

  const resetBatch = () => { setBatchStep(1); setBatchRecords([]); setBatchResult(null); setBatchErr(''); };
  const closeBatch = () => { setBatchModal(false); resetBatch(); };

  const validCount = batchRecords.filter(r => r._valid).length;
  const errCount   = batchRecords.filter(r => !r._valid).length;

  // ── grade display label ──────────────────────────────────
  const gradeLabel = (s) => s.gradeLevel || s.grade || '—';
  const strandLabel = (s) => s.strand || '';

  return (
    <div className="fu">

      {/* ── KPI row ── */}
      <div className="kpi-grid">
        {[
          [total,       'Total Students',  'kb', 'students'],
          [activeCount, 'Active',          'kg', 'check'],
          [shsCount,    'Senior High',     'kv', 'graduation'],

        ].map(([v,l,k,ic]) => (
          <div key={l} className={`kpi ${k}`}>
            <div className={`kpi-ico ${k}`}><Icon name={ic} size={20}/></div>
            <div className="kpi-val">{v}</div>
            <div className="kpi-lbl">{l}</div>
          </div>
        ))}
      </div>

      {/* ── View mode tabs ── */}
      <div style={{ display:'flex', gap:4, background:'var(--sur2)', borderRadius:12, padding:4, marginBottom:16, border:'1px solid var(--bdr)', width:'fit-content' }}>
        {[['all','All Students'],['shs','SHS (Gr.11–12)']].map(([m,l]) => (
          <button key={m} onClick={() => setViewMode(m)}
            className="btn bsm"
            style={{ background:viewMode===m?'var(--sur)':'transparent', color:viewMode===m?'var(--ink)':'var(--ink3)', border:viewMode===m?'1px solid var(--bdr)':'1px solid transparent', boxShadow:viewMode===m?'var(--s1)':'none' }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="toolbar">
        <div className="tsearch"><Icon name="search" size={15}/><input placeholder="Search name, email, grade…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <select className="tsel" value={sf} onChange={e=>setSf(e.target.value)}>
          <option value="All">All Status</option>
          <option>Active</option><option>Inactive</option><option>Transferred</option>
        </select>
        <select className="tsel" value={gf} onChange={e=>setGf(e.target.value)}>
          <option value="All">All Grades</option>
          {['11','12'].map(g => <option key={g} value={g}>Grade {g}</option>)}
        </select>
        <div className="sp"/>
        <button className="btn btno" onClick={downloadTemplate} title="Download Excel template">
          <Icon name="download" size={15}/>Template
        </button>
        <button className="btn btno" onClick={() => { resetBatch(); setBatchModal(true); }}>
          <Icon name="students" size={15}/>Batch Enroll
        </button>
        <button className="btn btnp" onClick={openAdd}>
          <Icon name="plus" size={15}/>Add Student
        </button>
      </div>

      {err && <div className="errmsg" style={{marginBottom:14}}>{err}</div>}

      {/* ── Table ── */}
      <div className="card">
        <div className="ch">
          <div className="ct">
            {viewMode==='shs'?'Senior High School Students':'All Students'}
            <span style={{fontWeight:400,color:'var(--ink4)',fontSize:13}}> ({rows.length})</span>
          </div>
        </div>
        {loading ? <Spinner /> : (
          <div className="tw">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Grade / Section</th>
                  <th>Strand</th>
                  <th>Gender</th>
                  <th>GPA</th>
                  <th>Attendance</th>
                  <th>Fees</th>
                  {viewMode === 'shs' && <th>Documents</th>}
                  {viewMode === 'shs' && <th>Voucher</th>}
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(s => (
                  <tr key={s._id}>
                    <td>
                      <div className="uc">
                        <div className="av" style={{background:getAvatarColor(s.name),width:32,height:32,fontSize:11,borderRadius:8}}>{getInitials(s.name)}</div>
                        <div>
                          <div className="un">{s.name}</div>
                          <div className="us">{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="tag tb" style={{fontSize:10.5}}>{gradeLabel(s)}</span></td>
                    <td>{strandLabel(s)?<span className="tag tv" style={{fontSize:10.5}}>{strandLabel(s)}</span>:<span style={{color:'var(--ink4)',fontSize:12}}>—</span>}</td>
                    <td><StatusBadge status={s.gender}/></td>
                    <td><span style={{fontWeight:700,color:s.gpa>=3.5?'var(--green)':s.gpa>=3?'var(--amber)':'var(--rose)'}}>{s.gpa||'—'}</span></td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div className="pbar" style={{width:50}}><div className="pfill" style={{width:`${s.attendance||0}%`,background:s.attendance>=90?'var(--green)':'var(--amber)'}}/></div>
                        <span style={{fontSize:12,fontWeight:600}}>{s.attendance||0}%</span>
                      </div>
                    </td>
                    <td><StatusBadge status={s.fees}/></td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:5}}>
                          <div className="pbar" style={{width:40}}><div className="pfill" style={{width:`${(docCount(s.documents)/5)*100}%`,background:docCount(s.documents)===5?'var(--green)':'var(--amber)'}}/></div>
                          <span style={{fontSize:11,fontWeight:600}}>{docCount(s.documents)}/5</span>
                      </div>
                    </td>
                    <td>{s.voucher?.hasVoucher?<span className="tag tg" style={{fontSize:10.5}}>{s.voucher.voucherType}</span>:<span style={{color:'var(--ink4)',fontSize:12}}>—</span>}</td>
                    <td><StatusBadge status={s.status}/></td>
                    <td>
                      <div style={{display:'flex',gap:4}}>
                        <button className="btn btno bsm bico" onClick={()=>openView(s)}><Icon name="eye" size={14}/></button>
                        <button className="btn btno bsm bico" onClick={()=>openEdit(s)}><Icon name="edit" size={14}/></button>
                        <button className="btn btnx bsm bico" onClick={()=>del(s._id)}><Icon name="trash" size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length===0&&<div className="empty"><div className="empty-ico"><Icon name="students" size={24}/></div><div className="empty-t">No students found</div><div className="empty-s">Try adjusting your filters or use Batch Enroll</div></div>}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          ADD / EDIT MODAL — tabbed form
         ══════════════════════════════════════════════════════ */}
      {modal==='form' && (
        <Modal
          title={sel ? `Edit — ${sel.name}` : 'Add New Student'}
          onClose={() => { setModal(null); setErr(''); }}
          footer={
            <>
              <button className="btn btno" onClick={() => { setModal(null); setErr(''); }}>Cancel</button>
              <button className="btn btnp" onClick={save} disabled={saving}>{saving?'Saving…':'Save Student'}</button>
            </>
          }
        >
          {err && <div className="errmsg">{err}</div>}

          {/* Form Tabs */}
          <div style={{display:'flex',gap:4,background:'var(--sur2)',borderRadius:10,padding:4,marginBottom:18,border:'1px solid var(--bdr)'}}>
            {[['info','📋 Basic Info'],['shs','🎓 SHS / Enrollment'],['docs','📄 Documents']].map(([t,l]) => (
              <button key={t} onClick={()=>setActiveTab(t)} className="btn bsm"
                style={{flex:1,justifyContent:'center',background:activeTab===t?'var(--sur)':'transparent',color:activeTab===t?'var(--ink)':'var(--ink3)',border:activeTab===t?'1px solid var(--bdr)':'1px solid transparent',boxShadow:activeTab===t?'var(--s1)':'none',fontSize:12.5}}>
                {l}
              </button>
            ))}
          </div>

          {/* Tab: Basic Info */}
          {activeTab==='info' && (
            <div className="fgrid">
              <div className="fg fg-full"><label>Full Name *</label><input className="fi" value={form.name||''} onChange={e=>set('name',e.target.value)} placeholder="Complete name"/></div>
              <div className="fg"><label>Email *</label><input className="fi" type="email" value={form.email||''} onChange={e=>set('email',e.target.value)}/></div>
              <div className="fg"><label>Phone</label><input className="fi" value={form.phone||''} onChange={e=>set('phone',e.target.value)}/></div>
              <div className="fg"><label>Date of Birth</label><input className="fi" type="date" value={form.dob||''} onChange={e=>set('dob',e.target.value)}/></div>
              <div className="fg"><label>Gender</label>
                <select className="fsel" value={form.gender} onChange={e=>set('gender',e.target.value)}>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
              <div className="fg"><label>Grade Level</label>
                <select className="fsel" value={form.gradeLevel||''} onChange={e=>handleGradeChange(e.target.value)}>
                  <option value="">— Select —</option>
                  {ALL_GRADES.map(g=><option key={g}>{g}</option>)}
                </select>
              </div>
              <div className="fg"><label>Strand</label>
                <select className="fsel" value={form.strand||''} onChange={e=>handleStrandChange(e.target.value)}>
                  <option value="">— Select Strand —</option>
                  {STRANDS.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="fg"><label>Section <span style={{fontSize:10,color:'var(--ink4)'}}>auto from strand</span></label>
                <select className="fsel" value={form.section||''} onChange={e=>{set('section',e.target.value);set('grade',e.target.value);}}>
                  <option value="">— Select —</option>
                  {getSHSSections(form.strand,form.gradeLevel).map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="fg fg-full"><label>Address</label><input className="fi" value={form.address||''} onChange={e=>set('address',e.target.value)}/></div>
              <div className="fg"><label>Parent / Guardian</label><input className="fi" value={form.parent||''} onChange={e=>set('parent',e.target.value)}/></div>
              <div className="fg"><label>Parent Phone</label><input className="fi" value={form.parentPhone||''} onChange={e=>set('parentPhone',e.target.value)}/></div>
              <div className="fg"><label>Fee Status</label>
                <select className="fsel" value={form.fees} onChange={e=>set('fees',e.target.value)}>
                  <option>Pending</option><option>Paid</option><option>Overdue</option><option>Partial</option>
                </select>
              </div>
              <div className="fg"><label>Student Status</label>
                <select className="fsel" value={form.status} onChange={e=>set('status',e.target.value)}>
                  <option>Active</option><option>Inactive</option><option>Transferred</option>
                </select>
              </div>
            </div>
          )}

          {/* Tab: SHS / Enrollment */}
          {activeTab==='shs' && (
            <div className="fgrid">
              <div className="fg"><label>LRN (Learner Reference No.)</label><input className="fi" value={form.lrn||''} onChange={e=>set('lrn',e.target.value)} placeholder="12-digit LRN"/></div>
              <div className="fg"><label>Enrollment Type</label>
                <select className="fsel" value={form.enrollmentType||'New'} onChange={e=>set('enrollmentType',e.target.value)}>
                  {['New','Returnee','Transferee','Continuing'].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="fg"><label>Semester</label>
                <select className="fsel" value={form.semester||'1st Semester'} onChange={e=>set('semester',e.target.value)}>
                  <option>1st Semester</option><option>2nd Semester</option>
                </select>
              </div>
              <div className="fg"><label>School Year</label>
                <select className="fsel" value={form.schoolYear||'2024-2025'} onChange={e=>set('schoolYear',e.target.value)}>
                  {SY.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="fg fg-full" style={{paddingTop:4}}>
                <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13.5,marginBottom:10}}>
                  <input type="checkbox" checked={form.voucher?.hasVoucher||false} onChange={e=>setVch('hasVoucher',e.target.checked)} style={{width:15,height:15,accentColor:'var(--red)'}}/>
                  <strong>Student has ESC / SHS Voucher</strong>
                </label>
                {form.voucher?.hasVoucher && (
                  <div className="fgrid">
                    <div className="fg"><label>Voucher Type</label>
                      <select className="fsel" value={form.voucher?.voucherType||'None'} onChange={e=>setVch('voucherType',e.target.value)}>
                        <option>ESC</option><option>SHS</option>
                      </select>
                    </div>
                    <div className="fg"><label>Voucher No.</label><input className="fi" value={form.voucher?.voucherNo||''} onChange={e=>setVch('voucherNo',e.target.value)}/></div>
                    <div className="fg"><label>Amount (₱)</label><input className="fi" type="number" value={form.voucher?.voucherAmount||0} onChange={e=>setVch('voucherAmount',Number(e.target.value))}/></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Documents */}
          {activeTab==='docs' && (
            <div>
              <div style={{padding:12,background:'var(--sur2)',borderRadius:10,border:'1px solid var(--bdr3)',marginBottom:16,fontSize:13,color:'var(--red)'}}>
                📋 Check off submitted documents. Incomplete documents will show a progress bar in the student list.
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {[['birthCertificate','PSA Birth Certificate','Required for enrollment'],['form137','Form 137 (Permanent Record)','From previous school'],['goodMoral','Certificate of Good Moral Character','From previous school'],['reportCard','Report Card','Latest report card'],['idPictures','ID Pictures (2x2)','2 pieces, white background']].map(([k,l,desc])=>(
                  <label key={k} style={{display:'flex',alignItems:'flex-start',gap:12,cursor:'pointer',padding:'12px 14px',borderRadius:10,background:form.documents?.[k]?'#f0fdf4':'var(--sur2)',border:`1px solid ${form.documents?.[k]?'#86efac':'var(--bdr)'}`,transition:'all .15s'}}>
                    <input type="checkbox" checked={form.documents?.[k]||false} onChange={e=>setDoc(k,e.target.checked)} style={{width:16,height:16,accentColor:'var(--red)',flexShrink:0,marginTop:2}}/>
                    <div>
                      <div style={{fontWeight:600,fontSize:13.5}}>{l}</div>
                      <div style={{fontSize:12,color:'var(--ink4)',marginTop:2}}>{desc}</div>
                    </div>
                    {form.documents?.[k] && <span style={{marginLeft:'auto',color:'var(--green)',fontSize:16,flexShrink:0}}>✓</span>}
                  </label>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* ── View Profile Modal ── */}
      {modal==='view' && sel && (
        <Modal title="Student Profile" onClose={()=>setModal(null)}
          footer={<><button className="btn btno" onClick={()=>setModal(null)}>Close</button><button className="btn btnp" onClick={()=>openEdit(sel)}>Edit</button></>}>
          <div className="pstrip">
            <div className="av av-r" style={{background:getAvatarColor(sel.name),width:60,height:60,fontSize:20}}>{getInitials(sel.name)}</div>
            <div>
              <div className="pstrip-name">{sel.name}</div>
              <div className="pstrip-sub">{gradeLabel(sel)}{strandLabel(sel)?` · ${strandLabel(sel)}`:''} · {sel.email}</div>
              <div style={{marginTop:6,display:'flex',gap:6,flexWrap:'wrap'}}>
                <StatusBadge status={sel.status}/>
                {sel.strand && <span className="tag tv" style={{fontSize:10.5}}>{sel.strand}</span>}
              </div>
            </div>
          </div>
          <div className="dgrid">
            {[['Grade / Section',gradeLabel(sel)],['Strand',sel.strand||'—'],['GPA',sel.gpa||'—'],['Attendance',`${sel.attendance||0}%`],['Gender',sel.gender],['DOB',formatDate(sel.dob)],['Phone',sel.phone||'—'],['Address',sel.address||'—'],['Parent',sel.parent||'—'],['Parent Phone',sel.parentPhone||'—'],['Fee Status',sel.fees],['Enrolled',formatDate(sel.enrollDate)]].map(([l,v])=>(
              <div key={l}><div className="dlbl">{l}</div><div className="dval">{v||'—'}</div></div>
            ))}
          </div>
          <>
            <div style={{marginTop:16,padding:12,background:'var(--sur2)',borderRadius:10,border:'1px solid var(--bdr)'}}>
                <div className="dlbl" style={{marginBottom:8}}>SHS Enrollment Details</div>
                <div className="dgrid">
                  {[['LRN',sel.lrn||'—'],['Semester',sel.semester||'—'],['School Year',sel.schoolYear||'—'],['Enrollment Type',sel.enrollmentType||'—']].map(([l,v])=>(
                    <div key={l}><div className="dlbl">{l}</div><div className="dval">{v}</div></div>
                  ))}
                </div>
              </div>
              {sel.documents && (
                <div style={{marginTop:10,padding:12,background:'var(--sur2)',borderRadius:10,border:'1px solid var(--bdr)'}}>
                  <div className="dlbl" style={{marginBottom:8}}>Documents ({docCount(sel.documents)}/5)</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
                    {[['birthCertificate','PSA Birth Cert'],['form137','Form 137'],['goodMoral','Good Moral'],['reportCard','Report Card'],['idPictures','ID Pictures']].map(([k,l])=>(
                      <div key={k} style={{display:'flex',alignItems:'center',gap:8,fontSize:13}}>
                        <span style={{color:sel.documents?.[k]?'var(--green)':'var(--ink4)'}}><Icon name={sel.documents?.[k]?'check':'close'} size={14}/></span>{l}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {sel.voucher?.hasVoucher && (
                <div style={{marginTop:10,padding:12,background:'#dcfce7',borderRadius:10,border:'1px solid #86efac'}}>
                  <div className="dlbl" style={{marginBottom:4}}>Voucher</div>
                  <div style={{fontSize:14,fontWeight:700}}>{sel.voucher.voucherType} — ₱{Number(sel.voucher.voucherAmount||0).toLocaleString()}</div>
                  <div style={{fontSize:12.5,color:'var(--ink3)',marginTop:2}}>No: {sel.voucher.voucherNo||'—'}</div>
                </div>
              )}
          </>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════
          BATCH ENROLLMENT MODAL
         ══════════════════════════════════════════════════════ */}
      {batchModal && (
        <div className="mo" onClick={e=>e.target===e.currentTarget&&closeBatch()}>
          <div className="mb" style={{maxWidth:640}}>
            <div className="mh">
              <span className="mt">Batch Enrollment via Excel</span>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                {[['1','Upload'],['2','Review'],['3','Done']].map(([n,l],i)=>(
                  <div key={n} style={{display:'flex',alignItems:'center',gap:4}}>
                    <div style={{width:22,height:22,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,background:batchStep===i+1?'var(--red)':batchStep>i+1?'var(--green)':'var(--sur2)',color:batchStep>=i+1?'#fff':'var(--ink4)',transition:'all .2s'}}>
                      {batchStep>i+1?'✓':n}
                    </div>
                    <span style={{fontSize:11,color:batchStep===i+1?'var(--red)':'var(--ink4)',fontWeight:batchStep===i+1?700:400}}>{l}</span>
                    {i<2&&<span style={{color:'var(--bdr2)',fontSize:14}}>›</span>}
                  </div>
                ))}
                <button className="cbtn" style={{marginLeft:10}} onClick={closeBatch}><Icon name="close" size={14}/></button>
              </div>
            </div>

            <div className="mbody">

              {/* Step 1 */}
              {batchStep===1 && (
                <div>
                  <div style={{padding:16,background:'linear-gradient(135deg,var(--ink),var(--ink2))',borderRadius:14,marginBottom:18,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:14.5,color:'#fff'}}>📥 Download Excel Template</div>
                      <div style={{fontSize:12.5,color:'var(--ink3)',marginTop:3}}>Pre-formatted with sample data, columns guide, and instructions sheet</div>
                    </div>
                    <button className="btn" style={{background:'rgba(26,23,20,.08)',color:'#fff',border:'1px solid rgba(255,255,255,.2)',flexShrink:0}} onClick={downloadTemplate}>
                      <Icon name="download" size={15}/>Download Template
                    </button>
                  </div>

                  <div style={{padding:14,background:'var(--sur2)',borderRadius:12,border:'1px solid var(--bdr)',marginBottom:18}}>
                    <div className="dlbl" style={{marginBottom:10}}>Default values for blank Excel cells</div>
                    <div className="fgrid">
                      <div className="fg"><label>Default Grade Level</label>
                        <select className="fsel" value={batchDefaults.gradeLevel} onChange={e=>setBatchDefaults(f=>({...f,gradeLevel:e.target.value}))}>
                          {ALL_GRADES.map(g=><option key={g}>{g}</option>)}
                        </select>
                      </div>
                      <div className="fg"><label>Default Strand (SHS)</label>
                        <select className="fsel" value={batchDefaults.strand} onChange={e=>setBatchDefaults(f=>({...f,strand:e.target.value}))}>
                          <option value="">— Select Strand —</option>
                          {STRANDS.map(s=><option key={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="fg"><label>Default Semester</label>
                        <select className="fsel" value={batchDefaults.semester} onChange={e=>setBatchDefaults(f=>({...f,semester:e.target.value}))}>
                          <option>1st Semester</option><option>2nd Semester</option>
                        </select>
                      </div>
                      <div className="fg"><label>Default School Year</label>
                        <select className="fsel" value={batchDefaults.schoolYear} onChange={e=>setBatchDefaults(f=>({...f,schoolYear:e.target.value}))}>
                          {SY.map(s=><option key={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop}
                    onClick={()=>fileRef.current?.click()}
                    style={{border:`2px dashed ${dragOver?'var(--red)':'var(--bdr2)'}`,borderRadius:16,padding:'40px 24px',textAlign:'center',cursor:'pointer',transition:'all .2s',background:dragOver?'var(--sur2)':'var(--sur2)'}}>
                    <div style={{fontSize:48,marginBottom:12}}>📂</div>
                    <div style={{fontWeight:700,fontSize:16,color:'var(--ink)'}}>Drop your Excel file here</div>
                    <div style={{fontSize:13.5,color:'var(--ink3)',marginTop:6}}>or click to browse</div>
                    <div style={{fontSize:12,color:'var(--ink4)',marginTop:8}}>Supports .xlsx · .xls · .csv · Max 500 students</div>
                    <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])}/>
                  </div>
                  {batchErr && <div className="errmsg" style={{marginTop:14}}>{batchErr}</div>}
                </div>
              )}

              {/* Step 2 — Preview & Edit */}
              {batchStep===2 && (
                <div>
                  <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
                    <div style={{flex:1,padding:'11px 14px',background:'#dcfce7',borderRadius:10,border:'1px solid #86efac',textAlign:'center'}}>
                      <div style={{fontWeight:800,fontSize:22,color:'var(--green)'}}>{validCount}</div>
                      <div style={{fontSize:11.5,color:'var(--green)',fontWeight:600}}>Ready</div>
                    </div>
                    {errCount>0&&(
                      <div style={{flex:1,padding:'11px 14px',background:'var(--rosep)',borderRadius:10,border:'1px solid rgba(184,38,74,.25)',textAlign:'center'}}>
                        <div style={{fontWeight:800,fontSize:22,color:'var(--rose)'}}>{errCount}</div>
                        <div style={{fontSize:11.5,color:'var(--rose)',fontWeight:600}}>Errors</div>
                      </div>
                    )}
                    <div style={{flex:1,padding:'11px 14px',background:'var(--sur2)',borderRadius:10,border:'1px solid var(--bdr3)',textAlign:'center'}}>
                      <div style={{fontWeight:800,fontSize:22,color:'var(--red)'}}>{batchRecords.length}</div>
                      <div style={{fontSize:11.5,color:'var(--red)',fontWeight:600}}>Total</div>
                    </div>
                  </div>
                  {batchErr && <div className="errmsg" style={{marginBottom:12}}>{batchErr}</div>}
                  <div style={{fontSize:12.5,color:'var(--ink3)',marginBottom:8}}>Edit any field before enrolling. Red rows will be skipped.</div>

                  <div style={{overflowX:'auto',maxHeight:360,overflowY:'auto',border:'1px solid var(--bdr)',borderRadius:12}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5,minWidth:700}}>
                      <thead style={{position:'sticky',top:0,zIndex:1}}>
                        <tr style={{background:'var(--sur2)'}}>
                          {['#','Name','Email','Grade','Strand','Section','Type','✓'].map(h=>(
                            <th key={h} style={{padding:'8px 10px',textAlign:'left',borderBottom:'1px solid var(--bdr)',fontSize:10,fontWeight:700,color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.05em'}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {batchRecords.map((rec,i)=>(
                          <tr key={i} style={{background:!rec._valid?'var(--rosep)':i%2===0?'transparent':'var(--sur2)',borderBottom:'1px solid var(--bdr)'}}>
                            <td style={{padding:'5px 10px',color:'var(--ink4)',fontSize:11}}>{rec._row}</td>
                            <td style={{padding:'4px 6px'}}>
                              <input value={rec.name} onChange={e=>editRec(i,'name',e.target.value)}
                                style={{border:'1px solid var(--bdr)',borderRadius:6,padding:'4px 8px',fontSize:12.5,width:140,color:rec._valid?'var(--ink)':'var(--rose)',outline:'none',background:'transparent'}}/>
                              {rec._errors?.map((e,ei)=><div key={ei} style={{fontSize:10,color:'var(--rose)'}}>{e}</div>)}
                            </td>
                            <td style={{padding:'4px 6px'}}>
                              <input value={rec.email} onChange={e=>editRec(i,'email',e.target.value)}
                                style={{border:'1px solid var(--bdr)',borderRadius:6,padding:'4px 8px',fontSize:12,width:150,outline:'none',background:'transparent'}}/>
                            </td>
                            <td style={{padding:'4px 6px'}}>
                              <select value={rec._shs?.gradeLevel||'Grade 11'} onChange={e=>editRec(i,'_shs',{...rec._shs,gradeLevel:e.target.value})}
                                style={{border:'1px solid var(--bdr)',borderRadius:6,padding:'4px 6px',fontSize:12,outline:'none',background:'transparent'}}>
                                {ALL_GRADES.map(g=><option key={g}>{g}</option>)}
                              </select>
                            </td>
                            <td style={{padding:'4px 6px'}}>
                              <select value={rec._shs?.strand||''} onChange={e=>editRec(i,'_shs',{...rec._shs,strand:e.target.value})}
                                style={{border:'1px solid var(--bdr)',borderRadius:6,padding:'4px 6px',fontSize:12,outline:'none',background:'transparent'}}>
                                <option value="">—</option>
                                {STRANDS.map(s=><option key={s}>{s}</option>)}
                              </select>
                            </td>
                            <td style={{padding:'4px 6px',fontSize:12,color:'var(--ink3)'}}>{rec._shs?.section||rec.grade||'—'}</td>
                            <td style={{padding:'4px 6px'}}>
                              <select value={rec._shs?.enrollmentType||'New'} onChange={e=>editRec(i,'_shs',{...rec._shs,enrollmentType:e.target.value})}
                                style={{border:'1px solid var(--bdr)',borderRadius:6,padding:'4px 6px',fontSize:12,outline:'none',background:'transparent'}}>
                                {['New','Returnee','Transferee','Continuing'].map(t=><option key={t}>{t}</option>)}
                              </select>
                            </td>
                            <td style={{padding:'4px 8px',textAlign:'center'}}>
                              {rec._valid
                                ? <span style={{color:'var(--green)',fontSize:16,fontWeight:700}}>✓</span>
                                : <button className="btn btnx" style={{padding:'2px 6px',fontSize:10,lineHeight:1.2}} onClick={()=>removeRec(i)}>✕</button>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{marginTop:12,display:'flex',gap:8,justifyContent:'space-between',alignItems:'center',flexWrap:'wrap'}}>
                    <button className="btn btno bsm" onClick={()=>{setBatchStep(1);setBatchErr('');}}>← Re-upload</button>
                    <button className="btn btnp" onClick={submitBatch} disabled={batchSaving||validCount===0}>
                      {batchSaving
                        ? <><span style={{width:14,height:14,border:'2px solid rgba(255,255,255,.4)',borderTopColor:'#fff',borderRadius:'50%',display:'inline-block',animation:'spin .65s linear infinite',marginRight:6}}/> Enrolling…</>
                        : <><Icon name="students" size={15}/>Enroll {validCount} Students</>
                      }
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3 — Results */}
              {batchStep===3 && batchResult && (
                <div style={{textAlign:'center',padding:'24px 0'}}>
                  <div style={{fontSize:52,marginBottom:14}}>{batchResult.failed===0?'🎉':'⚠️'}</div>
                  <div style={{fontSize:22,fontWeight:800,color:'var(--ink)',marginBottom:6}}>
                    {batchResult.failed===0?'All Students Enrolled!':'Enrollment Completed'}
                  </div>
                  <div style={{display:'flex',gap:14,justifyContent:'center',margin:'20px 0',flexWrap:'wrap'}}>
                    <div style={{padding:'16px 24px',background:'#dcfce7',borderRadius:14,border:'1px solid #86efac',minWidth:110}}>
                      <div style={{fontSize:34,fontWeight:900,color:'var(--green)'}}>{batchResult.success}</div>
                      <div style={{fontSize:12.5,color:'var(--green)',fontWeight:600,marginTop:3}}>Enrolled</div>
                    </div>
                    {batchResult.failed>0&&(
                      <div style={{padding:'16px 24px',background:'var(--rosep)',borderRadius:14,border:'1px solid rgba(184,38,74,.25)',minWidth:110}}>
                        <div style={{fontSize:34,fontWeight:900,color:'var(--rose)'}}>{batchResult.failed}</div>
                        <div style={{fontSize:12.5,color:'var(--rose)',fontWeight:600,marginTop:3}}>Failed</div>
                      </div>
                    )}
                  </div>
                  {batchResult.errors?.length>0&&(
                    <div style={{background:'var(--rosep)',borderRadius:12,padding:14,border:'1px solid rgba(184,38,74,.25)',maxHeight:160,overflowY:'auto',textAlign:'left',marginBottom:16}}>
                      <div style={{fontWeight:700,fontSize:13,color:'var(--rose)',marginBottom:8}}>Failed Records:</div>
                      {batchResult.errors.map((e,i)=>(
                        <div key={i} style={{fontSize:12.5,color:'var(--rose)',padding:'3px 0',borderBottom:'1px solid #fecaca'}}>
                          <strong>{e.name}</strong> — {e.error}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                    <button className="btn btno" onClick={resetBatch}>Enroll Another Batch</button>
                    <button className="btn btnp" onClick={closeBatch}>Done</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

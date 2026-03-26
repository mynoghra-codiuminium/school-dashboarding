import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { Icon, Modal, Spinner } from '../components/UI';

const STRANDS = ['STEM','ABM','HUMSS','GAS','TVL','Sports','Arts & Design'];
const DAYS    = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DAY_SHORT = { Monday:'Mon', Tuesday:'Tue', Wednesday:'Wed', Thursday:'Thu', Friday:'Fri', Saturday:'Sat', Sunday:'Sun' };
const HOURS   = ['6','7','8','9','10','11','12','1','2','3','4','5','6','7','8','9'];
const MINS    = ['00','05','10','15','20','25','30','35','40','45','50','55'];
const AMPM    = ['AM','PM'];

const STRAND_COLORS = {
  STEM:'#2563eb', ABM:'#059669', HUMSS:'#7c3aed',
  GAS:'#d97706', TVL:'#ea580c', Sports:'#0284c7', 'Arts & Design':'#e11d48',
};
const FALLBACK_COLS = ['#2563eb','#0d9488','#d97706','#e11d48','#7c3aed','#ea580c','#059669','#0284c7'];
const cardColor = (c) => STRAND_COLORS[c.strand] || FALLBACK_COLS[c.name?.charCodeAt(0) % FALLBACK_COLS.length] || '#2563eb';

// ── Format a single schedule slot ─────────────────────────────
const fmtSlot = (s) => `${s.day}  ${s.startH}:${s.startM} ${s.startAP} – ${s.endH}:${s.endM} ${s.endAP}`;

// ── Convert slots array → display string ──────────────────────
const slotsToString = (slots) => slots.map(fmtSlot).join(' | ');

// ── Default new slot ──────────────────────────────────────────
const newSlot = (day = 'Monday') => ({
  id: Date.now() + Math.random(),
  day,
  startH:'7', startM:'30', startAP:'AM',
  endH:'8',   endM:'20',   endAP:'AM',
});

// ── Parse saved schedule string back to slots ─────────────────
function parseSlots(str) {
  if (!str) return [newSlot()];
  try {
    return str.split(' | ').map((part, i) => {
      // "Monday  7:30 AM – 8:20 AM"
      const m = part.match(/(\w+)\s+(\d+):(\d+)\s*(AM|PM)\s*[–-]\s*(\d+):(\d+)\s*(AM|PM)/i);
      if (!m) return newSlot();
      return { id: i, day: m[1], startH: m[2], startM: m[3], startAP: m[4].toUpperCase(), endH: m[5], endM: m[6], endAP: m[7].toUpperCase() };
    });
  } catch { return [newSlot()]; }
}

const EMPTY = {
  name:'', grade:'11', section:'', strand:'STEM',
  teacher:'', room:'', capacity:40,
  schedule:'', slots:[newSlot()],
};

// ── Per-slot row ───────────────────────────────────────────────
function SlotRow({ slot, onUpdate, onRemove, showRemove }) {
  const upd = (k, v) => onUpdate({ ...slot, [k]: v });

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:8, flexWrap:'wrap',
      padding:'12px 14px', borderRadius:12,
      background:'var(--sur2)', border:'1px solid var(--bdr)',
      marginBottom:10, position:'relative',
    }}>
      {/* Day */}
      <div style={{ display:'flex', flexDirection:'column', gap:3, flex:'0 0 auto' }}>
        <span style={{ fontSize:10, fontWeight:700, color:'var(--ink4)', textTransform:'uppercase', letterSpacing:'.06em' }}>Day</span>
        <select
          className="fsel"
          value={slot.day}
          onChange={e => upd('day', e.target.value)}
          style={{ minWidth:118 }}
        >
          {DAYS.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>

      {/* Divider */}
      <div style={{ width:1, height:44, background:'var(--bdr)', flexShrink:0, alignSelf:'flex-end', marginBottom:2 }}/>

      {/* Start time */}
      <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
        <span style={{ fontSize:10, fontWeight:700, color:'var(--ink4)', textTransform:'uppercase', letterSpacing:'.06em' }}>Start</span>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <select className="fsel" style={{ width:60 }} value={slot.startH} onChange={e => upd('startH', e.target.value)}>
            {HOURS.map((h,i) => <option key={i} value={h}>{h}</option>)}
          </select>
          <span style={{ fontWeight:700, color:'var(--ink3)' }}>:</span>
          <select className="fsel" style={{ width:64 }} value={slot.startM} onChange={e => upd('startM', e.target.value)}>
            {MINS.map(m => <option key={m}>{m}</option>)}
          </select>
          <select className="fsel" style={{ width:64 }} value={slot.startAP} onChange={e => upd('startAP', e.target.value)}>
            {AMPM.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Arrow */}
      <div style={{ color:'var(--ink4)', fontWeight:700, fontSize:16, alignSelf:'flex-end', marginBottom:6, flexShrink:0 }}>→</div>

      {/* End time */}
      <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
        <span style={{ fontSize:10, fontWeight:700, color:'var(--ink4)', textTransform:'uppercase', letterSpacing:'.06em' }}>End</span>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <select className="fsel" style={{ width:60 }} value={slot.endH} onChange={e => upd('endH', e.target.value)}>
            {HOURS.map((h,i) => <option key={i} value={h}>{h}</option>)}
          </select>
          <span style={{ fontWeight:700, color:'var(--ink3)' }}>:</span>
          <select className="fsel" style={{ width:64 }} value={slot.endM} onChange={e => upd('endM', e.target.value)}>
            {MINS.map(m => <option key={m}>{m}</option>)}
          </select>
          <select className="fsel" style={{ width:64 }} value={slot.endAP} onChange={e => upd('endAP', e.target.value)}>
            {AMPM.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Preview badge */}
      <div style={{ marginLeft:'auto', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
        <div style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:'var(--sur2)', color:'var(--red)', border:'1px solid var(--bdr3)', whiteSpace:'nowrap' }}>
          {DAY_SHORT[slot.day]}  {slot.startH}:{slot.startM} {slot.startAP} – {slot.endH}:{slot.endM} {slot.endAP}
        </div>
        {showRemove && (
          <button
            type="button"
            className="btn btnx bsm"
            onClick={onRemove}
            style={{ fontSize:11, padding:'3px 10px' }}
          >
            <Icon name="trash" size={12}/> Remove
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
export default function Classes() {
  const [rows,     setRows]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [modal,    setModal]    = useState(null);
  const [sel,      setSel]      = useState(null);
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [cls, tch] = await Promise.all([api.get('/classes'), api.get('/teachers')]);
      setRows(cls.data || []);
      setTeachers(tch.data || []);
    } catch { setErr('Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setForm({ ...EMPTY, slots: [newSlot()] });
    setSel(null); setModal('form');
  };

  const openEdit = (c) => {
    const slots = parseSlots(c.schedule);
    setForm({ ...EMPTY, ...c, grade: String(c.grade || '11'), slots });
    setSel(c); setModal('form');
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-build class name
  const autoName = (grade, section, strand) => {
    if (!grade || !section) return '';
    return strand
      ? `${grade}-${strand.replace(/\s+/g,'').toUpperCase().slice(0,3)}-${section}`
      : `${grade}-${section}`;
  };

  // Slots handlers
  const updateSlot  = (id, updated) => setForm(f => ({ ...f, slots: f.slots.map(s => s.id === id ? updated : s) }));
  const removeSlot  = (id)          => setForm(f => ({ ...f, slots: f.slots.filter(s => s.id !== id) }));
  const addSlot     = ()            => {
    setForm(f => {
      // suggest next day after the last one
      const usedDays = f.slots.map(s => s.day);
      const nextDay  = DAYS.find(d => !usedDays.includes(d)) || 'Monday';
      return { ...f, slots: [...f.slots, newSlot(nextDay)] };
    });
  };

  const save = async () => {
    if (!form.section)         { setErr('Section is required'); return; }
    if (!form.slots.length)    { setErr('Add at least one schedule slot'); return; }
    setSaving(true); setErr('');
    try {
      const scheduleStr = slotsToString(form.slots);
      const name        = form.name || autoName(form.grade, form.section, form.strand);
      const payload = {
        name, grade: Number(form.grade), section: form.section,
        strand: form.strand, teacher: form.teacher,
        room: form.room, capacity: Number(form.capacity) || 40,
        schedule: scheduleStr,
      };
      if (sel) await api.put(`/classes/${sel._id}`, payload);
      else     await api.post('/classes', payload);
      setModal(null); load();
    } catch (e) { setErr(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this class?')) return;
    try { await api.delete(`/classes/${id}`); load(); } catch { setErr('Delete failed'); }
  };

  // Format schedule for display on card — split by pipe for multi-day
  const renderSchedule = (schedule) => {
    if (!schedule) return null;
    const parts = schedule.split(' | ');
    return (
      <div style={{ marginTop:6 }}>
        {parts.map((p, i) => (
          <div key={i} style={{ color:'var(--ink3)', fontSize:11.5, lineHeight:1.7 }}>
            🕐 {p.trim()}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fu">
      <div className="toolbar">
        <div className="sp"/>
        <button className="btn btnp" onClick={openAdd}><Icon name="plus" size={15}/>Add Class</button>
      </div>
      {err && <div className="errmsg" style={{ marginBottom:14 }}>{err}</div>}

      {loading ? <Spinner /> : (
        <div className="g3">
          {rows.map(c => (
            <div key={c._id} className="card si" style={{ overflow:'hidden' }}>
              <div style={{ background: cardColor(c), padding:'16px 18px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ color:'#fff', fontWeight:900, fontSize:20, letterSpacing:'-.5px' }}>{c.name}</div>
                  <div style={{ color:'var(--ink2)', fontSize:12, marginTop:3 }}>
                    Grade {c.grade}{c.strand ? ` · ${c.strand}` : ''} · Section {c.section}
                  </div>
                  {renderSchedule(c.schedule)}
                </div>
                <div style={{ display:'flex', gap:5, flexShrink:0, marginLeft:8 }}>
                  <button className="btn bsm bico" style={{ background:'rgba(26,23,20,.1)', color:'#fff', border:'none' }} onClick={() => openEdit(c)}><Icon name="edit" size={13}/></button>
                  <button className="btn bsm bico" style={{ background:'rgba(26,23,20,.1)', color:'#fff', border:'none' }} onClick={() => del(c._id)}><Icon name="trash" size={13}/></button>
                </div>
              </div>
              <div style={{ padding:'14px 18px' }}>
                <div style={{ fontSize:13, color:'var(--ink3)', marginBottom:3 }}><strong style={{ color:'var(--ink2)' }}>Teacher:</strong> {c.teacher || '—'}</div>
                <div style={{ fontSize:13, color:'var(--ink3)', marginBottom:12 }}><strong style={{ color:'var(--ink2)' }}>Room:</strong> {c.room || '—'}</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12, textAlign:'center' }}>
                  {[['Students', c.students||0], ['Capacity', c.capacity||0], ['Available', (c.capacity||0)-(c.students||0)]].map(([l,v]) => (
                    <div key={l} style={{ background:'var(--sur2)', borderRadius:8, padding:'8px 4px', border:'1px solid var(--bdr)' }}>
                      <div style={{ fontWeight:800, fontSize:18, color:'var(--ink)' }}>{v}</div>
                      <div style={{ fontSize:11, color:'var(--ink4)', marginTop:2 }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div className="pbar">
                  <div className="pfill" style={{ width:`${Math.min(((c.students||0)/(c.capacity||1))*100,100)}%`, background:(c.students||0)/(c.capacity||1)>.85?'var(--rose)':cardColor(c) }}/>
                </div>
                <div style={{ fontSize:11, color:'var(--ink4)', marginTop:4 }}>{Math.round(((c.students||0)/(c.capacity||1))*100)}% capacity used</div>
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <div style={{ gridColumn:'1/-1' }}>
              <div className="empty">
                <div className="empty-ico"><Icon name="classes" size={24}/></div>
                <div className="empty-t">No classes yet</div>
                <div className="empty-s">Click "Add Class" to get started</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          ADD / EDIT MODAL
         ══════════════════════════════════════════════════════ */}
      {modal === 'form' && (
        <Modal
          title={sel ? `Edit — ${sel.name}` : 'Add Class'}
          onClose={() => { setModal(null); setErr(''); }}
          footer={
            <>
              <button className="btn btno" onClick={() => { setModal(null); setErr(''); }}>Cancel</button>
              <button className="btn btnp" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Class'}</button>
            </>
          }
        >
          {err && <div className="errmsg">{err}</div>}

          {/* ── Class Details ── */}
          <div className="fgrid" style={{ marginBottom:20 }}>

            <div className="fg">
              <label>Grade Level</label>
              <select className="fsel" value={form.grade||'11'} onChange={e => {
                set('grade', e.target.value);
                set('name', autoName(e.target.value, form.section, form.strand));
              }}>
                <option value="11">Grade 11</option>
                <option value="12">Grade 12</option>
              </select>
            </div>

            <div className="fg">
              <label>Strand</label>
              <select className="fsel" value={form.strand||''} onChange={e => {
                set('strand', e.target.value);
                set('name', autoName(form.grade, form.section, e.target.value));
              }}>
                <option value="">— Select Strand —</option>
                {STRANDS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div className="fg">
              <label>Section <span style={{ fontSize:10.5, color:'var(--ink4)', fontWeight:400 }}>(e.g. A, Einstein…)</span></label>
              <input className="fi" value={form.section||''} onChange={e => {
                set('section', e.target.value);
                set('name', autoName(form.grade, e.target.value, form.strand));
              }} placeholder="Type section name…"/>
            </div>

            <div className="fg">
              <label>Class Name <span style={{ fontSize:10.5, color:'var(--ink4)', fontWeight:400 }}>(auto-filled)</span></label>
              <input className="fi" value={form.name||''} onChange={e => set('name', e.target.value)} placeholder="e.g. 11-STEM-A"/>
            </div>

            <div className="fg">
              <label>Room / Lab</label>
              <input className="fi" value={form.room||''} onChange={e => set('room', e.target.value)} placeholder="e.g. Room 301"/>
            </div>

            <div className="fg">
              <label>Capacity</label>
              <input className="fi" type="number" min="1" value={form.capacity||40} onChange={e => set('capacity', Number(e.target.value))}/>
            </div>

            <div className="fg fg-full">
              <label>Class Teacher</label>
              <select className="fsel" value={form.teacher||''} onChange={e => set('teacher', e.target.value)}>
                <option value="">— Unassigned —</option>
                {teachers.map(t => <option key={t._id} value={t.name}>{t.name}{t.subject ? ` — ${t.subject}` : ''}</option>)}
              </select>
              {teachers.length === 0 && <div style={{ fontSize:12, color:'var(--ink4)', marginTop:4 }}>No teachers yet. Add teachers in the Teachers page first.</div>}
            </div>
          </div>

          {/* ── Schedule Slots ── */}
          <div style={{ borderTop:'1px solid var(--bdr)', paddingTop:18 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:14, color:'var(--ink)' }}>📅 Class Schedule</div>
                <div style={{ fontSize:12.5, color:'var(--ink4)', marginTop:2 }}>Set a different time for each day if needed</div>
              </div>
              <button type="button" className="btn btno bsm" onClick={addSlot}>
                <Icon name="plus" size={13}/> Add Day
              </button>
            </div>

            {/* Slot rows */}
            {form.slots.map(slot => (
              <SlotRow
                key={slot.id}
                slot={slot}
                onUpdate={updated => updateSlot(slot.id, updated)}
                onRemove={() => removeSlot(slot.id)}
                showRemove={form.slots.length > 1}
              />
            ))}

            {/* Full schedule preview */}
            {form.slots.length > 0 && (
              <div style={{ marginTop:4, padding:'12px 14px', background:'linear-gradient(135deg,var(--ink),var(--ink2))', borderRadius:12 }}>
                <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--ink4)', marginBottom:8 }}>Schedule Preview</div>
                {form.slots.map((s, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom: i < form.slots.length-1 ? 6 : 0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#fff', minWidth:90 }}>{s.day}</div>
                    <div style={{ fontSize:12, color:'var(--ink3)' }}>
                      {s.startH}:{s.startM} {s.startAP} – {s.endH}:{s.endM} {s.endAP}
                    </div>
                    <div style={{ marginLeft:'auto', fontSize:11, color:'var(--ink4)', fontWeight:500 }}>
                      {/* Compute duration */}
                      {(() => {
                        try {
                          const to24 = (h,m,ap) => { let hh=parseInt(h); if(ap==='PM'&&hh!==12)hh+=12; if(ap==='AM'&&hh===12)hh=0; return hh*60+parseInt(m); };
                          const diff = to24(s.endH,s.endM,s.endAP) - to24(s.startH,s.startM,s.startAP);
                          if(diff<=0)return null;
                          const hrs=Math.floor(diff/60), mins=diff%60;
                          return hrs>0 ? `${hrs}h ${mins>0?mins+'m':''}` : `${mins}m`;
                        } catch { return null; }
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

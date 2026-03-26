import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login }   = useAuth();
  const navigate    = useNavigate();
  const [form, setForm]   = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try { await login(form.email, form.password); navigate('/'); }
    catch (err) { setError(err.response?.data?.message || 'Invalid credentials.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-pg">

      {/* Left panel */}
      <div className="login-l">
        {/* Vertical red stripe */}
        <div style={{position:'absolute',top:0,left:0,bottom:0,width:4,background:'var(--red)',zIndex:2}}/>

        {/* Ghost headline */}
        <div style={{
          position:'absolute',top:'50%',left:'50%',
          transform:'translate(-50%,-50%) rotate(-10deg)',
          fontFamily:"'Fraunces',serif",fontSize:'clamp(72px,12vw,144px)',
          fontWeight:900,color:'rgba(245,242,236,.04)',letterSpacing:'-.04em',
          whiteSpace:'nowrap',userSelect:'none',pointerEvents:'none',lineHeight:1,
        }}>EduSys</div>

        {/* Stamp badge */}
        <div style={{
          position:'absolute',top:44,right:44,width:84,height:84,
          border:'3px solid rgba(200,57,28,.4)',
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
          transform:'rotate(8deg)',
        }}>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:7.5,fontWeight:700,color:'rgba(200,57,28,.55)',letterSpacing:'.2em',textTransform:'uppercase',textAlign:'center',lineHeight:1.7}}>
            DepEd<br/>K–12<br/>Compliant
          </div>
        </div>

        {/* Bottom content */}
        <div style={{position:'relative',zIndex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:13,marginBottom:28}}>
            <div style={{width:44,height:44,border:'2px solid var(--red)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--red)',position:'relative'}}>
              <div style={{position:'absolute',inset:-5,border:'1px solid rgba(200,57,28,.3)'}}/>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
            </div>
            <div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:24,fontWeight:900,color:'#f5f2ec',letterSpacing:'-.02em',lineHeight:1}}>EduSys</div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:7.5,color:'rgba(245,242,236,.3)',letterSpacing:'.2em',textTransform:'uppercase',marginTop:4}}>Management Portal</div>
            </div>
          </div>

          <div style={{fontFamily:"'Fraunces',serif",fontSize:40,fontWeight:900,color:'#f5f2ec',letterSpacing:'-.04em',lineHeight:1.05,marginBottom:16}}>
            Senior High<br/>School Portal
          </div>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:10.5,color:'rgba(245,242,236,.38)',lineHeight:1.8,maxWidth:300}}>
            Grades · Attendance · Clearance<br/>Strand Management · DepEd Forms
          </div>

          <div style={{display:'flex',alignItems:'center',gap:10,marginTop:36}}>
            <div style={{width:20,height:2,background:'var(--red)'}}/>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:8.5,color:'rgba(245,242,236,.22)',letterSpacing:'.14em',textTransform:'uppercase'}}>
              Since March 2026
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="login-r">
        <div className="login-form">

          <div style={{marginBottom:30}}>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:8.5,fontWeight:700,color:'var(--red)',letterSpacing:'.2em',textTransform:'uppercase',marginBottom:12,borderBottom:'2px solid var(--red)',paddingBottom:4,display:'inline-block'}}>
              Make it EASY!
            </div>
            <div className="login-h">Welcome<br/>Titans!</div>
            <div className="login-s">Sign in to your account to continue</div>
          </div>

          {error && <div className="errmsg">{error}</div>}

          <form onSubmit={handle} style={{display:'flex',flexDirection:'column',gap:13}}>
            <div className="fg">
              <label>Email address</label>
              <input className="fi" type="email" required autoComplete="email"
                placeholder="admin@school.edu"
                value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
            </div>
            <div className="fg">
              <label>Password</label>
              <input className="fi" type="password" required autoComplete="current-password"
                placeholder="••••••••"
                value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/>
            </div>
            <button type="submit" disabled={loading} className="btnp"
              style={{marginTop:8,justifyContent:'center',padding:'11px 24px',fontSize:12}}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>

          <div className="login-ft" style={{marginTop:20}}>EduSys · DepEd K–12 SHS Management System</div>
        </div>
      </div>
    </div>
  );
}

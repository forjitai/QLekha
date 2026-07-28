import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { WhatsAppSendBtn, WhatsAppModal } from './components/WhatsAppButton'
import { QuotePDFBar, PDFDemoPage } from './components/PDFButton'
import Dashboard from './pages/Dashboard'
import Billing from './pages/Billing'
import Stock from './pages/Stock'
import CRM from './pages/CRM'

const C = {
  navy:'#0B1F3A', blue:'#1A6FE8', blueLt:'#3B8EFF', teal:'#0EA5A0',
  amber:'#FFB400', green:'#22C55E', red:'#EF4444', bg:'#F0F4F8',
  white:'#fff', g100:'#E8EDF3', g200:'#D1D9E6', g400:'#8A9BB5', g600:'#4A5568',
  bluePale:'rgba(26,111,232,0.08)', purp:'#8B5CF6', g50:'#F8FAFC',
}
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const fmt = (n) => n >= 100000 ? '\u20b9'+(n/100000).toFixed(1)+'L' : n >= 1000 ? '\u20b9'+(n/1000).toFixed(0)+'K' : '\u20b9'+(n||0)

function Splash() {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:C.navy,flexDirection:'column',gap:12}}>
      <div style={{fontFamily:'Syne,sans-serif',fontSize:28,fontWeight:800,color:'#fff'}}>Q<span style={{color:C.blueLt}}>Lekha</span></div>
      <div style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>Loading...</div>
    </div>
  )
}

const NAV = [
  {path:'/dashboard', icon:'&#128202;', label:'Dashboard'},
  {path:'/quotes',    icon:'&#128203;', label:'Quotes'},
  {path:'/billing',   icon:'&#129518;', label:'Billing'},
  {path:'/stock',     icon:'&#128230;', label:'Stock'},
  {path:'/crm',       icon:'&#128100;', label:'CRM'},
  {path:'/analytics', icon:'&#128200;', label:'Analytics'},
  {path:'/settings',  icon:'&#9881;&#65039;', label:'Settings'},
]

export function Layout({ children }) {
  const loc = window.location.pathname
  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden'}}>
      <aside style={{width:240,flexShrink:0,background:C.navy,display:'flex',flexDirection:'column',height:'100vh'}}>
        <div style={{padding:'20px 20px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <a href="/dashboard" style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:800,color:'#fff',textDecoration:'none'}}>
            Q<span style={{color:C.blueLt}}>Lekha</span>
          </a>
        </div>
        <nav style={{padding:12,flex:1}}>
          {NAV.map(n => {
            const active = loc === n.path || (n.path !== '/dashboard' && loc.startsWith(n.path))
            return (
              <a key={n.path} href={n.path}
                style={{display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:8,marginBottom:2,textDecoration:'none',background:active?'rgba(26,111,232,0.2)':'transparent',color:active?'#fff':'rgba(255,255,255,0.5)',fontSize:13,fontWeight:500}}>
                <span style={{fontSize:16}} dangerouslySetInnerHTML={{__html:n.icon}}/>
                <span>{n.label}</span>
              </a>
            )
          })}
          <a href="/pdf-demo"
            style={{display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:8,marginBottom:2,textDecoration:'none',background:loc==='/pdf-demo'?'rgba(26,111,232,0.2)':'transparent',color:loc==='/pdf-demo'?'#fff':'rgba(255,255,255,0.5)',fontSize:13,fontWeight:500}}>
            <span style={{fontSize:16}}>&#128196;</span>
            <span>PDF Demo</span>
          </a>
        </nav>
        <div style={{padding:12,borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          <button onClick={() => supabase.auth.signOut().then(() => { window.location.href = '/auth' })}
            style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:10,borderRadius:8,background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.5)',fontSize:13}}>
            <span>&#128682;</span> Sign Out
          </button>
        </div>
      </aside>
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <header style={{height:60,background:'#fff',borderBottom:'1px solid '+C.g100,display:'flex',alignItems:'center',padding:'0 24px',boxShadow:'0 2px 8px rgba(11,31,58,0.08)'}}>
          <span style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,marginRight:'auto'}}>QLekha</span>
          <a href="/quotes/create" style={{background:C.blue,color:'#fff',textDecoration:'none',padding:'8px 16px',borderRadius:8,fontSize:13,fontWeight:600}}>+ New Quote</a>
        </header>
        <main style={{flex:1,overflowY:'auto',padding:24,background:C.bg}}>{children}</main>
      </div>
    </div>
  )
}

function Landing() {
  return (
    <div style={{minHeight:'100vh',background:C.navy,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,fontFamily:'Inter,sans-serif',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(26,111,232,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(26,111,232,0.05) 1px,transparent 1px)',backgroundSize:'40px 40px'}}/>
      <div style={{position:'relative',zIndex:1,textAlign:'center',maxWidth:600}}>
        <div style={{fontFamily:'Syne,sans-serif',fontSize:56,fontWeight:800,color:'#fff',marginBottom:8,letterSpacing:'-2px'}}>Q<span style={{color:C.blueLt}}>Lekha</span></div>
        <p style={{color:'rgba(255,255,255,0.5)',fontSize:18,marginBottom:12}}>Design. Quote. Close.</p>
        <p style={{color:'rgba(255,255,255,0.35)',fontSize:14,marginBottom:40}}>India&apos;s AI-powered platform for aluminium, UPVC &amp; glass window businesses.</p>
        <div style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap',marginBottom:40}}>
          <a href="/auth" style={{background:C.blue,color:'#fff',textDecoration:'none',padding:'13px 28px',borderRadius:10,fontSize:15,fontWeight:700,fontFamily:'Syne,sans-serif'}}>Get Started Free</a>
          <a href="/dashboard" style={{background:'transparent',border:'1px solid rgba(255,255,255,0.2)',color:'rgba(255,255,255,0.8)',textDecoration:'none',padding:'13px 28px',borderRadius:10,fontSize:15,fontWeight:600}}>View Demo</a>
        </div>
        <div style={{display:'flex',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:'16px 0',justifyContent:'center'}}>
          {[['&#9889;','5 min','Quote time'],['&#128172;','WA','Direct send'],['&#127760;','14+','Languages'],['&#8377;0','Free','To start']].map(([i,v,l]) => (
            <div key={l} style={{flex:1,textAlign:'center',padding:'0 16px',borderRight:'1px solid rgba(255,255,255,0.08)'}}>
              <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:20,fontWeight:500,color:'#fff'}} dangerouslySetInnerHTML={{__html:v}}/>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.5px',marginTop:3}}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Auth() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [cpw, setCpw] = useState('')
  const [otp, setOtp] = useState('')
  const [timer, setTimer] = useState(0)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(1)
  const [ob, setOb] = useState({ company_name:'', owner_name:'', phone:'', city:'', language:'en' })

  useEffect(() => {
    if (timer > 0) { const t = setTimeout(() => setTimer(v => v-1), 1000); return () => clearTimeout(t) }
  }, [timer])

  const clr = () => { setErr(''); setOk('') }
  const upd = (k, v) => setOb(p => ({...p, [k]:v}))
  const LANGS = [
    {c:'en',n:'English'},{c:'hi',n:'\u0939\u093f\u0928\u094d\u0926\u0940'},
    {c:'kn',n:'\u0c95\u0ca8\u0ccd\u0ca8\u0ca1'},{c:'ta',n:'\u0ba4\u0bae\u0bbf\u0bb4\u0bcd'},
    {c:'te',n:'\u0c24\u0c46\u0c32\u0c41\u0c17\u0c41'},{c:'ml',n:'\u0d2e\u0d32\u0d2f\u0d3e\u0d33\u0d02'},
    {c:'gu',n:'\u0a97\u0ac1\u0a9c\u0ab0\u0abe\u0aa4\u0ac0'},{c:'mr',n:'\u092e\u0930\u093e\u0920\u0940'},
  ]
  const IS = {width:'100%',padding:'11px 14px',borderRadius:10,border:'1.5px solid '+C.g200,fontSize:14,fontFamily:'Inter,sans-serif',color:C.navy,background:C.white,outline:'none',marginBottom:16,boxSizing:'border-box'}
  const BS = {width:'100%',padding:'13px',borderRadius:10,border:'none',background:C.blue,color:C.white,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'Syne,sans-serif',display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:4}
  const LS = {fontSize:11,fontWeight:700,color:C.g600,textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:5}
  const Lnk = ({onClick:o, children:c}) => <button onClick={o} style={{background:'none',border:'none',cursor:'pointer',color:C.blue,fontWeight:600,fontSize:13,fontFamily:'Inter,sans-serif'}}>{c}</button>
  const Btn = ({ghost, style:s, ...p}) => <button {...p} style={{...BS,...(ghost?{background:'transparent',border:'1.5px solid '+C.g200,color:C.navy,marginTop:8}:{}),...(s||{})}}/>

  async function login() {
    clr(); if (!email || !pw) return setErr('Enter email and password.')
    setLoading(true)
    const { error:e } = await supabase.auth.signInWithPassword({ email, password:pw })
    setLoading(false)
    if (e) setErr(e.message.includes('Invalid') ? 'Wrong email or password.' : e.message)
    else window.location.href = '/dashboard'
  }

  async function signup() {
    clr(); if (!email || pw.length < 8) return setErr('Email required, min 8 char password.')
    if (pw !== cpw) return setErr('Passwords do not match.')
    setLoading(true)
    const { data, error:e } = await supabase.auth.signUp({ email, password:pw })
    setLoading(false)
    if (e) { setErr(e.message.includes('already') ? 'Email already registered. Please sign in.' : e.message) }
    else { setSignupUser(data.user); setMode('onboard'); setStep(1) }
  }

  async function verify() {
    clr(); const token = otp.replace(/\s/g,'')
    if (token.length !== 6) return setErr('Enter the full 6-digit code.')
    setLoading(true)
    const { error:e } = await supabase.auth.verifyOtp({ email, token, type:'email' })
    setLoading(false)
    if (e) setErr('Incorrect or expired code.')
    else { setSignupUser(data.user); setMode('onboard'); setStep(1) }
  }

  async function finish() {
    clr(); setLoading(true)
    try {
      let user = signupUser
      if (!user) {
        const { data:{ user: u } } = await supabase.auth.getUser()
        user = u
      }
      if (!user) throw new Error('Session not found. Please sign in.')
      const { data:co, error:cE } = await supabase.from('companies').insert({
        name:ob.company_name, owner_name:ob.owner_name, phone:ob.phone, city:ob.city,
        plan:'trial', trial_started_at:new Date().toISOString(),
        plan_expires_at:new Date(Date.now()+14*864e5).toISOString(),
        default_language:ob.language, pdf_design:'classic_blue',
      }).select().single()
      if (cE) throw cE
      const { error:uE } = await supabase.from('users').insert({
        id:user.id, company_id:co.id, name:ob.owner_name,
        email:user.email, phone:ob.phone, role:'owner', language:ob.language,
      })
      if (uE) throw uE
      setLoading(false)
      window.location.href = '/dashboard'
    } catch(e) { setLoading(false); setErr('Setup failed: '+e.message) }
  }

  const pageS = {minHeight:'100vh',background:C.navy,display:'flex',position:'relative',overflow:'hidden',fontFamily:'Inter,sans-serif'}
  const gridS = {position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(26,111,232,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(26,111,232,0.05) 1px,transparent 1px)',backgroundSize:'40px 40px',pointerEvents:'none'}
  const leftS = {flex:1,display:'flex',flexDirection:'column',justifyContent:'center',padding:'60px 80px',position:'relative',zIndex:1}
  const rightS = {width:480,background:C.white,display:'flex',flexDirection:'column',justifyContent:'center',padding:'60px 48px',position:'relative',zIndex:1,minHeight:'100vh',overflowY:'auto'}
  const errS = {background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:8,padding:'10px 14px',fontSize:13,color:C.red,marginBottom:12}
  const okS  = {background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)', borderRadius:8,padding:'10px 14px',fontSize:13,color:C.green,marginBottom:12}

  return (
    <div style={pageS}>
      <div style={gridS}/>
      <div style={leftS}>
        <div style={{fontFamily:'Syne,sans-serif',fontSize:28,fontWeight:800,color:'#fff',marginBottom:40}}>Q<span style={{color:C.blueLt}}>Lekha</span></div>
        <h1 style={{fontFamily:'Syne,sans-serif',fontSize:'clamp(32px,4vw,48px)',fontWeight:800,color:'#fff',lineHeight:1.1,letterSpacing:'-1.5px',marginBottom:16}}>
          {mode==='login' ? <>Welcome<br/>back to<br/><span style={{color:C.blueLt}}>QLekha</span></>
          : mode==='onboard' ? <>Almost<br/>ready,<br/><span style={{color:C.blueLt}}>let&apos;s go</span></>
          : <>Start free<br/>on<br/><span style={{color:C.blueLt}}>QLekha</span></>}
        </h1>
        <p style={{fontSize:15,color:'rgba(255,255,255,0.5)',lineHeight:1.7,maxWidth:380}}>
          {mode==='login' ? 'Your window business, fully organised.' : '14-day free trial. No credit card needed.'}
        </p>
      </div>
      <div style={rightS}>
        {err && <div style={errS}>{err}</div>}
        {ok  && <div style={okS}>{ok}</div>}

        {mode==='login' && <>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:800,color:C.navy,marginBottom:6}}>Sign in</div>
          <div style={{fontSize:13,color:C.g400,marginBottom:20}}>Enter your email and password.</div>
          <label style={LS}>Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" style={IS}/>
          <label style={LS}>Password</label>
          <div style={{position:'relative'}}>
            <input type={show?'text':'password'} value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} placeholder="Your password" style={{...IS,paddingRight:44}}/>
            <button onClick={()=>setShow(v=>!v)} style={{position:'absolute',right:12,top:14,background:'none',border:'none',cursor:'pointer',color:C.g400,fontSize:16,padding:0}}>{show?'\ud83d\ude48':'\ud83d\udc41'}</button>
          </div>
          <div style={{textAlign:'right',marginBottom:14}}><Lnk onClick={()=>{setMode('forgot');clr()}}>Forgot password?</Lnk></div>
          <Btn onClick={login} disabled={loading}>{loading?'\u23f3 Signing in...':'Sign in'}</Btn>
          <div style={{textAlign:'center',marginTop:14,fontSize:13,color:C.g400}}>No account? <Lnk onClick={()=>{setMode('signup');clr()}}>Create one free</Lnk></div>
        </>}

        {mode==='signup' && <>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:800,color:C.navy,marginBottom:6}}>Create account</div>
          <div style={{fontSize:13,color:C.g400,marginBottom:20}}>Free 14-day trial. No credit card needed.</div>
          <label style={LS}>Work Email *</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" style={IS}/>
          <label style={LS}>Password *</label>
          <div style={{position:'relative'}}>
            <input type={show?'text':'password'} value={pw} onChange={e=>setPw(e.target.value)} placeholder="At least 8 characters" style={{...IS,paddingRight:44}}/>
            <button onClick={()=>setShow(v=>!v)} style={{position:'absolute',right:12,top:14,background:'none',border:'none',cursor:'pointer',color:C.g400,fontSize:16,padding:0}}>{show?'\ud83d\ude48':'\ud83d\udc41'}</button>
          </div>
          <label style={LS}>Confirm Password *</label>
          <input type="password" value={cpw} onChange={e=>setCpw(e.target.value)} placeholder="Same again" style={IS}/>
          <Btn onClick={signup} disabled={loading}>{loading?'\u23f3 Creating...':'Create account'}</Btn>
          <div style={{textAlign:'center',marginTop:14,fontSize:13,color:C.g400}}>Already have one? <Lnk onClick={()=>{setMode('login');clr()}}>Sign in</Lnk></div>
        </>}

        {mode==='otp' && <div style={{textAlign:'center'}}>
          <div style={{width:64,height:64,borderRadius:'50%',background:'rgba(26,111,232,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 16px'}}>&#128231;</div>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:800,color:C.navy,marginBottom:6}}>Enter the code</div>
          <div style={{fontSize:13,color:C.g400,marginBottom:20}}>Sent to <strong style={{color:C.navy}}>{email}</strong></div>
          <div style={{display:'flex',gap:10,justifyContent:'center',margin:'20px 0'}}>
            {Array.from({length:6},(_,i)=>(
              <input key={i} type="text" inputMode="numeric" maxLength={1}
                value={otp[i]||''}
                onChange={e=>{const v=e.target.value.replace(/\D/g,'').slice(-1);const arr=(otp+'      ').slice(0,6).split('');arr[i]=v;setOtp(arr.join('').trimEnd());if(v&&i<5)e.target.nextElementSibling?.focus()}}
                onKeyDown={e=>{if(e.key==='Backspace'&&!otp[i]&&i>0)e.target.previousElementSibling?.focus()}}
                style={{width:48,height:56,textAlign:'center',fontSize:22,fontFamily:'JetBrains Mono,monospace',fontWeight:500,borderRadius:10,border:'2px solid '+(otp[i]?C.blue:C.g200),color:C.navy,outline:'none'}}
              />
            ))}
          </div>
          <Btn onClick={verify} disabled={loading}>{loading?'\u23f3 Verifying...':'Verify'}</Btn>
          <div style={{marginTop:14,fontSize:13,color:C.g400}}>
            <button onClick={async()=>{if(timer>0)return;setLoading(true);await supabase.auth.resend({type:'signup',email});setLoading(false);setTimer(60);setOk('New code sent.')}}
              style={{background:'none',border:'none',cursor:timer>0?'default':'pointer',color:timer>0?C.g400:C.blue,fontWeight:600,fontSize:13}}>
              {timer>0?'Resend in '+timer+'s':'Resend code'}
            </button>
          </div>
        </div>}

        {mode==='forgot' && <>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:800,color:C.navy,marginBottom:6}}>Reset password</div>
          <div style={{fontSize:13,color:C.g400,marginBottom:20}}>Enter your email to get a reset link.</div>
          <label style={LS}>Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" style={IS}/>
          <Btn onClick={async()=>{clr();if(!email)return setErr('Enter your email.');setLoading(true);const{error:e}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/auth?reset=1'});setLoading(false);if(e)setErr(e.message);else setOk('Reset link sent to '+email)}} disabled={loading}>
            {loading?'\u23f3 Sending...':'Send reset link'}
          </Btn>
          <div style={{textAlign:'center',marginTop:14}}><Lnk onClick={()=>{setMode('login');clr()}}>Back to sign in</Lnk></div>
        </>}

        {mode==='onboard' && <>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:800,color:C.navy,marginBottom:20}}>Q<span style={{color:C.blueLt}}>Lekha</span> Setup</div>
          <div style={{display:'flex',gap:6,justifyContent:'center',marginBottom:24}}>
            {[1,2,3].map(n=><div key={n} style={{width:step===n?24:8,height:8,borderRadius:100,background:step>n?C.teal:step===n?C.blue:C.g200,transition:'all 0.3s'}}/>)}
          </div>
          {step===1 && <>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:800,color:C.navy,marginBottom:4}}>Your business</div>
            <div style={{fontSize:13,color:C.g400,marginBottom:20}}>Appears on quotes and invoices.</div>
            <label style={LS}>Business Name *</label><input value={ob.company_name} onChange={e=>upd('company_name',e.target.value)} placeholder="Kumar Aluminium Works" style={IS}/>
            <label style={LS}>Your Name *</label><input value={ob.owner_name} onChange={e=>upd('owner_name',e.target.value)} placeholder="Rajesh Kumar" style={IS}/>
            <label style={LS}>Phone *</label><input type="tel" value={ob.phone} onChange={e=>upd('phone',e.target.value)} placeholder="+91 98765 43210" style={IS}/>
            <label style={LS}>City</label><input value={ob.city} onChange={e=>upd('city',e.target.value)} placeholder="Bengaluru" style={IS}/>
            <Btn onClick={()=>ob.company_name&&ob.owner_name&&ob.phone?setStep(2):setErr('Fill required fields.')}>Continue</Btn>
          </>}
          {step===2 && <>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:800,color:C.navy,marginBottom:4}}>Your language</div>
            <div style={{fontSize:13,color:C.g400,marginBottom:16}}>QLekha works in 14 Indian languages.</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:20}}>
              {LANGS.map(l=><div key={l.c} onClick={()=>upd('language',l.c)} style={{padding:'10px',borderRadius:10,border:'2px solid '+(ob.language===l.c?C.blue:C.g100),background:ob.language===l.c?'rgba(26,111,232,0.05)':C.white,cursor:'pointer',textAlign:'center',fontSize:14,fontWeight:600,color:ob.language===l.c?C.blue:C.navy}}>{l.n}</div>)}
            </div>
            <Btn onClick={()=>setStep(3)}>Continue</Btn>
            <Btn ghost onClick={()=>setStep(1)}>Back</Btn>
          </>}
          {step===3 && <>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:800,color:C.navy,marginBottom:4}}>You are all set!</div>
            <div style={{fontSize:13,color:C.g400,marginBottom:20}}>14-day free trial starts now.</div>
            {[['&#127760;',ob.language.toUpperCase()],['&#127970;',ob.company_name]].map(([ic,tx])=>(
              <div key={tx} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:10,background:C.bg,marginBottom:8,fontSize:13}}>
                <span style={{fontSize:18}} dangerouslySetInnerHTML={{__html:ic}}/><span style={{color:C.navy,fontWeight:500}}>{tx}</span>
              </div>
            ))}
            <Btn style={{background:'linear-gradient(135deg,'+C.blue+','+C.teal+')',marginTop:8}} onClick={finish} disabled={loading}>
              {loading?'\u23f3 Setting up...':'\ud83d\ude80 Open Dashboard'}
            </Btn>
            <Btn ghost onClick={()=>setStep(2)}>Back</Btn>
          </>}
        </>}
      </div>
    </div>
  )
}

function Settings() {
  const [tab,setTab]=useState('company');const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [co,setCo]=useState(null);const [usr,setUsr]=useState(null);const [users,setUsers]=useState([]);const [toast,setToast]=useState(null);const [waToken,setWaToken]=useState('');const [waPhone,setWaPhone]=useState('')
  const showToast=(msg,type='success')=>{setToast({msg,type});setTimeout(()=>setToast(null),3000)}
  const upd=(k,v)=>setCo(p=>({...p,[k]:v}))
  useEffect(()=>{async function load(){setLoading(true);const{data:{user}}=await supabase.auth.getUser();if(!user)return setLoading(false);const{data:ud}=await supabase.from('users').select('*,companies(*)').eq('id',user.id).single();if(!ud)return setLoading(false);setUsr(ud);setCo(ud.companies||{});const{data:team}=await supabase.from('users').select('*').eq('company_id',ud.company_id);setUsers(team||[]);setLoading(false)}load()},[])
  const save=async(fields)=>{if(!co?.id)return;setSaving(true);const{error}=await supabase.from('companies').update(fields).eq('id',co.id);setSaving(false);if(error)showToast('Save failed: '+error.message,'error');else showToast('Saved \u2713')}
  const TABS=[{k:'company',i:'&#127962;',l:'Company'},{k:'bank',i:'&#127974;',l:'Bank & GST'},{k:'pdf',i:'&#127912;',l:'PDF'},{k:'wa',i:'&#128172;',l:'WhatsApp'},{k:'users',i:'&#128101;',l:'Users'},{k:'plan',i:'&#9889;',l:'Plan'}]
  const THEMES=[{k:'classic_blue',l:'Classic Blue',c:'#1A6FE8'},{k:'midnight',l:'Midnight',c:'#0B1F3A'},{k:'teal_fresh',l:'Teal Fresh',c:'#0EA5A0'},{k:'amber_warm',l:'Amber Warm',c:'#FFB400'},{k:'forest_green',l:'Forest Green',c:'#16A34A'},{k:'deep_purple',l:'Deep Purple',c:'#7C3AED'}]
  const PLANS=[{k:'trial',l:'Trial',p:'\u20b90',d:'14 days',c:C.g400,f:['5 quotes','1 user']},{k:'starter',l:'Starter',p:'\u20b9499',d:'per month',c:C.blue,f:['50 quotes/mo','WhatsApp']},{k:'growth',l:'Growth',p:'\u20b91,499',d:'per month',c:C.teal,f:['Unlimited quotes','5 users']},{k:'pro',l:'Pro',p:'\u20b93,499',d:'per month',c:C.purp,f:['Everything','15 users','API']}]
  const ROLES=['owner','admin','sales','accounts','workshop','viewer']
  const RC={owner:C.purp,admin:C.blue,sales:C.teal,accounts:C.amber,workshop:C.green,viewer:C.g400}
  const trialDays=co?.plan_expires_at?Math.max(0,Math.ceil((new Date(co.plan_expires_at)-new Date())/(864e5))):0
  const si={width:'100%',padding:'10px 12px',borderRadius:9,border:'1.5px solid '+C.g200,fontSize:13,fontFamily:'Inter,sans-serif',color:C.navy,background:C.white,outline:'none',boxSizing:'border-box',marginBottom:14}
  const lb={fontSize:11,fontWeight:700,color:C.g600,textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:5}
  const sb={padding:'10px 18px',borderRadius:9,border:'none',background:C.blue,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'Syne,sans-serif'}
  if(loading)return<div style={{padding:60,textAlign:'center',color:C.g400}}>\u2699\ufe0f Loading settings...</div>
  return(
    <div style={{display:'flex',gap:20,maxWidth:1100}}>
      {toast&&<div style={{position:'fixed',bottom:24,right:24,background:toast.type==='error'?C.red:C.teal,color:'#fff',padding:'12px 20px',borderRadius:10,fontSize:13,fontWeight:500,zIndex:200,boxShadow:'0 8px 24px rgba(0,0,0,0.15)'}}>{toast.type==='error'?'\u2715':'\u2713'} {toast.msg}</div>}
      <div style={{width:190,flexShrink:0}}>
        <div style={{background:C.white,borderRadius:14,border:'1px solid '+C.g100,overflow:'hidden',marginBottom:12}}>
          {TABS.map(t=>(<button key={t.k} onClick={()=>setTab(t.k)} style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'11px 14px',background:tab===t.k?C.bluePale:'transparent',border:'none',borderLeft:tab===t.k?'3px solid '+C.blue:'3px solid transparent',cursor:'pointer',fontSize:13,fontWeight:tab===t.k?600:400,color:tab===t.k?C.blue:C.g600,textAlign:'left'}}><span dangerouslySetInnerHTML={{__html:t.i}}/>{t.l}</button>))}
        </div>
        <div style={{background:C.navy,borderRadius:12,padding:'14px 16px'}}>
          <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4}}>Plan</div>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:800,color:'#fff'}}>{(PLANS.find(p=>p.k===co?.plan)||PLANS[0]).l}</div>
          {co?.plan==='trial'&&<div style={{fontSize:11,color:C.amber,marginTop:2}}>{trialDays} days left</div>}
          <button onClick={()=>setTab('plan')} style={{marginTop:10,width:'100%',padding:'6px',borderRadius:8,border:'1px solid rgba(255,255,255,0.2)',background:'transparent',color:'rgba(255,255,255,0.7)',fontSize:12,fontWeight:600,cursor:'pointer'}}>Upgrade</button>
        </div>
      </div>
      <div style={{flex:1,minWidth:0}}>
        {tab==='company'&&(<div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,padding:24}}><div style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,marginBottom:4}}>Company Details</div><div style={{fontSize:12,color:C.g400,marginBottom:20}}>Appears on all your quotes and invoices.</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}><div><label style={lb}>Business Name *</label><input value={co?.name||''} onChange={e=>upd('name',e.target.value)} style={si}/><label style={lb}>Owner Name *</label><input value={co?.owner_name||''} onChange={e=>upd('owner_name',e.target.value)} style={si}/><label style={lb}>Phone *</label><input value={co?.phone||''} onChange={e=>upd('phone',e.target.value)} style={si}/><label style={lb}>Email</label><input type="email" value={co?.email||''} onChange={e=>upd('email',e.target.value)} style={si}/></div><div><label style={lb}>Address</label><input value={co?.address||''} onChange={e=>upd('address',e.target.value)} style={si}/><label style={lb}>City</label><input value={co?.city||''} onChange={e=>upd('city',e.target.value)} style={si}/><label style={lb}>State</label><input value={co?.state||''} onChange={e=>upd('state',e.target.value)} style={si}/><label style={lb}>Pincode</label><input value={co?.pincode||''} onChange={e=>upd('pincode',e.target.value)} style={si}/></div></div><div style={{textAlign:'right',paddingTop:16,borderTop:'1px solid '+C.g100}}><button style={sb} onClick={()=>save({name:co.name,owner_name:co.owner_name,phone:co.phone,email:co.email,address:co.address,city:co.city,state:co.state,pincode:co.pincode})} disabled={saving}>{saving?'\u23f3 Saving...':'\u2713 Save Changes'}</button></div></div>)}
        {tab==='bank'&&(<div style={{display:'flex',flexDirection:'column',gap:16}}><div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,padding:24}}><div style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,marginBottom:20}}>GST & Tax</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}><div><label style={lb}>GST Number</label><input value={co?.gst_number||''} onChange={e=>upd('gst_number',e.target.value)} placeholder="29ABCDE1234F1Z5" style={si}/></div><div><label style={lb}>PAN Number</label><input value={co?.pan_number||''} onChange={e=>upd('pan_number',e.target.value)} placeholder="ABCDE1234F" style={si}/></div></div></div><div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,padding:24}}><div style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,marginBottom:20}}>Bank Details</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}><div><label style={lb}>Bank Name</label><input value={co?.bank_name||''} onChange={e=>upd('bank_name',e.target.value)} style={si}/><label style={lb}>Account Number</label><input value={co?.account_number||''} onChange={e=>upd('account_number',e.target.value)} style={si}/><label style={lb}>IFSC Code</label><input value={co?.ifsc_code||''} onChange={e=>upd('ifsc_code',e.target.value)} style={si}/></div><div><label style={lb}>Account Holder</label><input value={co?.account_holder||''} onChange={e=>upd('account_holder',e.target.value)} style={si}/><label style={lb}>UPI ID</label><input value={co?.upi_id||''} onChange={e=>upd('upi_id',e.target.value)} style={si}/></div></div><div style={{textAlign:'right',paddingTop:16,borderTop:'1px solid '+C.g100}}><button style={sb} onClick={()=>save({gst_number:co.gst_number,pan_number:co.pan_number,bank_name:co.bank_name,account_number:co.account_number,ifsc_code:co.ifsc_code,account_holder:co.account_holder,upi_id:co.upi_id})} disabled={saving}>{saving?'\u23f3 Saving...':'\u2713 Save'}</button></div></div></div>)}
        {tab==='pdf'&&(<div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,padding:24}}><div style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,marginBottom:20}}>PDF Design</div><label style={lb}>Colour Theme</label><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20}}>{THEMES.map(t=>(<div key={t.k} onClick={()=>upd('pdf_design',t.k)} style={{borderRadius:12,border:'2px solid '+(co?.pdf_design===t.k?t.c:C.g100),overflow:'hidden',cursor:'pointer'}}><div style={{height:50,background:'linear-gradient(135deg,'+t.c+'22,'+t.c+'55)',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:30,height:30,borderRadius:6,background:t.c,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Syne,sans-serif',fontSize:12,fontWeight:800,color:'#fff'}}>Q</div></div><div style={{padding:'8px 10px'}}><div style={{fontSize:11,fontWeight:700,color:C.navy}}>{t.l}</div></div></div>))}</div><label style={lb}>Installation Rate (Rs./sqft)</label><input type="number" value={co?.installation_sqft||''} onChange={e=>upd('installation_sqft',e.target.value)} placeholder="0" style={si}/><label style={lb}>Quote Terms</label><textarea value={co?.terms_quotation||''} onChange={e=>upd('terms_quotation',e.target.value)} placeholder="1. Prices valid 15 days" style={{...si,resize:'vertical',minHeight:80}}/><label style={lb}>Invoice Terms</label><textarea value={co?.terms_billing||''} onChange={e=>upd('terms_billing',e.target.value)} placeholder="1. Payment due 30 days" style={{...si,resize:'vertical',minHeight:80}}/><div style={{textAlign:'right',paddingTop:16,borderTop:'1px solid '+C.g100}}><a href="/pdf-demo" style={{display:'inline-flex',alignItems:'center',gap:6,padding:'9px 16px',borderRadius:9,border:'1px solid '+C.g100,background:C.white,color:C.navy,textDecoration:'none',fontSize:13,fontWeight:600,marginRight:10}}>Preview PDF</a><button style={sb} onClick={()=>save({pdf_design:co.pdf_design,installation_sqft:co.installation_sqft,terms_quotation:co.terms_quotation,terms_billing:co.terms_billing})} disabled={saving}>{saving?'\u23f3 Saving...':'\u2713 Save'}</button></div></div>)}
        {tab==='wa'&&(<div style={{display:'flex',flexDirection:'column',gap:16}}><div style={{background:waToken?'linear-gradient(135deg,#064e3b,#065f46)':C.navy,borderRadius:16,padding:20,display:'flex',alignItems:'center',gap:14}}><span style={{fontSize:28}}>&#128172;</span><div style={{flex:1}}><div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,color:'#fff'}}>{waToken?'WhatsApp API Connected':'WhatsApp Not Configured'}</div><div style={{fontSize:12,color:'rgba(255,255,255,0.5)',marginTop:2}}>{waToken?'Sending via Meta Cloud API':'Using wa.me links'}</div></div><span style={{fontSize:24}}>{waToken?'\u2705':'\u26a0\ufe0f'}</span></div><div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,padding:24}}><div style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,marginBottom:4}}>API Configuration</div><div style={{fontSize:12,color:C.g400,marginBottom:20}}>From developers.facebook.com then WhatsApp then API Setup</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}><div><label style={lb}>WhatsApp Access Token</label><input type="password" value={waToken} onChange={e=>setWaToken(e.target.value)} placeholder="EAAxxxxx..." style={si}/></div><div><label style={lb}>Phone Number ID</label><input value={waPhone} onChange={e=>setWaPhone(e.target.value)} placeholder="1234567890123" style={si}/></div></div><button onClick={async()=>{if(!waToken||!waPhone)return showToast('Enter token and phone ID','error');try{const r=await fetch('https://graph.facebook.com/v19.0/'+waPhone,{headers:{'Authorization':'Bearer '+waToken}});const d=await r.json();if(d.id)showToast('Connected \u2713 \u2014 '+(d.display_phone_number||d.id));else showToast(d.error?.message||'Failed','error')}catch(e){showToast('Failed: '+e.message,'error')}}} style={{...sb,background:'#075E54'}}>&#128172; Test Connection</button></div><div style={{background:'rgba(37,211,102,0.04)',border:'1px solid rgba(37,211,102,0.2)',borderRadius:14,padding:18}}><div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,color:'#065f46',marginBottom:6}}>Without API Token</div><div style={{fontSize:12,color:'#065f46',lineHeight:1.7}}>All buttons open wa.me links with pre-filled text. Works perfectly for most businesses.</div></div></div>)}
        {tab==='users'&&(<div style={{display:'flex',flexDirection:'column',gap:16}}><div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,overflow:'hidden'}}><div style={{padding:'16px 20px',borderBottom:'1px solid '+C.g100}}><div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700}}>Team Members</div></div>{users.map((u,i)=>(<div key={u.id} style={{display:'flex',alignItems:'center',gap:12,padding:'13px 20px',borderBottom:i<users.length-1?'1px solid '+C.g50:'none'}}><div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,'+C.blue+','+C.teal+')',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,color:'#fff',flexShrink:0}}>{(u.name||u.email||'?')[0].toUpperCase()}</div><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:C.navy}}>{u.name||'Unnamed'}</div><div style={{fontSize:11,color:C.g400}}>{u.email||u.phone}</div></div><span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:100,background:(RC[u.role]||C.g400)+'20',color:RC[u.role]||C.g400,textTransform:'capitalize'}}>{u.role}</span>{u.id===usr?.id?<span style={{fontSize:11,color:C.g400}}>You</span>:<div style={{display:'flex',gap:6}}><select value={u.role} onChange={async e=>{await supabase.from('users').update({role:e.target.value}).eq('id',u.id);setUsers(prev=>prev.map(x=>x.id===u.id?{...x,role:e.target.value}:x));showToast('Role updated \u2713')}} style={{padding:'4px 8px',borderRadius:6,border:'1px solid '+C.g200,fontSize:11,color:C.navy,cursor:'pointer',outline:'none'}}>{ROLES.map(r=><option key={r} value={r}>{r}</option>)}</select></div>}</div>))}</div></div>)}
        {tab==='plan'&&(<div style={{display:'flex',flexDirection:'column',gap:14}}>{co?.plan==='trial'&&<div style={{background:'linear-gradient(135deg,#0B1F3A,#1a3557)',borderRadius:16,padding:20,display:'flex',alignItems:'center',gap:14}}><span style={{fontSize:28}}>&#9889;</span><div style={{flex:1}}><div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,color:'#fff'}}>Trial &mdash; {trialDays} days remaining</div></div><div style={{fontFamily:'JetBrains Mono,monospace',fontSize:22,fontWeight:500,color:C.amber}}>{trialDays}d</div></div>}<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12}}>{PLANS.map(plan=>{const cur=co?.plan===plan.k;return(<div key={plan.k} style={{background:C.white,borderRadius:16,border:'2px solid '+(cur?plan.c:C.g100),padding:18,position:'relative'}}>{cur&&<div style={{position:'absolute',top:10,right:10,fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:100,background:plan.c+'20',color:plan.c}}>Current</div>}<div style={{fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:800,color:C.navy,marginBottom:2}}>{plan.l}</div><div style={{fontFamily:'JetBrains Mono,monospace',fontSize:20,fontWeight:500,color:plan.c,marginBottom:1}}>{plan.p}</div><div style={{fontSize:11,color:C.g400,marginBottom:12}}>{plan.d}</div>{plan.f.map(f=><div key={f} style={{display:'flex',gap:6,fontSize:12,color:C.g600,marginBottom:4}}><span style={{color:plan.c}}>\u2713</span>{f}</div>)}{!cur&&<button onClick={()=>showToast('Redirecting to Razorpay...')} style={{...sb,width:'100%',background:plan.c,marginTop:10,padding:'9px'}}>Upgrade</button>}</div>)})}</div></div>)}
      </div>
    </div>
  )
}

function Quotes() {
  const [quotes,setQuotes]=useState([]);const [filter,setFilter]=useState('all');const [loading,setLoading]=useState(true);const [profile,setProfile]=useState(null);const [waModal,setWaModal]=useState(null)
  const SC={draft:{bg:'#E8EDF3',color:'#8A9BB5'},sent:{bg:'rgba(26,111,232,0.1)',color:'#1A6FE8'},approved:{bg:'rgba(14,165,160,0.1)',color:'#0EA5A0'},rejected:{bg:'rgba(239,68,68,0.08)',color:'#EF4444'}}
  useEffect(()=>{async function load(){setLoading(true);const{data:{user}}=await supabase.auth.getUser();if(!user)return setLoading(false);const{data:ud}=await supabase.from('users').select('company_id,companies(*)').eq('id',user.id).single();if(!ud)return setLoading(false);setProfile(ud);const{data}=await supabase.from('quotes').select('*,clients(name,phone)').eq('company_id',ud.company_id).order('created_at',{ascending:false});setQuotes(data||[]);setLoading(false)}load()},[])
  const filtered=filter==='all'?quotes:quotes.filter(q=>q.status===filter)
  return(
    <Layout>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:12}}><h2 style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:700}}>Quotes</h2><a href="/quotes/create" style={{background:C.blue,color:'#fff',textDecoration:'none',padding:'9px 18px',borderRadius:8,fontSize:13,fontWeight:600}}>+ New Quote</a></div>
      <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>{['all','draft','sent','approved','rejected'].map(s=>(<button key={s} onClick={()=>setFilter(s)} style={{padding:'6px 14px',borderRadius:100,fontSize:12,fontWeight:600,cursor:'pointer',border:'1px solid',borderColor:filter===s?C.navy:C.g100,background:filter===s?C.navy:C.white,color:filter===s?'#fff':'#4A5568'}}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>))}</div>
      <div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,overflow:'hidden'}}>
        {loading?<div style={{padding:40,textAlign:'center',color:C.g400}}>Loading...</div>:filtered.length===0?<div style={{padding:60,textAlign:'center'}}><div style={{fontSize:40,marginBottom:12}}>&#128203;</div><p style={{color:C.g400,marginBottom:20}}>No quotes yet</p><a href="/quotes/create" style={{background:C.blue,color:'#fff',textDecoration:'none',padding:'10px 20px',borderRadius:8,fontSize:13,fontWeight:600}}>Create Quote</a></div>:
        <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:C.g50}}>{['Quote #','Client','Amount','Status','Date','Actions'].map(h=>(<th key={h} style={{padding:'11px 16px',textAlign:'left',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:C.g400,borderBottom:'1px solid '+C.g100}}>{h}</th>))}</tr></thead>
          <tbody>{filtered.map(q=>{const sc=SC[q.status]||SC.draft;const phone=q.clients?.phone||q.client_phone;return(<tr key={q.id} style={{borderBottom:'1px solid '+C.g50}}>
            <td style={{padding:'13px 16px',fontFamily:'JetBrains Mono,monospace',fontSize:11,color:C.g400}}>#{q.quote_number}</td>
            <td style={{padding:'13px 16px'}}><div style={{fontWeight:600,fontSize:13,color:C.navy}}>{q.client_name}</div><div style={{fontSize:11,color:C.g400}}>{phone}</div></td>
            <td style={{padding:'13px 16px',fontFamily:'JetBrains Mono,monospace',fontWeight:500,color:C.navy}}>\u20b9{(q.grand_total||0).toLocaleString('en-IN')}</td>
            <td style={{padding:'13px 16px'}}><span style={{...sc,padding:'3px 9px',borderRadius:100,fontSize:10,fontWeight:700}}>{q.status}</span></td>
            <td style={{padding:'13px 16px',fontSize:12,color:C.g400}}>{new Date(q.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</td>
            <td style={{padding:'13px 16px'}}><div style={{display:'flex',gap:6,alignItems:'center'}}>
              <QuotePDFBar quote={q} company={profile?.companies||{}} client={{name:q.client_name,phone}} items={[]} bank={profile?.companies||{}}/>
              <WhatsAppSendBtn phone={phone} type="quote" label="WA" data={{clientName:q.client_name,quoteNumber:q.quote_number,total:q.grand_total,items:[],companyName:profile?.companies?.name||'QLekha',companyId:profile?.company_id,fallbackText:'Hi '+q.client_name+', your quote #'+q.quote_number+' for \u20b9'+(q.grand_total||0).toLocaleString('en-IN')+' is ready. Reply YES to approve.'}}/>
              <button onClick={()=>setWaModal(q)} style={{padding:'5px 8px',borderRadius:6,border:'1px solid rgba(37,211,102,0.3)',background:'rgba(37,211,102,0.06)',fontSize:11,cursor:'pointer',color:'#25D366'}}>...</button>
            </div></td>
          </tr>)})}</tbody>
        </table></div>}
      </div>
      {waModal&&<WhatsAppModal isOpen={!!waModal} onClose={()=>setWaModal(null)} contact={{name:waModal.client_name,phone:waModal.clients?.phone||waModal.client_phone}} companyId={profile?.company_id} companyName={profile?.companies?.name||'QLekha'}/>}
    </Layout>
  )
}

function Analytics(){const[loading,setLoading]=useState(true);const[quotes,setQuotes]=useState([]);const[invoices,setInvoices]=useState([]);const[payments,setPayments]=useState([]);const[clients,setClients]=useState([]);const now=new Date();useEffect(()=>{async function load(){setLoading(true);const{data:{user}}=await supabase.auth.getUser();if(!user)return setLoading(false);const{data:ud}=await supabase.from('users').select('company_id').eq('id',user.id).single();if(!ud)return setLoading(false);const cid=ud.company_id;const[qr,ir,pr,cr]=await Promise.all([supabase.from('quotes').select('id,status,grand_total,created_at').eq('company_id',cid),supabase.from('invoices').select('id,status,grand_total,paid_amount,balance_due,created_at').eq('company_id',cid),supabase.from('payments').select('amount,payment_date').eq('company_id',cid),supabase.from('clients').select('id,name,total_quotes,total_billed,total_paid,tag').eq('company_id',cid)]);setQuotes(qr.data||[]);setInvoices(ir.data||[]);setPayments(pr.data||[]);setClients(cr.data||[]);setLoading(false)}load()},[]);const totalCollected=payments.reduce((s,p)=>s+(p.amount||0),0);const totalOut=invoices.filter(i=>['pending','partial','overdue'].includes(i.status)).reduce((s,i)=>s+(i.balance_due||0),0);const sent=quotes.filter(q=>['sent','approved','rejected'].includes(q.status));const won=quotes.filter(q=>q.status==='approved');const winRate=sent.length>0?Math.round((won.length/sent.length)*100):0;const thisM=(d)=>{const dt=new Date(d);return dt.getMonth()===now.getMonth()&&dt.getFullYear()===now.getFullYear()};const thisMonthRev=invoices.filter(i=>thisM(i.created_at)&&i.status!=='cancelled').reduce((s,i)=>s+(i.grand_total||0),0);const monthly=Array.from({length:6},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-(5-i),1);const value=invoices.filter(inv=>{const id=new Date(inv.created_at);return id.getMonth()===d.getMonth()&&id.getFullYear()===d.getFullYear()&&inv.status!=='cancelled'}).reduce((s,inv)=>s+(inv.grand_total||0),0);return{label:MONTHS[d.getMonth()],value}});const topClients=[...clients].sort((a,b)=>(b.total_billed||0)-(a.total_billed||0)).slice(0,5);const maxBar=Math.max(...monthly.map(m=>m.value),1);const funnel=[{l:'Created',n:quotes.length,c:'#6366F1'},{l:'Sent',n:quotes.filter(q=>['sent','approved','rejected'].includes(q.status)).length,c:C.blue},{l:'Won',n:won.length,c:C.teal},{l:'Invoiced',n:invoices.length,c:C.amber},{l:'Paid',n:invoices.filter(i=>i.status==='paid').length,c:C.green}];const kpis=[{i:'&#128176;',v:fmt(thisMonthRev),l:'Revenue this month',c:C.blue},{i:'&#9989;',v:fmt(totalCollected),l:'Total collected',c:C.green},{i:'&#127919;',v:winRate+'%',l:'Win rate',c:C.teal},{i:'&#8987;',v:fmt(totalOut),l:'Outstanding',c:C.amber}];if(loading)return<Layout><div style={{padding:60,textAlign:'center',color:C.g400}}>&#128200; Loading...</div></Layout>;return<Layout><div style={{marginBottom:20}}><h2 style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,color:C.navy,marginBottom:4}}>Analytics</h2><p style={{fontSize:13,color:C.g400}}>Business performance at a glance.</p></div>{quotes.length===0&&invoices.length===0&&<div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,padding:'60px 20px',textAlign:'center',marginBottom:20}}><div style={{fontSize:48,marginBottom:16}}>&#128202;</div><p style={{color:C.g400,fontSize:14,marginBottom:20}}>Create quotes and invoices to see analytics.</p><a href="/quotes/create" style={{background:C.blue,color:C.white,textDecoration:'none',padding:'10px 20px',borderRadius:10,fontSize:13,fontWeight:700}}>&#128203; Create First Quote</a></div>}<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:16,marginBottom:20}}>{kpis.map(k=>(<div key={k.l} style={{background:C.white,borderRadius:16,padding:20,border:'1px solid '+C.g100,borderTop:'3px solid '+k.c}}><div style={{width:36,height:36,borderRadius:9,background:k.c+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,marginBottom:10}} dangerouslySetInnerHTML={{__html:k.i}}/><div style={{fontFamily:'JetBrains Mono,monospace',fontSize:24,fontWeight:500,color:C.navy,marginBottom:2}}>{k.v}</div><div style={{fontSize:12,color:C.g400}}>{k.l}</div></div>))}</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}><div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,overflow:'hidden'}}><div style={{padding:'14px 18px',borderBottom:'1px solid '+C.g100}}><div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700}}>Monthly Revenue</div></div><div style={{padding:18}}>{monthly.every(m=>m.value===0)?<div style={{padding:30,textAlign:'center',color:C.g400,fontSize:13}}>No invoices yet</div>:<svg width="100%" height={160} viewBox={'0 0 '+monthly.length*80+' 180'} style={{minWidth:300}}>{monthly.map((m,i)=>{const bH=(m.value/maxBar)*140;const x=i*80+10;return(<g key={i}><rect x={x} y={150-bH} width={50} height={bH} rx={5} fill={C.blue} opacity={0.85}/>{m.value>0&&<text x={x+25} y={150-bH-5} textAnchor="middle" fontSize={9} fontFamily="JetBrains Mono,monospace" fill={C.blue}>{m.value>=1000?(m.value/1000).toFixed(0)+'K':m.value}</text>}<text x={x+25} y={168} textAnchor="middle" fontSize={11} fontFamily="Inter,sans-serif" fill={C.g400}>{m.label}</text></g>)})}</svg>}</div></div><div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,overflow:'hidden'}}><div style={{padding:'14px 18px',borderBottom:'1px solid '+C.g100}}><div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700}}>Conversion Funnel</div></div><div style={{padding:18}}>{quotes.length===0?<div style={{padding:30,textAlign:'center',color:C.g400,fontSize:13}}>No quotes yet</div>:funnel.map(f=>(<div key={f.l} style={{marginBottom:12}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}><span style={{fontSize:13,fontWeight:600,color:C.navy}}>{f.l}</span><span style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:600,color:f.c}}>{f.n}</span></div><div style={{height:8,background:C.g100,borderRadius:100,overflow:'hidden'}}><div style={{height:'100%',width:(quotes.length>0?(f.n/quotes.length)*100:0)+'%',background:f.c,borderRadius:100}}/></div></div>))}</div></div></div><div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,overflow:'hidden'}}><div style={{padding:'14px 18px',borderBottom:'1px solid '+C.g100,display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700}}>Top Clients</div><a href="/crm" style={{fontSize:12,color:C.blue,textDecoration:'none',fontWeight:600}}>View all</a></div><div style={{padding:18}}>{topClients.length===0?<div style={{padding:30,textAlign:'center',color:C.g400,fontSize:13}}>No clients yet</div>:topClients.map((c,i)=>(<div key={c.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:i<topClients.length-1?'1px solid '+C.g100:'none'}}><div style={{width:32,height:32,borderRadius:'50%',background:C.blue,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,color:'#fff',flexShrink:0}}>{c.name[0]}</div><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:C.navy}}>{c.name}</div><div style={{fontSize:11,color:C.g400}}>{c.tag} \u00b7 {c.total_quotes||0} quotes</div></div><div style={{textAlign:'right'}}><div style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:500,color:C.navy}}>{fmt(c.total_billed||0)}</div><div style={{fontSize:11,color:(c.total_billed-c.total_paid)>0?C.amber:C.green}}>{(c.total_billed-c.total_paid)>0?fmt(c.total_billed-c.total_paid)+' due':'Paid \u2713'}</div></div></div>))}</div></div></Layout>}

export default function App() {
  const [session, setSession] = useState(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data:{ session } }) => setSession(session))
    const { data:{ subscription } } = supabase.auth.onAuthStateChange((_,s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])
  if (session === undefined) return <Splash/>
  return (
    <Routes>
      <Route path="/" element={<Landing/>}/>
      <Route path="/auth" element={session ? <Navigate to="/dashboard" replace/> : <Auth/>}/>
      <Route path="/dashboard" element={session ? <Layout><Dashboard/></Layout> : <Navigate to="/auth" replace/>}/>
      <Route path="/quotes" element={session ? <Quotes/> : <Navigate to="/auth" replace/>}/>
      <Route path="/quotes/create" element={session ? <Layout><div style={{padding:40,textAlign:'center'}}><div style={{fontSize:48,marginBottom:16}}>&#128203;</div><h2 style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,color:C.navy}}>Create Quote</h2><p style={{color:C.g400,marginTop:8}}>Full 4-step wizard coming soon.</p></div></Layout> : <Navigate to="/auth" replace/>}/>
      <Route path="/billing" element={session ? <Layout><Billing/></Layout> : <Navigate to="/auth" replace/>}/>
      <Route path="/stock" element={session ? <Layout><Stock/></Layout> : <Navigate to="/auth" replace/>}/>
      <Route path="/crm" element={session ? <Layout><CRM/></Layout> : <Navigate to="/auth" replace/>}/>
      <Route path="/analytics" element={session ? <Analytics/> : <Navigate to="/auth" replace/>}/>
      <Route path="/settings" element={session ? <Layout><Settings/></Layout> : <Navigate to="/auth" replace/>}/>
      <Route path="/pdf-demo" element={session ? <Layout><PDFDemoPage/></Layout> : <Navigate to="/auth" replace/>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  )
}

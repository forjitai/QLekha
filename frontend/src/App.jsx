import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { supabase } from './lib/supabase'
import { WhatsAppSendBtn, WhatsAppModal } from './components/WhatsAppButton'
import { QuotePDFBar, PDFDemoPage } from './components/PDFButton'
import Dashboard from './pages/Dashboard'
import Billing from './pages/Billing'
import Stock from './pages/Stock'
import CRM from './pages/CRM'
import QuoteWizard from './pages/QuoteWizard'

// ─── Design Tokens ───────────────────────────────────────────────────────────
const C = {
  ink:    '#0F1923',  // near-black
  steel:  '#1B4FD8',  // cobalt blue
  steelLt:'#3B6FEA',  // lighter blue for hover
  copper: '#D97941',  // warm accent
  chalk:  '#F7F8FA',  // page background
  glass:  '#E8F4FD',  // pale blue-tint
  mist:   '#6B7A8D',  // secondary text
  fog:    '#C4CDD8',  // borders
  snow:   '#FFFFFF',  // cards
  green:  '#16A34A',
  red:    '#DC2626',
  amber:  '#D97706',
  purp:   '#7C3AED',
  teal:   '#0EA5A0',
  // legacy aliases so old code still works
  navy:   '#0F1923',
  blue:   '#1B4FD8',
  blueLt: '#3B6FEA',
  bg:     '#F7F8FA',
  white:  '#FFFFFF',
  g100:   '#E8F4FD',
  g200:   '#C4CDD8',
  g400:   '#6B7A8D',
  g50:    '#F7F8FA',
  g600:   '#374151',
  bluePale:'rgba(27,79,216,0.08)',
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const fmt = (n) => n >= 100000 ? '\u20b9'+(n/100000).toFixed(1)+'L' : n >= 1000 ? '\u20b9'+(n/1000).toFixed(0)+'K' : '\u20b9'+(n||0)

// ─── Navigation ──────────────────────────────────────────────────────────────
const NAV = [
  {path:'/dashboard', icon:'📊', label:'Dashboard'},
  {path:'/quotes',    icon:'📋', label:'Quotes'},
  {path:'/billing',   icon:'🧾', label:'Billing'},
  {path:'/stock',     icon:'📦', label:'Stock'},
  {path:'/crm',       icon:'👥', label:'CRM'},
  {path:'/analytics', icon:'📈', label:'Analytics'},
  {path:'/settings',  icon:'⚙️', label:'Settings'},
]

// ─── Splash ──────────────────────────────────────────────────────────────────
function Splash() {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100vh',background:C.ink,gap:12}}>
      <div style={{fontFamily:'Syne,sans-serif',fontSize:32,fontWeight:800,color:C.snow,letterSpacing:'-1px'}}>
        Q<span style={{color:C.steel}}>Lekha</span>
      </div>
      <div style={{fontSize:12,color:C.mist,letterSpacing:'2px',textTransform:'uppercase'}}>Loading</div>
    </div>
  )
}

// ─── Layout ──────────────────────────────────────────────────────────────────
export function Layout({ children }) {
  const loc = window.location.pathname
  const [mob, setMob] = useState(window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setMob(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  const sidebarStyle = {
    width: 220,
    flexShrink: 0,
    background: C.ink,
    display: mob ? 'none' : 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'sticky',
    top: 0,
  }

  const navItemStyle = (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    borderRadius: 8,
    marginBottom: 2,
    textDecoration: 'none',
    background: active ? 'rgba(27,79,216,0.18)' : 'transparent',
    color: active ? C.snow : 'rgba(255,255,255,0.45)',
    fontWeight: active ? 600 : 400,
    fontSize: 13,
    fontFamily: 'Inter,sans-serif',
    position: 'relative',
    transition: 'all 0.15s',
    borderLeft: active ? '3px solid '+C.steel : '3px solid transparent',
  })

  const bottomNavStyle = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: C.snow,
    borderTop: '1px solid '+C.fog,
    display: mob ? 'flex' : 'none',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 60,
    zIndex: 100,
    padding: '0 4px',
  }

  const tabItems = NAV.slice(0,5) // Dashboard, Quotes, Billing, Stock, CRM

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden',background:C.chalk}}>
      {/* Desktop Sidebar */}
      <aside style={sidebarStyle}>
        <div style={{padding:'22px 18px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <a href="/dashboard" style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:800,color:C.snow,textDecoration:'none',letterSpacing:'-0.5px'}}>
            Q<span style={{color:C.steel}}>Lekha</span>
          </a>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.25)',marginTop:2,letterSpacing:'1px',textTransform:'uppercase'}}>Window ERP</div>
        </div>

        <nav style={{padding:'12px 8px',flex:1,overflowY:'auto'}}>
          {NAV.map(n => {
            const active = loc === n.path || (n.path !== '/dashboard' && loc.startsWith(n.path))
            return (
              <a key={n.path} href={n.path} style={navItemStyle(active)}>
                <span style={{fontSize:15,width:20,textAlign:'center'}}>{n.icon}</span>
                <span>{n.label}</span>
                {active && <div style={{position:'absolute',right:0,top:'50%',transform:'translateY(-50%)',width:4,height:20,background:C.steel,borderRadius:'2px 0 0 2px'}}/>}
              </a>
            )
          })}
        </nav>

        <div style={{padding:'12px 8px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          <a href="/quotes/create" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'10px',borderRadius:8,background:C.steel,color:C.snow,textDecoration:'none',fontSize:13,fontWeight:700,fontFamily:'Syne,sans-serif',marginBottom:8}}>
            <span>+</span> New Quote
          </a>
          <button onClick={() => supabase.auth.signOut().then(() => { window.location.href = '/auth' })}
            style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'8px 14px',borderRadius:8,background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.35)',fontSize:12,fontFamily:'Inter,sans-serif'}}>
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        {/* Mobile top bar */}
        {mob && (
          <header style={{height:52,background:C.snow,borderBottom:'1px solid '+C.fog,display:'flex',alignItems:'center',padding:'0 16px',gap:12,flexShrink:0}}>
            <span style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:800,color:C.ink,letterSpacing:'-0.5px',flex:1}}>
              Q<span style={{color:C.steel}}>Lekha</span>
            </span>
            <a href="/quotes/create" style={{background:C.steel,color:C.snow,textDecoration:'none',padding:'7px 14px',borderRadius:8,fontSize:12,fontWeight:700,fontFamily:'Syne,sans-serif'}}>
              + Quote
            </a>
            <a href="/settings" style={{color:C.mist,textDecoration:'none',fontSize:18}}>⚙️</a>
          </header>
        )}

        {/* Desktop top bar */}
        {!mob && (
          <header style={{height:56,background:C.snow,borderBottom:'1px solid '+C.fog,display:'flex',alignItems:'center',padding:'0 24px',gap:16,flexShrink:0}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:C.ink}}>
                {NAV.find(n => loc === n.path || (n.path !== '/dashboard' && loc.startsWith(n.path)))?.label || 'Dashboard'}
              </div>
            </div>
            <a href="/quotes/create" style={{background:C.steel,color:C.snow,textDecoration:'none',padding:'8px 18px',borderRadius:8,fontSize:13,fontWeight:600,fontFamily:'Inter,sans-serif'}}>
              + New Quote
            </a>
          </header>
        )}

        <main style={{flex:1,overflowY:'auto',padding:mob?'16px 12px 76px':'24px',background:C.chalk}}>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav style={bottomNavStyle}>
        {tabItems.map(n => {
          const active = loc === n.path || (n.path !== '/dashboard' && loc.startsWith(n.path))
          return (
            <a key={n.path} href={n.path} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,textDecoration:'none',padding:'6px 12px',flex:1}}>
              <span style={{fontSize:20,lineHeight:1}}>{n.icon}</span>
              <span style={{fontSize:9,fontWeight:active?700:400,color:active?C.steel:C.mist,fontFamily:'Inter,sans-serif',letterSpacing:'0.3px'}}>{n.label}</span>
              {active && <div style={{position:'absolute',top:0,width:20,height:2,background:C.steel,borderRadius:'0 0 2px 2px'}}/>}
            </a>
          )
        })}
      </nav>
    </div>
  )
}

// ─── Landing ─────────────────────────────────────────────────────────────────
function Landing() {
  const mob = window.innerWidth < 768
  const features = [
    {icon:'⚡',title:'5-min quotes',desc:'Type measurements, get a professional PDF instantly'},
    {icon:'💬',title:'WhatsApp direct',desc:'Send quote to client in one tap'},
    {icon:'📦',title:'Stock tracking',desc:'Aluminium profiles, glass, accessories — all in one place'},
    {icon:'📊',title:'Live dashboard',desc:'Revenue, pipeline, overdue — at a glance every morning'},
  ]
  return (
    <div style={{minHeight:'100vh',background:C.ink,fontFamily:'Inter,sans-serif'}}>
      {/* Nav */}
      <div style={{padding:'16px 24px',display:'flex',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <span style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:800,color:C.snow,letterSpacing:'-0.5px',flex:1}}>
          Q<span style={{color:C.steel}}>Lekha</span>
        </span>
        <a href="/auth" style={{background:C.steel,color:C.snow,textDecoration:'none',padding:'9px 20px',borderRadius:8,fontSize:13,fontWeight:600}}>Sign in</a>
      </div>

      {/* Hero */}
      <div style={{padding:mob?'48px 24px 40px':'80px 48px 64px',maxWidth:760}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(27,79,216,0.15)',border:'1px solid rgba(27,79,216,0.3)',borderRadius:100,padding:'5px 14px',marginBottom:24}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:C.steel,display:'inline-block'}}/>
          <span style={{fontSize:11,color:'rgba(255,255,255,0.6)',letterSpacing:'1px',textTransform:'uppercase',fontWeight:600}}>Built for Indian window businesses</span>
        </div>
        <h1 style={{fontFamily:'Syne,sans-serif',fontSize:mob?36:58,fontWeight:800,color:C.snow,lineHeight:1.05,letterSpacing:'-2px',marginBottom:20}}>
          Quote faster.<br/>
          <span style={{color:C.steel}}>Close more.</span>
        </h1>
        <p style={{fontSize:mob?15:17,color:'rgba(255,255,255,0.5)',lineHeight:1.7,maxWidth:520,marginBottom:36}}>
          QLekha turns window measurements into professional quotes in under 5 minutes. 
          Send via WhatsApp, track payments, manage your stock.
        </p>
        <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
          <a href="/auth" style={{background:C.steel,color:C.snow,textDecoration:'none',padding:'13px 28px',borderRadius:10,fontSize:15,fontWeight:700,fontFamily:'Syne,sans-serif',display:'inline-flex',alignItems:'center',gap:8}}>
            Start free trial →
          </a>
          <a href="/dashboard" style={{background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.7)',textDecoration:'none',padding:'13px 24px',borderRadius:10,fontSize:14,fontWeight:500,border:'1px solid rgba(255,255,255,0.12)'}}>
            See demo
          </a>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',overflowX:'auto'}}>
        {[['₹0','To start'],['14 days','Free trial'],['5 min','First quote'],['WA','Direct send']].map(([v,l])=>(
          <div key={l} style={{padding:'20px 32px',borderRight:'1px solid rgba(255,255,255,0.06)',flexShrink:0,textAlign:'center'}}>
            <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:22,fontWeight:700,color:C.snow}}>{v}</div>
            <div style={{fontSize:11,color:C.mist,marginTop:3,textTransform:'uppercase',letterSpacing:'0.8px'}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Features */}
      <div style={{padding:mob?'40px 24px':'56px 48px'}}>
        <div style={{display:'grid',gridTemplateColumns:mob?'1fr':'1fr 1fr',gap:16}}>
          {features.map(f=>(
            <div key={f.title} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,padding:'24px'}}>
              <div style={{fontSize:28,marginBottom:14}}>{f.icon}</div>
              <div style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,color:C.snow,marginBottom:6}}>{f.title}</div>
              <div style={{fontSize:13,color:C.mist,lineHeight:1.6}}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{padding:mob?'32px 24px 48px':'48px',textAlign:'center',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{fontFamily:'Syne,sans-serif',fontSize:mob?24:32,fontWeight:800,color:C.snow,marginBottom:8}}>Ready to close faster?</div>
        <div style={{fontSize:14,color:C.mist,marginBottom:24}}>No credit card. No commitment. 14-day trial.</div>
        <a href="/auth" style={{background:C.steel,color:C.snow,textDecoration:'none',padding:'13px 36px',borderRadius:10,fontSize:15,fontWeight:700,fontFamily:'Syne,sans-serif'}}>
          Create free account
        </a>
      </div>

      <div style={{padding:'20px 24px',borderTop:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',gap:16}}>
        <span style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,color:'rgba(255,255,255,0.25)'}}>Q<span style={{color:C.steel}}>Lekha</span></span>
        <span style={{fontSize:12,color:'rgba(255,255,255,0.2)'}}>by ForjitAI · Made in India</span>
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
  const signupUserRef = useRef(null)

  // Handle email confirmation link click — Supabase redirects here with session in URL
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // User confirmed via email link and has a session — check if onboarded
        supabase.from('users').select('id').eq('id', session.user.id).single()
          .then(({ data }) => {
            if (data) {
              window.location.href = '/dashboard'
            } else {
              setMode('onboard'); setStep(1)
            }
          })
      }
    })
    // Also handle hash-based tokens from email links
    const hash = window.location.hash
    const params = new URLSearchParams(window.location.search)
    if (hash.includes('access_token') || params.get('token_hash') || params.get('type') === 'signup') {
      setOk('Email confirmed! Setting up your account...')
    }
  }, [])

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
  const IS = {width:'100%',padding:'11px 14px',borderRadius:10,border:'1.5px solid '+C.fog,fontSize:14,fontFamily:'Inter,sans-serif',color:C.ink,background:C.snow,outline:'none',marginBottom:16,boxSizing:'border-box'}
  const BS = {width:'100%',padding:'13px',borderRadius:10,border:'none',background:C.steel,color:C.snow,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'Syne,sans-serif',display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:4}
  const LS = {fontSize:11,fontWeight:700,color:C.ink,textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:5}
  const Lnk = ({onClick:o, children:c}) => <button onClick={o} style={{background:'none',border:'none',cursor:'pointer',color:C.steel,fontWeight:600,fontSize:13,fontFamily:'Inter,sans-serif'}}>{c}</button>
  const Btn = ({ghost, style:s, ...p}) => <button {...p} style={{...BS,...(ghost?{background:'transparent',border:'1.5px solid '+C.fog,color:C.ink,marginTop:8}:{}),...(s||{})}}/>

  async function login() {
    clr(); if (!email || !pw) return setErr('Enter email and password.')
    setLoading(true)
    const { error:e } = await supabase.auth.signInWithPassword({ email, password:pw })
    setLoading(false)
    if (e) {
      const msg = e?.message || e?.msg || e?.error_description || e?.code || (typeof e === 'string' ? e : null) || JSON.stringify(e) || 'Login failed. Please try again.'
      if (msg === '{}' || msg === 'null' || !msg) {
        return setErr('Login failed. Please check your email and password.')
      }
      if (msg.toLowerCase().includes('not confirmed')) {
        // Auto-resend OTP so user can confirm their email
        const { error:re } = await supabase.auth.resend({ type:'signup', email })
        if (!re) {
          setMode('otp'); setTimer(60); setOtp('')
          setOk('A 6-digit code was sent to ' + email + '. Enter it to confirm your account.')
        } else {
          setErr('Email not yet confirmed. Check your inbox for the original OTP, or try signing up again.')
        }
      } else if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('invalid credentials')) {
        setErr('Wrong email or password.')
      } else {
        setErr(msg)
      }
    } else {
      window.location.href = '/dashboard'
    }
  }

  async function signup() {
    clr(); if (!email || pw.length < 8) return setErr('Email required, min 8 char password.')
    if (pw !== cpw) return setErr('Passwords do not match.')
    setLoading(true)
    const { data, error:e } = await supabase.auth.signUp({ email, password:pw })
    setLoading(false)
    if (e) {
      // Extract error message from all possible Supabase error shapes
      const msg = e?.message || e?.msg || e?.error_description || e?.code ||
                  (e?.status ? 'Server error (' + e.status + '). Please try again.' : '') ||
                  (typeof e === 'string' ? e : 'Signup failed. Please try again.')
      const lower = msg.toLowerCase()
      if (lower.includes('rate limit') || lower.includes('429')) {
        return setErr('Too many attempts. Please wait a minute.')
      }
      if (lower.includes('already') || lower.includes('registered')) {
        return setErr('Account already exists. Please sign in.')
      }
      if (lower.includes('unable to validate') || lower.includes('500') || msg === '{}' || msg === 'null') {
        return setErr('Could not send OTP email. Please try again or contact support.')
      }
      return setErr(msg || 'Signup failed. Please try again.')
    }
    // If Supabase auto-confirmed (email confirm disabled) - go straight to onboarding
    if (data?.session) {
      setMode('onboard'); setStep(1)
      return
    }
    // identities:[] = existing confirmed user trying to re-register
    if (data?.user && data.user.identities && data.user.identities.length === 0) {
      setErr('Account already exists. Please sign in.')
      return
    }
    // Normal flow: OTP sent to email
    setMode('otp'); setTimer(60); setOtp('')
    setOk('Check your email for a 6-digit code.')
  }

  async function verify() {
    clr(); const token = otp.replace(/\s/g,'')
    if (token.length !== 6) return setErr('Enter the full 6-digit code.')
    setLoading(true)
    const { data:vData, error:e } = await supabase.auth.verifyOtp({ email, token, type:'signup' })
    if (e) {
      setLoading(false)
      const m = e?.message || e?.code || JSON.stringify(e)
      if (m.toLowerCase().includes('expired') || m.toLowerCase().includes('otp') || m.toLowerCase().includes('invalid')) {
        return setErr('Code expired or incorrect. Click \'Resend code\' to get a new one.')
      }
      return setErr('Verification failed: ' + m)
    }
    // verifyOtp already creates a session — no need to signInWithPassword
    // Just pick up the session and proceed to onboarding
    setLoading(false)
    setMode('onboard'); setStep(1)
  }

  async function finish() {
    clr(); setLoading(true)
    try {
      const { data:{ session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) throw new Error('Session expired. Please sign in again.')
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
      // Seed starter stock for new company
      await Promise.all([
        supabase.from('profile_companies').insert([
          {company_id:co.id,brand:'Jindal',series:'46S',material_type:'aluminium',color:'Silver',weight_per_meter:1.8,price_per_kg:280},
          {company_id:co.id,brand:'Jindal',series:'60S',material_type:'aluminium',color:'Anodized',weight_per_meter:2.1,price_per_kg:280},
          {company_id:co.id,brand:'Fenesta',series:'Standard',material_type:'upvc',color:'White',weight_per_meter:1.5,price_per_kg:320},
        ]),
        supabase.from('glass_types').insert([
          {company_id:co.id,name:'Clear Float 4mm',thickness_mm:4,price_per_sqft:45,brand:'Saint-Gobain'},
          {company_id:co.id,name:'Toughened 8mm',thickness_mm:8,price_per_sqft:120,brand:'Saint-Gobain'},
          {company_id:co.id,name:'Reflective Bronze 6mm',thickness_mm:6,price_per_sqft:95,brand:'AIS'},
        ]),
        supabase.from('accessories').insert([
          {company_id:co.id,name:'Aluminium Handle',category:'handle',unit:'piece',price:180,brand:'Hardwyn'},
          {company_id:co.id,name:'Mosquito Mesh',category:'mosquito_mesh',unit:'sqft',price:35},
          {company_id:co.id,name:'Stainless Hinge',category:'hinge',unit:'piece',price:120},
        ])
      ])
      setLoading(false)
      window.location.href = '/dashboard'
    } catch(e) { setLoading(false); setErr('Setup failed: '+(e.message||e.msg||JSON.stringify(e))) }
  }

  const isMobile=window.innerWidth<768
  const pageS = {minHeight:'100vh',background:C.ink,display:'flex',flexDirection:isMobile?'column':'row',position:'relative',overflow:'hidden',fontFamily:'Inter,sans-serif'}
  const gridS = {position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(26,111,232,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(26,111,232,0.05) 1px,transparent 1px)',backgroundSize:'40px 40px',pointerEvents:'none'}
  const leftS = {display:isMobile?'none':'flex',flex:1,flexDirection:'column',justifyContent:'center',padding:'60px 80px',position:'relative',zIndex:1}
  const rightS = {width:isMobile?'100%':460,minHeight:isMobile?'100vh':'auto',background:C.snow,display:'flex',flexDirection:'column',justifyContent:'center',padding:isMobile?'32px 20px 24px':'56px 48px',position:'relative',zIndex:1,overflowY:'auto',boxSizing:'border-box'}
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
        {isMobile&&<div style={{fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:800,color:C.ink,marginBottom:24,textAlign:'center'}}>Q<span style={{color:C.steel}}>Lekha</span></div>}
        {err && <div style={errS}>{err}</div>}
        {ok  && <div style={okS}>{ok}</div>}

        {mode==='login' && <>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:800,color:C.ink,marginBottom:6}}>Sign in</div>
          <div style={{fontSize:13,color:C.mist,marginBottom:20}}>Enter your email and password.</div>
          <label style={LS}>Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" style={IS}/>
          <label style={LS}>Password</label>
          <div style={{position:'relative'}}>
            <input type={show?'text':'password'} value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} placeholder="Your password" style={{...IS,paddingRight:44}}/>
            <button onClick={()=>setShow(v=>!v)} style={{position:'absolute',right:12,top:14,background:'none',border:'none',cursor:'pointer',color:C.mist,fontSize:16,padding:0}}>{show?'\ud83d\ude48':'\ud83d\udc41'}</button>
          </div>
          <div style={{textAlign:'right',marginBottom:14}}><Lnk onClick={()=>{setMode('forgot');clr()}}>Forgot password?</Lnk></div>
          <Btn onClick={login} disabled={loading}>{loading?'\u23f3 Signing in...':'Sign in'}</Btn>
          <div style={{textAlign:'center',marginTop:14,fontSize:13,color:C.mist}}>No account? <Lnk onClick={()=>{setMode('signup');clr()}}>Create one free</Lnk></div>
        </>}

        {mode==='signup' && <>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:800,color:C.ink,marginBottom:6}}>Create account</div>
          <div style={{fontSize:13,color:C.mist,marginBottom:20}}>Free 14-day trial. No credit card needed.</div>
          <label style={LS}>Work Email *</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" style={IS}/>
          <label style={LS}>Password *</label>
          <div style={{position:'relative'}}>
            <input type={show?'text':'password'} value={pw} onChange={e=>setPw(e.target.value)} placeholder="At least 8 characters" style={{...IS,paddingRight:44}}/>
            <button onClick={()=>setShow(v=>!v)} style={{position:'absolute',right:12,top:14,background:'none',border:'none',cursor:'pointer',color:C.mist,fontSize:16,padding:0}}>{show?'\ud83d\ude48':'\ud83d\udc41'}</button>
          </div>
          <label style={LS}>Confirm Password *</label>
          <input type="password" value={cpw} onChange={e=>setCpw(e.target.value)} placeholder="Same again" style={IS}/>
          <Btn onClick={signup} disabled={loading}>{loading?'\u23f3 Creating...':'Create account'}</Btn>
          <div style={{textAlign:'center',marginTop:14,fontSize:13,color:C.mist}}>Already have one? <Lnk onClick={()=>{setMode('login');clr()}}>Sign in</Lnk></div>
        </>}

        {mode==='otp' && <div style={{textAlign:'center'}}>
          <div style={{width:64,height:64,borderRadius:'50%',background:'rgba(26,111,232,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 16px'}}>&#128231;</div>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:800,color:C.ink,marginBottom:6}}>Enter the code</div>
          <div style={{fontSize:13,color:C.mist,marginBottom:20}}>Sent to <strong style={{color:C.ink}}>{email}</strong></div>
          <div style={{display:'flex',gap:10,justifyContent:'center',margin:'20px 0'}}>
            {Array.from({length:6},(_,i)=>(
              <input key={i} type="text" inputMode="numeric" maxLength={1}
                value={otp[i]||''}
                onChange={e=>{const v=e.target.value.replace(/\D/g,'').slice(-1);const arr=(otp+'      ').slice(0,6).split('');arr[i]=v;setOtp(arr.join('').trimEnd());if(v&&i<5)e.target.nextElementSibling?.focus()}}
                onKeyDown={e=>{if(e.key==='Backspace'&&!otp[i]&&i>0)e.target.previousElementSibling?.focus()}}
                style={{width:48,height:56,textAlign:'center',fontSize:22,fontFamily:'JetBrains Mono,monospace',fontWeight:500,borderRadius:10,border:'2px solid '+(otp[i]?C.steel:C.fog),color:C.ink,outline:'none'}}
              />
            ))}
          </div>
          <Btn onClick={verify} disabled={loading}>{loading?'\u23f3 Verifying...':'Verify'}</Btn>
          <div style={{marginTop:14,fontSize:13,color:C.mist}}>
            <button onClick={async()=>{
              if(timer>0)return
              clr(); setLoading(true)
              const{error:re}=await supabase.auth.resend({type:'signup',email})
              setLoading(false)
              if(re){
                const m=re?.message||re?.msg||JSON.stringify(re)
                if(m.toLowerCase().includes('rate limit')||m.toLowerCase().includes('429')){
                  setErr('Too many attempts. Please wait 60 seconds before requesting another code.')
                }else{
                  setErr('Could not resend: '+m)
                }
              }else{
                setTimer(60); setOk('New code sent to '+email+'. Check your inbox.')
              }
            }} style={{background:'none',border:'none',cursor:timer>0?'default':'pointer',color:timer>0?C.mist:C.steel,fontWeight:600,fontSize:13}}>
              {timer>0?'Resend in '+timer+'s':'Resend code'}
            </button>
          </div>
        </div>}

        {mode==='forgot' && <>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:800,color:C.ink,marginBottom:6}}>Reset password</div>
          <div style={{fontSize:13,color:C.mist,marginBottom:20}}>Enter your email to get a reset link.</div>
          <label style={LS}>Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" style={IS}/>
          <Btn onClick={async()=>{clr();if(!email)return setErr('Enter your email.');setLoading(true);const{error:e}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/auth?reset=1'});setLoading(false);if(e)setErr(e?.message||e?.msg||JSON.stringify(e));else setOk('Reset link sent to '+email)}} disabled={loading}>
            {loading?'\u23f3 Sending...':'Send reset link'}
          </Btn>
          <div style={{textAlign:'center',marginTop:14}}><Lnk onClick={()=>{setMode('login');clr()}}>Back to sign in</Lnk></div>
        </>}

        {mode==='onboard' && <>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:800,color:C.ink,marginBottom:20}}>Q<span style={{color:C.blueLt}}>Lekha</span> Setup</div>
          <div style={{display:'flex',gap:6,justifyContent:'center',marginBottom:24}}>
            {[1,2,3].map(n=><div key={n} style={{width:step===n?24:8,height:8,borderRadius:100,background:step>n?C.teal:step===n?C.steel:C.fog,transition:'all 0.3s'}}/>)}
          </div>
          {step===1 && <>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:800,color:C.ink,marginBottom:4}}>Your business</div>
            <div style={{fontSize:13,color:C.mist,marginBottom:20}}>Appears on quotes and invoices.</div>
            <label style={LS}>Business Name *</label><input value={ob.company_name} onChange={e=>upd('company_name',e.target.value)} placeholder="Kumar Aluminium Works" style={IS}/>
            <label style={LS}>Your Name *</label><input value={ob.owner_name} onChange={e=>upd('owner_name',e.target.value)} placeholder="Rajesh Kumar" style={IS}/>
            <label style={LS}>Phone *</label><input type="tel" value={ob.phone} onChange={e=>upd('phone',e.target.value)} placeholder="+91 98765 43210" style={IS}/>
            <label style={LS}>City</label><input value={ob.city} onChange={e=>upd('city',e.target.value)} placeholder="Bengaluru" style={IS}/>
            <Btn onClick={()=>ob.company_name&&ob.owner_name&&ob.phone?setStep(2):setErr('Fill required fields.')}>Continue</Btn>
          </>}
          {step===2 && <>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:800,color:C.ink,marginBottom:4}}>Your language</div>
            <div style={{fontSize:13,color:C.mist,marginBottom:16}}>QLekha works in 14 Indian languages.</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:20}}>
              {LANGS.map(l=><div key={l.c} onClick={()=>upd('language',l.c)} style={{padding:'10px',borderRadius:10,border:'2px solid '+(ob.language===l.c?C.steel:C.glass),background:ob.language===l.c?'rgba(26,111,232,0.05)':C.snow,cursor:'pointer',textAlign:'center',fontSize:14,fontWeight:600,color:ob.language===l.c?C.steel:C.ink}}>{l.n}</div>)}
            </div>
            <Btn onClick={()=>setStep(3)}>Continue</Btn>
            <Btn ghost onClick={()=>setStep(1)}>Back</Btn>
          </>}
          {step===3 && <>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:800,color:C.ink,marginBottom:4}}>You are all set!</div>
            <div style={{fontSize:13,color:C.mist,marginBottom:20}}>14-day free trial starts now.</div>
            {[['&#127760;',ob.language.toUpperCase()],['&#127970;',ob.company_name]].map(([ic,tx])=>(
              <div key={tx} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:10,background:C.chalk,marginBottom:8,fontSize:13}}>
                <span style={{fontSize:18}} dangerouslySetInnerHTML={{__html:ic}}/><span style={{color:C.ink,fontWeight:500}}>{tx}</span>
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
  useEffect(()=>{async function load(){setLoading(true);try{const{data:{user}}=await supabase.auth.getUser();if(!user)return setLoading(false);const{data:ud}=await supabase.from('users').select('*,companies(*)').eq('id',user.id).single();if(!ud)return setLoading(false);setUsr(ud);setCo(ud.companies||{});const{data:team}=await supabase.from('users').select('*').eq('company_id',ud.company_id);setUsers(team||[]);setLoading(false)}catch(e){console.error("Load error:",e);setLoading(false)}}load()},[])
  const save=async(fields)=>{if(!co?.id)return;setSaving(true);const{error}=await supabase.from('companies').update(fields).eq('id',co.id);setSaving(false);if(error)showToast('Save failed: '+error.message,'error');else showToast('Saved \u2713')}
  async function initPay(plan){
      const PRICES={starter:'plan_QJx1',growth:'plan_QJx2',pro:'plan_QJx3'}
      const AMOUNTS={starter:49900,growth:149900,pro:349900}
      if(!window.Razorpay){
        const s=document.createElement('script');s.src='https://checkout.razorpay.com/v1/checkout.js';
        document.head.appendChild(s);
        await new Promise(r=>s.onload=r)
      }
      const options={
        key:'rzp_live_qlekha',
        amount:AMOUNTS[plan.k],
        currency:'INR',
        name:'QLekha',
        description:plan.l+' Plan - Monthly',
        prefill:{name:co?.owner_name||'',email:co?.email||'',contact:co?.phone||''},
        theme:{color:C.steel},
        handler:async function(response){
          await supabase.from('companies').update({
            plan:plan.k,
            plan_expires_at:new Date(Date.now()+30*864e5).toISOString(),
            razorpay_payment_id:response.razorpay_payment_id
          }).eq('id',co.id)
          setCo(p=>({...p,plan:plan.k}))
          showToast('Plan upgraded to '+plan.l+' \u2713')
        }
      }
      new window.Razorpay(options).open()
    }
    const TABS=[{k:'company',i:'&#127962;',l:'Company'},{k:'bank',i:'&#127974;',l:'Bank & GST'},{k:'pdf',i:'&#127912;',l:'PDF'},{k:'wa',i:'&#128172;',l:'WhatsApp'},{k:'users',i:'&#128101;',l:'Users'},{k:'plan',i:'&#9889;',l:'Plan'}]
  const THEMES=[{k:'classic_blue',l:'Classic Blue',c:C.steel},{k:'midnight',l:'Midnight',c:C.ink},{k:'teal_fresh',l:'Teal Fresh',c:'#0EA5A0'},{k:'amber_warm',l:'Amber Warm',c:'#FFB400'},{k:'forest_green',l:'Forest Green',c:'#16A34A'},{k:'deep_purple',l:'Deep Purple',c:'#7C3AED'}]
  const PLANS=[{k:'trial',l:'Trial',p:'\u20b90',d:'14 days',c:C.mist,f:['5 quotes','1 user']},{k:'starter',l:'Starter',p:'\u20b9499',d:'per month',c:C.steel,f:['50 quotes/mo','WhatsApp']},{k:'growth',l:'Growth',p:'\u20b91,499',d:'per month',c:C.teal,f:['Unlimited quotes','5 users']},{k:'pro',l:'Pro',p:'\u20b93,499',d:'per month',c:C.purp,f:['Everything','15 users','API']}]
  const ROLES=['owner','admin','sales','accounts','workshop','viewer']
  const RC={owner:C.purp,admin:C.steel,sales:C.teal,accounts:C.amber,workshop:C.green,viewer:C.mist}
  const trialDays=co?.plan_expires_at?Math.max(0,Math.ceil((new Date(co.plan_expires_at)-new Date())/(864e5))):0
  const si={width:'100%',padding:'10px 12px',borderRadius:9,border:'1.5px solid '+C.fog,fontSize:13,fontFamily:'Inter,sans-serif',color:C.ink,background:C.snow,outline:'none',boxSizing:'border-box',marginBottom:14}
  const lb={fontSize:11,fontWeight:700,color:C.ink,textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:5}
  const sb={padding:'10px 18px',borderRadius:9,border:'none',background:C.steel,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'Syne,sans-serif'}
  if(loading)return<div style={{padding:60,textAlign:'center',color:C.mist}}>\u2699\ufe0f Loading settings...</div>
  return(
    <div style={{display:'flex',gap:20,maxWidth:1100}}>
      {toast&&<div style={{position:'fixed',bottom:24,right:24,background:toast.type==='error'?C.red:C.teal,color:'#fff',padding:'12px 20px',borderRadius:10,fontSize:13,fontWeight:500,zIndex:200,boxShadow:'0 8px 24px rgba(0,0,0,0.15)'}}>{toast.type==='error'?'\u2715':'\u2713'} {toast.msg}</div>}
      <div style={{width:190,flexShrink:0}}>
        <div style={{background:C.snow,borderRadius:14,border:'1px solid '+C.glass,overflow:'hidden',marginBottom:12}}>
          {TABS.map(t=>(<button key={t.k} onClick={()=>setTab(t.k)} style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'11px 14px',background:tab===t.k?C.bluePale:'transparent',border:'none',borderLeft:tab===t.k?'3px solid '+C.steel:'3px solid transparent',cursor:'pointer',fontSize:13,fontWeight:tab===t.k?600:400,color:tab===t.k?C.steel:C.ink,textAlign:'left'}}><span dangerouslySetInnerHTML={{__html:t.i}}/>{t.l}</button>))}
        </div>
        <div style={{background:C.ink,borderRadius:12,padding:'14px 16px'}}>
          <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4}}>Plan</div>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:800,color:'#fff'}}>{(PLANS.find(p=>p.k===co?.plan)||PLANS[0]).l}</div>
          {co?.plan==='trial'&&<div style={{fontSize:11,color:C.amber,marginTop:2}}>{trialDays} days left</div>}
          <button onClick={()=>setTab('plan')} style={{marginTop:10,width:'100%',padding:'6px',borderRadius:8,border:'1px solid rgba(255,255,255,0.2)',background:'transparent',color:'rgba(255,255,255,0.7)',fontSize:12,fontWeight:600,cursor:'pointer'}}>Upgrade</button>
        </div>
      </div>
      <div style={{flex:1,minWidth:0}}>
        {tab==='company'&&(<div style={{background:C.snow,borderRadius:16,border:'1px solid '+C.glass,padding:24}}><div style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,marginBottom:4}}>Company Details</div><div style={{fontSize:12,color:C.mist,marginBottom:20}}>Appears on all your quotes and invoices.</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}><div><label style={lb}>Business Name *</label><input value={co?.name||''} onChange={e=>upd('name',e.target.value)} style={si}/><label style={lb}>Owner Name *</label><input value={co?.owner_name||''} onChange={e=>upd('owner_name',e.target.value)} style={si}/><label style={lb}>Phone *</label><input value={co?.phone||''} onChange={e=>upd('phone',e.target.value)} style={si}/><label style={lb}>Email</label><input type="email" value={co?.email||''} onChange={e=>upd('email',e.target.value)} style={si}/></div><div><label style={lb}>Address</label><input value={co?.address||''} onChange={e=>upd('address',e.target.value)} style={si}/><label style={lb}>City</label><input value={co?.city||''} onChange={e=>upd('city',e.target.value)} style={si}/><label style={lb}>State</label><input value={co?.state||''} onChange={e=>upd('state',e.target.value)} style={si}/><label style={lb}>Pincode</label><input value={co?.pincode||''} onChange={e=>upd('pincode',e.target.value)} style={si}/></div></div><div style={{textAlign:'right',paddingTop:16,borderTop:'1px solid '+C.glass}}><button style={sb} onClick={()=>save({name:co.name,owner_name:co.owner_name,phone:co.phone,email:co.email,address:co.address,city:co.city,state:co.state,pincode:co.pincode})} disabled={saving}>{saving?'\u23f3 Saving...':'\u2713 Save Changes'}</button></div></div>)}
        {tab==='bank'&&(<div style={{display:'flex',flexDirection:'column',gap:16}}><div style={{background:C.snow,borderRadius:16,border:'1px solid '+C.glass,padding:24}}><div style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,marginBottom:20}}>GST & Tax</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}><div><label style={lb}>GST Number</label><input value={co?.gst_number||''} onChange={e=>upd('gst_number',e.target.value)} placeholder="29ABCDE1234F1Z5" style={si}/></div><div><label style={lb}>PAN Number</label><input value={co?.pan_number||''} onChange={e=>upd('pan_number',e.target.value)} placeholder="ABCDE1234F" style={si}/></div></div></div><div style={{background:C.snow,borderRadius:16,border:'1px solid '+C.glass,padding:24}}><div style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,marginBottom:20}}>Bank Details</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}><div><label style={lb}>Bank Name</label><input value={co?.bank_name||''} onChange={e=>upd('bank_name',e.target.value)} style={si}/><label style={lb}>Account Number</label><input value={co?.account_number||''} onChange={e=>upd('account_number',e.target.value)} style={si}/><label style={lb}>IFSC Code</label><input value={co?.ifsc_code||''} onChange={e=>upd('ifsc_code',e.target.value)} style={si}/></div><div><label style={lb}>Account Holder</label><input value={co?.account_holder||''} onChange={e=>upd('account_holder',e.target.value)} style={si}/><label style={lb}>UPI ID</label><input value={co?.upi_id||''} onChange={e=>upd('upi_id',e.target.value)} style={si}/></div></div><div style={{textAlign:'right',paddingTop:16,borderTop:'1px solid '+C.glass}}><button style={sb} onClick={()=>save({gst_number:co.gst_number,pan_number:co.pan_number,bank_name:co.bank_name,account_number:co.account_number,ifsc_code:co.ifsc_code,account_holder:co.account_holder,upi_id:co.upi_id})} disabled={saving}>{saving?'\u23f3 Saving...':'\u2713 Save'}</button></div></div></div>)}
        {tab==='pdf'&&(<div style={{background:C.snow,borderRadius:16,border:'1px solid '+C.glass,padding:24}}><div style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,marginBottom:20}}>PDF Design</div><label style={lb}>Colour Theme</label><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20}}>{THEMES.map(t=>(<div key={t.k} onClick={()=>upd('pdf_design',t.k)} style={{borderRadius:12,border:'2px solid '+(co?.pdf_design===t.k?t.c:C.glass),overflow:'hidden',cursor:'pointer'}}><div style={{height:50,background:'linear-gradient(135deg,'+t.c+'22,'+t.c+'55)',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:30,height:30,borderRadius:6,background:t.c,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Syne,sans-serif',fontSize:12,fontWeight:800,color:'#fff'}}>Q</div></div><div style={{padding:'8px 10px'}}><div style={{fontSize:11,fontWeight:700,color:C.ink}}>{t.l}</div></div></div>))}</div><label style={lb}>Installation Rate (Rs./sqft)</label><input type="number" value={co?.installation_sqft||''} onChange={e=>upd('installation_sqft',e.target.value)} placeholder="0" style={si}/><label style={lb}>Quote Terms</label><textarea value={co?.terms_quotation||''} onChange={e=>upd('terms_quotation',e.target.value)} placeholder="1. Prices valid 15 days" style={{...si,resize:'vertical',minHeight:80}}/><label style={lb}>Invoice Terms</label><textarea value={co?.terms_billing||''} onChange={e=>upd('terms_billing',e.target.value)} placeholder="1. Payment due 30 days" style={{...si,resize:'vertical',minHeight:80}}/><div style={{textAlign:'right',paddingTop:16,borderTop:'1px solid '+C.glass}}><a href="/pdf-demo" style={{display:'inline-flex',alignItems:'center',gap:6,padding:'9px 16px',borderRadius:9,border:'1px solid '+C.glass,background:C.snow,color:C.ink,textDecoration:'none',fontSize:13,fontWeight:600,marginRight:10}}>Preview PDF</a><button style={sb} onClick={()=>save({pdf_design:co.pdf_design,installation_sqft:co.installation_sqft,terms_quotation:co.terms_quotation,terms_billing:co.terms_billing})} disabled={saving}>{saving?'\u23f3 Saving...':'\u2713 Save'}</button></div></div>)}
        {tab==='wa'&&(<div style={{display:'flex',flexDirection:'column',gap:16}}><div style={{background:waToken?'linear-gradient(135deg,#064e3b,#065f46)':C.ink,borderRadius:16,padding:20,display:'flex',alignItems:'center',gap:14}}><span style={{fontSize:28}}>&#128172;</span><div style={{flex:1}}><div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,color:'#fff'}}>{waToken?'WhatsApp API Connected':'WhatsApp Not Configured'}</div><div style={{fontSize:12,color:'rgba(255,255,255,0.5)',marginTop:2}}>{waToken?'Sending via Meta Cloud API':'Using wa.me links'}</div></div><span style={{fontSize:24}}>{waToken?'\u2705':'\u26a0\ufe0f'}</span></div><div style={{background:C.snow,borderRadius:16,border:'1px solid '+C.glass,padding:24}}><div style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,marginBottom:4}}>API Configuration</div><div style={{fontSize:12,color:C.mist,marginBottom:20}}>From developers.facebook.com then WhatsApp then API Setup</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}><div><label style={lb}>WhatsApp Access Token</label><input type="password" value={waToken} onChange={e=>setWaToken(e.target.value)} placeholder="EAAxxxxx..." style={si}/></div><div><label style={lb}>Phone Number ID</label><input value={waPhone} onChange={e=>setWaPhone(e.target.value)} placeholder="1234567890123" style={si}/></div></div><button onClick={async()=>{if(!waToken||!waPhone)return showToast('Enter token and phone ID','error');try{const r=await fetch('https://graph.facebook.com/v19.0/'+waPhone,{headers:{'Authorization':'Bearer '+waToken}});const d=await r.json();if(d.id)showToast('Connected \u2713 \u2014 '+(d.display_phone_number||d.id));else showToast(d.error?.message||'Failed','error')}catch(e){showToast('Failed: '+e.message,'error')}}} style={{...sb,background:'#075E54'}}>&#128172; Test Connection</button></div><div style={{background:'rgba(37,211,102,0.04)',border:'1px solid rgba(37,211,102,0.2)',borderRadius:14,padding:18}}><div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,color:'#065f46',marginBottom:6}}>Without API Token</div><div style={{fontSize:12,color:'#065f46',lineHeight:1.7}}>All buttons open wa.me links with pre-filled text. Works perfectly for most businesses.</div></div></div>)}
        {tab==='users'&&(<div style={{display:'flex',flexDirection:'column',gap:16}}><div style={{background:C.snow,borderRadius:16,border:'1px solid '+C.glass,overflow:'hidden'}}><div style={{padding:'16px 20px',borderBottom:'1px solid '+C.glass}}><div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700}}>Team Members</div></div>{users.map((u,i)=>(<div key={u.id} style={{display:'flex',alignItems:'center',gap:12,padding:'13px 20px',borderBottom:i<users.length-1?'1px solid '+C.chalk:'none'}}><div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,'+C.blue+','+C.teal+')',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,color:'#fff',flexShrink:0}}>{(u.name||u.email||'?')[0].toUpperCase()}</div><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:C.ink}}>{u.name||'Unnamed'}</div><div style={{fontSize:11,color:C.mist}}>{u.email||u.phone}</div></div><span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:100,background:(RC[u.role]||C.mist)+'20',color:RC[u.role]||C.mist,textTransform:'capitalize'}}>{u.role}</span>{u.id===usr?.id?<span style={{fontSize:11,color:C.mist}}>You</span>:<div style={{display:'flex',gap:6}}><select value={u.role} onChange={async e=>{await supabase.from('users').update({role:e.target.value}).eq('id',u.id);setUsers(prev=>prev.map(x=>x.id===u.id?{...x,role:e.target.value}:x));showToast('Role updated \u2713')}} style={{padding:'4px 8px',borderRadius:6,border:'1px solid '+C.fog,fontSize:11,color:C.ink,cursor:'pointer',outline:'none'}}>{ROLES.map(r=><option key={r} value={r}>{r}</option>)}</select></div>}</div>))}</div></div>)}
        {tab==='plan'&&(<div style={{display:'flex',flexDirection:'column',gap:14}}>{co?.plan==='trial'&&<div style={{background:'linear-gradient(135deg,#0B1F3A,#1a3557)',borderRadius:16,padding:20,display:'flex',alignItems:'center',gap:14}}><span style={{fontSize:28}}>&#9889;</span><div style={{flex:1}}><div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,color:'#fff'}}>Trial &mdash; {trialDays} days remaining</div></div><div style={{fontFamily:'JetBrains Mono,monospace',fontSize:22,fontWeight:500,color:C.amber}}>{trialDays}d</div></div>}<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12}}>{PLANS.map(plan=>{const cur=co?.plan===plan.k;return(<div key={plan.k} style={{background:C.snow,borderRadius:16,border:'2px solid '+(cur?plan.c:C.glass),padding:18,position:'relative'}}>{cur&&<div style={{position:'absolute',top:10,right:10,fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:100,background:plan.c+'20',color:plan.c}}>Current</div>}<div style={{fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:800,color:C.ink,marginBottom:2}}>{plan.l}</div><div style={{fontFamily:'JetBrains Mono,monospace',fontSize:20,fontWeight:500,color:plan.c,marginBottom:1}}>{plan.p}</div><div style={{fontSize:11,color:C.mist,marginBottom:12}}>{plan.d}</div>{plan.f.map(f=><div key={f} style={{display:'flex',gap:6,fontSize:12,color:C.ink,marginBottom:4}}><span style={{color:plan.c}}>\u2713</span>{f}</div>)}{!cur&&<button onClick={()=>initPay(plan)} style={{...sb,width:'100%',background:plan.c,marginTop:10,padding:'9px'}}>Upgrade</button>}</div>)})}</div></div>)}
      </div>
    </div>
  )
}

function Quotes(){
  const[quotes,setQuotes]=useState([]);const[filter,setFilter]=useState('all');const[loading,setLoading]=useState(true);const[profile,setProfile]=useState(null);const[waModal,setWaModal]=useState(null);const[converting,setConverting]=useState(null);const[toast,setToast]=useState(null)
  const showToast=(msg,type='success')=>{setToast({msg,type});setTimeout(()=>setToast(null),3000)}
  const SC={draft:{bg:C.chalk,color:C.mist},sent:{bg:'rgba(27,79,216,0.1)',color:C.steel},approved:{bg:'rgba(14,165,160,0.1)',color:C.teal},rejected:{bg:'rgba(220,38,38,0.08)',color:C.red}}
  useEffect(()=>{async function load(){setLoading(true);try{const{data:{user}}=await supabase.auth.getUser();if(!user){setLoading(false);return}const{data:ud}=await supabase.from('users').select('company_id,companies(*)').eq('id',user.id).single();if(!ud){setLoading(false);return}setProfile(ud);const{data,error:qe}=await supabase.from('quotes').select('*,clients(name,phone)').eq('company_id',ud.company_id).order('created_at',{ascending:false});if(qe)throw qe;setQuotes(data||[])}catch(e){showToast('Failed to load quotes: '+(e?.message||JSON.stringify(e)),'error')}finally{setLoading(false)}}load()},[])
  async function updateStatus(id,status){try{const{error:e}=await supabase.from('quotes').update({status}).eq('id',id);if(e)throw e;setQuotes(p=>p.map(q=>q.id===id?{...q,status}:q));showToast('Status updated to '+status)}catch(e){showToast('Update failed: '+(e?.message||JSON.stringify(e)),'error')}}
  async function convertToInvoice(quote){
    setConverting(quote.id)
    try{
      const invNum='INV-'+new Date().getFullYear()+'-'+String(Math.floor(Math.random()*9000)+1000)
      const dueDate=new Date(Date.now()+30*864e5).toISOString()
      const{data:inv,error}=await supabase.from('invoices').insert({
        company_id:quote.company_id,quote_id:quote.id,
        client_id:quote.client_id,client_name:quote.client_name,
        invoice_number:invNum,type:'tax_invoice',status:'pending',
        base_amount:quote.sub_total,cgst_amount:Math.round((quote.cgst_amount||0)+(quote.sgst_amount||0))/2,sgst_amount:Math.round((quote.cgst_amount||0)+(quote.sgst_amount||0))/2,
        discount_amount:quote.discount_amount||0,
        installation:quote.installation||0,
        grand_total:quote.grand_total,
        paid_amount:0,balance_due:quote.grand_total,
        due_date:dueDate
      }).select().single()
      if(error)throw error
      await supabase.from('quotes').update({status:'approved'}).eq('id',quote.id)
      setQuotes(p=>p.map(q=>q.id===quote.id?{...q,status:'approved'}:q))
      showToast('Invoice '+invNum+' created!')
    }catch(e){showToast('Failed: '+e.message,'error')}
    setConverting(null)
  }
  const filtered=filter==='all'?quotes:quotes.filter(q=>q.status===filter)
  return(<>
    {toast&&<div style={{position:'fixed',bottom:24,right:24,background:toast.type==='error'?C.red:C.teal,color:'#fff',padding:'12px 20px',borderRadius:10,fontSize:13,fontWeight:500,zIndex:300,boxShadow:'0 8px 24px rgba(0,0,0,0.15)'}}>{toast.msg}</div>}
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:12}}>
      <h2 style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:700}}>Quotes</h2>
      <a href="/quotes/create" style={{background:C.steel,color:'#fff',textDecoration:'none',padding:'9px 18px',borderRadius:8,fontSize:13,fontWeight:600}}>+ New Quote</a>
    </div>
    <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
      {['all','draft','sent','approved','rejected'].map(s=>(<button key={s} onClick={()=>setFilter(s)} style={{padding:'6px 14px',borderRadius:100,fontSize:12,fontWeight:600,cursor:'pointer',border:'1px solid',borderColor:filter===s?C.ink:C.glass,background:filter===s?C.ink:C.snow,color:filter===s?'#fff':C.ink}}>{s.charAt(0).toUpperCase()+s.slice(1)} {s==='all'?'('+quotes.length+')':'('+quotes.filter(q=>q.status===s).length+')'}</button>))}
    </div>
    <div style={{background:C.snow,borderRadius:16,border:'1px solid '+C.glass,overflow:'hidden'}}>
      {loading?<div style={{padding:40,textAlign:'center',color:C.mist}}>Loading...</div>
      :filtered.length===0?<div style={{padding:60,textAlign:'center'}}>
        <div style={{fontSize:40,marginBottom:12}}>\ud83d\udccb</div>
        <p style={{color:C.mist,marginBottom:16}}>{filter==='all'?'No quotes yet':'No '+filter+' quotes'}</p>
        <a href="/quotes/create" style={{background:C.steel,color:'#fff',textDecoration:'none',padding:'10px 20px',borderRadius:8,fontSize:13,fontWeight:600}}>Create Quote</a>
      </div>
      :<div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:C.chalk}}>{['Quote #','Client','Amount','Status','Date','Actions'].map(h=>(<th key={h} style={{padding:'11px 16px',textAlign:'left',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:C.mist,borderBottom:'1px solid '+C.glass}}>{h}</th>))}</tr></thead>
          <tbody>{filtered.map(q=>{
            const sc=SC[q.status]||SC.draft
            const phone=q.clients?.phone||q.client_phone
            return(<tr key={q.id} style={{borderBottom:'1px solid #F8FAFC'}}>
              <td style={{padding:'13px 16px',fontFamily:'JetBrains Mono,monospace',fontSize:11,color:C.mist}}>#{q.quote_number}</td>
              <td style={{padding:'13px 16px'}}><div style={{fontWeight:600,fontSize:13,color:C.ink}}>{q.client_name}</div><div style={{fontSize:11,color:C.mist}}>{phone||''}</div></td>
              <td style={{padding:'13px 16px',fontFamily:'JetBrains Mono,monospace',fontWeight:500,color:C.ink}}>\u20b9{(q.grand_total||0).toLocaleString('en-IN')}</td>
              <td style={{padding:'13px 16px'}}>
                <select value={q.status} onChange={e=>updateStatus(q.id,e.target.value)} style={{padding:'3px 8px',borderRadius:100,fontSize:10,fontWeight:700,border:'none',cursor:'pointer',background:sc.bg,color:sc.color,outline:'none',appearance:'none',paddingRight:16}}>
                  {['draft','sent','approved','rejected'].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
              </td>
              <td style={{padding:'13px 16px',fontSize:12,color:C.mist}}>{new Date(q.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</td>
              <td style={{padding:'13px 16px'}}>
                <div style={{display:'flex',gap:5,alignItems:'center',flexWrap:'wrap'}}>
                  <QuotePDFBar quote={q} company={profile?.companies||{}} client={{name:q.client_name,phone,address:q.client_address}} items={[]} bank={profile?.companies||{}}/>
                  <button onClick={()=>setWaModal(q)} style={{padding:'5px 8px',borderRadius:6,border:'1px solid rgba(37,211,102,0.3)',background:'rgba(37,211,102,0.06)',fontSize:11,cursor:'pointer',color:'#25D366'}}>WA</button>
                  {q.status!=='rejected'&&<button onClick={()=>convertToInvoice(q)} disabled={converting===q.id} style={{padding:'5px 8px',borderRadius:6,border:'1px solid rgba(14,165,160,0.3)',background:'rgba(14,165,160,0.06)',fontSize:11,cursor:'pointer',color:C.teal,whiteSpace:'nowrap'}}>{converting===q.id?'...':'→ Invoice'}</button>}
                </div>
              </td>
            </tr>)})}
          </tbody>
        </table>
      </div>}
    </div>
    {waModal&&<WhatsAppModal isOpen={!!waModal} onClose={()=>setWaModal(null)} contact={{name:waModal.client_name,phone:waModal.clients?.phone||waModal.client_phone}} companyId={profile?.company_id} companyName={profile?.companies?.name||'QLekha'}/>}
  </>)
}

function Analytics(){const[loading,setLoading]=useState(true);const[quotes,setQuotes]=useState([]);const[invoices,setInvoices]=useState([]);const[payments,setPayments]=useState([]);const[clients,setClients]=useState([]);const now=new Date();useEffect(()=>{async function load(){setLoading(true);const{data:{user}}=await supabase.auth.getUser();if(!user)return setLoading(false);const{data:ud}=await supabase.from('users').select('company_id').eq('id',user.id).single();if(!ud)return setLoading(false);const cid=ud.company_id;const[qr,ir,pr,cr]=await Promise.all([supabase.from('quotes').select('id,status,grand_total,created_at').eq('company_id',cid),supabase.from('invoices').select('id,status,grand_total,paid_amount,balance_due,created_at').eq('company_id',cid),supabase.from('payments').select('amount,payment_date').eq('company_id',cid),supabase.from('clients').select('id,name,total_quotes,total_billed,total_paid,tag').eq('company_id',cid)]);setQuotes(qr.data||[]);setInvoices(ir.data||[]);setPayments(pr.data||[]);setClients(cr.data||[]);setLoading(false)}load()},[]);const totalCollected=payments.reduce((s,p)=>s+(p.amount||0),0);const totalOut=invoices.filter(i=>['pending','partial','overdue'].includes(i.status)).reduce((s,i)=>s+(i.balance_due||0),0);const sent=quotes.filter(q=>['sent','approved','rejected'].includes(q.status));const won=quotes.filter(q=>q.status==='approved');const winRate=sent.length>0?Math.round((won.length/sent.length)*100):0;const thisM=(d)=>{const dt=new Date(d);return dt.getMonth()===now.getMonth()&&dt.getFullYear()===now.getFullYear()};const thisMonthRev=invoices.filter(i=>thisM(i.created_at)&&i.status!=='cancelled').reduce((s,i)=>s+(i.grand_total||0),0);const monthly=Array.from({length:6},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-(5-i),1);const value=invoices.filter(inv=>{const id=new Date(inv.created_at);return id.getMonth()===d.getMonth()&&id.getFullYear()===d.getFullYear()&&inv.status!=='cancelled'}).reduce((s,inv)=>s+(inv.grand_total||0),0);return{label:MONTHS[d.getMonth()],value}});const topClients=[...clients].sort((a,b)=>(b.total_billed||0)-(a.total_billed||0)).slice(0,5);const maxBar=Math.max(...monthly.map(m=>m.value),1);const funnel=[{l:'Created',n:quotes.length,c:'#6366F1'},{l:'Sent',n:quotes.filter(q=>['sent','approved','rejected'].includes(q.status)).length,c:C.steel},{l:'Won',n:won.length,c:C.teal},{l:'Invoiced',n:invoices.length,c:C.amber},{l:'Paid',n:invoices.filter(i=>i.status==='paid').length,c:C.green}];const kpis=[{i:'&#128176;',v:fmt(thisMonthRev),l:'Revenue this month',c:C.steel},{i:'&#9989;',v:fmt(totalCollected),l:'Total collected',c:C.green},{i:'&#127919;',v:winRate+'%',l:'Win rate',c:C.teal},{i:'&#8987;',v:fmt(totalOut),l:'Outstanding',c:C.amber}];if(loading)return<div style={{padding:60,textAlign:'center',color:C.mist}}>&#128200; Loading...</div>;return(<><div style={{marginBottom:20}}><h2 style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,color:C.ink,marginBottom:4}}>Analytics</h2><p style={{fontSize:13,color:C.mist}}>Business performance at a glance.</p></div>{quotes.length===0&&invoices.length===0&&<div style={{background:C.snow,borderRadius:16,border:'1px solid '+C.glass,padding:'60px 20px',textAlign:'center',marginBottom:20}}><div style={{fontSize:48,marginBottom:16}}>&#128202;</div><p style={{color:C.mist,fontSize:14,marginBottom:20}}>Create quotes and invoices to see analytics.</p><a href="/quotes/create" style={{background:C.steel,color:C.snow,textDecoration:'none',padding:'10px 20px',borderRadius:10,fontSize:13,fontWeight:700}}>&#128203; Create First Quote</a></div>}<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:16,marginBottom:20}}>{kpis.map(k=>(<div key={k.l} style={{background:C.snow,borderRadius:16,padding:20,border:'1px solid '+C.glass,borderTop:'3px solid '+k.c}}><div style={{width:36,height:36,borderRadius:9,background:k.c+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,marginBottom:10}} dangerouslySetInnerHTML={{__html:k.i}}/><div style={{fontFamily:'JetBrains Mono,monospace',fontSize:24,fontWeight:500,color:C.ink,marginBottom:2}}>{k.v}</div><div style={{fontSize:12,color:C.mist}}>{k.l}</div></div>))}</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}><div style={{background:C.snow,borderRadius:16,border:'1px solid '+C.glass,overflow:'hidden'}}><div style={{padding:'14px 18px',borderBottom:'1px solid '+C.glass}}><div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700}}>Monthly Revenue</div></div><div style={{padding:18}}>{monthly.every(m=>m.value===0)?<div style={{padding:30,textAlign:'center',color:C.mist,fontSize:13}}>No invoices yet</div>:<svg width="100%" height={160} viewBox={'0 0 '+monthly.length*80+' 180'} style={{minWidth:300}}>{monthly.map((m,i)=>{const bH=(m.value/maxBar)*140;const x=i*80+10;return(<g key={i}><rect x={x} y={150-bH} width={50} height={bH} rx={5} fill={C.steel} opacity={0.85}/>{m.value>0&&<text x={x+25} y={150-bH-5} textAnchor="middle" fontSize={9} fontFamily="JetBrains Mono,monospace" fill={C.steel}>{m.value>=1000?(m.value/1000).toFixed(0)+'K':m.value}</text>}<text x={x+25} y={168} textAnchor="middle" fontSize={11} fontFamily="Inter,sans-serif" fill={C.mist}>{m.label}</text></g>)})}</svg>}</div></div><div style={{background:C.snow,borderRadius:16,border:'1px solid '+C.glass,overflow:'hidden'}}><div style={{padding:'14px 18px',borderBottom:'1px solid '+C.glass}}><div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700}}>Conversion Funnel</div></div><div style={{padding:18}}>{quotes.length===0?<div style={{padding:30,textAlign:'center',color:C.mist,fontSize:13}}>No quotes yet</div>:funnel.map(f=>(<div key={f.l} style={{marginBottom:12}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}><span style={{fontSize:13,fontWeight:600,color:C.ink}}>{f.l}</span><span style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:600,color:f.c}}>{f.n}</span></div><div style={{height:8,background:C.glass,borderRadius:100,overflow:'hidden'}}><div style={{height:'100%',width:(quotes.length>0?(f.n/quotes.length)*100:0)+'%',background:f.c,borderRadius:100}}/></div></div>))}</div></div></div><div style={{background:C.snow,borderRadius:16,border:'1px solid '+C.glass,overflow:'hidden'}}><div style={{padding:'14px 18px',borderBottom:'1px solid '+C.glass,display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700}}>Top Clients</div><a href="/crm" style={{fontSize:12,color:C.steel,textDecoration:'none',fontWeight:600}}>View all</a></div><div style={{padding:18}}>{topClients.length===0?<div style={{padding:30,textAlign:'center',color:C.mist,fontSize:13}}>No clients yet</div>:topClients.map((c,i)=>(<div key={c.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:i<topClients.length-1?'1px solid '+C.glass:'none'}}><div style={{width:32,height:32,borderRadius:'50%',background:C.steel,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,color:'#fff',flexShrink:0}}>{c.name[0]}</div><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:C.ink}}>{c.name}</div><div style={{fontSize:11,color:C.mist}}>{c.tag} \u00b7 {c.total_quotes||0} quotes</div></div><div style={{textAlign:'right'}}><div style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:500,color:C.ink}}>{fmt(c.total_billed||0)}</div><div style={{fontSize:11,color:(c.total_billed-c.total_paid)>0?C.amber:C.green}}>{(c.total_billed-c.total_paid)>0?fmt(c.total_billed-c.total_paid)+' due':'Paid \u2713'}</div></div></div>))}</div></div></>)}

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
      <Route path="/quotes" element={session ? <Layout><Quotes/></Layout> : <Navigate to="/auth" replace/>}/>
      <Route path="/quotes/create" element={session?<Layout><QuoteWizard/></Layout>:<Navigate to="/auth" replace/>}/>
      <Route path="/billing" element={session ? <Layout><Billing/></Layout> : <Navigate to="/auth" replace/>}/>
      <Route path="/stock" element={session ? <Layout><Stock/></Layout> : <Navigate to="/auth" replace/>}/>
      <Route path="/crm" element={session ? <Layout><CRM/></Layout> : <Navigate to="/auth" replace/>}/>
      <Route path="/analytics" element={session ? <Layout><Analytics/></Layout> : <Navigate to="/auth" replace/>}/>
      <Route path="/settings" element={session ? <Layout><Settings/></Layout> : <Navigate to="/auth" replace/>}/>
      <Route path="/pdf-demo" element={session ? <Layout><PDFDemoPage/></Layout> : <Navigate to="/auth" replace/>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  )
}

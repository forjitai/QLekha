import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ── Design tokens (consistent with QLekha brand) ──
const C = {
  navy: '#0B1F3A', navyLt: '#122847',
  blue: '#1A6FE8', blueLt: '#3B8EFF', bluePale: 'rgba(26,111,232,0.08)',
  teal: '#0EA5A0',
  amber: '#FFB400',
  green: '#22C55E',
  red: '#EF4444',
  gray100: '#E8EDF3', gray200: '#D1D9E6', gray400: '#8A9BB5', gray600: '#4A5568',
  bg: '#F0F4F8', white: '#fff',
}

const S = {
  page: { minHeight:'100vh', background:C.navy, display:'flex', position:'relative', overflow:'hidden', fontFamily:'Inter,sans-serif' },
  grid: { position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(26,111,232,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(26,111,232,0.05) 1px,transparent 1px)', backgroundSize:'40px 40px', pointerEvents:'none' },
  left: { flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'60px 80px', position:'relative', zIndex:1 },
  right: { width:480, background:C.white, display:'flex', flexDirection:'column', justifyContent:'center', padding:'60px 48px', position:'relative', zIndex:1, minHeight:'100vh' },
  logo: { fontFamily:'Syne,sans-serif', fontSize:28, fontWeight:800, color:C.white, marginBottom:40 },
  logoSpan: { color:C.blueLt },
  h1: { fontFamily:'Syne,sans-serif', fontSize:'clamp(32px,4vw,52px)', fontWeight:800, color:C.white, lineHeight:1.1, letterSpacing:'-1.5px', marginBottom:16 },
  h1Span: { color:C.blueLt },
  sub: { fontSize:16, color:'rgba(255,255,255,0.5)', lineHeight:1.7, maxWidth:420 },
  features: { marginTop:48, display:'flex', flexDirection:'column', gap:16 },
  feat: { display:'flex', alignItems:'flex-start', gap:14 },
  featIcon: { width:36, height:36, borderRadius:9, background:'rgba(26,111,232,0.2)', border:'1px solid rgba(26,111,232,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0, marginTop:2 },
  featText: { fontSize:14, color:'rgba(255,255,255,0.7)', lineHeight:1.5 },
  featTitle: { fontSize:14, fontWeight:600, color:C.white, marginBottom:2 },
  // Form side
  formTitle: { fontFamily:'Syne,sans-serif', fontSize:24, fontWeight:800, color:C.navy, marginBottom:6 },
  formSub: { fontSize:13, color:C.gray400, marginBottom:32, lineHeight:1.5 },
  label: { fontSize:11, fontWeight:700, color:C.gray600, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:5 },
  input: { width:'100%', padding:'11px 14px', borderRadius:10, border:`1.5px solid ${C.gray200}`, fontSize:14, fontFamily:'Inter,sans-serif', color:C.navy, background:C.white, outline:'none', transition:'all 0.2s', marginBottom:4 },
  inputFocus: { borderColor:C.blue, boxShadow:'0 0 0 3px rgba(26,111,232,0.1)' },
  inputError: { borderColor:C.red, boxShadow:'0 0 0 3px rgba(239,68,68,0.1)' },
  btn: { width:'100%', padding:'13px', borderRadius:10, border:'none', background:C.blue, color:C.white, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'Syne,sans-serif', transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'center', gap:8 },
  btnGhost: { background:'transparent', border:`1.5px solid ${C.gray200}`, color:C.navy },
  toggle: { textAlign:'center', marginTop:20, fontSize:13, color:C.gray400 },
  toggleBtn: { color:C.blue, fontWeight:600, cursor:'pointer', background:'none', border:'none', fontSize:13, fontFamily:'Inter,sans-serif' },
  errMsg: { fontSize:12, color:C.red, marginTop:4, marginBottom:8 },
  divider: { display:'flex', alignItems:'center', gap:12, margin:'20px 0' },
  dividerLine: { flex:1, height:1, background:C.gray100 },
  dividerText: { fontSize:11, color:C.gray400, textTransform:'uppercase', letterSpacing:'0.5px', whiteSpace:'nowrap' },
  // OTP inputs
  otpWrap: { display:'flex', gap:10, justifyContent:'center', margin:'24px 0' },
  otpInput: { width:52, height:60, textAlign:'center', fontSize:24, fontFamily:'JetBrains Mono,monospace', fontWeight:500, borderRadius:12, border:`2px solid ${C.gray200}`, color:C.navy, outline:'none', transition:'all 0.2s' },
  // Onboarding
  stepDots: { display:'flex', gap:8, justifyContent:'center', marginBottom:32 },
  stepDot: (active, done) => ({ width: active ? 24 : 8, height:8, borderRadius:100, background: done ? C.teal : active ? C.blue : C.gray200, transition:'all 0.3s' }),
  stepTitle: { fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:800, color:C.navy, marginBottom:6 },
  stepSub: { fontSize:13, color:C.gray400, marginBottom:28, lineHeight:1.5 },
  // Chips
  chipGrid: { display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 },
  chip: (sel) => ({ padding:'8px 14px', borderRadius:100, border:`1.5px solid ${sel ? C.blue : C.gray200}`, background: sel ? C.bluePale : C.white, color: sel ? C.blue : C.gray600, fontSize:12, fontWeight:600, cursor:'pointer', transition:'all 0.15s' }),
  // Plan cards
  planGrid: { display:'flex', flexDirection:'column', gap:10, marginBottom:20 },
  planCard: (sel) => ({ padding:'14px 16px', borderRadius:12, border:`2px solid ${sel ? C.blue : C.gray100}`, background: sel ? C.bluePale : C.white, cursor:'pointer', transition:'all 0.15s', display:'flex', alignItems:'center', gap:12 }),
}

// ── Floating window SVG background decoration ──
function WindowSVG() {
  return (
    <svg style={{ position:'absolute', bottom:40, left:60, opacity:0.07, pointerEvents:'none' }} width="320" height="280" viewBox="0 0 320 280" fill="none">
      <rect x="10" y="10" width="300" height="260" rx="4" stroke="white" strokeWidth="3"/>
      <line x1="160" y1="10" x2="160" y2="270" stroke="white" strokeWidth="2"/>
      <line x1="10" y1="140" x2="310" y2="140" stroke="white" strokeWidth="2"/>
      <rect x="20" y="20" width="130" height="110" rx="2" stroke="white" strokeWidth="1.5"/>
      <rect x="170" y="20" width="130" height="110" rx="2" stroke="white" strokeWidth="1.5"/>
      <rect x="20" y="150" width="130" height="110" rx="2" stroke="white" strokeWidth="1.5"/>
      <rect x="170" y="150" width="130" height="110" rx="2" stroke="white" strokeWidth="1.5"/>
      <circle cx="157" cy="140" r="6" stroke="white" strokeWidth="1.5"/>
      <circle cx="163" cy="140" r="6" stroke="white" strokeWidth="1.5"/>
    </svg>
  )
}

// ── Input component ──
function Input({ label, error, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom:16 }}>
      {label && <label style={S.label}>{label}</label>}
      <input
        {...props}
        style={{ ...S.input, ...(focused ? S.inputFocus : {}), ...(error ? S.inputError : {}) }}
        onFocus={() => setFocused(true)}
        onBlur={e => { setFocused(false); props.onBlur?.(e) }}
      />
      {error && <div style={S.errMsg}>{error}</div>}
    </div>
  )
}

// ── OTP Input ──
function OTPInput({ value, onChange }) {
  const inputs = useRef([])
  const digits = (value || '').split('').concat(Array(6).fill('')).slice(0, 6)

  function handleKey(i, e) {
    const val = e.target.value.replace(/\D/g, '').slice(-1)
    const next = digits.map((d, j) => j === i ? val : d)
    onChange(next.join(''))
    if (val && i < 5) inputs.current[i + 1]?.focus()
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus()
  }

  function handlePaste(e) {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(paste.padEnd(6, '').slice(0, 6))
    inputs.current[Math.min(paste.length, 5)]?.focus()
    e.preventDefault()
  }

  return (
    <div style={S.otpWrap}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => inputs.current[i] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={() => {}}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          style={{ ...S.otpInput, borderColor: d ? C.blue : C.gray200, boxShadow: d ? '0 0 0 3px rgba(26,111,232,0.12)' : 'none' }}
        />
      ))}
    </div>
  )
}

// ── STEP 1 — Company Info ──
function OnboardStep1({ data, onChange, onNext }) {
  const [err, setErr] = useState({})
  function validate() {
    const e = {}
    if (!data.company_name?.trim()) e.company_name = 'Company name is required'
    if (!data.owner_name?.trim()) e.owner_name = 'Your name is required'
    if (!data.phone?.trim()) e.phone = 'Phone number is required'
    setErr(e)
    return !Object.keys(e).length
  }
  return (
    <div>
      <div style={S.stepTitle}>Tell us about your business</div>
      <div style={S.stepSub}>This appears on your quotes and invoices.</div>
      <Input label="Business / Company Name *" placeholder="Kumar Aluminium Works" value={data.company_name || ''} onChange={e => onChange('company_name', e.target.value)} error={err.company_name}/>
      <Input label="Your Name *" placeholder="Rajesh Kumar" value={data.owner_name || ''} onChange={e => onChange('owner_name', e.target.value)} error={err.owner_name}/>
      <Input label="Phone Number *" placeholder="+91 98765 43210" type="tel" value={data.phone || ''} onChange={e => onChange('phone', e.target.value)} error={err.phone}/>
      <Input label="City" placeholder="Bengaluru" value={data.city || ''} onChange={e => onChange('city', e.target.value)}/>
      <Input label="GST Number" placeholder="29ABCDE1234F1Z5 (optional)" value={data.gst_number || ''} onChange={e => onChange('gst_number', e.target.value)}/>
      <button style={S.btn} onClick={() => validate() && onNext()}>Continue →</button>
    </div>
  )
}

// ── STEP 2 — Material Type ──
function OnboardStep2({ data, onChange, onNext, onBack }) {
  const materials = [
    { key:'aluminium', icon:'🔩', label:'Aluminium', sub:'Sliding, casement, door, partition' },
    { key:'upvc', icon:'🪟', label:'UPVC', sub:'Casement, tilt & turn, sliding' },
    { key:'glass', icon:'💎', label:'Glass Works', sub:'Partitions, facades, frameless' },
    { key:'mixed', icon:'🏗️', label:'All of the above', sub:'Multiple material types' },
  ]
  return (
    <div>
      <div style={S.stepTitle}>What do you fabricate?</div>
      <div style={S.stepSub}>We'll set up your profile catalogue and pricing accordingly.</div>
      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:28 }}>
        {materials.map(m => (
          <div key={m.key} onClick={() => onChange('material_type', m.key)}
            style={{ padding:'14px 16px', borderRadius:12, border:`2px solid ${data.material_type === m.key ? C.blue : C.gray100}`, background: data.material_type === m.key ? C.bluePale : C.white, cursor:'pointer', transition:'all 0.15s', display:'flex', alignItems:'center', gap:14 }}>
            <span style={{ fontSize:24 }}>{m.icon}</span>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>{m.label}</div>
              <div style={{ fontSize:12, color:C.gray400, marginTop:2 }}>{m.sub}</div>
            </div>
            {data.material_type === m.key && <span style={{ marginLeft:'auto', color:C.blue, fontSize:18 }}>✓</span>}
          </div>
        ))}
      </div>
      <button style={S.btn} onClick={() => data.material_type && onNext()} disabled={!data.material_type}>Continue →</button>
      <button style={{ ...S.btn, ...S.btnGhost, marginTop:10 }} onClick={onBack}>← Back</button>
    </div>
  )
}

// ── STEP 3 — Language ──
function OnboardStep3({ data, onChange, onNext, onBack }) {
  const langs = [
    { code:'en', native:'English', script:'Aa' },
    { code:'hi', native:'हिन्दी', script:'अ' },
    { code:'kn', native:'ಕನ್ನಡ', script:'ಕ' },
    { code:'ta', native:'தமிழ்', script:'த' },
    { code:'te', native:'తెలుగు', script:'త' },
    { code:'ml', native:'മലയാളം', script:'മ' },
    { code:'gu', native:'ગુજરાતી', script:'ગ' },
    { code:'mr', native:'मराठी', script:'म' },
    { code:'pa', native:'ਪੰਜਾਬੀ', script:'ਪ' },
    { code:'bn', native:'বাংলা', script:'ব' },
    { code:'or', native:'ଓଡ଼ିଆ', script:'ଓ' },
    { code:'ur', native:'اردو', script:'ا' },
  ]
  return (
    <div>
      <div style={S.stepTitle}>Pick your language</div>
      <div style={S.stepSub}>QLekha works in 14 Indian languages. You can change this anytime in Settings.</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:28 }}>
        {langs.map(l => (
          <div key={l.code} onClick={() => onChange('language', l.code)}
            style={{ padding:'12px', borderRadius:10, border:`2px solid ${data.language === l.code ? C.blue : C.gray100}`, background: data.language === l.code ? C.bluePale : C.white, cursor:'pointer', textAlign:'center', transition:'all 0.15s' }}>
            <div style={{ fontSize:20, fontWeight:700, color: data.language === l.code ? C.blue : C.navy, marginBottom:2 }}>{l.script}</div>
            <div style={{ fontSize:11, color: data.language === l.code ? C.blue : C.gray600, fontWeight:600 }}>{l.native}</div>
          </div>
        ))}
      </div>
      <button style={S.btn} onClick={() => data.language && onNext()}>Continue →</button>
      <button style={{ ...S.btn, ...S.btnGhost, marginTop:10 }} onClick={onBack}>← Back</button>
    </div>
  )
}

// ── STEP 4 — PDF & Brand ──
function OnboardStep4({ data, onChange, onNext, onBack }) {
  const designs = [
    { key:'classic_blue', label:'Classic Blue', color:'#1A6FE8', sub:'Clean, professional' },
    { key:'midnight', label:'Midnight', color:'#0B1F3A', sub:'Bold, premium feel' },
    { key:'teal_fresh', label:'Teal Fresh', color:'#0EA5A0', sub:'Modern, energetic' },
    { key:'amber_warm', label:'Amber Warm', color:'#FFB400', sub:'Warm, approachable' },
  ]
  return (
    <div>
      <div style={S.stepTitle}>Choose your quote design</div>
      <div style={S.stepSub}>Your PDF quotes and invoices will use this colour theme. You can change it later.</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
        {designs.map(d => (
          <div key={d.key} onClick={() => onChange('pdf_design', d.key)}
            style={{ borderRadius:12, border:`2px solid ${data.pdf_design === d.key ? d.color : C.gray100}`, overflow:'hidden', cursor:'pointer', transition:'all 0.15s' }}>
            <div style={{ height:80, background:`linear-gradient(135deg,${d.color}22,${d.color}44)`, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
              <div style={{ width:48, height:48, borderRadius:8, background:d.color, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:800, color:'#fff' }}>Q</div>
              {data.pdf_design === d.key && <div style={{ position:'absolute', top:8, right:8, width:20, height:20, borderRadius:'50%', background:d.color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700 }}>✓</div>}
            </div>
            <div style={{ padding:'10px 12px', background:C.white }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{d.label}</div>
              <div style={{ fontSize:11, color:C.gray400 }}>{d.sub}</div>
            </div>
          </div>
        ))}
      </div>
      <Input label="GST Rate %" placeholder="18" type="number" value={data.gst_rate || ''} onChange={e => onChange('gst_rate', e.target.value)}/>
      <button style={S.btn} onClick={onNext}>Continue →</button>
      <button style={{ ...S.btn, ...S.btnGhost, marginTop:10 }} onClick={onBack}>← Back</button>
    </div>
  )
}

// ── STEP 5 — Done ──
function OnboardStep5({ data, onFinish, loading }) {
  return (
    <div style={{ textAlign:'center' }}>
      <div style={{ width:72, height:72, borderRadius:'50%', background:'rgba(34,197,94,0.1)', border:'3px solid #22C55E', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, margin:'0 auto 20px' }}>✓</div>
      <div style={S.stepTitle}>You're all set, {data.owner_name?.split(' ')[0]}!</div>
      <div style={{ fontSize:13, color:C.gray400, marginBottom:32, lineHeight:1.7 }}>
        <strong style={{ color:C.navy }}>{data.company_name}</strong> is ready on QLekha.<br/>
        Your 14-day free trial starts now — no credit card needed.<br/>
        Create your first quote in under 5 minutes.
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:28, textAlign:'left' }}>
        {[
          ['🔩', `${data.material_type === 'mixed' ? 'All materials' : data.material_type?.charAt(0).toUpperCase() + data.material_type?.slice(1)} setup`],
          ['🌐', `Language: ${data.language?.toUpperCase()}`],
          ['🎨', `PDF theme: ${data.pdf_design?.replace(/_/g,' ')}`],
          ['⚡', '14-day free trial · No credit card'],
        ].map(([icon, text]) => (
          <div key={text} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, background:C.bg, fontSize:13 }}>
            <span style={{ fontSize:18 }}>{icon}</span>
            <span style={{ color:C.navy, fontWeight:500 }}>{text}</span>
          </div>
        ))}
      </div>
      <button style={{ ...S.btn, background:`linear-gradient(135deg,${C.blue},${C.teal})`, padding:'14px' }} onClick={onFinish} disabled={loading}>
        {loading ? '⏳ Setting up your account...' : '🚀 Open QLekha Dashboard →'}
      </button>
    </div>
  )
}

// ── MAIN AUTH COMPONENT ──
export default function Auth() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')      // login | signup | otp | onboard | forgot
  const [step, setStep] = useState(1)             // onboarding step 1-5
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpTimer, setOtpTimer] = useState(0)
  const [showPassword, setShowPassword] = useState(false)

  // Onboarding state
  const [onboard, setOnboard] = useState({
    company_name: '', owner_name: '', phone: '', city: '', gst_number: '',
    material_type: 'aluminium', language: 'en', pdf_design: 'classic_blue', gst_rate: '18'
  })

  // OTP countdown
  useEffect(() => {
    if (otpTimer > 0) {
      const t = setTimeout(() => setOtpTimer(t => t - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [otpTimer])

  function clearMessages() { setError(''); setSuccess('') }

  // ── LOGIN ──
  async function handleLogin() {
    clearMessages()
    if (!email || !password) return setError('Enter your email and password.')
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) {
      if (err.message.includes('Invalid login')) setError('Wrong email or password. Try again.')
      else if (err.message.includes('Email not confirmed')) { setMode('otp'); setOtpTimer(60); setSuccess('Check your email for the verification code.') }
      else setError(err.message)
    } else {
      navigate('/dashboard')
    }
  }

  // ── SIGNUP ──
  async function handleSignup() {
    clearMessages()
    if (!email) return setError('Enter your email address.')
    if (!password || password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirmPassword) return setError('Passwords do not match.')
    setLoading(true)
    const { error: err } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + '/auth' } })
    setLoading(false)
    if (err) {
      if (err.message.includes('already registered')) setError('This email is already registered. Sign in instead.')
      else setError(err.message)
    } else {
      setMode('otp')
      setOtpTimer(60)
      setSuccess('We sent a 6-digit code to ' + email + '. Check your inbox.')
    }
  }

  // ── OTP VERIFY ──
  async function handleOTP() {
    clearMessages()
    if (otp.length !== 6) return setError('Enter the 6-digit code.')
    setLoading(true)
    const { error: err } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
    setLoading(false)
    if (err) {
      setError('Incorrect or expired code. Request a new one.')
    } else {
      setMode('onboard')
      setStep(1)
    }
  }

  async function resendOTP() {
    if (otpTimer > 0) return
    setLoading(true)
    await supabase.auth.resend({ type: 'signup', email })
    setLoading(false)
    setOtpTimer(60)
    setSuccess('New code sent to ' + email)
  }

  // ── FORGOT PASSWORD ──
  async function handleForgot() {
    clearMessages()
    if (!email) return setError('Enter your email address.')
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/auth?reset=1' })
    setLoading(false)
    if (err) setError(err.message)
    else setSuccess('Password reset link sent to ' + email + '. Check your inbox.')
  }

  // ── FINISH ONBOARDING ──
  async function finishOnboarding() {
    clearMessages()
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // 1. Create company
      const { data: company, error: cErr } = await supabase.from('companies').insert({
        name: onboard.company_name,
        owner_name: onboard.owner_name,
        phone: onboard.phone,
        city: onboard.city,
        gst_number: onboard.gst_number || null,
        plan: 'trial',
        trial_started_at: new Date().toISOString(),
        plan_expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        default_language: onboard.language,
        pdf_design: onboard.pdf_design,
      }).select().single()
      if (cErr) throw cErr

      // 2. Create user profile
      const { error: uErr } = await supabase.from('users').insert({
        id: user.id,
        company_id: company.id,
        name: onboard.owner_name,
        email: user.email,
        phone: onboard.phone,
        role: 'owner',
        language: onboard.language,
      })
      if (uErr) throw uErr

      // 3. Seed default profile company (SBPL)
      await supabase.from('profile_companies').insert({
        company_id: company.id,
        name: 'SBPL',
        code: 'SBPL',
        is_active: true,
      })

      setLoading(false)
      navigate('/dashboard')
    } catch (err) {
      setLoading(false)
      setError('Setup failed: ' + err.message)
    }
  }

  function onboardChange(key, val) {
    setOnboard(prev => ({ ...prev, [key]: val }))
  }

  // ── LEFT PANEL — varies by mode ──
  const leftContent = {
    login: { title: <>Welcome<br/>back to<br/><span style={S.h1Span}>QLekha</span></>, sub: 'Your window business, fully organised.' },
    signup: { title: <>Start building<br/>smarter with<br/><span style={S.h1Span}>QLekha</span></>, sub: '14-day free trial. No credit card needed.' },
    otp: { title: <>Check your<br/><span style={S.h1Span}>inbox</span></>, sub: 'One step away from your account.' },
    onboard: { title: <>Almost<br/>ready,<br/><span style={S.h1Span}>let's go</span></>, sub: 'Just a few details to get you started.' },
    forgot: { title: <>Reset your<br/><span style={S.h1Span}>password</span></>, sub: 'We'll send a reset link to your email.' },
  }
  const lc = leftContent[mode] || leftContent.login

  return (
    <div style={S.page}>
      {/* Blueprint grid */}
      <div style={S.grid}/>

      {/* Window SVG decoration */}
      <WindowSVG />

      {/* LEFT — branding panel */}
      <div style={S.left}>
        <div style={S.logo}>Q<span style={S.logoSpan}>Lekha</span><span style={{ marginLeft:10, fontSize:11, fontWeight:700, background:'rgba(26,111,232,0.25)', color:'#3B8EFF', padding:'3px 9px', borderRadius:100 }}>by ForjitAI</span></div>
        <h1 style={S.h1}>{lc.title}</h1>
        <p style={S.sub}>{lc.sub}</p>
        {(mode === 'login' || mode === 'signup') && (
          <div style={S.features}>
            {[
              { icon:'⚡', title:'Quotes in 5 minutes', text:'Create detailed window quotations faster than ever.' },
              { icon:'💬', title:'Send via WhatsApp', text:'PDF quote directly to your client's phone.' },
              { icon:'🌐', title:'14 Indian languages', text:'QLekha works in Hindi, Kannada, Tamil and more.' },
            ].map(f => (
              <div key={f.title} style={S.feat}>
                <div style={S.featIcon}>{f.icon}</div>
                <div>
                  <div style={S.featTitle}>{f.title}</div>
                  <div style={S.featText}>{f.text}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {mode === 'onboard' && (
          <div style={{ marginTop:40 }}>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:16 }}>Setting up</div>
            {['Business details','What you make','Your language','Quote design','You\'re ready'].map((label, i) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width:24, height:24, borderRadius:'50%', background: step > i+1 ? C.teal : step === i+1 ? C.blue : 'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff', flexShrink:0 }}>
                  {step > i+1 ? '✓' : i+1}
                </div>
                <span style={{ fontSize:13, color: step === i+1 ? '#fff' : step > i+1 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)', fontWeight: step === i+1 ? 600 : 400 }}>{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT — form panel */}
      <div style={S.right}>

        {/* ── LOGIN ── */}
        {mode === 'login' && (
          <div>
            <div style={S.formTitle}>Sign in</div>
            <div style={S.formSub}>Enter your email and password to continue.</div>
            {error && <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8, padding:'10px 14px', fontSize:13, color:C.red, marginBottom:16 }}>{error}</div>}
            {success && <div style={{ background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)', borderRadius:8, padding:'10px 14px', fontSize:13, color:C.green, marginBottom:16 }}>{success}</div>}
            <Input label="Email" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}/>
            <div style={{ marginBottom:16 }}>
              <label style={S.label}>Password</label>
              <div style={{ position:'relative' }}>
                <input type={showPassword ? 'text' : 'password'} placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  style={{ ...S.input, paddingRight:44, marginBottom:0 }}/>
                <button onClick={() => setShowPassword(v => !v)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:C.gray400, fontSize:16 }}>{showPassword ? '🙈' : '👁'}</button>
              </div>
            </div>
            <div style={{ textAlign:'right', marginTop:-8, marginBottom:20 }}>
              <button style={{ ...S.toggleBtn, fontSize:12 }} onClick={() => { setMode('forgot'); clearMessages() }}>Forgot password?</button>
            </div>
            <button style={{ ...S.btn, background: loading ? C.gray200 : C.blue }} onClick={handleLogin} disabled={loading}>
              {loading ? '⏳ Signing in...' : 'Sign in →'}
            </button>
            <div style={S.divider}><div style={S.dividerLine}/><span style={S.dividerText}>or</span><div style={S.dividerLine}/></div>
            <div style={S.toggle}>Don't have an account? <button style={S.toggleBtn} onClick={() => { setMode('signup'); clearMessages() }}>Create one — it's free</button></div>
          </div>
        )}

        {/* ── SIGNUP ── */}
        {mode === 'signup' && (
          <div>
            <div style={S.formTitle}>Create account</div>
            <div style={S.formSub}>Free 14-day trial. No credit card needed.</div>
            {error && <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8, padding:'10px 14px', fontSize:13, color:C.red, marginBottom:16 }}>{error}</div>}
            <Input label="Work Email *" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)}/>
            <div style={{ marginBottom:16 }}>
              <label style={S.label}>Password *</label>
              <div style={{ position:'relative' }}>
                <input type={showPassword ? 'text' : 'password'} placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)}
                  style={{ ...S.input, paddingRight:44, marginBottom:0 }}/>
                <button onClick={() => setShowPassword(v => !v)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:C.gray400, fontSize:16 }}>{showPassword ? '🙈' : '👁'}</button>
              </div>
              {password.length > 0 && (
                <div style={{ display:'flex', gap:4, marginTop:6 }}>
                  {[password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password)].map((ok, i) => (
                    <div key={i} style={{ flex:1, height:3, borderRadius:100, background: ok ? C.green : C.gray100, transition:'all 0.3s' }}/>
                  ))}
                </div>
              )}
            </div>
            <Input label="Confirm Password *" type="password" placeholder="Same password again" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} error={confirmPassword && password !== confirmPassword ? 'Passwords do not match' : ''}/>
            {error && <div style={S.errMsg}>{error}</div>}
            <button style={{ ...S.btn, background: loading ? C.gray200 : C.blue, marginTop:8 }} onClick={handleSignup} disabled={loading}>
              {loading ? '⏳ Creating account...' : 'Create account →'}
            </button>
            <div style={{ textAlign:'center', marginTop:12, fontSize:11, color:C.gray400 }}>
              By signing up you agree to our <span style={{ color:C.blue, cursor:'pointer' }}>Terms of Service</span> and <span style={{ color:C.blue, cursor:'pointer' }}>Privacy Policy</span>.
            </div>
            <div style={S.divider}><div style={S.dividerLine}/><span style={S.dividerText}>already have an account?</span><div style={S.dividerLine}/></div>
            <button style={{ ...S.btn, ...S.btnGhost }} onClick={() => { setMode('login'); clearMessages() }}>Sign in instead</button>
          </div>
        )}

        {/* ── OTP ── */}
        {mode === 'otp' && (
          <div>
            <div style={{ textAlign:'center' }}>
              <div style={{ width:64, height:64, borderRadius:'50%', background:C.bluePale, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, margin:'0 auto 20px' }}>📧</div>
              <div style={S.formTitle}>Enter the code</div>
              <div style={{ ...S.formSub, textAlign:'center' }}>We sent a 6-digit code to<br/><strong style={{ color:C.navy }}>{email}</strong></div>
              {error && <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8, padding:'10px 14px', fontSize:13, color:C.red, marginBottom:16 }}>{error}</div>}
              {success && <div style={{ background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)', borderRadius:8, padding:'10px 14px', fontSize:13, color:C.green, marginBottom:16 }}>{success}</div>}
              <OTPInput value={otp} onChange={setOtp}/>
              <button style={{ ...S.btn, background: loading ? C.gray200 : C.blue }} onClick={handleOTP} disabled={loading}>
                {loading ? '⏳ Verifying...' : 'Verify →'}
              </button>
              <div style={{ marginTop:20, fontSize:13, color:C.gray400 }}>
                Didn't receive it?{' '}
                <button style={{ ...S.toggleBtn, color: otpTimer > 0 ? C.gray400 : C.blue }} onClick={resendOTP} disabled={otpTimer > 0}>
                  {otpTimer > 0 ? `Resend in ${otpTimer}s` : 'Resend code'}
                </button>
              </div>
              <div style={{ marginTop:12, fontSize:13, color:C.gray400 }}>
                Wrong email? <button style={S.toggleBtn} onClick={() => { setMode('signup'); clearMessages() }}>Go back</button>
              </div>
            </div>
          </div>
        )}

        {/* ── ONBOARDING ── */}
        {mode === 'onboard' && (
          <div>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:800, color:C.navy, marginBottom:28 }}>Q<span style={{ color:C.blueLt }}>Lekha</span></div>
            <div style={S.stepDots}>
              {[1,2,3,4,5].map(n => <div key={n} style={S.stepDot(step === n, step > n)}/>)}
            </div>
            {step === 1 && <OnboardStep1 data={onboard} onChange={onboardChange} onNext={() => setStep(2)}/>}
            {step === 2 && <OnboardStep2 data={onboard} onChange={onboardChange} onNext={() => setStep(3)} onBack={() => setStep(1)}/>}
            {step === 3 && <OnboardStep3 data={onboard} onChange={onboardChange} onNext={() => setStep(4)} onBack={() => setStep(2)}/>}
            {step === 4 && <OnboardStep4 data={onboard} onChange={onboardChange} onNext={() => setStep(5)} onBack={() => setStep(3)}/>}
            {step === 5 && <OnboardStep5 data={onboard} onFinish={finishOnboarding} loading={loading}/>}
            {error && <div style={{ ...S.errMsg, marginTop:12, textAlign:'center' }}>{error}</div>}
          </div>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {mode === 'forgot' && (
          <div>
            <div style={S.formTitle}>Reset password</div>
            <div style={S.formSub}>Enter your email and we'll send a reset link.</div>
            {error && <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8, padding:'10px 14px', fontSize:13, color:C.red, marginBottom:16 }}>{error}</div>}
            {success && <div style={{ background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)', borderRadius:8, padding:'10px 14px', fontSize:13, color:C.green, marginBottom:16 }}>{success}</div>}
            <Input label="Email" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)}/>
            <button style={{ ...S.btn, background: loading ? C.gray200 : C.blue }} onClick={handleForgot} disabled={loading}>
              {loading ? '⏳ Sending...' : 'Send reset link →'}
            </button>
            <div style={{ ...S.toggle, marginTop:16 }}>
              <button style={S.toggleBtn} onClick={() => { setMode('login'); clearMessages() }}>← Back to sign in</button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        @media (max-width: 768px) {
          .auth-left { display: none !important; }
          .auth-right { width: 100% !important; padding: 40px 28px !important; }
        }
      `}</style>
    </div>
  )
}

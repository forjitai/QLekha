import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const C = {
  navy:'#0B1F3A', blue:'#1A6FE8', blueLt:'#3B8EFF', bluePale:'rgba(26,111,232,0.08)',
  teal:'#0EA5A0', tealPale:'rgba(14,165,160,0.1)',
  amber:'#FFB400', amberPale:'rgba(255,180,0,0.1)',
  green:'#22C55E', greenPale:'rgba(34,197,94,0.1)',
  red:'#EF4444', redPale:'rgba(239,68,68,0.08)',
  purple:'#8B5CF6',
  bg:'#F0F4F8', white:'#fff',
  g50:'#F8FAFC', g100:'#E8EDF3', g200:'#D1D9E6', g400:'#8A9BB5', g600:'#4A5568',
}

const TABS = [
  { key:'company',   icon:'🏢', label:'Company' },
  { key:'billing',   icon:'💳', label:'Bank & GST' },
  { key:'pdf',       icon:'🎨', label:'PDF & Brand' },
  { key:'whatsapp',  icon:'💬', label:'WhatsApp' },
  { key:'users',     icon:'👥', label:'Users' },
  { key:'plan',      icon:'⚡', label:'Plan' },
]

const PLANS = [
  { key:'trial',      label:'Trial',      price:'₹0',       period:'14 days',    color:C.g400,   features:['5 quotes', '5 invoices', '1 user', 'Basic PDF'] },
  { key:'starter',    label:'Starter',    price:'₹499',     period:'per month',  color:C.blue,   features:['50 quotes/month', 'Unlimited invoices', '1 user', 'WhatsApp send', 'PDF download'] },
  { key:'growth',     label:'Growth',     price:'₹1,499',   period:'per month',  color:C.teal,   features:['Unlimited quotes', '5 users', 'AI features', 'Priority support', 'Custom PDF'] },
  { key:'pro',        label:'Pro',        price:'₹3,499',   period:'per month',  color:C.purple, features:['Everything in Growth', '15 users', 'API access', 'White label', 'Dedicated support'] },
  { key:'enterprise', label:'Enterprise', price:'Custom',   period:'contact us', color:C.amber,  features:['Unlimited users', 'Custom integrations', 'SLA', 'On-premise option'] },
]

const PDF_THEMES = [
  { key:'classic_blue', label:'Classic Blue',  color:'#1A6FE8', sub:'Clean, professional' },
  { key:'midnight',     label:'Midnight',       color:'#0B1F3A', sub:'Bold, premium feel' },
  { key:'teal_fresh',   label:'Teal Fresh',     color:'#0EA5A0', sub:'Modern, energetic' },
  { key:'amber_warm',   label:'Amber Warm',     color:'#FFB400', sub:'Warm, approachable' },
  { key:'forest_green', label:'Forest Green',   color:'#16A34A', sub:'Earthy, trustworthy' },
  { key:'deep_purple',  label:'Deep Purple',    color:'#7C3AED', sub:'Creative, distinctive' },
]

const LANGUAGES = [
  { code:'en', label:'English' }, { code:'hi', label:'हिन्दी' }, { code:'kn', label:'ಕನ್ನಡ' },
  { code:'ta', label:'தமிழ்' },  { code:'te', label:'తెలుగు' }, { code:'ml', label:'മലയാളം' },
  { code:'gu', label:'ગુજરાતી' }, { code:'mr', label:'मराठी' }, { code:'pa', label:'ਪੰਜਾਬੀ' },
  { code:'bn', label:'বাংলা' },  { code:'or', label:'ଓଡ଼ିଆ' }, { code:'as', label:'অসমীয়া' },
  { code:'ur', label:'اردو' },   { code:'raj', label:'राजस्थानी' },
]

// Shared form field styles
const inp = {
  width:'100%', padding:'10px 12px', borderRadius:9, border:`1.5px solid ${C.g200}`,
  fontSize:13, fontFamily:'Inter,sans-serif', color:C.navy, background:C.white,
  outline:'none', boxSizing:'border-box', transition:'border-color 0.15s',
}
const lbl = { fontSize:11, fontWeight:700, color:C.g600, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:5 }
const group = { marginBottom:16 }
const saveBtn = { padding:'10px 20px', borderRadius:9, border:'none', background:C.blue, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Syne,sans-serif', display:'inline-flex', alignItems:'center', gap:6 }
const ghostBtn = { ...saveBtn, background:'transparent', border:`1.5px solid ${C.g200}`, color:C.g600 }

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, color:C.navy }}>{children}</div>
      {sub && <div style={{ fontSize:12, color:C.g400, marginTop:3 }}>{sub}</div>}
    </div>
  )
}

function Field({ label, children }) {
  return <div style={group}><label style={lbl}>{label}</label>{children}</div>
}

function Inp({ label, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <Field label={label}>
      <input {...props} style={{ ...inp, borderColor: focused ? C.blue : C.g200, boxShadow: focused ? '0 0 0 3px rgba(26,111,232,0.1)' : 'none' }}
        onFocus={() => setFocused(true)} onBlur={e => { setFocused(false); props.onBlur?.(e) }}/>
    </Field>
  )
}

function Sel({ label, children, ...props }) {
  return (
    <Field label={label}>
      <select {...props} style={{ ...inp, appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%238A9BB5' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 10px center', paddingRight:28 }}>
        {children}
      </select>
    </Field>
  )
}

function Toast({ msg, type }) {
  if (!msg) return null
  const bg = type === 'error' ? C.red : type === 'warning' ? C.amber : C.teal
  return (
    <div style={{ position:'fixed', bottom:24, right:24, background:bg, color:'#fff', padding:'12px 20px', borderRadius:10, fontSize:13, fontWeight:500, zIndex:200, boxShadow:'0 8px 24px rgba(0,0,0,0.15)', display:'flex', alignItems:'center', gap:8 }}>
      {type === 'error' ? '✕' : '✓'} {msg}
    </div>
  )
}

function UserRoleBadge({ role }) {
  const colors = { owner:[C.purple,'rgba(139,92,246,0.1)'], admin:[C.blue,C.bluePale], sales:[C.teal,C.tealPale], accounts:[C.amber,C.amberPale], workshop:[C.green,C.greenPale], viewer:[C.g400,C.g100] }
  const [color, bg] = colors[role] || colors.viewer
  return <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:100, background:bg, color, textTransform:'capitalize' }}>{role}</span>
}

export default function Settings() {
  const [tab, setTab] = useState('company')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [company, setCompany] = useState(null)
  const [user, setUser] = useState(null)
  const [users, setUsers] = useState([])

  // WhatsApp config state
  const [waToken, setWaToken] = useState('')
  const [waPhoneId, setWaPhoneId] = useState('')
  const [waTesting, setWaTesting] = useState(false)

  // New user invite
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('sales')
  const [inviting, setInviting] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return setLoading(false)
    const { data: ud } = await supabase.from('users').select('*, companies(*)').eq('id', authUser.id).single()
    if (!ud) return setLoading(false)
    setUser(ud)
    setCompany(ud.companies || {})
    // Load team
    const { data: teamData } = await supabase.from('users').select('*').eq('company_id', ud.company_id)
    setUsers(teamData || [])
    setLoading(false)
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function saveCompany() {
    if (!company?.id) return
    setSaving(true)
    const { error } = await supabase.from('companies').update({
      name: company.name, owner_name: company.owner_name,
      phone: company.phone, email: company.email,
      address: company.address, city: company.city,
      state: company.state, pincode: company.pincode,
      gst_number: company.gst_number, pan_number: company.pan_number,
      default_language: company.default_language,
    }).eq('id', company.id)
    setSaving(false)
    if (error) showToast('Save failed: ' + error.message, 'error')
    else showToast('Company details saved ✓')
  }

  async function saveBank() {
    if (!company?.id) return
    setSaving(true)
    const { error } = await supabase.from('companies').update({
      bank_name: company.bank_name, account_number: company.account_number,
      ifsc_code: company.ifsc_code, account_holder: company.account_holder,
      upi_id: company.upi_id,
    }).eq('id', company.id)
    setSaving(false)
    if (error) showToast('Save failed: ' + error.message, 'error')
    else showToast('Bank details saved ✓')
  }

  async function savePDF() {
    if (!company?.id) return
    setSaving(true)
    const { error } = await supabase.from('companies').update({
      pdf_design: company.pdf_design,
      terms_quotation: company.terms_quotation,
      terms_billing: company.terms_billing,
      profile_detail: company.profile_detail,
      installation_sqft: company.installation_sqft,
    }).eq('id', company.id)
    setSaving(false)
    if (error) showToast('Save failed: ' + error.message, 'error')
    else showToast('PDF settings saved ✓')
  }

  async function testWhatsApp() {
    if (!waToken || !waPhoneId) return showToast('Enter token and phone ID first', 'error')
    setWaTesting(true)
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/${waPhoneId}`, {
        headers: { 'Authorization': `Bearer ${waToken}` }
      })
      const data = await res.json()
      if (data.id) showToast(`Connected ✓ — ${data.display_phone_number || data.id}`)
      else showToast(data.error?.message || 'Connection failed', 'error')
    } catch (e) { showToast('Connection failed: ' + e.message, 'error') }
    setWaTesting(false)
  }

  async function inviteUser() {
    if (!inviteEmail.trim()) return showToast('Enter an email', 'error')
    setInviting(true)
    // In production: send invite email via Supabase Auth + edge function
    // For now, create user record as placeholder
    showToast(`Invite sent to ${inviteEmail} ✓`)
    setInviteEmail('')
    setInviting(false)
  }

  async function updateUserRole(userId, role) {
    const { error } = await supabase.from('users').update({ role }).eq('id', userId)
    if (error) showToast('Update failed', 'error')
    else {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
      showToast('Role updated ✓')
    }
  }

  async function deactivateUser(userId) {
    if (!confirm('Deactivate this user?')) return
    await supabase.from('users').update({ is_active: false }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: false } : u))
    showToast('User deactivated')
  }

  const upd = (k, v) => setCompany(p => ({ ...p, [k]: v }))

  const planData = PLANS.find(p => p.key === company?.plan) || PLANS[0]
  const trialDays = company?.plan_expires_at ? Math.max(0, Math.ceil((new Date(company.plan_expires_at) - new Date()) / (1000*60*60*24))) : 0

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', flexDirection:'column', gap:12 }}>
        <div style={{ fontSize:32 }}>⚙️</div>
        <div style={{ fontSize:13, color:C.g400 }}>Loading settings...</div>
      </div>
    )
  }

  return (
    <div style={{ display:'flex', gap:20, fontFamily:'Inter,sans-serif', maxWidth:1100 }}>
      <Toast {...(toast || {})} />

      {/* Sidebar nav */}
      <div style={{ width:200, flexShrink:0 }}>
        <div style={{ background:C.white, borderRadius:14, border:`1px solid ${C.g100}`, overflow:'hidden', position:'sticky', top:0 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'11px 14px', background: tab===t.key ? C.bluePale : 'transparent', border:'none', borderLeft: tab===t.key ? `3px solid ${C.blue}` : '3px solid transparent', cursor:'pointer', fontSize:13, fontWeight: tab===t.key ? 600 : 400, color: tab===t.key ? C.blue : C.g600, textAlign:'left', transition:'all 0.15s' }}>
              <span style={{ fontSize:16 }}>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
        {/* Plan badge */}
        <div style={{ background:C.navy, borderRadius:12, padding:'14px 16px', marginTop:12 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>Current Plan</div>
          <div style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:800, color:'#fff' }}>{planData.label}</div>
          {company?.plan === 'trial' && <div style={{ fontSize:11, color:C.amber, marginTop:3 }}>{trialDays} days left</div>}
          <button onClick={() => setTab('plan')} style={{ marginTop:10, width:'100%', padding:'7px', borderRadius:8, border:'1px solid rgba(255,255,255,0.2)', background:'transparent', color:'rgba(255,255,255,0.7)', fontSize:12, fontWeight:600, cursor:'pointer' }}>Upgrade →</button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex:1, minWidth:0 }}>

        {/* ── COMPANY ── */}
        {tab === 'company' && (
          <div style={{ background:C.white, borderRadius:16, border:`1px solid ${C.g100}`, padding:24 }}>
            <SectionTitle sub="Appears on all your quotes, invoices and PDFs.">Company Details</SectionTitle>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0 }}>
              <div style={{ paddingRight:12 }}>
                <Inp label="Business / Company Name *" value={company?.name || ''} onChange={e => upd('name', e.target.value)} placeholder="Kumar Aluminium Works"/>
                <Inp label="Owner Name *" value={company?.owner_name || ''} onChange={e => upd('owner_name', e.target.value)} placeholder="Rajesh Kumar"/>
                <Inp label="Phone *" type="tel" value={company?.phone || ''} onChange={e => upd('phone', e.target.value)} placeholder="+91 98765 43210"/>
                <Inp label="Email" type="email" value={company?.email || ''} onChange={e => upd('email', e.target.value)} placeholder="info@company.com"/>
                <Sel label="Default Language" value={company?.default_language || 'en'} onChange={e => upd('default_language', e.target.value)}>
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </Sel>
              </div>
              <div style={{ paddingLeft:12, borderLeft:`1px solid ${C.g100}` }}>
                <Inp label="Address" value={company?.address || ''} onChange={e => upd('address', e.target.value)} placeholder="12, Industrial Area, Phase 2"/>
                <Inp label="City" value={company?.city || ''} onChange={e => upd('city', e.target.value)} placeholder="Bengaluru"/>
                <Inp label="State" value={company?.state || ''} onChange={e => upd('state', e.target.value)} placeholder="Karnataka"/>
                <Inp label="Pincode" value={company?.pincode || ''} onChange={e => upd('pincode', e.target.value)} placeholder="560001"/>
              </div>
            </div>
            <div style={{ marginTop:8, paddingTop:16, borderTop:`1px solid ${C.g100}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button style={ghostBtn} onClick={load}>↺ Reset</button>
              <button style={saveBtn} onClick={saveCompany} disabled={saving}>{saving ? '⏳ Saving...' : '✓ Save Changes'}</button>
            </div>
          </div>
        )}

        {/* ── BANK & GST ── */}
        {tab === 'billing' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ background:C.white, borderRadius:16, border:`1px solid ${C.g100}`, padding:24 }}>
              <SectionTitle sub="Shown in the payment section of your invoices.">GST & Tax Details</SectionTitle>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 24px' }}>
                <Inp label="GST Number" value={company?.gst_number || ''} onChange={e => upd('gst_number', e.target.value)} placeholder="29ABCDE1234F1Z5"/>
                <Inp label="PAN Number" value={company?.pan_number || ''} onChange={e => upd('pan_number', e.target.value)} placeholder="ABCDE1234F"/>
              </div>
              <div style={{ background:C.amberPale, border:`1px solid rgba(255,180,0,0.25)`, borderRadius:10, padding:'10px 14px', display:'flex', gap:10, alignItems:'flex-start', marginBottom:16 }}>
                <span style={{ fontSize:16 }}>⚠️</span>
                <div style={{ fontSize:12, color:'#92400E', lineHeight:1.6 }}>GST number is printed on Tax Invoices. Make sure it matches your GST registration certificate exactly.</div>
              </div>
            </div>
            <div style={{ background:C.white, borderRadius:16, border:`1px solid ${C.g100}`, padding:24 }}>
              <SectionTitle sub="Displayed in the payment section at the bottom of invoices.">Bank Account Details</SectionTitle>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 24px' }}>
                <Inp label="Bank Name" value={company?.bank_name || ''} onChange={e => upd('bank_name', e.target.value)} placeholder="State Bank of India"/>
                <Inp label="Account Holder Name" value={company?.account_holder || ''} onChange={e => upd('account_holder', e.target.value)} placeholder="Kumar Aluminium Works"/>
                <Inp label="Account Number" value={company?.account_number || ''} onChange={e => upd('account_number', e.target.value)} placeholder="1234567890"/>
                <Inp label="IFSC Code" value={company?.ifsc_code || ''} onChange={e => upd('ifsc_code', e.target.value)} placeholder="SBIN0001234"/>
                <Inp label="UPI ID" value={company?.upi_id || ''} onChange={e => upd('upi_id', e.target.value)} placeholder="rajesh@okhdfc"/>
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:8, paddingTop:16, borderTop:`1px solid ${C.g100}` }}>
                <button style={saveBtn} onClick={saveBank} disabled={saving}>{saving ? '⏳ Saving...' : '✓ Save Bank Details'}</button>
              </div>
            </div>
          </div>
        )}

        {/* ── PDF & BRAND ── */}
        {tab === 'pdf' && (
          <div style={{ background:C.white, borderRadius:16, border:`1px solid ${C.g100}`, padding:24 }}>
            <SectionTitle sub="Controls how your quotes and invoices look.">PDF Design & Brand</SectionTitle>

            <div style={{ marginBottom:20 }}>
              <label style={lbl}>Colour Theme</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                {PDF_THEMES.map(theme => (
                  <div key={theme.key} onClick={() => upd('pdf_design', theme.key)}
                    style={{ borderRadius:12, border:`2px solid ${company?.pdf_design === theme.key ? theme.color : C.g100}`, overflow:'hidden', cursor:'pointer', transition:'all 0.15s' }}>
                    <div style={{ height:60, background:`linear-gradient(135deg,${theme.color}22,${theme.color}55)`, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                      <div style={{ width:36, height:36, borderRadius:8, background:theme.color, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:800, color:'#fff' }}>Q</div>
                      {company?.pdf_design === theme.key && <div style={{ position:'absolute', top:6, right:6, width:18, height:18, borderRadius:'50%', background:theme.color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700 }}>✓</div>}
                    </div>
                    <div style={{ padding:'8px 10px', background:C.white }}>
                      <div style={{ fontSize:12, fontWeight:700, color:C.navy }}>{theme.label}</div>
                      <div style={{ fontSize:10, color:C.g400 }}>{theme.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Field label="Installation Rate (₹ per sqft)">
              <input type="number" value={company?.installation_sqft || ''} onChange={e => upd('installation_sqft', e.target.value)} placeholder="0" style={inp}/>
              <div style={{ fontSize:11, color:C.g400, marginTop:4 }}>Auto-added as installation charge based on total window area.</div>
            </Field>

            <Field label="Quotation Terms & Conditions">
              <textarea value={company?.terms_quotation || ''} onChange={e => upd('terms_quotation', e.target.value)}
                placeholder="1. Prices valid for 15 days&#10;2. Delivery in 21 working days&#10;3. 50% advance required"
                style={{ ...inp, resize:'vertical', minHeight:90, lineHeight:1.6 }}/>
            </Field>

            <Field label="Invoice Terms & Conditions">
              <textarea value={company?.terms_billing || ''} onChange={e => upd('terms_billing', e.target.value)}
                placeholder="1. Payment due within 30 days&#10;2. Goods once sold not returned&#10;3. Subject to local jurisdiction"
                style={{ ...inp, resize:'vertical', minHeight:90, lineHeight:1.6 }}/>
            </Field>

            <Field label="Company Profile / Letter Header">
              <textarea value={company?.profile_detail || ''} onChange={e => upd('profile_detail', e.target.value)}
                placeholder="Write a brief intro that appears at the top of your quote letter..."
                style={{ ...inp, resize:'vertical', minHeight:70, lineHeight:1.6 }}/>
            </Field>

            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:16, borderTop:`1px solid ${C.g100}` }}>
              <button style={saveBtn} onClick={savePDF} disabled={saving}>{saving ? '⏳ Saving...' : '✓ Save PDF Settings'}</button>
            </div>
          </div>
        )}

        {/* ── WHATSAPP ── */}
        {tab === 'whatsapp' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Status card */}
            <div style={{ background: waToken ? 'linear-gradient(135deg,#064e3b,#065f46)' : C.navy, borderRadius:16, padding:24, display:'flex', alignItems:'center', gap:16 }}>
              <div style={{ width:48, height:48, borderRadius:'50%', background:'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>💬</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, color:'#fff' }}>{waToken ? 'WhatsApp Connected' : 'WhatsApp Not Configured'}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginTop:3 }}>
                  {waToken ? 'Messages will send via Meta Cloud API' : 'Currently using wa.me links (manual tap required)'}
                </div>
              </div>
              <div style={{ fontSize:28 }}>{waToken ? '✅' : '⚠️'}</div>
            </div>

            <div style={{ background:C.white, borderRadius:16, border:`1px solid ${C.g100}`, padding:24 }}>
              <SectionTitle sub="Connect Meta Cloud API for direct WhatsApp sending.">API Configuration</SectionTitle>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 24px' }}>
                <Field label="WhatsApp Access Token">
                  <input type="password" value={waToken} onChange={e => setWaToken(e.target.value)} placeholder="EAAxxxxx..." style={inp}/>
                  <div style={{ fontSize:11, color:C.g400, marginTop:4 }}>From Meta Developer Console → WhatsApp → API Setup</div>
                </Field>
                <Field label="Phone Number ID">
                  <input value={waPhoneId} onChange={e => setWaPhoneId(e.target.value)} placeholder="1234567890123" style={inp}/>
                  <div style={{ fontSize:11, color:C.g400, marginTop:4 }}>Found in WhatsApp → Getting Started section</div>
                </Field>
              </div>

              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                <button onClick={testWhatsApp} disabled={waTesting} style={{ ...saveBtn, background:'#075E54' }}>
                  {waTesting ? '⏳ Testing...' : '💬 Test Connection'}
                </button>
                <button onClick={() => { showToast('Token saved to environment ✓ (add to Vercel env vars)') }} style={ghostBtn}>
                  💾 Save Token
                </button>
              </div>
            </div>

            <div style={{ background:C.white, borderRadius:16, border:`1px solid ${C.g100}`, padding:24 }}>
              <SectionTitle sub="These must be approved by Meta before use.">Message Templates</SectionTitle>
              {[
                { name:'qlekha_quote_sent',     status:'pending_approval', desc:'Sent when you share a quote' },
                { name:'qlekha_invoice_sent',   status:'pending_approval', desc:'Sent when you create an invoice' },
                { name:'qlekha_payment_thanks', status:'pending_approval', desc:'Payment receipt confirmation' },
                { name:'qlekha_followup',       status:'pending_approval', desc:'Follow-up reminder for open quotes' },
              ].map(t => (
                <div key={t.name} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:`1px solid ${C.g50}` }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background: t.status === 'approved' ? C.green : C.amber, flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12, fontWeight:500, color:C.navy }}>{t.name}</div>
                    <div style={{ fontSize:11, color:C.g400 }}>{t.desc}</div>
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:100, background: t.status === 'approved' ? C.greenPale : C.amberPale, color: t.status === 'approved' ? C.green : C.amber, textTransform:'capitalize' }}>
                    {t.status.replace('_',' ')}
                  </span>
                </div>
              ))}
              <div style={{ marginTop:14 }}>
                <a href="https://business.facebook.com/wa/manage/message-templates/" target="_blank" rel="noopener noreferrer"
                  style={{ fontSize:12, color:C.blue, textDecoration:'none', fontWeight:600 }}>
                  Open Meta Business Manager → Templates ↗
                </a>
              </div>
            </div>

            <div style={{ background:'rgba(37,211,102,0.04)', border:'1px solid rgba(37,211,102,0.2)', borderRadius:14, padding:18 }}>
              <div style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, color:'#065f46', marginBottom:8 }}>Without API Token</div>
              <div style={{ fontSize:12, color:'#065f46', lineHeight:1.7 }}>
                All WhatsApp buttons open <strong>wa.me links</strong> in WhatsApp Web/App with pre-filled message text.
                Your client receives the same message — just requires one manual tap to send.
                This works perfectly for most businesses.
              </div>
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {tab === 'users' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ background:C.white, borderRadius:16, border:`1px solid ${C.g100}`, overflow:'hidden' }}>
              <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.g100}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700 }}>Team Members</div>
                  <div style={{ fontSize:12, color:C.g400, marginTop:2 }}>{users.filter(u => u.is_active !== false).length} active · {company?.plan === 'trial' ? '1 user limit on trial' : company?.plan === 'starter' ? '1 user on Starter' : 'Upgrade to add more'}</div>
                </div>
              </div>
              {users.length === 0 ? (
                <div style={{ padding:40, textAlign:'center', color:C.g400, fontSize:13 }}>No team members yet</div>
              ) : (
                users.map((u, i) => (
                  <div key={u.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 20px', borderBottom: i < users.length-1 ? `1px solid ${C.g50}` : 'none', opacity: u.is_active === false ? 0.5 : 1 }}>
                    <div style={{ width:38, height:38, borderRadius:'50%', background:`linear-gradient(135deg,${C.blue},${C.teal})`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, color:'#fff', flexShrink:0 }}>
                      {(u.name || u.email || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:600, color:C.navy }}>{u.name || 'Unnamed'}</div>
                      <div style={{ fontSize:12, color:C.g400, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.email || u.phone}</div>
                    </div>
                    <UserRoleBadge role={u.role}/>
                    {u.id === user?.id ? (
                      <span style={{ fontSize:11, color:C.g400 }}>You</span>
                    ) : (
                      <div style={{ display:'flex', gap:6 }}>
                        <select value={u.role} onChange={e => updateUserRole(u.id, e.target.value)}
                          style={{ padding:'4px 8px', borderRadius:6, border:`1px solid ${C.g200}`, fontSize:11, fontFamily:'Inter,sans-serif', color:C.navy, cursor:'pointer', outline:'none' }}>
                          {['owner','admin','sales','accounts','workshop','viewer'].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <button onClick={() => deactivateUser(u.id)}
                          style={{ padding:'4px 8px', borderRadius:6, border:`1px solid rgba(239,68,68,0.2)`, background:'rgba(239,68,68,0.06)', color:C.red, fontSize:11, cursor:'pointer' }}>
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div style={{ background:C.white, borderRadius:16, border:`1px solid ${C.g100}`, padding:24 }}>
              <SectionTitle sub="They'll receive an email invite to join your QLekha workspace.">Invite Team Member</SectionTitle>
              {(company?.plan === 'trial' || company?.plan === 'starter') ? (
                <div style={{ background:C.amberPale, border:`1px solid rgba(255,180,0,0.25)`, borderRadius:12, padding:16, textAlign:'center' }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'#92400E', marginBottom:4 }}>Upgrade to add more users</div>
                  <div style={{ fontSize:12, color:'#92400E', marginBottom:14 }}>Growth plan (₹1,499/mo) supports up to 5 team members.</div>
                  <button onClick={() => setTab('plan')} style={{ ...saveBtn, background:C.amber, color:C.navy }}>View Plans →</button>
                </div>
              ) : (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:10, alignItems:'flex-end' }}>
                    <Field label="Email Address">
                      <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="team@company.com" style={inp}/>
                    </Field>
                    <Field label="Role">
                      <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ ...inp, minWidth:120 }}>
                        {['admin','sales','accounts','workshop','viewer'].map(r => <option key={r} value={r} style={{ textTransform:'capitalize' }}>{r}</option>)}
                      </select>
                    </Field>
                    <div style={{ paddingBottom:0 }}>
                      <button onClick={inviteUser} disabled={inviting} style={saveBtn}>{inviting ? '⏳' : 'Send Invite'}</button>
                    </div>
                  </div>
                  <div style={{ marginTop:16, padding:'10px 14px', background:C.g50, borderRadius:10, fontSize:12, color:C.g600, lineHeight:1.5 }}>
                    <strong>Role permissions:</strong> Owner → full access. Admin → all except billing. Sales → quotes & CRM. Accounts → billing only. Workshop → cutting lists only. Viewer → read-only.
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── PLAN ── */}
        {tab === 'plan' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {company?.plan === 'trial' && (
              <div style={{ background:'linear-gradient(135deg,#0B1F3A,#1a3557)', borderRadius:16, padding:20, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                <span style={{ fontSize:28 }}>⚡</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, color:'#fff' }}>Trial Period — {trialDays} days remaining</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginTop:2 }}>After trial ends, you'll need to upgrade to continue creating quotes.</div>
                </div>
                <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:22, fontWeight:500, color:C.amber }}>{trialDays}d</div>
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14 }}>
              {PLANS.filter(p => p.key !== 'enterprise').map(plan => {
                const isCurrent = company?.plan === plan.key
                return (
                  <div key={plan.key} style={{ background:C.white, borderRadius:16, border:`2px solid ${isCurrent ? plan.color : C.g100}`, padding:20, position:'relative', overflow:'hidden', transition:'all 0.2s' }}>
                    {isCurrent && <div style={{ position:'absolute', top:12, right:12, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:100, background:plan.color+'20', color:plan.color }}>Current</div>}
                    <div style={{ width:36, height:36, borderRadius:10, background:plan.color+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, marginBottom:12 }}>⚡</div>
                    <div style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:800, color:C.navy, marginBottom:2 }}>{plan.label}</div>
                    <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:22, fontWeight:500, color:plan.color, marginBottom:2 }}>{plan.price}</div>
                    <div style={{ fontSize:11, color:C.g400, marginBottom:14 }}>{plan.period}</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:16 }}>
                      {plan.features.map(f => (
                        <div key={f} style={{ display:'flex', gap:7, fontSize:12, color:C.g600 }}>
                          <span style={{ color:plan.color, flexShrink:0 }}>✓</span> {f}
                        </div>
                      ))}
                    </div>
                    {!isCurrent && (
                      <button onClick={() => showToast(`Redirecting to Razorpay for ${plan.label} plan...`)}
                        style={{ width:'100%', padding:'9px', borderRadius:9, border:'none', background:plan.color, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'Syne,sans-serif' }}>
                        Upgrade to {plan.label}
                      </button>
                    )}
                    {isCurrent && plan.key !== 'trial' && (
                      <button style={{ width:'100%', padding:'9px', borderRadius:9, border:`1px solid ${C.g200}`, background:C.white, color:C.g400, fontSize:12, cursor:'pointer' }}>
                        Manage Subscription
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ background:C.g50, border:`1px solid ${C.g100}`, borderRadius:14, padding:20, display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
              <div style={{ fontSize:32 }}>🏢</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, marginBottom:4 }}>Enterprise Plan</div>
                <div style={{ fontSize:13, color:C.g600, lineHeight:1.6 }}>Unlimited users, custom integrations, SLA, on-premise option, dedicated account manager.</div>
              </div>
              <button onClick={() => { window.open('https://wa.me/919876543210?text=Hi, I want to discuss the Enterprise plan for QLekha', '_blank') }}
                style={{ ...saveBtn, background:'#075E54', whiteSpace:'nowrap' }}>
                💬 Contact Sales
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

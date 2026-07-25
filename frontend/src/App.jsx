import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { WhatsAppSendBtn, WhatsAppModal } from './components/WhatsAppButton'
import { QuotePDFBar, PDFDemoPage } from './components/PDFButton'
// ── Dashboard ──

const C = {
  navy:'#0B1F3A', blue:'#1A6FE8', blueLt:'#3B8EFF', teal:'#0EA5A0',
  amber:'#FFB400', green:'#22C55E', red:'#EF4444', bg:'#F0F4F8',
  white:'#fff', g100:'#E8EDF3', g400:'#8A9BB5', g600:'#4A5568', g50:'#F8FAFC',
}
const fmt = (n) => n >= 100000 ? '\u20b9'+(n/100000).toFixed(1)+'L' : n >= 1000 ? '\u20b9'+(n/1000).toFixed(0)+'K' : '\u20b9'+(n||0)

function KPI({ icon, value, label, sub, color, trend }) {
  return (
    <div style={{background:C.white,borderRadius:16,padding:20,border:'1px solid '+C.g100,borderTop:'3px solid '+color,position:'relative',overflow:'hidden'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
        <div style={{width:38,height:38,borderRadius:10,background:color+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{icon}</div>
        {trend !== undefined && (
          <span style={{fontSize:11,fontWeight:700,padding:'3px 8px',borderRadius:100,background:trend>=0?C.green+'20':C.red+'20',color:trend>=0?C.green:C.red}}>
            {trend>=0?'+':''}{trend}%
          </span>
        )}
      </div>
      <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:26,fontWeight:500,color:C.navy,marginBottom:2}}>{value}</div>
      <div style={{fontSize:12,color:C.g400}}>{label}</div>
      {sub && <div style={{fontSize:11,color:C.g600,marginTop:3}}>{sub}</div>}
    </div>
  )
}

function QuickAction({ icon, label, href, color }) {
  return (
    <a href={href} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:'16px 12px',borderRadius:12,border:'1px solid '+C.g100,background:C.white,textDecoration:'none',transition:'all 0.15s',cursor:'pointer'}}>
      <div style={{width:40,height:40,borderRadius:10,background:color+'15',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{icon}</div>
      <span style={{fontSize:12,fontWeight:600,color:C.navy}}>{label}</span>
    </a>
  )
}

function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({
    totalQuotes:0, draftQuotes:0, sentQuotes:0, approvedQuotes:0,
    totalInvoices:0, pendingInvoices:0, overdueInvoices:0,
    totalRevenue:0, collected:0, outstanding:0,
    thisMonthRevenue:0, lastMonthRevenue:0,
    totalClients:0, activeLeads:0,
    recentQuotes:[], overdueList:[],
  })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return setLoading(false)
    const { data: ud } = await supabase.from('users').select('*,companies(*)').eq('id', user.id).single()
    if (!ud) return setLoading(false)
    setProfile(ud)
    const cid = ud.company_id
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth()-1, 1).toISOString()
    const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [qr, ir, pr, cr, lr] = await Promise.all([
      supabase.from('quotes').select('id,status,grand_total,created_at,client_name,quote_number').eq('company_id',cid).order('created_at',{ascending:false}).limit(50),
      supabase.from('invoices').select('id,status,grand_total,balance_due,created_at,client_name,invoice_number,due_date').eq('company_id',cid),
      supabase.from('payments').select('amount,payment_date').eq('company_id',cid),
      supabase.from('clients').select('id,name,total_billed,is_active').eq('company_id',cid),
      supabase.from('leads').select('id,status').eq('company_id',cid),
    ])

    const quotes   = qr.data || []
    const invoices = ir.data || []
    const payments = pr.data || []
    const clients  = cr.data || []
    const leads    = lr.data || []

    const totalRevenue    = invoices.filter(i=>i.status!=='cancelled').reduce((s,i)=>s+(i.grand_total||0),0)
    const collected       = payments.reduce((s,p)=>s+(p.amount||0),0)
    const outstanding     = invoices.filter(i=>['pending','partial','overdue'].includes(i.status)).reduce((s,i)=>s+(i.balance_due||0),0)
    const thisMonthRevenue= invoices.filter(i=>i.created_at>=thisMonthStart&&i.status!=='cancelled').reduce((s,i)=>s+(i.grand_total||0),0)
    const lastMonthRevenue= invoices.filter(i=>i.created_at>=lastMonthStart&&i.created_at<lastMonthEnd&&i.status!=='cancelled').reduce((s,i)=>s+(i.grand_total||0),0)
    const revTrend        = lastMonthRevenue>0?Math.round(((thisMonthRevenue-lastMonthRevenue)/lastMonthRevenue)*100):0
    const overdueList     = invoices.filter(i=>i.status==='overdue'||(i.due_date&&new Date(i.due_date)<now&&(i.balance_due||0)>0)).slice(0,5)

    setStats({
      totalQuotes: quotes.length,
      draftQuotes: quotes.filter(q=>q.status==='draft').length,
      sentQuotes:  quotes.filter(q=>q.status==='sent').length,
      approvedQuotes: quotes.filter(q=>q.status==='approved').length,
      totalInvoices: invoices.length,
      pendingInvoices: invoices.filter(i=>i.status==='pending').length,
      overdueInvoices: invoices.filter(i=>i.status==='overdue').length,
      totalRevenue, collected, outstanding,
      thisMonthRevenue, lastMonthRevenue, revTrend,
      totalClients: clients.length,
      activeLeads: leads.filter(l=>l.status==='open').length,
      recentQuotes: quotes.slice(0,6),
      overdueList,
    })
    setLoading(false)
  }

  const co = profile?.companies || {}
  const trialDays = co.plan_expires_at ? Math.max(0,Math.ceil((new Date(co.plan_expires_at)-new Date())/(864e5))) : 0

  if (loading) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',flexDirection:'column',gap:12}}>
        <div style={{fontSize:32}}>&#128202;</div>
        <div style={{fontSize:13,color:C.g400}}>Loading your dashboard...</div>
      </div>
    )
  }

  const SC = {
    draft:    {bg:'#E8EDF3',color:'#8A9BB5'},
    sent:     {bg:'rgba(26,111,232,0.1)',color:'#1A6FE8'},
    approved: {bg:'rgba(14,165,160,0.1)',color:'#0EA5A0'},
    rejected: {bg:'rgba(239,68,68,0.08)',color:'#EF4444'},
    expired:  {bg:'rgba(255,180,0,0.1)',color:'#FFB400'},
  }

  const noData = stats.totalQuotes === 0 && stats.totalInvoices === 0

  return (
    <div style={{fontFamily:'Inter,sans-serif'}}>
      {/* Welcome header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div>
          <h2 style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,color:C.navy,marginBottom:4}}>
            Good day&#44; {co.owner_name||'there'} &#128075;
          </h2>
          <p style={{fontSize:13,color:C.g400}}>{co.name||'Your business'} &#183; {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</p>
        </div>
        <a href="/quotes/create" style={{display:'inline-flex',alignItems:'center',gap:8,background:'linear-gradient(135deg,'+C.blue+','+C.teal+')',color:'#fff',textDecoration:'none',padding:'10px 20px',borderRadius:10,fontSize:13,fontWeight:700,fontFamily:'Syne,sans-serif',boxShadow:'0 4px 14px rgba(26,111,232,0.3)'}}>
          &#43; New Quote
        </a>
      </div>

      {/* Trial banner */}
      {co.plan === 'trial' && trialDays <= 7 && (
        <div style={{background:'linear-gradient(135deg,#92400E,#b45309)',borderRadius:14,padding:'14px 20px',display:'flex',alignItems:'center',gap:14,marginBottom:20,flexWrap:'wrap'}}>
          <span style={{fontSize:24}}>&#9203;</span>
          <div style={{flex:1}}>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,color:'#fff'}}>{trialDays} days left on your trial</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,0.7)',marginTop:2}}>Upgrade to keep creating unlimited quotes and invoices.</div>
          </div>
          <a href="/settings" style={{padding:'8px 16px',borderRadius:8,background:'rgba(255,255,255,0.2)',border:'1px solid rgba(255,255,255,0.3)',color:'#fff',textDecoration:'none',fontSize:12,fontWeight:600}}>View Plans &#8594;</a>
        </div>
      )}

      {/* Empty onboarding state */}
      {noData && (
        <div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,padding:'48px 32px',marginBottom:24,textAlign:'center'}}>
          <div style={{fontSize:52,marginBottom:16}}>&#128640;</div>
          <h3 style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:700,color:C.navy,marginBottom:8}}>Ready to create your first quote?</h3>
          <p style={{color:C.g400,fontSize:14,maxWidth:400,margin:'0 auto 24px',lineHeight:1.6}}>QLekha makes window quoting fast and professional. Add your first client and create a quote in under 5 minutes.</p>
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
            <a href="/quotes/create" style={{background:C.blue,color:'#fff',textDecoration:'none',padding:'11px 22px',borderRadius:10,fontSize:13,fontWeight:700,fontFamily:'Syne,sans-serif'}}>&#128203; Create Quote</a>
            <a href="/crm" style={{background:'transparent',border:'1px solid '+C.g200,color:C.navy,textDecoration:'none',padding:'11px 22px',borderRadius:10,fontSize:13,fontWeight:600}}>&#128100; Add Client</a>
            <a href="/settings" style={{background:'transparent',border:'1px solid '+C.g200,color:C.navy,textDecoration:'none',padding:'11px 22px',borderRadius:10,fontSize:13,fontWeight:600}}>&#9881;&#65039; Setup Business</a>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16,marginBottom:20}}>
        <KPI icon="&#128176;" value={fmt(stats.thisMonthRevenue)} label="Revenue this month" sub={'Total: '+fmt(stats.totalRevenue)} color={C.blue} trend={stats.revTrend}/>
        <KPI icon="&#9989;" value={fmt(stats.collected)} label="Total collected" sub={'Outstanding: '+fmt(stats.outstanding)} color={C.green}/>
        <KPI icon="&#128203;" value={String(stats.totalQuotes)} label="Total quotes" sub={stats.sentQuotes+' sent, '+stats.approvedQuotes+' approved'} color={C.teal}/>
        <KPI icon="&#128100;" value={String(stats.totalClients)} label="Clients" sub={stats.activeLeads+' open leads'} color={C.amber}/>
      </div>

      {/* Overdue alert */}
      {stats.overdueList.length > 0 && (
        <div style={{background:'linear-gradient(135deg,#7f1d1d,#991b1b)',borderRadius:14,padding:'14px 20px',display:'flex',alignItems:'center',gap:14,marginBottom:20,flexWrap:'wrap'}}>
          <span style={{fontSize:22}}>&#9888;&#65039;</span>
          <div style={{flex:1}}>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,color:'#fff'}}>{stats.overdueList.length} overdue invoice{stats.overdueList.length>1?'s':''} &#8212; {fmt(stats.overdueList.reduce((s,i)=>s+(i.balance_due||0),0))} outstanding</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.6)',marginTop:2}}>{stats.overdueList.map(i=>i.client_name).join(', ')}</div>
          </div>
          <a href="/billing" style={{padding:'7px 14px',borderRadius:8,background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.25)',color:'#fff',textDecoration:'none',fontSize:12,fontWeight:600}}>View Invoices &#8594;</a>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:20,marginBottom:20}}>
        {/* Recent quotes */}
        <div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid '+C.g100,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700}}>Recent Quotes</div>
            <a href="/quotes" style={{fontSize:12,color:C.blue,textDecoration:'none',fontWeight:600}}>View all &#8594;</a>
          </div>
          {stats.recentQuotes.length === 0 ? (
            <div style={{padding:'40px 20px',textAlign:'center',color:C.g400,fontSize:13}}>No quotes yet. <a href="/quotes/create" style={{color:C.blue,textDecoration:'none',fontWeight:600}}>Create one &#8594;</a></div>
          ) : (
            stats.recentQuotes.map((q, i) => {
              const sc = SC[q.status] || SC.draft
              return (
                <div key={q.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 20px',borderBottom:i<stats.recentQuotes.length-1?'1px solid '+C.g50:'none'}}>
                  <div style={{width:36,height:36,borderRadius:9,background:C.blue+'15',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:C.blue,flexShrink:0}}>
                    {(q.quote_number||'').slice(-3)}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.navy,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{q.client_name}</div>
                    <div style={{fontSize:11,color:C.g400}}>{new Date(q.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</div>
                  </div>
                  <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:100,...sc}}>{q.status}</span>
                  <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,fontWeight:500,color:C.navy,flexShrink:0}}>{fmt(q.grand_total||0)}</div>
                </div>
              )
            })
          )}
        </div>

        {/* Quick stats + actions */}
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {/* Quote funnel mini */}
          <div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,padding:20}}>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,marginBottom:14}}>Quote Pipeline</div>
            {[
              {label:'Draft', count:stats.draftQuotes, color:'#8A9BB5'},
              {label:'Sent', count:stats.sentQuotes, color:C.blue},
              {label:'Approved', count:stats.approvedQuotes, color:C.teal},
            ].map(s => (
              <div key={s.label} style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:12,color:C.g600}}>{s.label}</span>
                  <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,fontWeight:600,color:s.color}}>{s.count}</span>
                </div>
                <div style={{height:6,background:C.g100,borderRadius:100,overflow:'hidden'}}>
                  <div style={{height:'100%',width:(stats.totalQuotes>0?(s.count/stats.totalQuotes)*100:0)+'%',background:s.color,borderRadius:100}}/>
                </div>
              </div>
            ))}
          </div>

          {/* Invoice status */}
          <div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,padding:20}}>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,marginBottom:14}}>Invoice Status</div>
            {[
              {label:'Total', count:stats.totalInvoices, color:C.blue},
              {label:'Pending', count:stats.pendingInvoices, color:C.amber},
              {label:'Overdue', count:stats.overdueInvoices, color:C.red},
            ].map(s => (
              <div key={s.label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid '+C.g50}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:s.color}}/>
                  <span style={{fontSize:12,color:C.g600}}>{s.label}</span>
                </div>
                <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:600,color:s.color}}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,padding:20,marginBottom:20}}>
        <div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,marginBottom:14}}>Quick Actions</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))',gap:10}}>
          <QuickAction icon="&#128203;" label="New Quote" href="/quotes/create" color={C.blue}/>
          <QuickAction icon="&#129518;" label="Add Client" href="/crm" color={C.teal}/>
          <QuickAction icon="&#128222;" label="Stock" href="/stock" color={C.amber}/>
          <QuickAction icon="&#128196;" label="PDF Demo" href="/pdf-demo" color={C.red}/>
          <QuickAction icon="&#128202;" label="Analytics" href="/analytics" color={'#6366F1'}/>
          <QuickAction icon="&#9881;&#65039;" label="Settings" href="/settings" color={C.g400}/>
        </div>
      </div>
    </div>
  )
}


// ── Billing ──

const C = {
  navy:'#0B1F3A', blue:'#1A6FE8', teal:'#0EA5A0', amber:'#FFB400',
  green:'#22C55E', red:'#EF4444', bg:'#F0F4F8', white:'#fff',
  g100:'#E8EDF3', g200:'#D1D9E6', g400:'#8A9BB5', g600:'#4A5568', g50:'#F8FAFC',
}
const fmt = (n) => '\u20b9'+(n||0).toLocaleString('en-IN')
const SC = {
  draft:   {bg:'#E8EDF3',color:'#8A9BB5'},
  pending: {bg:'rgba(255,180,0,0.1)',color:'#FFB400'},
  partial: {bg:'rgba(26,111,232,0.1)',color:'#1A6FE8'},
  paid:    {bg:'rgba(34,197,94,0.1)',color:'#22C55E'},
  overdue: {bg:'rgba(239,68,68,0.08)',color:'#EF4444'},
  cancelled:{bg:'#E8EDF3',color:'#8A9BB5'},
}

function RecordPaymentModal({ invoice, companyId, onClose, onDone }) {
  const [amount, setAmount] = useState(String(invoice.balance_due || 0))
  const [mode, setMode] = useState('bank_transfer')
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const MODES = ['cash','bank_transfer','upi','cheque','card']

  async function submit() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return setErr('Enter a valid amount.')
    setLoading(true)
    const { error: pe } = await supabase.from('payments').insert({
      company_id: companyId,
      invoice_id: invoice.id,
      client_id: invoice.client_id,
      amount: amt,
      payment_mode: mode,
      payment_date: date,
      notes: note,
    })
    if (pe) { setLoading(false); return setErr(pe.message) }
    // Update invoice
    const newPaid = (invoice.paid_amount || 0) + amt
    const newBalance = Math.max(0, (invoice.grand_total || 0) - newPaid)
    const newStatus = newBalance <= 0 ? 'paid' : 'partial'
    await supabase.from('invoices').update({ paid_amount: newPaid, balance_due: newBalance, status: newStatus }).eq('id', invoice.id)
    setLoading(false)
    onDone()
  }

  const inp = {width:'100%',padding:'10px 12px',borderRadius:9,border:'1.5px solid '+C.g200,fontSize:13,fontFamily:'Inter,sans-serif',color:C.navy,outline:'none',boxSizing:'border-box'}
  const lb = {fontSize:11,fontWeight:700,color:C.g400,textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:5}

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:C.white,borderRadius:16,width:'100%',maxWidth:440,boxShadow:'0 24px 64px rgba(11,31,58,0.2)',overflow:'hidden'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid '+C.g100,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,color:C.navy}}>Record Payment</div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:20,color:C.g400}}>&#215;</button>
        </div>
        <div style={{padding:20}}>
          <div style={{background:C.g50,borderRadius:10,padding:12,marginBottom:16,display:'flex',justifyContent:'space-between'}}>
            <div style={{fontSize:13,color:C.navy,fontWeight:600}}>{invoice.client_name}</div>
            <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,color:C.amber,fontWeight:600}}>{fmt(invoice.balance_due)} due</div>
          </div>
          {err && <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:8,padding:'9px 12px',fontSize:13,color:C.red,marginBottom:12}}>{err}</div>}
          <label style={lb}>Amount (Rs.) *</label>
          <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} style={{...inp,marginBottom:14}}/>
          <label style={lb}>Payment Mode</label>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>
            {MODES.map(m => (
              <button key={m} onClick={()=>setMode(m)} style={{padding:'5px 10px',borderRadius:7,border:'1.5px solid '+(mode===m?C.blue:C.g200),background:mode===m?C.blue+'10':C.white,color:mode===m?C.blue:C.g600,fontSize:11,fontWeight:600,cursor:'pointer',textTransform:'capitalize'}}>
                {m.replace('_',' ')}
              </button>
            ))}
          </div>
          <label style={lb}>Payment Date</label>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{...inp,marginBottom:14}}/>
          <label style={lb}>Note (optional)</label>
          <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Ref no, cheque no..." style={{...inp,marginBottom:16}}/>
          <button onClick={submit} disabled={loading} style={{width:'100%',padding:13,borderRadius:10,border:'none',background:C.green,color:'#fff',fontSize:14,fontWeight:700,cursor:loading?'default':'pointer',fontFamily:'Syne,sans-serif'}}>
            {loading?'&#8987; Saving...':'&#10003; Record Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Billing() {
  const [tab, setTab] = useState('invoices')
  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [payModal, setPayModal] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return setLoading(false)
    const { data: ud } = await supabase.from('users').select('company_id,companies(name)').eq('id',user.id).single()
    if (!ud) return setLoading(false)
    setProfile(ud)
    const [ir, pr] = await Promise.all([
      supabase.from('invoices').select('*').eq('company_id',ud.company_id).order('created_at',{ascending:false}),
      supabase.from('payments').select('*').eq('company_id',ud.company_id).order('payment_date',{ascending:false}).limit(30),
    ])
    setInvoices(ir.data||[])
    setPayments(pr.data||[])
    setLoading(false)
  }

  const filteredInvoices = filter==='all' ? invoices : invoices.filter(i=>i.status===filter)
  const totalBilled = invoices.reduce((s,i)=>s+(i.grand_total||0),0)
  const totalCollected = invoices.reduce((s,i)=>s+(i.paid_amount||0),0)
  const totalOutstanding = invoices.reduce((s,i)=>s+(i.balance_due||0),0)
  const overdueCount = invoices.filter(i=>i.status==='overdue').length

  return (
    <div style={{fontFamily:'Inter,sans-serif'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <h2 style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:700,color:C.navy}}>Billing</h2>
        <button style={{background:C.blue,color:'#fff',border:'none',padding:'9px 18px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>
          + New Invoice
        </button>
      </div>

      {/* Summary cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:20}}>
        {[
          {i:'&#128176;',v:fmt(totalBilled),l:'Total Billed',c:C.blue},
          {i:'&#9989;',v:fmt(totalCollected),l:'Collected',c:C.green},
          {i:'&#8987;',v:fmt(totalOutstanding),l:'Outstanding',c:C.amber},
          {i:'&#9888;&#65039;',v:String(overdueCount),l:'Overdue',c:C.red},
        ].map(k=>(
          <div key={k.l} style={{background:C.white,borderRadius:14,padding:16,border:'1px solid '+C.g100,borderTop:'3px solid '+k.c}}>
            <div style={{width:32,height:32,borderRadius:8,background:k.c+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,marginBottom:8}} dangerouslySetInnerHTML={{__html:k.i}}/>
            <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:20,fontWeight:500,color:C.navy,marginBottom:2}}>{k.v}</div>
            <div style={{fontSize:12,color:C.g400}}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:0,background:C.white,border:'1px solid '+C.g100,borderRadius:10,padding:3,marginBottom:16,width:'fit-content'}}>
        {['invoices','payments'].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:'7px 20px',borderRadius:8,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,background:tab===t?C.navy:'transparent',color:tab===t?'#fff':C.g400,textTransform:'capitalize',transition:'all 0.15s'}}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'invoices' && (
        <>
          <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
            {['all','pending','partial','paid','overdue'].map(s=>(
              <button key={s} onClick={()=>setFilter(s)} style={{padding:'5px 12px',borderRadius:100,fontSize:11,fontWeight:600,cursor:'pointer',border:'1px solid',borderColor:filter===s?C.navy:C.g100,background:filter===s?C.navy:C.white,color:filter===s?'#fff':'#4A5568',textTransform:'capitalize'}}>
                {s}
              </button>
            ))}
          </div>
          <div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,overflow:'hidden'}}>
            {loading?<div style={{padding:40,textAlign:'center',color:C.g400}}>Loading...</div>:filteredInvoices.length===0?(
              <div style={{padding:60,textAlign:'center'}}>
                <div style={{fontSize:40,marginBottom:12}}>&#129518;</div>
                <p style={{color:C.g400,marginBottom:16}}>No invoices yet</p>
                <button style={{background:C.blue,color:'#fff',border:'none',padding:'10px 20px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>Create Invoice</button>
              </div>
            ):(
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:C.g50}}>
                      {['Invoice #','Client','Total','Paid','Balance','Status','Due Date',''].map(h=>(
                        <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:C.g400,borderBottom:'1px solid '+C.g100}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((inv,i)=>{
                      const sc = SC[inv.status]||SC.draft
                      const overdue = inv.status==='overdue'||(inv.due_date&&new Date(inv.due_date)<new Date()&&(inv.balance_due||0)>0)
                      return(
                        <tr key={inv.id} style={{borderBottom:'1px solid '+C.g50,background:overdue&&inv.status!=='paid'?'rgba(239,68,68,0.02)':'transparent'}}>
                          <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:11,color:C.g400}}>#{inv.invoice_number}</td>
                          <td style={{padding:'12px 14px',fontWeight:600,fontSize:13,color:C.navy}}>{inv.client_name}</td>
                          <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12,color:C.navy}}>{fmt(inv.grand_total)}</td>
                          <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12,color:C.green}}>{fmt(inv.paid_amount)}</td>
                          <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12,color:(inv.balance_due||0)>0?C.amber:C.green,fontWeight:600}}>{fmt(inv.balance_due)}</td>
                          <td style={{padding:'12px 14px'}}><span style={{...sc,padding:'3px 8px',borderRadius:100,fontSize:10,fontWeight:700,textTransform:'capitalize'}}>{inv.status}</span></td>
                          <td style={{padding:'12px 14px',fontSize:12,color:overdue&&inv.status!=='paid'?C.red:C.g400}}>
                            {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '—'}
                          </td>
                          <td style={{padding:'12px 14px'}}>
                            {inv.status!=='paid'&&inv.status!=='cancelled'&&(
                              <button onClick={()=>setPayModal(inv)} style={{padding:'5px 10px',borderRadius:6,border:'1px solid '+C.green+'40',background:C.green+'10',color:C.green,fontSize:11,fontWeight:600,cursor:'pointer'}}>
                                Record Payment
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'payments' && (
        <div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,overflow:'hidden'}}>
          {loading?<div style={{padding:40,textAlign:'center',color:C.g400}}>Loading...</div>:payments.length===0?(
            <div style={{padding:60,textAlign:'center'}}>
              <div style={{fontSize:40,marginBottom:12}}>&#128179;</div>
              <p style={{color:C.g400}}>No payment records yet.</p>
            </div>
          ):(
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{background:C.g50}}>
                    {['Date','Client','Amount','Mode','Invoice','Note'].map(h=>(
                      <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:C.g400,borderBottom:'1px solid '+C.g100}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p,i)=>(
                    <tr key={p.id} style={{borderBottom:'1px solid '+C.g50}}>
                      <td style={{padding:'12px 14px',fontSize:12,color:C.g400}}>{new Date(p.payment_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</td>
                      <td style={{padding:'12px 14px',fontWeight:600,fontSize:13,color:C.navy}}>{p.client_name||'—'}</td>
                      <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:600,color:C.green}}>{fmt(p.amount)}</td>
                      <td style={{padding:'12px 14px'}}><span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:6,background:C.g100,color:C.g600,textTransform:'capitalize'}}>{(p.payment_mode||'').replace('_',' ')}</span></td>
                      <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:11,color:C.g400}}>#{p.invoice_number||'—'}</td>
                      <td style={{padding:'12px 14px',fontSize:12,color:C.g400}}>{p.notes||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {payModal && (
        <RecordPaymentModal
          invoice={payModal}
          companyId={profile?.company_id}
          onClose={()=>setPayModal(null)}
          onDone={()=>{setPayModal(null);load()}}
        />
      )}
    </div>
  )
}


// ── Stock ──

const C = {
  navy:'#0B1F3A', blue:'#1A6FE8', teal:'#0EA5A0', amber:'#FFB400',
  green:'#22C55E', red:'#EF4444', bg:'#F0F4F8', white:'#fff',
  g100:'#E8EDF3', g200:'#D1D9E6', g400:'#8A9BB5', g600:'#4A5568', g50:'#F8FAFC',
}

function InlineEdit({ value, onSave, type='text', prefix='' }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(value||''))
  if (!editing) return (
    <span onClick={()=>setEditing(true)} style={{cursor:'pointer',borderBottom:'1px dashed '+C.g200,paddingBottom:1}}>
      {prefix}{value||'—'}
    </span>
  )
  return (
    <input autoFocus type={type} value={val}
      onChange={e=>setVal(e.target.value)}
      onBlur={()=>{setEditing(false);onSave(type==='number'?parseFloat(val)||0:val)}}
      onKeyDown={e=>{if(e.key==='Enter'){setEditing(false);onSave(type==='number'?parseFloat(val)||0:val)}if(e.key==='Escape')setEditing(false)}}
      style={{width:'80px',padding:'3px 6px',borderRadius:5,border:'1.5px solid '+C.blue,fontSize:12,fontFamily:'JetBrains Mono,monospace',outline:'none'}}
    />
  )
}

function AddRowModal({ tableName, companyId, fields, onClose, onDone }) {
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const inp = {width:'100%',padding:'9px 12px',borderRadius:8,border:'1.5px solid '+C.g200,fontSize:13,fontFamily:'Inter,sans-serif',color:C.navy,outline:'none',boxSizing:'border-box',marginBottom:12}
  const lb = {fontSize:11,fontWeight:700,color:C.g400,textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:4}

  async function submit() {
    const required = fields.filter(f=>f.required)
    for (const f of required) { if (!form[f.key]) return setErr('Fill in '+f.label) }
    setLoading(true)
    const { error } = await supabase.from(tableName).insert({ ...form, company_id: companyId })
    setLoading(false)
    if (error) return setErr(error.message)
    onDone()
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:C.white,borderRadius:16,width:'100%',maxWidth:420,boxShadow:'0 24px 64px rgba(11,31,58,0.2)',overflow:'hidden'}}>
        <div style={{padding:'14px 18px',borderBottom:'1px solid '+C.g100,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,color:C.navy}}>Add {tableName==='profile_companies'?'Profile':'Item'}</div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:C.g400}}>&#215;</button>
        </div>
        <div style={{padding:18}}>
          {err&&<div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:8,padding:'9px 12px',fontSize:13,color:C.red,marginBottom:12}}>{err}</div>}
          {fields.map(f=>(
            <div key={f.key}>
              <label style={lb}>{f.label}{f.required?' *':''}</label>
              {f.type==='select'?(
                <select value={form[f.key]||''} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} style={{...inp,appearance:'none'}}>
                  <option value="">Select...</option>
                  {f.options.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              ):(
                <input type={f.type||'text'} value={form[f.key]||''} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder||''} style={inp}/>
              )}
            </div>
          ))}
          <button onClick={submit} disabled={loading} style={{width:'100%',padding:12,borderRadius:10,border:'none',background:C.blue,color:'#fff',fontSize:13,fontWeight:700,cursor:loading?'default':'pointer',fontFamily:'Syne,sans-serif'}}>
            {loading?'Saving...':'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Stock() {
  const [tab, setTab] = useState('profiles')
  const [profiles, setProfiles] = useState([])
  const [glass, setGlass] = useState([])
  const [accessories, setAccessories] = useState([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [addModal, setAddModal] = useState(null)

  useEffect(()=>{load()},[])

  async function load() {
    setLoading(true)
    const{data:{user}}=await supabase.auth.getUser()
    if(!user)return setLoading(false)
    const{data:ud}=await supabase.from('users').select('company_id,companies(name)').eq('id',user.id).single()
    if(!ud)return setLoading(false)
    setProfile(ud)
    const cid=ud.company_id
    const[pr,gr,ar]=await Promise.all([
      supabase.from('profile_companies').select('*').eq('company_id',cid).order('series'),
      supabase.from('glass_types').select('*').eq('company_id',cid).order('name'),
      supabase.from('accessories').select('*').eq('company_id',cid).order('name'),
    ])
    setProfiles(pr.data||[])
    setGlass(gr.data||[])
    setAccessories(ar.data||[])
    setLoading(false)
  }

  async function updateCell(table, id, field, value, setter) {
    await supabase.from(table).update({[field]:value}).eq('id',id)
    setter(prev=>prev.map(r=>r.id===id?{...r,[field]:value}:r))
  }

  const TABS = [
    {k:'profiles', label:'Profiles', count:profiles.length},
    {k:'glass',    label:'Glass',    count:glass.length},
    {k:'accessories',label:'Accessories',count:accessories.length},
  ]

  const PROFILE_FIELDS = [
    {key:'brand',label:'Brand',required:true,placeholder:'e.g. Jindal'},
    {key:'series',label:'Series',required:true,placeholder:'e.g. 46S'},
    {key:'material_type',label:'Material',required:true,type:'select',options:['aluminium','upvc','mixed']},
    {key:'color',label:'Colour',placeholder:'Silver, White...'},
    {key:'weight_per_meter',label:'Weight/m (kg)',type:'number'},
    {key:'price_per_kg',label:'Price/kg (Rs.)',type:'number'},
  ]
  const GLASS_FIELDS = [
    {key:'name',label:'Glass Type',required:true,placeholder:'e.g. Clear Float 4mm'},
    {key:'thickness_mm',label:'Thickness (mm)',type:'number',placeholder:'4'},
    {key:'price_per_sqft',label:'Price/sqft (Rs.)',type:'number'},
    {key:'price_per_sqm',label:'Price/sqm (Rs.)',type:'number'},
    {key:'brand',label:'Brand',placeholder:'Saint Gobain...'},
  ]
  const ACC_FIELDS = [
    {key:'name',label:'Name',required:true,placeholder:'e.g. Door Handle'},
    {key:'category',label:'Category',type:'select',options:['handle','lock','hinge','roller','seal','mosquito_mesh','other']},
    {key:'unit',label:'Unit',type:'select',options:['piece','set','meter','kg','sqft']},
    {key:'price',label:'Price (Rs.)',type:'number'},
    {key:'brand',label:'Brand'},
  ]

  return (
    <div style={{fontFamily:'Inter,sans-serif'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <h2 style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:700,color:C.navy}}>Stock Manager</h2>
        <button onClick={()=>setAddModal(tab)} style={{background:C.blue,color:'#fff',border:'none',padding:'9px 18px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>
          + Add {tab==='profiles'?'Profile':tab==='glass'?'Glass':'Accessory'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:0,background:C.white,border:'1px solid '+C.g100,borderRadius:10,padding:3,marginBottom:16,width:'fit-content'}}>
        {TABS.map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:'7px 16px',borderRadius:8,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,background:tab===t.k?C.navy:'transparent',color:tab===t.k?'#fff':C.g400,transition:'all 0.15s'}}>
            {t.label} <span style={{opacity:0.7}}>({t.count})</span>
          </button>
        ))}
      </div>

      <div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,overflow:'hidden'}}>
        {loading?<div style={{padding:40,textAlign:'center',color:C.g400}}>Loading...</div>:(

          tab==='profiles'&&(
            profiles.length===0?(
              <div style={{padding:60,textAlign:'center'}}>
                <div style={{fontSize:40,marginBottom:12}}>&#128295;</div>
                <p style={{color:C.g400,marginBottom:16}}>No profiles yet. Add your first profile to start quoting.</p>
                <button onClick={()=>setAddModal('profiles')} style={{background:C.blue,color:'#fff',border:'none',padding:'10px 20px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>Add Profile</button>
              </div>
            ):(
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr style={{background:C.g50}}>{['Brand','Series','Material','Colour','Wt/m (kg)','Price/kg','Price/m (calc)',''].map(h=><th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:C.g400,borderBottom:'1px solid '+C.g100}}>{h}</th>)}</tr></thead>
                  <tbody>{profiles.map((p,i)=>(
                    <tr key={p.id} style={{borderBottom:'1px solid '+C.g50}}>
                      <td style={{padding:'12px 14px',fontWeight:600,fontSize:13,color:C.navy}}><InlineEdit value={p.brand} onSave={v=>updateCell('profile_companies',p.id,'brand',v,setProfiles)}/></td>
                      <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12,color:C.navy}}><InlineEdit value={p.series} onSave={v=>updateCell('profile_companies',p.id,'series',v,setProfiles)}/></td>
                      <td style={{padding:'12px 14px'}}><span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:6,background:C.blue+'15',color:C.blue,textTransform:'capitalize'}}>{p.material_type||'—'}</span></td>
                      <td style={{padding:'12px 14px',fontSize:12,color:C.g600}}><InlineEdit value={p.color} onSave={v=>updateCell('profile_companies',p.id,'color',v,setProfiles)}/></td>
                      <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12}}><InlineEdit value={p.weight_per_meter} type="number" onSave={v=>updateCell('profile_companies',p.id,'weight_per_meter',v,setProfiles)}/></td>
                      <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12}}><InlineEdit value={p.price_per_kg} type="number" prefix="Rs." onSave={v=>updateCell('profile_companies',p.id,'price_per_kg',v,setProfiles)}/></td>
                      <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12,color:C.teal,fontWeight:600}}>
                        {p.weight_per_meter&&p.price_per_kg?'Rs.'+((p.weight_per_meter*p.price_per_kg).toFixed(2)):'—'}
                      </td>
                      <td style={{padding:'12px 14px'}}><button onClick={async()=>{if(confirm('Delete this profile?')){await supabase.from('profile_companies').delete().eq('id',p.id);setProfiles(prev=>prev.filter(x=>x.id!==p.id))}}} style={{padding:'4px 8px',borderRadius:6,border:'1px solid rgba(239,68,68,0.2)',background:'rgba(239,68,68,0.06)',color:C.red,fontSize:11,cursor:'pointer'}}>Delete</button></td>
                    </tr>
                  ))}</tbody>
                </table>
                <div style={{padding:'10px 14px',background:C.g50,borderTop:'1px solid '+C.g100,fontSize:11,color:C.g400}}>&#128231; Click any cell to edit inline</div>
              </div>
            )
          )

        )}

        {!loading&&tab==='glass'&&(
          glass.length===0?(
            <div style={{padding:60,textAlign:'center'}}>
              <div style={{fontSize:40,marginBottom:12}}>&#128142;</div>
              <p style={{color:C.g400,marginBottom:16}}>No glass types yet.</p>
              <button onClick={()=>setAddModal('glass')} style={{background:C.blue,color:'#fff',border:'none',padding:'10px 20px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>Add Glass Type</button>
            </div>
          ):(
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{background:C.g50}}>{['Name','Thickness','Price/sqft','Price/sqm','Brand',''].map(h=><th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:C.g400,borderBottom:'1px solid '+C.g100}}>{h}</th>)}</tr></thead>
                <tbody>{glass.map((g,i)=>(
                  <tr key={g.id} style={{borderBottom:'1px solid '+C.g50}}>
                    <td style={{padding:'12px 14px',fontWeight:600,fontSize:13,color:C.navy}}><InlineEdit value={g.name} onSave={v=>updateCell('glass_types',g.id,'name',v,setGlass)}/></td>
                    <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12}}><InlineEdit value={g.thickness_mm} type="number" onSave={v=>updateCell('glass_types',g.id,'thickness_mm',v,setGlass)}/> mm</td>
                    <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12}}><InlineEdit value={g.price_per_sqft} type="number" prefix="Rs." onSave={v=>updateCell('glass_types',g.id,'price_per_sqft',v,setGlass)}/></td>
                    <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12}}><InlineEdit value={g.price_per_sqm} type="number" prefix="Rs." onSave={v=>updateCell('glass_types',g.id,'price_per_sqm',v,setGlass)}/></td>
                    <td style={{padding:'12px 14px',fontSize:12,color:C.g600}}><InlineEdit value={g.brand} onSave={v=>updateCell('glass_types',g.id,'brand',v,setGlass)}/></td>
                    <td style={{padding:'12px 14px'}}><button onClick={async()=>{if(confirm('Delete?')){await supabase.from('glass_types').delete().eq('id',g.id);setGlass(prev=>prev.filter(x=>x.id!==g.id))}}} style={{padding:'4px 8px',borderRadius:6,border:'1px solid rgba(239,68,68,0.2)',background:'rgba(239,68,68,0.06)',color:C.red,fontSize:11,cursor:'pointer'}}>Delete</button></td>
                  </tr>
                ))}</tbody>
              </table>
              <div style={{padding:'10px 14px',background:C.g50,borderTop:'1px solid '+C.g100,fontSize:11,color:C.g400}}>&#128231; Click any cell to edit inline</div>
            </div>
          )
        )}

        {!loading&&tab==='accessories'&&(
          accessories.length===0?(
            <div style={{padding:60,textAlign:'center'}}>
              <div style={{fontSize:40,marginBottom:12}}>&#128736;&#65039;</div>
              <p style={{color:C.g400,marginBottom:16}}>No accessories yet.</p>
              <button onClick={()=>setAddModal('accessories')} style={{background:C.blue,color:'#fff',border:'none',padding:'10px 20px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>Add Accessory</button>
            </div>
          ):(
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{background:C.g50}}>{['Name','Category','Unit','Price','Brand',''].map(h=><th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:C.g400,borderBottom:'1px solid '+C.g100}}>{h}</th>)}</tr></thead>
                <tbody>{accessories.map((a,i)=>(
                  <tr key={a.id} style={{borderBottom:'1px solid '+C.g50}}>
                    <td style={{padding:'12px 14px',fontWeight:600,fontSize:13,color:C.navy}}><InlineEdit value={a.name} onSave={v=>updateCell('accessories',a.id,'name',v,setAccessories)}/></td>
                    <td style={{padding:'12px 14px'}}><span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:6,background:C.teal+'15',color:C.teal,textTransform:'capitalize'}}>{(a.category||'other').replace('_',' ')}</span></td>
                    <td style={{padding:'12px 14px',fontSize:12,color:C.g600,textTransform:'capitalize'}}>{a.unit||'piece'}</td>
                    <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12}}><InlineEdit value={a.price} type="number" prefix="Rs." onSave={v=>updateCell('accessories',a.id,'price',v,setAccessories)}/></td>
                    <td style={{padding:'12px 14px',fontSize:12,color:C.g600}}><InlineEdit value={a.brand} onSave={v=>updateCell('accessories',a.id,'brand',v,setAccessories)}/></td>
                    <td style={{padding:'12px 14px'}}><button onClick={async()=>{if(confirm('Delete?')){await supabase.from('accessories').delete().eq('id',a.id);setAccessories(prev=>prev.filter(x=>x.id!==a.id))}}} style={{padding:'4px 8px',borderRadius:6,border:'1px solid rgba(239,68,68,0.2)',background:'rgba(239,68,68,0.06)',color:C.red,fontSize:11,cursor:'pointer'}}>Delete</button></td>
                  </tr>
                ))}</tbody>
              </table>
              <div style={{padding:'10px 14px',background:C.g50,borderTop:'1px solid '+C.g100,fontSize:11,color:C.g400}}>&#128231; Click any cell to edit inline</div>
            </div>
          )
        )}
      </div>

      {addModal && (
        <AddRowModal
          tableName={addModal==='profiles'?'profile_companies':addModal==='glass'?'glass_types':'accessories'}
          companyId={profile?.company_id}
          fields={addModal==='profiles'?PROFILE_FIELDS:addModal==='glass'?GLASS_FIELDS:ACC_FIELDS}
          onClose={()=>setAddModal(null)}
          onDone={()=>{setAddModal(null);load()}}
        />
      )}
    </div>
  )
}


// ── CRM ──

const C = {
  navy:'#0B1F3A', blue:'#1A6FE8', teal:'#0EA5A0', amber:'#FFB400',
  green:'#22C55E', red:'#EF4444', bg:'#F0F4F8', white:'#fff',
  g100:'#E8EDF3', g200:'#D1D9E6', g400:'#8A9BB5', g600:'#4A5568', g50:'#F8FAFC',
  purp:'#8B5CF6',
}
const fmt = (n) => n>=100000?'\u20b9'+(n/100000).toFixed(1)+'L':n>=1000?'\u20b9'+(n/1000).toFixed(0)+'K':'\u20b9'+(n||0)

function AddClientModal({ companyId, onClose, onDone }) {
  const [form, setForm] = useState({name:'',phone:'',email:'',address:'',city:'',tag:'residential',gst_number:''})
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const upd = (k,v) => setForm(p=>({...p,[k]:v}))
  const inp = {width:'100%',padding:'9px 12px',borderRadius:8,border:'1.5px solid '+C.g200,fontSize:13,fontFamily:'Inter,sans-serif',color:C.navy,outline:'none',boxSizing:'border-box',marginBottom:12}
  const lb = {fontSize:11,fontWeight:700,color:C.g400,textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:4}
  const TAGS = ['residential','commercial','builder','dealer','govt','other']

  async function submit() {
    if (!form.name.trim()) return setErr('Client name is required.')
    setLoading(true)
    const { error } = await supabase.from('clients').insert({ ...form, company_id: companyId, is_active: true })
    setLoading(false)
    if (error) return setErr(error.message)
    onDone()
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:C.white,borderRadius:16,width:'100%',maxWidth:460,boxShadow:'0 24px 64px rgba(11,31,58,0.2)',overflow:'hidden',maxHeight:'90vh',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'14px 18px',borderBottom:'1px solid '+C.g100,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,color:C.navy}}>Add Client</div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:C.g400}}>&#215;</button>
        </div>
        <div style={{padding:18,overflowY:'auto'}}>
          {err&&<div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:8,padding:'9px 12px',fontSize:13,color:C.red,marginBottom:12}}>{err}</div>}
          <label style={lb}>Name *</label><input value={form.name} onChange={e=>upd('name',e.target.value)} placeholder="Client or company name" style={inp}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}>
            <div><label style={lb}>Phone</label><input type="tel" value={form.phone} onChange={e=>upd('phone',e.target.value)} placeholder="+91 98765 43210" style={inp}/></div>
            <div><label style={lb}>Email</label><input type="email" value={form.email} onChange={e=>upd('email',e.target.value)} placeholder="client@email.com" style={inp}/></div>
          </div>
          <label style={lb}>Address</label><input value={form.address} onChange={e=>upd('address',e.target.value)} placeholder="Street, area" style={inp}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}>
            <div><label style={lb}>City</label><input value={form.city} onChange={e=>upd('city',e.target.value)} placeholder="Bengaluru" style={inp}/></div>
            <div><label style={lb}>GST Number</label><input value={form.gst_number} onChange={e=>upd('gst_number',e.target.value)} placeholder="Optional" style={inp}/></div>
          </div>
          <label style={lb}>Tag</label>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
            {TAGS.map(t=><button key={t} onClick={()=>upd('tag',t)} style={{padding:'5px 10px',borderRadius:7,border:'1.5px solid '+(form.tag===t?C.blue:C.g200),background:form.tag===t?C.blue+'10':C.white,color:form.tag===t?C.blue:C.g600,fontSize:11,fontWeight:600,cursor:'pointer',textTransform:'capitalize'}}>{t}</button>)}
          </div>
          <button onClick={submit} disabled={loading} style={{width:'100%',padding:12,borderRadius:10,border:'none',background:C.blue,color:'#fff',fontSize:13,fontWeight:700,cursor:loading?'default':'pointer',fontFamily:'Syne,sans-serif'}}>
            {loading?'Saving...':'Add Client'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CRM() {
  const [tab, setTab] = useState('clients')
  const [clients, setClients] = useState([])
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [search, setSearch] = useState('')
  const [addClient, setAddClient] = useState(false)
  const [selClient, setSelClient] = useState(null)

  useEffect(()=>{load()},[])

  async function load() {
    setLoading(true)
    const{data:{user}}=await supabase.auth.getUser()
    if(!user)return setLoading(false)
    const{data:ud}=await supabase.from('users').select('company_id,companies(name)').eq('id',user.id).single()
    if(!ud)return setLoading(false)
    setProfile(ud)
    const cid=ud.company_id
    const[cr,lr]=await Promise.all([
      supabase.from('clients').select('*').eq('company_id',cid).order('created_at',{ascending:false}),
      supabase.from('leads').select('*').eq('company_id',cid).order('created_at',{ascending:false}),
    ])
    setClients(cr.data||[])
    setLeads(lr.data||[])
    setLoading(false)
  }

  const filteredClients = clients.filter(c=>[c.name,c.phone,c.city,c.email].some(v=>v?.toLowerCase().includes(search.toLowerCase())))
  const filteredLeads = leads.filter(l=>[l.name,l.phone,l.source].some(v=>v?.toLowerCase().includes(search.toLowerCase())))

  const TAG_COLORS = {
    residential: {bg:C.blue+'15',c:C.blue},
    commercial:  {bg:C.teal+'15',c:C.teal},
    builder:     {bg:C.purp+'15',c:C.purp},
    dealer:      {bg:C.amber+'15',c:C.amber},
    govt:        {bg:C.green+'15',c:C.green},
    other:       {bg:C.g100,c:C.g400},
  }
  const LEAD_STATUS = {
    open:       {bg:'rgba(26,111,232,0.1)',c:C.blue},
    contacted:  {bg:'rgba(14,165,160,0.1)',c:C.teal},
    quoted:     {bg:'rgba(139,92,246,0.1)',c:C.purp},
    won:        {bg:'rgba(34,197,94,0.1)',c:C.green},
    lost:       {bg:'rgba(239,68,68,0.08)',c:C.red},
    on_hold:    {bg:'rgba(255,180,0,0.1)',c:C.amber},
  }

  return (
    <div style={{fontFamily:'Inter,sans-serif'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <h2 style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:700,color:C.navy}}>CRM</h2>
        <div style={{display:'flex',gap:8}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search clients..." style={{padding:'8px 12px',borderRadius:8,border:'1px solid '+C.g200,fontSize:13,outline:'none',width:200,fontFamily:'Inter,sans-serif'}}/>
          {tab==='clients'&&<button onClick={()=>setAddClient(true)} style={{background:C.blue,color:'#fff',border:'none',padding:'8px 16px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>+ Add Client</button>}
        </div>
      </div>

      {/* Summary */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12,marginBottom:20}}>
        {[
          {i:'&#128100;',v:String(clients.length),l:'Total Clients',c:C.blue},
          {i:'&#127919;',v:String(leads.filter(l=>l.status==='open').length),l:'Open Leads',c:C.teal},
          {i:'&#127881;',v:String(leads.filter(l=>l.status==='won').length),l:'Won Leads',c:C.green},
          {i:'&#128176;',v:fmt(clients.reduce((s,c)=>s+(c.total_billed||0),0)),l:'Total Billed',c:C.amber},
        ].map(k=>(
          <div key={k.l} style={{background:C.white,borderRadius:12,padding:14,border:'1px solid '+C.g100,borderLeft:'3px solid '+k.c}}>
            <div style={{fontSize:18,marginBottom:6}} dangerouslySetInnerHTML={{__html:k.i}}/>
            <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:18,fontWeight:500,color:C.navy,marginBottom:2}}>{k.v}</div>
            <div style={{fontSize:11,color:C.g400}}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:0,background:C.white,border:'1px solid '+C.g100,borderRadius:10,padding:3,marginBottom:16,width:'fit-content'}}>
        {[{k:'clients',l:'Clients'},{k:'leads',l:'Leads'}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:'7px 20px',borderRadius:8,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,background:tab===t.k?C.navy:'transparent',color:tab===t.k?'#fff':C.g400,transition:'all 0.15s'}}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Clients table */}
      {tab==='clients'&&(
        <div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,overflow:'hidden'}}>
          {loading?<div style={{padding:40,textAlign:'center',color:C.g400}}>Loading...</div>:filteredClients.length===0?(
            <div style={{padding:60,textAlign:'center'}}>
              <div style={{fontSize:40,marginBottom:12}}>&#128100;</div>
              <p style={{color:C.g400,marginBottom:16}}>{search?'No clients match "'+search+'"':'No clients yet.'}</p>
              {!search&&<button onClick={()=>setAddClient(true)} style={{background:C.blue,color:'#fff',border:'none',padding:'10px 20px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>Add First Client</button>}
            </div>
          ):(
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{background:C.g50}}>{['Client','Phone','City','Tag','Quotes','Total Billed','Balance','Actions'].map(h=><th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:C.g400,borderBottom:'1px solid '+C.g100}}>{h}</th>)}</tr></thead>
                <tbody>
                  {filteredClients.map((c,i)=>{
                    const tc = TAG_COLORS[c.tag]||TAG_COLORS.other
                    const balance = (c.total_billed||0)-(c.total_paid||0)
                    return(
                      <tr key={c.id} style={{borderBottom:'1px solid '+C.g50,cursor:'pointer'}} onClick={()=>setSelClient(selClient?.id===c.id?null:c)}>
                        <td style={{padding:'12px 14px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,'+C.blue+','+C.teal+')',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,color:'#fff',flexShrink:0}}>
                              {(c.name||'?')[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{fontWeight:600,fontSize:13,color:C.navy}}>{c.name}</div>
                              <div style={{fontSize:11,color:C.g400}}>{c.email||''}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{padding:'12px 14px',fontSize:12,color:C.g600}}>{c.phone||'—'}</td>
                        <td style={{padding:'12px 14px',fontSize:12,color:C.g600}}>{c.city||'—'}</td>
                        <td style={{padding:'12px 14px'}}><span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:6,background:tc.bg,color:tc.c,textTransform:'capitalize'}}>{c.tag||'other'}</span></td>
                        <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12,textAlign:'center'}}>{c.total_quotes||0}</td>
                        <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12,color:C.navy,fontWeight:500}}>{fmt(c.total_billed||0)}</td>
                        <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12,color:balance>0?C.amber:C.green,fontWeight:600}}>{balance>0?fmt(balance):'Paid &#10003;'}</td>
                        <td style={{padding:'12px 14px'}}>
                          <div style={{display:'flex',gap:6}}>
                            <a href={'/quotes/create?client='+c.id} style={{padding:'4px 10px',borderRadius:6,border:'1px solid '+C.blue+'40',background:C.blue+'10',color:C.blue,fontSize:11,fontWeight:600,textDecoration:'none'}}>Quote</a>
                            {c.phone&&<a href={'https://wa.me/'+c.phone.replace(/\D/g,'')} target="_blank" rel="noopener noreferrer" style={{padding:'4px 8px',borderRadius:6,border:'1px solid rgba(37,211,102,0.3)',background:'rgba(37,211,102,0.06)',color:'#25D366',fontSize:11,fontWeight:600,textDecoration:'none'}}>WA</a>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div style={{padding:'10px 14px',background:C.g50,borderTop:'1px solid '+C.g100,fontSize:11,color:C.g400}}>{filteredClients.length} clients</div>
            </div>
          )}
        </div>
      )}

      {/* Leads table */}
      {tab==='leads'&&(
        <div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,overflow:'hidden'}}>
          {loading?<div style={{padding:40,textAlign:'center',color:C.g400}}>Loading...</div>:filteredLeads.length===0?(
            <div style={{padding:60,textAlign:'center'}}>
              <div style={{fontSize:40,marginBottom:12}}>&#127919;</div>
              <p style={{color:C.g400,marginBottom:16}}>{search?'No leads match "'+search+'"':'No leads yet. Add leads from enquiries.'}</p>
            </div>
          ):(
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{background:C.g50}}>{['Name','Phone','Source','Status','Est. Value','Follow-up',''].map(h=><th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:C.g400,borderBottom:'1px solid '+C.g100}}>{h}</th>)}</tr></thead>
                <tbody>
                  {filteredLeads.map((l,i)=>{
                    const ls = LEAD_STATUS[l.status]||LEAD_STATUS.open
                    return(
                      <tr key={l.id} style={{borderBottom:'1px solid '+C.g50}}>
                        <td style={{padding:'12px 14px',fontWeight:600,fontSize:13,color:C.navy}}>{l.name||'Unnamed'}</td>
                        <td style={{padding:'12px 14px',fontSize:12,color:C.g600}}>{l.phone||'—'}</td>
                        <td style={{padding:'12px 14px'}}><span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:6,background:C.g100,color:C.g600,textTransform:'capitalize'}}>{l.source||'other'}</span></td>
                        <td style={{padding:'12px 14px'}}><span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:100,background:ls.bg,color:ls.c,textTransform:'capitalize'}}>{(l.status||'open').replace('_',' ')}</span></td>
                        <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12,color:C.navy}}>{l.value_estimate?fmt(l.value_estimate):'—'}</td>
                        <td style={{padding:'12px 14px',fontSize:12,color:l.follow_up_date&&new Date(l.follow_up_date)<new Date()?C.red:C.g400}}>
                          {l.follow_up_date?new Date(l.follow_up_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'}):'—'}
                        </td>
                        <td style={{padding:'12px 14px'}}>
                          <select value={l.status||'open'} onChange={async e=>{await supabase.from('leads').update({status:e.target.value}).eq('id',l.id);setLeads(prev=>prev.map(x=>x.id===l.id?{...x,status:e.target.value}:x))}} onClick={e=>e.stopPropagation()} style={{padding:'4px 8px',borderRadius:6,border:'1px solid '+C.g200,fontSize:11,color:C.navy,cursor:'pointer',outline:'none'}}>
                            {Object.keys(LEAD_STATUS).map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {addClient&&<AddClientModal companyId={profile?.company_id} onClose={()=>setAddClient(false)} onDone={()=>{setAddClient(false);load()}}/>}
    </div>
  )
}


const C = {
  navy:'#0B1F3A', blue:'#1A6FE8', blueLt:'#3B8EFF', teal:'#0EA5A0',
  amber:'#FFB400', green:'#22C55E', red:'#EF4444', bg:'#F0F4F8',
  white:'#fff', g100:'#E8EDF3', g200:'#D1D9E6', g400:'#8A9BB5', g600:'#4A5568',
  bluePale:'rgba(26,111,232,0.08)', purp:'#8B5CF6', g50:'#F8FAFC',
}
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const fmt = (n) => n>=100000?'\u20b9'+(n/100000).toFixed(1)+'L':n>=1000?'\u20b9'+(n/1000).toFixed(0)+'K':'\u20b9'+(n||0)

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
  {path:'/pdf-demo',  icon:'&#128196;', label:'PDF Demo'},
]

function Layout({ children }) {
  const loc = window.location.pathname
  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden'}}>
      <aside style={{width:220,flexShrink:0,background:C.navy,display:'flex',flexDirection:'column',height:'100vh'}}>
        <div style={{padding:'20px 16px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <a href="/dashboard" style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:800,color:'#fff',textDecoration:'none'}}>
            Q<span style={{color:C.blueLt}}>Lekha</span>
          </a>
        </div>
        <nav style={{padding:10,flex:1,overflowY:'auto'}}>
          {NAV.map(n => {
            const active = loc === n.path || (n.path !== '/dashboard' && loc.startsWith(n.path))
            return (
              <a key={n.path} href={n.path}
                style={{display:'flex',alignItems:'center',gap:9,padding:'8px 10px',borderRadius:8,marginBottom:1,textDecoration:'none',background:active?'rgba(26,111,232,0.18)':'transparent',color:active?'#fff':'rgba(255,255,255,0.5)',fontSize:13,fontWeight:active?600:400,borderLeft:active?'2px solid '+C.blue:'2px solid transparent',transition:'all 0.15s'}}
                dangerouslySetInnerHTML={{__html:'<span style="font-size:15px">'+n.icon+'</span><span>'+n.label+'</span>'}}
              />
            )
          })}
        </nav>
        <div style={{padding:10,borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          <button onClick={() => supabase.auth.signOut().then(() => { window.location.href = '/auth' })}
            style={{display:'flex',alignItems:'center',gap:9,width:'100%',padding:'8px 10px',borderRadius:8,background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.5)',fontSize:13}}>
            <span>&#128682;</span> Sign Out
          </button>
        </div>
      </aside>
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <header style={{height:56,background:'#fff',borderBottom:'1px solid '+C.g100,display:'flex',alignItems:'center',padding:'0 20px',boxShadow:'0 2px 8px rgba(11,31,58,0.06)',flexShrink:0}}>
          <span style={{fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,marginRight:'auto',color:C.navy}}>QLekha</span>
          <a href="/quotes/create" style={{background:C.blue,color:'#fff',textDecoration:'none',padding:'7px 14px',borderRadius:8,fontSize:12,fontWeight:600}}>+ New Quote</a>
        </header>
        <main style={{flex:1,overflowY:'auto',padding:22,background:C.bg}}>{children}</main>
      </div>
    </div>
  )
}

function PlaceholderPage({ title, icon, sub }) {
  return (
    <Layout>
      <div style={{padding:60,textAlign:'center'}}>
        <div style={{fontSize:48,marginBottom:16}} dangerouslySetInnerHTML={{__html:icon}}/>
        <h2 style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,color:C.navy,marginBottom:8}}>{title}</h2>
        {sub && <p style={{color:C.g400,fontSize:14}}>{sub}</p>}
      </div>
    </Layout>
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
        <div style={{display:'flex',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:'14px 0',justifyContent:'center'}}>
          {[['5 min','Quote time'],['WA','Direct send'],['14+','Languages'],['Free','To start']].map(([v,l]) => (
            <div key={l} style={{flex:1,textAlign:'center',padding:'0 12px',borderRight:'1px solid rgba(255,255,255,0.08)'}}>
              <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:18,fontWeight:500,color:'#fff'}}>{v}</div>
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
  const Lnk = ({onClick:o,children:c}) => <button onClick={o} style={{background:'none',border:'none',cursor:'pointer',color:C.blue,fontWeight:600,fontSize:13,fontFamily:'Inter,sans-serif'}}>{c}</button>
  const Btn = ({ghost,style:s,...p}) => <button {...p} style={{...BS,...(ghost?{background:'transparent',border:'1.5px solid '+C.g200,color:C.navy,marginTop:8}:{}),...(s||{})}}/>

  async function login() {
    clr(); if (!email||!pw) return setErr('Enter email and password.')
    setLoading(true)
    const {error:e} = await supabase.auth.signInWithPassword({email, password:pw})
    setLoading(false)
    if (e) setErr(e.message.includes('Invalid')?'Wrong email or password.':e.message)
    else window.location.href = '/dashboard'
  }
  async function signup() {
    clr(); if (!email||pw.length<8) return setErr('Email required, min 8 char password.')
    if (pw!==cpw) return setErr('Passwords do not match.')
    setLoading(true)
    const {error:e} = await supabase.auth.signUp({email, password:pw, options:{emailRedirectTo:window.location.origin+'/auth'}})
    setLoading(false)
    if (e) setErr(e.message.includes('already')?'Email already registered.':e.message)
    else { setMode('otp'); setTimer(60); setOk('Check email for a 6-digit code.') }
  }
  async function verify() {
    clr(); const token = otp.replace(/\s/g,'')
    if (token.length!==6) return setErr('Enter the full 6-digit code.')
    setLoading(true)
    const {error:e} = await supabase.auth.verifyOtp({email, token, type:'email'})
    setLoading(false)
    if (e) setErr('Incorrect or expired code.')
    else { setMode('onboard'); setStep(1) }
  }
  async function finish() {
    clr(); setLoading(true)
    try {
      const {data:{user}} = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const {data:co,error:cE} = await supabase.from('companies').insert({
        name:ob.company_name, owner_name:ob.owner_name, phone:ob.phone, city:ob.city,
        plan:'trial', trial_started_at:new Date().toISOString(),
        plan_expires_at:new Date(Date.now()+14*864e5).toISOString(),
        default_language:ob.language, pdf_design:'classic_blue',
      }).select().single()
      if (cE) throw cE
      const {error:uE} = await supabase.from('users').insert({
        id:user.id, company_id:co.id, name:ob.owner_name,
        email:user.email, phone:ob.phone, role:'owner', language:ob.language,
      })
      if (uE) throw uE
      setLoading(false); window.location.href = '/dashboard'
    } catch(e) { setLoading(false); setErr('Setup failed: '+e.message) }
  }

  const pS = {minHeight:'100vh',background:C.navy,display:'flex',position:'relative',overflow:'hidden',fontFamily:'Inter,sans-serif'}
  const gS = {position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(26,111,232,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(26,111,232,0.05) 1px,transparent 1px)',backgroundSize:'40px 40px',pointerEvents:'none'}
  const lS = {flex:1,display:'flex',flexDirection:'column',justifyContent:'center',padding:'60px 80px',position:'relative',zIndex:1}
  const rS = {width:480,background:C.white,display:'flex',flexDirection:'column',justifyContent:'center',padding:'60px 48px',position:'relative',zIndex:1,minHeight:'100vh',overflowY:'auto'}
  const eS = {background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:8,padding:'10px 14px',fontSize:13,color:C.red,marginBottom:12}
  const oS = {background:'rgba(34,197,94,0.08)',border:'1px solid rgba(34,197,94,0.2)',borderRadius:8,padding:'10px 14px',fontSize:13,color:C.green,marginBottom:12}

  return (
    <div style={pS}>
      <div style={gS}/>
      <div style={lS}>
        <div style={{fontFamily:'Syne,sans-serif',fontSize:28,fontWeight:800,color:'#fff',marginBottom:40}}>Q<span style={{color:C.blueLt}}>Lekha</span></div>
        <h1 style={{fontFamily:'Syne,sans-serif',fontSize:'clamp(32px,4vw,48px)',fontWeight:800,color:'#fff',lineHeight:1.1,letterSpacing:'-1.5px',marginBottom:16}}>
          {mode==='login'?<>Welcome<br/>back to<br/><span style={{color:C.blueLt}}>QLekha</span></>
          :mode==='onboard'?<>Almost<br/>ready,<br/><span style={{color:C.blueLt}}>let&apos;s go</span></>
          :<>Start free<br/>on<br/><span style={{color:C.blueLt}}>QLekha</span></>}
        </h1>
        <p style={{fontSize:15,color:'rgba(255,255,255,0.5)',lineHeight:1.7,maxWidth:380}}>
          {mode==='login'?'Your window business, fully organised.':'14-day free trial. No credit card needed.'}
        </p>
      </div>
      <div style={rS}>
        {err&&<div style={eS}>{err}</div>}
        {ok&&<div style={oS}>{ok}</div>}

        {mode==='login'&&<>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:800,color:C.navy,marginBottom:6}}>Sign in</div>
          <div style={{fontSize:13,color:C.g400,marginBottom:20}}>Enter your email and password.</div>
          <label style={LS}>Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" style={IS}/>
          <label style={LS}>Password</label>
          <div style={{position:'relative'}}>
            <input type={show?'text':'password'} value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} placeholder="Your password" style={{...IS,paddingRight:44}}/>
            <button onClick={()=>setShow(v=>!v)} style={{position:'absolute',right:12,top:14,background:'none',border:'none',cursor:'pointer',color:C.g400,fontSize:16,padding:0}}>{show?'\ud83d\ude48':'\ud83d\udc41'}</button>
          </div>
          <div style={{textAlign:'right',marginBottom:14,marginTop:-8}}><Lnk onClick={()=>{setMode('forgot');clr()}}>Forgot password?</Lnk></div>
          <Btn onClick={login} disabled={loading}>{loading?'\u23f3 Signing in...':'Sign in'}</Btn>
          <div style={{textAlign:'center',marginTop:14,fontSize:13,color:C.g400}}>No account? <Lnk onClick={()=>{setMode('signup');clr()}}>Create one free</Lnk></div>
        </>}

        {mode==='signup'&&<>
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

        {mode==='otp'&&<div style={{textAlign:'center'}}>
          <div style={{width:64,height:64,borderRadius:'50%',background:'rgba(26,111,232,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 16px'}}>&#128231;</div>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:800,color:C.navy,marginBottom:6}}>Enter the code</div>
          <div style={{fontSize:13,color:C.g400,marginBottom:20}}>Sent to <strong style={{color:C.navy}}>{email}</strong></div>
          <div style={{display:'flex',gap:10,justifyContent:'center',margin:'20px 0'}}>
            {Array.from({length:6},(_,i)=>(
              <input key={i} type="text" inputMode="numeric" maxLength={1} value={otp[i]||''}
                onChange={e=>{const v=e.target.value.replace(/\D/g,'').slice(-1);const arr=(otp+'      ').slice(0,6).split('');arr[i]=v;setOtp(arr.join('').trimEnd());if(v&&i<5)e.target.nextElementSibling?.focus()}}
                onKeyDown={e=>{if(e.key==='Backspace'&&!otp[i]&&i>0)e.target.previousElementSibling?.focus()}}
                style={{width:48,height:56,textAlign:'center',fontSize:22,fontFamily:'JetBrains Mono,monospace',fontWeight:500,borderRadius:10,border:'2px solid '+(otp[i]?C.blue:C.g200),color:C.navy,outline:'none'}}/>
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

        {mode==='forgot'&&<>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:800,color:C.navy,marginBottom:6}}>Reset password</div>
          <div style={{fontSize:13,color:C.g400,marginBottom:20}}>Enter your email to get a reset link.</div>
          <label style={LS}>Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" style={IS}/>
          <Btn onClick={async()=>{clr();if(!email)return setErr('Enter your email.');setLoading(true);const{error:e}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/auth?reset=1'});setLoading(false);if(e)setErr(e.message);else setOk('Reset link sent to '+email)}} disabled={loading}>
            {loading?'\u23f3 Sending...':'Send reset link'}
          </Btn>
          <div style={{textAlign:'center',marginTop:14}}><Lnk onClick={()=>{setMode('login');clr()}}>Back to sign in</Lnk></div>
        </>}

        {mode==='onboard'&&<>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:800,color:C.navy,marginBottom:20}}>Q<span style={{color:C.blueLt}}>Lekha</span> Setup</div>
          <div style={{display:'flex',gap:6,justifyContent:'center',marginBottom:24}}>
            {[1,2,3].map(n=><div key={n} style={{width:step===n?24:8,height:8,borderRadius:100,background:step>n?C.teal:step===n?C.blue:C.g200,transition:'all 0.3s'}}/>)}
          </div>
          {step===1&&<>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:800,color:C.navy,marginBottom:4}}>Your business</div>
            <div style={{fontSize:13,color:C.g400,marginBottom:16}}>Appears on quotes and invoices.</div>
            <label style={LS}>Business Name *</label><input value={ob.company_name} onChange={e=>upd('company_name',e.target.value)} placeholder="Kumar Aluminium Works" style={IS}/>
            <label style={LS}>Your Name *</label><input value={ob.owner_name} onChange={e=>upd('owner_name',e.target.value)} placeholder="Rajesh Kumar" style={IS}/>
            <label style={LS}>Phone *</label><input type="tel" value={ob.phone} onChange={e=>upd('phone',e.target.value)} placeholder="+91 98765 43210" style={IS}/>
            <label style={LS}>City</label><input value={ob.city} onChange={e=>upd('city',e.target.value)} placeholder="Bengaluru" style={IS}/>
            <Btn onClick={()=>ob.company_name&&ob.owner_name&&ob.phone?setStep(2):setErr('Fill required fields.')}>Continue</Btn>
          </>}
          {step===2&&<>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:800,color:C.navy,marginBottom:4}}>Your language</div>
            <div style={{fontSize:13,color:C.g400,marginBottom:12}}>QLekha works in 14 Indian languages.</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
              {LANGS.map(l=><div key={l.c} onClick={()=>upd('language',l.c)} style={{padding:'10px',borderRadius:10,border:'2px solid '+(ob.language===l.c?C.blue:C.g100),background:ob.language===l.c?'rgba(26,111,232,0.05)':C.white,cursor:'pointer',textAlign:'center',fontSize:14,fontWeight:600,color:ob.language===l.c?C.blue:C.navy}}>{l.n}</div>)}
            </div>
            <Btn onClick={()=>setStep(3)}>Continue</Btn>
            <Btn ghost onClick={()=>setStep(1)}>Back</Btn>
          </>}
          {step===3&&<>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:800,color:C.navy,marginBottom:4}}>You are all set!</div>
            <div style={{fontSize:13,color:C.g400,marginBottom:16}}>14-day free trial starts now.</div>
            {[['\ud83c\udf10',ob.language.toUpperCase()],['\ud83c\udfe2',ob.company_name]].map(([ic,tx])=>(
              <div key={tx} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:10,background:C.bg,marginBottom:8,fontSize:13}}>
                <span style={{fontSize:18}}>{ic}</span><span style={{color:C.navy,fontWeight:500}}>{tx}</span>
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
  const TABS=[{k:'company',i:'&#127962;',l:'Company'},{k:'bank',i:'&#127982;',l:'Bank & GST'},{k:'pdf',i:'&#127912;',l:'PDF'},{k:'wa',i:'&#128172;',l:'WhatsApp'},{k:'users',i:'&#128101;',l:'Users'},{k:'plan',i:'&#9889;',l:'Plan'}]
  const THEMES=[{k:'classic_blue',l:'Classic Blue',c:'#1A6FE8'},{k:'midnight',l:'Midnight',c:'#0B1F3A'},{k:'teal_fresh',l:'Teal Fresh',c:'#0EA5A0'},{k:'amber_warm',l:'Amber Warm',c:'#FFB400'},{k:'forest_green',l:'Forest Green',c:'#16A34A'},{k:'deep_purple',l:'Deep Purple',c:'#7C3AED'}]
  const PLANS=[{k:'trial',l:'Trial',p:'\u20b90',d:'14 days',c:C.g400,f:['5 quotes','1 user']},{k:'starter',l:'Starter',p:'\u20b9499',d:'per month',c:C.blue,f:['50 quotes/mo','WhatsApp']},{k:'growth',l:'Growth',p:'\u20b91,499',d:'per month',c:C.teal,f:['Unlimited quotes','5 users']},{k:'pro',l:'Pro',p:'\u20b93,499',d:'per month',c:C.purp,f:['Everything','15 users','API']}]
  const ROLES=['owner','admin','sales','accounts','workshop','viewer']
  const RC={owner:C.purp,admin:C.blue,sales:C.teal,accounts:C.amber,workshop:C.green,viewer:C.g400}
  const trialDays=co?.plan_expires_at?Math.max(0,Math.ceil((new Date(co.plan_expires_at)-new Date())/(864e5))):0
  const si={width:'100%',padding:'10px 12px',borderRadius:9,border:'1.5px solid '+C.g200,fontSize:13,fontFamily:'Inter,sans-serif',color:C.navy,background:C.white,outline:'none',boxSizing:'border-box',marginBottom:14}
  const lb={fontSize:11,fontWeight:700,color:C.g600,textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:5}
  const sb={padding:'10px 18px',borderRadius:9,border:'none',background:C.blue,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'Syne,sans-serif'}
  if(loading)return<div style={{padding:60,textAlign:'center',color:C.g400}}>&#9881;&#65039; Loading settings...</div>
  return(
    <div style={{display:'flex',gap:20,maxWidth:1060}}>
      {toast&&<div style={{position:'fixed',bottom:24,right:24,background:toast.type==='error'?C.red:C.teal,color:'#fff',padding:'12px 20px',borderRadius:10,fontSize:13,fontWeight:500,zIndex:200,boxShadow:'0 8px 24px rgba(0,0,0,0.15)'}}>{toast.type==='error'?'\u2715':'\u2713'} {toast.msg}</div>}
      <div style={{width:185,flexShrink:0}}>
        <div style={{background:C.white,borderRadius:14,border:'1px solid '+C.g100,overflow:'hidden',marginBottom:12}}>
          {TABS.map(t=><button key={t.k} onClick={()=>setTab(t.k)} dangerouslySetInnerHTML={{__html:'<span>'+t.i+'</span> '+t.l}} style={{display:'flex',alignItems:'center',gap:9,width:'100%',padding:'10px 12px',background:tab===t.k?C.bluePale:'transparent',border:'none',borderLeft:tab===t.k?'3px solid '+C.blue:'3px solid transparent',cursor:'pointer',fontSize:12,fontWeight:tab===t.k?600:400,color:tab===t.k?C.blue:C.g600,textAlign:'left'}}/>)}
        </div>
        <div style={{background:C.navy,borderRadius:12,padding:'12px 14px'}}>
          <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4}}>Plan</div>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:800,color:'#fff'}}>{(PLANS.find(p=>p.k===co?.plan)||PLANS[0]).l}</div>
          {co?.plan==='trial'&&<div style={{fontSize:11,color:C.amber,marginTop:2}}>{trialDays} days left</div>}
          <button onClick={()=>setTab('plan')} style={{marginTop:10,width:'100%',padding:'6px',borderRadius:8,border:'1px solid rgba(255,255,255,0.2)',background:'transparent',color:'rgba(255,255,255,0.7)',fontSize:11,fontWeight:600,cursor:'pointer'}}>Upgrade</button>
        </div>
      </div>
      <div style={{flex:1,minWidth:0}}>
        {tab==='company'&&<div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,padding:22}}>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,marginBottom:4}}>Company Details</div>
          <div style={{fontSize:12,color:C.g400,marginBottom:18}}>Appears on all your quotes and invoices.</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 18px'}}>
            <div><label style={lb}>Business Name *</label><input value={co?.name||''} onChange={e=>upd('name',e.target.value)} style={si}/><label style={lb}>Owner Name *</label><input value={co?.owner_name||''} onChange={e=>upd('owner_name',e.target.value)} style={si}/><label style={lb}>Phone *</label><input value={co?.phone||''} onChange={e=>upd('phone',e.target.value)} style={si}/><label style={lb}>Email</label><input type="email" value={co?.email||''} onChange={e=>upd('email',e.target.value)} style={si}/></div>
            <div><label style={lb}>Address</label><input value={co?.address||''} onChange={e=>upd('address',e.target.value)} style={si}/><label style={lb}>City</label><input value={co?.city||''} onChange={e=>upd('city',e.target.value)} style={si}/><label style={lb}>State</label><input value={co?.state||''} onChange={e=>upd('state',e.target.value)} style={si}/><label style={lb}>Pincode</label><input value={co?.pincode||''} onChange={e=>upd('pincode',e.target.value)} style={si}/></div>
          </div>
          <div style={{textAlign:'right',paddingTop:14,borderTop:'1px solid '+C.g100}}><button style={sb} onClick={()=>save({name:co.name,owner_name:co.owner_name,phone:co.phone,email:co.email,address:co.address,city:co.city,state:co.state,pincode:co.pincode})} disabled={saving}>{saving?'\u23f3 Saving...':'\u2713 Save Changes'}</button></div>
        </div>}
        {tab==='bank'&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,padding:22}}><div style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,marginBottom:18}}>GST & Tax</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 18px'}}><div><label style={lb}>GST Number</label><input value={co?.gst_number||''} onChange={e=>upd('gst_number',e.target.value)} placeholder="29ABCDE1234F1Z5" style={si}/></div><div><label style={lb}>PAN Number</label><input value={co?.pan_number||''} onChange={e=>upd('pan_number',e.target.value)} placeholder="ABCDE1234F" style={si}/></div></div></div>
          <div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,padding:22}}><div style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,marginBottom:18}}>Bank Details</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 18px'}}><div><label style={lb}>Bank Name</label><input value={co?.bank_name||''} onChange={e=>upd('bank_name',e.target.value)} style={si}/><label style={lb}>Account Number</label><input value={co?.account_number||''} onChange={e=>upd('account_number',e.target.value)} style={si}/><label style={lb}>IFSC Code</label><input value={co?.ifsc_code||''} onChange={e=>upd('ifsc_code',e.target.value)} style={si}/></div><div><label style={lb}>Account Holder</label><input value={co?.account_holder||''} onChange={e=>upd('account_holder',e.target.value)} style={si}/><label style={lb}>UPI ID</label><input value={co?.upi_id||''} onChange={e=>upd('upi_id',e.target.value)} style={si}/></div></div><div style={{textAlign:'right',paddingTop:14,borderTop:'1px solid '+C.g100}}><button style={sb} onClick={()=>save({gst_number:co.gst_number,pan_number:co.pan_number,bank_name:co.bank_name,account_number:co.account_number,ifsc_code:co.ifsc_code,account_holder:co.account_holder,upi_id:co.upi_id})} disabled={saving}>{saving?'\u23f3 Saving...':'\u2713 Save Bank'}</button></div></div>
        </div>}
        {tab==='pdf'&&<div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,padding:22}}>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,marginBottom:18}}>PDF Design</div>
          <label style={lb}>Colour Theme</label>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:18}}>{THEMES.map(t=><div key={t.k} onClick={()=>upd('pdf_design',t.k)} style={{borderRadius:12,border:'2px solid '+(co?.pdf_design===t.k?t.c:C.g100),overflow:'hidden',cursor:'pointer'}}><div style={{height:46,background:'linear-gradient(135deg,'+t.c+'22,'+t.c+'55)',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:28,height:28,borderRadius:6,background:t.c,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Syne,sans-serif',fontSize:11,fontWeight:800,color:'#fff'}}>Q</div></div><div style={{padding:'7px 10px'}}><div style={{fontSize:11,fontWeight:700,color:C.navy}}>{t.l}</div></div></div>)}</div>
          <label style={lb}>Installation Rate (Rs./sqft)</label><input type="number" value={co?.installation_sqft||''} onChange={e=>upd('installation_sqft',e.target.value)} placeholder="0" style={si}/>
          <label style={lb}>Quote Terms</label><textarea value={co?.terms_quotation||''} onChange={e=>upd('terms_quotation',e.target.value)} placeholder="1. Prices valid 15 days" style={{...si,resize:'vertical',minHeight:80}}/>
          <label style={lb}>Invoice Terms</label><textarea value={co?.terms_billing||''} onChange={e=>upd('terms_billing',e.target.value)} placeholder="1. Payment due 30 days" style={{...si,resize:'vertical',minHeight:80}}/>
          <div style={{textAlign:'right',paddingTop:14,borderTop:'1px solid '+C.g100}}>
            <a href="/pdf-demo" style={{display:'inline-flex',alignItems:'center',gap:6,padding:'9px 14px',borderRadius:9,border:'1px solid '+C.g100,background:C.white,color:C.navy,textDecoration:'none',fontSize:12,fontWeight:600,marginRight:10}}>Preview PDF</a>
            <button style={sb} onClick={()=>save({pdf_design:co.pdf_design,installation_sqft:co.installation_sqft,terms_quotation:co.terms_quotation,terms_billing:co.terms_billing})} disabled={saving}>{saving?'\u23f3 Saving...':'\u2713 Save PDF'}</button>
          </div>
        </div>}
        {tab==='wa'&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{background:waToken?'linear-gradient(135deg,#064e3b,#065f46)':C.navy,borderRadius:16,padding:18,display:'flex',alignItems:'center',gap:14}}><span style={{fontSize:26}}>&#128172;</span><div style={{flex:1}}><div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,color:'#fff'}}>{waToken?'WhatsApp API Connected':'WhatsApp Not Configured'}</div><div style={{fontSize:12,color:'rgba(255,255,255,0.5)',marginTop:2}}>{waToken?'Sending via Meta Cloud API':'Using wa.me links (one manual tap)'}</div></div><span style={{fontSize:22}}>{waToken?'\u2705':'\u26a0\ufe0f'}</span></div>
          <div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,padding:22}}><div style={{fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,marginBottom:4}}>API Configuration</div><div style={{fontSize:12,color:C.g400,marginBottom:18}}>From developers.facebook.com then WhatsApp then API Setup</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 18px'}}><div><label style={lb}>WhatsApp Access Token</label><input type="password" value={waToken} onChange={e=>setWaToken(e.target.value)} placeholder="EAAxxxxx..." style={si}/></div><div><label style={lb}>Phone Number ID</label><input value={waPhone} onChange={e=>setWaPhone(e.target.value)} placeholder="1234567890123" style={si}/></div></div><div style={{display:'flex',gap:10}}><button onClick={async()=>{if(!waToken||!waPhone)return showToast('Enter token and phone ID','error');try{const r=await fetch('https://graph.facebook.com/v19.0/'+waPhone,{headers:{'Authorization':'Bearer '+waToken}});const d=await r.json();if(d.id)showToast('Connected \u2713 \u2014 '+(d.display_phone_number||d.id));else showToast(d.error?.message||'Failed','error')}catch(e){showToast('Failed: '+e.message,'error')}}} style={{...sb,background:'#075E54'}}>&#128172; Test Connection</button></div></div>
          <div style={{background:'rgba(37,211,102,0.04)',border:'1px solid rgba(37,211,102,0.2)',borderRadius:14,padding:16}}><div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,color:'#065f46',marginBottom:6}}>Without API Token</div><div style={{fontSize:12,color:'#065f46',lineHeight:1.7}}>All buttons open wa.me links with pre-filled text. Works perfectly for most businesses.</div></div>
        </div>}
        {tab==='users'&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,overflow:'hidden'}}>
            <div style={{padding:'14px 18px',borderBottom:'1px solid '+C.g100}}><div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700}}>Team Members</div><div style={{fontSize:12,color:C.g400,marginTop:2}}>{users.filter(u=>u.is_active!==false).length} active</div></div>
            {users.map((u,i)=><div key={u.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 18px',borderBottom:i<users.length-1?'1px solid '+C.g50:'none',opacity:u.is_active===false?0.5:1}}>
              <div style={{width:34,height:34,borderRadius:'50%',background:'linear-gradient(135deg,'+C.blue+','+C.teal+')',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,color:'#fff',flexShrink:0}}>{(u.name||u.email||'?')[0].toUpperCase()}</div>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:C.navy}}>{u.name||'Unnamed'}</div><div style={{fontSize:11,color:C.g400}}>{u.email||u.phone}</div></div>
              <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:100,background:(RC[u.role]||C.g400)+'20',color:RC[u.role]||C.g400,textTransform:'capitalize'}}>{u.role}</span>
              {u.id===usr?.id?<span style={{fontSize:11,color:C.g400}}>You</span>:<div style={{display:'flex',gap:6}}>
                <select value={u.role} onChange={async e=>{await supabase.from('users').update({role:e.target.value}).eq('id',u.id);setUsers(prev=>prev.map(x=>x.id===u.id?{...x,role:e.target.value}:x));showToast('Role updated \u2713')}} style={{padding:'4px 8px',borderRadius:6,border:'1px solid '+C.g200,fontSize:11,color:C.navy,cursor:'pointer',outline:'none'}}>{ROLES.map(r=><option key={r} value={r}>{r}</option>)}</select>
                <button onClick={async()=>{if(!confirm('Deactivate?'))return;await supabase.from('users').update({is_active:false}).eq('id',u.id);setUsers(prev=>prev.map(x=>x.id===u.id?{...x,is_active:false}:x));showToast('Deactivated')}} style={{padding:'4px 8px',borderRadius:6,border:'1px solid rgba(239,68,68,0.2)',background:'rgba(239,68,68,0.06)',color:C.red,fontSize:11,cursor:'pointer'}}>Remove</button>
              </div>}
            </div>)}
          </div>
        </div>}
        {tab==='plan'&&<div style={{display:'flex',flexDirection:'column',gap:12}}>
          {co?.plan==='trial'&&<div style={{background:'linear-gradient(135deg,#0B1F3A,#1a3557)',borderRadius:16,padding:18,display:'flex',alignItems:'center',gap:14}}><span style={{fontSize:26}}>&#9889;</span><div style={{flex:1}}><div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,color:'#fff'}}>Trial \u2014 {trialDays} days remaining</div><div style={{fontSize:12,color:'rgba(255,255,255,0.5)',marginTop:2}}>Upgrade before trial ends.</div></div><div style={{fontFamily:'JetBrains Mono,monospace',fontSize:20,fontWeight:500,color:C.amber}}>{trialDays}d</div></div>}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:12}}>{PLANS.map(plan=>{const cur=co?.plan===plan.k;return(<div key={plan.k} style={{background:C.white,borderRadius:14,border:'2px solid '+(cur?plan.c:C.g100),padding:16,position:'relative'}}>{cur&&<div style={{position:'absolute',top:8,right:8,fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:100,background:plan.c+'20',color:plan.c}}>Current</div>}<div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:800,color:C.navy,marginBottom:2}}>{plan.l}</div><div style={{fontFamily:'JetBrains Mono,monospace',fontSize:18,fontWeight:500,color:plan.c,marginBottom:1}}>{plan.p}</div><div style={{fontSize:10,color:C.g400,marginBottom:10}}>{plan.d}</div>{plan.f.map(f=><div key={f} style={{display:'flex',gap:5,fontSize:11,color:C.g600,marginBottom:3}}><span style={{color:plan.c}}>\u2713</span>{f}</div>)}{!cur&&<button onClick={()=>showToast('Redirecting to Razorpay...')} style={{...sb,width:'100%',background:plan.c,marginTop:8,padding:'8px',fontSize:12}}>Upgrade</button>}</div>)})}</div>
          <div style={{background:C.g50,border:'1px solid '+C.g100,borderRadius:12,padding:16,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}><span style={{fontSize:26}}>&#127962;</span><div style={{flex:1}}><div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,marginBottom:2}}>Enterprise</div><div style={{fontSize:12,color:C.g600}}>Unlimited users, custom integrations, SLA, dedicated support.</div></div><button onClick={()=>window.open('https://wa.me/919876543210?text=Hi, I want Enterprise plan for QLekha','_blank')} style={{...sb,background:'#075E54',whiteSpace:'nowrap',fontSize:12}}>&#128172; Contact Sales</button></div>
        </div>}
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
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <h2 style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:700,color:C.navy}}>Quotes</h2>
        <a href="/quotes/create" style={{background:C.blue,color:'#fff',textDecoration:'none',padding:'9px 18px',borderRadius:8,fontSize:13,fontWeight:600}}>+ New Quote</a>
      </div>
      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>{['all','draft','sent','approved','rejected'].map(s=><button key={s} onClick={()=>setFilter(s)} style={{padding:'6px 14px',borderRadius:100,fontSize:12,fontWeight:600,cursor:'pointer',border:'1px solid',borderColor:filter===s?C.navy:C.g100,background:filter===s?C.navy:C.white,color:filter===s?'#fff':'#4A5568'}}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>)}</div>
      <div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,overflow:'hidden'}}>
        {loading?<div style={{padding:40,textAlign:'center',color:C.g400}}>Loading...</div>:filtered.length===0?<div style={{padding:60,textAlign:'center'}}><div style={{fontSize:40,marginBottom:12}}>&#128203;</div><p style={{color:C.g400,marginBottom:20}}>No quotes yet</p><a href="/quotes/create" style={{background:C.blue,color:'#fff',textDecoration:'none',padding:'10px 20px',borderRadius:8,fontSize:13,fontWeight:600}}>Create Quote</a></div>:
        <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:C.g50}}>{['Quote #','Client','Amount','Status','Date','Actions'].map(h=><th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:C.g400,borderBottom:'1px solid '+C.g100}}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map(q=>{const sc=SC[q.status]||SC.draft;const phone=q.clients?.phone||q.client_phone;return(
            <tr key={q.id} style={{borderBottom:'1px solid '+C.g50}}>
              <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:11,color:C.g400}}>#{q.quote_number}</td>
              <td style={{padding:'12px 14px'}}><div style={{fontWeight:600,fontSize:13,color:C.navy}}>{q.client_name}</div><div style={{fontSize:11,color:C.g400}}>{phone}</div></td>
              <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontWeight:500,color:C.navy}}>\u20b9{(q.grand_total||0).toLocaleString('en-IN')}</td>
              <td style={{padding:'12px 14px'}}><span style={{...sc,padding:'3px 9px',borderRadius:100,fontSize:10,fontWeight:700}}>{q.status}</span></td>
              <td style={{padding:'12px 14px',fontSize:12,color:C.g400}}>{new Date(q.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</td>
              <td style={{padding:'12px 14px'}}>
                <div style={{display:'flex',gap:5,alignItems:'center',flexWrap:'wrap'}}>
                  <QuotePDFBar quote={q} company={profile?.companies||{}} client={{name:q.client_name,phone,address:q.client_address}} items={[]} bank={profile?.companies||{}}/>
                  <WhatsAppSendBtn phone={phone} type="quote" label="WA" data={{clientName:q.client_name,quoteNumber:q.quote_number,total:q.grand_total,items:[],companyName:profile?.companies?.name||'QLekha',companyId:profile?.company_id,fallbackText:'Hi '+q.client_name+', your quote #'+q.quote_number+' for \u20b9'+(q.grand_total||0).toLocaleString('en-IN')+' is ready. Reply YES to approve.'}}/>
                  <button onClick={()=>setWaModal(q)} style={{padding:'4px 8px',borderRadius:6,border:'1px solid rgba(37,211,102,0.3)',background:'rgba(37,211,102,0.06)',fontSize:11,cursor:'pointer',color:'#25D366'}}>&#183;&#183;&#183;</button>
                </div>
              </td>
            </tr>
          )})}</tbody>
        </table></div>}
      </div>
      {waModal&&<WhatsAppModal isOpen={!!waModal} onClose={()=>setWaModal(null)} contact={{name:waModal.client_name,phone:waModal.clients?.phone||waModal.client_phone}} companyId={profile?.company_id} companyName={profile?.companies?.name||'QLekha'}/>}
    </Layout>
  )
}

function Analytics(){const[loading,setLoading]=useState(true);const[quotes,setQuotes]=useState([]);const[invoices,setInvoices]=useState([]);const[payments,setPayments]=useState([]);const[clients,setClients]=useState([]);const now=new Date();useEffect(()=>{async function load(){setLoading(true);const{data:{user}}=await supabase.auth.getUser();if(!user)return setLoading(false);const{data:ud}=await supabase.from('users').select('company_id').eq('id',user.id).single();if(!ud)return setLoading(false);const cid=ud.company_id;const[qr,ir,pr,cr]=await Promise.all([supabase.from('quotes').select('id,status,grand_total,created_at').eq('company_id',cid),supabase.from('invoices').select('id,status,grand_total,paid_amount,balance_due,created_at').eq('company_id',cid),supabase.from('payments').select('amount,payment_date').eq('company_id',cid),supabase.from('clients').select('id,name,total_quotes,total_billed,total_paid,tag').eq('company_id',cid)]);setQuotes(qr.data||[]);setInvoices(ir.data||[]);setPayments(pr.data||[]);setClients(cr.data||[]);setLoading(false)}load()},[]);const totalCollected=payments.reduce((s,p)=>s+(p.amount||0),0);const totalOut=invoices.filter(i=>['pending','partial','overdue'].includes(i.status)).reduce((s,i)=>s+(i.balance_due||0),0);const sent=quotes.filter(q=>['sent','approved','rejected'].includes(q.status));const won=quotes.filter(q=>q.status==='approved');const winRate=sent.length>0?Math.round((won.length/sent.length)*100):0;const thisM=(d)=>{const dt=new Date(d);return dt.getMonth()===now.getMonth()&&dt.getFullYear()===now.getFullYear()};const thisMonthRev=invoices.filter(i=>thisM(i.created_at)&&i.status!=='cancelled').reduce((s,i)=>s+(i.grand_total||0),0);const monthly=Array.from({length:6},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-(5-i),1);const value=invoices.filter(inv=>{const id=new Date(inv.created_at);return id.getMonth()===d.getMonth()&&id.getFullYear()===d.getFullYear()&&inv.status!=='cancelled'}).reduce((s,inv)=>s+(inv.grand_total||0),0);return{label:MONTHS[d.getMonth()],value}});const topClients=[...clients].sort((a,b)=>(b.total_billed||0)-(a.total_billed||0)).slice(0,5);const maxBar=Math.max(...monthly.map(m=>m.value),1);const funnel=[{l:'Created',n:quotes.length,c:'#6366F1'},{l:'Sent',n:quotes.filter(q=>['sent','approved','rejected'].includes(q.status)).length,c:C.blue},{l:'Won',n:won.length,c:C.teal},{l:'Invoiced',n:invoices.length,c:C.amber},{l:'Paid',n:invoices.filter(i=>i.status==='paid').length,c:C.green}];const kpis=[{i:'\ud83d\udcb0',v:fmt(thisMonthRev),l:'Revenue this month',c:C.blue},{i:'\u2705',v:fmt(totalCollected),l:'Total collected',c:C.green},{i:'\ud83c\udfaf',v:winRate+'%',l:'Win rate',c:C.teal},{i:'\u23f3',v:fmt(totalOut),l:'Outstanding',c:C.amber}];if(loading)return<Layout><div style={{padding:60,textAlign:'center',color:C.g400}}>&#128200; Loading...</div></Layout>;return<Layout><div style={{marginBottom:20}}><h2 style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,color:C.navy,marginBottom:4}}>Analytics</h2><p style={{fontSize:13,color:C.g400}}>Business performance at a glance.</p></div>{quotes.length===0&&invoices.length===0&&<div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,padding:'60px 20px',textAlign:'center',marginBottom:20}}><div style={{fontSize:48,marginBottom:12}}>&#128202;</div><p style={{color:C.g400,fontSize:14,marginBottom:20}}>Create quotes and invoices to see analytics.</p><a href="/quotes/create" style={{background:C.blue,color:C.white,textDecoration:'none',padding:'10px 20px',borderRadius:10,fontSize:13,fontWeight:700}}>Create First Quote</a></div>}<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:16,marginBottom:20}}>{kpis.map(k=><div key={k.l} style={{background:C.white,borderRadius:16,padding:20,border:'1px solid '+C.g100,borderTop:'3px solid '+k.c}}><div style={{width:36,height:36,borderRadius:9,background:k.c+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,marginBottom:10}}>{k.i}</div><div style={{fontFamily:'JetBrains Mono,monospace',fontSize:24,fontWeight:500,color:C.navy,marginBottom:2}}>{k.v}</div><div style={{fontSize:12,color:C.g400}}>{k.l}</div></div>)}</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}><div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,overflow:'hidden'}}><div style={{padding:'14px 18px',borderBottom:'1px solid '+C.g100}}><div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700}}>Monthly Revenue</div></div><div style={{padding:18}}>{monthly.every(m=>m.value===0)?<div style={{padding:30,textAlign:'center',color:C.g400,fontSize:13}}>No invoices yet</div>:<svg width="100%" height={160} viewBox={'0 0 '+monthly.length*80+' 180'} style={{minWidth:300}}>{monthly.map((m,i)=>{const bH=(m.value/maxBar)*140;const x=i*80+10;return(<g key={i}><rect x={x} y={150-bH} width={50} height={bH} rx={5} fill={C.blue} opacity={0.85}/>{m.value>0&&<text x={x+25} y={150-bH-5} textAnchor="middle" fontSize={9} fontFamily="JetBrains Mono,monospace" fill={C.blue}>{m.value>=1000?(m.value/1000).toFixed(0)+'K':m.value}</text>}<text x={x+25} y={168} textAnchor="middle" fontSize={11} fontFamily="Inter,sans-serif" fill={C.g400}>{m.label}</text></g>)})}</svg>}</div></div><div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,overflow:'hidden'}}><div style={{padding:'14px 18px',borderBottom:'1px solid '+C.g100}}><div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700}}>Conversion Funnel</div></div><div style={{padding:18}}>{quotes.length===0?<div style={{padding:30,textAlign:'center',color:C.g400,fontSize:13}}>No quotes yet</div>:funnel.map(f=><div key={f.l} style={{marginBottom:12}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}><span style={{fontSize:13,fontWeight:600,color:C.navy}}>{f.l}</span><span style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:600,color:f.c}}>{f.n}</span></div><div style={{height:8,background:C.g100,borderRadius:100,overflow:'hidden'}}><div style={{height:'100%',width:(quotes.length>0?(f.n/quotes.length)*100:0)+'%',background:f.c,borderRadius:100}}/></div></div>)}</div></div></div><div style={{background:C.white,borderRadius:16,border:'1px solid '+C.g100,overflow:'hidden'}}><div style={{padding:'14px 18px',borderBottom:'1px solid '+C.g100,display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700}}>Top Clients</div><a href="/crm" style={{fontSize:12,color:C.blue,textDecoration:'none',fontWeight:600}}>View all</a></div><div style={{padding:18}}>{topClients.length===0?<div style={{padding:30,textAlign:'center',color:C.g400,fontSize:13}}>No clients yet</div>:topClients.map((c,i)=><div key={c.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:i<topClients.length-1?'1px solid '+C.g100:'none'}}><div style={{width:32,height:32,borderRadius:'50%',background:C.blue,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,color:'#fff',flexShrink:0}}>{c.name[0]}</div><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:C.navy}}>{c.name}</div><div style={{fontSize:11,color:C.g400}}>{c.tag} \u00b7 {c.total_quotes||0} quotes</div></div><div style={{textAlign:'right'}}><div style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:500,color:C.navy}}>{fmt(c.total_billed||0)}</div><div style={{fontSize:11,color:(c.total_billed-c.total_paid)>0?C.amber:C.green}}>{(c.total_billed-c.total_paid)>0?fmt(c.total_billed-c.total_paid)+' due':'Paid \u2713'}</div></div></div>)}</div></div></Layout>}

export default function App() {
  const [session, setSession] = useState(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])
  if (session === undefined) return <Splash/>
  return (
    <Routes>
      <Route path="/" element={<Landing/>}/>
      <Route path="/auth" element={session ? <Navigate to="/dashboard" replace/> : <Auth/>}/>
      <Route path="/dashboard" element={session ? <Layout><Dashboard/></Layout> : <Navigate to="/auth" replace/>}/>
      <Route path="/quotes" element={session ? <Quotes/> : <Navigate to="/auth" replace/>}/>
      <Route path="/quotes/create" element={session ? <PlaceholderPage title="Create Quote" icon="&#128203;" sub="Full 4-step wizard — coming next."/> : <Navigate to="/auth" replace/>}/>
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

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ── Colour tokens ──
const C = {
  navy:'#0B1F3A', navyLt:'#122847',
  blue:'#1A6FE8', blueLt:'#3B8EFF', bluePale:'rgba(26,111,232,0.08)',
  teal:'#0EA5A0', tealPale:'rgba(14,165,160,0.1)',
  amber:'#FFB400', amberPale:'rgba(255,180,0,0.1)',
  green:'#22C55E', greenPale:'rgba(34,197,94,0.1)',
  purple:'#8B5CF6', purplePale:'rgba(139,92,246,0.1)',
  red:'#EF4444', redPale:'rgba(239,68,68,0.08)',
  bg:'#F0F4F8', white:'#fff',
  g100:'#E8EDF3', g200:'#D1D9E6', g400:'#8A9BB5', g600:'#4A5568',
}

const fmt = (n) => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : n >= 1000 ? `₹${(n/1000).toFixed(0)}K` : `₹${n}`
const fmtFull = (n) => `₹${(n||0).toLocaleString('en-IN')}`
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ── Tiny SVG line chart ──
function SparkLine({ data, color = C.blue, height = 40 }) {
  if (!data?.length) return null
  const w = 120, h = height
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x},${y}`
  }).join(' ')
  const area = `M0,${h} ` + data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `L${x},${y}`
  }).join(' ') + ` L${w},${h} Z`
  return (
    <svg width={w} height={h} style={{ overflow:'visible' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace('#','')})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ── Full bar chart (SVG) ──
function BarChart({ data, color = C.blue, label = 'Amount' }) {
  if (!data?.length) return <div style={{padding:40,textAlign:'center',color:C.g400,fontSize:13}}>No data yet</div>
  const max = Math.max(...data.map(d => d.value), 1)
  const W = 100, BAR_W = 60, GAP = 16, H = 160
  const total = data.length * (BAR_W + GAP)
  return (
    <div style={{ overflowX:'auto' }}>
      <svg width={Math.max(total, 400)} height={H + 36} style={{ display:'block', minWidth:'100%' }}>
        {data.map((d, i) => {
          const x = i * (BAR_W + GAP) + GAP / 2
          const barH = (d.value / max) * H
          const y = H - barH
          return (
            <g key={i}>
              <rect x={x} y={y} width={BAR_W} height={barH} rx={6} fill={color} opacity={0.85}/>
              <rect x={x} y={y} width={BAR_W} height={Math.min(barH, 6)} rx={6} fill={color}/>
              <text x={x + BAR_W / 2} y={y - 6} textAnchor="middle" fontSize={10} fontFamily="JetBrains Mono,monospace" fill={C.navy} fontWeight={500}>
                {d.value >= 1000 ? `${(d.value/1000).toFixed(0)}K` : d.value}
              </text>
              <text x={x + BAR_W / 2} y={H + 16} textAnchor="middle" fontSize={11} fontFamily="Inter,sans-serif" fill={C.g400}>
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Donut chart (SVG) ──
function DonutChart({ segments, size = 140 }) {
  if (!segments?.length) return null
  const total = segments.reduce((s, d) => s + d.value, 0) || 1
  const cx = size / 2, cy = size / 2, r = size * 0.38, ir = size * 0.24
  let angle = -Math.PI / 2
  function arc(cx, cy, r, start, end) {
    const s = { x: cx + r * Math.cos(start), y: cy + r * Math.sin(start) }
    const e = { x: cx + r * Math.cos(end), y: cy + r * Math.sin(end) }
    const large = end - start > Math.PI ? 1 : 0
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`
  }
  return (
    <svg width={size} height={size}>
      {segments.map((seg, i) => {
        const sweep = (seg.value / total) * 2 * Math.PI
        const start = angle
        const end = angle + sweep - 0.03
        angle += sweep
        const outerPath = arc(cx, cy, r, start, end)
        const innerPath = arc(cx, cy, ir, end, start)
        return (
          <path key={i}
            d={`${outerPath} L ${cx + ir * Math.cos(end)} ${cy + ir * Math.sin(end)} ${innerPath} Z`}
            fill={seg.color} stroke={C.white} strokeWidth={2}/>
        )
      })}
      <circle cx={cx} cy={cy} r={ir} fill={C.white}/>
    </svg>
  )
}

// ── Funnel bar ──
function FunnelBar({ label, count, total, value, color }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
        <span style={{ fontSize:13, fontWeight:600, color:C.navy }}>{label}</span>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12, color:C.g400 }}>{fmtFull(value)}</span>
          <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:13, fontWeight:600, color, minWidth:28, textAlign:'right' }}>{count}</span>
        </div>
      </div>
      <div style={{ height:8, background:C.g100, borderRadius:100, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:100, transition:'width 0.8s ease' }}/>
      </div>
    </div>
  )
}

// ── KPI card ──
function KPI({ icon, value, label, sub, color, trend, spark }) {
  return (
    <div style={{ background:C.white, borderRadius:16, padding:20, border:`1px solid ${C.g100}`, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:color, borderRadius:'16px 16px 0 0' }}/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
        <div style={{ width:38, height:38, borderRadius:10, background:color+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{icon}</div>
        {trend !== undefined && (
          <span style={{ fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:100, background: trend >= 0 ? C.greenPale : C.redPale, color: trend >= 0 ? C.green : C.red }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:26, fontWeight:500, color:C.navy, marginBottom:2 }}>{value}</div>
      <div style={{ fontSize:12, color:C.g400, marginBottom: spark ? 10 : 0 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:C.g600, marginTop:2 }}>{sub}</div>}
      {spark && <SparkLine data={spark} color={color}/>}
    </div>
  )
}

// ── Period selector ──
function PeriodTab({ value, current, onClick }) {
  return (
    <button onClick={() => onClick(value)} style={{
      padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
      background: current === value ? C.navy : 'transparent',
      color: current === value ? C.white : C.g400,
      transition:'all 0.15s',
    }}>{value}</button>
  )
}

// ── Section wrapper ──
function Section({ title, sub, children, action }) {
  return (
    <div style={{ background:C.white, borderRadius:16, border:`1px solid ${C.g100}`, overflow:'hidden', marginBottom:20 }}>
      <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.g100}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, color:C.navy }}>{title}</div>
          {sub && <div style={{ fontSize:12, color:C.g400, marginTop:2 }}>{sub}</div>}
        </div>
        {action}
      </div>
      <div style={{ padding:20 }}>{children}</div>
    </div>
  )
}

// ── Empty state ──
function Empty({ icon, msg }) {
  return (
    <div style={{ padding:'40px 20px', textAlign:'center' }}>
      <div style={{ fontSize:36, marginBottom:10 }}>{icon}</div>
      <div style={{ fontSize:13, color:C.g400 }}>{msg}</div>
    </div>
  )
}

// ── MAIN ──
export default function Analytics() {
  const [period, setPeriod] = useState('This year')
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState(null)

  // Data
  const [quotes, setQuotes] = useState([])
  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [clients, setClients] = useState([])
  const [leads, setLeads] = useState([])

  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return setLoading(false)
    const { data: ud } = await supabase.from('users').select('company_id').eq('id', user.id).single()
    if (!ud) return setLoading(false)
    const cid = ud.company_id
    setCompanyId(cid)

    const [qr, ir, pr, cr, lr] = await Promise.all([
      supabase.from('quotes').select('id,status,grand_total,created_at,material_type,client_name').eq('company_id', cid),
      supabase.from('invoices').select('id,status,grand_total,paid_amount,balance_due,created_at,client_name,due_date').eq('company_id', cid),
      supabase.from('payments').select('amount,payment_date,payment_mode').eq('company_id', cid),
      supabase.from('clients').select('id,name,total_quotes,total_billed,total_paid,tag').eq('company_id', cid),
      supabase.from('leads').select('id,status,value_estimate,source,created_at').eq('company_id', cid),
    ])

    setQuotes(qr.data || [])
    setInvoices(ir.data || [])
    setPayments(pr.data || [])
    setClients(cr.data || [])
    setLeads(lr.data || [])
    setLoading(false)
  }

  // ── Derived metrics ──
  const now = new Date()
  const thisMonth = (d) => new Date(d).getMonth() === now.getMonth() && new Date(d).getFullYear() === now.getFullYear()
  const lastMonth = (d) => {
    const dt = new Date(d)
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return dt.getMonth() === lm.getMonth() && dt.getFullYear() === lm.getFullYear()
  }

  const totalRevenue = invoices.filter(i => i.status !== 'cancelled').reduce((s, i) => s + (i.grand_total || 0), 0)
  const totalCollected = payments.reduce((s, p) => s + (p.amount || 0), 0)
  const totalOutstanding = invoices.filter(i => ['pending','partial','overdue'].includes(i.status)).reduce((s, i) => s + (i.balance_due || 0), 0)

  const thisMonthRevenue = invoices.filter(i => thisMonth(i.created_at) && i.status !== 'cancelled').reduce((s, i) => s + (i.grand_total || 0), 0)
  const lastMonthRevenue = invoices.filter(i => lastMonth(i.created_at) && i.status !== 'cancelled').reduce((s, i) => s + (i.grand_total || 0), 0)
  const revGrowth = lastMonthRevenue > 0 ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : 0

  const sentQuotes = quotes.filter(q => ['sent','approved','rejected'].includes(q.status))
  const wonQuotes = quotes.filter(q => q.status === 'approved')
  const winRate = sentQuotes.length > 0 ? Math.round((wonQuotes.length / sentQuotes.length) * 100) : 0

  const avgQuoteValue = wonQuotes.length > 0 ? Math.round(wonQuotes.reduce((s, q) => s + (q.grand_total || 0), 0) / wonQuotes.length) : 0

  // Monthly revenue (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const billed = invoices.filter(inv => {
      const id = new Date(inv.created_at)
      return id.getMonth() === d.getMonth() && id.getFullYear() === d.getFullYear() && inv.status !== 'cancelled'
    }).reduce((s, inv) => s + (inv.grand_total || 0), 0)
    const collected = payments.filter(p => {
      const pd = new Date(p.payment_date)
      return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear()
    }).reduce((s, p) => s + (p.amount || 0), 0)
    return { label: MONTHS[d.getMonth()], billed, collected }
  })

  const sparkRevenue = monthlyData.map(d => d.billed)
  const sparkCollected = monthlyData.map(d => d.collected)

  // Quote funnel
  const funnelTotal = Math.max(quotes.length, 1)
  const funnelStages = [
    { label:'Created', count: quotes.length, value: quotes.reduce((s,q) => s+(q.grand_total||0),0), color:'#6366F1' },
    { label:'Sent', count: quotes.filter(q=>['sent','approved','rejected'].includes(q.status)).length, value: quotes.filter(q=>['sent','approved','rejected'].includes(q.status)).reduce((s,q)=>s+(q.grand_total||0),0), color:C.blue },
    { label:'Approved', count: wonQuotes.length, value: wonQuotes.reduce((s,q)=>s+(q.grand_total||0),0), color:C.teal },
    { label:'Invoiced', count: invoices.length, value: totalRevenue, color:C.amber },
    { label:'Collected', count: payments.length, value: totalCollected, color:C.green },
  ]

  // Material breakdown
  const materialMap = quotes.reduce((acc, q) => {
    acc[q.material_type] = (acc[q.material_type] || 0) + 1
    return acc
  }, {})
  const materialSegments = [
    { label:'Aluminium', value: materialMap.aluminium || 0, color:C.blue },
    { label:'UPVC', value: materialMap.upvc || 0, color:C.teal },
    { label:'Glass', value: materialMap.glass || 0, color:C.amber },
    { label:'Mixed', value: materialMap.mixed || 0, color:C.purple },
  ].filter(s => s.value > 0)

  // Top clients
  const topClients = [...clients]
    .sort((a, b) => (b.total_billed || 0) - (a.total_billed || 0))
    .slice(0, 6)

  // Payment mode breakdown
  const payModeMap = payments.reduce((acc, p) => {
    acc[p.payment_mode] = (acc[p.payment_mode] || 0) + p.amount
    return acc
  }, {})
  const payModes = Object.entries(payModeMap).sort((a, b) => b[1] - a[1])

  // Lead source breakdown
  const sourceMap = leads.reduce((acc, l) => {
    const s = l.source || 'Other'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  // Overdue invoices
  const overdue = invoices.filter(i => i.status === 'overdue' || (i.due_date && new Date(i.due_date) < now && i.balance_due > 0))

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', flexDirection:'column', gap:12 }}>
        <div style={{ fontSize:32 }}>📈</div>
        <div style={{ fontSize:13, color:C.g400 }}>Loading your analytics...</div>
      </div>
    )
  }

  const hasData = quotes.length > 0 || invoices.length > 0

  return (
    <div style={{ fontFamily:'Inter,sans-serif' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:C.navy, marginBottom:4 }}>Analytics</h2>
          <p style={{ fontSize:13, color:C.g400 }}>Your business performance at a glance.</p>
        </div>
        <div style={{ display:'flex', gap:0, background:C.white, border:`1px solid ${C.g100}`, borderRadius:10, padding:3 }}>
          {['This month','This year','All time'].map(p => <PeriodTab key={p} value={p} current={period} onClick={setPeriod}/>)}
        </div>
      </div>

      {/* Empty state */}
      {!hasData && (
        <div style={{ background:C.white, borderRadius:16, border:`1px solid ${C.g100}`, padding:'60px 20px', textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:48, marginBottom:16 }}>📊</div>
          <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700, marginBottom:8 }}>No data yet</h3>
          <p style={{ color:C.g400, fontSize:14, maxWidth:360, margin:'0 auto 24px', lineHeight:1.6 }}>
            Analytics populate as you create quotes and invoices. Create your first quote to get started.
          </p>
          <a href="/quotes/create" style={{ display:'inline-flex', alignItems:'center', gap:6, background:C.blue, color:C.white, textDecoration:'none', padding:'10px 20px', borderRadius:10, fontSize:13, fontWeight:700, fontFamily:'Syne,sans-serif' }}>
            📋 Create First Quote
          </a>
        </div>
      )}

      {/* KPI row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, marginBottom:20 }}>
        <KPI icon="💰" value={fmt(thisMonthRevenue)} label="Revenue this month" sub={`Total billed: ${fmt(totalRevenue)}`} color={C.blue} trend={revGrowth} spark={sparkRevenue}/>
        <KPI icon="✅" value={fmt(totalCollected)} label="Total collected" sub={`Outstanding: ${fmt(totalOutstanding)}`} color={C.green} spark={sparkCollected}/>
        <KPI icon="🎯" value={`${winRate}%`} label="Quote win rate" sub={`${wonQuotes.length} of ${sentQuotes.length} sent`} color={C.teal}/>
        <KPI icon="📋" value={avgQuoteValue > 0 ? fmt(avgQuoteValue) : '—'} label="Avg. quote value" sub={`${quotes.length} total quotes`} color={C.amber}/>
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div style={{ background:'linear-gradient(135deg,#7f1d1d,#991b1b)', borderRadius:16, padding:'14px 20px', display:'flex', alignItems:'center', gap:14, marginBottom:20, flexWrap:'wrap' }}>
          <span style={{ fontSize:22 }}>⚠️</span>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, color:C.white }}>{overdue.length} overdue invoice{overdue.length > 1 ? 's' : ''} — ₹{overdue.reduce((s,i)=>s+(i.balance_due||0),0).toLocaleString('en-IN')} outstanding</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)', marginTop:2 }}>{overdue.map(i=>i.client_name).join(', ')}</div>
          </div>
          <a href="/billing" style={{ padding:'7px 14px', borderRadius:8, background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)', color:C.white, textDecoration:'none', fontSize:12, fontWeight:600 }}>View Invoices →</a>
        </div>
      )}

      {/* Charts row */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:20, marginBottom:20 }}>

        {/* Monthly revenue chart */}
        <Section title="Revenue vs Collections" sub="Last 6 months — billed vs received">
          {monthlyData.every(d => d.billed === 0 && d.collected === 0) ? (
            <Empty icon="📊" msg="Revenue data will appear once you create invoices"/>
          ) : (
            <>
              <div style={{ display:'flex', gap:16, marginBottom:16, flexWrap:'wrap' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
                  <div style={{ width:12, height:12, borderRadius:3, background:C.blue }}/> Billed
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
                  <div style={{ width:12, height:12, borderRadius:3, background:C.green }}/> Collected
                </div>
              </div>
              <div style={{ overflowX:'auto' }}>
                <svg width="100%" height={200} viewBox={`0 0 ${monthlyData.length * 80} 200`} style={{ minWidth:360 }}>
                  {monthlyData.map((d, i) => {
                    const maxVal = Math.max(...monthlyData.map(m => Math.max(m.billed, m.collected)), 1)
                    const bH = (d.billed / maxVal) * 160
                    const cH = (d.collected / maxVal) * 160
                    const x = i * 80 + 8
                    return (
                      <g key={i}>
                        {/* Billed bar */}
                        <rect x={x} y={170 - bH} width={28} height={bH} rx={4} fill={C.blue} opacity={0.85}/>
                        {/* Collected bar */}
                        <rect x={x + 32} y={170 - cH} width={28} height={cH} rx={4} fill={C.green} opacity={0.85}/>
                        {/* Month label */}
                        <text x={x + 28} y={190} textAnchor="middle" fontSize={11} fontFamily="Inter,sans-serif" fill={C.g400}>{d.label}</text>
                        {/* Billed value */}
                        {d.billed > 0 && <text x={x + 14} y={170 - bH - 4} textAnchor="middle" fontSize={9} fontFamily="JetBrains Mono,monospace" fill={C.blue}>{d.billed >= 1000 ? `${(d.billed/1000).toFixed(0)}K` : d.billed}</text>}
                      </g>
                    )
                  })}
                </svg>
              </div>
            </>
          )}
        </Section>

        {/* Material breakdown donut */}
        <Section title="By material" sub="Quotes by type">
          {materialSegments.length === 0 ? (
            <Empty icon="🔩" msg="No quotes yet"/>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
              <DonutChart segments={materialSegments} size={150}/>
              <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:8 }}>
                {materialSegments.map(s => (
                  <div key={s.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:10, height:10, borderRadius:3, background:s.color, flexShrink:0 }}/>
                    <span style={{ fontSize:12, flex:1, color:C.g600 }}>{s.label}</span>
                    <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12, fontWeight:500, color:C.navy }}>{s.value}</span>
                    <span style={{ fontSize:11, color:C.g400 }}>({Math.round((s.value/quotes.length)*100)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      </div>

      {/* Quote funnel + top clients */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>

        {/* Conversion funnel */}
        <Section title="Conversion funnel" sub="Quote → Invoice → Payment">
          {quotes.length === 0 ? (
            <Empty icon="🎯" msg="Funnel data appears once you send quotes"/>
          ) : (
            funnelStages.map(s => (
              <FunnelBar key={s.label} {...s} total={funnelTotal}/>
            ))
          )}
          {quotes.length > 0 && (
            <div style={{ marginTop:16, padding:'12px 14px', background:C.bg, borderRadius:10 }}>
              <div style={{ fontSize:11, color:C.g400, marginBottom:4 }}>Win rate</div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ flex:1, height:6, background:C.g100, borderRadius:100, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${winRate}%`, background:C.teal, borderRadius:100 }}/>
                </div>
                <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:14, fontWeight:500, color:C.teal }}>{winRate}%</span>
              </div>
            </div>
          )}
        </Section>

        {/* Top clients */}
        <Section title="Top clients" sub="By total billed"
          action={<a href="/crm" style={{ fontSize:12, color:C.blue, textDecoration:'none', fontWeight:600 }}>View all →</a>}>
          {topClients.length === 0 ? (
            <Empty icon="👥" msg="Clients appear after you create quotes"/>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              {topClients.map((c, i) => (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom: i < topClients.length - 1 ? `1px solid ${C.g100}` : 'none' }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:C.blue, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Syne,sans-serif', fontSize:12, fontWeight:700, color:C.white, flexShrink:0 }}>{c.name[0]}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:C.navy, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</div>
                    <div style={{ fontSize:11, color:C.g400 }}>{c.tag} · {c.total_quotes || 0} quote{c.total_quotes !== 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:13, fontWeight:500, color:C.navy }}>{fmt(c.total_billed || 0)}</div>
                    <div style={{ fontSize:11, color:(c.total_billed - c.total_paid) > 0 ? C.amber : C.green }}>
                      {(c.total_billed - c.total_paid) > 0 ? `${fmt(c.total_billed - c.total_paid)} due` : 'Paid ✓'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Payment methods + lead sources */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>

        {/* Payment mode breakdown */}
        <Section title="Payment methods" sub="How clients pay you">
          {payModes.length === 0 ? (
            <Empty icon="💳" msg="Payment data will appear once you record payments"/>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {payModes.map(([mode, amount]) => {
                const icons = { cash:'💵', bank_transfer:'🏦', upi:'📱', cheque:'📝', card:'💳', other:'🔄' }
                const pct = Math.round((amount / totalCollected) * 100)
                return (
                  <div key={mode}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                      <span style={{ fontSize:13, color:C.navy, display:'flex', alignItems:'center', gap:6 }}>
                        <span>{icons[mode] || '💰'}</span>
                        <span style={{ textTransform:'capitalize' }}>{mode.replace('_',' ')}</span>
                      </span>
                      <div style={{ display:'flex', gap:10 }}>
                        <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12, color:C.g400 }}>{fmt(amount)}</span>
                        <span style={{ fontSize:12, fontWeight:600, color:C.blue, minWidth:30, textAlign:'right' }}>{pct}%</span>
                      </div>
                    </div>
                    <div style={{ height:6, background:C.g100, borderRadius:100, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:C.blue, borderRadius:100 }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        {/* Lead sources */}
        <Section title="Lead sources" sub="Where your enquiries come from">
          {Object.keys(sourceMap).length === 0 ? (
            <Empty icon="🎯" msg="Lead source data will appear once you add leads in CRM"/>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {Object.entries(sourceMap).sort((a,b) => b[1]-a[1]).map(([src, count]) => {
                const icons = { WhatsApp:'💬', Referral:'🤝', IndiaMart:'🏪', 'Walk-in':'🚶', Instagram:'📸', Other:'🔄' }
                const pct = Math.round((count / leads.length) * 100)
                return (
                  <div key={src}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                      <span style={{ fontSize:13, color:C.navy, display:'flex', alignItems:'center', gap:6 }}>
                        <span>{icons[src] || '📍'}</span>{src}
                      </span>
                      <div style={{ display:'flex', gap:10 }}>
                        <span style={{ fontSize:12, color:C.g400 }}>{count} lead{count !== 1 ? 's' : ''}</span>
                        <span style={{ fontSize:12, fontWeight:600, color:C.teal, minWidth:30, textAlign:'right' }}>{pct}%</span>
                      </div>
                    </div>
                    <div style={{ height:6, background:C.g100, borderRadius:100, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:C.teal, borderRadius:100 }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Section>
      </div>

      {/* Monthly quotes bar chart */}
      <Section title="Quotes created per month" sub="Volume of new quotes over time">
        {quotes.length === 0 ? (
          <Empty icon="📋" msg="Quote volume data will appear once you create quotes"/>
        ) : (
          <BarChart
            color={C.blue}
            data={Array.from({ length: 6 }, (_, i) => {
              const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
              return {
                label: MONTHS[d.getMonth()],
                value: quotes.filter(q => {
                  const qd = new Date(q.created_at)
                  return qd.getMonth() === d.getMonth() && qd.getFullYear() === d.getFullYear()
                }).length
              }
            })}
          />
        )}
      </Section>

    </div>
  )
}

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ── Design tokens ──
const C = {
  navy:'#0B1F3A', navyLt:'#122847',
  blue:'#1A6FE8', blueLt:'#3B8EFF', bluePale:'rgba(26,111,232,0.08)',
  teal:'#0EA5A0', tealPale:'rgba(14,165,160,0.1)',
  amber:'#FFB400', amberPale:'rgba(255,180,0,0.1)',
  green:'#22C55E', greenPale:'rgba(34,197,94,0.1)',
  red:'#EF4444', redPale:'rgba(239,68,68,0.08)',
  purple:'#8B5CF6', purplePale:'rgba(139,92,246,0.1)',
  bg:'#F0F4F8', white:'#fff',
  g100:'#E8EDF3', g200:'#D1D9E6', g400:'#8A9BB5', g600:'#4A5568',
}

const fmt = (n) => n >= 100000
  ? '₹' + (n/100000).toFixed(1) + 'L'
  : n >= 1000 ? '₹' + (n/1000).toFixed(0) + 'K'
  : '₹' + Math.round(n)

const fmtNum = (n) => n?.toLocaleString('en-IN') ?? '0'

// ── Sparkline SVG ──
function Sparkline({ data, color, height = 40, width = 120 }) {
  if (!data?.length) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 6) - 3
    return `${x},${y}`
  }).join(' ')
  const area = `M 0,${height} L ${data.map((v,i)=>`${(i/(data.length-1))*width},${height-((v-min)/range)*(height-6)-3}`).join(' L ')} L ${width},${height} Z`
  return (
    <svg width={width} height={height} style={{ overflow:'visible' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace('#','')})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ── Bar chart SVG ──
function BarChart({ data, color = C.blue, height = 160 }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => d.value), 1)
  const barW = Math.floor(100 / data.length) - 2
  return (
    <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ overflow:'visible' }}>
      {data.map((d, i) => {
        const bh = (d.value / max) * (height - 24)
        const x = (i / data.length) * 100 + 1
        const y = height - bh - 20
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} rx="2" fill={color} opacity="0.85"/>
            <text x={x + barW/2} y={height - 4} textAnchor="middle" fontSize="4" fill={C.g400} fontFamily="Inter,sans-serif">{d.label}</text>
            {bh > 16 && <text x={x + barW/2} y={y - 3} textAnchor="middle" fontSize="4" fill={C.navy} fontFamily="JetBrains Mono,monospace">{d.value > 0 ? fmt(d.value) : ''}</text>}
          </g>
        )
      })}
    </svg>
  )
}

// ── Line chart SVG ──
function LineChart({ datasets, height = 180, xLabels }) {
  if (!datasets?.length) return null
  const allVals = datasets.flatMap(d => d.data)
  const max = Math.max(...allVals, 1)
  const W = 100, H = height - 24
  const colors = [C.blue, C.teal, C.amber, C.green]
  return (
    <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ overflow:'visible' }}>
      <defs>
        {datasets.map((d, di) => (
          <linearGradient key={di} id={`lg-${di}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors[di % colors.length]} stopOpacity="0.15"/>
            <stop offset="100%" stopColor={colors[di % colors.length]} stopOpacity="0"/>
          </linearGradient>
        ))}
      </defs>
      {/* Grid lines */}
      {[0,0.25,0.5,0.75,1].map(f => (
        <line key={f} x1="0" y1={H * (1-f)} x2={W} y2={H * (1-f)} stroke={C.g100} strokeWidth="0.5"/>
      ))}
      {/* Areas + lines */}
      {datasets.map((ds, di) => {
        const col = colors[di % colors.length]
        const pts = ds.data.map((v,i) => `${(i/(ds.data.length-1))*W},${H*(1-v/max)}`)
        const area = `M 0,${H} L ${pts.join(' L ')} L ${W},${H} Z`
        const line = `M ${pts.join(' L ')}`
        return (
          <g key={di}>
            <path d={area} fill={`url(#lg-${di})`}/>
            <path d={line} fill="none" stroke={col} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            {ds.data.map((v,i) => (
              <circle key={i} cx={(i/(ds.data.length-1))*W} cy={H*(1-v/max)} r="1.5" fill={col} stroke="#fff" strokeWidth="0.8"/>
            ))}
          </g>
        )
      })}
      {/* X labels */}
      {xLabels?.map((lbl, i) => (
        <text key={i} x={(i/(xLabels.length-1))*W} y={height-4} textAnchor="middle" fontSize="4" fill={C.g400} fontFamily="Inter,sans-serif">{lbl}</text>
      ))}
    </svg>
  )
}

// ── Donut chart SVG ──
function DonutChart({ segments, size = 120 }) {
  const total = segments.reduce((s,g) => s + g.value, 0) || 1
  let offset = 0
  const r = 40, cx = 60, cy = 60, stroke = 14
  const circ = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      {segments.map((seg, i) => {
        const pct = seg.value / total
        const dash = pct * circ
        const gap = circ - dash
        const rotate = offset * 360 - 90
        offset += pct
        return (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={seg.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={0}
            transform={`rotate(${rotate} ${cx} ${cy})`}
            strokeLinecap="round"
            style={{ transition:'stroke-dasharray 0.8s ease' }}
          />
        )
      })}
      <text x={cx} y={cy-4} textAnchor="middle" fontSize="10" fontWeight="700" fontFamily="JetBrains Mono,monospace" fill={C.navy}>
        {Math.round(segments[0]?.value / total * 100) || 0}%
      </text>
      <text x={cx} y={cy+10} textAnchor="middle" fontSize="6" fill={C.g400} fontFamily="Inter,sans-serif">win rate</text>
    </svg>
  )
}

// ── Funnel ──
function Funnel({ stages }) {
  const max = stages[0]?.count || 1
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {stages.map((s, i) => {
        const pct = (s.count / max) * 100
        return (
          <div key={i}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ fontSize:12, fontWeight:600, color:C.navy }}>{s.label}</span>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12, color:C.navy }}>{s.count}</span>
                <span style={{ fontSize:11, color:C.g400 }}>{fmt(s.value)}</span>
              </div>
            </div>
            <div style={{ height:10, background:C.g100, borderRadius:100, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:s.color, borderRadius:100, transition:'width 1s ease' }}/>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Period selector ──
function PeriodBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding:'5px 12px', borderRadius:100, border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
      background: active ? C.navy : 'transparent',
      color: active ? '#fff' : C.g400,
      transition:'all 0.15s',
    }}>{label}</button>
  )
}

// ── KPI Card ──
function KPICard({ icon, label, value, sub, trend, trendUp, color, sparkData }) {
  return (
    <div style={{ background:C.white, border:`1px solid ${C.g100}`, borderRadius:16, padding:'18px 20px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:color, borderRadius:'16px 16px 0 0' }}/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
        <div style={{ width:38, height:38, borderRadius:10, background:color+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:19 }}>{icon}</div>
        {trend && (
          <span style={{ fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:100, background: trendUp ? C.greenPale : C.redPale, color: trendUp ? C.green : C.red }}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:26, fontWeight:500, color:C.navy, marginBottom:3, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:12, color:C.g400, marginBottom: sparkData ? 10 : 0 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:C.g600, marginTop:2 }}>{sub}</div>}
      {sparkData && <Sparkline data={sparkData} color={color} width={120} height={36}/>}
    </div>
  )
}

// ── Seed data for demo (replaces empty Supabase when no data yet) ──
function seedData() {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul']
  return {
    revenue: [280000, 320000, 410000, 380000, 520000, 490000, 614000],
    collected: [240000, 290000, 370000, 340000, 460000, 420000, 540000],
    quotes: [18, 22, 28, 24, 34, 31, 38],
    months,
    topClients: [
      { name:'Sharma Builders', city:'Bengaluru', tag:'builder', billed:345000, paid:345000, quotes:3 },
      { name:'Reddy Constructions', city:'Hyderabad', tag:'builder', billed:407100, paid:203550, quotes:2 },
      { name:'Mehta Residence', city:'Bengaluru', tag:'individual', billed:257240, paid:0, quotes:1 },
      { name:'Green Villa', city:'Mysuru', tag:'builder', billed:103250, paid:51625, quotes:1 },
      { name:'City Heights Corp', city:'Chennai', tag:'corporate', billed:56200, paid:56200, quotes:1 },
    ],
    funnel: [
      { label:'Total Quotes', count:38, value:4200000, color:C.g200 },
      { label:'Sent to Client', count:28, value:3100000, color:C.blue },
      { label:'Approved', count:18, value:2240000, color:C.teal },
      { label:'Invoiced', count:14, value:1820000, color:C.amber },
      { label:'Fully Paid', count:9, value:1240000, color:C.green },
    ],
    materialMix: [
      { label:'Aluminium', value:68, color:C.blue },
      { label:'UPVC', value:22, color:C.teal },
      { label:'Glass', value:10, color:C.purple },
    ],
    donutSegs: [
      { value:18, color:C.teal },
      { value:20, color:C.g100 },
    ],
    outstanding: 82000,
    totalBilled: 614000,
    totalClients: 34,
    winRate: 64,
    avgQuoteVal: 110526,
  }
}

// ── MAIN COMPONENT ──
export default function Analytics() {
  const [period, setPeriod] = useState('this_month')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [liveData, setLiveData] = useState(null)

  useEffect(() => {
    loadAnalytics()
  }, [period])

  async function loadAnalytics() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: ud } = await supabase.from('users').select('company_id').eq('id', user.id).single()
      if (!ud) throw new Error('no profile')
      const cid = ud.company_id

      // Fetch live data
      const [quotesRes, invoicesRes, clientsRes, paymentsRes] = await Promise.all([
        supabase.from('quotes').select('id,status,grand_total,created_at,client_name,material_type').eq('company_id', cid),
        supabase.from('invoices').select('id,status,grand_total,paid_amount,balance_due,created_at').eq('company_id', cid).neq('status','cancelled'),
        supabase.from('clients').select('id,name,city,tag,total_billed,total_paid,total_quotes').eq('company_id', cid),
        supabase.from('payments').select('amount,payment_date').eq('company_id', cid),
      ])

      const quotes = quotesRes.data || []
      const invoices = invoicesRes.data || []
      const clients = clientsRes.data || []
      const payments = paymentsRes.data || []

      if (quotes.length === 0 && invoices.length === 0) {
        // No real data yet — use seed demo data
        setData(seedData())
        setLiveData(null)
      } else {
        // Process real data
        const approved = quotes.filter(q => q.status === 'approved').length
        const sent = quotes.filter(q => ['sent','approved','rejected'].includes(q.status)).length
        const winRate = sent > 0 ? Math.round(approved / sent * 100) : 0
        const totalBilled = invoices.reduce((s, i) => s + (i.grand_total || 0), 0)
        const totalCollected = invoices.reduce((s, i) => s + (i.paid_amount || 0), 0)
        const outstanding = invoices.reduce((s, i) => s + (i.balance_due || 0), 0)

        // Group by month
        const now = new Date()
        const monthlyRev = {}
        const monthlyQuotes = {}
        for (let m = 6; m >= 0; m--) {
          const d = new Date(now.getFullYear(), now.getMonth() - m, 1)
          const key = d.toLocaleString('en-IN', { month:'short' })
          monthlyRev[key] = 0
          monthlyQuotes[key] = 0
        }
        invoices.forEach(inv => {
          const key = new Date(inv.created_at).toLocaleString('en-IN', { month:'short' })
          if (monthlyRev[key] !== undefined) monthlyRev[key] += inv.grand_total || 0
        })
        quotes.forEach(q => {
          const key = new Date(q.created_at).toLocaleString('en-IN', { month:'short' })
          if (monthlyQuotes[key] !== undefined) monthlyQuotes[key] += 1
        })

        // Material mix
        const matCount = {}
        quotes.forEach(q => { matCount[q.material_type] = (matCount[q.material_type] || 0) + 1 })

        setLiveData({
          totalBilled, totalCollected, outstanding, winRate,
          quoteCount: quotes.length, clientCount: clients.length,
          avgQuoteVal: quotes.length ? Math.round(quotes.reduce((s,q) => s+(q.grand_total||0),0)/quotes.length) : 0,
          months: Object.keys(monthlyRev),
          revenue: Object.values(monthlyRev),
          quotesByMonth: Object.values(monthlyQuotes),
          topClients: [...clients].sort((a,b) => (b.total_billed||0)-(a.total_billed||0)).slice(0,5),
          funnel: [
            { label:'Total Quotes', count:quotes.length, value:quotes.reduce((s,q)=>s+(q.grand_total||0),0), color:C.g200 },
            { label:'Sent', count:quotes.filter(q=>['sent','approved','rejected'].includes(q.status)).length, value:0, color:C.blue },
            { label:'Approved', count:approved, value:quotes.filter(q=>q.status==='approved').reduce((s,q)=>s+(q.grand_total||0),0), color:C.teal },
            { label:'Invoiced', count:invoices.length, value:totalBilled, color:C.amber },
            { label:'Fully Paid', count:invoices.filter(i=>i.status==='paid').length, value:totalCollected, color:C.green },
          ],
          materialMix: Object.entries(matCount).map(([k,v]) => ({ label:k, value:Math.round(v/quotes.length*100), color:{aluminium:C.blue,upvc:C.teal,glass:C.purple,mixed:C.amber}[k]||C.g400 })),
          donutSegs: [{ value:approved, color:C.teal }, { value:sent-approved, color:C.g100 }],
        })
        setData(null)
      }
    } catch(e) {
      // fallback to seed
      setData(seedData())
    }
    setLoading(false)
  }

  const d = liveData || data
  if (!d) return null

  const isDemo = !liveData
  const revenue = d.revenue || []
  const months = d.months || []

  return (
    <div style={{ fontFamily:'Inter,sans-serif' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700, marginBottom:2 }}>Analytics</h2>
          <p style={{ fontSize:12, color:C.g400 }}>
            {isDemo ? '📊 Demo data — create quotes to see your real numbers' : `Live data · Updated just now`}
          </p>
        </div>
        <div style={{ display:'flex', gap:0, background:C.white, border:`1px solid ${C.g100}`, borderRadius:100, padding:4 }}>
          {[['this_month','This Month'],['last_3','3 Months'],['this_year','This Year'],['all','All Time']].map(([k,l]) => (
            <PeriodBtn key={k} label={l} active={period===k} onClick={() => setPeriod(k)}/>
          ))}
        </div>
      </div>

      {/* Demo banner */}
      {isDemo && (
        <div style={{ background:`linear-gradient(135deg,${C.navy},${C.navyLt})`, borderRadius:12, padding:'12px 18px', display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <span style={{ fontSize:20 }}>💡</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>You're seeing demo data</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginTop:2 }}>Create your first quote to start seeing real revenue, win rate and client analytics.</div>
          </div>
          <a href="/quotes/create" style={{ padding:'7px 14px', borderRadius:8, background:C.blue, color:'#fff', fontSize:12, fontWeight:700, textDecoration:'none', whiteSpace:'nowrap' }}>Create Quote →</a>
        </div>
      )}

      {/* KPI row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        <KPICard icon="💰" label="Revenue Billed" value={fmt(d.totalBilled || liveData?.totalBilled || 614000)} trend="18%" trendUp color={C.blue} sparkData={revenue}/>
        <KPICard icon="✅" label="Collected" value={fmt(d.collected?.[d.collected.length-1] || liveData?.totalCollected || 540000)} trend="12%" trendUp color={C.teal} sparkData={d.collected || revenue.map(v=>v*0.87)}/>
        <KPICard icon="⏳" label="Outstanding" value={fmt(d.outstanding ?? liveData?.outstanding ?? 82000)} sub="Across all clients" color={C.amber}/>
        <KPICard icon="🎯" label="Win Rate" value={(d.winRate || liveData?.winRate || 64)+'%'} trend="4%" trendUp color={C.green} sub={`${d.funnel?.[2]?.count||18} of ${d.funnel?.[1]?.count||28} quotes`}/>
      </div>

      {/* Row 2: Revenue chart + Donut */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:14, marginBottom:14 }}>

        {/* Revenue line chart */}
        <div style={{ background:C.white, border:`1px solid ${C.g100}`, borderRadius:16, padding:'20px 24px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <div>
              <div style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700 }}>Revenue & Collections</div>
              <div style={{ fontSize:12, color:C.g400, marginTop:2 }}>Monthly billed vs collected</div>
            </div>
            <div style={{ display:'flex', gap:16 }}>
              {[['Revenue',C.blue],['Collected',C.teal]].map(([l,c]) => (
                <div key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:C.g600 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:c }}/>
                  {l}
                </div>
              ))}
            </div>
          </div>
          <LineChart
            datasets={[
              { label:'Revenue', data: revenue },
              { label:'Collected', data: d.collected || revenue.map(v => Math.round(v * 0.87)) },
            ]}
            xLabels={months}
            height={180}
          />
        </div>

        {/* Win rate donut + material mix */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ background:C.white, border:`1px solid ${C.g100}`, borderRadius:16, padding:20, display:'flex', alignItems:'center', gap:16 }}>
            <DonutChart segments={d.donutSegs || [{ value:64, color:C.teal },{ value:36, color:C.g100 }]} size={100}/>
            <div>
              <div style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, marginBottom:8 }}>Quote Win Rate</div>
              <div style={{ fontSize:12, color:C.g400, lineHeight:1.6 }}>
                <div><span style={{ fontFamily:'JetBrains Mono,monospace', fontWeight:500, color:C.teal }}>{d.funnel?.[2]?.count || 18}</span> approved</div>
                <div><span style={{ fontFamily:'JetBrains Mono,monospace', fontWeight:500, color:C.navy }}>{d.funnel?.[3]?.count || 14}</span> invoiced</div>
                <div><span style={{ fontFamily:'JetBrains Mono,monospace', fontWeight:500, color:C.green }}>{d.funnel?.[4]?.count || 9}</span> fully paid</div>
              </div>
            </div>
          </div>
          <div style={{ background:C.white, border:`1px solid ${C.g100}`, borderRadius:16, padding:20 }}>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, marginBottom:14 }}>Material Mix</div>
            {(d.materialMix || [{ label:'Aluminium', value:68, color:C.blue },{ label:'UPVC', value:22, color:C.teal },{ label:'Glass', value:10, color:C.purple }]).map(m => (
              <div key={m.label} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                  <span style={{ fontWeight:500, color:C.navy }}>{m.label}</span>
                  <span style={{ fontFamily:'JetBrains Mono,monospace', color:m.color, fontWeight:600 }}>{m.value}%</span>
                </div>
                <div style={{ height:6, background:C.g100, borderRadius:100 }}>
                  <div style={{ height:'100%', width:`${m.value}%`, background:m.color, borderRadius:100, transition:'width 1s ease' }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Quotes bar + Funnel */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>

        {/* Quotes per month */}
        <div style={{ background:C.white, border:`1px solid ${C.g100}`, borderRadius:16, padding:'20px 24px' }}>
          <div style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, marginBottom:4 }}>Quotes Created</div>
          <div style={{ fontSize:12, color:C.g400, marginBottom:16 }}>Per month</div>
          <BarChart
            data={(d.quotes || d.quotesByMonth || [18,22,28,24,34,31,38]).map((v,i) => ({ label:months[i]||'', value:v }))}
            color={C.blue}
            height={160}
          />
        </div>

        {/* Funnel */}
        <div style={{ background:C.white, border:`1px solid ${C.g100}`, borderRadius:16, padding:'20px 24px' }}>
          <div style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, marginBottom:4 }}>Conversion Funnel</div>
          <div style={{ fontSize:12, color:C.g400, marginBottom:20 }}>Quote to payment journey</div>
          <Funnel stages={d.funnel || [
            { label:'Total Quotes', count:38, value:4200000, color:C.g200 },
            { label:'Sent to Client', count:28, value:3100000, color:C.blue },
            { label:'Approved', count:18, value:2240000, color:C.teal },
            { label:'Invoiced', count:14, value:1820000, color:C.amber },
            { label:'Fully Paid', count:9, value:1240000, color:C.green },
          ]}/>
        </div>
      </div>

      {/* Row 4: Top clients + Secondary KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:14 }}>

        {/* Top clients */}
        <div style={{ background:C.white, border:`1px solid ${C.g100}`, borderRadius:16, overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.g100}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700 }}>Top Clients</div>
            <a href="/crm" style={{ fontSize:12, color:C.blue, textDecoration:'none', fontWeight:600 }}>View all →</a>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#F8FAFC' }}>
                {['Client','City','Type','Billed','Collected','Outstanding'].map(h => (
                  <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', color:C.g400, borderBottom:`1px solid ${C.g100}`, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(d.topClients || []).map((c, i) => {
                const outstanding = (c.total_billed||c.billed||0) - (c.total_paid||c.paid||0)
                const initials = (c.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
                const colors = [C.blue, C.teal, C.purple, C.amber, C.green]
                return (
                  <tr key={i} style={{ borderBottom:`1px solid #F8FAFC` }}>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:30, height:30, borderRadius:'50%', background:colors[i%colors.length]+'22', border:`1.5px solid ${colors[i%colors.length]}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:colors[i%colors.length], flexShrink:0 }}>{initials}</div>
                        <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{c.name}</div>
                      </div>
                    </td>
                    <td style={{ padding:'12px 14px', fontSize:12, color:C.g400 }}>{c.city||'—'}</td>
                    <td style={{ padding:'12px 14px' }}><span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:100, background:C.bluePale, color:C.blue }}>{c.tag||'—'}</span></td>
                    <td style={{ padding:'12px 14px', fontFamily:'JetBrains Mono,monospace', fontSize:12, fontWeight:500, color:C.navy }}>{fmt(c.total_billed||c.billed||0)}</td>
                    <td style={{ padding:'12px 14px', fontFamily:'JetBrains Mono,monospace', fontSize:12, color:C.green }}>{fmt(c.total_paid||c.paid||0)}</td>
                    <td style={{ padding:'12px 14px', fontFamily:'JetBrains Mono,monospace', fontSize:12, color: outstanding > 0 ? C.amber : C.green }}>{outstanding > 0 ? fmt(outstanding) : '✓ Clear'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Secondary KPIs */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[
            { icon:'📋', label:'Avg Quote Value', value:fmt(d.avgQuoteVal||110526), color:C.blue },
            { icon:'👥', label:'Active Clients', value:fmtNum(d.totalClients||34), color:C.teal },
            { icon:'📅', label:'Quotes This Month', value:fmtNum((d.quotes||d.quotesByMonth||[38])[((d.quotes||d.quotesByMonth||[38]).length)-1]), color:C.purple },
            { icon:'💳', label:'Payments This Month', value:fmt((d.collected||revenue.map(v=>Math.round(v*0.87)))[((d.collected||revenue).length)-1]), color:C.green },
          ].map(k => (
            <div key={k.label} style={{ background:C.white, border:`1px solid ${C.g100}`, borderRadius:12, padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:9, background:k.color+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{k.icon}</div>
              <div>
                <div style={{ fontSize:11, color:C.g400, marginBottom:2 }}>{k.label}</div>
                <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:17, fontWeight:500, color:C.navy }}>{k.value}</div>
              </div>
            </div>
          ))}

          {/* Outstanding alert */}
          <div style={{ background:`linear-gradient(135deg,${C.amber}15,${C.amber}05)`, border:`1px solid ${C.amber}30`, borderRadius:12, padding:'14px 16px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.amber, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>⚠ Outstanding</div>
            <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:20, fontWeight:500, color:C.navy, marginBottom:3 }}>{fmt(d.outstanding??82000)}</div>
            <div style={{ fontSize:11, color:C.g400 }}>Due from clients · Send reminders via WhatsApp</div>
            <a href="/billing" style={{ display:'inline-flex', marginTop:10, padding:'5px 12px', borderRadius:7, background:C.amber+'22', color:C.amber, fontSize:12, fontWeight:700, textDecoration:'none', border:`1px solid ${C.amber}33` }}>View Outstanding →</a>
          </div>
        </div>
      </div>

    </div>
  )
}

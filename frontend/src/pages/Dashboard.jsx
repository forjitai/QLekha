import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const { t } = useTranslation()
  const [stats, setStats] = useState({ quotes: 0, revenue: 0, pending: 0, winRate: 0 })

  useEffect(() => {
    // Load real stats from Supabase
    async function loadStats() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single()
      if (!userData) return
      const companyId = userData.company_id

      const [quotesRes, invoicesRes] = await Promise.all([
        supabase.from('quotes').select('id, status, grand_total').eq('company_id', companyId),
        supabase.from('invoices').select('balance_due').eq('company_id', companyId).in('status', ['pending','partial','overdue'])
      ])

      const quotes = quotesRes.data || []
      const approved = quotes.filter(q => q.status === 'approved').length
      const sent = quotes.filter(q => ['sent','approved','rejected'].includes(q.status)).length
      const pendingBills = (invoicesRes.data || []).reduce((s, i) => s + (i.balance_due || 0), 0)

      setStats({
        quotes: quotes.length,
        revenue: quotes.filter(q => q.status === 'approved').reduce((s, q) => s + (q.grand_total || 0), 0),
        pending: pendingBills,
        winRate: sent > 0 ? Math.round((approved / sent) * 100) : 0
      })
    }
    loadStats()
  }, [])

  const kpis = [
    { label: 'Revenue This Month', value: '₹' + (stats.revenue/100000).toFixed(1) + 'L', trend: '↑ 18%', color: '#1A6FE8', icon: '💰' },
    { label: 'Quotes Sent', value: stats.quotes, trend: '↑ 5', color: '#0EA5A0', icon: '📋' },
    { label: 'Pending Payments', value: '₹' + Math.round(stats.pending/1000) + 'K', trend: '↑ ₹12K', color: '#FFB400', icon: '⏳' },
    { label: 'Win Rate', value: stats.winRate + '%', trend: '↑ 4%', color: '#22C55E', icon: '🎯' },
  ]

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'Syne', fontSize:22, fontWeight:700, marginBottom:4 }}>Good morning 👋</h1>
        <p style={{ fontSize:13, color:'#8A9BB5' }}>Here's what's happening in your business today.</p>
      </div>

      {/* KPI Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:16, marginBottom:24 }}>
        {kpis.map((kpi, i) => (
          <div key={i} style={{ background:'#fff', borderRadius:16, padding:20, border:'1px solid #E8EDF3', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:kpi.color, borderRadius:'16px 16px 0 0' }} />
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
              <div style={{ width:36, height:36, borderRadius:9, background:kpi.color+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{kpi.icon}</div>
              <span style={{ fontSize:11, fontWeight:600, background:'#f0fdf4', color:'#22C55E', padding:'3px 8px', borderRadius:100 }}>{kpi.trend}</span>
            </div>
            <div style={{ fontFamily:'JetBrains Mono', fontSize:26, fontWeight:500, marginBottom:4 }}>{kpi.value}</div>
            <div style={{ fontSize:12, color:'#8A9BB5' }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ background:'#fff', borderRadius:16, padding:20, border:'1px solid #E8EDF3' }}>
        <h3 style={{ fontFamily:'Syne', fontSize:14, fontWeight:700, marginBottom:16 }}>Quick Actions</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:10 }}>
          {[
            { icon:'📋', label:'New Quote', sub:'Start a fresh quotation', path:'/quotes/create' },
            { icon:'🧾', label:'Create Invoice', sub:'Bill an approved quote', path:'/billing' },
            { icon:'👤', label:'Add Client', sub:'Save a new contact', path:'/crm' },
            { icon:'📦', label:'Update Prices', sub:'Glass & profile rates', path:'/stock' },
          ].map((a, i) => (
            <a key={i} href={a.path} style={{
              display:'flex', alignItems:'center', gap:12,
              padding:'12px 14px', borderRadius:10, background:'#F0F4F8',
              border:'1px solid #E8EDF3', textDecoration:'none', transition:'all 0.15s',
            }}>
              <span style={{ fontSize:20 }}>{a.icon}</span>
              <div>
                <div style={{ fontSize:13, fontWeight:500, color:'#0B1F3A' }}>{a.label}</div>
                <div style={{ fontSize:11, color:'#8A9BB5' }}>{a.sub}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

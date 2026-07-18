import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const STATUS_COLORS = {
  draft: { bg:'#E8EDF3', color:'#8A9BB5' },
  sent: { bg:'rgba(26,111,232,0.1)', color:'#1A6FE8' },
  approved: { bg:'rgba(14,165,160,0.1)', color:'#0EA5A0' },
  rejected: { bg:'rgba(239,68,68,0.08)', color:'#EF4444' },
  expired: { bg:'rgba(255,180,0,0.1)', color:'#FFB400' },
}

export default function Quotes() {
  const [quotes, setQuotes] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single()
      if (!userData) return
      const { data } = await supabase.from('quotes')
        .select('*, clients(name, phone)')
        .eq('company_id', userData.company_id)
        .order('created_at', { ascending: false })
      setQuotes(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = filter === 'all' ? quotes : quotes.filter(q => q.status === filter)

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h2 style={{ fontFamily:'Syne', fontSize:20, fontWeight:700 }}>Quotes</h2>
        <Link to="/quotes/create" style={{ background:'#1A6FE8', color:'#fff', textDecoration:'none', padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:600 }}>
          ＋ New Quote
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {['all','draft','sent','approved','rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding:'6px 14px', borderRadius:100, fontSize:12, fontWeight:600, cursor:'pointer', border:'1px solid',
            borderColor: filter === s ? '#0B1F3A' : '#D1D9E6',
            background: filter === s ? '#0B1F3A' : '#fff',
            color: filter === s ? '#fff' : '#4A5568',
          }}>{s.charAt(0).toUpperCase() + s.slice(1)} {s==='all'?quotes.length:quotes.filter(q=>q.status===s).length}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E8EDF3', overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:'#8A9BB5' }}>Loading quotes...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:60, textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
            <h3 style={{ fontFamily:'Syne', fontSize:18, fontWeight:700, marginBottom:8 }}>No quotes yet</h3>
            <p style={{ color:'#8A9BB5', marginBottom:20 }}>Create your first quote to get started</p>
            <Link to="/quotes/create" style={{ background:'#1A6FE8', color:'#fff', textDecoration:'none', padding:'10px 20px', borderRadius:8, fontSize:13, fontWeight:600 }}>Create Quote</Link>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#F8FAFC' }}>
                {['Quote #','Client','Material','Amount','Status','Date','Actions'].map(h => (
                  <th key={h} style={{ padding:'11px 20px', textAlign:'left', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', color:'#8A9BB5', borderBottom:'1px solid #E8EDF3' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(q => {
                const sc = STATUS_COLORS[q.status] || STATUS_COLORS.draft
                return (
                  <tr key={q.id} style={{ borderBottom:'1px solid #F8FAFC' }}>
                    <td style={{ padding:'14px 20px', fontFamily:'JetBrains Mono', fontSize:11, color:'#8A9BB5' }}>#{q.quote_number}</td>
                    <td style={{ padding:'14px 20px' }}>
                      <div style={{ fontWeight:600, fontSize:13 }}>{q.client_name}</div>
                      <div style={{ fontSize:11, color:'#8A9BB5' }}>{q.client_phone}</div>
                    </td>
                    <td style={{ padding:'14px 20px' }}><span style={{ fontSize:11, fontWeight:600, background:'#F0F4F8', color:'#4A5568', padding:'2px 8px', borderRadius:4 }}>{q.material_type}</span></td>
                    <td style={{ padding:'14px 20px', fontFamily:'JetBrains Mono', fontWeight:500 }}>₹{(q.grand_total||0).toLocaleString('en-IN')}</td>
                    <td style={{ padding:'14px 20px' }}><span style={{ ...sc, padding:'3px 9px', borderRadius:100, fontSize:10, fontWeight:700 }}>{q.status}</span></td>
                    <td style={{ padding:'14px 20px', fontSize:12, color:'#8A9BB5' }}>{new Date(q.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</td>
                    <td style={{ padding:'14px 20px' }}>
                      <div style={{ display:'flex', gap:4 }}>
                        <button style={{ padding:'5px 10px', borderRadius:6, border:'1px solid #E8EDF3', background:'#fff', fontSize:11, cursor:'pointer' }}>View</button>
                        <button style={{ padding:'5px 10px', borderRadius:6, border:'1px solid rgba(37,211,102,0.3)', background:'#fff', fontSize:11, cursor:'pointer', color:'#25D366' }}>WhatsApp</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

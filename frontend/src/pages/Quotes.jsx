import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { WhatsAppSendBtn, WhatsAppModal } from '../components/WhatsAppButton'

const STATUS_COLORS = {
  draft:    { bg:'#E8EDF3',                color:'#8A9BB5' },
  sent:     { bg:'rgba(26,111,232,0.1)',    color:'#1A6FE8' },
  approved: { bg:'rgba(14,165,160,0.1)',    color:'#0EA5A0' },
  rejected: { bg:'rgba(239,68,68,0.08)',    color:'#EF4444' },
  expired:  { bg:'rgba(255,180,0,0.1)',     color:'#FFB400' },
}

const C = { navy:'#0B1F3A', blue:'#1A6FE8', g100:'#E8EDF3', g400:'#8A9BB5', white:'#fff', bg:'#F0F4F8' }

export default function Quotes() {
  const [quotes, setQuotes]   = useState([])
  const [filter, setFilter]   = useState('all')
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [waModal, setWaModal] = useState(null)  // { quote }

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return setLoading(false)
    const { data: ud } = await supabase.from('users').select('company_id, companies(name)').eq('id', user.id).single()
    if (!ud) return setLoading(false)
    setProfile(ud)
    const { data } = await supabase.from('quotes')
      .select('*, clients(name, phone)')
      .eq('company_id', ud.company_id)
      .order('created_at', { ascending: false })
    setQuotes(data || [])
    setLoading(false)
  }

  async function markSent(quoteId) {
    await supabase.from('quotes').update({ status: 'sent', sent_at: new Date().toISOString(), wa_sent_at: new Date().toISOString() }).eq('id', quoteId)
    setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: 'sent', sent_at: new Date().toISOString() } : q))
  }

  const filtered = filter === 'all' ? quotes : quotes.filter(q => q.status === filter)
  const counts   = ['draft','sent','approved','rejected','expired'].reduce((a, s) => ({ ...a, [s]: quotes.filter(q=>q.status===s).length }), {})

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700 }}>Quotes</h2>
        <Link to="/quotes/create" style={{ background:C.blue, color:'#fff', textDecoration:'none', padding:'9px 18px', borderRadius:8, fontSize:13, fontWeight:600, display:'inline-flex', alignItems:'center', gap:6 }}>
          ＋ New Quote
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {['all','draft','sent','approved','rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding:'6px 14px', borderRadius:100, fontSize:12, fontWeight:600, cursor:'pointer', border:'1px solid',
            borderColor: filter===s ? C.navy : C.g100,
            background: filter===s ? C.navy : C.white,
            color: filter===s ? '#fff' : '#4A5568',
          }}>
            {s.charAt(0).toUpperCase()+s.slice(1)} {s==='all' ? quotes.length : (counts[s]||0)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:C.white, borderRadius:16, border:`1px solid ${C.g100}`, overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:C.g400 }}>Loading quotes...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:60, textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
            <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:700, marginBottom:8 }}>No quotes yet</h3>
            <p style={{ color:C.g400, marginBottom:20 }}>Create your first quote to get started</p>
            <Link to="/quotes/create" style={{ background:C.blue, color:'#fff', textDecoration:'none', padding:'10px 20px', borderRadius:8, fontSize:13, fontWeight:600 }}>Create Quote</Link>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#F8FAFC' }}>
                  {['Quote #','Client','Material','Amount','Status','Date','Actions'].map(h => (
                    <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', color:C.g400, borderBottom:`1px solid ${C.g100}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(q => {
                  const sc = STATUS_COLORS[q.status] || STATUS_COLORS.draft
                  const phone = q.clients?.phone || q.client_phone
                  return (
                    <tr key={q.id} style={{ borderBottom:`1px solid #F8FAFC` }}>
                      <td style={{ padding:'13px 16px', fontFamily:'JetBrains Mono,monospace', fontSize:11, color:C.g400 }}>#{q.quote_number}</td>
                      <td style={{ padding:'13px 16px' }}>
                        <div style={{ fontWeight:600, fontSize:13, color:C.navy }}>{q.client_name}</div>
                        <div style={{ fontSize:11, color:C.g400 }}>{phone}</div>
                      </td>
                      <td style={{ padding:'13px 16px' }}>
                        <span style={{ fontSize:10, fontWeight:600, background:'#F0F4F8', color:'#4A5568', padding:'2px 8px', borderRadius:4, textTransform:'capitalize' }}>{q.material_type}</span>
                      </td>
                      <td style={{ padding:'13px 16px', fontFamily:'JetBrains Mono,monospace', fontWeight:500, color:C.navy }}>
                        ₹{(q.grand_total||0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding:'13px 16px' }}>
                        <span style={{ ...sc, padding:'3px 9px', borderRadius:100, fontSize:10, fontWeight:700 }}>{q.status}</span>
                      </td>
                      <td style={{ padding:'13px 16px', fontSize:12, color:C.g400 }}>
                        {new Date(q.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                      </td>
                      <td style={{ padding:'13px 16px' }}>
                        <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                          <button style={{ padding:'5px 10px', borderRadius:6, border:`1px solid ${C.g100}`, background:C.white, fontSize:11, cursor:'pointer', color:'#4A5568' }}>View</button>
                          <WhatsAppSendBtn
                            phone={phone}
                            type="quote"
                            label="WhatsApp"
                            data={{
                              clientName: q.client_name,
                              quoteNumber: q.quote_number,
                              amount: `₹${(q.grand_total||0).toLocaleString('en-IN')}`,
                              items: [],
                              total: q.grand_total,
                              companyName: profile?.companies?.name || 'QLekha',
                              companyId: profile?.company_id,
                              fallbackText: `Hi ${q.client_name}, your quote #${q.quote_number} for ₹${(q.grand_total||0).toLocaleString('en-IN')} is ready. Reply YES to approve.`,
                            }}
                            onSent={() => markSent(q.id)}
                          />
                          <button
                            onClick={() => setWaModal(q)}
                            style={{ padding:'5px 10px', borderRadius:6, border:'1px solid rgba(37,211,102,0.3)', background:'rgba(37,211,102,0.06)', fontSize:11, cursor:'pointer', color:'#25D366' }}>
                            ···
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding:'10px 16px', background:'#F8FAFC', borderTop:`1px solid ${C.g100}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:12, color:C.g400 }}>Showing {filtered.length} of {quotes.length} quotes</span>
          <span style={{ fontSize:11, color:C.g400 }}>💬 WhatsApp button sends quote summary</span>
        </div>
      </div>

      {/* WhatsApp Modal */}
      {waModal && (
        <WhatsAppModal
          isOpen={!!waModal}
          onClose={() => setWaModal(null)}
          contact={{ name: waModal.client_name, phone: waModal.clients?.phone || waModal.client_phone }}
          companyId={profile?.company_id}
          companyName={profile?.companies?.name || 'QLekha'}
        />
      )}
    </div>
  )
}

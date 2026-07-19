import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const STAGES = [
  { key:'new',         label:'🆕 New',          color:'#6366F1', bg:'rgba(99,102,241,0.1)' },
  { key:'contacted',   label:'📞 Contacted',     color:'#FFB400', bg:'rgba(255,180,0,0.1)' },
  { key:'quoted',      label:'📋 Quoted',        color:'#1A6FE8', bg:'rgba(26,111,232,0.08)' },
  { key:'negotiating', label:'🤝 Negotiating',   color:'#8B5CF6', bg:'rgba(139,92,246,0.1)' },
  { key:'won',         label:'✅ Won',           color:'#22C55E', bg:'rgba(34,197,94,0.1)' },
]

const VIEWS = ['Pipeline','Clients','Follow-ups','Activities']

const S = {
  card: { background:'#fff', border:'1px solid #E8EDF3', borderRadius:12, padding:16, cursor:'pointer', transition:'all 0.2s' },
  pill: (color, bg) => ({ display:'inline-flex', padding:'2px 8px', borderRadius:100, fontSize:10, fontWeight:700, color, background:bg }),
  mono: { fontFamily:'JetBrains Mono,monospace', fontWeight:500 },
}

export default function CRM() {
  const [view, setView] = useState('Pipeline')
  const [leads, setLeads] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [panel, setPanel] = useState(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: ud } = await supabase.from('users').select('company_id').eq('id', user.id).single()
    if (!ud) return setLoading(false)
    const cid = ud.company_id
    const [lr, cr] = await Promise.all([
      supabase.from('leads').select('*').eq('company_id', cid).order('created_at', { ascending: false }),
      supabase.from('clients').select('*').eq('company_id', cid).order('name'),
    ])
    setLeads(lr.data || [])
    setClients(cr.data || [])
    setLoading(false)
  }

  async function updateLeadStatus(id, status) {
    await supabase.from('leads').update({ status }).eq('id', id)
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
  }

  const byStage = (stage) => leads.filter(l => l.status === stage)
  const overdue = leads.filter(l => l.follow_up_date && new Date(l.follow_up_date) < new Date() && !['won','lost'].includes(l.status))

  if (loading) return <div style={{ padding:60, textAlign:'center', color:'#8A9BB5' }}>Loading CRM...</div>

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700 }}>CRM</h2>
        <div style={{ display:'flex', gap:8 }}>
          <button style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #E8EDF3', background:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>＋ Add Lead</button>
          <button style={{ padding:'8px 16px', borderRadius:8, border:'none', background:'#1A6FE8', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>📝 Log Activity</button>
        </div>
      </div>

      {overdue.length > 0 && (
        <div style={{ background:'linear-gradient(135deg,#7f1d1d,#991b1b)', borderRadius:12, padding:'12px 18px', display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <span style={{ fontSize:20 }}>⚠️</span>
          <div style={{ flex:1, color:'#fff' }}>
            <div style={{ fontWeight:700, fontSize:13 }}>{overdue.length} follow-up{overdue.length > 1 ? 's' : ''} overdue</div>
            <div style={{ fontSize:11, opacity:0.7, marginTop:2 }}>{overdue.map(l => l.name).join(', ')}</div>
          </div>
        </div>
      )}

      {/* View Tabs */}
      <div style={{ display:'flex', background:'#fff', border:'1px solid #E8EDF3', borderRadius:12, padding:4, width:'fit-content', marginBottom:20, gap:0 }}>
        {VIEWS.map(v => (
          <button key={v} onClick={() => setView(v)} style={{ padding:'7px 16px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, background: view === v ? '#0B1F3A' : 'transparent', color: view === v ? '#fff' : '#8A9BB5' }}>{v}</button>
        ))}
      </div>

      {/* Pipeline View */}
      {view === 'Pipeline' && (
        <div>
          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:20 }}>
            {STAGES.map(s => (
              <div key={s.key} style={{ background:'#fff', border:'1px solid #E8EDF3', borderRadius:12, padding:'12px 14px', borderTop:`3px solid ${s.color}` }}>
                <div style={{ ...S.mono, fontSize:22 }}>{byStage(s.key).length || 0}</div>
                <div style={{ fontSize:11, color:'#8A9BB5', marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Kanban */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, minHeight:400 }}>
            {STAGES.map(stage => (
              <div key={stage.key} style={{ background:'#F8FAFC', border:'1px solid #E8EDF3', borderRadius:12, overflow:'hidden' }}>
                <div style={{ padding:'10px 12px', borderBottom:'1px solid #E8EDF3', borderTop:`3px solid ${stage.color}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:12, fontWeight:700, color:stage.color }}>{stage.label}</span>
                  <span style={{ ...S.pill(stage.color, stage.bg), fontSize:10 }}>{byStage(stage.key).length}</span>
                </div>
                <div style={{ padding:8, display:'flex', flexDirection:'column', gap:8 }}>
                  {byStage(stage.key).length === 0 ? (
                    <div style={{ padding:'20px 8px', textAlign:'center', color:'#8A9BB5', fontSize:12 }}>No leads</div>
                  ) : byStage(stage.key).map(lead => (
                    <div key={lead.id} style={{ ...S.card, padding:12 }} onClick={() => setPanel(lead)}>
                      <div style={{ fontWeight:600, fontSize:13, marginBottom:2 }}>{lead.name}</div>
                      <div style={{ fontSize:11, color:'#8A9BB5' }}>{lead.phone}</div>
                      {lead.value_estimate && <div style={{ ...S.mono, fontSize:12, marginTop:6 }}>~₹{lead.value_estimate?.toLocaleString('en-IN')}</div>}
                      {lead.follow_up_date && (
                        <div style={{ fontSize:10, marginTop:6, color: new Date(lead.follow_up_date) < new Date() ? '#EF4444' : '#8A9BB5', fontWeight:600 }}>
                          📅 {new Date(lead.follow_up_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                        </div>
                      )}
                    </div>
                  ))}
                  <button style={{ width:'100%', padding:8, border:'1.5px dashed #D1D9E6', borderRadius:8, background:'transparent', cursor:'pointer', fontSize:12, color:'#8A9BB5' }}>＋ Add</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clients View */}
      {view === 'Clients' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
          {clients.length === 0 ? (
            <div style={{ gridColumn:'1/-1', padding:60, textAlign:'center' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>👥</div>
              <p style={{ color:'#8A9BB5' }}>No clients yet. Create a quote to add a client.</p>
            </div>
          ) : clients.map(c => (
            <div key={c.id} style={{ ...S.card }} onClick={() => setPanel(c)}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#1A6FE8,#0EA5A0)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, color:'#fff', flexShrink:0 }}>{c.name[0]}</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:14 }}>{c.name}</div>
                  <div style={{ fontSize:12, color:'#8A9BB5' }}>{c.phone}</div>
                </div>
                <span style={{ ...S.pill('#1A6FE8','rgba(26,111,232,0.08)'), marginLeft:'auto' }}>{c.tag}</span>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <div style={{ fontSize:11, background:'#F0F4F8', borderRadius:6, padding:'3px 8px' }}>Quotes: <b>{c.total_quotes || 0}</b></div>
                <div style={{ fontSize:11, background:'#F0F4F8', borderRadius:6, padding:'3px 8px' }}>Billed: <b>₹{(c.total_billed||0).toLocaleString('en-IN')}</b></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Follow-ups View */}
      {view === 'Follow-ups' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {leads.filter(l => l.follow_up_date).length === 0 ? (
            <div style={{ padding:60, textAlign:'center' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🔔</div>
              <p style={{ color:'#8A9BB5' }}>No follow-ups scheduled.</p>
            </div>
          ) : leads.filter(l => l.follow_up_date).sort((a,b) => new Date(a.follow_up_date) - new Date(b.follow_up_date)).map(l => {
            const isOverdue = new Date(l.follow_up_date) < new Date()
            const d = new Date(l.follow_up_date)
            return (
              <div key={l.id} style={{ background:'#fff', border:'1px solid #E8EDF3', borderLeft:`3px solid ${isOverdue ? '#EF4444' : '#22C55E'}`, borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:16 }}>
                <div style={{ textAlign:'center', minWidth:44 }}>
                  <div style={{ ...S.mono, fontSize:20 }}>{d.getDate()}</div>
                  <div style={{ fontSize:10, color:'#8A9BB5', textTransform:'uppercase' }}>{d.toLocaleString('en-IN',{month:'short'})}</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:14 }}>{l.name}</div>
                  <div style={{ fontSize:12, color:'#4A5568', marginTop:2 }}>{l.follow_up_note || 'Follow up'}</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                  <span style={{ ...S.pill(isOverdue ? '#EF4444' : '#22C55E', isOverdue ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.1)') }}>{isOverdue ? 'Overdue' : 'Upcoming'}</span>
                  <button onClick={() => updateLeadStatus(l.id,'won')} style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #E8EDF3', background:'#fff', fontSize:11, cursor:'pointer' }}>Mark Done</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Activities View */}
      {view === 'Activities' && (
        <div style={{ background:'#fff', border:'1px solid #E8EDF3', borderRadius:12, padding:24, textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📅</div>
          <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:700, marginBottom:8 }}>Activity Timeline</h3>
          <p style={{ color:'#8A9BB5' }}>Activities are logged automatically when you send quotes, receive payments, or log calls manually.</p>
        </div>
      )}

      {/* Lead Detail Panel */}
      {panel && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:80, display:'flex', justifyContent:'flex-end' }} onClick={() => setPanel(null)}>
          <div style={{ width:380, background:'#fff', height:'100%', display:'flex', flexDirection:'column', boxShadow:'0 8px 32px rgba(11,31,58,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid #E8EDF3', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div><div style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700 }}>{panel.name}</div><div style={{ fontSize:12, color:'#8A9BB5', marginTop:2 }}>{panel.phone}</div></div>
              <button onClick={() => setPanel(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#8A9BB5' }}>✕</button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'#8A9BB5', marginBottom:10 }}>Pipeline Stage</div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {STAGES.map(s => (
                    <button key={s.key} onClick={() => updateLeadStatus(panel.id, s.key)} style={{ padding:'4px 10px', borderRadius:100, border:`1px solid ${panel.status === s.key ? s.color : '#E8EDF3'}`, background: panel.status === s.key ? s.bg : '#fff', color: panel.status === s.key ? s.color : '#8A9BB5', fontSize:11, fontWeight:600, cursor:'pointer' }}>{s.label}</button>
                  ))}
                </div>
              </div>
              {panel.value_estimate && (
                <div style={{ background:'#F0F4F8', borderRadius:10, padding:14, marginBottom:16 }}>
                  <div style={{ fontSize:10, color:'#8A9BB5', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>Estimated Value</div>
                  <div style={{ ...S.mono, fontSize:22 }}>₹{panel.value_estimate?.toLocaleString('en-IN')}</div>
                </div>
              )}
              {panel.notes && <div style={{ fontSize:13, color:'#4A5568', lineHeight:1.6, marginBottom:16 }}>{panel.notes}</div>}
            </div>
            <div style={{ padding:'16px 24px', borderTop:'1px solid #E8EDF3', display:'flex', gap:8 }}>
              <button style={{ flex:1, padding:'9px 0', borderRadius:8, border:'none', background:'#0EA5A0', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>💬 WhatsApp</button>
              <button style={{ flex:1, padding:'9px 0', borderRadius:8, border:'none', background:'#1A6FE8', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>📋 New Quote</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

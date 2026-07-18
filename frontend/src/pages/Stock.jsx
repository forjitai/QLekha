import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const TABS = [
  { key: 'profiles', label: '🔩 Profiles', count: 181 },
  { key: 'glass', label: '🪟 Glass', count: 123 },
  { key: 'accessories', label: '🔧 Accessories', count: 181 },
  { key: 'weights', label: '⚖️ Weight Price', count: 5 },
]

const S = {
  card: { background:'#fff', borderRadius:16, border:'1px solid #E8EDF3', overflow:'hidden', marginBottom:16 },
  th: { padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', color:'#8A9BB5', background:'#F8FAFC', borderBottom:'1px solid #E8EDF3', cursor:'pointer' },
  td: { padding:'12px 14px', fontSize:13, borderBottom:'1px solid #F8FAFC', color:'#4A5568', verticalAlign:'middle' },
  input: { width:80, padding:'5px 8px', borderRadius:6, border:'1.5px solid #1A6FE8', fontFamily:'JetBrains Mono,monospace', fontSize:12, color:'#0B1F3A', outline:'none' },
  badge: (color, bg) => ({ display:'inline-flex', padding:'3px 9px', borderRadius:100, fontSize:10, fontWeight:700, background:bg, color }),
}

export default function Stock() {
  const [tab, setTab] = useState('profiles')
  const [data, setData] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState(null)
  const [editVal, setEditVal] = useState('')

  useEffect(() => { loadData() }, [tab])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single()
    if (!userData) return setLoading(false)
    const cid = userData.company_id

    let res
    if (tab === 'profiles') res = await supabase.from('profiles').select('*').eq('company_id', cid).order('profile_name')
    else if (tab === 'glass') res = await supabase.from('glass_types').select('*').eq('company_id', cid).order('name')
    else if (tab === 'accessories') res = await supabase.from('accessories').select('*').eq('company_id', cid).order('type')
    else res = await supabase.from('profile_weight_prices').select('*').eq('company_id', cid)

    setData(res.data || [])
    setLoading(false)
  }

  async function savePrice(id, val) {
    const price = parseFloat(val) || 0
    const field = tab === 'profiles' ? 'price_per_kg' : tab === 'glass' ? 'price_per_sqft' : tab === 'accessories' ? 'price' : 'price_per_kg'
    const table = tab === 'profiles' ? 'profiles' : tab === 'glass' ? 'glass_types' : tab === 'accessories' ? 'accessories' : 'profile_weight_prices'
    await supabase.from(table).update({ [field]: price }).eq('id', id)
    setData(prev => prev.map(d => d.id === id ? { ...d, [field]: price } : d))
    setEditId(null)
  }

  const filtered = data.filter(d => {
    const q = search.toLowerCase()
    const matchSearch = !q || Object.values(d).some(v => String(v).toLowerCase().includes(q))
    const matchFilter = filter === 'all' || d.system === filter || d.glass_type === filter || d.type === filter
    return matchSearch && matchFilter
  })

  const missingPrice = data.filter(d => {
    const f = tab === 'profiles' ? 'price_per_kg' : tab === 'glass' ? 'price_per_sqft' : 'price'
    return !d[f]
  }).length

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700 }}>Stock Manager</h2>
        <div style={{ display:'flex', gap:8 }}>
          <button style={{ padding:'8px 14px', borderRadius:8, border:'1px solid #E8EDF3', background:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', color:'#4A5568' }}>⬇ Download CSV</button>
          <button style={{ padding:'8px 16px', borderRadius:8, border:'none', background:'#1A6FE8', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>＋ Add Item</button>
        </div>
      </div>

      {missingPrice > 0 && (
        <div style={{ background:'linear-gradient(135deg,#7f1d1d,#991b1b)', borderRadius:16, padding:'14px 20px', display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <span style={{ fontSize:22 }}>⚠️</span>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, color:'#fff' }}>{missingPrice} items have missing or zero prices</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)', marginTop:2 }}>Update before creating quotes to avoid calculation errors</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, background:'#fff', border:'1px solid #E8EDF3', borderRadius:16, padding:4, width:'fit-content', marginBottom:20 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setFilter('all'); setSearch('') }} style={{
            padding:'7px 16px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:600,
            background: tab === t.key ? '#0B1F3A' : 'transparent',
            color: tab === t.key ? '#fff' : '#8A9BB5',
          }}>{t.label} <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:100, marginLeft:4, background: tab === t.key ? 'rgba(255,255,255,0.2)' : '#E8EDF3', color: tab === t.key ? '#fff' : '#8A9BB5' }}>{t.count}</span></button>
        ))}
      </div>

      {/* Search */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fff', border:'1px solid #D1D9E6', borderRadius:8, padding:'7px 12px', flex:1, maxWidth:300 }}>
          <span style={{ color:'#8A9BB5' }}>🔍</span>
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ border:'none', background:'transparent', outline:'none', fontSize:13, color:'#0B1F3A', width:'100%', fontFamily:'Inter,sans-serif' }}/>
        </div>
      </div>

      {/* Table */}
      <div style={S.card}>
        {loading ? (
          <div style={{ padding:60, textAlign:'center', color:'#8A9BB5' }}>Loading {tab}...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:60, textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
            <p style={{ color:'#8A9BB5' }}>No {tab} found. Add items or upload a CSV.</p>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {tab === 'profiles' && <>
                    <th style={S.th}>Code</th><th style={S.th}>Name</th><th style={S.th}>Brand</th><th style={S.th}>System</th><th style={S.th}>Price/kg ₹</th><th style={S.th}>Status</th>
                  </>}
                  {tab === 'glass' && <>
                    <th style={S.th}>Name</th><th style={S.th}>Thickness</th><th style={S.th}>Type</th><th style={S.th}>Price/SqFt ₹</th><th style={S.th}>Status</th>
                  </>}
                  {tab === 'accessories' && <>
                    <th style={S.th}>Type</th><th style={S.th}>Name</th><th style={S.th}>Code</th><th style={S.th}>Price ₹</th><th style={S.th}>Status</th>
                  </>}
                  {tab === 'weights' && <>
                    <th style={S.th}>Company</th><th style={S.th}>Colour</th><th style={S.th}>Price/kg ₹</th><th style={S.th}>Status</th>
                  </>}
                  <th style={S.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map(item => {
                  const priceField = tab === 'profiles' ? 'price_per_kg' : tab === 'glass' ? 'price_per_sqft' : tab === 'accessories' ? 'price' : 'price_per_kg'
                  const price = item[priceField] || 0
                  const isEditing = editId === item.id
                  return (
                    <tr key={item.id} style={{ borderBottom:'1px solid #F8FAFC' }}>
                      {tab === 'profiles' && <>
                        <td style={{ ...S.td, fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'#8A9BB5' }}>{item.profile_code}</td>
                        <td style={{ ...S.td, fontWeight:600, color:'#0B1F3A' }}>{item.profile_name}</td>
                        <td style={S.td}><span style={{ fontSize:11, fontWeight:600, background:'rgba(26,111,232,0.1)', color:'#1A6FE8', padding:'2px 8px', borderRadius:4 }}>{item.brand}</span></td>
                        <td style={S.td}><span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:100, background:'rgba(26,111,232,0.08)', color:'#1A6FE8' }}>{item.system}</span></td>
                      </>}
                      {tab === 'glass' && <>
                        <td style={{ ...S.td, fontWeight:600, color:'#0B1F3A' }}>{item.name}</td>
                        <td style={{ ...S.td, fontFamily:'JetBrains Mono,monospace' }}>{item.thickness_mm}mm</td>
                        <td style={S.td}><span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:100, background:'rgba(14,165,160,0.1)', color:'#0EA5A0' }}>{item.glass_type}</span></td>
                      </>}
                      {tab === 'accessories' && <>
                        <td style={S.td}><span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:100, background:'rgba(26,111,232,0.08)', color:'#1A6FE8' }}>{item.type}</span></td>
                        <td style={{ ...S.td, fontWeight:600, color:'#0B1F3A' }}>{item.name}</td>
                        <td style={{ ...S.td, fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'#8A9BB5' }}>{item.code || '—'}</td>
                      </>}
                      {tab === 'weights' && <>
                        <td style={S.td}>{item.company}</td>
                        <td style={{ ...S.td, textTransform:'capitalize' }}>{item.colour?.replace('_',' ')}</td>
                      </>}
                      <td style={S.td}>
                        {isEditing ? (
                          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                            <input type="number" value={editVal} onChange={e => setEditVal(e.target.value)}
                              style={S.input} autoFocus onKeyDown={e => { if(e.key==='Enter') savePrice(item.id,editVal); if(e.key==='Escape') setEditId(null) }}/>
                            <button onClick={() => savePrice(item.id, editVal)} style={{ padding:'4px 10px', borderRadius:6, border:'none', background:'#22C55E', color:'#fff', fontSize:11, fontWeight:600, cursor:'pointer' }}>Save</button>
                          </div>
                        ) : (
                          <span onClick={() => { setEditId(item.id); setEditVal(price) }} style={{ fontFamily:'JetBrains Mono,monospace', fontSize:13, fontWeight:500, cursor:'pointer', padding:'4px 8px', borderRadius:5, border:'1.5px solid transparent', color: price > 0 ? '#0B1F3A' : '#EF4444', background: price > 0 ? 'transparent' : 'rgba(239,68,68,0.08)' }} title="Click to edit">
                            {price > 0 ? '₹' + price : '⚠ Set price'}
                          </span>
                        )}
                      </td>
                      <td style={S.td}>{price > 0 ? <span style={S.badge('#22C55E','rgba(34,197,94,0.1)')}>✓ Set</span> : <span style={S.badge('#EF4444','rgba(239,68,68,0.08)')}>⚠ Missing</span>}</td>
                      <td style={S.td}><button onClick={() => { setEditId(item.id); setEditVal(price) }} style={{ padding:'4px 8px', borderRadius:6, border:'1px solid #E8EDF3', background:'#fff', fontSize:11, cursor:'pointer' }}>✏ Edit</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding:'10px 14px', background:'#F8FAFC', borderTop:'1px solid #E8EDF3', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:12, color:'#8A9BB5' }}>Showing {Math.min(50, filtered.length)} of {filtered.length} {tab}</span>
          {missingPrice > 0 && <span style={{ fontSize:12, color:'#EF4444', fontWeight:600 }}>{missingPrice} items need pricing</span>}
        </div>
      </div>
    </div>
  )
}

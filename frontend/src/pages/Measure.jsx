import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const C={ink:'#0F1923',steel:'#1B4FD8',chalk:'#F7F8FA',glass:'#E8F4FD',mist:'#6B7A8D',fog:'#C4CDD8',
         snow:'#FFFFFF',green:'#16A34A',red:'#DC2626',amber:'#D97706',teal:'#0EA5A0'}
const IS={width:'100%',padding:'11px 12px',borderRadius:9,border:'1.5px solid '+C.fog,fontSize:16,
          fontFamily:'JetBrains Mono,monospace',color:C.ink,background:C.snow,outline:'none',boxSizing:'border-box'}
const LB={fontSize:10,fontWeight:700,color:C.mist,textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:4}
const BTN={padding:'11px 18px',borderRadius:9,border:'none',background:C.steel,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'Syne,sans-serif'}
const GHOST={...BTN,background:'transparent',border:'1.5px solid '+C.fog,color:C.ink,fontWeight:600}

const LS_KEY = 'qlekha_measure_draft'

export default function Measure() {
  const [site, setSite] = useState({ client_name:'', phone:'', address:'', notes:'' })
  const [rooms, setRooms] = useState([])
  const [types, setTypes] = useState([])
  const [companyId, setCompanyId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')

  // Survives a lost signal on site: everything is kept on the device until saved.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) { const d = JSON.parse(raw); setSite(d.site||site); setRooms(d.rooms||[]) }
    } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ site, rooms })) } catch {}
  }, [site, rooms])

  useEffect(() => { (async () => {
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      if (!user) return setLoading(false)
      const { data: ud } = await supabase.from('users').select('company_id').eq('id',user.id).maybeSingle()
      if (!ud) return setLoading(false)
      setCompanyId(ud.company_id)
      const { data } = await supabase.from('window_types')
        .select('id,name').eq('company_id',ud.company_id).eq('is_active',true).order('name')
      setTypes(data||[])
    } catch(e) { console.error('Measure load:', e?.message) }
    finally { setLoading(false) }
  })() }, [])

  const addRoom = () => setRooms(p => [...p, {
    id: Date.now()+Math.random(), room:'', width_mm:'', height_mm:'', qty:1, typeId:'', note:''
  }])
  const upd = (id,k,v) => setRooms(p => p.map(r => r.id===id ? {...r,[k]:v} : r))
  const del = id => setRooms(p => p.filter(r => r.id!==id))

  const valid = rooms.filter(r => Number(r.width_mm)>0 && Number(r.height_mm)>0)
  const totalSqft = valid.reduce((s,r)=>
    s + (Number(r.width_mm)/1000)*(Number(r.height_mm)/1000)*10.764*(Number(r.qty)||1), 0)

  async function convertToQuote() {
    setErr(''); setMsg('')
    if (!site.client_name.trim()) return setErr('Enter the client name.')
    if (!valid.length) return setErr('Add at least one opening with a width and height.')
    setSaving(true)
    try {
      // Reuse the client if this phone is already on file, otherwise create one.
      let clientId = null
      const phone = site.phone.trim()
      if (phone) {
        const { data: found } = await supabase.from('clients')
          .select('id').eq('company_id',companyId).eq('phone',phone).maybeSingle()
        clientId = found?.id || null
      }
      if (!clientId) {
        const { data: c, error: ce } = await supabase.from('clients').insert({
          company_id: companyId, name: site.client_name.trim(),
          phone: phone || '', address: site.address.trim()||null, tag:'individual', is_active:true,
        }).select().single()
        if (ce) throw ce
        clientId = c.id
      }

      const quoteNumber = 'Q-'+new Date().getFullYear()+'-'+String(Math.floor(Math.random()*9000)+1000)
      const { data: q, error: qe } = await supabase.from('quotes').insert({
        company_id: companyId, client_id: clientId,
        client_name: site.client_name.trim(), client_phone: phone||null,
        client_address: site.address.trim()||null,
        quote_number: quoteNumber, status:'draft', version:1,
        gst_rate:18, sub_total:0, base_amount:0, cgst_amount:0, sgst_amount:0, grand_total:0,
        expires_at: new Date(Date.now()+15*864e5).toISOString(),
        notes: [site.notes.trim(), 'Created from a site measurement.'].filter(Boolean).join('\n'),
      }).select().single()
      if (qe) throw qe

      // Price each opening from its window type where one was chosen.
      const lines = []
      for (const r of valid) {
        const w = Number(r.width_mm), h = Number(r.height_mm), qty = Number(r.qty)||1
        let unit = 0, detail = null, pc = null, gc = null, lc = 0, wc = 0
        if (r.typeId) {
          const { data: p } = await supabase.rpc('price_window', {
            p_window_type_id: r.typeId, p_width_mm: w, p_height_mm: h,
            p_glass_id: null, p_colour: null,
          })
          if (p) {
            unit = Math.round(p.unit_price||0); detail = p.lines||null
            pc = Math.round(p.profile_cost||0); gc = Math.round(p.glass_cost||0)
            lc = Math.round(p.labour_cost||0);  wc = Math.round(p.wastage_cost||0)
          }
        }
        lines.push({
          quote_id: q.id, company_id: companyId,
          title: (types.find(t=>t.id===r.typeId)?.name) || 'Opening',
          hardware_name: [r.room, r.note].filter(Boolean).join(' — ') || null,
          width_mm: w, height_mm: h, quantity: qty,
          item_value: unit, total_amount: Math.round(unit*qty*1.18),
          window_type_id: r.typeId||null,
          profile_cost: pc, glass_cost: gc, labour_cost: lc, wastage_cost: wc,
          profile_detail: detail,
        })
      }
      const { error: ie } = await supabase.from('quote_items').insert(lines)
      if (ie) throw ie

      const sub = Math.round(lines.reduce((s,l)=>s+l.item_value*l.quantity,0))
      const gst = Math.round(sub*0.18)
      const cgst = Math.floor(gst/2)
      await supabase.from('quotes').update({
        base_amount: sub, sub_total: sub,
        cgst_amount: cgst, sgst_amount: gst-cgst,
        grand_total: sub+gst,
      }).eq('id', q.id)

      localStorage.removeItem(LS_KEY)
      setMsg('Quote ' + quoteNumber + ' created.')
      setTimeout(()=>{ window.location.href='/quotes' }, 900)
    } catch(e) {
      setErr(e?.message || 'Could not create the quote.')
    } finally { setSaving(false) }
  }

  return (
    <div style={{fontFamily:'Inter,sans-serif'}}>
      <h2 style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:800,color:C.ink,marginBottom:4}}>Site Measurement</h2>
      <p style={{fontSize:13,color:C.mist,marginBottom:16,lineHeight:1.6}}>
        Record openings while you are at the site. Everything is kept on this phone as you type,
        so a weak signal will not lose it. Turn it into a priced quote when you are done.
      </p>

      {err && <div style={{background:'rgba(220,38,38,0.08)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:8,padding:'10px 13px',fontSize:13,color:C.red,marginBottom:12}}>{err}</div>}
      {msg && <div style={{background:'rgba(22,163,74,0.08)',border:'1px solid rgba(22,163,74,0.2)',borderRadius:8,padding:'10px 13px',fontSize:13,color:C.green,marginBottom:12}}>{msg}</div>}

      <div style={{background:C.snow,border:'1px solid '+C.glass,borderRadius:12,padding:14,marginBottom:14}}>
        <div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:800,color:C.ink,marginBottom:12}}>Site</div>
        <label style={LB}>Client name</label>
        <input value={site.client_name} onChange={e=>setSite({...site,client_name:e.target.value})}
          placeholder="Ravi Kumar" style={{...IS,fontFamily:'Inter,sans-serif',marginBottom:11}}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:11}}>
          <div><label style={LB}>Phone</label>
            <input type="tel" inputMode="numeric" value={site.phone} onChange={e=>setSite({...site,phone:e.target.value})}
              placeholder="98765 43210" style={IS}/></div>
          <div><label style={LB}>Address</label>
            <input value={site.address} onChange={e=>setSite({...site,address:e.target.value})}
              placeholder="Site location" style={{...IS,fontFamily:'Inter,sans-serif'}}/></div>
        </div>
        <label style={LB}>Site notes</label>
        <input value={site.notes} onChange={e=>setSite({...site,notes:e.target.value})}
          placeholder="Second floor, lift available" style={{...IS,fontFamily:'Inter,sans-serif'}}/>
      </div>

      {rooms.map((r,idx)=>(
        <div key={r.id} style={{background:C.snow,border:'1px solid '+C.glass,borderRadius:12,padding:14,marginBottom:11}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:11}}>
            <span style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:800,color:C.ink}}>Opening {idx+1}</span>
            <button onClick={()=>del(r.id)} style={{background:'none',border:'none',color:C.red,fontSize:12,fontWeight:600,cursor:'pointer'}}>Remove</button>
          </div>
          <label style={LB}>Room</label>
          <input value={r.room} onChange={e=>upd(r.id,'room',e.target.value)} placeholder="Master bedroom"
            style={{...IS,fontFamily:'Inter,sans-serif',marginBottom:11}}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 70px',gap:9,marginBottom:11}}>
            <div><label style={LB}>Width mm</label>
              <input type="number" inputMode="numeric" value={r.width_mm} onChange={e=>upd(r.id,'width_mm',e.target.value)}
                placeholder="1200" style={IS}/></div>
            <div><label style={LB}>Height mm</label>
              <input type="number" inputMode="numeric" value={r.height_mm} onChange={e=>upd(r.id,'height_mm',e.target.value)}
                placeholder="1200" style={IS}/></div>
            <div><label style={LB}>Qty</label>
              <input type="number" inputMode="numeric" min="1" value={r.qty} onChange={e=>upd(r.id,'qty',e.target.value)}
                style={IS}/></div>
          </div>
          {types.length>0 && (<>
            <label style={LB}>Window type</label>
            <select value={r.typeId} onChange={e=>upd(r.id,'typeId',e.target.value)}
              style={{...IS,fontFamily:'Inter,sans-serif',fontSize:14,marginBottom:11}}>
              <option value="">Decide later</option>
              {types.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </>)}
          <label style={LB}>Note</label>
          <input value={r.note} onChange={e=>upd(r.id,'note',e.target.value)}
            placeholder="Grill needed, sill 100mm" style={{...IS,fontFamily:'Inter,sans-serif'}}/>
          {Number(r.width_mm)>0 && Number(r.height_mm)>0 && (
            <div style={{fontSize:12,color:C.mist,marginTop:9,fontFamily:'JetBrains Mono,monospace'}}>
              {((Number(r.width_mm)/1000)*(Number(r.height_mm)/1000)*10.764).toFixed(2)} sqft each
            </div>
          )}
        </div>
      ))}

      <button onClick={addRoom} style={{...GHOST,width:'100%',marginBottom:14}}>+ Add opening</button>

      {valid.length>0 && (
        <div style={{background:C.chalk,border:'1px solid '+C.glass,borderRadius:12,padding:14,marginBottom:14}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:C.ink}}>
            <span>{valid.length} opening{valid.length===1?'':'s'}</span>
            <span style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700}}>{totalSqft.toFixed(2)} sqft</span>
          </div>
        </div>
      )}

      {types.length===0 && !loading && (
        <div style={{background:'rgba(217,119,6,0.08)',border:'1px solid rgba(217,119,6,0.25)',borderRadius:9,
                     padding:'11px 13px',fontSize:12,color:C.amber,marginBottom:14,lineHeight:1.6}}>
          No window types set up, so openings will save without a price.
          Add them in <a href="/designer" style={{color:C.amber,fontWeight:700}}>Designer</a> to price on the spot.
        </div>
      )}

      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        <button onClick={convertToQuote} disabled={saving||!valid.length}
          style={{...BTN,flex:2,minWidth:180,opacity:(saving||!valid.length)?0.5:1}}>
          {saving?'Creating quote...':'Create quote from measurements'}
        </button>
        <button onClick={()=>{ if(confirm('Clear this measurement sheet?')){ setSite({client_name:'',phone:'',address:'',notes:''}); setRooms([]); localStorage.removeItem(LS_KEY) } }}
          style={{...GHOST,flex:1,minWidth:100}}>Clear</button>
      </div>
    </div>
  )
}

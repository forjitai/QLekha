import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const C={ink:'#0F1923',steel:'#1B4FD8',steelLt:'#3B6FEA',copper:'#D97941',chalk:'#F7F8FA',glass:'#E8F4FD',mist:'#6B7A8D',fog:'#C4CDD8',snow:'#FFFFFF',green:'#16A34A',red:'#DC2626',amber:'#D97706',purp:'#7C3AED',teal:'#0EA5A0'}

const ROLES = ['outer_frame','track','sash','interlock','bead','mullion','other']
const ROLE_LABEL = { outer_frame:'Outer frame', track:'Track', sash:'Sash', interlock:'Interlock', bead:'Bead', mullion:'Mullion', other:'Other' }

const IS = {width:'100%',padding:'9px 11px',borderRadius:8,border:'1.5px solid '+C.fog,fontSize:13,
            fontFamily:'Inter,sans-serif',color:C.ink,background:C.snow,outline:'none',boxSizing:'border-box'}
const LB = {fontSize:10,fontWeight:700,color:C.mist,textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:4}
const BTN = {padding:'9px 16px',borderRadius:8,border:'none',background:C.steel,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'Syne,sans-serif'}
const GHOST = {...BTN,background:'transparent',border:'1.5px solid '+C.fog,color:C.ink,fontWeight:600}

export default function Designer() {
  const [tab, setTab] = useState('designs')
  const [profiles, setProfiles] = useState([])
  const [types, setTypes] = useState([])
  const [colours, setColours] = useState([])
  const [companyId, setCompanyId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [search, setSearch] = useState('')
  const [openType, setOpenType] = useState(null)
  const [addSku, setAddSku] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      if (!user) return setLoading(false)
      const { data: ud } = await supabase.from('users').select('company_id').eq('id',user.id).maybeSingle()
      if (!ud) return setLoading(false)
      setCompanyId(ud.company_id)
      const [pr, tr, cr] = await Promise.all([
        supabase.from('profiles').select('*').eq('company_id',ud.company_id).order('profile_code'),
        supabase.from('window_types').select('*,window_type_profiles(*)').eq('company_id',ud.company_id).order('name'),
        supabase.from('profile_weight_prices').select('*').eq('company_id',ud.company_id).order('colour'),
      ])
      setProfiles(pr.data||[]); setTypes(tr.data||[]); setColours(cr.data||[])
    } catch(e) { console.error('Designer load:', e?.message) }
    finally { setLoading(false) }
  }

  async function seedDefaults() {
    setErr(''); setMsg('')
    const { error } = await supabase.rpc('seed_window_designs')
    if (error) return setErr(error.message)
    setMsg('Starter profiles and window types added.')
    load()
  }

  async function updateCell(table, id, field, value, setter) {
    try {
      await supabase.from(table).update({ [field]: value }).eq('id', id)
      setter(prev => prev.map(r => r.id===id ? {...r,[field]:value} : r))
    } catch(e) { console.error('update:', e?.message) }
  }

  // ── CSV ──────────────────────────────────────────────────────────────────
  const CSV_COLS = ['profile_code','profile_name','brand','gi_name','weight_per_meter','price_per_kg','colour','hsn_code','system']

  function downloadTemplate() {
    const sample = [
      CSV_COLS.join(','),
      '101,2 Track Outer Frame,Jindal,GI 1.2,1.10,280,white,7610,sliding',
      '103,Sliding Window Sash,Jindal,GI 1.2,0.95,280,white,7610,sliding',
      '107,Interlock,Jindal,GI 1.2,0.60,280,white,7610,sliding',
    ].join('\n')
    const blob = new Blob([sample], { type:'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'qlekha-profiles-template.csv'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/).filter(Boolean)
    if (!lines.length) return []
    const head = lines[0].split(',').map(h => h.trim().toLowerCase())
    return lines.slice(1).map(line => {
      // handles quoted fields containing commas
      const cells = []; let cur = ''; let q = false
      for (const ch of line) {
        if (ch === '"') q = !q
        else if (ch === ',' && !q) { cells.push(cur); cur = '' }
        else cur += ch
      }
      cells.push(cur)
      const row = {}
      head.forEach((h, i) => { row[h] = (cells[i] ?? '').trim() })
      return row
    })
  }

  async function importCSV(file) {
    setErr(''); setMsg(''); setImporting(true)
    try {
      const rows = parseCSV(await file.text())
      const clean = rows
        .filter(r => r.profile_code && r.profile_name)
        .map(r => ({
          company_id: companyId,
          profile_code: r.profile_code,
          profile_name: r.profile_name,
          brand: r.brand || null,
          gi_name: r.gi_name || null,
          weight_per_meter: r.weight_per_meter ? Number(r.weight_per_meter) : null,
          price_per_kg: r.price_per_kg ? Number(r.price_per_kg) : 0,
          colour: r.colour || null,
          hsn_code: r.hsn_code || null,
          system: ['sliding','casement','fixed','door','partition','louvre','other'].includes((r.system||'').toLowerCase())
                  ? r.system.toLowerCase() : 'sliding',
        }))
      if (!clean.length) throw new Error('No valid rows. Each row needs at least profile_code and profile_name.')
      const bad = clean.filter(r => r.weight_per_meter == null || !(r.weight_per_meter > 0))
      const { error } = await supabase.from('profiles')
        .upsert(clean, { onConflict: 'company_id,profile_code' })
      if (error) throw error
      setMsg('Imported ' + clean.length + ' profiles.' +
        (bad.length ? ' ' + bad.length + ' have no weight per metre and will price as zero until you set it.' : ''))
      load()
    } catch(e) { setErr(e?.message || 'Import failed.') }
    finally { setImporting(false) }
  }

  function exportCSV() {
    const rows = [CSV_COLS.join(',')].concat(
      profiles.map(p => CSV_COLS.map(c => {
        const v = p[c] ?? ''
        return String(v).includes(',') ? '"'+v+'"' : v
      }).join(','))
    ).join('\n')
    const blob = new Blob([rows], { type:'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'qlekha-profiles.csv'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  const q = search.trim().toLowerCase()
  const shownSkus = profiles.filter(p => !q ||
    [p.profile_code,p.profile_name,p.brand,p.gi_name,p.colour].some(v => String(v??'').toLowerCase().includes(q)))

  return (
    <div style={{fontFamily:'Inter,sans-serif'}}>
      <h2 style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:800,color:C.ink,marginBottom:4}}>Window Designer</h2>
      <p style={{fontSize:13,color:C.mist,marginBottom:18,lineHeight:1.6}}>
        Profiles are your aluminium sections. A window type lists how much of each one a window uses,
        so a quote prices the whole window, not just its outer frame.
      </p>

      {err && <div style={{background:'rgba(220,38,38,0.08)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:8,padding:'10px 13px',fontSize:13,color:C.red,marginBottom:12}}>{err}</div>}
      {msg && <div style={{background:'rgba(22,163,74,0.08)',border:'1px solid rgba(22,163,74,0.2)',borderRadius:8,padding:'10px 13px',fontSize:13,color:C.green,marginBottom:12}}>{msg}</div>}

      <div style={{display:'flex',gap:6,marginBottom:16,background:C.snow,padding:4,borderRadius:10,border:'1px solid '+C.glass,width:'fit-content'}}>
        {[['designs','Window Types'],['skus','Profiles'],['rates','Colour Rates']].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{padding:'7px 14px',borderRadius:7,border:'none',cursor:'pointer',
            fontSize:13,fontWeight:tab===k?700:500,background:tab===k?C.ink:'transparent',color:tab===k?'#fff':C.mist}}>{l}</button>
        ))}
      </div>

      {loading ? <div style={{padding:40,textAlign:'center',color:C.mist}}>Loading...</div> : <>

      {/* ── WINDOW TYPES ─────────────────────────────────────────────── */}
      {tab==='designs' && (
        types.length===0 ? (
          <div style={{background:C.snow,borderRadius:16,border:'1px solid '+C.glass,padding:'48px 24px',textAlign:'center'}}>
            <div style={{fontSize:38,marginBottom:12}}>&#128208;</div>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:800,color:C.ink,marginBottom:6}}>No window types yet</div>
            <p style={{fontSize:13,color:C.mist,marginBottom:20,lineHeight:1.6,maxWidth:380,margin:'0 auto 20px'}}>
              Add the standard set — 2-track, 3-track, casement and fixed — with typical profiles and lengths. Everything stays editable.
            </p>
            <button onClick={seedDefaults} style={BTN}>Add starter window types</button>
          </div>
        ) : (
          <div style={{display:'grid',gap:12}}>
            {types.map(t=>(
              <div key={t.id} style={{background:C.snow,border:'1px solid '+C.glass,borderRadius:14,overflow:'hidden'}}>
                <div onClick={()=>setOpenType(openType===t.id?null:t.id)}
                  style={{padding:14,display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:15,color:C.ink}}>{t.name}</div>
                    <div style={{fontSize:12,color:C.mist,marginTop:2,textTransform:'capitalize'}}>
                      {t.system} · {t.shutters} shutter{t.shutters===1?'':'s'} · {(t.window_type_profiles||[]).length} profiles
                    </div>
                  </div>
                  <span style={{color:C.mist,fontSize:18}}>{openType===t.id?'\u2212':'+'}</span>
                </div>

                {openType===t.id && (
                  <div style={{borderTop:'1px solid '+C.chalk,padding:14,background:C.chalk}}>
                    <div style={{fontSize:12,color:C.mist,marginBottom:12,lineHeight:1.6}}>
                      Length in metres = <strong>W&times;</strong>width + <strong>H&times;</strong>height + fixed.
                      A 4-sided frame is W 2, H 2. Two sashes are W 4, H 4.
                    </div>
                    {(t.window_type_profiles||[]).map(l=>{
                      const p = profiles.find(x=>x.id===l.profile_id)
                      return (
                        <div key={l.id} style={{background:C.snow,border:'1px solid '+C.glass,borderRadius:10,padding:12,marginBottom:8}}>
                          <div style={{display:'flex',justifyContent:'space-between',gap:8,marginBottom:8}}>
                            <div style={{minWidth:0}}>
                              <div style={{fontWeight:600,fontSize:13,color:C.ink}}>{p?.profile_name || 'Unknown profile'}</div>
                              <div style={{fontSize:11,color:C.mist,fontFamily:'JetBrains Mono,monospace'}}>
                                {p?.profile_code} · {p?.weight_per_meter ?? '?'} kg/m
                              </div>
                            </div>
                            <span style={{padding:'2px 8px',borderRadius:100,fontSize:10,fontWeight:700,background:C.glass,color:C.steel,height:'fit-content',whiteSpace:'nowrap'}}>
                              {ROLE_LABEL[l.role]||l.role}
                            </span>
                          </div>
                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                            {[['w_coeff','W ×'],['h_coeff','H ×'],['fixed_m','Fixed m']].map(([f,lab])=>(
                              <div key={f}>
                                <label style={LB}>{lab}</label>
                                <input type="number" step="0.1" defaultValue={l[f]}
                                  onBlur={e=>{
                                    const v = Number(e.target.value)||0
                                    supabase.from('window_type_profiles').update({[f]:v}).eq('id',l.id)
                                    setTypes(prev=>prev.map(tt=>tt.id!==t.id?tt:{...tt,
                                      window_type_profiles:tt.window_type_profiles.map(x=>x.id===l.id?{...x,[f]:v}:x)}))
                                  }}
                                  style={{...IS,fontFamily:'JetBrains Mono,monospace'}}/>
                              </div>
                            ))}
                          </div>
                          <button onClick={async()=>{
                              if(!confirm('Remove this profile from '+t.name+'?')) return
                              await supabase.from('window_type_profiles').delete().eq('id',l.id)
                              setTypes(prev=>prev.map(tt=>tt.id!==t.id?tt:{...tt,
                                window_type_profiles:tt.window_type_profiles.filter(x=>x.id!==l.id)}))
                            }}
                            style={{marginTop:8,padding:'5px 9px',borderRadius:6,border:'1px solid rgba(220,38,38,0.25)',
                                    background:'rgba(220,38,38,0.06)',color:C.red,fontSize:11,fontWeight:600,cursor:'pointer'}}>Remove</button>
                        </div>
                      )
                    })}
                    <AddBomLine companyId={companyId} typeId={t.id} profiles={profiles} onAdd={line=>{
                      setTypes(prev=>prev.map(tt=>tt.id!==t.id?tt:{...tt,window_type_profiles:[...(tt.window_type_profiles||[]),line]}))
                    }}/>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* ── PROFILES / SKUs ──────────────────────────────────────────── */}
      {tab==='skus' && (
        <div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14,alignItems:'center'}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search profiles..."
              style={{...IS,width:'auto',flex:'1 1 160px',minWidth:140}}/>
            <button onClick={()=>setAddSku(true)} style={BTN}>+ Add</button>
            <label style={{...GHOST,display:'inline-flex',alignItems:'center',cursor:importing?'wait':'pointer'}}>
              {importing ? 'Importing...' : 'Import CSV'}
              <input type="file" accept=".csv,text/csv" disabled={importing} style={{display:'none'}}
                onChange={e=>{ const f=e.target.files?.[0]; if(f) importCSV(f); e.target.value='' }}/>
            </label>
            <button onClick={downloadTemplate} style={GHOST}>Template</button>
            {profiles.length>0 && <button onClick={exportCSV} style={GHOST}>Export</button>}
          </div>

          {shownSkus.length===0 ? (
            <div style={{background:C.snow,borderRadius:16,border:'1px solid '+C.glass,padding:'48px 24px',textAlign:'center'}}>
              <div style={{fontSize:38,marginBottom:12}}>&#128209;</div>
              <div style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:800,color:C.ink,marginBottom:6}}>No profiles yet</div>
              <p style={{fontSize:13,color:C.mist,marginBottom:20,lineHeight:1.6,maxWidth:400,margin:'0 auto 20px'}}>
                Import your supplier's price list as CSV, or add the starter set from the Window Types tab.
                Each profile needs a weight per metre — that is what turns length into cost.
              </p>
              <button onClick={downloadTemplate} style={GHOST}>Download template</button>
            </div>
          ) : (
            <div style={{display:'grid',gap:10}}>
              {shownSkus.map(p=>(
                <div key={p.id} style={{background:C.snow,border:'1px solid '+C.glass,borderRadius:12,padding:13,
                                        opacity:p.is_active===false?0.55:1}}>
                  <div style={{display:'flex',justifyContent:'space-between',gap:10,marginBottom:9}}>
                    <div style={{minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:14,color:C.ink}}>{p.profile_name}</div>
                      <div style={{fontSize:11,color:C.mist,fontFamily:'JetBrains Mono,monospace',marginTop:2}}>
                        {p.profile_code}{p.brand?' · '+p.brand:''}{p.gi_name?' · '+p.gi_name:''}
                      </div>
                    </div>
                    {p.colour && <span style={{padding:'2px 8px',borderRadius:100,fontSize:10,fontWeight:700,
                      background:C.glass,color:C.ink,height:'fit-content',textTransform:'capitalize',whiteSpace:'nowrap'}}>{p.colour}</span>}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <div>
                      <label style={LB}>Weight kg/m</label>
                      <input type="number" step="0.01" defaultValue={p.weight_per_meter ?? ''}
                        onBlur={e=>updateCell('profiles',p.id,'weight_per_meter', e.target.value===''?null:Number(e.target.value), setProfiles)}
                        style={{...IS,fontFamily:'JetBrains Mono,monospace',
                                borderColor: p.weight_per_meter ? C.fog : 'rgba(217,119,6,0.5)'}}/>
                    </div>
                    <div>
                      <label style={LB}>Rate ₹/kg</label>
                      <input type="number" step="1" defaultValue={p.price_per_kg ?? ''}
                        onBlur={e=>updateCell('profiles',p.id,'price_per_kg', Number(e.target.value)||0, setProfiles)}
                        style={{...IS,fontFamily:'JetBrains Mono,monospace'}}/>
                    </div>
                  </div>
                  {!p.weight_per_meter && (
                    <div style={{fontSize:11,color:C.amber,marginTop:7}}>
                      No weight set — this profile prices as zero.
                    </div>
                  )}
                  <div style={{display:'flex',gap:6,marginTop:10,borderTop:'1px solid '+C.chalk,paddingTop:10}}>
                    <button onClick={()=>updateCell('profiles',p.id,'is_active',!p.is_active,setProfiles)}
                      style={{padding:'5px 9px',borderRadius:6,border:'1px solid rgba(14,165,160,0.3)',background:'rgba(14,165,160,0.06)',
                              color:C.teal,fontSize:11,fontWeight:600,cursor:'pointer'}}>{p.is_active===false?'Activate':'Deactivate'}</button>
                    <button onClick={async()=>{
                        if(!confirm('Delete '+p.profile_name+'?')) return
                        const { error } = await supabase.from('profiles').delete().eq('id',p.id)
                        if (error) return setErr('In use by a window type — remove it there first.')
                        setProfiles(prev=>prev.filter(x=>x.id!==p.id))
                      }}
                      style={{padding:'5px 9px',borderRadius:6,border:'1px solid rgba(220,38,38,0.25)',background:'rgba(220,38,38,0.06)',
                              color:C.red,fontSize:11,fontWeight:600,cursor:'pointer'}}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── COLOUR RATES ─────────────────────────────────────────────── */}
      {tab==='rates' && (
        <div>
          <p style={{fontSize:13,color:C.mist,marginBottom:14,lineHeight:1.6}}>
            Rate per kg by finish. When a colour is set here it overrides the rate on the individual profile.
          </p>
          {colours.length===0 ? (
            <div style={{background:C.snow,borderRadius:16,border:'1px solid '+C.glass,padding:'40px 24px',textAlign:'center'}}>
              <p style={{fontSize:13,color:C.mist,marginBottom:16}}>No colour rates yet.</p>
              <button onClick={seedDefaults} style={BTN}>Add standard colours</button>
            </div>
          ) : (
            <div style={{display:'grid',gap:10}}>
              {colours.map(c=>(
                <div key={c.id} style={{background:C.snow,border:'1px solid '+C.glass,borderRadius:12,padding:13,
                                        display:'flex',alignItems:'center',gap:12}}>
                  <div style={{flex:1,fontWeight:600,fontSize:14,color:C.ink,textTransform:'capitalize'}}>
                    {String(c.colour).replace('_',' ')}
                  </div>
                  <div style={{width:120}}>
                    <label style={LB}>₹ per kg</label>
                    <input type="number" step="1" defaultValue={c.price_per_kg ?? 0}
                      onBlur={e=>updateCell('profile_weight_prices',c.id,'price_per_kg',Number(e.target.value)||0,setColours)}
                      style={{...IS,fontFamily:'JetBrains Mono,monospace'}}/>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </>}

      {addSku && <AddSkuModal companyId={companyId} onClose={()=>setAddSku(false)}
                   onDone={p=>{ setProfiles(prev=>[...prev,p].sort((a,b)=>String(a.profile_code).localeCompare(String(b.profile_code)))); setAddSku(false) }}/>}
    </div>
  )
}

function AddBomLine({ companyId, typeId, profiles, onAdd }) {
  const [open, setOpen] = useState(false)
  const [pid, setPid] = useState('')
  const [role, setRole] = useState('outer_frame')
  const [w, setW] = useState('2')
  const [h, setH] = useState('2')
  const [saving, setSaving] = useState(false)

  if (!open) return (
    <button onClick={()=>setOpen(true)} style={{...GHOST,width:'100%',marginTop:4}}>+ Add profile to this window type</button>
  )
  return (
    <div style={{background:C.snow,border:'1.5px solid '+C.steel,borderRadius:10,padding:12,marginTop:4}}>
      <label style={LB}>Profile</label>
      <select value={pid} onChange={e=>setPid(e.target.value)} style={{...IS,marginBottom:10}}>
        <option value="">Select a profile...</option>
        {profiles.filter(p=>p.is_active!==false).map(p=>(
          <option key={p.id} value={p.id}>{p.profile_code} — {p.profile_name}</option>
        ))}
      </select>
      <label style={LB}>Role</label>
      <select value={role} onChange={e=>setRole(e.target.value)} style={{...IS,marginBottom:10}}>
        {ROLES.map(r=><option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
      </select>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
        <div><label style={LB}>W ×</label>
          <input type="number" step="0.1" value={w} onChange={e=>setW(e.target.value)} style={{...IS,fontFamily:'JetBrains Mono,monospace'}}/></div>
        <div><label style={LB}>H ×</label>
          <input type="number" step="0.1" value={h} onChange={e=>setH(e.target.value)} style={{...IS,fontFamily:'JetBrains Mono,monospace'}}/></div>
      </div>
      <div style={{display:'flex',gap:8}}>
        <button onClick={()=>setOpen(false)} style={{...GHOST,flex:1}}>Cancel</button>
        <button disabled={saving||!pid} style={{...BTN,flex:2,opacity:pid?1:0.5}} onClick={async()=>{
          setSaving(true)
          const { data, error } = await supabase.from('window_type_profiles').insert({
            company_id: companyId, window_type_id: typeId, profile_id: pid,
            role, w_coeff: Number(w)||0, h_coeff: Number(h)||0, fixed_m: 0,
          }).select().single()
          setSaving(false)
          if (!error && data) { onAdd(data); setOpen(false); setPid('') }
        }}>{saving?'Adding...':'Add'}</button>
      </div>
    </div>
  )
}

function AddSkuModal({ companyId, onClose, onDone }) {
  const [f, setF] = useState({ profile_code:'', profile_name:'', brand:'', gi_name:'',
                               weight_per_meter:'', price_per_kg:'', colour:'white' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const up = (k,v) => setF(p=>({...p,[k]:v}))

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(15,25,35,0.5)',zIndex:200,
      display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.snow,borderRadius:16,width:'100%',maxWidth:420,
        padding:22,maxHeight:'86vh',overflowY:'auto',boxSizing:'border-box'}}>
        <div style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:800,color:C.ink,marginBottom:16}}>New profile</div>
        {err && <div style={{background:'rgba(220,38,38,0.08)',borderRadius:8,padding:'9px 12px',fontSize:12,color:C.red,marginBottom:12}}>{err}</div>}
        {[['profile_code','Code','e.g. 101'],['profile_name','Name','e.g. 2 Track Outer Frame'],
          ['brand','Brand','Jindal'],['gi_name','Gauge','GI 1.2']].map(([k,l,ph])=>(
          <div key={k} style={{marginBottom:11}}>
            <label style={LB}>{l}</label>
            <input value={f[k]} onChange={e=>up(k,e.target.value)} placeholder={ph} style={IS}/>
          </div>
        ))}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:11}}>
          <div><label style={LB}>Weight kg/m</label>
            <input type="number" step="0.01" value={f.weight_per_meter} onChange={e=>up('weight_per_meter',e.target.value)} placeholder="1.10" style={IS}/></div>
          <div><label style={LB}>Rate ₹/kg</label>
            <input type="number" step="1" value={f.price_per_kg} onChange={e=>up('price_per_kg',e.target.value)} placeholder="280" style={IS}/></div>
        </div>
        <div style={{marginBottom:16}}>
          <label style={LB}>Colour</label>
          <select value={f.colour} onChange={e=>up('colour',e.target.value)} style={IS}>
            {['white','black','grey','walnut','golden_oak'].map(c=><option key={c} value={c}>{c.replace('_',' ')}</option>)}
          </select>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={onClose} style={{...GHOST,flex:1}}>Cancel</button>
          <button disabled={saving} style={{...BTN,flex:2}} onClick={async()=>{
            setErr('')
            if (!f.profile_code.trim() || !f.profile_name.trim()) return setErr('Code and name are required.')
            setSaving(true)
            const { data, error } = await supabase.from('profiles').insert({
              company_id: companyId,
              profile_code: f.profile_code.trim(), profile_name: f.profile_name.trim(),
              brand: f.brand.trim()||null, gi_name: f.gi_name.trim()||null,
              weight_per_meter: f.weight_per_meter===''?null:Number(f.weight_per_meter),
              price_per_kg: Number(f.price_per_kg)||0, colour: f.colour,
            }).select().single()
            setSaving(false)
            if (error) return setErr(error.message.includes('uniq_profile_code') ? 'That code already exists.' : error.message)
            onDone(data)
          }}>{saving?'Saving...':'Add profile'}</button>
        </div>
      </div>
    </div>
  )
}

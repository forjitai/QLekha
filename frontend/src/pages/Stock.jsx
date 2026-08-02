import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

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
    if (error) return setErr(error?.message||error?.msg||JSON.stringify(error))
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

export default function Stock() {
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
                      <td style={{padding:'12px 14px'}}><button onClick={async()=>{if(confirm('Delete this profile?')){await supabase.from('profile_companies').delete().eq('id',p.id);setProfiles(prev=>prev.filter(x=>x.id!==p.id))}}} style={{padding:'4px 8px',borderRadius:6,border:'1px solid #EF444440',background:'#EF444408',color:'#EF4444',fontSize:11,cursor:'pointer'}}>Delete</button>
              <button onClick={async()=>{await supabase.from('profile_companies').update({is_active:!p.is_active}).eq('id',p.id);setProfiles(prev=>prev.map(x=>x.id===p.id?{...x,is_active:!x.is_active}:x))}} style={{padding:'4px 8px',borderRadius:6,border:'1px solid rgba(14,165,160,0.3)',background:'rgba(14,165,160,0.06)',color:'#0EA5A0',fontSize:11,cursor:'pointer'}}>{p.is_active?'Deactivate':'Activate'}</button style={{padding:'4px 8px',borderRadius:6,border:'1px solid rgba(239,68,68,0.2)',background:'rgba(239,68,68,0.06)',color:C.red,fontSize:11,cursor:'pointer'}}>Delete</button></td>
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

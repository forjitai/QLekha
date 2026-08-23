import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const C={ink:'#0F1923',steel:'#1B4FD8',steelLt:'#3B6FEA',copper:'#D97941',chalk:'#F7F8FA',glass:'#E8F4FD',mist:'#6B7A8D',fog:'#C4CDD8',snow:'#FFFFFF',green:'#16A34A',red:'#DC2626',amber:'#D97706',purp:'#7C3AED',teal:'#0EA5A0',navy:'#0F1923',blue:'#1B4FD8',blueLt:'#3B6FEA',bg:'#F7F8FA',white:'#FFFFFF',g100:'#E8F4FD',g200:'#C4CDD8',g400:'#6B7A8D',g50:'#F7F8FA',g600:'#374151',bluePale:'rgba(27,79,216,0.08)'}

function AddClientModal({ companyId, onClose, onDone }) {
  const [form, setForm] = useState({name:'',phone:'',email:'',address:'',city:'',tag:'individual',gst_number:''})
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const upd = (k,v) => setForm(p=>({...p,[k]:v}))
  const inp = {width:'100%',padding:'9px 12px',borderRadius:8,border:'1.5px solid '+C.fog,fontSize:13,fontFamily:'Inter,sans-serif',color:C.ink,outline:'none',boxSizing:'border-box',marginBottom:12}
  const lb = {fontSize:11,fontWeight:700,color:C.mist,textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:4}
  const TAGS = ['individual','contractor','builder','dealer','architect','corporate']

  async function submit() {
    if (!form.name.trim()) return setErr('Client name is required.')
    setLoading(true)
    const { error } = await supabase.from('clients').insert({ ...form, company_id: companyId, is_active: true })
    setLoading(false)
    if (error) return setErr(error?.message||error?.msg||JSON.stringify(error))
    onDone()
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:C.snow,borderRadius:16,width:'100%',maxWidth:460,boxShadow:'0 24px 64px rgba(11,31,58,0.2)',overflow:'hidden',maxHeight:'90vh',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'14px 18px',borderBottom:'1px solid '+C.glass,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,color:C.ink}}>Add Client</div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:C.mist}}>&#215;</button>
        </div>
        <div style={{padding:18,overflowY:'auto'}}>
          {err&&<div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:8,padding:'9px 12px',fontSize:13,color:C.red,marginBottom:12}}>{err}</div>}
          <label style={lb}>Name *</label><input value={form.name} onChange={e=>upd('name',e.target.value)} placeholder="Client or company name" style={inp}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}>
            <div><label style={lb}>Phone</label><input type="tel" value={form.phone} onChange={e=>upd('phone',e.target.value)} placeholder="+91 98765 43210" style={inp}/></div>
            <div><label style={lb}>Email</label><input type="email" value={form.email} onChange={e=>upd('email',e.target.value)} placeholder="client@email.com" style={inp}/></div>
          </div>
          <label style={lb}>Address</label><input value={form.address} onChange={e=>upd('address',e.target.value)} placeholder="Street, area" style={inp}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}>
            <div><label style={lb}>City</label><input value={form.city} onChange={e=>upd('city',e.target.value)} placeholder="Bengaluru" style={inp}/></div>
            <div><label style={lb}>GST Number</label><input value={form.gst_number} onChange={e=>upd('gst_number',e.target.value)} placeholder="Optional" style={inp}/></div>
          </div>
          <label style={lb}>Tag</label>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
            {TAGS.map(t=><button key={t} onClick={()=>upd('tag',t)} style={{padding:'5px 10px',borderRadius:7,border:'1.5px solid '+(form.tag===t?C.steel:C.fog),background:form.tag===t?C.blue+'10':C.snow,color:form.tag===t?C.steel:C.ink,fontSize:11,fontWeight:600,cursor:'pointer',textTransform:'capitalize'}}>{t}</button>)}
          </div>
          <button onClick={submit} disabled={loading} style={{width:'100%',padding:12,borderRadius:10,border:'none',background:C.steel,color:'#fff',fontSize:13,fontWeight:700,cursor:loading?'default':'pointer',fontFamily:'Syne,sans-serif'}}>
            {loading?'Saving...':'Add Client'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AddLeadModal({ companyId, onClose, onDone }) {
  const [form, setForm] = useState({ name:'', phone:'', source:'walkin', status:'new', value_estimate:'' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const up = (k,v) => setForm(p => ({...p,[k]:v}))
  const IS = {width:'100%',padding:'10px 12px',borderRadius:8,border:'1.5px solid '+C.fog,fontSize:13,
              color:C.ink,background:C.snow,outline:'none',marginBottom:12,boxSizing:'border-box',fontFamily:'Inter,sans-serif'}
  async function save() {
    setErr('')
    if (!form.name.trim()) return setErr('Lead name is required.')
    setSaving(true)
    const { data, error } = await supabase.from('leads').insert({
      company_id: companyId,
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      source: form.source,
      status: form.status,
      value_estimate: form.value_estimate === '' ? null : Number(form.value_estimate),
    }).select().single()
    setSaving(false)
    if (error) return setErr(error?.message || 'Could not save the lead.')
    onDone(data)
  }
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(15,25,35,0.5)',zIndex:200,
      display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.snow,borderRadius:16,width:'100%',maxWidth:400,padding:24,boxSizing:'border-box'}}>
        <div style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:800,color:C.ink,marginBottom:16}}>New lead</div>
        {err && <div style={{background:'rgba(220,38,38,0.08)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:8,padding:'9px 12px',fontSize:12,color:C.red,marginBottom:12}}>{err}</div>}
        <input value={form.name} onChange={e=>up('name',e.target.value)} placeholder="Lead name" style={IS}/>
        <input type="tel" value={form.phone} onChange={e=>up('phone',e.target.value)} placeholder="Phone (optional)" style={IS}/>
        <select value={form.source} onChange={e=>up('source',e.target.value)} style={IS}>
          {['walkin','referral','website','instagram','facebook','justdial','other'].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <input type="number" value={form.value_estimate} onChange={e=>up('value_estimate',e.target.value)} placeholder="Estimated value (Rs.)" style={IS}/>
        <div style={{display:'flex',gap:10,marginTop:4}}>
          <button onClick={onClose} style={{flex:1,padding:11,borderRadius:8,border:'1.5px solid '+C.fog,background:'transparent',color:C.ink,fontSize:13,fontWeight:600,cursor:'pointer'}}>Cancel</button>
          <button onClick={save} disabled={saving} style={{flex:2,padding:11,borderRadius:8,border:'none',background:C.steel,color:C.snow,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'Syne,sans-serif'}}>{saving?'Saving...':'Add lead'}</button>
        </div>
      </div>
    </div>
  )
}

export default function CRM() {
  const [tab, setTab] = useState('clients')
  const [clients, setClients] = useState([])
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [search, setSearch] = useState('')
  const [addClient, setAddClient] = useState(false)
  const [addLead, setAddLead] = useState(false)
  const [selClient, setSelClient] = useState(null)

  useEffect(()=>{load()},[])

  async function load() {
    setLoading(true)
    try {
    const{data:{user}}=await supabase.auth.getUser()
    if(!user)return setLoading(false)
    const{data:ud}=await supabase.from('users').select('company_id,companies(name)').eq('id',user.id).single()
    if(!ud)return setLoading(false)
    setProfile(ud)
    const cid=ud.company_id
    const[cr,lr]=await Promise.all([
      supabase.from('clients').select('*').eq('company_id',cid).order('created_at',{ascending:false}),
      supabase.from('leads').select('*').eq('company_id',cid).order('created_at',{ascending:false}),
    ])
    setClients(cr.data||[])
    setLeads(lr.data||[])
      } catch(e) {
      console.error("CRM load:", e?.message || JSON.stringify(e))
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = clients.filter(c=>[c.name,c.phone,c.city,c.email].some(v=>v?.toLowerCase().includes(search.toLowerCase())))
  const filteredLeads = leads.filter(l=>[l.name,l.phone,l.source].some(v=>v?.toLowerCase().includes(search.toLowerCase())))

  const TAG_COLORS = {
    individual: {bg:C.blue+'15',c:C.steel},
    contractor:  {bg:C.teal+'15',c:C.teal},
    builder:     {bg:C.purp+'15',c:C.purp},
    dealer:      {bg:C.amber+'15',c:C.amber},
    architect:        {bg:C.green+'15',c:C.green},
    other:       {bg:C.glass,c:C.mist},
  }
  const LEAD_STATUS = {
    new:         {bg:'rgba(27,79,216,0.1)',c:C.steel},
    contacted:  {bg:'rgba(14,165,160,0.1)',c:C.teal},
    quoted:     {bg:'rgba(139,92,246,0.1)',c:C.purp},
    won:        {bg:'rgba(34,197,94,0.1)',c:C.green},
    lost:       {bg:'rgba(239,68,68,0.08)',c:C.red},
    negotiating: {bg:'rgba(217,119,6,0.1)',c:C.amber},
  }

  return (
    <div style={{fontFamily:'Inter,sans-serif'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <h2 style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:700,color:C.ink}}>CRM</h2>
        <div style={{display:'flex',gap:8}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search clients..." style={{padding:'8px 12px',borderRadius:8,border:'1px solid '+C.fog,fontSize:13,outline:'none',width:200,fontFamily:'Inter,sans-serif'}}/>
          {tab==='leads'&&<button onClick={()=>setAddLead(true)} style={{background:'#0EA5A0',color:'#fff',border:'none',padding:'7px 14px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',marginLeft:'auto'}}>+ Add Lead</button>}{tab==='clients'&&<button onClick={()=>setAddClient(true)} style={{background:C.steel,color:'#fff',border:'none',padding:'8px 16px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>+ Add Client</button>}
        </div>
      </div>

      {/* Summary */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12,marginBottom:20}}>
        {[
          {i:'&#128100;',v:String(clients.length),l:'Total Clients',c:C.steel},
          {i:'&#127919;',v:String(leads.filter(l=>l.status!=='won'&&l.status!=='lost').length),l:'Open Leads',c:C.teal},
          {i:'&#127881;',v:String(leads.filter(l=>l.status==='won').length),l:'Won Leads',c:C.green},
          {i:'&#128176;',v:fmt(clients.reduce((s,c)=>s+(c.total_billed||0),0)),l:'Total Billed',c:C.amber},
        ].map(k=>(
          <div key={k.l} style={{background:C.snow,borderRadius:12,padding:14,border:'1px solid '+C.glass,borderLeft:'3px solid '+k.c}}>
            <div style={{fontSize:18,marginBottom:6}} dangerouslySetInnerHTML={{__html:k.i}}/>
            <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:18,fontWeight:500,color:C.ink,marginBottom:2}}>{k.v}</div>
            <div style={{fontSize:11,color:C.mist}}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:0,background:C.snow,border:'1px solid '+C.glass,borderRadius:10,padding:3,marginBottom:16,width:'fit-content'}}>
        {[{k:'clients',l:'Clients'},{k:'leads',l:'Leads'}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:'7px 20px',borderRadius:8,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,background:tab===t.k?C.ink:'transparent',color:tab===t.k?'#fff':C.mist,transition:'all 0.15s'}}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Clients table */}
      {tab==='clients'&&(
        <div style={{background:C.snow,borderRadius:16,border:'1px solid '+C.glass,overflow:'hidden'}}>
          {loading?<div style={{padding:40,textAlign:'center',color:C.mist}}>Loading...</div>:filteredClients.length===0?(
            <div style={{padding:60,textAlign:'center'}}>
              <div style={{fontSize:40,marginBottom:12}}>&#128100;</div>
              <p style={{color:C.mist,marginBottom:16}}>{search?'No clients match "'+search+'"':'No clients yet.'}</p>
              {!search&&<button onClick={()=>setAddClient(true)} style={{background:C.steel,color:'#fff',border:'none',padding:'10px 20px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>Add First Client</button>}
            </div>
          ):(
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{background:C.chalk}}>{['Client','Phone','City','Tag','Quotes','Total Billed','Balance','Actions'].map(h=><th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:C.mist,borderBottom:'1px solid '+C.glass}}>{h}</th>)}</tr></thead>
                <tbody>
                  {filteredClients.map((c,i)=>{
                    const tc = TAG_COLORS[c.tag]||TAG_COLORS.other
                    const balance = (c.total_billed||0)-(c.total_paid||0)
                    return(
                      <tr key={c.id} style={{borderBottom:'1px solid '+C.chalk,cursor:'pointer'}} onClick={()=>setSelClient(selClient?.id===c.id?null:c)}>
                        <td style={{padding:'12px 14px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,'+C.blue+','+C.teal+')',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,color:'#fff',flexShrink:0}}>
                              {(c.name||'?')[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{fontWeight:600,fontSize:13,color:C.ink}}>{c.name}</div>
                              <div style={{fontSize:11,color:C.mist}}>{c.email||''}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{padding:'12px 14px',fontSize:12,color:C.ink}}>{c.phone||'—'}</td>
                        <td style={{padding:'12px 14px',fontSize:12,color:C.ink}}>{c.city||'—'}</td>
                        <td style={{padding:'12px 14px'}}><span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:6,background:tc.bg,color:tc.c,textTransform:'capitalize'}}>{c.tag||'other'}</span></td>
                        <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12,textAlign:'center'}}>{c.total_quotes||0}</td>
                        <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12,color:C.ink,fontWeight:500}}>{fmt(c.total_billed||0)}</td>
                        <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12,color:balance>0?C.amber:C.green,fontWeight:600}}>{balance>0?fmt(balance):'Paid &#10003;'}</td>
                        <td style={{padding:'12px 14px'}}>
                          <div style={{display:'flex',gap:6}}>
                            <a href={'/quotes/create?client='+c.id} style={{padding:'4px 10px',borderRadius:6,border:'1px solid '+C.blue+'40',background:C.blue+'10',color:C.steel,fontSize:11,fontWeight:600,textDecoration:'none'}}>Quote</a>
                            {c.phone&&<a href={'https://wa.me/'+c.phone.replace(/\D/g,'')} target="_blank" rel="noopener noreferrer" style={{padding:'4px 8px',borderRadius:6,border:'1px solid rgba(37,211,102,0.3)',background:'rgba(37,211,102,0.06)',color:'#25D366',fontSize:11,fontWeight:600,textDecoration:'none'}}>WA</a>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div style={{padding:'10px 14px',background:C.chalk,borderTop:'1px solid '+C.glass,fontSize:11,color:C.mist}}>{filteredClients.length} clients</div>
            </div>
          )}
        </div>
      )}

      {/* Leads table */}
      {tab==='leads'&&(
        <div style={{background:C.snow,borderRadius:16,border:'1px solid '+C.glass,overflow:'hidden'}}>
          {loading?<div style={{padding:40,textAlign:'center',color:C.mist}}>Loading...</div>:filteredLeads.length===0?(
            <div style={{padding:60,textAlign:'center'}}>
              <div style={{fontSize:40,marginBottom:12}}>&#127919;</div>
              <p style={{color:C.mist,marginBottom:16}}>{search?'No leads match "'+search+'"':'No leads yet. Add leads from enquiries.'}</p>
            </div>
          ):(
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{background:C.chalk}}>{['Name','Phone','Source','Status','Est. Value','Follow-up',''].map(h=><th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:C.mist,borderBottom:'1px solid '+C.glass}}>{h}</th>)}</tr></thead>
                <tbody>
                  {filteredLeads.map((l,i)=>{
                    const ls = LEAD_STATUS[l.status]||LEAD_STATUS.open
                    return(
                      <tr key={l.id} style={{borderBottom:'1px solid '+C.chalk}}>
                        <td style={{padding:'12px 14px',fontWeight:600,fontSize:13,color:C.ink}}>{l.name||'Unnamed'}</td>
                        <td style={{padding:'12px 14px',fontSize:12,color:C.ink}}>{l.phone||'—'}</td>
                        <td style={{padding:'12px 14px'}}><span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:6,background:C.glass,color:C.ink,textTransform:'capitalize'}}>{l.source||'other'}</span></td>
                        <td style={{padding:'12px 14px'}}><span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:100,background:ls.bg,color:ls.c,textTransform:'capitalize'}}>{(l.status||'new').replace('_',' ')}</span></td>
                        <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12,color:C.ink}}>{l.value_estimate?fmt(l.value_estimate):'—'}</td>
                        <td style={{padding:'12px 14px',fontSize:12,color:l.follow_up_date&&new Date(l.follow_up_date)<new Date()?C.red:C.mist}}>
                          {l.follow_up_date?new Date(l.follow_up_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'}):'—'}
                        </td>
                        <td style={{padding:'12px 14px'}}>
                          <select value={l.status||'new'} onChange={async e=>{await supabase.from('leads').update({status:e.target.value}).eq('id',l.id);setLeads(prev=>prev.map(x=>x.id===l.id?{...x,status:e.target.value}:x))}} onClick={e=>e.stopPropagation()} style={{padding:'4px 8px',borderRadius:6,border:'1px solid '+C.fog,fontSize:11,color:C.ink,cursor:'pointer',outline:'none'}}>
                            {Object.keys(LEAD_STATUS).map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {addLead&&<AddLeadModal companyId={profile?.company_id} onClose={()=>setAddLead(false)} onDone={(l)=>{setLeads(p=>[l,...p]);setAddLead(false)}}/>}
      {addClient&&<AddClientModal companyId={profile?.company_id} onClose={()=>setAddClient(false)} onDone={()=>{setAddClient(false);load()}}/>}
    </div>
  )
}

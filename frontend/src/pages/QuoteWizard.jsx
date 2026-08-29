import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { generateQuotePDF, getPDFDataUri } from '../lib/pdfgen'

const C={ink:'#0F1923',steel:'#1B4FD8',steelLt:'#3B6FEA',copper:'#D97941',chalk:'#F7F8FA',glass:'#E8F4FD',mist:'#6B7A8D',fog:'#C4CDD8',snow:'#FFFFFF',green:'#16A34A',red:'#DC2626',amber:'#D97706',purp:'#7C3AED',teal:'#0EA5A0',navy:'#0F1923',blue:'#1B4FD8',blueLt:'#3B6FEA',bg:'#F7F8FA',white:'#FFFFFF',g100:'#E8F4FD',g200:'#C4CDD8',g400:'#6B7A8D',g50:'#F7F8FA',g600:'#374151',bluePale:'rgba(27,79,216,0.08)'}

const IS = {width:'100%',padding:'10px 12px',borderRadius:8,border:'1.5px solid '+C.fog,fontSize:13,fontFamily:'Inter,sans-serif',color:C.ink,background:C.snow,outline:'none',marginBottom:12,boxSizing:'border-box'}
const LB = {fontSize:11,fontWeight:700,color:C.mist,textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:4}
// STEP 1: Client
function Step1({profile,onNext,initial}){
  const[clients,setClients]=useState([])
  const[search,setSearch]=useState('')
  const[selected,setSelected]=useState(initial||null)
  const[adding,setAdding]=useState(false)
  const[form,setForm]=useState({name:'',phone:'',email:'',city:'',tag:'individual'})
  const[loading,setLoading]=useState(false)
  const[err,setErr]=useState('')
  const upd=(k,v)=>setForm(p=>({...p,[k]:v}))

  useEffect(()=>{
    if(!profile?.company_id)return
    supabase.from('clients').select('id,name,phone,email,city,tag').eq('company_id',profile.company_id).order('name').then(({data})=>setClients(data||[]))
  },[profile])

  const filtered=clients.filter(c=>c.name?.toLowerCase().includes(search.toLowerCase())||c.phone?.includes(search))

  async function addClient(){
    try {
    if(!form.name.trim())return setErr('Name required')
    setLoading(true)
    const{data,error}=await supabase.from('clients').insert({...form,company_id:profile.company_id,is_active:true}).select().single()
    setLoading(false)
    if(error)return setErr(error?.message||error?.msg||JSON.stringify(error))
    setClients(p=>[data,...p])
    setSelected(data)
    setAdding(false)
    setForm({name:'',phone:'',email:'',city:'',tag:'individual'})
    setErr('')
      } catch(e) { setErr(e?.message||JSON.stringify(e)) }
  }

  const TC={individual:C.steel,commercial:C.teal,builder:C.purp,dealer:C.amber,govt:C.green,other:C.mist}

  return(
    <div>
      <div style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,color:C.ink,marginBottom:4}}>Select Client</div>
      <p style={{fontSize:13,color:C.mist,marginBottom:16}}>Who is this quote for?</p>
      {selected&&(
        <div style={{background:'rgba(26,111,232,0.06)',border:'2px solid '+C.steel,borderRadius:12,padding:'12px 16px',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontWeight:700,fontSize:14,color:C.ink}}>{selected.name}</div>
            <div style={{fontSize:12,color:C.mist}}>{[selected.phone,selected.city].filter(Boolean).join(' · ')}</div>
          </div>
          <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',color:C.mist,cursor:'pointer',fontSize:18}}>✕</button>
        </div>
      )}
      {!selected&&(
        <>
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search clients..." style={{...IS,marginBottom:0,flex:1}}/>
            <button onClick={()=>setAdding(v=>!v)} style={{padding:'10px 14px',borderRadius:9,border:'1.5px solid '+C.steel,background:adding?C.steel:'transparent',color:adding?'#fff':C.steel,fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>+ New</button>
          </div>
          {adding&&(
            <div style={{background:C.chalk,borderRadius:12,padding:16,marginBottom:12,border:'1px solid '+C.glass}}>
              <div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,color:C.ink,marginBottom:12}}>New Client</div>
              {err&&<div style={{background:'rgba(239,68,68,0.08)',borderRadius:8,padding:'8px 12px',fontSize:12,color:C.red,marginBottom:10}}>{err}</div>}
              <label style={LB}>Name *</label>
              <input value={form.name} onChange={e=>upd('name',e.target.value)} placeholder="Client name" style={IS}/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}>
                <div><label style={LB}>Phone</label><input type="tel" value={form.phone} onChange={e=>upd('phone',e.target.value)} placeholder="+91 98765..." style={IS}/></div>
                <div><label style={LB}>City</label><input value={form.city} onChange={e=>upd('city',e.target.value)} placeholder="Bengaluru" style={IS}/></div>
              </div>
              <label style={LB}>Tag</label>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
                {['individual','builder','contractor','dealer','architect','corporate'].map(t=>(
                  <button key={t} onClick={()=>upd('tag',t)} style={{padding:'4px 10px',borderRadius:6,border:'1.5px solid '+(form.tag===t?C.steel:C.fog),background:form.tag===t?C.blue+'10':C.snow,color:form.tag===t?C.steel:C.ink,fontSize:11,fontWeight:600,cursor:'pointer',textTransform:'capitalize'}}>{t}</button>
                ))}
              </div>
              <button onClick={addClient} disabled={loading} style={{width:'100%',padding:'10px',borderRadius:9,border:'none',background:C.steel,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>{loading?'Saving...':'Add Client'}</button>
            </div>
          )}
          <div style={{maxHeight:280,overflowY:'auto',display:'flex',flexDirection:'column',gap:6}}>
            {filtered.length===0&&<div style={{padding:20,textAlign:'center',color:C.mist,fontSize:13}}>No clients found</div>}
            {filtered.map(c=>(
              <div key={c.id} onClick={()=>setSelected(c)} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 14px',borderRadius:10,border:'1.5px solid '+C.glass,background:C.snow,cursor:'pointer'}}>
                <div style={{width:34,height:34,borderRadius:'50%',background:'linear-gradient(135deg,'+C.blue+','+C.teal+')',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,color:'#fff',flexShrink:0}}>{c.name[0].toUpperCase()}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:13,color:C.ink}}>{c.name}</div>
                  <div style={{fontSize:11,color:C.mist}}>{[c.phone,c.city].filter(Boolean).join(' · ')}</div>
                </div>
                <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:6,background:(TC[c.tag]||C.mist)+'15',color:TC[c.tag]||C.mist,textTransform:'capitalize'}}>{c.tag}</span>
              </div>
            ))}
          </div>
        </>
      )}
      <button onClick={()=>selected&&onNext(selected)} disabled={!selected} style={{width:'100%',marginTop:20,padding:'13px',borderRadius:10,border:'none',background:selected?C.steel:'#ccc',color:'#fff',fontSize:14,fontWeight:700,cursor:selected?'pointer':'default',fontFamily:'Syne,sans-serif'}}>Continue →</button>
    </div>
  )
}

// STEP 2: Windows
function Step2({onNext,onBack,initial}){
  const TYPES=['Sliding 2-Track','Sliding 3-Track','Casement','Fixed','Tilt & Turn','Louvre','Bay Window','Skylight','Door']
  const[items,setItems]=useState(initial&&initial.length>0?initial:[{id:1,type:'Sliding 2-Track',width:1200,height:1200,qty:1,note:''}])
  const[nextId,setNextId]=useState(2)

  function addWindow(){setItems(p=>[...p,{id:nextId,type:'Sliding 2-Track',width:1200,height:1200,qty:1,note:''}]);setNextId(n=>n+1)}
  function remove(id){setItems(p=>p.filter(x=>x.id!==id))}
  function upd(id,k,v){setItems(p=>p.map(x=>x.id===id?{...x,[k]:v}:x))}

  return(
    <div>
      <div style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,color:C.ink,marginBottom:4}}>Windows</div>
      <p style={{fontSize:13,color:C.mist,marginBottom:16}}>Add each window with size and quantity.</p>
      <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:16}}>
        {items.map((item,idx)=>(
          <div key={item.id} style={{background:C.chalk,borderRadius:12,padding:16,border:'1px solid '+C.glass}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <span style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,color:C.ink}}>Window {idx+1}</span>
              {items.length>1&&<button onClick={()=>remove(item.id)} style={{background:'none',border:'none',color:C.red,cursor:'pointer',fontSize:16}}>✕</button>}
            </div>
            <label style={LB}>Type</label>
            <select value={item.type} onChange={e=>upd(item.id,'type',e.target.value)} style={{...IS,appearance:'none'}}>
              {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 80px',gap:'0 10px'}}>
              <div>
                <label style={LB}>Width (mm)</label>
                <input type="number" value={item.width} onChange={e=>upd(item.id,'width',parseInt(e.target.value)||0)} style={IS}/>
              </div>
              <div>
                <label style={LB}>Height (mm)</label>
                <input type="number" value={item.height} onChange={e=>upd(item.id,'height',parseInt(e.target.value)||0)} style={IS}/>
              </div>
              <div>
                <label style={LB}>Qty</label>
                <input type="number" min="1" value={item.qty} onChange={e=>upd(item.id,'qty',parseInt(e.target.value)||1)} style={IS}/>
              </div>
            </div>
            <label style={LB}>Note (optional)</label>
            <input value={item.note} onChange={e=>upd(item.id,'note',e.target.value)} placeholder="e.g. Tinted glass, powder coat..." style={{...IS,marginBottom:0}}/>
          </div>
        ))}
      </div>
      <button onClick={addWindow} style={{width:'100%',padding:'10px',borderRadius:9,border:'2px dashed '+C.fog,background:'transparent',color:C.mist,fontSize:13,fontWeight:600,cursor:'pointer',marginBottom:20}}>+ Add Window</button>
      <div style={{display:'flex',gap:10}}>
        <button onClick={onBack} style={{flex:1,padding:'13px',borderRadius:10,border:'1.5px solid '+C.fog,background:'transparent',color:C.ink,fontSize:14,fontWeight:600,cursor:'pointer'}}>← Back</button>
        <button onClick={()=>items.length>0&&onNext(items)} style={{flex:2,padding:'13px',borderRadius:10,border:'none',background:C.steel,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'Syne,sans-serif'}}>Continue →</button>
      </div>
    </div>
  )
}

// STEP 3: Materials & Pricing
function Step3({windows,profile,onNext,onBack,initial}){
  const[profiles,setProfiles]=useState([])
  const[glass,setGlass]=useState([])
  const[loading,setLoading]=useState(true)
  const[items,setItems]=useState(initial||windows.map((w,i)=>({
    id:i+1,windowId:w.id,title:w.type,description:w.note,
    width_mm:w.width,height_mm:w.height,quantity:w.qty,
    unit_price:0,gst_rate:18,total_amount:0,
    profileId:'',glassId:'',installation:0
  })))

  useEffect(()=>{
    if(!profile?.company_id)return
    Promise.all([
      supabase.from('profile_companies').select('id,brand,series,weight_per_meter,price_per_kg').eq('company_id',profile.company_id),
      supabase.from('glass_types').select('id,name,price_per_sqft').eq('company_id',profile.company_id)
    ]).then(([pr,gr])=>{
      setProfiles(pr.data||[])
      setGlass(gr.data||[])
      setLoading(false)
    })
  },[profile])

  // Returns the per-unit cost and its breakdown so it can be stored and shown.
  // Installation is a quote-level charge only - adding it here would multiply it
  // by quantity and tax it, then it is added again on the totals step.
  function priceBreakdown(item,profileId,glassId){
    const sqft=(item.width_mm/1000)*(item.height_mm/1000)*10.764
    const perimeterM=((item.width_mm+item.height_mm)*2)/1000
    const prof=profiles.find(p=>p.id===profileId)
    const gl=glass.find(g=>g.id===glassId)
    const profileCost=prof&&prof.weight_per_meter&&prof.price_per_kg
      ? Math.round(prof.weight_per_meter*prof.price_per_kg*perimeterM) : 0
    const glassCost=gl&&gl.price_per_sqft ? Math.round(gl.price_per_sqft*sqft) : 0
    return { profileCost, glassCost, unit: profileCost+glassCost }
  }
  function calcPrice(item,profileId,glassId){
    return priceBreakdown(item,profileId,glassId).unit
  }

  function upd(id,k,v){
    setItems(prev=>prev.map(it=>{
      if(it.id!==id)return it
      const updated={...it,[k]:v}
      if(['profileId','glassId','installation'].includes(k)||k==='unit_price'){
        const auto=k!=='unit_price'?calcPrice(updated,updated.profileId,updated.glassId):null
        const price=k==='unit_price'?parseFloat(v)||0:(auto||0)
        const bd=priceBreakdown(updated,updated.profileId,updated.glassId)
        updated.profile_cost=bd.profileCost
        updated.glass_cost=bd.glassCost
        updated.unit_price=price
        updated.total_amount=Math.round(price*updated.quantity*(1+updated.gst_rate/100))
      }
      if(k==='quantity'||k==='gst_rate'){
        updated.total_amount=Math.round(updated.unit_price*(parseInt(v)||1)*(1+updated.gst_rate/100))
      }
      return updated
    }))
  }

  // Match Step 4 exactly: round the subtotal and the tax once, not per line,
  // otherwise the figure here can differ by a rupee or two from the saved quote.
  const stepSubtotal = Math.round(items.reduce((s,i)=>s+(i.unit_price*i.quantity),0))
  const stepGst      = Math.round(items.reduce((s,i)=>s+(i.unit_price*i.quantity*(i.gst_rate||0)/100),0))
  const grandTotal   = stepSubtotal + stepGst

  if(loading)return<div style={{padding:40,textAlign:'center',color:C.mist}}>Loading stock...</div>

  return(
    <div>
      <div style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,color:C.ink,marginBottom:4}}>Pricing</div>
      <p style={{fontSize:13,color:C.mist,marginBottom:16}}>Set price per window. Pick profile and glass to auto-calculate.</p>
      <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:16}}>
        {items.map((item,idx)=>(
          <div key={item.id} style={{background:C.chalk,borderRadius:12,padding:16,border:'1px solid '+C.glass}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div>
                <div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,color:C.ink}}>{item.title}</div>
                <div style={{fontSize:11,color:C.mist}}>{item.width_mm}×{item.height_mm}mm · Qty {item.quantity}</div>
              </div>
              <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:14,fontWeight:700,color:C.steel}}>₹{item.total_amount.toLocaleString('en-IN')}</div>
            </div>
            {profiles.length>0&&(
              <>
                <label style={LB}>Profile</label>
                <select value={item.profileId} onChange={e=>upd(item.id,'profileId',e.target.value)} style={{...IS,appearance:'none'}}>
                  <option value="">Select profile...</option>
                  {profiles.map(p=><option key={p.id} value={p.id}>{p.brand} {p.series}</option>)}
                </select>
              </>
            )}
            {glass.length>0&&(
              <>
                <label style={LB}>Glass</label>
                <select value={item.glassId} onChange={e=>upd(item.id,'glassId',e.target.value)} style={{...IS,appearance:'none'}}>
                  <option value="">Select glass...</option>
                  {glass.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </>
            )}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0 10px'}}>
              <div>
                <label style={LB}>Unit Price (₹)</label>
                <input type="number" value={item.unit_price} onChange={e=>upd(item.id,'unit_price',e.target.value)} style={IS}/>
              </div>
              <div>
                <label style={LB}>GST %</label>
                <select value={item.gst_rate} onChange={e=>upd(item.id,'gst_rate',parseInt(e.target.value))} style={{...IS,appearance:'none'}}>
                  {[0,5,12,18,28].map(r=><option key={r} value={r}>{r}%</option>)}
                </select>
              </div>
              <div>
                <label style={LB}>Qty</label>
                <input type="number" min="1" value={item.quantity} onChange={e=>upd(item.id,'quantity',parseInt(e.target.value)||1)} style={IS}/>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:C.ink,borderRadius:12,padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <span style={{color:'rgba(255,255,255,0.6)',fontSize:13}}>Grand Total (incl. GST)</span>
        <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:20,fontWeight:700,color:'#fff'}}>₹{grandTotal.toLocaleString('en-IN')}</span>
      </div>
      <div style={{display:'flex',gap:10}}>
        <button onClick={onBack} style={{flex:1,padding:'13px',borderRadius:10,border:'1.5px solid '+C.fog,background:'transparent',color:C.ink,fontSize:14,fontWeight:600,cursor:'pointer'}}>← Back</button>
        <button onClick={()=>onNext(items)} style={{flex:2,padding:'13px',borderRadius:10,border:'none',background:C.steel,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'Syne,sans-serif'}}>Review →</button>
      </div>
    </div>
  )
}

// STEP 4: Review & Save
function Step4({client,items,profile,onBack,onDone}){
  const[validity,setValidity]=useState(15)
  const[discount,setDiscount]=useState(0)
  const[installation,setInstallation]=useState(0)
  const[notes,setNotes]=useState('')
  const[saving,setSaving]=useState(false)
  const[err,setErr]=useState('')
  const[saved,setSaved]=useState(null)
  const[pdfUri,setPdfUri]=useState(null)

  // Money is computed once, in whole rupees, so what is shown, saved and
  // printed can never disagree. CGST and SGST are split so they always sum
  // to the exact tax charged (never off by a rupee on a GST invoice).
  const subtotal    = Math.round(items.reduce((s,i)=>s+(i.unit_price*i.quantity),0))
  const gstTotal    = Math.round(items.reduce((s,i)=>s+(i.unit_price*i.quantity*(i.gst_rate||0)/100),0))
  const cgstAmount  = Math.floor(gstTotal/2)
  const sgstAmount  = gstTotal - cgstAmount
  const installAmt  = Math.round(parseFloat(installation)||0)
  const discountAmt = Math.round(parseFloat(discount)||0)
  const grandTotal  = subtotal + gstTotal + installAmt - discountAmt

  async function saveQuote(){
    if(!items.length) return setErr('Add at least one window before saving.')
    if(subtotal<=0) return setErr('This quote totals zero. Pick a profile and glass, or enter a price, before saving.')
    if(discountAmt>subtotal+gstTotal) return setErr('Discount cannot be more than the quote total.')
    setSaving(true);setErr('')
    try{
      const co=profile.companies||{}
      const qNum='Q-'+new Date().getFullYear()+'-'+String(Math.floor(Math.random()*9000)+1000)
      const validUntil=new Date(Date.now()+validity*864e5).toISOString()
      const{data:q,error:qE}=await supabase.from('quotes').insert({
        company_id:profile.company_id,
        client_id:client.id,
        client_name:client.name,
        client_phone:client.phone,
        client_address:client.city,
        quote_number:qNum,
        status:'draft',
        sub_total:subtotal,
        cgst_amount:cgstAmount,sgst_amount:sgstAmount,
        discount_amount:discountAmt,
        installation:installAmt,
        grand_total:grandTotal,
        expires_at:validUntil,
        notes
      }).select().single()
      if(qE)throw qE
      const qItems=items.map(it=>({
        quote_id:q.id,company_id:profile.company_id,
        title:it.title,hardware_name:it.description||'',
        width_mm:it.width_mm,height_mm:it.height_mm,
        quantity:it.quantity,
        total_amount:it.total_amount,item_value:it.unit_price,
        profile_cost:it.profile_cost??null,glass_cost:it.glass_cost??null
      }))
      await supabase.from('quote_items').insert(qItems)
      setSaved(q)
      const doc=await generateQuotePDF(
        {...q,expires_at:validUntil},
        co,client,items,
        {bank_name:co.bank_name,account_number:co.account_number,ifsc_code:co.ifsc_code,upi_id:co.upi_id}
      )
      setPdfUri(getPDFDataUri(doc))
      setSaving(false)
    }catch(e){setSaving(false);setErr(e?.message||e?.msg||JSON.stringify(e))}
  }

  if(saved){
    return(
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:52,marginBottom:12}}>🎉</div>
        <div style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:700,color:C.ink,marginBottom:4}}>Quote Created!</div>
        <div style={{fontSize:13,color:C.mist,marginBottom:6}}>#{saved.quote_number}</div>
        <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:24,fontWeight:700,color:C.steel,marginBottom:24}}>₹{grandTotal.toLocaleString('en-IN')}</div>
        <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
          {pdfUri&&(
            <button onClick={()=>{const a=document.createElement('a');a.href=pdfUri;a.download='Quote-'+saved.quote_number+'.pdf';a.click()}}
              style={{padding:'11px 20px',borderRadius:10,border:'none',background:C.steel,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>
              ↓ Download PDF
            </button>
          )}
          {client.phone&&(
            <button onClick={()=>{const t='Hi '+client.name+', your quotation *#'+saved.quote_number+'* for *Rs. '+grandTotal.toLocaleString('en-IN')+'* is ready. Reply YES to approve. _'+((profile.companies||{}).name||'QLekha')+'_';window.open('https://wa.me/'+client.phone.replace(/\D/g,'')+'?text='+encodeURIComponent(t),'_blank')}}
              style={{padding:'11px 20px',borderRadius:10,border:'1px solid rgba(37,211,102,0.4)',background:'rgba(37,211,102,0.08)',color:'#25D366',fontSize:13,fontWeight:700,cursor:'pointer'}}>
              💬 WhatsApp
            </button>
          )}
          <button onClick={()=>window.location.href='/quotes'}
            style={{padding:'11px 20px',borderRadius:10,border:'1.5px solid '+C.fog,background:'transparent',color:C.ink,fontSize:13,fontWeight:600,cursor:'pointer'}}>
            View All Quotes
          </button>
        </div>
        <button onClick={onDone} style={{marginTop:16,padding:'11px 20px',borderRadius:10,border:'none',background:'linear-gradient(135deg,'+C.blue+','+C.teal+')',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>
          + New Quote
        </button>
      </div>
    )
  }

  return(
    <div>
      <div style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,color:C.ink,marginBottom:4}}>Review</div>
      <p style={{fontSize:13,color:C.mist,marginBottom:16}}>Check everything before saving.</p>
      <div style={{background:C.chalk,borderRadius:12,padding:16,marginBottom:14,border:'1px solid '+C.glass}}>
        <div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,color:C.ink,marginBottom:10}}>Client</div>
        <div style={{fontSize:13,fontWeight:600,color:C.ink}}>{client.name}</div>
        <div style={{fontSize:12,color:C.mist}}>{[client.phone,client.city].filter(Boolean).join(' · ')}</div>
      </div>
      <div style={{background:C.chalk,borderRadius:12,padding:16,marginBottom:14,border:'1px solid '+C.glass}}>
        <div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,color:C.ink,marginBottom:10}}>Windows ({items.length})</div>
        {items.map((it,i)=>(
          <div key={it.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:i<items.length-1?'1px solid '+C.glass:'none'}}>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:C.ink}}>{it.title}</div>
              <div style={{fontSize:11,color:C.mist}}>{it.width_mm}×{it.height_mm}mm · Qty {it.quantity} · GST {it.gst_rate}%</div>
            </div>
            <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:600,color:C.ink}}>₹{it.total_amount.toLocaleString('en-IN')}</div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0 10px',marginBottom:14}}>
        <div>
          <label style={LB}>Valid (days)</label>
          <select value={validity} onChange={e=>setValidity(parseInt(e.target.value))} style={{...IS,appearance:'none',marginBottom:0}}>
            {[7,15,30,45,60].map(d=><option key={d} value={d}>{d} days</option>)}
          </select>
        </div>
        <div>
          <label style={LB}>Discount (₹)</label>
          <input type="number" value={discount} onChange={e=>setDiscount(e.target.value)} style={{...IS,marginBottom:0}}/>
        </div>
        <div>
          <label style={LB}>Installation (₹)</label>
          <input type="number" value={installation} onChange={e=>setInstallation(e.target.value)} style={{...IS,marginBottom:0}}/>
        </div>
      </div>
      <label style={LB}>Notes</label>
      <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any special instructions..." style={{...IS,resize:'vertical',minHeight:60}}/>
      <div style={{background:C.ink,borderRadius:12,padding:'14px 18px',marginBottom:16}}>
        {[['Subtotal',subtotal],['CGST',cgstAmount],['SGST',sgstAmount],['Installation',installAmt],['Discount',-discountAmt]].map(([l,v])=>v!==0&&(
          <div key={l} style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
            <span style={{fontSize:13,color:'rgba(255,255,255,0.5)'}}>{l}</span>
            <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,color:'rgba(255,255,255,0.8)'}}>₹{Math.abs(v).toLocaleString('en-IN')}</span>
          </div>
        ))}
        <div style={{display:'flex',justifyContent:'space-between',borderTop:'1px solid rgba(255,255,255,0.1)',paddingTop:10,marginTop:4}}>
          <span style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,color:'#fff'}}>Total</span>
          <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:20,fontWeight:700,color:'#fff'}}>₹{grandTotal.toLocaleString('en-IN')}</span>
        </div>
      </div>
      {err&&<div style={{background:'rgba(239,68,68,0.08)',borderRadius:8,padding:'10px 14px',fontSize:13,color:C.red,marginBottom:12}}>{err}</div>}
      <div style={{display:'flex',gap:10}}>
        <button onClick={onBack} style={{flex:1,padding:'13px',borderRadius:10,border:'1.5px solid '+C.fog,background:'transparent',color:C.ink,fontSize:14,fontWeight:600,cursor:'pointer'}}>← Back</button>
        <button onClick={saveQuote} disabled={saving} style={{flex:2,padding:'13px',borderRadius:10,border:'none',background:saving?'#ccc':'linear-gradient(135deg,'+C.blue+','+C.teal+')',color:'#fff',fontSize:14,fontWeight:700,cursor:saving?'default':'pointer',fontFamily:'Syne,sans-serif'}}>
          {saving?'⏳ Saving...':'🚀 Save Quote'}
        </button>
      </div>
    </div>
  )
}

function StepBar({ step }) {
  const steps = ['Client','Windows','Pricing','Review']
  return (
    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:24}}>
      {steps.map((s,i) => {
        const n = i + 1
        const done = n < step, active = n === step
        return (
          <div key={s} style={{display:'flex',alignItems:'center',gap:6,flex:i<steps.length-1?1:'0 0 auto'}}>
            <div style={{display:'flex',alignItems:'center',gap:7}}>
              <div style={{width:24,height:24,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',
                justifyContent:'center',fontSize:11,fontWeight:700,fontFamily:'Syne,sans-serif',
                background: done ? C.teal : active ? C.steel : C.glass,
                color: (done || active) ? C.snow : C.mist}}>{done ? '\u2713' : n}</div>
              <span style={{fontSize:12,fontWeight:active?700:500,color:active?C.ink:C.mist,whiteSpace:'nowrap'}}>{s}</span>
            </div>
            {i < steps.length - 1 && <div style={{flex:1,height:2,borderRadius:2,background: done ? C.teal : C.glass}}/>}
          </div>
        )
      })}
    </div>
  )
}

export default function QuoteWizard(){
  const[step,setStep]=useState(1)
  const[profile,setProfile]=useState(null)
  const[client,setClient]=useState(null)
  const[windows,setWindows]=useState([])
  const[priceItems,setPriceItems]=useState([])
  const[loading,setLoading]=useState(true)

  useEffect(()=>{
    async function load(){
      const{data:{user}}=await supabase.auth.getUser()
      if(!user)return setLoading(false)
      const{data:ud}=await supabase.from('users').select('*,companies(*)').eq('id',user.id).single()
      setProfile(ud)
      setLoading(false)
    }
    load()
  },[])

  if(loading)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',color:C.mist,fontSize:13}}>Loading...</div>

  return(
    <div style={{fontFamily:'Inter,sans-serif',maxWidth:640,margin:'0 auto'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
        <a href="/quotes" style={{color:C.mist,textDecoration:'none',fontSize:13}}>← Quotes</a>
        <span style={{color:C.fog}}>/</span>
        <span style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,color:C.ink}}>New Quote</span>
      </div>
      <StepBar step={step}/>
      <div style={{background:C.snow,borderRadius:16,border:'1px solid '+C.glass,padding:24}}>
        {step===1&&<Step1 profile={profile} initial={client} onNext={c=>{setClient(c);setStep(2)}}/>}
        {step===2&&<Step2 initial={windows} onNext={w=>{setWindows(w);setStep(3)}} onBack={()=>setStep(1)}/>}
        {step===3&&<Step3 windows={windows} profile={profile} initial={priceItems.length?priceItems:null} onNext={items=>{setPriceItems(items);setStep(4)}} onBack={()=>setStep(2)}/>}
        {step===4&&<Step4 client={client} items={priceItems} profile={profile} onBack={()=>setStep(3)} onDone={()=>{setStep(1);setClient(null);setWindows([]);setPriceItems([])}}/>}
      </div>
    </div>
  )
}

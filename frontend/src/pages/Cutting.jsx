import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const C={ink:'#0F1923',steel:'#1B4FD8',chalk:'#F7F8FA',glass:'#E8F4FD',mist:'#6B7A8D',fog:'#C4CDD8',
         snow:'#FFFFFF',green:'#16A34A',red:'#DC2626',amber:'#D97706',teal:'#0EA5A0'}
const BTN={padding:'9px 16px',borderRadius:8,border:'none',background:C.steel,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'Syne,sans-serif'}
const GHOST={...BTN,background:'transparent',border:'1.5px solid '+C.fog,color:C.ink,fontWeight:600}
const mm = v => Number(v||0).toLocaleString('en-IN')

export default function Cutting() {
  const [quotes, setQuotes] = useState([])
  const [sel, setSel] = useState('')
  const [cuts, setCuts] = useState([])
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [view, setView] = useState('cuts')

  useEffect(() => { (async () => {
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      if (!user) return setLoading(false)
      const { data: ud } = await supabase.from('users').select('company_id').eq('id',user.id).maybeSingle()
      if (!ud) return setLoading(false)
      const { data } = await supabase.from('quotes')
        .select('id,quote_number,client_name,grand_total,status,created_at')
        .eq('company_id', ud.company_id).order('created_at',{ascending:false}).limit(50)
      setQuotes(data||[])
    } catch(e) { console.error('Cutting load:', e?.message) }
    finally { setLoading(false) }
  })() }, [])

  async function generate() {
    if (!sel) return
    setErr(''); setBusy(true); setPlan(null)
    try {
      const { error } = await supabase.rpc('generate_cutting_list', { p_quote_id: sel })
      if (error) throw error
      const { data } = await supabase.from('cutting_lists').select('*')
        .eq('quote_id', sel).order('profile_code').order('cut_length_mm', { ascending:false })
      setCuts(data||[])
      if (!data || !data.length) {
        setErr('No cuts produced. The windows on this quote have no window type set — pick one in the Designer and re-quote.')
      }
    } catch(e) { setErr(e?.message || 'Could not build the cutting list.') }
    finally { setBusy(false) }
  }

  async function optimise() {
    if (!sel) return
    setErr(''); setBusy(true)
    try {
      const { data, error } = await supabase.rpc('optimise_cutting', { p_quote_id: sel, p_saw_kerf_mm: 5 })
      if (error) throw error
      setPlan(data); setView('bars')
    } catch(e) { setErr(e?.message || 'Could not optimise.') }
    finally { setBusy(false) }
  }

  async function markCut(id, done) {
    setCuts(prev => prev.map(c => c.id===id ? {...c, status: done?'cut':'pending'} : c))
    await supabase.from('cutting_lists')
      .update({ status: done?'cut':'pending', cut_at: done ? new Date().toISOString() : null })
      .eq('id', id)
  }

  function printSheet() { window.print() }

  // group cuts by profile for the workshop
  const grouped = cuts.reduce((acc, c) => {
    const k = (c.profile_code||'?') + '|' + (c.colour||'')
    ;(acc[k] = acc[k] || { code:c.profile_code, name:c.profile_name, colour:c.colour, rows:[] }).rows.push(c)
    return acc
  }, {})
  const totalPieces = cuts.reduce((s,c)=>s+(c.quantity||0),0)
  const totalMm = cuts.reduce((s,c)=>s+(c.cut_length_mm||0)*(c.quantity||0),0)
  const q = quotes.find(x=>x.id===sel)

  return (
    <div style={{fontFamily:'Inter,sans-serif'}}>
      <style>{'@media print{.no-print{display:none!important}body{background:#fff}}'}</style>

      <div className="no-print">
        <h2 style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:800,color:C.ink,marginBottom:4}}>Cutting List</h2>
        <p style={{fontSize:13,color:C.mist,marginBottom:18,lineHeight:1.6}}>
          Turn an approved quote into cut lengths for the workshop, then pack them onto standard bars to see how many you need.
        </p>

        {err && <div style={{background:'rgba(220,38,38,0.08)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:8,
                             padding:'10px 13px',fontSize:13,color:C.red,marginBottom:12,lineHeight:1.6}}>{err}</div>}

        {loading ? <div style={{padding:40,textAlign:'center',color:C.mist}}>Loading...</div> : (
          <div style={{background:C.snow,border:'1px solid '+C.glass,borderRadius:12,padding:14,marginBottom:16}}>
            <label style={{fontSize:10,fontWeight:700,color:C.mist,textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:5}}>Quote</label>
            <select value={sel} onChange={e=>{setSel(e.target.value);setCuts([]);setPlan(null);setErr('')}}
              style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1.5px solid '+C.fog,fontSize:13,
                      color:C.ink,background:C.snow,outline:'none',marginBottom:12,boxSizing:'border-box'}}>
              <option value="">Select a quote...</option>
              {quotes.map(x=>(
                <option key={x.id} value={x.id}>
                  {x.quote_number} — {x.client_name} ({x.status})
                </option>
              ))}
            </select>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <button onClick={generate} disabled={!sel||busy} style={{...BTN,opacity:sel&&!busy?1:0.5}}>
                {busy?'Working...':'Build cutting list'}
              </button>
              {cuts.length>0 && <button onClick={optimise} disabled={busy} style={GHOST}>Optimise bars</button>}
              {cuts.length>0 && <button onClick={printSheet} style={GHOST}>Print</button>}
            </div>
          </div>
        )}

        {cuts.length>0 && (
          <div style={{display:'flex',gap:6,marginBottom:14,background:C.snow,padding:4,borderRadius:10,
                       border:'1px solid '+C.glass,width:'fit-content'}}>
            {[['cuts','Cut List'],['bars','Bar Layout']].map(([k,l])=>(
              <button key={k} onClick={()=>setView(k)} style={{padding:'7px 14px',borderRadius:7,border:'none',cursor:'pointer',
                fontSize:13,fontWeight:view===k?700:500,background:view===k?C.ink:'transparent',color:view===k?'#fff':C.mist}}>{l}</button>
            ))}
          </div>
        )}
      </div>

      {cuts.length>0 && (
        <div style={{background:C.snow,border:'1px solid '+C.glass,borderRadius:12,padding:16,marginBottom:16}}>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:800,color:C.ink}}>
            {q?.quote_number} — {q?.client_name}
          </div>
          <div style={{fontSize:12,color:C.mist,marginTop:3}}>
            {totalPieces} pieces · {mm(Math.round(totalMm/1000*100)/100)} m of profile
            {plan ? ' · ' + plan.total_bars + ' bars · ' + plan.wastage_percent + '% offcut' : ''}
          </div>
        </div>
      )}

      {view==='cuts' && cuts.length>0 && Object.values(grouped).map(g=>(
        <div key={g.code+g.colour} style={{background:C.snow,border:'1px solid '+C.glass,borderRadius:12,
                                           marginBottom:12,overflow:'hidden'}}>
          <div style={{padding:'11px 14px',background:C.chalk,borderBottom:'1px solid '+C.glass,
                       display:'flex',justifyContent:'space-between',gap:8}}>
            <div style={{minWidth:0}}>
              <div style={{fontWeight:700,fontSize:14,color:C.ink}}>{g.name}</div>
              <div style={{fontSize:11,color:C.mist,fontFamily:'JetBrains Mono,monospace'}}>
                {g.code}{g.colour?' · '+g.colour:''}
              </div>
            </div>
            <div style={{fontSize:12,color:C.mist,whiteSpace:'nowrap'}}>
              {g.rows.reduce((s,r)=>s+(r.quantity||0),0)} pcs
            </div>
          </div>
          {g.rows.map(c=>(
            <div key={c.id} style={{padding:'10px 14px',borderBottom:'1px solid '+C.chalk,
                                    display:'flex',alignItems:'center',gap:10}}>
              <input type="checkbox" className="no-print" checked={c.status==='cut'}
                onChange={e=>markCut(c.id, e.target.checked)} style={{width:17,height:17,flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:15,fontWeight:700,
                             color:c.status==='cut'?C.mist:C.ink,
                             textDecoration:c.status==='cut'?'line-through':'none'}}>
                  {mm(c.cut_length_mm)} mm
                </div>
                <div style={{fontSize:11,color:C.mist,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.label}</div>
              </div>
              <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:14,fontWeight:700,color:C.steel,whiteSpace:'nowrap'}}>
                × {c.quantity}
              </div>
            </div>
          ))}
        </div>
      ))}

      {view==='bars' && plan && (
        <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10,marginBottom:14}}>
            {[['Bars needed', plan.total_bars, C.steel],
              ['Offcut', mm(plan.total_offcut_mm)+' mm', C.amber],
              ['Stock used', mm(plan.stock_used_mm)+' mm', C.ink],
              ['Wastage', plan.wastage_percent+'%', plan.wastage_percent>10?C.red:C.green]].map(([l,v,col])=>(
              <div key={l} style={{background:C.snow,border:'1px solid '+C.glass,borderRadius:12,padding:13}}>
                <div style={{fontSize:10,fontWeight:700,color:C.mist,textTransform:'uppercase',letterSpacing:'0.5px'}}>{l}</div>
                <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:19,fontWeight:700,color:col,marginTop:3}}>{v}</div>
              </div>
            ))}
          </div>

          {(plan.groups||[]).map((g,gi)=>(
            <div key={gi} style={{background:C.snow,border:'1px solid '+C.glass,borderRadius:12,padding:14,marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',gap:8,marginBottom:10}}>
                <div style={{minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14,color:C.ink}}>{g.profile_name}</div>
                  <div style={{fontSize:11,color:C.mist,fontFamily:'JetBrains Mono,monospace'}}>
                    {g.profile_code}{g.colour?' · '+g.colour:''} · bar {mm(g.stock_length_mm)}mm
                  </div>
                </div>
                <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:15,fontWeight:700,color:C.steel,whiteSpace:'nowrap'}}>
                  {g.bars_needed} bar{g.bars_needed===1?'':'s'}
                </div>
              </div>
              {(g.layout||[]).map((bar,bi)=>{
                const used = (bar.pieces||[]).reduce((s,p)=>s+p,0)
                return (
                  <div key={bi} style={{marginBottom:9}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:C.mist,marginBottom:3}}>
                      <span>Bar {bi+1}</span>
                      <span style={{fontFamily:'JetBrains Mono,monospace'}}>offcut {mm(bar.offcut_mm)}mm</span>
                    </div>
                    <div style={{display:'flex',height:26,borderRadius:5,overflow:'hidden',border:'1px solid '+C.fog}}>
                      {(bar.pieces||[]).map((p,pi)=>(
                        <div key={pi} title={p+'mm'}
                          style={{width:(p/g.stock_length_mm*100)+'%',background:pi%2?C.steel:'#3B6FEA',
                                  display:'flex',alignItems:'center',justifyContent:'center',
                                  color:'#fff',fontSize:9,fontFamily:'JetBrains Mono,monospace',
                                  borderRight:'1px solid rgba(255,255,255,0.35)',overflow:'hidden'}}>
                          {p}
                        </div>
                      ))}
                      <div style={{flex:1,background:'repeating-linear-gradient(45deg,'+C.chalk+','+C.chalk+' 4px,'+C.glass+' 4px,'+C.glass+' 8px)'}}/>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </>
      )}

      {!loading && cuts.length===0 && (
        <div className="no-print" style={{background:C.snow,borderRadius:16,border:'1px solid '+C.glass,
                                          padding:'48px 24px',textAlign:'center'}}>
          <div style={{fontSize:38,marginBottom:12}}>&#129691;</div>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:800,color:C.ink,marginBottom:6}}>No cutting list yet</div>
          <p style={{fontSize:13,color:C.mist,lineHeight:1.6,maxWidth:400,margin:'0 auto'}}>
            Pick a quote above and build its list. Every window priced from a window type knows exactly
            which profiles it needs and how long each piece must be.
          </p>
        </div>
      )}
    </div>
  )
}

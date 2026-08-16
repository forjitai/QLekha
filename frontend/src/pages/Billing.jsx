import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { generateInvoicePDF, downloadPDF, getPDFDataUri } from '../lib/pdfgen'

const C={ink:'#0F1923',steel:'#1B4FD8',steelLt:'#3B6FEA',copper:'#D97941',chalk:'#F7F8FA',glass:'#E8F4FD',mist:'#6B7A8D',fog:'#C4CDD8',snow:'#FFFFFF',green:'#16A34A',red:'#DC2626',amber:'#D97706',purp:'#7C3AED',teal:'#0EA5A0',navy:'#0F1923',blue:'#1B4FD8',blueLt:'#3B6FEA',bg:'#F7F8FA',white:'#FFFFFF',g100:'#E8F4FD',g200:'#C4CDD8',g400:'#6B7A8D',g50:'#F7F8FA',g600:'#374151',bluePale:'rgba(27,79,216,0.08)'}

function RecordPaymentModal({ invoice, companyId, onClose, onDone }) {
  const [amount, setAmount] = useState(String(invoice.balance_due || 0))
  const [mode, setMode] = useState('bank_transfer')
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const MODES = ['cash','bank_transfer','upi','cheque','card']

  async function submit() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return setErr('Enter a valid amount.')
    setLoading(true)
    const { error: pe } = await supabase.from('payments').insert({
      company_id: companyId,
      invoice_id: invoice.id,
      client_id: invoice.client_id,
      amount: amt,
      payment_mode: mode,
      payment_date: date,
      notes: note,
    })
    if (pe) { setLoading(false); return setErr(pe.message) }
    // Update invoice
    const newPaid = (invoice.paid_amount || 0) + amt
    const newBalance = Math.max(0, (invoice.grand_total || 0) - newPaid)
    const newStatus = newBalance <= 0 ? 'paid' : 'partial'
    await supabase.from('invoices').update({ paid_amount: newPaid, balance_due: newBalance, status: newStatus }).eq('id', invoice.id)
    setLoading(false)
    onDone()
  }

  const inp = {width:'100%',padding:'10px 12px',borderRadius:9,border:'1.5px solid '+C.fog,fontSize:13,fontFamily:'Inter,sans-serif',color:C.ink,outline:'none',boxSizing:'border-box'}
  const lb = {fontSize:11,fontWeight:700,color:C.mist,textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:5}

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:C.snow,borderRadius:16,width:'100%',maxWidth:440,boxShadow:'0 24px 64px rgba(11,31,58,0.2)',overflow:'hidden'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid '+C.glass,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,color:C.ink}}>Record Payment</div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:20,color:C.mist}}>&#215;</button>
        </div>
        <div style={{padding:20}}>
          <div style={{background:C.chalk,borderRadius:10,padding:12,marginBottom:16,display:'flex',justifyContent:'space-between'}}>
            <div style={{fontSize:13,color:C.ink,fontWeight:600}}>{invoice.client_name}</div>
            <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,color:C.amber,fontWeight:600}}>{fmt(invoice.balance_due)} due</div>
          </div>
          {err && <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:8,padding:'9px 12px',fontSize:13,color:C.red,marginBottom:12}}>{err}</div>}
          <label style={lb}>Amount (Rs.) *</label>
          <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} style={{...inp,marginBottom:14}}/>
          <label style={lb}>Payment Mode</label>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>
            {MODES.map(m => (
              <button key={m} onClick={()=>setMode(m)} style={{padding:'5px 10px',borderRadius:7,border:'1.5px solid '+(mode===m?C.steel:C.fog),background:mode===m?C.blue+'10':C.snow,color:mode===m?C.steel:C.ink,fontSize:11,fontWeight:600,cursor:'pointer',textTransform:'capitalize'}}>
                {m.replace('_',' ')}
              </button>
            ))}
          </div>
          <label style={lb}>Payment Date</label>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{...inp,marginBottom:14}}/>
          <label style={lb}>Note (optional)</label>
          <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Ref no, cheque no..." style={{...inp,marginBottom:16}}/>
          <button onClick={submit} disabled={loading} style={{width:'100%',padding:13,borderRadius:10,border:'none',background:C.green,color:'#fff',fontSize:14,fontWeight:700,cursor:loading?'default':'pointer',fontFamily:'Syne,sans-serif'}}>
            {loading?'&#8987; Saving...':'&#10003; Record Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Billing() {
  const [tab, setTab] = useState('invoices')
  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [payModal, setPayModal] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return setLoading(false)
      const { data: ud, error: ue } = await supabase.from('users').select('company_id,companies(*)').eq('id',user.id).single()
      if (ue || !ud) return setLoading(false)
      setProfile(ud)
      const [ir, pr] = await Promise.all([
        supabase.from('invoices').select('*').eq('company_id',ud.company_id).order('created_at',{ascending:false}),
        supabase.from('payments').select('*').eq('company_id',ud.company_id).order('payment_date',{ascending:false}),
      ])
      setInvoices(ir.data||[])
      setPayments(pr.data||[])
    } catch(e) {
      console.error('Billing load error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function downloadInvoicePDF(inv) {
    setPdfLoading(inv.id)
    try {
      const co = profile?.companies || {}
      const doc = await generateInvoicePDF(
        {...inv, type: inv.type || 'tax_invoice'},
        co,
        { name: inv.client_name, city: inv.client_address },
        [],
        { bank_name: co.bank_name, account_number: co.account_number, ifsc_code: co.ifsc_code, upi_id: co.upi_id }
      )
      downloadPDF(doc, 'Invoice-' + inv.invoice_number + '.pdf')
    } catch(e) { alert('PDF error: ' + e.message) }
    setPdfLoading(null)
  }

  const filteredInvoices = filter==='all' ? invoices : invoices.filter(i=>i.status===filter)
  const totalBilled = invoices.reduce((s,i)=>s+(i.grand_total||0),0)
  const totalCollected = invoices.reduce((s,i)=>s+(i.paid_amount||0),0)
  const totalOutstanding = invoices.reduce((s,i)=>s+(i.balance_due||0),0)
  const overdueCount = invoices.filter(i=>i.status==='overdue').length

  return (
    <div style={{fontFamily:'Inter,sans-serif'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <h2 style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:700,color:C.ink}}>Billing</h2>
        <button style={{background:C.steel,color:'#fff',border:'none',padding:'9px 18px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>
          + New Invoice
        </button>
      </div>

      {/* Summary cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:20}}>
        {[
          {i:'&#128176;',v:fmt(totalBilled),l:'Total Billed',c:C.steel},
          {i:'&#9989;',v:fmt(totalCollected),l:'Collected',c:C.green},
          {i:'&#8987;',v:fmt(totalOutstanding),l:'Outstanding',c:C.amber},
          {i:'&#9888;&#65039;',v:String(overdueCount),l:'Overdue',c:C.red},
        ].map(k=>(
          <div key={k.l} style={{background:C.snow,borderRadius:14,padding:16,border:'1px solid '+C.glass,borderTop:'3px solid '+k.c}}>
            <div style={{width:32,height:32,borderRadius:8,background:k.c+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,marginBottom:8}} dangerouslySetInnerHTML={{__html:k.i}}/>
            <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:20,fontWeight:500,color:C.ink,marginBottom:2}}>{k.v}</div>
            <div style={{fontSize:12,color:C.mist}}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:0,background:C.snow,border:'1px solid '+C.glass,borderRadius:10,padding:3,marginBottom:16,width:'fit-content'}}>
        {['invoices','payments'].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:'7px 20px',borderRadius:8,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,background:tab===t?C.ink:'transparent',color:tab===t?'#fff':C.mist,textTransform:'capitalize',transition:'all 0.15s'}}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'invoices' && (
        <>
          <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
            {['all','pending','partial','paid','overdue'].map(s=>(
              <button key={s} onClick={()=>setFilter(s)} style={{padding:'5px 12px',borderRadius:100,fontSize:11,fontWeight:600,cursor:'pointer',border:'1px solid',borderColor:filter===s?C.ink:C.glass,background:filter===s?C.ink:C.snow,color:filter===s?'#fff':C.ink,textTransform:'capitalize'}}>
                {s}
              </button>
            ))}
          </div>
          <div style={{background:C.snow,borderRadius:16,border:'1px solid '+C.glass,overflow:'hidden'}}>
            {loading?<div style={{padding:40,textAlign:'center',color:C.mist}}>Loading...</div>:filteredInvoices.length===0?(
              <div style={{padding:60,textAlign:'center'}}>
                <div style={{fontSize:40,marginBottom:12}}>&#129518;</div>
                <p style={{color:C.mist,marginBottom:16}}>No invoices yet</p>
                <button style={{background:C.steel,color:'#fff',border:'none',padding:'10px 20px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>Create Invoice</button>
              </div>
            ):(
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:C.chalk}}>
                      {['Invoice #','Client','Total','Paid','Balance','Status','Due Date',''].map(h=>(
                        <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:C.mist,borderBottom:'1px solid '+C.glass}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((inv,i)=>{
                      const sc = SC[inv.status]||SC.draft
                      const overdue = inv.status==='overdue'||(inv.due_date&&new Date(inv.due_date)<new Date()&&(inv.balance_due||0)>0)
                      return(
                        <tr key={inv.id} style={{borderBottom:'1px solid '+C.chalk,background:overdue&&inv.status!=='paid'?'rgba(239,68,68,0.02)':'transparent'}}>
                          <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:11,color:C.mist}}>#{inv.invoice_number}</td>
                          <td style={{padding:'12px 14px',fontWeight:600,fontSize:13,color:C.ink}}>{inv.client_name}</td>
                          <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12,color:C.ink}}>{fmt(inv.grand_total)}</td>
                          <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12,color:C.green}}>{fmt(inv.paid_amount)}</td>
                          <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12,color:(inv.balance_due||0)>0?C.amber:C.green,fontWeight:600}}>{fmt(inv.balance_due)}</td>
                          <td style={{padding:'12px 14px'}}><span style={{...sc,padding:'3px 8px',borderRadius:100,fontSize:10,fontWeight:700,textTransform:'capitalize'}}>{inv.status}</span></td>
                          <td style={{padding:'12px 14px',fontSize:12,color:overdue&&inv.status!=='paid'?C.red:C.mist}}>
                            {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '—'}
                          </td>
                          <td style={{padding:'12px 14px'}}>
                            <button onClick={()=>{const ph=(inv.client_phone||'').replace(/\D/g,'');if(ph)window.open('https://wa.me/'+ph+'?text='+encodeURIComponent('Hi '+inv.client_name+', invoice *#'+inv.invoice_number+'* for *\u20b9'+(inv.grand_total||0).toLocaleString('en-IN')+'* ready. -'+((profile?.companies?.name)||'QLekha')),'_blank')}} style={{padding:'5px 8px',borderRadius:6,border:'1px solid rgba(37,211,102,0.3)',background:'rgba(37,211,102,0.06)',color:'#25D366',fontSize:11,cursor:'pointer',marginRight:4}}>WA</button>
                <button onClick={()=>downloadInvoicePDF(inv)} disabled={pdfLoading===inv.id} style={{padding:'5px 8px',borderRadius:6,border:'1px solid rgba(26,111,232,0.3)',background:'rgba(26,111,232,0.06)',color:C.steel,fontSize:11,fontWeight:600,cursor:'pointer'}}>{pdfLoading===inv.id?'...':'PDF'}</button>
                   {inv.status!=='paid'&&inv.status!=='cancelled'&&(
                              <button onClick={()=>setPayModal(inv)} style={{padding:'5px 10px',borderRadius:6,border:'1px solid '+C.green+'40',background:C.green+'10',color:C.green,fontSize:11,fontWeight:600,cursor:'pointer'}}>
                                Record Payment
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'payments' && (
        <div style={{background:C.snow,borderRadius:16,border:'1px solid '+C.glass,overflow:'hidden'}}>
          {loading?<div style={{padding:40,textAlign:'center',color:C.mist}}>Loading...</div>:payments.length===0?(
            <div style={{padding:60,textAlign:'center'}}>
              <div style={{fontSize:40,marginBottom:12}}>&#128179;</div>
              <p style={{color:C.mist}}>No payment records yet.</p>
            </div>
          ):(
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{background:C.chalk}}>
                    {['Date','Client','Amount','Mode','Invoice','Note'].map(h=>(
                      <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:C.mist,borderBottom:'1px solid '+C.glass}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p,i)=>(
                    <tr key={p.id} style={{borderBottom:'1px solid '+C.chalk}}>
                      <td style={{padding:'12px 14px',fontSize:12,color:C.mist}}>{new Date(p.payment_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</td>
                      <td style={{padding:'12px 14px',fontWeight:600,fontSize:13,color:C.ink}}>{p.client_name||'—'}</td>
                      <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:600,color:C.green}}>{fmt(p.amount)}</td>
                      <td style={{padding:'12px 14px'}}><span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:6,background:C.glass,color:C.ink,textTransform:'capitalize'}}>{(p.payment_mode||'').replace('_',' ')}</span></td>
                      <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:11,color:C.mist}}>#{p.invoice_number||'—'}</td>
                      <td style={{padding:'12px 14px',fontSize:12,color:C.mist}}>{p.notes||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {payModal && (
        <RecordPaymentModal
          invoice={payModal}
          companyId={profile?.company_id}
          onClose={()=>setPayModal(null)}
          onDone={()=>{setPayModal(null);load()}}
        />
      )}
    </div>
  )
}

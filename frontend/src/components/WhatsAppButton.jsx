import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { sendQuoteSummary, sendInvoiceReminder, sendFollowupTemplate, normalisePhone } from '../lib/whatsapp'

const C = { blue:'#1A6FE8', teal:'#0EA5A0', green:'#25D366', navy:'#0B1F3A', g100:'#E8EDF3', g400:'#8A9BB5', white:'#fff', red:'#EF4444' }

// ── Inline toast ──
function useToast() {
  const [toast, setToast] = useState(null)
  const show = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }
  return { toast, show }
}

// ── Single send button (used inline on quote/invoice rows) ──
export function WhatsAppSendBtn({ phone, type, data, onSent, label = 'Send via WhatsApp' }) {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { toast, show } = useToast()

  async function handleSend() {
    if (!phone) return show('No phone number on record', 'error')
    setLoading(true)
    let result
    try {
      if (type === 'quote') result = await sendQuoteSummary(phone, data)
      else if (type === 'invoice_reminder') result = await sendInvoiceReminder(phone, data)
      else if (type === 'followup') result = await sendFollowupTemplate(phone, data)
      else result = { ok: false, error: 'Unknown type' }
    } catch(e) {
      result = { ok: false, error: e.message }
    }

    // Log to Supabase
    if (data?.companyId) {
      await supabase.from('whatsapp_messages').insert({
        company_id: data.companyId,
        to_phone: normalisePhone(phone),
        message_type: type,
        status: result.ok ? 'sent' : 'failed',
        wa_message_id: result.messageId || null,
        sent_at: result.ok ? new Date().toISOString() : null,
        failed_reason: result.ok ? null : result.error,
      })
    }

    setLoading(false)
    if (result.ok) {
      setSent(true)
      show('Sent successfully ✓')
      onSent?.()
    } else {
      // If token not configured, open native WA as fallback
      if (result.error?.includes('not configured')) {
        const text = encodeURIComponent(data?.fallbackText || `Hi, here is your ${type} from our team.`)
        const num  = normalisePhone(phone)
        window.open(`https://wa.me/${num}?text=${text}`, '_blank')
        show('Opened WhatsApp (API not configured)', 'warning')
      } else {
        show(result.error || 'Send failed', 'error')
      }
    }
  }

  return (
    <div style={{ position:'relative', display:'inline-flex' }}>
      <button
        onClick={handleSend}
        disabled={loading || sent}
        style={{
          display:'inline-flex', alignItems:'center', gap:6,
          padding:'6px 12px', borderRadius:7,
          border:`1px solid ${sent ? 'rgba(37,211,102,0.3)' : 'rgba(37,211,102,0.3)'}`,
          background: sent ? 'rgba(37,211,102,0.08)' : C.white,
          color: sent ? C.green : C.green,
          fontSize:12, fontWeight:600, cursor: loading||sent ? 'default' : 'pointer',
          transition:'all 0.15s', fontFamily:'Inter,sans-serif',
        }}
      >
        {loading ? '⏳' : '💬'} {loading ? 'Sending...' : sent ? 'Sent ✓' : label}
      </button>
      {toast && (
        <div style={{
          position:'absolute', bottom:'calc(100% + 8px)', left:'50%', transform:'translateX(-50%)',
          background: toast.type==='error' ? C.red : toast.type==='warning' ? '#FFB400' : C.green,
          color:'#fff', padding:'6px 12px', borderRadius:8, fontSize:11, fontWeight:600,
          whiteSpace:'nowrap', zIndex:100, boxShadow:'0 4px 12px rgba(0,0,0,0.15)',
        }}>{toast.msg}</div>
      )}
    </div>
  )
}

// ── Full WhatsApp Modal (compose + send + history) ──
export function WhatsAppModal({ isOpen, onClose, contact, companyId, companyName }) {
  const [tab, setTab]       = useState('send')     // send | history | config
  const [msgType, setMsgType] = useState('quote_summary')
  const [phone, setPhone]   = useState(contact?.phone || '')
  const [custom, setCustom] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const { toast, show }     = useToast()

  const MESSAGE_TYPES = [
    { key:'quote_summary',   icon:'📋', label:'Quote Summary',    desc:'Send a quote breakdown as WhatsApp message' },
    { key:'invoice_reminder',icon:'🧾', label:'Invoice Reminder', desc:'Friendly payment reminder for overdue invoice' },
    { key:'followup',        icon:'🔔', label:'Follow-up',        desc:'Check in on a pending quote decision' },
    { key:'custom',          icon:'✏️', label:'Custom Message',   desc:'Write your own message' },
  ]

  async function loadHistory() {
    if (!companyId) return
    const { data } = await supabase.from('whatsapp_messages')
      .select('*')
      .eq('company_id', companyId)
      .eq('to_phone', normalisePhone(phone))
      .order('created_at', { ascending: false })
      .limit(20)
    setHistory(data || [])
  }

  async function handleSend() {
    if (!phone) return show('Enter a phone number', 'error')
    setLoading(true)
    let result
    const num = normalisePhone(phone)

    if (msgType === 'custom') {
      if (!custom.trim()) { setLoading(false); return show('Write a message first', 'error') }
      // Fallback to wa.me link for custom messages
      window.open(`https://wa.me/${num}?text=${encodeURIComponent(custom)}`, '_blank')
      result = { ok: true, messageId: null }
    } else if (msgType === 'quote_summary') {
      result = await sendQuoteSummary(phone, {
        clientName: contact?.name || 'Client',
        quoteNumber: 'Q-2025-XXX',
        items: [],
        total: 0,
        companyName,
        companyId,
      })
    } else if (msgType === 'invoice_reminder') {
      result = await sendInvoiceReminder(phone, {
        clientName: contact?.name || 'Client',
        invoiceNumber: 'INV-2025-XXX',
        amount: 0,
        daysOverdue: 0,
        companyName,
        companyId,
      })
    } else {
      window.open(`https://wa.me/${num}`, '_blank')
      result = { ok: true }
    }

    // Log
    await supabase.from('whatsapp_messages').insert({
      company_id: companyId,
      to_phone: num,
      message_type: msgType,
      status: result.ok ? 'sent' : 'failed',
      wa_message_id: result.messageId || null,
      sent_at: result.ok ? new Date().toISOString() : null,
      failed_reason: result.ok ? null : result.error,
    })

    setLoading(false)
    if (result.ok) { show('Sent ✓'); loadHistory() }
    else if (result.error?.includes('not configured')) {
      window.open(`https://wa.me/${normalisePhone(phone)}`, '_blank')
      show('Opened WhatsApp (API token not set)', 'warning')
    } else show(result.error || 'Failed', 'error')
  }

  if (!isOpen) return null

  const STATUS_COLOR = { sent:'#0EA5A0', delivered:'#22C55E', read:'#1A6FE8', failed:'#EF4444', pending:'#FFB400' }
  const STATUS_ICON  = { sent:'✓', delivered:'✓✓', read:'✓✓', failed:'✕', pending:'⏳' }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:C.white, borderRadius:16, width:'100%', maxWidth:520, maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(11,31,58,0.2)', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ background:'#075E54', padding:'16px 20px', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:38, height:38, borderRadius:'50%', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>💬</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, color:'#fff' }}>{contact?.name || 'WhatsApp'}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)' }}>{phone || 'No number'}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.7)', fontSize:20, padding:4 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', background:'#f0f0f0', borderBottom:'1px solid #E8EDF3' }}>
          {[{k:'send',label:'Send'},{k:'history',label:'History'},{k:'config',label:'Setup'}].map(t => (
            <button key={t.k} onClick={() => { setTab(t.k); if(t.k==='history') loadHistory() }}
              style={{ flex:1, padding:'10px', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, background: tab===t.k ? C.white : 'transparent', color: tab===t.k ? '#075E54' : C.g400, borderBottom: tab===t.k ? '2px solid #075E54' : '2px solid transparent', transition:'all 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ flex:1, overflowY:'auto' }}>

          {/* ── SEND TAB ── */}
          {tab === 'send' && (
            <div style={{ padding:20 }}>
              {/* Phone */}
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:11, fontWeight:700, color:C.g400, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:5 }}>Send to</label>
                <div style={{ display:'flex', gap:8 }}>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210"
                    style={{ flex:1, padding:'9px 12px', borderRadius:8, border:'1.5px solid #E8EDF3', fontSize:13, fontFamily:'Inter,sans-serif', outline:'none', color:C.navy }}/>
                  <button onClick={() => { const num = normalisePhone(phone); window.open(`https://wa.me/${num}`, '_blank') }}
                    style={{ padding:'9px 12px', borderRadius:8, border:'1px solid rgba(37,211,102,0.3)', background:'rgba(37,211,102,0.08)', color:C.green, fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
                    Open WA
                  </button>
                </div>
              </div>

              {/* Message type */}
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:11, fontWeight:700, color:C.g400, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:8 }}>Message type</label>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {MESSAGE_TYPES.map(m => (
                    <div key={m.key} onClick={() => setMsgType(m.key)}
                      style={{ padding:'10px 12px', borderRadius:10, border:`1.5px solid ${msgType===m.key ? '#075E54' : '#E8EDF3'}`, background: msgType===m.key ? 'rgba(7,94,84,0.05)' : C.white, cursor:'pointer', display:'flex', alignItems:'center', gap:10, transition:'all 0.15s' }}>
                      <span style={{ fontSize:18 }}>{m.icon}</span>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color: msgType===m.key ? '#075E54' : C.navy }}>{m.label}</div>
                        <div style={{ fontSize:11, color:C.g400 }}>{m.desc}</div>
                      </div>
                      {msgType===m.key && <span style={{ marginLeft:'auto', color:'#075E54', fontWeight:700 }}>✓</span>}
                    </div>
                  ))}
                </div>
              </div>

              {msgType === 'custom' && (
                <div style={{ marginBottom:16 }}>
                  <label style={{ fontSize:11, fontWeight:700, color:C.g400, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:5 }}>Message</label>
                  <textarea value={custom} onChange={e => setCustom(e.target.value)} placeholder="Type your message..."
                    style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'1.5px solid #E8EDF3', fontSize:13, fontFamily:'Inter,sans-serif', resize:'vertical', minHeight:80, outline:'none', color:C.navy, boxSizing:'border-box' }}/>
                  <div style={{ fontSize:11, color:C.g400, marginTop:4 }}>Custom messages open WhatsApp Web/App with pre-filled text.</div>
                </div>
              )}

              {toast && (
                <div style={{ padding:'10px 12px', borderRadius:8, marginBottom:12, background: toast.type==='error' ? 'rgba(239,68,68,0.08)' : toast.type==='warning' ? 'rgba(255,180,0,0.1)' : 'rgba(34,197,94,0.08)', color: toast.type==='error' ? C.red : toast.type==='warning' ? '#FFB400' : C.green, fontSize:13, fontWeight:500 }}>
                  {toast.msg}
                </div>
              )}

              <button onClick={handleSend} disabled={loading}
                style={{ width:'100%', padding:'13px', borderRadius:10, border:'none', background: loading ? '#ccc' : '#25D366', color:'#fff', fontSize:14, fontWeight:700, cursor: loading ? 'default' : 'pointer', fontFamily:'Syne,sans-serif', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                {loading ? '⏳ Sending...' : '💬 Send WhatsApp'}
              </button>
            </div>
          )}

          {/* ── HISTORY TAB ── */}
          {tab === 'history' && (
            <div style={{ padding:20 }}>
              {history.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px 20px' }}>
                  <div style={{ fontSize:36, marginBottom:10 }}>💬</div>
                  <div style={{ fontSize:13, color:C.g400 }}>No messages sent to this contact yet.</div>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {history.map(m => (
                    <div key={m.id} style={{ background:'#E7FFDB', borderRadius:'10px 10px 2px 10px', padding:'10px 12px', maxWidth:'85%', marginLeft:'auto' }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'#075E54', marginBottom:3, textTransform:'capitalize' }}>
                        {m.message_type?.replace(/_/g,' ')}
                      </div>
                      <div style={{ fontSize:11, color:'#4a4a4a' }}>
                        {new Date(m.created_at).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:4, marginTop:4 }}>
                        <span style={{ fontSize:10, color: STATUS_COLOR[m.status] || C.g400, fontWeight:600 }}>
                          {STATUS_ICON[m.status] || '?'} {m.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── CONFIG TAB ── */}
          {tab === 'config' && (
            <div style={{ padding:20 }}>
              <div style={{ background:'rgba(7,94,84,0.06)', border:'1px solid rgba(7,94,84,0.15)', borderRadius:12, padding:16, marginBottom:20 }}>
                <div style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, color:'#075E54', marginBottom:8 }}>Setup WhatsApp Business API</div>
                <div style={{ fontSize:13, color:'#4a4a4a', lineHeight:1.6 }}>
                  To send messages programmatically, connect Meta's WhatsApp Cloud API.
                  Until then, messages open WhatsApp Web with pre-filled text.
                </div>
              </div>
              {[
                { step:'1', title:'Create Meta App', desc:'Go to developers.facebook.com → Create App → Business', icon:'🌐' },
                { step:'2', title:'Add WhatsApp Product', desc:'Add WhatsApp to your app and get a test phone number', icon:'📱' },
                { step:'3', title:'Create Templates', desc:'In Meta Business Manager, create message templates: qlekha_quote_sent, qlekha_invoice_sent, qlekha_payment_thanks', icon:'📋' },
                { step:'4', title:'Add to Environment', desc:'Set VITE_WHATSAPP_TOKEN and VITE_WHATSAPP_PHONE_ID in Vercel environment variables', icon:'🔑' },
                { step:'5', title:'Go Live', desc:'Submit templates for approval (takes ~24h). Once approved, messages send instantly.', icon:'✅' },
              ].map(s => (
                <div key={s.step} style={{ display:'flex', gap:12, padding:'12px 0', borderBottom:'1px solid #E8EDF3' }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:'#075E54', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Syne,sans-serif', fontSize:12, fontWeight:700, color:'#fff', flexShrink:0 }}>{s.step}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:C.navy, marginBottom:2 }}>{s.icon} {s.title}</div>
                    <div style={{ fontSize:12, color:C.g400, lineHeight:1.5 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
              <div style={{ marginTop:16, padding:'12px 14px', background:'#FFF3CD', borderRadius:10, border:'1px solid rgba(255,180,0,0.3)' }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#856404', marginBottom:4 }}>⚠️ Without API Token</div>
                <div style={{ fontSize:12, color:'#856404' }}>All send buttons will open WhatsApp Web/App with pre-filled message text. Your clients receive the same message — just requires manual tap to send.</div>
              </div>
              <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" target="_blank" rel="noopener noreferrer"
                style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginTop:16, padding:'12px', borderRadius:10, background:'#075E54', color:'#fff', textDecoration:'none', fontSize:13, fontWeight:600, fontFamily:'Syne,sans-serif' }}>
                📖 Open Meta Cloud API Docs
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Compact WhatsApp action bar (used on quote detail / invoice detail) ──
export function WhatsAppBar({ phone, companyId, companyName, context }) {
  const [open, setOpen] = useState(false)
  const num = normalisePhone(phone || '')
  const { toast, show } = useToast()

  const QUICK_ACTIONS = [
    {
      icon: '📋', label: 'Send Quote',
      action: () => {
        const text = `Hi ${context?.clientName || 'there'}, your quote *${context?.quoteNumber || ''}* for *₹${(context?.amount||0).toLocaleString('en-IN')}* is ready. Reply YES to approve.`
        window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, '_blank')
        show('Opened WhatsApp ✓')
      },
    },
    {
      icon: '🧾', label: 'Send Invoice',
      action: () => {
        const text = `Hi ${context?.clientName || 'there'}, your invoice *${context?.invoiceNumber || ''}* for *₹${(context?.amount||0).toLocaleString('en-IN')}* is ready. Please arrange payment. Thank you.`
        window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, '_blank')
        show('Opened WhatsApp ✓')
      },
    },
    {
      icon: '🔔', label: 'Follow Up',
      action: () => {
        const text = `Hi ${context?.clientName || 'there'}, just following up on quote *${context?.quoteNumber || ''}*. Have you had a chance to review? Let us know if you have any questions.`
        window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, '_blank')
        show('Opened WhatsApp ✓')
      },
    },
    {
      icon: '✅', label: 'Payment Thanks',
      action: () => {
        const text = `Hi ${context?.clientName || 'there'}, thank you for your payment of *₹${(context?.amount||0).toLocaleString('en-IN')}*. Your receipt *${context?.receiptNumber || ''}* has been noted. 🙏`
        window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, '_blank')
        show('Opened WhatsApp ✓')
      },
    },
  ]

  return (
    <>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
        {QUICK_ACTIONS.map(a => (
          <button key={a.label} onClick={a.action}
            style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 10px', borderRadius:7, border:'1px solid rgba(37,211,102,0.3)', background:'rgba(37,211,102,0.06)', color:'#25D366', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
            {a.icon} {a.label}
          </button>
        ))}
        <button onClick={() => setOpen(true)}
          style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 10px', borderRadius:7, border:'1px solid #E8EDF3', background:'#fff', color:'#8A9BB5', fontSize:11, fontWeight:600, cursor:'pointer' }}>
          ··· More
        </button>
        {toast && <span style={{ fontSize:12, color:'#25D366', fontWeight:600 }}>{toast.msg}</span>}
      </div>
      <WhatsAppModal
        isOpen={open}
        onClose={() => setOpen(false)}
        contact={{ name: context?.clientName, phone }}
        companyId={companyId}
        companyName={companyName}
      />
    </>
  )
}

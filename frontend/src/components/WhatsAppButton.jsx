import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { sendQuoteSummary, sendInvoiceReminder, normalisePhone } from '../lib/whatsapp'

const C = {
  blue: '#1A6FE8', green: '#25D366', navy: '#0F1923',
  g100: '#E8F4FD', g400: '#6B7A8D', white: '#fff',
  red: '#EF4444', amber: '#FFB400', teal: '#0EA5A0',
}

function useToast() {
  const [toast, setToast] = useState(null)
  const show = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }
  return { toast, show }
}

export function WhatsAppSendBtn({ phone, type, data, onSent, label = 'WhatsApp' }) {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { toast, show } = useToast()

  async function handleSend() {
    if (!phone) return show('No phone number', 'error')
    setLoading(true)
    let result
    try {
      if (type === 'quote') result = await sendQuoteSummary(phone, data)
      else if (type === 'invoice_reminder') result = await sendInvoiceReminder(phone, data)
      else result = { ok: false, error: 'Unknown type' }
    } catch(e) {
      result = { ok: false, error: e.message }
    }

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
      setSent(true); show('Sent ✓'); onSent?.()
    } else if (result.error?.includes('not configured')) {
      const text = encodeURIComponent(data?.fallbackText || ('Hi, here is your ' + type + '.'))
      window.open('https://wa.me/' + normalisePhone(phone) + '?text=' + text, '_blank')
      show('Opened WhatsApp ✓')
      setSent(true); onSent?.()
    } else {
      show(result.error || 'Failed', 'error')
    }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={handleSend}
        disabled={loading || sent}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 7,
          border: '1px solid rgba(37,211,102,0.3)',
          background: sent ? 'rgba(37,211,102,0.08)' : C.snow,
          color: C.green, fontSize: 11, fontWeight: 600,
          cursor: loading || sent ? 'default' : 'pointer',
          fontFamily: 'Inter,sans-serif',
        }}
      >
        {loading ? '⏳' : '💬'} {loading ? 'Sending...' : sent ? 'Sent ✓' : label}
      </button>
      {toast && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
          transform: 'translateX(-50%)',
          background: toast.type === 'error' ? C.red : toast.type === 'warning' ? C.amber : C.green,
          color: '#fff', padding: '5px 10px', borderRadius: 7,
          fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', zIndex: 100,
        }}>{toast.msg}</div>
      )}
    </div>
  )
}

export function WhatsAppModal({ isOpen, onClose, contact, companyId, companyName }) {
  const [msgType, setMsgType] = useState('quote_summary')
  const [phone, setPhone] = useState(contact?.phone || '')
  const [custom, setCustom] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast, show } = useToast()

  const TYPES = [
    { k: 'quote_summary',    i: '📋', l: 'Quote Summary',    d: 'Quote breakdown' },
    { k: 'invoice_reminder', i: '🧾', l: 'Invoice Reminder', d: 'Payment reminder' },
    { k: 'followup',         i: '🔔', l: 'Follow-up',        d: 'Check in on quote' },
    { k: 'custom',           i: '✏️', l: 'Custom Message',   d: 'Write your own' },
  ]

  async function send() {
    if (!phone) return show('Enter phone number', 'error')
    setLoading(true)
    const num = normalisePhone(phone)
    let text = custom
    if (msgType === 'quote_summary')    text = 'Hi ' + (contact?.name || 'there') + ', your quotation is ready. Reply YES to approve.'
    if (msgType === 'invoice_reminder') text = 'Hi ' + (contact?.name || 'there') + ', this is a payment reminder. Please arrange payment. Thank you.'
    if (msgType === 'followup')         text = 'Hi ' + (contact?.name || 'there') + ', just checking in on the quotation we sent. Any questions?'

    window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(text), '_blank')

    if (companyId) {
      await supabase.from('whatsapp_messages').insert({
        company_id: companyId, to_phone: num,
        message_type: msgType, status: 'sent',
        sent_at: new Date().toISOString(),
      })
    }
    setLoading(false)
    show('Opened WhatsApp ✓')
  }

  if (!isOpen) return null

  const inpStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1.5px solid #E8EDF3', fontSize: 13, outline: 'none',
    color: C.ink, boxSizing: 'border-box', fontFamily: 'Inter,sans-serif',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: C.snow, borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(11,31,58,0.2)', overflow: 'hidden' }}>
        <div style={{ background: '#075E54', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💬</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, color: '#fff' }}>{contact?.name || 'WhatsApp'}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{phone || 'No number'}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 20 }}>✕</button>
        </div>

        <div style={{ padding: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.mist, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Send to</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" style={{ ...inpStyle, marginBottom: 14 }}/>

          <div style={{ marginBottom: 14 }}>
            {TYPES.map(m => (
              <div key={m.k} onClick={() => setMsgType(m.k)}
                style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid ' + (msgType === m.k ? '#075E54' : C.glass), background: msgType === m.k ? 'rgba(7,94,84,0.05)' : C.snow, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span>{m.i}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: msgType === m.k ? '#075E54' : C.ink }}>{m.l}</div>
                  <div style={{ fontSize: 11, color: C.mist }}>{m.d}</div>
                </div>
                {msgType === m.k && <span style={{ marginLeft: 'auto', color: '#075E54' }}>✓</span>}
              </div>
            ))}
          </div>

          {msgType === 'custom' && (
            <textarea value={custom} onChange={e => setCustom(e.target.value)} placeholder="Type your message..."
              style={{ ...inpStyle, resize: 'vertical', minHeight: 70, marginBottom: 12 }}/>
          )}

          {toast && (
            <div style={{ padding: '9px 12px', borderRadius: 8, marginBottom: 10, background: toast.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)', color: toast.type === 'error' ? C.red : C.teal, fontSize: 13 }}>
              {toast.msg}
            </div>
          )}

          <button onClick={send} disabled={loading}
            style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: loading ? '#ccc' : '#25D366', color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontFamily: 'Syne,sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {loading ? '⏳ Opening...' : '💬 Send via WhatsApp'}
          </button>
          <p style={{ fontSize: 11, color: C.mist, marginTop: 10, textAlign: 'center' }}>Opens WhatsApp Web/App with pre-filled text. Add API token in Settings for direct API sending.</p>
        </div>
      </div>
    </div>
  )
}

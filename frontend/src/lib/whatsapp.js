const WA_TOKEN = import.meta.env.VITE_WHATSAPP_TOKEN || ''
const WA_PHONE_ID = import.meta.env.VITE_WHATSAPP_PHONE_ID || ''
const WA_BASE = 'https://graph.facebook.com/v19.0/' + WA_PHONE_ID + '/messages'

export function normalisePhone(raw = '') {
  const d = raw.replace(/\D/g, '')
  if (d.startsWith('91') && d.length === 12) return d
  if (d.length === 10) return '91' + d
  return d
}

async function sendWA(to, body) {
  if (!WA_TOKEN || !WA_PHONE_ID) return { ok: false, error: 'not configured' }
  const phone = normalisePhone(to)
  try {
    const res = await fetch(WA_BASE, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + WA_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, ...body }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error?.message || 'Send failed' }
    return { ok: true, messageId: data.messages?.[0]?.id }
  } catch(err) {
    return { ok: false, error: err.message }
  }
}

export async function sendText(to, text) {
  return sendWA(to, { type: 'text', text: { body: text, preview_url: false } })
}

export async function sendQuoteSummary(to, { clientName, quoteNumber, items = [], total, companyName }) {
  const lines = items.slice(0, 5).map((it, i) =>
    (i + 1) + '. ' + (it.title || 'Window') + ' \u2014 \u20b9' + (it.total_amount || 0).toLocaleString('en-IN')
  ).join('\n')
  const text = '*' + companyName + '* | QLekha\n'
    + '\u2501'.repeat(16) + '\n'
    + 'Hi ' + clientName + ' \ud83d\udc4b\n\n'
    + 'Your quote *' + quoteNumber + '* is ready!'
    + (lines ? '\n\n*Items:*\n' + lines : '') + '\n\n'
    + '*Total: \u20b9' + (total || 0).toLocaleString('en-IN') + '* (incl. GST)\n'
    + '\u2501'.repeat(16) + '\n'
    + 'Reply *YES* to approve or call us for changes.\n\n'
    + '_Powered by QLekha_'
  return sendText(to, text)
}

export async function sendInvoiceReminder(to, { clientName, invoiceNumber, amount, daysOverdue, companyName }) {
  const text = '*' + companyName + '* | Payment Reminder\n'
    + '\u2501'.repeat(16) + '\n'
    + 'Hi ' + clientName + ',\n\n'
    + 'Reminder for invoice *' + invoiceNumber + '*.\n\n'
    + 'Amount due: *\u20b9' + (amount || 0).toLocaleString('en-IN') + '*\n'
    + (daysOverdue > 0 ? 'Overdue by: *' + daysOverdue + ' days* \u26a0\ufe0f' : 'Due soon') + '\n\n'
    + 'Please arrange payment.\n\nThank you \ud83d\ude4f\n_' + companyName + ' via QLekha_'
  return sendText(to, text)
}

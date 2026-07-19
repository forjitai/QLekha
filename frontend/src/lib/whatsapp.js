/**
 * QLekha WhatsApp Integration — Meta Cloud API
 *
 * Setup:
 * 1. Go to developers.facebook.com → Create App → Business → WhatsApp
 * 2. Get a Phone Number ID and Permanent Access Token
 * 3. Create message templates in Meta Business Manager
 * 4. Set VITE_WHATSAPP_TOKEN and VITE_WHATSAPP_PHONE_ID in your .env
 *
 * Template names used:
 *   qlekha_quote_sent     — quote notification
 *   qlekha_invoice_sent   — invoice notification
 *   qlekha_payment_thanks — payment receipt
 *   qlekha_followup       — follow-up reminder
 */

const WA_TOKEN    = import.meta.env.VITE_WHATSAPP_TOKEN    || ''
const WA_PHONE_ID = import.meta.env.VITE_WHATSAPP_PHONE_ID || ''
const WA_BASE     = `https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`

// Normalise Indian phone → international format
export function normalisePhone(raw = '') {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('91') && digits.length === 12) return digits
  if (digits.length === 10) return '91' + digits
  return digits
}

// Core send function
async function sendWA(to, body) {
  if (!WA_TOKEN || !WA_PHONE_ID) {
    console.warn('[WhatsApp] Missing VITE_WHATSAPP_TOKEN or VITE_WHATSAPP_PHONE_ID')
    return { ok: false, error: 'WhatsApp not configured. Add token and phone ID to .env' }
  }
  const phone = normalisePhone(to)
  try {
    const res = await fetch(WA_BASE, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, ...body }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error?.message || 'Send failed', data }
    return { ok: true, messageId: data.messages?.[0]?.id, data }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ── Text message (for free-form window, within 24-hr session) ──
export async function sendText(to, text) {
  return sendWA(to, { type: 'text', text: { body: text, preview_url: false } })
}

// ── Template: Quote sent ──
// Template body (create in Meta Business Manager):
// "Hi {{1}}, your window quotation *#{{2}}* for *₹{{3}}* is ready.
//  View PDF: {{4}}
//  Reply YES to approve or call us for changes."
export async function sendQuoteTemplate(to, { clientName, quoteNumber, amount, pdfUrl }) {
  return sendWA(to, {
    type: 'template',
    template: {
      name: 'qlekha_quote_sent',
      language: { code: 'en' },
      components: [{
        type: 'body',
        parameters: [
          { type: 'text', text: clientName },
          { type: 'text', text: quoteNumber },
          { type: 'text', text: amount },
          { type: 'text', text: pdfUrl || 'qlekha.in' },
        ],
      }],
    },
  })
}

// ── Template: Invoice sent ──
export async function sendInvoiceTemplate(to, { clientName, invoiceNumber, amount, dueDate }) {
  return sendWA(to, {
    type: 'template',
    template: {
      name: 'qlekha_invoice_sent',
      language: { code: 'en' },
      components: [{
        type: 'body',
        parameters: [
          { type: 'text', text: clientName },
          { type: 'text', text: invoiceNumber },
          { type: 'text', text: amount },
          { type: 'text', text: dueDate },
        ],
      }],
    },
  })
}

// ── Template: Payment thanks ──
export async function sendPaymentTemplate(to, { clientName, amount, receiptNumber }) {
  return sendWA(to, {
    type: 'template',
    template: {
      name: 'qlekha_payment_thanks',
      language: { code: 'en' },
      components: [{
        type: 'body',
        parameters: [
          { type: 'text', text: clientName },
          { type: 'text', text: amount },
          { type: 'text', text: receiptNumber },
        ],
      }],
    },
  })
}

// ── Template: Follow-up ──
export async function sendFollowupTemplate(to, { clientName, quoteNumber, daysAgo }) {
  return sendWA(to, {
    type: 'template',
    template: {
      name: 'qlekha_followup',
      language: { code: 'en' },
      components: [{
        type: 'body',
        parameters: [
          { type: 'text', text: clientName },
          { type: 'text', text: quoteNumber },
          { type: 'text', text: String(daysAgo) },
        ],
      }],
    },
  })
}

// ── Free-form quote summary (within 24-hr session) ──
export async function sendQuoteSummary(to, { clientName, quoteNumber, items, total, companyName }) {
  const lines = items.slice(0, 5).map((it, i) =>
    `${i+1}. ${it.title || it.window_type || 'Window'} — ${it.width_mm}×${it.height_mm}mm × ${it.quantity} — ₹${(it.total_amount||0).toLocaleString('en-IN')}`
  ).join('\n')
  const more  = items.length > 5 ? `\n+ ${items.length - 5} more items` : ''
  const text  =
`*${companyName}* | QLekha Quote
━━━━━━━━━━━━━━━━━━━━
Hi ${clientName} 👋

Your quotation *${quoteNumber}* is ready!

*Items:*
${lines}${more}

*Total: ₹${(total||0).toLocaleString('en-IN')}* (incl. GST)
━━━━━━━━━━━━━━━━━━━━
Reply *YES* to approve or call us for any changes.

_Powered by QLekha_`
  return sendText(to, text)
}

// ── Free-form invoice reminder ──
export async function sendInvoiceReminder(to, { clientName, invoiceNumber, amount, daysOverdue, companyName }) {
  const text =
`*${companyName}* | Payment Reminder
━━━━━━━━━━━━━━━━━━━━
Hi ${clientName},

This is a friendly reminder for invoice *${invoiceNumber}*.

Amount due: *₹${(amount||0).toLocaleString('en-IN')}*
${daysOverdue > 0 ? `Overdue by: *${daysOverdue} days* ⚠️` : 'Due soon'}

Please arrange payment at your earliest convenience.

Bank: [Your bank details]
UPI: [Your UPI ID]

Thank you 🙏
_${companyName} via QLekha_`
  return sendText(to, text)
}

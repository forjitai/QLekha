/**
 * QLekha PDF Generator
 * Uses jsPDF (loaded via CDN) + custom canvas drawing
 * No server needed — runs entirely in the browser
 *
 * Generates:
 *  - Quotation PDF  (generateQuotePDF)
 *  - Tax Invoice PDF (generateInvoicePDF)
 *  - Proforma Invoice PDF (generateProformaPDF)
 *
 * Themes: classic_blue | midnight | teal_fresh | amber_warm | forest_green | deep_purple
 */

const THEME_COLORS = {
  classic_blue:  { primary: '#1B4FD8', dark: '#0F1923', accent: '#3B8EFF' },
  midnight:      { primary: '#0F1923', dark: '#090F18', accent: '#1B4FD8' },
  teal_fresh:    { primary: '#0EA5A0', dark: '#065f46', accent: '#34D399' },
  amber_warm:    { primary: '#FFB400', dark: '#92400E', accent: '#FBBF24' },
  forest_green:  { primary: '#16A34A', dark: '#14532d', accent: '#4ADE80' },
  deep_purple:   { primary: '#7C3AED', dark: '#3b0764', accent: '#A78BFA' },
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return [r, g, b]
}

function loadJsPDF() {
  return new Promise((resolve, reject) => {
    if (window.jspdf) return resolve(window.jspdf.jsPDF)
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    script.onload = () => resolve(window.jspdf.jsPDF)
    script.onerror = reject
    document.head.appendChild(script)
  })
}

function formatINR(n) {
  return (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d) {
  return new Date(d || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Core PDF builder — shared by quote and invoice
 */
async function buildQLekhaPDF({
  docType,        // 'QUOTATION' | 'TAX INVOICE' | 'PROFORMA INVOICE'
  docNumber,      // e.g. 'Q-2025-001'
  date,
  validUntil,     // quotes only
  dueDate,        // invoices only
  company,        // { name, address, city, state, phone, email, gst_number, pan_number }
  client,         // { name, address, phone, email, gst_number }
  items,          // [{ title, description, width_mm, height_mm, quantity, unit_price, gst_rate, total_amount }]
  totals,         // { subtotal, gst_amount, installation, discount, grand_total }
  bank,           // { bank_name, account_number, ifsc_code, account_holder, upi_id }
  terms,          // string
  theme,          // theme key
  notes,          // optional
}) {
  const jsPDF = await loadJsPDF()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210, H = 297
  const PL = 15, PR = 15  // left/right padding
  const CW = W - PL - PR  // content width

  const themeKey = theme || 'classic_blue'
  const colors = THEME_COLORS[themeKey] || THEME_COLORS.classic_blue
  const [pr, pg, pb] = hexToRgb(colors.primary)
  const [dr, dg, db] = hexToRgb(colors.dark)

  let y = 0

  // ── HEADER BAND ──────────────────────────────────────────────
  doc.setFillColor(dr, dg, db)
  doc.rect(0, 0, W, 38, 'F')

  // Company name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.text(company.name || 'Company Name', PL, 16)

  // Doc type badge
  doc.setFillColor(pr, pg, pb)
  const badgeW = docType.length * 2.8 + 8
  doc.roundedRect(W - PR - badgeW, 5, badgeW, 10, 2, 2, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(docType, W - PR - badgeW/2, 11.5, { align: 'center' })

  // Company details (small)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(200, 220, 255)
  const coLine1 = [company.address, company.city, company.state].filter(Boolean).join(', ')
  const coLine2 = [company.phone, company.email].filter(Boolean).join('  |  ')
  const coLine3 = [company.gst_number ? 'GST: ' + company.gst_number : '', company.pan_number ? 'PAN: ' + company.pan_number : ''].filter(Boolean).join('  |  ')
  if (coLine1) doc.text(coLine1, PL, 23)
  if (coLine2) doc.text(coLine2, PL, 28)
  if (coLine3) doc.text(coLine3, PL, 33)

  y = 44

  // ── DOC NUMBER + DATES ──────────────────────────────────────
  doc.setFillColor(248, 250, 252)
  doc.rect(0, y - 2, W, 22, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(dr, dg, db)
  doc.text('#' + docNumber, PL, y + 8)

  // Date pills on the right
  const dateFields = [
    ['Date', formatDate(date)],
    validUntil ? ['Valid Until', formatDate(validUntil)] : null,
    dueDate    ? ['Due Date',   formatDate(dueDate)]    : null,
  ].filter(Boolean)

  let dx = W - PR
  dateFields.reverse().forEach(([label, val]) => {
    const valW = doc.getTextWidth(val) + 4
    const lblW = doc.getTextWidth(label + ': ') + 2
    const totalW = lblW + valW + 4
    dx -= totalW + 4
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(100, 120, 140)
    doc.text(label + ': ', dx, y + 7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(dr, dg, db)
    doc.text(val, dx + lblW, y + 7)
  })

  y += 26

  // ── CLIENT INFO ──────────────────────────────────────────────
  doc.setFillColor(pr, pg, pb)
  doc.rect(PL, y, 3, 18, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(pr, pg, pb)
  doc.text('BILL TO', PL + 6, y + 5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(dr, dg, db)
  doc.text(client.name || 'Client Name', PL + 6, y + 11)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(80, 90, 110)
  const clientLine = [client.address, client.city].filter(Boolean).join(', ')
  if (clientLine) doc.text(clientLine, PL + 6, y + 16)

  // Client contact on right
  if (client.phone || client.email) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(80, 90, 110)
    if (client.phone) doc.text(client.phone, W - PR, y + 8, { align: 'right' })
    if (client.email) doc.text(client.email, W - PR, y + 13, { align: 'right' })
    if (client.gst_number) doc.text('GST: ' + client.gst_number, W - PR, y + 18, { align: 'right' })
  }

  y += 24

  // ── ITEMS TABLE ──────────────────────────────────────────────
  // Column widths
  const cols = { sno: 8, desc: 62, size: 26, qty: 12, rate: 24, gst: 14, amount: 30 }
  const colX = {
    sno:    PL,
    desc:   PL + cols.sno,
    size:   PL + cols.sno + cols.desc,
    qty:    PL + cols.sno + cols.desc + cols.size,
    rate:   PL + cols.sno + cols.desc + cols.size + cols.qty,
    gst:    PL + cols.sno + cols.desc + cols.size + cols.qty + cols.rate,
    amount: PL + cols.sno + cols.desc + cols.size + cols.qty + cols.rate + cols.gst,
  }

  // Table header
  doc.setFillColor(dr, dg, db)
  doc.rect(PL, y, CW, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(255, 255, 255)

  doc.text('#',         colX.sno + 2,    y + 5)
  doc.text('Description',colX.desc + 2,  y + 5)
  doc.text('Size (mm)', colX.size + 2,   y + 5)
  doc.text('Qty',       colX.qty + 2,    y + 5)
  doc.text('Rate',      colX.rate + 2,   y + 5)
  doc.text('GST%',      colX.gst + 2,    y + 5)
  doc.text('Amount',    W - PR - 2,      y + 5, { align: 'right' })

  y += 9

  // Table rows
  const ITEMS = items || []
  ITEMS.forEach((item, idx) => {
    const rowH = item.description ? 12 : 8
    const bg = idx % 2 === 0 ? [255,255,255] : [248,250,252]
    doc.setFillColor(...bg)
    doc.rect(PL, y, CW, rowH, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(50, 60, 80)

    // S.No
    doc.text(String(idx + 1), colX.sno + 2, y + 5)

    // Description (bold title + small desc)
    doc.setFont('helvetica', 'bold')
    doc.text(item.title || item.window_type || 'Window', colX.desc + 2, y + 5)
    if (item.description) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(120, 130, 150)
      doc.text(item.description.slice(0, 40), colX.desc + 2, y + 9)
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(50, 60, 80)

    // Size
    if (item.width_mm && item.height_mm) {
      doc.text(item.width_mm + ' x ' + item.height_mm, colX.size + 2, y + 5)
    }

    // Qty
    doc.text(String(item.quantity || 1), colX.qty + 2, y + 5)

    // Rate
    doc.text(formatINR(item.unit_price || 0), colX.rate + 2, y + 5)

    // GST
    doc.text((item.gst_rate || 18) + '%', colX.gst + 2, y + 5)

    // Amount
    doc.setFont('helvetica', 'bold')
    doc.text(formatINR(item.total_amount || 0), W - PR - 2, y + 5, { align: 'right' })

    // Row bottom border
    doc.setDrawColor(220, 228, 236)
    doc.setLineWidth(0.2)
    doc.line(PL, y + rowH, PL + CW, y + rowH)

    y += rowH
  })

  y += 4

  // ── TOTALS ───────────────────────────────────────────────────
  const totX = W - PR - 60
  const totLabelX = totX
  const totValX = W - PR

  function totRow(label, val, bold = false, color = null) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(bold ? 9 : 8.5)
    if (color) doc.setTextColor(...color)
    else doc.setTextColor(60, 70, 90)
    doc.text(label, totLabelX, y)
    doc.text(formatINR(val), totValX, y, { align: 'right' })
    y += 6
  }

  totRow('Subtotal', totals.subtotal || 0)
  if (totals.installation > 0) totRow('Installation', totals.installation)
  if (totals.discount > 0)     totRow('Discount', -(totals.discount), false, [200, 50, 50])
  totRow('GST', totals.gst_amount || 0)

  // Grand total highlight
  doc.setFillColor(dr, dg, db)
  doc.roundedRect(totLabelX - 4, y - 4, 64, 11, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL', totLabelX, y + 3)
  doc.text('Rs. ' + formatINR(totals.grand_total || 0), totValX, y + 3, { align: 'right' })
  y += 16

  // ── BANK DETAILS ─────────────────────────────────────────────
  if (bank && (bank.account_number || bank.upi_id)) {
    doc.setFillColor(248, 250, 252)
    doc.rect(PL, y, CW, 28, 'F')
    doc.setDrawColor(pr, pg, pb)
    doc.setLineWidth(0.5)
    doc.line(PL, y, PL, y + 28)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(pr, pg, pb)
    doc.text('PAYMENT DETAILS', PL + 4, y + 6)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(50, 60, 80)

    let by = y + 12
    const bankFields = [
      bank.bank_name    && ['Bank', bank.bank_name],
      bank.account_number && ['Account No.', bank.account_number],
      bank.ifsc_code    && ['IFSC', bank.ifsc_code],
      bank.upi_id       && ['UPI', bank.upi_id],
    ].filter(Boolean)

    bankFields.slice(0, 2).forEach(([label, val]) => {
      doc.setFont('helvetica', 'bold'); doc.text(label + ': ', PL + 4, by)
      doc.setFont('helvetica', 'normal'); doc.text(val, PL + 4 + doc.getTextWidth(label + ': '), by)
      by += 5
    })

    by = y + 12
    bankFields.slice(2).forEach(([label, val]) => {
      doc.setFont('helvetica', 'bold'); doc.text(label + ': ', PL + 4 + 55, by)
      doc.setFont('helvetica', 'normal'); doc.text(val, PL + 4 + 55 + doc.getTextWidth(label + ': '), by)
      by += 5
    })

    y += 32
  }

  // ── TERMS ─────────────────────────────────────────────────────
  if (terms) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(pr, pg, pb)
    doc.text('Terms & Conditions', PL, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(80, 90, 110)
    const lines = terms.split('\n').slice(0, 6)
    lines.forEach((line, i) => {
      doc.text(line, PL, y + 10 + i * 4.5)
    })
    y += 10 + lines.length * 4.5 + 4
  }

  // ── FOOTER ────────────────────────────────────────────────────
  doc.setFillColor(dr, dg, db)
  doc.rect(0, H - 14, W, 14, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(180, 200, 230)
  doc.text('Generated by QLekha — Design. Quote. Close.  |  qlekha.vercel.app', W / 2, H - 6, { align: 'center' })

  // Accent stripe
  doc.setFillColor(pr, pg, pb)
  doc.rect(0, H - 14, 4, 14, 'F')

  return doc
}

// ── Public API ────────────────────────────────────────────────

export async function generateQuotePDF(quote, company, client, items, bank) {
  const doc = await buildQLekhaPDF({
    docType: 'QUOTATION',
    docNumber: quote.quote_number,
    date: quote.created_at,
    validUntil: quote.expires_at,
    company,
    client,
    items,
    totals: {
      subtotal: quote.sub_total || 0,
      gst_amount: (quote.cgst_amount || 0) + (quote.sgst_amount || 0) + (quote.igst_amount || 0),
      cgst: quote.cgst_amount || 0,
      sgst: quote.sgst_amount || 0,
      igst: quote.igst_amount || 0,
      igst_enabled: !!quote.igst_enabled,
      installation: quote.installation || 0,
      transport: quote.transport || 0,
      discount: quote.discount_amount || 0,
      grand_total: quote.grand_total || 0,
    },
    hideRate: !!quote.hide_rate,
    bank,
    terms: company.terms_quotation,
    theme: company.pdf_design,
    notes: quote.notes,
  })
  return doc
}

export async function generateInvoicePDF(invoice, company, client, items, bank) {
  const doc = await buildQLekhaPDF({
    docType: invoice.type === 'proforma' ? 'PROFORMA INVOICE' : 'TAX INVOICE',
    docNumber: invoice.invoice_number,
    date: invoice.created_at,
    dueDate: invoice.due_date,
    company,
    client,
    items,
    totals: {
      subtotal: invoice.base_amount || invoice.taxable_amount || 0,
      gst_amount: (invoice.cgst_amount || 0) + (invoice.sgst_amount || 0) + (invoice.igst_amount || 0),
      cgst: invoice.cgst_amount || 0,
      sgst: invoice.sgst_amount || 0,
      igst: invoice.igst_amount || 0,
      igst_enabled: !!invoice.igst_enabled,
      installation: invoice.installation || 0,
      transport: invoice.transport || 0,
      discount: invoice.discount_amount || 0,
      grand_total: invoice.grand_total || 0,
    },
    bank,
    terms: company.terms_billing,
    theme: company.pdf_design,
  })
  return doc
}


// ── Receipt ────────────────────────────────────────────────────
// A receipt acknowledges a payment, so it shows what was received and what is
// still owed - not the line items, which already appeared on the invoice.
export async function generateReceiptPDF(receipt, company, invoice, bank) {
  const paid    = Number(receipt.amount) || 0
  const total   = Number(invoice?.grand_total) || 0
  const balance = Math.max(0, Number(invoice?.balance_due ?? 0))
  const modeLabel = {
    cash:'Cash', upi:'UPI', bank_transfer:'Bank Transfer',
    cheque:'Cheque', card:'Card', other:'Other',
  }[receipt.payment_mode] || 'Payment'

  const rows = [{
    title: 'Payment received - ' + modeLabel,
    description: [
      invoice?.invoice_number ? 'Against invoice ' + invoice.invoice_number : null,
      receipt.transaction_ref ? 'Ref: ' + receipt.transaction_ref : null,
    ].filter(Boolean).join('   '),
    quantity: 1,
    unit_price: paid,
    total_amount: paid,
  }]

  return await buildQLekhaPDF({
    docType: 'PAYMENT RECEIPT',
    docNumber: receipt.receipt_number,
    date: receipt.date || receipt.created_at,
    company,
    client: { name: receipt.client_name, phone: receipt.client_phone },
    items: rows,
    totals: {
      subtotal: paid,
      gst_amount: 0,
      installation: 0,
      discount: 0,
      grand_total: paid,
    },
    bank,
    terms: total
      ? 'Received ' + fmtRs(paid) + ' against invoice ' + (invoice?.invoice_number||'') +
        ' of ' + fmtRs(total) + '. Balance outstanding: ' + fmtRs(balance) + '.'
      : 'Received with thanks.',
    theme: company.pdf_design,
  })
}

function fmtRs(n){ return 'Rs. ' + (Number(n)||0).toLocaleString('en-IN') }

export async function shareReceiptViaWhatsApp(receipt, companyName) {
  const text = 'Hi ' + (receipt.client_name || 'there') +
    ', we have received your payment of *Rs. ' + (Number(receipt.amount)||0).toLocaleString('en-IN') +
    '*.\n\nReceipt *#' + receipt.receipt_number + '* is attached.\n\nThank you!\n\n_' + companyName + ' via QLekha_'
  const num = (receipt.client_phone || '').replace(/\D/g, '')
  const waNum = num.length === 10 ? '91' + num : num
  if (!waNum) return { ok:false, error:'No phone number on this receipt' }
  window.open('https://wa.me/' + waNum + '?text=' + encodeURIComponent(text), '_blank')
  return { ok:true }
}

export function downloadPDF(doc, filename) {
  doc.save(filename)
}

export function getPDFBlob(doc) {
  return doc.output('blob')
}

export function getPDFDataUri(doc) {
  return doc.output('datauristring')
}

// WhatsApp share helper — opens wa.me with a share message
// The PDF must be downloaded first; WhatsApp can't receive blobs directly
export async function shareQuoteViaWhatsApp(quote, client, companyName) {
  const text = 'Hi ' + (client.name || 'there') + ', your quotation *#' + quote.quote_number + '* for *Rs. ' + (quote.grand_total || 0).toLocaleString('en-IN') + '* is ready.\n\nPlease find the PDF attached. Reply *YES* to approve.\n\n_' + companyName + ' via QLekha_'
  const num = (client.phone || '').replace(/\D/g, '')
  const waNum = num.startsWith('91') && num.length === 12 ? num : num.length === 10 ? '91' + num : num
  window.open('https://wa.me/' + waNum + '?text=' + encodeURIComponent(text), '_blank')
}

export async function shareInvoiceViaWhatsApp(invoice, client, companyName) {
  const text = 'Hi ' + (client.name || 'there') + ', your invoice *#' + invoice.invoice_number + '* for *Rs. ' + (invoice.grand_total || 0).toLocaleString('en-IN') + '* is ready.\n\nDue date: ' + new Date(invoice.due_date || Date.now()).toLocaleDateString('en-IN') + '\n\nThank you.\n_' + companyName + ' via QLekha_'
  const num = (client.phone || '').replace(/\D/g, '')
  const waNum = num.startsWith('91') && num.length === 12 ? num : num.length === 10 ? '91' + num : num
  window.open('https://wa.me/' + waNum + '?text=' + encodeURIComponent(text), '_blank')
}

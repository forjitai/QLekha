/**
 * QLekha PDF Button Components
 *
 * <PDFDownloadBtn>   — download PDF directly
 * <PDFPreviewModal>  — preview in iframe + download + WhatsApp share
 * <PDFActionBar>     — row of actions: Preview, Download, WhatsApp
 */
import { useState, useCallback } from 'react'
import {
  generateQuotePDF, generateInvoicePDF,
  downloadPDF, getPDFDataUri,
  shareQuoteViaWhatsApp, shareInvoiceViaWhatsApp,
} from '../lib/pdfgen'

const C = {
  navy: '#0F1923', blue: '#1B4FD8', teal: '#0EA5A0',
  green: '#25D366', amber: '#FFB400', red: '#EF4444',
  g100: '#E8F4FD', g400: '#6B7A8D', white: '#fff',
  ink: '#0F1923', steel: '#1B4FD8', snow: '#FFFFFF',
  mist: '#6B7A8D', glass: '#E8F4FD', fog: '#C4CDD8', chalk: '#F7F8FA',
}

function useToast() {
  const [toast, setToast] = useState(null)
  const show = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }
  return { toast, show }
}

// ── Spinner ──────────────────────────────────────────────────
function Spin() {
  return <span style={{ display:'inline-block', animation:'spin 0.8s linear infinite', fontSize:14 }}>⟳</span>
}

// ── Preview Modal ─────────────────────────────────────────────
export function PDFPreviewModal({ isOpen, onClose, docUri, filename, onDownload, onWhatsApp }) {
  if (!isOpen) return null
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:C.ink, borderRadius:16, width:'100%', maxWidth:860, height:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 32px 80px rgba(0,0,0,0.4)', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding:'14px 20px', display:'flex', alignItems:'center', gap:12, borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ width:32, height:32, borderRadius:8, background:C.steel, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>📄</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, color:'#fff' }}>{filename}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>PDF Preview</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {onWhatsApp && (
              <button onClick={onWhatsApp} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, border:'1px solid rgba(37,211,102,0.4)', background:'rgba(37,211,102,0.1)', color:'#25D366', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                💬 WhatsApp
              </button>
            )}
            <button onClick={onDownload} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, border:'none', background:C.steel, color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              ⬇ Download
            </button>
            <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, border:'1px solid rgba(255,255,255,0.15)', background:'transparent', color:'rgba(255,255,255,0.6)', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
          </div>
        </div>
        {/* PDF iframe */}
        <div style={{ flex:1, background:'#525659', padding:16, overflow:'auto' }}>
          {docUri ? (
            <iframe
              src={docUri}
              title="PDF Preview"
              style={{ width:'100%', height:'100%', border:'none', borderRadius:4, minHeight:400 }}
            />
          ) : (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'rgba(255,255,255,0.4)', fontSize:13 }}>
              Generating PDF...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Quote PDF Action Bar ───────────────────────────────────────
export function QuotePDFBar({ quote, company, client, items, bank }) {
  const [loading, setLoading] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [docUri, setDocUri] = useState(null)
  const { toast, show } = useToast()

  const filename = 'Quote-' + (quote.quote_number || 'draft') + '.pdf'

  const generate = useCallback(async () => {
    setLoading(true)
    try {
      const doc = await generateQuotePDF(quote, company || {}, client || {}, items || [], bank || {})
      const uri = getPDFDataUri(doc)
      setDocUri(uri)
      return doc
    } catch(e) {
      show('PDF generation failed: ' + e.message, 'error')
      return null
    } finally {
      setLoading(false)
    }
  }, [quote, company, client, items, bank])

  async function handlePreview() {
    if (!docUri) await generate()
    setPreviewOpen(true)
  }

  async function handleDownload() {
    setLoading(true)
    try {
      const doc = await generateQuotePDF(quote, company || {}, client || {}, items || [], bank || {})
      downloadPDF(doc, filename)
      show('PDF downloaded ✓')
    } catch(e) {
      show('Download failed: ' + e.message, 'error')
    }
    setLoading(false)
  }

  function handleWhatsApp() {
    shareQuoteViaWhatsApp(quote, client || {}, (company || {}).name || 'QLekha')
  }

  return (
    <>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', position:'relative' }}>
        <button onClick={handlePreview} disabled={loading} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:7, border:'1px solid ' + C.g100, background:C.snow, color:C.ink, fontSize:12, fontWeight:600, cursor:loading?'default':'pointer' }}>
          {loading ? <Spin/> : '👁'} Preview PDF
        </button>
        <button onClick={handleDownload} disabled={loading} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:7, border:'none', background:C.steel, color:'#fff', fontSize:12, fontWeight:600, cursor:loading?'default':'pointer' }}>
          {loading ? <Spin/> : '⬇'} Download PDF
        </button>
        <button onClick={handleWhatsApp} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:7, border:'1px solid rgba(37,211,102,0.3)', background:'rgba(37,211,102,0.06)', color:'#25D366', fontSize:12, fontWeight:600, cursor:'pointer' }}>
          💬 WhatsApp
        </button>
        {toast && (
          <div style={{ position:'absolute', bottom:'calc(100% + 8px)', left:0, background:toast.type==='error'?C.red:C.teal, color:'#fff', padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:600, whiteSpace:'nowrap', zIndex:10 }}>
            {toast.msg}
          </div>
        )}
      </div>
      <PDFPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        docUri={docUri}
        filename={filename}
        onDownload={handleDownload}
        onWhatsApp={handleWhatsApp}
      />
    </>
  )
}

// ── Invoice PDF Action Bar ─────────────────────────────────────
export function InvoicePDFBar({ invoice, company, client, items, bank }) {
  const [loading, setLoading] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [docUri, setDocUri] = useState(null)
  const { toast, show } = useToast()

  const filename = 'Invoice-' + (invoice.invoice_number || 'draft') + '.pdf'

  const generate = useCallback(async () => {
    setLoading(true)
    try {
      const doc = await generateInvoicePDF(invoice, company || {}, client || {}, items || [], bank || {})
      const uri = getPDFDataUri(doc)
      setDocUri(uri)
      return doc
    } catch(e) {
      show('PDF generation failed: ' + e.message, 'error')
      return null
    } finally {
      setLoading(false)
    }
  }, [invoice, company, client, items, bank])

  async function handlePreview() {
    if (!docUri) await generate()
    setPreviewOpen(true)
  }

  async function handleDownload() {
    setLoading(true)
    try {
      const doc = await generateInvoicePDF(invoice, company || {}, client || {}, items || [], bank || {})
      downloadPDF(doc, filename)
      show('PDF downloaded ✓')
    } catch(e) {
      show('Download failed: ' + e.message, 'error')
    }
    setLoading(false)
  }

  function handleWhatsApp() {
    shareInvoiceViaWhatsApp(invoice, client || {}, (company || {}).name || 'QLekha')
  }

  return (
    <>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', position:'relative' }}>
        <button onClick={handlePreview} disabled={loading} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:7, border:'1px solid ' + C.g100, background:C.snow, color:C.ink, fontSize:12, fontWeight:600, cursor:loading?'default':'pointer' }}>
          {loading ? <Spin/> : '👁'} Preview PDF
        </button>
        <button onClick={handleDownload} disabled={loading} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:7, border:'none', background:C.steel, color:'#fff', fontSize:12, fontWeight:600, cursor:loading?'default':'pointer' }}>
          {loading ? <Spin/> : '⬇'} Download PDF
        </button>
        <button onClick={handleWhatsApp} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:7, border:'1px solid rgba(37,211,102,0.3)', background:'rgba(37,211,102,0.06)', color:'#25D366', fontSize:12, fontWeight:600, cursor:'pointer' }}>
          💬 WhatsApp
        </button>
        {toast && (
          <div style={{ position:'absolute', bottom:'calc(100% + 8px)', left:0, background:toast.type==='error'?C.red:C.teal, color:'#fff', padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:600, whiteSpace:'nowrap', zIndex:10 }}>
            {toast.msg}
          </div>
        )}
      </div>
      <PDFPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        docUri={docUri}
        filename={filename}
        onDownload={handleDownload}
        onWhatsApp={handleWhatsApp}
      />
    </>
  )
}

// ── Standalone demo page (used at /pdf-demo) ──────────────────
export function PDFDemoPage() {
  const [generating, setGenerating] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [docUri, setDocUri] = useState(null)
  const { toast, show } = useToast()

  const demoQuote = {
    quote_number: 'Q-2025-042',
    created_at: new Date().toISOString(),
    valid_until: new Date(Date.now() + 15*24*60*60*1000).toISOString(),
    subtotal: 84745,
    gst_amount: 15254,
    installation_amount: 3200,
    discount_amount: 0,
    grand_total: 103199,
    notes: 'All profiles as per approved samples.',
  }
  const demoCompany = {
    name: 'Kumar Aluminium Works',
    address: '12, Industrial Estate, Phase 2',
    city: 'Bengaluru',
    state: 'Karnataka',
    phone: '+91 98765 43210',
    email: 'info@kumaraluminium.in',
    gst_number: '29ABCDE1234F1Z5',
    pan_number: 'ABCDE1234F',
    terms_quotation: '1. Prices valid for 15 days from date of quotation.\n2. Delivery in 21 working days from advance payment.\n3. 50% advance required to initiate work.\n4. Balance payment before dispatch.\n5. Warranty: 2 years on profiles, 1 year on hardware.',
    pdf_design: 'classic_blue',
  }
  const demoClient = {
    name: 'Priya Sharma',
    address: 'Flat 4B, Sunshine Apartments, Koramangala',
    city: 'Bengaluru',
    phone: '+91 98000 11122',
    email: 'priya@email.com',
  }
  const demoItems = [
    { title: 'Sliding Window 2-Track', description: 'Powder coated, 24-gauge profile', width_mm: 1800, height_mm: 1200, quantity: 3, unit_price: 12600, gst_rate: 18, total_amount: 37800 },
    { title: 'Fixed Glass Panel', description: 'Toughened 8mm glass', width_mm: 900, height_mm: 1500, quantity: 2, unit_price: 8250, gst_rate: 18, total_amount: 16500 },
    { title: 'Casement Window', description: 'Single shutter with mosquito mesh', width_mm: 600, height_mm: 900, quantity: 4, unit_price: 7611, gst_rate: 18, total_amount: 30444 },
  ]
  const demoBank = {
    bank_name: 'State Bank of India',
    account_number: '1234567890',
    ifsc_code: 'SBIN0001234',
    account_holder: 'Kumar Aluminium Works',
    upi_id: 'kumar@okhdfc',
  }

  async function generateDemo(theme) {
    setGenerating(true)
    try {
      const quoteWithTheme = { ...demoQuote }
      const companyWithTheme = { ...demoCompany, pdf_design: theme }
      const doc = await generateQuotePDF(quoteWithTheme, companyWithTheme, demoClient, demoItems, demoBank)
      const uri = getPDFDataUri(doc)
      setDocUri(uri)
      setPreviewOpen(true)
    } catch(e) {
      show('Error: ' + e.message, 'error')
    }
    setGenerating(false)
  }

  const THEMES = [
    {k:'classic_blue',  l:'Classic Blue',  c:'#1B4FD8'},
    {k:'midnight',      l:'Midnight',       c:'#0F1923'},
    {k:'teal_fresh',    l:'Teal Fresh',     c:C.teal},
    {k:'amber_warm',    l:'Amber Warm',     c:'#FFB400'},
    {k:'forest_green',  l:'Forest Green',   c:'#16A34A'},
    {k:'deep_purple',   l:'Deep Purple',    c:'#7C3AED'},
  ]

  return (
    <div style={{ maxWidth:700, margin:'0 auto', padding:24, fontFamily:'Inter,sans-serif' }}>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>

      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:C.ink, marginBottom:4 }}>PDF Generator</h2>
        <p style={{ fontSize:13, color:C.g400 }}>Generate branded quote and invoice PDFs. Pick a theme to preview.</p>
      </div>

      {/* Demo quote card */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid ' + C.g100, padding:20, marginBottom:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <div>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, color:C.ink }}>Demo Quote</div>
            <div style={{ fontSize:12, color:C.g400, marginTop:2 }}>Q-2025-042 · Priya Sharma · 3 items</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:20, fontWeight:500, color:C.ink }}>₹1,03,199</div>
            <div style={{ fontSize:11, color:C.g400 }}>incl. 18% GST</div>
          </div>
        </div>
        {demoItems.map((it, i) => (
          <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderTop:'1px solid ' + C.g100, fontSize:13 }}>
            <div>
              <span style={{ fontWeight:600, color:C.ink }}>{it.title}</span>
              <span style={{ color:C.g400, marginLeft:8, fontSize:11 }}>{it.width_mm}×{it.height_mm}mm × {it.quantity}</span>
            </div>
            <span style={{ fontFamily:'JetBrains Mono,monospace', color:C.ink }}>₹{it.total_amount.toLocaleString('en-IN')}</span>
          </div>
        ))}
      </div>

      {/* Theme selector */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.g400, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>Choose Theme & Preview</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          {THEMES.map(t => (
            <button key={t.k} onClick={() => generateDemo(t.k)} disabled={generating}
              style={{ padding:'12px 8px', borderRadius:12, border:'2px solid ' + t.c + '40', background:t.c + '10', cursor:generating?'default':'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
              <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,' + t.c + ',' + t.c + 'aa)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:800, color:'#fff' }}>Q</div>
              <div style={{ fontSize:11, fontWeight:600, color:C.ink }}>{t.l}</div>
            </button>
          ))}
        </div>
      </div>

      {generating && (
        <div style={{ textAlign:'center', padding:20, color:C.g400, fontSize:13 }}>
          <Spin/> &nbsp; Generating PDF...
        </div>
      )}

      {toast && (
        <div style={{ padding:'10px 14px', borderRadius:8, background:toast.type==='error'?'rgba(239,68,68,0.08)':'rgba(14,165,160,0.08)', color:toast.type==='error'?C.red:C.teal, fontSize:13, marginBottom:12 }}>
          {toast.msg}
        </div>
      )}

      <div style={{ background:'rgba(26,111,232,0.06)', border:'1px solid rgba(26,111,232,0.15)', borderRadius:12, padding:16 }}>
        <div style={{ fontSize:12, fontWeight:700, color:C.steel, marginBottom:6 }}>How it works</div>
        <div style={{ fontSize:12, color:'#4A5568', lineHeight:1.7 }}>
          PDFs are generated entirely in the browser using jsPDF — no server needed. Click any theme above to generate a live preview. From the preview you can download the PDF or open WhatsApp with a pre-filled message to share it with your client.
        </div>
      </div>

      <PDFPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        docUri={docUri}
        filename="Quote-Q-2025-042.pdf"
        onDownload={async () => {
          const doc = await generateQuotePDF(demoQuote, demoCompany, demoClient, demoItems, demoBank)
          downloadPDF(doc, 'Quote-Q-2025-042.pdf')
          show('Downloaded ✓')
        }}
        onWhatsApp={() => shareQuoteViaWhatsApp(demoQuote, demoClient, 'Kumar Aluminium Works')}
      />
    </div>
  )
}

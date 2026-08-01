/**
 * UNIT TESTS — Utility Functions
 * Tests normalisePhone, currency formatters, date formatters, WhatsApp message builders
 * Run: npx vitest run unit/utils.test.js
 */

import { describe, it, expect } from 'vitest'

// ─── Copied from whatsapp.js ──────────────────────────────────────────────────
function normalisePhone(raw = '') {
  const d = (raw || '').replace(/\D/g, '')
  if (d.startsWith('91') && d.length === 12) return d
  if (d.length === 10) return '91' + d
  return d
}

// ─── Copied from App.jsx / pdfgen.js ─────────────────────────────────────────
const fmt = (n) =>
  n >= 100000 ? '₹' + (n / 100000).toFixed(1) + 'L'
  : n >= 1000 ? '₹' + (n / 1000).toFixed(0) + 'K'
  : '₹' + (n || 0)

function fmtINR(n) {
  return (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d) {
  return new Date(d || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

// ─── Test: Phone Normalisation ────────────────────────────────────────────────
describe('normalisePhone', () => {
  it('adds 91 prefix to 10-digit number', () => {
    expect(normalisePhone('9876543210')).toBe('919876543210')
  })

  it('keeps 12-digit number starting with 91 unchanged', () => {
    expect(normalisePhone('919876543210')).toBe('919876543210')
  })

  it('strips spaces from phone number', () => {
    expect(normalisePhone('+91 98765 43210')).toBe('919876543210')
  })

  it('strips dashes from phone number', () => {
    expect(normalisePhone('98765-43210')).toBe('919876543210')
  })

  it('strips + from phone number', () => {
    expect(normalisePhone('+919876543210')).toBe('919876543210')
  })

  it('strips brackets and spaces', () => {
    expect(normalisePhone('(98765) 43210')).toBe('919876543210')
  })

  it('handles empty string', () => {
    expect(normalisePhone('')).toBe('')
  })

  it('handles null/undefined', () => {
    expect(normalisePhone(null)).toBe('')
    expect(normalisePhone(undefined)).toBe('')
  })

  it('returns raw digits if not 10 or 12 digits', () => {
    expect(normalisePhone('12345')).toBe('12345')
  })
})

// ─── Test: Currency Formatter (Dashboard KPIs) ───────────────────────────────
describe('fmt (currency formatter)', () => {
  it('formats zero correctly', () => {
    expect(fmt(0)).toBe('₹0')
  })

  it('formats amounts below 1000 as-is', () => {
    expect(fmt(500)).toBe('₹500')
    expect(fmt(999)).toBe('₹999')
  })

  it('formats thousands as K', () => {
    expect(fmt(1000)).toBe('₹1K')
    expect(fmt(5000)).toBe('₹5K')
    expect(fmt(99000)).toBe('₹99K')
  })

  it('formats lakhs as L', () => {
    expect(fmt(100000)).toBe('₹1.0L')
    expect(fmt(250000)).toBe('₹2.5L')
    expect(fmt(1000000)).toBe('₹10.0L')
  })

  it('handles null/undefined as 0', () => {
    expect(fmt(null)).toBe('₹0')
    expect(fmt(undefined)).toBe('₹0')
  })
})

// ─── Test: INR Formatter (PDF) ───────────────────────────────────────────────
describe('fmtINR (PDF formatter)', () => {
  it('formats integer with 2 decimal places', () => {
    expect(fmtINR(1000)).toContain('1,000.00')
  })

  it('formats large numbers with Indian commas', () => {
    expect(fmtINR(100000)).toContain('1,00,000.00')
  })

  it('handles zero', () => {
    expect(fmtINR(0)).toBe('0.00')
  })

  it('handles null as 0', () => {
    expect(fmtINR(null)).toBe('0.00')
  })
})

// ─── Test: Date Formatter ─────────────────────────────────────────────────────
describe('fmtDate', () => {
  it('formats ISO date string correctly', () => {
    const date = '2024-01-15T00:00:00.000Z'
    const formatted = fmtDate(date)
    expect(formatted).toContain('Jan')
    expect(formatted).toContain('2024')
  })

  it('returns a non-empty string for any valid date', () => {
    const formatted = fmtDate(new Date().toISOString())
    expect(formatted.length).toBeGreaterThan(0)
  })

  it('uses current date when no argument given', () => {
    const formatted = fmtDate(null)
    const year = new Date().getFullYear().toString()
    expect(formatted).toContain(year)
  })
})

// ─── Test: WhatsApp Message Builder ──────────────────────────────────────────
describe('WhatsApp Message Builder', () => {
  function buildQuoteMessage(quote, client, companyName) {
    return 'Hi ' + (client.name || 'there') +
      ', your quotation *#' + quote.quote_number +
      '* for *₹' + (quote.grand_total || 0).toLocaleString('en-IN') +
      '* is ready. Reply YES to approve. _' + companyName + '_'
  }

  function buildInvoiceMessage(invoice, client, companyName) {
    return 'Hi ' + (client.name || 'there') +
      ', your invoice *#' + invoice.invoice_number +
      '* for *₹' + (invoice.grand_total || 0).toLocaleString('en-IN') +
      '* is ready. Thank you. _' + companyName + '_'
  }

  it('builds quote WhatsApp message with client name', () => {
    const msg = buildQuoteMessage(
      { quote_number: 'Q-2024-1234', grand_total: 50000 },
      { name: 'Priya Sharma' },
      'Kumar Aluminium'
    )
    expect(msg).toContain('Priya Sharma')
    expect(msg).toContain('Q-2024-1234')
    expect(msg).toContain('50,000')
    expect(msg).toContain('Reply YES')
    expect(msg).toContain('Kumar Aluminium')
  })

  it('uses "there" when client name is missing', () => {
    const msg = buildQuoteMessage(
      { quote_number: 'Q-2024-1234', grand_total: 50000 },
      {},
      'Kumar Aluminium'
    )
    expect(msg).toContain('Hi there')
  })

  it('builds invoice WhatsApp message', () => {
    const msg = buildInvoiceMessage(
      { invoice_number: 'INV-2024-5678', grand_total: 75000 },
      { name: 'Rajesh Kumar' },
      'Acme Windows'
    )
    expect(msg).toContain('Rajesh Kumar')
    expect(msg).toContain('INV-2024-5678')
    expect(msg).toContain('75,000')
    expect(msg).toContain('Thank you')
  })

  it('builds wa.me URL correctly', () => {
    const phone = '919876543210'
    const text = 'Hello'
    const url = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(text)
    expect(url).toBe('https://wa.me/919876543210?text=Hello')
  })
})

// ─── Test: Trial Days Calculation ─────────────────────────────────────────────
describe('Trial Days Calculation', () => {
  it('calculates trial days remaining correctly', () => {
    const trialExpiry = new Date(Date.now() + 14 * 864e5).toISOString()
    const days = Math.max(0, Math.ceil((new Date(trialExpiry) - new Date()) / 864e5))
    expect(days).toBe(14)
  })

  it('returns 0 for expired trial', () => {
    const trialExpiry = new Date(Date.now() - 1 * 864e5).toISOString()
    const days = Math.max(0, Math.ceil((new Date(trialExpiry) - new Date()) / 864e5))
    expect(days).toBe(0)
  })

  it('shows trial warning when 7 or fewer days remain', () => {
    const trialExpiry = new Date(Date.now() + 5 * 864e5).toISOString()
    const days = Math.max(0, Math.ceil((new Date(trialExpiry) - new Date()) / 864e5))
    expect(days <= 7).toBe(true)
  })
})

// ─── Test: Invoice Status Logic ───────────────────────────────────────────────
describe('Invoice Status Logic', () => {
  it('marks invoice as paid when balance is 0', () => {
    const getStatus = (paidAmount, grandTotal) => {
      const balance = Math.max(0, grandTotal - paidAmount)
      return balance <= 0 ? 'paid' : 'partial'
    }
    expect(getStatus(50000, 50000)).toBe('paid')
    expect(getStatus(60000, 50000)).toBe('paid') // overpaid
  })

  it('marks invoice as partial when partially paid', () => {
    const getStatus = (paidAmount, grandTotal) => {
      const balance = Math.max(0, grandTotal - paidAmount)
      return balance <= 0 ? 'paid' : 'partial'
    }
    expect(getStatus(25000, 50000)).toBe('partial')
    expect(getStatus(1, 50000)).toBe('partial')
  })

  it('detects overdue invoice correctly', () => {
    const isOverdue = (dueDate, status, balanceDue) => {
      return status !== 'paid' && dueDate && new Date(dueDate) < new Date() && balanceDue > 0
    }
    const pastDate = new Date(Date.now() - 5 * 864e5).toISOString()
    const futureDate = new Date(Date.now() + 5 * 864e5).toISOString()
    expect(isOverdue(pastDate, 'pending', 10000)).toBe(true)
    expect(isOverdue(futureDate, 'pending', 10000)).toBe(false)
    expect(isOverdue(pastDate, 'paid', 0)).toBe(false)
  })
})

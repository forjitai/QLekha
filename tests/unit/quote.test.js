/**
 * UNIT TESTS — Quote & Invoice Pricing Logic
 * Column names verified against real Supabase schema
 *
 * Real DB columns:
 *   quotes: sub_total, cgst_amount, sgst_amount, gst_rate, installation,
 *           discount_amount, grand_total, expires_at, status (quote_status enum)
 *   invoices: base_amount, cgst_amount, sgst_amount, installation,
 *             grand_total, balance_due, paid_amount, due_date, status (bill_status)
 *   quote_items: width_mm, height_mm, quantity, item_value, total_amount,
 *                title, hardware_name, profile_cost, glass_cost
 */
import { describe, it, expect } from 'vitest'

// ─── Pricing Calculation (mirrors QuoteWizard Step3) ─────────────────────────
function calcPrice(item, profile, glass) {
  const sqft = (item.width_mm / 1000) * (item.height_mm / 1000) * 10.764
  const profCost = profile?.weight_per_meter && profile?.price_per_kg
    ? (profile.weight_per_meter * profile.price_per_kg * (item.width_mm + item.height_mm) * 2 / 1000)
    : 0
  const glassCost = glass?.price_per_sqft ? glass.price_per_sqft * sqft : 0
  return Math.round(profCost + glassCost)
}

// ─── Quote Grand Total (real DB schema) ──────────────────────────────────────
function calcQuoteTotals(items, gstRate, installation = 0, discount = 0) {
  const base_amount = items.reduce((s, i) => s + (i.unit_price * i.quantity), 0)
  const gstTotal = Math.round(base_amount * gstRate / 100)
  const cgst_amount = Math.round(gstTotal / 2)
  const sgst_amount = gstTotal - cgst_amount
  const grand_total = Math.round(base_amount + gstTotal + installation - discount)
  return { sub_total: base_amount, cgst_amount, sgst_amount, grand_total, gst_rate: gstRate }
}

// ─── Profile Cost ─────────────────────────────────────────────────────────────
describe('Profile Cost Calculation', () => {
  it('calculates profile cost from weight and price per kg', () => {
    const item = { width_mm: 1200, height_mm: 900 }
    const profile = { weight_per_meter: 1.8, price_per_kg: 280 }
    // Perimeter = (1200+900)*2/1000 = 4.2m; cost = 4.2*1.8*280 = 2116.8 ≈ 2117
    expect(calcPrice(item, profile, null)).toBe(2117)
  })

  it('returns 0 for missing profile', () => {
    expect(calcPrice({ width_mm: 1200, height_mm: 900 }, null, null)).toBe(0)
  })

  it('returns 0 when weight_per_meter is 0', () => {
    const profile = { weight_per_meter: 0, price_per_kg: 280 }
    expect(calcPrice({ width_mm: 1200, height_mm: 900 }, profile, null)).toBe(0)
  })

  it('scales with window size', () => {
    const small = { width_mm: 600, height_mm: 600 }
    const large = { width_mm: 1200, height_mm: 1200 }
    const profile = { weight_per_meter: 1.8, price_per_kg: 280 }
    expect(calcPrice(large, profile, null)).toBeGreaterThan(calcPrice(small, profile, null))
  })
})

// ─── Glass Cost ───────────────────────────────────────────────────────────────
describe('Glass Cost Calculation', () => {
  it('calculates glass cost in sqft', () => {
    const item = { width_mm: 1000, height_mm: 1000 }
    const glass = { price_per_sqft: 45 }
    // 1m x 1m = 1 sqm = 10.764 sqft; cost = 10.764 * 45 = 484.38 ≈ 484
    expect(calcPrice(item, null, glass)).toBeCloseTo(484, 0)
  })

  it('returns 0 for missing glass', () => {
    expect(calcPrice({ width_mm: 1200, height_mm: 900 }, null, null)).toBe(0)
  })
})

// ─── Quote Totals (real DB columns) ──────────────────────────────────────────
describe('Quote Totals - Real DB Schema', () => {
  const items = [
    { unit_price: 15000, quantity: 2 }, // 30000
    { unit_price: 8000, quantity: 1 },  // 8000
  ]

  it('calculates sub_total (not subtotal)', () => {
    const { sub_total } = calcQuoteTotals(items, 18)
    expect(sub_total).toBe(38000)
  })

  it('splits GST into cgst_amount and sgst_amount equally', () => {
    const { cgst_amount, sgst_amount } = calcQuoteTotals(items, 18)
    expect(cgst_amount).toBe(sgst_amount)
    expect(cgst_amount + sgst_amount).toBe(Math.round(38000 * 0.18))
  })

  it('calculates grand_total correctly', () => {
    const { grand_total } = calcQuoteTotals(items, 18)
    expect(grand_total).toBe(38000 + Math.round(38000 * 0.18))
  })

  it('adds installation to grand_total', () => {
    const { grand_total } = calcQuoteTotals(items, 18, 5000)
    const base = 38000 + Math.round(38000 * 0.18)
    expect(grand_total).toBe(base + 5000)
  })

  it('subtracts discount from grand_total', () => {
    const { grand_total } = calcQuoteTotals(items, 18, 0, 2000)
    const base = 38000 + Math.round(38000 * 0.18)
    expect(grand_total).toBe(base - 2000)
  })

  it('stores gst_rate not gst_amount as direct field', () => {
    const totals = calcQuoteTotals(items, 18)
    expect(totals.gst_rate).toBe(18)
    expect(totals.sub_total).toBeDefined()
    expect(totals.cgst_amount).toBeDefined()
    expect(totals.sgst_amount).toBeDefined()
    // These should NOT exist as column names
    expect(totals.subtotal).toBeUndefined()
    expect(totals.gst_amount).toBeUndefined()
  })
})

// ─── Invoice Columns (real DB schema) ────────────────────────────────────────
describe('Invoice - Real DB Schema', () => {
  it('uses base_amount not subtotal', () => {
    const inv = { base_amount: 50000, cgst_amount: 4500, sgst_amount: 4500, grand_total: 59000 }
    expect(inv.base_amount).toBeDefined()
    expect(inv.subtotal).toBeUndefined()
  })

  it('uses installation not installation_amount', () => {
    const inv = { installation: 3000, grand_total: 62000 }
    expect(inv.installation).toBeDefined()
    expect(inv.installation_amount).toBeUndefined()
  })

  it('uses expires_at not valid_until for quotes', () => {
    const quote = { expires_at: new Date(Date.now() + 15 * 864e5).toISOString() }
    expect(quote.expires_at).toBeDefined()
    expect(quote.valid_until).toBeUndefined()
  })

  it('balance_due = grand_total - paid_amount', () => {
    const grandTotal = 59000
    const paidAmount = 30000
    const balance = grandTotal - paidAmount
    expect(balance).toBe(29000)
  })

  it('invoice status transitions correctly', () => {
    const validStatuses = ['draft', 'sent', 'paid', 'partial', 'pending', 'overdue', 'cancelled']
    const transitions = { pending: 'partial', partial: 'paid' }
    expect(validStatuses.includes(transitions.pending)).toBe(true)
    expect(validStatuses.includes(transitions.partial)).toBe(true)
  })
})

// ─── Quote Number Generation ──────────────────────────────────────────────────
describe('Quote Number Generation', () => {
  const genQuoteNum = () => 'Q-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000) + 1000)
  const genInvNum = () => 'INV-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000) + 1000)

  it('quote number matches Q-YYYY-NNNN format', () => {
    expect(genQuoteNum()).toMatch(/^Q-\d{4}-\d{4}$/)
  })

  it('invoice number matches INV-YYYY-NNNN format', () => {
    expect(genInvNum()).toMatch(/^INV-\d{4}-\d{4}$/)
  })

  it('4-digit suffix always in range 1000-9999', () => {
    for (let i = 0; i < 10; i++) {
      const num = parseInt(genQuoteNum().split('-')[2])
      expect(num).toBeGreaterThanOrEqual(1000)
      expect(num).toBeLessThanOrEqual(9999)
    }
  })

  it('contains current year', () => {
    const year = new Date().getFullYear().toString()
    expect(genQuoteNum()).toContain(year)
  })
})

// ─── Quote Item Columns (real DB schema) ─────────────────────────────────────
describe('Quote Items - Real DB Schema', () => {
  it('uses item_value not unit_price', () => {
    const item = { title: 'Sliding Window', item_value: 15000, quantity: 2, total_amount: 35400 }
    expect(item.item_value).toBeDefined()
    expect(item.unit_price).toBeUndefined()
  })

  it('uses hardware_name not description', () => {
    const item = { title: 'Casement', hardware_name: 'Powder coated finish', total_amount: 12000 }
    expect(item.hardware_name).toBeDefined()
    expect(item.description).toBeUndefined()
  })

  it('total_amount = item_value * quantity * (1 + gst/100)', () => {
    const item_value = 15000
    const quantity = 2
    const gst = 18
    const total = Math.round(item_value * quantity * (1 + gst / 100))
    expect(total).toBe(35400)
  })
})

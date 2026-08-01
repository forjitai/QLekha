/**
 * UNIT TESTS — Quote Wizard & Pricing Logic
 * Tests window pricing calculations, GST, totals, quote number generation
 * Run: npx vitest run unit/quote.test.js
 */

import { describe, it, expect, vi } from 'vitest'

// ─── Pricing Calculation (mirrors Step3 in QuoteWizard.jsx) ──────────────────
function calcPrice(item, profile, glass) {
  const sqft = (item.width_mm / 1000) * (item.height_mm / 1000) * 10.764
  const profCost = profile && profile.weight_per_meter && profile.price_per_kg
    ? (profile.weight_per_meter * profile.price_per_kg * (item.width_mm + item.height_mm) * 2 / 1000)
    : 0
  const glassCost = glass && glass.price_per_sqft ? glass.price_per_sqft * sqft : 0
  return Math.round(profCost + glassCost)
}

function calcTotal(unitPrice, qty, gstRate) {
  return Math.round(unitPrice * qty * (1 + gstRate / 100))
}

function calcGrandTotal(items) {
  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const gst = items.reduce((s, i) => s + i.unit_price * i.quantity * i.gst_rate / 100, 0)
  return { subtotal: Math.round(subtotal), gst_amount: Math.round(gst), grand_total: Math.round(subtotal + gst) }
}

// ─── Test: Profile Price Calculation ─────────────────────────────────────────
describe('Profile Price Calculation', () => {
  const item = { width_mm: 1200, height_mm: 900 }
  const profile = { weight_per_meter: 1.8, price_per_kg: 280 }

  it('calculates profile cost correctly', () => {
    // Perimeter = (1200 + 900) * 2 / 1000 = 4.2 meters
    // Cost = 4.2 * 1.8 * 280 = 2116.8 ≈ 2117
    const price = calcPrice(item, profile, null)
    expect(price).toBe(2117)
  })

  it('returns 0 when no profile selected', () => {
    const price = calcPrice(item, null, null)
    expect(price).toBe(0)
  })

  it('returns 0 when profile has no price_per_kg', () => {
    const price = calcPrice(item, { weight_per_meter: 1.8, price_per_kg: 0 }, null)
    expect(price).toBe(0)
  })
})

// ─── Test: Glass Price Calculation ───────────────────────────────────────────
describe('Glass Price Calculation', () => {
  const item = { width_mm: 1200, height_mm: 900 }
  const glass = { price_per_sqft: 45 }

  it('calculates glass cost correctly', () => {
    // Area = 1.2 * 0.9 = 1.08 sqm = 1.08 * 10.764 = 11.625 sqft
    // Cost = 11.625 * 45 ≈ 523
    const price = calcPrice(item, null, glass)
    expect(price).toBeGreaterThan(500)
    expect(price).toBeLessThan(550)
  })

  it('returns 0 when no glass selected', () => {
    const price = calcPrice(item, null, null)
    expect(price).toBe(0)
  })

  it('adds profile + glass costs together', () => {
    const profile = { weight_per_meter: 1.8, price_per_kg: 280 }
    const priceWithBoth = calcPrice(item, profile, glass)
    const priceProfileOnly = calcPrice(item, profile, null)
    const priceGlassOnly = calcPrice(item, null, glass)
    expect(priceWithBoth).toBeCloseTo(priceProfileOnly + priceGlassOnly, 0)
  })
})

// ─── Test: GST Calculation ───────────────────────────────────────────────────
describe('GST Calculation', () => {
  it('applies 18% GST correctly', () => {
    const total = calcTotal(10000, 1, 18)
    expect(total).toBe(11800)
  })

  it('applies 0% GST correctly', () => {
    const total = calcTotal(10000, 1, 0)
    expect(total).toBe(10000)
  })

  it('applies 28% GST correctly', () => {
    const total = calcTotal(10000, 1, 28)
    expect(total).toBe(12800)
  })

  it('multiplies by quantity correctly', () => {
    const total = calcTotal(5000, 3, 18)
    expect(total).toBe(17700) // 5000 * 3 = 15000, + 18% = 17700
  })
})

// ─── Test: Grand Total ────────────────────────────────────────────────────────
describe('Quote Grand Total', () => {
  const items = [
    { title: 'Sliding 2-Track', unit_price: 12000, quantity: 2, gst_rate: 18, total_amount: 28320 },
    { title: 'Casement', unit_price: 8000, quantity: 1, gst_rate: 18, total_amount: 9440 },
  ]

  it('calculates subtotal correctly', () => {
    const { subtotal } = calcGrandTotal(items)
    expect(subtotal).toBe(32000) // 12000*2 + 8000*1
  })

  it('calculates GST amount correctly', () => {
    const { gst_amount } = calcGrandTotal(items)
    expect(gst_amount).toBe(5760) // 32000 * 18%
  })

  it('calculates grand total correctly', () => {
    const { grand_total } = calcGrandTotal(items)
    expect(grand_total).toBe(37760) // 32000 + 5760
  })

  it('handles single item', () => {
    const singleItem = [{ unit_price: 5000, quantity: 1, gst_rate: 18 }]
    const { grand_total } = calcGrandTotal(singleItem)
    expect(grand_total).toBe(5900)
  })

  it('handles empty items array', () => {
    const { grand_total } = calcGrandTotal([])
    expect(grand_total).toBe(0)
  })
})

// ─── Test: Discount & Installation ───────────────────────────────────────────
describe('Discount and Installation', () => {
  it('subtracts discount from grand total', () => {
    const subtotal = 50000
    const gst = 9000
    const installation = 3000
    const discount = 2000
    const final = Math.round(subtotal + gst + installation - discount)
    expect(final).toBe(60000)
  })

  it('adds installation to grand total', () => {
    const subtotal = 50000
    const gst = 9000
    const installation = 5000
    const discount = 0
    const final = Math.round(subtotal + gst + installation - discount)
    expect(final).toBe(64000)
  })

  it('grand total cannot be negative', () => {
    const subtotal = 1000
    const gst = 180
    const discount = 99999
    const final = Math.max(0, Math.round(subtotal + gst - discount))
    expect(final).toBe(0)
  })
})

// ─── Test: Quote Number Generation ───────────────────────────────────────────
describe('Quote Number Generation', () => {
  it('generates quote number with current year', () => {
    const year = new Date().getFullYear()
    const qNum = 'Q-' + year + '-' + String(Math.floor(Math.random() * 9000) + 1000)
    expect(qNum).toMatch(/^Q-\d{4}-\d{4}$/)
    expect(qNum).toContain(String(year))
  })

  it('quote number is always 4 digits after year', () => {
    for (let i = 0; i < 20; i++) {
      const qNum = 'Q-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000) + 1000)
      const parts = qNum.split('-')
      expect(parts[2].length).toBe(4)
      expect(parseInt(parts[2])).toBeGreaterThanOrEqual(1000)
      expect(parseInt(parts[2])).toBeLessThanOrEqual(9999)
    }
  })

  it('generates invoice number in INV- format', () => {
    const year = new Date().getFullYear()
    const invNum = 'INV-' + year + '-' + String(Math.floor(Math.random() * 9000) + 1000)
    expect(invNum).toMatch(/^INV-\d{4}-\d{4}$/)
  })
})

// ─── Test: Quote Validity ─────────────────────────────────────────────────────
describe('Quote Validity Period', () => {
  it('calculates 15-day validity correctly', () => {
    const validUntil = new Date(Date.now() + 15 * 864e5)
    const diffDays = Math.round((validUntil - new Date()) / 864e5)
    expect(diffDays).toBe(15)
  })

  it('calculates 30-day validity correctly', () => {
    const validUntil = new Date(Date.now() + 30 * 864e5)
    const diffDays = Math.round((validUntil - new Date()) / 864e5)
    expect(diffDays).toBe(30)
  })

  it('validity date is in the future', () => {
    const validUntil = new Date(Date.now() + 15 * 864e5)
    expect(validUntil.getTime()).toBeGreaterThan(Date.now())
  })
})

/**
 * INTEGRATION TESTS — Supabase Database Operations
 * Tests real DB operations: CRUD for companies, quotes, invoices, clients, stock
 * Uses test data that gets cleaned up after each test
 *
 * Setup: Set SUPABASE_URL and SUPABASE_ANON_KEY in .env.test
 * Run: npx vitest run integration/database.test.js
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yqtgfgvcohuwaaugxlrz.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Test company created in beforeAll
let testCompanyId = null
let testClientId = null
let testQuoteId = null
let testInvoiceId = null

// ─── Setup / Teardown ─────────────────────────────────────────────────────────
beforeAll(async () => {
  // Create a test company
  const { data, error } = await supabase.from('companies').insert({
    name: '__TEST_COMPANY__',
    owner_name: 'Test Owner',
    phone: '9999999999',
    city: 'Test City',
    plan: 'trial',
    trial_started_at: new Date().toISOString(),
    plan_expires_at: new Date(Date.now() + 14 * 864e5).toISOString(),
    pdf_design: 'classic_blue',
  }).select().single()

  if (error) throw new Error('Setup failed: ' + error.message)
  testCompanyId = data.id
})

afterAll(async () => {
  if (!testCompanyId) return
  // Clean up all test data
  await supabase.from('quote_items').delete().eq('company_id', testCompanyId)
  await supabase.from('quotes').delete().eq('company_id', testCompanyId)
  await supabase.from('invoices').delete().eq('company_id', testCompanyId)
  await supabase.from('payments').delete().eq('company_id', testCompanyId)
  await supabase.from('clients').delete().eq('company_id', testCompanyId)
  await supabase.from('profile_companies').delete().eq('company_id', testCompanyId)
  await supabase.from('glass_types').delete().eq('company_id', testCompanyId)
  await supabase.from('accessories').delete().eq('company_id', testCompanyId)
  await supabase.from('companies').delete().eq('id', testCompanyId)
})

// ─── Companies ────────────────────────────────────────────────────────────────
describe('Companies Table', () => {
  it('can read the test company', async () => {
    const { data, error } = await supabase.from('companies').select('*').eq('id', testCompanyId).single()
    expect(error).toBeNull()
    expect(data.name).toBe('__TEST_COMPANY__')
    expect(data.plan).toBe('trial')
  })

  it('can update company settings', async () => {
    const { error } = await supabase.from('companies')
      .update({ city: 'Mumbai', gst_number: '27ABCDE1234F1Z5' })
      .eq('id', testCompanyId)
    expect(error).toBeNull()

    const { data } = await supabase.from('companies').select('city,gst_number').eq('id', testCompanyId).single()
    expect(data.city).toBe('Mumbai')
    expect(data.gst_number).toBe('27ABCDE1234F1Z5')
  })
})

// ─── Clients ──────────────────────────────────────────────────────────────────
describe('Clients Table', () => {
  it('can insert a client', async () => {
    const { data, error } = await supabase.from('clients').insert({
      company_id: testCompanyId,
      name: 'Test Client',
      phone: '9876543210',
      email: 'testclient@test.com',
      city: 'Bengaluru',
      tag: 'residential',
      is_active: true,
    }).select().single()

    expect(error).toBeNull()
    expect(data.name).toBe('Test Client')
    expect(data.tag).toBe('residential')
    testClientId = data.id
  })

  it('can search clients by name', async () => {
    const { data, error } = await supabase.from('clients')
      .select('*')
      .eq('company_id', testCompanyId)
      .ilike('name', '%Test Client%')

    expect(error).toBeNull()
    expect(data.length).toBeGreaterThan(0)
    expect(data[0].name).toContain('Test Client')
  })

  it('can update client details', async () => {
    const { error } = await supabase.from('clients')
      .update({ city: 'Chennai' })
      .eq('id', testClientId)

    expect(error).toBeNull()
    const { data } = await supabase.from('clients').select('city').eq('id', testClientId).single()
    expect(data.city).toBe('Chennai')
  })
})

// ─── Stock: Profiles ──────────────────────────────────────────────────────────
describe('Profile Companies (Stock)', () => {
  let profileId = null

  it('can insert a profile', async () => {
    const { data, error } = await supabase.from('profile_companies').insert({
      company_id: testCompanyId,
      brand: 'TestBrand',
      series: 'T100',
      material_type: 'aluminium',
      color: 'Silver',
      weight_per_meter: 1.8,
      price_per_kg: 280,
    }).select().single()

    expect(error).toBeNull()
    expect(data.brand).toBe('TestBrand')
    profileId = data.id
  })

  it('can update profile pricing', async () => {
    const { error } = await supabase.from('profile_companies')
      .update({ price_per_kg: 300 })
      .eq('id', profileId)
    expect(error).toBeNull()

    const { data } = await supabase.from('profile_companies').select('price_per_kg').eq('id', profileId).single()
    expect(data.price_per_kg).toBe(300)
  })

  it('can list profiles for a company', async () => {
    const { data, error } = await supabase.from('profile_companies')
      .select('*').eq('company_id', testCompanyId)
    expect(error).toBeNull()
    expect(data.length).toBeGreaterThan(0)
  })

  it('can delete a profile', async () => {
    const { error } = await supabase.from('profile_companies').delete().eq('id', profileId)
    expect(error).toBeNull()
  })
})

// ─── Stock: Glass ─────────────────────────────────────────────────────────────
describe('Glass Types (Stock)', () => {
  let glassId = null

  it('can insert glass type', async () => {
    const { data, error } = await supabase.from('glass_types').insert({
      company_id: testCompanyId,
      name: 'Test Clear 4mm',
      thickness_mm: 4,
      price_per_sqft: 45,
      brand: 'Saint-Gobain',
    }).select().single()

    expect(error).toBeNull()
    expect(data.name).toBe('Test Clear 4mm')
    glassId = data.id
  })

  it('can update glass price', async () => {
    const { error } = await supabase.from('glass_types').update({ price_per_sqft: 50 }).eq('id', glassId)
    expect(error).toBeNull()
    const { data } = await supabase.from('glass_types').select('price_per_sqft').eq('id', glassId).single()
    expect(data.price_per_sqft).toBe(50)
  })

  afterAll(async () => {
    if (glassId) await supabase.from('glass_types').delete().eq('id', glassId)
  })
})

// ─── Quotes ───────────────────────────────────────────────────────────────────
describe('Quotes Table', () => {
  it('can create a quote', async () => {
    const { data, error } = await supabase.from('quotes').insert({
      company_id: testCompanyId,
      client_id: testClientId,
      client_name: 'Test Client',
      quote_number: 'Q-TEST-0001',
      status: 'draft',
      subtotal: 50000,
      gst_amount: 9000,
      discount_amount: 0,
      installation_amount: 0,
      grand_total: 59000,
      valid_until: new Date(Date.now() + 15 * 864e5).toISOString(),
    }).select().single()

    expect(error).toBeNull()
    expect(data.quote_number).toBe('Q-TEST-0001')
    expect(data.grand_total).toBe(59000)
    expect(data.status).toBe('draft')
    testQuoteId = data.id
  })

  it('can add quote items', async () => {
    const { data, error } = await supabase.from('quote_items').insert([
      {
        quote_id: testQuoteId,
        company_id: testCompanyId,
        title: 'Sliding Window 2-Track',
        width_mm: 1200,
        height_mm: 900,
        quantity: 2,
        unit_price: 15000,
        gst_rate: 18,
        total_amount: 35400,
      },
    ]).select()

    expect(error).toBeNull()
    expect(data.length).toBe(1)
    expect(data[0].title).toBe('Sliding Window 2-Track')
  })

  it('can update quote status to sent', async () => {
    const { error } = await supabase.from('quotes').update({ status: 'sent' }).eq('id', testQuoteId)
    expect(error).toBeNull()
    const { data } = await supabase.from('quotes').select('status').eq('id', testQuoteId).single()
    expect(data.status).toBe('sent')
  })

  it('can update quote status to approved', async () => {
    const { error } = await supabase.from('quotes').update({ status: 'approved' }).eq('id', testQuoteId)
    expect(error).toBeNull()
    const { data } = await supabase.from('quotes').select('status').eq('id', testQuoteId).single()
    expect(data.status).toBe('approved')
  })

  it('can filter quotes by status', async () => {
    const { data, error } = await supabase.from('quotes')
      .select('*').eq('company_id', testCompanyId).eq('status', 'approved')
    expect(error).toBeNull()
    expect(data.every(q => q.status === 'approved')).toBe(true)
  })
})

// ─── Invoices ─────────────────────────────────────────────────────────────────
describe('Invoices Table', () => {
  it('can convert quote to invoice', async () => {
    const { data, error } = await supabase.from('invoices').insert({
      company_id: testCompanyId,
      quote_id: testQuoteId,
      client_id: testClientId,
      client_name: 'Test Client',
      invoice_number: 'INV-TEST-0001',
      type: 'tax_invoice',
      status: 'pending',
      subtotal: 50000,
      gst_amount: 9000,
      grand_total: 59000,
      paid_amount: 0,
      balance_due: 59000,
      due_date: new Date(Date.now() + 30 * 864e5).toISOString(),
    }).select().single()

    expect(error).toBeNull()
    expect(data.invoice_number).toBe('INV-TEST-0001')
    expect(data.status).toBe('pending')
    expect(data.balance_due).toBe(59000)
    testInvoiceId = data.id
  })

  it('can record a payment and update invoice', async () => {
    const paymentAmount = 30000

    // Insert payment
    const { error: pError } = await supabase.from('payments').insert({
      company_id: testCompanyId,
      invoice_id: testInvoiceId,
      client_id: testClientId,
      amount: paymentAmount,
      payment_mode: 'bank_transfer',
      payment_date: new Date().toISOString().slice(0, 10),
    })
    expect(pError).toBeNull()

    // Update invoice
    const newBalance = 59000 - paymentAmount
    const { error: iError } = await supabase.from('invoices').update({
      paid_amount: paymentAmount,
      balance_due: newBalance,
      status: 'partial',
    }).eq('id', testInvoiceId)
    expect(iError).toBeNull()

    const { data } = await supabase.from('invoices').select('*').eq('id', testInvoiceId).single()
    expect(data.paid_amount).toBe(30000)
    expect(data.balance_due).toBe(29000)
    expect(data.status).toBe('partial')
  })

  it('marks invoice as paid when fully paid', async () => {
    const { error } = await supabase.from('invoices').update({
      paid_amount: 59000,
      balance_due: 0,
      status: 'paid',
    }).eq('id', testInvoiceId)
    expect(error).toBeNull()

    const { data } = await supabase.from('invoices').select('status,balance_due').eq('id', testInvoiceId).single()
    expect(data.status).toBe('paid')
    expect(data.balance_due).toBe(0)
  })
})

// ─── Dashboard KPIs ───────────────────────────────────────────────────────────
describe('Dashboard KPI Queries', () => {
  it('can count total quotes for a company', async () => {
    const { data, error } = await supabase.from('quotes')
      .select('id', { count: 'exact' }).eq('company_id', testCompanyId)
    expect(error).toBeNull()
    expect(data.length).toBeGreaterThan(0)
  })

  it('can sum revenue from invoices', async () => {
    const { data, error } = await supabase.from('invoices')
      .select('grand_total').eq('company_id', testCompanyId)
    expect(error).toBeNull()
    const total = data.reduce((s, i) => s + (i.grand_total || 0), 0)
    expect(total).toBeGreaterThan(0)
  })

  it('can count total clients', async () => {
    const { data, error } = await supabase.from('clients')
      .select('id').eq('company_id', testCompanyId)
    expect(error).toBeNull()
    expect(data.length).toBeGreaterThan(0)
  })

  it('can fetch recent quotes ordered by date', async () => {
    const { data, error } = await supabase.from('quotes')
      .select('*').eq('company_id', testCompanyId)
      .order('created_at', { ascending: false }).limit(10)
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })
})

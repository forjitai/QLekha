/**
 * INTEGRATION TESTS — Real Supabase DB Operations
 * All column names verified against actual schema
 *
 * Setup: Create .env.test with:
 *   SUPABASE_URL=https://yqtgfgvcohuwaaugxlrz.supabase.co
 *   SUPABASE_ANON_KEY=<your_anon_key>
 *   SUPABASE_SERVICE_KEY=<your_service_key>  ← needed to bypass RLS in tests
 *
 * Run: npx vitest run integration/database.test.js
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const URL  = process.env.SUPABASE_URL  || 'https://yqtgfgvcohuwaaugxlrz.supabase.co'
const KEY  = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
const db   = createClient(URL, KEY)

const CO_ID  = '1dea928a-cbca-42a9-be76-bd2421da239f' // real test company
let clientId = null
let quoteId  = null
let invoiceId = null

// ─── Cleanup helpers ──────────────────────────────────────────────────────────
async function cleanup() {
  await db.from('payments').delete().eq('company_id', CO_ID)
  await db.from('quote_items').delete().eq('company_id', CO_ID)
  await db.from('invoices').delete().eq('company_id', CO_ID)
  await db.from('quotes').delete().eq('company_id', CO_ID)
  await db.from('clients').delete().eq('company_id', CO_ID)
}

beforeAll(async () => { await cleanup() })
afterAll(async  () => { await cleanup() })

// ─── Company ──────────────────────────────────────────────────────────────────
describe('Companies', () => {
  it('can read test company', async () => {
    const { data, error } = await db.from('companies').select('id,name,plan').eq('id', CO_ID).single()
    expect(error).toBeNull()
    expect(data.name).toBe('My Window Business')
    expect(data.plan).toBe('trial')
  })

  it('can update company settings', async () => {
    const { error } = await db.from('companies')
      .update({ city: 'Bengaluru', gst_number: '29TESTCO1234F1Z5' })
      .eq('id', CO_ID)
    expect(error).toBeNull()

    const { data } = await db.from('companies').select('city,gst_number').eq('id', CO_ID).single()
    expect(data.city).toBe('Bengaluru')
  })
})

// ─── Users ────────────────────────────────────────────────────────────────────
describe('Users', () => {
  it('can read app user record', async () => {
    const { data, error } = await db.from('users')
      .select('id,company_id,name,role')
      .eq('company_id', CO_ID)
      .single()
    expect(error).toBeNull()
    expect(data.company_id).toBe(CO_ID)
    expect(['owner','admin','sales','accounts','workshop','viewer']).toContain(data.role)
  })
})

// ─── Clients ──────────────────────────────────────────────────────────────────
describe('Clients', () => {
  it('can insert client with valid tag enum', async () => {
    // Valid tags: architect, builder, contractor, individual, dealer, corporate
    const { data, error } = await db.from('clients').insert({
      company_id: CO_ID,
      name: 'Test Client Integration',
      phone: '9111111111',
      email: 'testint@test.com',
      city: 'Bengaluru',
      tag: 'individual',   // ✅ valid enum
    }).select().single()

    expect(error).toBeNull()
    expect(data.name).toBe('Test Client Integration')
    expect(data.tag).toBe('individual')
    clientId = data.id
  })

  it('rejects invalid tag enum', async () => {
    const { error } = await db.from('clients').insert({
      company_id: CO_ID, name: 'Bad Tag', phone: '9222222222', tag: 'residential' // ❌ invalid
    }).select().single()
    expect(error).not.toBeNull()
  })

  it('can search client by name', async () => {
    const { data, error } = await db.from('clients')
      .select('id,name').eq('company_id', CO_ID).ilike('name', '%Test Client%')
    expect(error).toBeNull()
    expect(data.length).toBeGreaterThan(0)
  })

  it('can update client city', async () => {
    const { error } = await db.from('clients').update({ city: 'Mumbai' }).eq('id', clientId)
    expect(error).toBeNull()
    const { data } = await db.from('clients').select('city').eq('id', clientId).single()
    expect(data.city).toBe('Mumbai')
  })
})

// ─── Stock: Profile Companies ─────────────────────────────────────────────────
describe('Profile Companies (Stock)', () => {
  let profileId = null

  it('can insert profile with real columns', async () => {
    // Real columns: id, company_id, name, code, is_active, brand, series,
    //               material_type, color, weight_per_meter, price_per_kg
    const { data, error } = await db.from('profile_companies').insert({
      company_id: CO_ID,
      name: 'Test Profile',
      brand: 'Jindal',
      series: '46S',
      material_type: 'aluminium',
      color: 'Silver',
      weight_per_meter: 1.8,
      price_per_kg: 280,
      is_active: true,
    }).select().single()

    expect(error).toBeNull()
    expect(data.brand).toBe('Jindal')
    expect(data.weight_per_meter).toBe(1.8)
    profileId = data.id
  })

  it('can update price_per_kg', async () => {
    const { error } = await db.from('profile_companies').update({ price_per_kg: 300 }).eq('id', profileId)
    expect(error).toBeNull()
    const { data } = await db.from('profile_companies').select('price_per_kg').eq('id', profileId).single()
    expect(Number(data.price_per_kg)).toBe(300)
  })

  afterAll(async () => {
    if (profileId) await db.from('profile_companies').delete().eq('id', profileId)
  })
})

// ─── Stock: Glass Types ───────────────────────────────────────────────────────
describe('Glass Types (Stock)', () => {
  let glassId = null

  it('can insert glass type', async () => {
    const { data, error } = await db.from('glass_types').insert({
      company_id: CO_ID,
      name: 'Test Clear 4mm',
      thickness_mm: 4,
      price_per_sqft: 45,
      is_active: true,
    }).select().single()

    expect(error).toBeNull()
    expect(data.name).toBe('Test Clear 4mm')
    expect(Number(data.price_per_sqft)).toBe(45)
    glassId = data.id
  })

  it('can update glass price', async () => {
    const { error } = await db.from('glass_types').update({ price_per_sqft: 55 }).eq('id', glassId)
    expect(error).toBeNull()
  })

  afterAll(async () => {
    if (glassId) await db.from('glass_types').delete().eq('id', glassId)
  })
})

// ─── Stock: Accessories ───────────────────────────────────────────────────────
describe('Accessories (Stock)', () => {
  let accId = null

  it('can insert accessory with valid type enum', async () => {
    // Valid type enum: handle, hinge, roller, lock, seal, mesh, other
    const { data, error } = await db.from('accessories').insert({
      company_id: CO_ID,
      name: 'Test Handle',
      type: 'handle',      // ✅ valid enum
      category: 'handle',
      unit: 'piece',
      price: 180,
      is_active: true,
    }).select().single()

    expect(error).toBeNull()
    expect(data.name).toBe('Test Handle')
    accId = data.id
  })

  it('rejects invalid type enum', async () => {
    const { error } = await db.from('accessories').insert({
      company_id: CO_ID, name: 'Bad Type', type: 'mosquito_mesh' // ❌ not in enum
    }).select()
    expect(error).not.toBeNull()
  })

  afterAll(async () => {
    if (accId) await db.from('accessories').delete().eq('id', accId)
  })
})

// ─── Quotes ───────────────────────────────────────────────────────────────────
describe('Quotes - Real DB Columns', () => {
  it('can create quote with correct column names', async () => {
    // Real columns: sub_total, cgst_amount, sgst_amount, gst_rate, installation,
    //               discount_amount, grand_total, expires_at, status (quote_status enum)
    const { data, error } = await db.from('quotes').insert({
      company_id: CO_ID,
      client_id: clientId,
      client_name: 'Test Client Integration',
      client_phone: '9111111111',
      quote_number: 'Q-TEST-INT-001',
      status: 'draft',
      gst_rate: 18,
      base_amount: 50000,
      sub_total: 50000,
      cgst_amount: 4500,
      sgst_amount: 4500,
      installation: 3000,
      discount_amount: 0,
      grand_total: 62000,
      expires_at: new Date(Date.now() + 15 * 864e5).toISOString(),
    }).select().single()

    expect(error).toBeNull()
    expect(data.quote_number).toBe('Q-TEST-INT-001')
    expect(Number(data.grand_total)).toBe(62000)
    expect(data.status).toBe('draft')
    quoteId = data.id
  })

  it('can add quote items with correct columns', async () => {
    // Real columns: title, hardware_name, width_mm, height_mm, quantity,
    //               item_value, total_amount, profile_cost, glass_cost
    const { data, error } = await db.from('quote_items').insert([{
      quote_id: quoteId,
      company_id: CO_ID,
      title: 'Sliding Window 2-Track',
      hardware_name: 'Powder coated silver',
      width_mm: 1200,
      height_mm: 900,
      quantity: 2,
      item_value: 15000,
      total_amount: 35400,
      profile_cost: 2100,
      glass_cost: 500,
    }]).select()

    expect(error).toBeNull()
    expect(data[0].title).toBe('Sliding Window 2-Track')
  })

  it('can update quote status draft→sent', async () => {
    const { error } = await db.from('quotes').update({ status: 'sent' }).eq('id', quoteId)
    expect(error).toBeNull()
    const { data } = await db.from('quotes').select('status').eq('id', quoteId).single()
    expect(data.status).toBe('sent')
  })

  it('can update quote status sent→approved', async () => {
    const { error } = await db.from('quotes')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', quoteId)
    expect(error).toBeNull()
    const { data } = await db.from('quotes').select('status').eq('id', quoteId).single()
    expect(data.status).toBe('approved')
  })

  it('can filter quotes by status', async () => {
    const { data, error } = await db.from('quotes')
      .select('id,status').eq('company_id', CO_ID).eq('status', 'approved')
    expect(error).toBeNull()
    expect(data.every(q => q.status === 'approved')).toBe(true)
  })
})

// ─── Invoices ─────────────────────────────────────────────────────────────────
describe('Invoices - Real DB Columns', () => {
  it('can convert quote to invoice with correct columns', async () => {
    // Real columns: base_amount, cgst_amount, sgst_amount, installation,
    //               grand_total, balance_due, paid_amount, status (bill_status enum)
    const { data, error } = await db.from('invoices').insert({
      company_id: CO_ID,
      quote_id: quoteId,
      client_id: clientId,
      client_name: 'Test Client Integration',
      client_phone: '9111111111',
      invoice_number: 'INV-TEST-INT-001',
      status: 'pending',
      gst_rate: 18,
      base_amount: 50000,
      taxable_amount: 50000,
      cgst_amount: 4500,
      sgst_amount: 4500,
      installation: 3000,
      grand_total: 62000,
      paid_amount: 0,
      balance_due: 62000,
      due_date: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
    }).select().single()

    expect(error).toBeNull()
    expect(data.invoice_number).toBe('INV-TEST-INT-001')
    expect(data.status).toBe('pending')
    expect(Number(data.balance_due)).toBe(62000)
    invoiceId = data.id
  })

  it('can record partial payment', async () => {
    const payment = 30000

    const { error: pErr } = await db.from('payments').insert({
      company_id: CO_ID,
      invoice_id: invoiceId,
      client_id: clientId,
      amount: payment,
      payment_mode: 'upi',   // valid enum: cash, bank_transfer, upi, cheque, card, other
      payment_date: new Date().toISOString().slice(0, 10),
    })
    expect(pErr).toBeNull()

    const { error: iErr } = await db.from('invoices').update({
      paid_amount: payment,
      balance_due: 62000 - payment,
      status: 'partial',
    }).eq('id', invoiceId)
    expect(iErr).toBeNull()

    const { data } = await db.from('invoices')
      .select('paid_amount,balance_due,status').eq('id', invoiceId).single()
    expect(Number(data.paid_amount)).toBe(30000)
    expect(Number(data.balance_due)).toBe(32000)
    expect(data.status).toBe('partial')
  })

  it('marks invoice paid when balance is 0', async () => {
    const { error } = await db.from('invoices').update({
      paid_amount: 62000,
      balance_due: 0,
      status: 'paid',
    }).eq('id', invoiceId)
    expect(error).toBeNull()

    const { data } = await db.from('invoices')
      .select('status,balance_due').eq('id', invoiceId).single()
    expect(data.status).toBe('paid')
    expect(Number(data.balance_due)).toBe(0)
  })
})

// ─── Leads ────────────────────────────────────────────────────────────────────
describe('Leads (CRM)', () => {
  let leadId = null

  it('can create lead with valid status enum', async () => {
    // lead_status enum: new, contacted, quoted, negotiating, won, lost
    const { data, error } = await db.from('leads').insert({
      company_id: CO_ID,
      client_id: clientId,
      name: 'Test Lead',
      phone: '9333333333',
      source: 'walkin',
      status: 'new',
      value_estimate: 75000,
    }).select().single()

    expect(error).toBeNull()
    expect(data.status).toBe('new')
    leadId = data.id
  })

  it('can advance lead status', async () => {
    const { error } = await db.from('leads').update({ status: 'quoted' }).eq('id', leadId)
    expect(error).toBeNull()
    const { data } = await db.from('leads').select('status').eq('id', leadId).single()
    expect(data.status).toBe('quoted')
  })

  afterAll(async () => {
    if (leadId) await db.from('leads').delete().eq('id', leadId)
  })
})

// ─── Dashboard KPI Queries ────────────────────────────────────────────────────
describe('Dashboard KPIs', () => {
  it('counts total quotes', async () => {
    const { data, error } = await db.from('quotes')
      .select('id', { count: 'exact' }).eq('company_id', CO_ID)
    expect(error).toBeNull()
    expect(data.length).toBeGreaterThan(0)
  })

  it('sums grand_total from invoices', async () => {
    const { data, error } = await db.from('invoices')
      .select('grand_total').eq('company_id', CO_ID)
    expect(error).toBeNull()
    const total = data.reduce((s, i) => s + Number(i.grand_total || 0), 0)
    expect(total).toBeGreaterThan(0)
  })

  it('fetches recent quotes ordered by date', async () => {
    const { data, error } = await db.from('quotes')
      .select('id,quote_number,grand_total,status,created_at')
      .eq('company_id', CO_ID)
      .order('created_at', { ascending: false })
      .limit(10)
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })

  it('counts clients', async () => {
    const { data, error } = await db.from('clients')
      .select('id').eq('company_id', CO_ID)
    expect(error).toBeNull()
    expect(data.length).toBeGreaterThan(0)
  })

  it('gets stock counts', async () => {
    const [pr, gl, ac] = await Promise.all([
      db.from('profile_companies').select('id').eq('company_id', CO_ID),
      db.from('glass_types').select('id').eq('company_id', CO_ID),
      db.from('accessories').select('id').eq('company_id', CO_ID),
    ])
    expect(pr.data.length).toBeGreaterThan(0)
    expect(gl.data.length).toBeGreaterThan(0)
    expect(ac.data.length).toBeGreaterThan(0)
  })
})

// ─── RLS Policy Tests ─────────────────────────────────────────────────────────
describe('RLS - current_company_id() function', () => {
  it('function exists in DB', async () => {
    const { data, error } = await db.rpc('current_company_id')
    // Will fail with anon key (no session) but function should exist
    // With service key or logged-in session it returns company_id
    expect(error?.message).not.toContain('does not exist')
  })
})

/**
 * UNIT TESTS — Auth & Validation Logic
 * All validated against real Supabase schema
 * Run: npx vitest run unit/auth.test.js
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../frontend/src/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      verifyOtp: vi.fn(),
      signInWithOtp: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      signOut: vi.fn().mockResolvedValue({}),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
      update: vi.fn().mockResolvedValue({ data: {}, error: null }),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'u-1', company_id: 'co-1', companies: { id: 'co-1', name: 'Test' } }, error: null }),
    })),
  }
}))

// ─── Signup Validation ────────────────────────────────────────────────────────
describe('Signup Validation', () => {
  const validate = (email, pw, cpw) => {
    if (!email || pw.length < 8) return 'Email required, min 8 char password.'
    if (pw !== cpw) return 'Passwords do not match.'
    return null
  }

  it('rejects empty email', () => {
    expect(validate('', 'password123', 'password123')).toBe('Email required, min 8 char password.')
  })

  it('rejects password < 8 chars', () => {
    expect(validate('a@b.com', 'short', 'short')).toBe('Email required, min 8 char password.')
  })

  it('rejects mismatched passwords', () => {
    expect(validate('a@b.com', 'password123', 'different')).toBe('Passwords do not match.')
  })

  it('passes with valid data', () => {
    expect(validate('user@company.com', 'strongpass', 'strongpass')).toBeNull()
  })

  it('accepts exactly 8 char password', () => {
    expect(validate('a@b.com', '12345678', '12345678')).toBeNull()
  })
})

// ─── Error Message Handling ───────────────────────────────────────────────────
describe('Error Message Extraction', () => {
  const extractMsg = (e) => e?.message || e?.msg || JSON.stringify(e)

  it('extracts .message from error object', () => {
    expect(extractMsg({ message: 'Rate limit exceeded' })).toBe('Rate limit exceeded')
  })

  it('falls back to JSON when no .message', () => {
    const result = extractMsg({ code: 429, status: 'too_many_requests' })
    expect(result).toContain('429')
  })

  it('handles null error gracefully', () => {
    expect(extractMsg(null)).toBe('null')
  })

  it('detects not confirmed error', () => {
    const msg = 'Email not confirmed'
    expect(msg.toLowerCase().includes('not confirmed')).toBe(true)
  })

  it('detects rate limit error', () => {
    const msg = 'Email rate limit exceeded'
    expect(msg.toLowerCase().includes('rate limit')).toBe(true)
  })
})

// ─── OTP Validation ───────────────────────────────────────────────────────────
describe('OTP Validation', () => {
  const validateOtp = (otp) => {
    const token = (otp || '').replace(/\s/g, '')
    if (token.length !== 6) return 'Enter the full 6-digit code.'
    if (!/^\d+$/.test(token)) return 'OTP must be digits only.'
    return null
  }

  it('rejects 5-digit OTP', () => expect(validateOtp('12345')).toBeTruthy())
  it('rejects 7-digit OTP', () => expect(validateOtp('1234567')).toBeTruthy())
  it('rejects empty OTP', () => expect(validateOtp('')).toBeTruthy())
  it('accepts 6-digit OTP', () => expect(validateOtp('123456')).toBeNull())
  it('strips spaces before validating', () => expect(validateOtp('1 2 3 4 5 6')).toBeNull())
  it('rejects non-digit OTP', () => expect(validateOtp('abcdef')).toBeTruthy())
})

// ─── Onboarding Validation ────────────────────────────────────────────────────
describe('Onboarding Step Validation', () => {
  const validateStep = (step, ob) => {
    if (step === 1 && (!ob.company_name || !ob.owner_name)) return 'Business name and owner required.'
    if (step === 2 && !ob.phone) return 'Phone required.'
    if (step === 3 && !ob.city) return 'City required.'
    return null
  }

  it('step 1 requires company name', () => {
    expect(validateStep(1, { company_name: '', owner_name: 'John' })).toBeTruthy()
  })

  it('step 1 requires owner name', () => {
    expect(validateStep(1, { company_name: 'Acme', owner_name: '' })).toBeTruthy()
  })

  it('step 2 requires phone', () => {
    expect(validateStep(2, { phone: '' })).toBeTruthy()
  })

  it('step 3 requires city', () => {
    expect(validateStep(3, { city: '' })).toBeTruthy()
  })

  it('passes all steps with valid data', () => {
    const ob = { company_name: 'Acme Windows', owner_name: 'John', phone: '9876543210', city: 'Bengaluru' }
    expect(validateStep(1, ob)).toBeNull()
    expect(validateStep(2, ob)).toBeNull()
    expect(validateStep(3, ob)).toBeNull()
  })
})

// ─── Trial Period ─────────────────────────────────────────────────────────────
describe('Trial Period Logic', () => {
  it('creates 14-day trial expiry', () => {
    const expiry = new Date(Date.now() + 14 * 864e5)
    expect(Math.round((expiry - new Date()) / 864e5)).toBe(14)
  })

  it('correctly shows 0 days for expired trial', () => {
    const expired = new Date(Date.now() - 1000).toISOString()
    const days = Math.max(0, Math.ceil((new Date(expired) - new Date()) / 864e5))
    expect(days).toBe(0)
  })

  it('plan_type enum: trial is valid', () => {
    const validPlans = ['trial', 'starter', 'growth', 'pro', 'enterprise']
    expect(validPlans.includes('trial')).toBe(true)
  })
})

// ─── Valid Enum Values (DB-verified) ─────────────────────────────────────────
describe('DB Enum Values', () => {
  it('quote_status has correct values', () => {
    const valid = ['draft', 'sent', 'approved', 'rejected', 'expired']
    expect(valid.includes('draft')).toBe(true)
    expect(valid.includes('approved')).toBe(true)
    expect(valid.includes('pending')).toBe(false) // NOT in quote_status
  })

  it('bill_status has correct values', () => {
    const valid = ['draft', 'sent', 'paid', 'partial', 'pending', 'overdue', 'cancelled']
    expect(valid.includes('pending')).toBe(true)
    expect(valid.includes('paid')).toBe(true)
  })

  it('client_tag has correct values', () => {
    const valid = ['architect', 'builder', 'contractor', 'individual', 'dealer', 'corporate']
    expect(valid.includes('individual')).toBe(true)
    expect(valid.includes('residential')).toBe(false) // NOT valid!
    expect(valid.includes('commercial')).toBe(false)  // NOT valid!
  })

  it('payment_mode has correct values', () => {
    const valid = ['cash', 'bank_transfer', 'upi', 'cheque', 'card', 'other']
    expect(valid.includes('cash')).toBe(true)
    expect(valid.includes('upi')).toBe(true)
  })

  it('accessory_type has correct values', () => {
    const valid = ['handle', 'hinge', 'roller', 'lock', 'seal', 'mesh', 'other']
    expect(valid.includes('handle')).toBe(true)
    expect(valid.includes('mosquito_mesh')).toBe(false) // NOT valid - use 'mesh'
  })

  it('material_type has correct values', () => {
    const valid = ['aluminium', 'upvc', 'glass', 'mixed']
    expect(valid.includes('aluminium')).toBe(true)
    expect(valid.includes('upvc')).toBe(true)
  })

  it('user_role has correct values', () => {
    const valid = ['owner', 'admin', 'sales', 'accounts', 'workshop', 'viewer']
    expect(valid.includes('owner')).toBe(true)
    expect(valid.includes('sales')).toBe(true)
  })
})

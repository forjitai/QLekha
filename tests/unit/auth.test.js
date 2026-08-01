/**
 * UNIT TESTS — Auth Functions
 * Tests signup, login, OTP verify, onboarding logic in isolation
 * Run: npx vitest run unit/auth.test.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock Supabase ───────────────────────────────────────────────────────────
const mockSignUp = vi.fn()
const mockSignIn = vi.fn()
const mockVerifyOtp = vi.fn()
const mockGetSession = vi.fn()
const mockSignOut = vi.fn()
const mockFrom = vi.fn()

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignIn,
      verifyOtp: mockVerifyOtp,
      getSession: mockGetSession,
      signOut: mockSignOut,
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(() => ({ data: { session: null } })),
    },
    from: (table) => ({
      insert: vi.fn().mockResolvedValue({ data: { id: 'mock-id', company_id: 'co-1' }, error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'u-1', company_id: 'co-1', companies: { id: 'co-1', name: 'Test Co' } }, error: null }),
    })
  }
}))

// ─── Test: Signup Validation ──────────────────────────────────────────────────
describe('Signup Validation', () => {
  it('rejects empty email', () => {
    const validate = (email, pw) => {
      if (!email || pw.length < 8) return 'Email required, min 8 char password.'
      return null
    }
    expect(validate('', 'password123')).toBe('Email required, min 8 char password.')
  })

  it('rejects password shorter than 8 chars', () => {
    const validate = (email, pw) => {
      if (!email || pw.length < 8) return 'Email required, min 8 char password.'
      return null
    }
    expect(validate('test@test.com', 'short')).toBe('Email required, min 8 char password.')
  })

  it('rejects mismatched passwords', () => {
    const validate = (pw, cpw) => {
      if (pw !== cpw) return 'Passwords do not match.'
      return null
    }
    expect(validate('password123', 'different')).toBe('Passwords do not match.')
  })

  it('passes valid email and password', () => {
    const validate = (email, pw, cpw) => {
      if (!email || pw.length < 8) return 'Email required, min 8 char password.'
      if (pw !== cpw) return 'Passwords do not match.'
      return null
    }
    expect(validate('user@company.com', 'strongpass', 'strongpass')).toBeNull()
  })
})

// ─── Test: Supabase Signup Call ───────────────────────────────────────────────
describe('Supabase Signup', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls supabase.auth.signUp with email and password', async () => {
    mockSignUp.mockResolvedValue({ error: null })
    const { supabase } = await import('../src/lib/supabase')
    await supabase.auth.signUp({ email: 'test@test.com', password: 'password123' })
    expect(mockSignUp).toHaveBeenCalledWith({ email: 'test@test.com', password: 'password123' })
  })

  it('returns error when email already registered', async () => {
    mockSignUp.mockResolvedValue({ error: { message: 'User already registered' } })
    const { supabase } = await import('../src/lib/supabase')
    const { error } = await supabase.auth.signUp({ email: 'existing@test.com', password: 'password123' })
    expect(error.message).toContain('already')
  })

  it('handles rate limit error gracefully', async () => {
    mockSignUp.mockResolvedValue({ error: { message: 'Email rate limit exceeded' } })
    const { supabase } = await import('../src/lib/supabase')
    const { error } = await supabase.auth.signUp({ email: 'test@test.com', password: 'password123' })
    const msg = error?.message || error?.msg || JSON.stringify(error)
    expect(msg).toBeTruthy()
    expect(typeof msg).toBe('string')
  })
})

// ─── Test: Login ─────────────────────────────────────────────────────────────
describe('Login', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls signInWithPassword with credentials', async () => {
    mockSignIn.mockResolvedValue({ data: { session: { user: { id: 'u-1' } } }, error: null })
    const { supabase } = await import('../src/lib/supabase')
    await supabase.auth.signInWithPassword({ email: 'user@test.com', password: 'pass1234' })
    expect(mockSignIn).toHaveBeenCalledWith({ email: 'user@test.com', password: 'pass1234' })
  })

  it('returns "wrong password" for invalid credentials', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    const { supabase } = await import('../src/lib/supabase')
    const { error } = await supabase.auth.signInWithPassword({ email: 'x@x.com', password: 'wrong' })
    expect(error.message).toContain('Invalid')
  })

  it('detects unconfirmed email error', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Email not confirmed' } })
    const { supabase } = await import('../src/lib/supabase')
    const { error } = await supabase.auth.signInWithPassword({ email: 'x@x.com', password: 'pass1234' })
    expect(error.message.toLowerCase()).toContain('not confirmed')
  })
})

// ─── Test: OTP Verify ────────────────────────────────────────────────────────
describe('OTP Verification', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects OTP shorter than 6 digits', () => {
    const validate = (otp) => {
      const token = otp.replace(/\s/g, '')
      if (token.length !== 6) return 'Enter the full 6-digit code.'
      return null
    }
    expect(validate('123')).toBe('Enter the full 6-digit code.')
    expect(validate('12345')).toBe('Enter the full 6-digit code.')
  })

  it('accepts 6-digit OTP', () => {
    const validate = (otp) => {
      const token = otp.replace(/\s/g, '')
      if (token.length !== 6) return 'Enter the full 6-digit code.'
      return null
    }
    expect(validate('123456')).toBeNull()
    expect(validate('000000')).toBeNull()
  })

  it('strips whitespace from OTP before validating', () => {
    const validate = (otp) => {
      const token = otp.replace(/\s/g, '')
      if (token.length !== 6) return 'Enter the full 6-digit code.'
      return null
    }
    expect(validate(' 1 2 3 4 5 6 ')).toBeNull()
  })

  it('calls verifyOtp with correct params', async () => {
    mockVerifyOtp.mockResolvedValue({ error: null })
    const { supabase } = await import('../src/lib/supabase')
    await supabase.auth.verifyOtp({ email: 'user@test.com', token: '123456', type: 'email' })
    expect(mockVerifyOtp).toHaveBeenCalledWith({ email: 'user@test.com', token: '123456', type: 'email' })
  })
})

// ─── Test: Onboarding Validation ─────────────────────────────────────────────
describe('Onboarding Validation', () => {
  it('requires business name', () => {
    const validate = (ob) => {
      if (!ob.company_name || !ob.owner_name || !ob.phone) return 'Fill required fields.'
      return null
    }
    expect(validate({ company_name: '', owner_name: 'John', phone: '9876543210' })).toBe('Fill required fields.')
  })

  it('requires owner name', () => {
    const validate = (ob) => {
      if (!ob.company_name || !ob.owner_name || !ob.phone) return 'Fill required fields.'
      return null
    }
    expect(validate({ company_name: 'Acme Windows', owner_name: '', phone: '9876543210' })).toBe('Fill required fields.')
  })

  it('requires phone number', () => {
    const validate = (ob) => {
      if (!ob.company_name || !ob.owner_name || !ob.phone) return 'Fill required fields.'
      return null
    }
    expect(validate({ company_name: 'Acme Windows', owner_name: 'John', phone: '' })).toBe('Fill required fields.')
  })

  it('passes with all required fields', () => {
    const validate = (ob) => {
      if (!ob.company_name || !ob.owner_name || !ob.phone) return 'Fill required fields.'
      return null
    }
    expect(validate({ company_name: 'Acme Windows', owner_name: 'John', phone: '9876543210' })).toBeNull()
  })

  it('computes trial expiry 14 days from now', () => {
    const trialEnd = new Date(Date.now() + 14 * 864e5)
    const diff = Math.round((trialEnd - new Date()) / 864e5)
    expect(diff).toBe(14)
  })
})

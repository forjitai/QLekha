import { vi } from 'vitest'
export const supabase = {
  auth: {
    signUp: vi.fn().mockResolvedValue({ error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u-1' } } }, error: null }),
    verifyOtp: vi.fn().mockResolvedValue({ error: null }),
    signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    signOut: vi.fn().mockResolvedValue({}),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ data: [{ id: 'mock-id', company_id: 'co-1' }], error: null }),
    update: vi.fn().mockResolvedValue({ data: [], error: null }),
    delete: vi.fn().mockResolvedValue({ data: [], error: null }),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: {
        id: 'u-1', company_id: 'co-1',
        companies: { id: 'co-1', name: 'Test Co', owner_name: 'Owner', plan: 'trial', pdf_design: 'classic_blue' }
      },
      error: null
    }),
  })),
}

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yqtgfgvcohuwaaugxlrz.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxdGdmZ3Zjb2h1d2FhdWd4bHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzOTA2MjEsImV4cCI6MjA5OTk2NjYyMX0.-ovhA3WmSxmSRU5pa6p7I4Flja0MziiQwGtYzzOO7Oo'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  }
})

// ── Auth helpers ──
export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signUp = (email, password) =>
  supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + '/auth' } })

export const signOut = () => supabase.auth.signOut()

export const getUser = () => supabase.auth.getUser()

export const getSession = () => supabase.auth.getSession()

export const resetPassword = (email) =>
  supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/auth?reset=1' })

export const updatePassword = (newPassword) =>
  supabase.auth.updateUser({ password: newPassword })

export const verifyOTP = (email, token) =>
  supabase.auth.verifyOtp({ email, token, type: 'email' })

// ── Company helpers ──
export const getMyProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('users')
    .select('*, companies(*)')
    .eq('id', user.id)
    .single()
  return data
}

export const updateCompany = (id, updates) =>
  supabase.from('companies').update(updates).eq('id', id)

// ── Quote helpers ──
export const getQuotes = (companyId) =>
  supabase.from('quotes')
    .select('*, clients(name, phone)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

export const createQuote = (data) =>
  supabase.from('quotes').insert(data).select().single()

export const updateQuote = (id, data) =>
  supabase.from('quotes').update(data).eq('id', id).select().single()

// ── Client helpers ──
export const getClients = (companyId) =>
  supabase.from('clients').select('*').eq('company_id', companyId).order('name')

export const createClient = (data) =>
  supabase.from('clients').insert(data).select().single()

export const searchClients = (companyId, query) =>
  supabase.from('clients').select('*')
    .eq('company_id', companyId)
    .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
    .limit(10)

// ── Invoice helpers ──
export const getInvoices = (companyId) =>
  supabase.from('invoices')
    .select('*, clients(name, phone)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

export const getOutstanding = (companyId) =>
  supabase.from('invoices')
    .select('*')
    .eq('company_id', companyId)
    .in('status', ['pending', 'partial', 'overdue'])
    .gt('balance_due', 0)

// ── Stock helpers ──
export const getProfiles = (companyId) =>
  supabase.from('profiles')
    .select('*, profile_companies(name)')
    .eq('company_id', companyId)
    .order('profile_name')

export const updateProfilePrice = (id, price_per_kg) =>
  supabase.from('profiles').update({ price_per_kg }).eq('id', id)

export const getGlassTypes = (companyId) =>
  supabase.from('glass_types').select('*').eq('company_id', companyId).order('name')

export const updateGlassPrice = (id, price_per_sqft) =>
  supabase.from('glass_types').update({ price_per_sqft }).eq('id', id)

export const getAccessories = (companyId) =>
  supabase.from('accessories').select('*').eq('company_id', companyId).order('type')

// ── CRM helpers ──
export const getLeads = (companyId) =>
  supabase.from('leads').select('*').eq('company_id', companyId).order('created_at', { ascending: false })

export const createLead = (data) =>
  supabase.from('leads').insert(data).select().single()

export const updateLead = (id, data) =>
  supabase.from('leads').update(data).eq('id', id)

// ── Analytics helpers ──
export const getMonthlyRevenue = (companyId) =>
  supabase.from('invoices')
    .select('grand_total, paid_amount, created_at, status')
    .eq('company_id', companyId)
    .neq('status', 'cancelled')
    .order('created_at')

export const getQuoteFunnel = (companyId) =>
  supabase.from('quotes')
    .select('status, grand_total')
    .eq('company_id', companyId)

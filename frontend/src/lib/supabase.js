import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase env vars. Copy .env.example to .env.local and fill in values.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth helpers
export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signUp = (email, password) =>
  supabase.auth.signUp({ email, password })

export const signOut = () => supabase.auth.signOut()

export const getUser = () => supabase.auth.getUser()

// Quote helpers
export const getQuotes = (companyId) =>
  supabase.from('quotes')
    .select('*, clients(*), quote_items(*)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

export const createQuote = (data) =>
  supabase.from('quotes').insert(data).select().single()

export const updateQuote = (id, data) =>
  supabase.from('quotes').update(data).eq('id', id).select().single()

// Client helpers
export const getClients = (companyId) =>
  supabase.from('clients')
    .select('*')
    .eq('company_id', companyId)
    .order('name')

export const searchClients = (companyId, query) =>
  supabase.from('clients')
    .select('*')
    .eq('company_id', companyId)
    .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
    .limit(10)

// Invoice helpers
export const getInvoices = (companyId) =>
  supabase.from('invoices')
    .select('*, clients(*)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

export const getOutstanding = (companyId) =>
  supabase.from('invoices')
    .select('*')
    .eq('company_id', companyId)
    .in('status', ['pending', 'partial', 'overdue'])
    .gt('balance_due', 0)

// Stock helpers
export const getProfiles = (companyId) =>
  supabase.from('profiles')
    .select('*, profile_companies(*)')
    .eq('company_id', companyId)
    .order('profile_name')

export const getGlassTypes = (companyId) =>
  supabase.from('glass_types')
    .select('*')
    .eq('company_id', companyId)
    .order('name')

export const getAccessories = (companyId) =>
  supabase.from('accessories')
    .select('*')
    .eq('company_id', companyId)
    .order('type')

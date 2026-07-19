import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import './lib/i18n'

import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Quotes from './pages/Quotes'
import CreateQuote from './pages/CreateQuote'
import Billing from './pages/Billing'
import Stock from './pages/Stock'
import CRM from './pages/CRM'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import Layout from './components/Layout'

// Loading splash
function Splash() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0B1F3A', flexDirection:'column', gap:16 }}>
      <div style={{ fontFamily:'Syne,sans-serif', fontSize:28, fontWeight:800, color:'#fff' }}>
        Q<span style={{ color:'#3B8EFF' }}>Lekha</span>
      </div>
      <div style={{ width:40, height:3, borderRadius:100, background:'rgba(255,255,255,0.1)', overflow:'hidden', position:'relative' }}>
        <div style={{ position:'absolute', left:0, top:0, bottom:0, width:'60%', background:'#1A6FE8', borderRadius:100, animation:'slide 1s ease-in-out infinite' }}/>
      </div>
      <style>{`@keyframes slide { 0%{left:-60%} 100%{left:100%} }`}</style>
    </div>
  )
}

// Guard: check if user has completed onboarding (has a users row)
function AuthGuard({ children }) {
  const [ready, setReady] = useState(false)
  const [hasProfile, setHasProfile] = useState(false)
  const [session, setSession] = useState(null)

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      if (session?.user) {
        const { data } = await supabase.from('users').select('id,company_id').eq('id', session.user.id).single()
        setHasProfile(!!data?.company_id)
      }
      setReady(true)
    }
    check()
  }, [])

  if (!ready) return <Splash />
  if (!session) return <Navigate to="/auth" replace />
  if (!hasProfile) return <Navigate to="/auth?onboard=1" replace />
  return children
}

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return <Splash />

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={session ? <Navigate to="/dashboard" replace /> : <Auth />} />

      {/* Protected — each wrapped in AuthGuard */}
      <Route path="/dashboard" element={<AuthGuard><Layout><Dashboard /></Layout></AuthGuard>} />
      <Route path="/quotes" element={<AuthGuard><Layout><Quotes /></Layout></AuthGuard>} />
      <Route path="/quotes/create" element={<AuthGuard><Layout><CreateQuote /></Layout></AuthGuard>} />
      <Route path="/billing" element={<AuthGuard><Layout><Billing /></Layout></AuthGuard>} />
      <Route path="/stock" element={<AuthGuard><Layout><Stock /></Layout></AuthGuard>} />
      <Route path="/crm" element={<AuthGuard><Layout><CRM /></Layout></AuthGuard>} />
      <Route path="/analytics" element={<AuthGuard><Layout><Analytics /></Layout></AuthGuard>} />
      <Route path="/settings" element={<AuthGuard><Layout><Settings /></Layout></AuthGuard>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

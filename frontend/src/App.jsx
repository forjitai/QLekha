import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import './lib/i18n'

// Pages
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

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0B1F3A' }}>
      <div style={{ fontFamily:'Syne', fontSize:24, fontWeight:800, color:'#fff' }}>
        Q<span style={{ color:'#3B8EFF' }}>Lekha</span>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginTop:8, fontFamily:'Inter', fontWeight:400 }}>Loading...</div>
      </div>
    </div>
  )

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={session ? <Navigate to="/dashboard" /> : <Auth />} />

      {/* Protected */}
      <Route path="/dashboard" element={session ? <Layout><Dashboard /></Layout> : <Navigate to="/auth" />} />
      <Route path="/quotes" element={session ? <Layout><Quotes /></Layout> : <Navigate to="/auth" />} />
      <Route path="/quotes/create" element={session ? <Layout><CreateQuote /></Layout> : <Navigate to="/auth" />} />
      <Route path="/billing" element={session ? <Layout><Billing /></Layout> : <Navigate to="/auth" />} />
      <Route path="/stock" element={session ? <Layout><Stock /></Layout> : <Navigate to="/auth" />} />
      <Route path="/crm" element={session ? <Layout><CRM /></Layout> : <Navigate to="/auth" />} />
      <Route path="/analytics" element={session ? <Layout><Analytics /></Layout> : <Navigate to="/auth" />} />
      <Route path="/settings" element={session ? <Layout><Settings /></Layout> : <Navigate to="/auth" />} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App

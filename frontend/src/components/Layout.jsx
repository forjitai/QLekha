import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'

const NAV = [
  { path: '/dashboard', icon: '📊', key: 'dashboard' },
  { path: '/quotes',    icon: '📋', key: 'quotes',   badge: 3 },
  { path: '/billing',   icon: '🧾', key: 'billing',  badge: 2, badgeColor: '#FFB400' },
  { path: '/stock',     icon: '📦', key: 'stock' },
  { path: '/crm',       icon: '👤', key: 'crm' },
  { path: '/analytics', icon: '📈', key: 'analytics' },
  { path: '/settings',  icon: '⚙️', key: 'settings' },
]

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, flexShrink: 0,
        background: '#0B1F3A',
        display: 'flex', flexDirection: 'column',
        height: '100vh', overflowY: 'auto',
        position: window.innerWidth < 900 ? 'fixed' : 'relative',
        left: 0, top: 0, bottom: 0,
        transform: window.innerWidth < 900 && !sidebarOpen ? 'translateX(-100%)' : 'none',
        transition: 'transform 0.3s', zIndex: 60,
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Link to="/dashboard" style={{ textDecoration:'none', fontFamily:'Syne', fontSize:20, fontWeight:800, color:'#fff' }}>
            Q<span style={{ color:'#3B8EFF' }}>Lekha</span>
            <span style={{ marginLeft:8, fontSize:9, fontWeight:700, background:'rgba(26,111,232,0.25)', color:'#3B8EFF', padding:'2px 7px', borderRadius:100 }}>AI</span>
          </Link>
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px', flex: 1 }}>
          {NAV.map(item => {
            const active = location.pathname === item.path
            return (
              <Link key={item.path} to={item.path} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 8, marginBottom: 2,
                textDecoration: 'none', position: 'relative',
                background: active ? 'rgba(26,111,232,0.2)' : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                fontSize: 13, fontWeight: 500,
              }} onClick={() => setSidebarOpen(false)}>
                {active && <div style={{ position:'absolute', left:0, top:4, bottom:4, width:3, background:'#1A6FE8', borderRadius:'0 2px 2px 0' }} />}
                <span style={{ fontSize:16, width:20, textAlign:'center' }}>{item.icon}</span>
                <span style={{ flex:1 }}>{t(item.key)}</span>
                {item.badge && <span style={{ fontSize:10, fontWeight:700, background: item.badgeColor || '#1A6FE8', color: item.badgeColor ? '#0B1F3A' : '#fff', padding:'1px 6px', borderRadius:100 }}>{item.badge}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div style={{ padding:'12px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={handleSignOut} style={{
            display:'flex', alignItems:'center', gap:10,
            width:'100%', padding:'10px', borderRadius:8,
            background:'transparent', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.5)', fontSize:13,
          }}>
            <span style={{ fontSize:16 }}>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        {/* Topbar */}
        <header style={{
          height:60, background:'#fff', borderBottom:'1px solid #E8EDF3',
          display:'flex', alignItems:'center', padding:'0 24px', gap:16,
          boxShadow:'0 2px 12px rgba(11,31,58,0.08)', flexShrink:0,
        }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ display: window.innerWidth < 900 ? 'flex' : 'none', background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#0B1F3A', padding:6, borderRadius:6 }}>
            ☰
          </button>
          <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
            <Link to="/quotes/create" style={{
              background:'#1A6FE8', color:'#fff', textDecoration:'none',
              padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:600,
              display:'flex', alignItems:'center', gap:6,
            }}>＋ {t('new_quote')}</Link>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex:1, overflowY:'auto', padding:24 }}>
          {children}
        </main>
      </div>
    </div>
  )
}

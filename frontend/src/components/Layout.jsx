import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const C = {
  ink:'#0F1923', steel:'#1B4FD8', steelLt:'#3B6FEA', chalk:'#F7F8FA',
  glass:'#E8F4FD', fog:'#C4CDD8', snow:'#FFFFFF', mist:'#6B7A8D',
  teal:'#0EA5A0', green:'#16A34A', red:'#DC2626', amber:'#D97706',
}

const NAV_ITEMS = [
  { path:'/dashboard', icon:'📊', label:'Dashboard' },
  { path:'/quotes',    icon:'📋', label:'Quotes'    },
  { path:'/billing',   icon:'🧾', label:'Billing'   },
  { path:'/stock',     icon:'📦', label:'Stock'     },
  { path:'/crm',       icon:'👤', label:'CRM'       },
  { path:'/analytics', icon:'📈', label:'Analytics' },
  { path:'/settings',  icon:'⚙️', label:'Settings'  },
]

const BOTTOM_NAV = NAV_ITEMS.slice(0, 5)

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMob, setIsMob] = useState(window.innerWidth < 768)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const onResize = () => setIsMob(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  const isActive = (path) =>
    path === '/dashboard'
      ? location.pathname === path
      : location.pathname.startsWith(path)

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:C.chalk, position:'relative' }}>

      {/* ── Desktop Sidebar ── */}
      {!isMob && (
        <aside style={{
          width:220, flexShrink:0, background:C.ink,
          display:'flex', flexDirection:'column', height:'100vh',
        }}>
          {/* Logo */}
          <div style={{ padding:'22px 18px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
            <Link to="/dashboard" style={{ textDecoration:'none', fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:800, color:C.snow, letterSpacing:'-0.5px' }}>
              Q<span style={{ color:C.steel }}>Lekha</span>
            </Link>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.2)', marginTop:2, letterSpacing:'1px', textTransform:'uppercase' }}>Window ERP</div>
          </div>

          {/* Nav */}
          <nav style={{ padding:'10px 8px', flex:1, overflowY:'auto' }}>
            {NAV_ITEMS.map(item => {
              const active = isActive(item.path)
              return (
                <Link key={item.path} to={item.path} style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'9px 10px', borderRadius:8, marginBottom:2,
                  textDecoration:'none', position:'relative',
                  background: active ? 'rgba(27,79,216,0.18)' : 'transparent',
                  color: active ? C.snow : 'rgba(255,255,255,0.45)',
                  fontSize:13, fontWeight: active ? 600 : 400,
                  fontFamily:'Inter,sans-serif',
                  borderLeft: active ? '3px solid '+C.steel : '3px solid transparent',
                }}>
                  <span style={{ fontSize:15, width:20, textAlign:'center' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div style={{ padding:'10px 8px', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
            <Link to="/quotes/create" style={{
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              padding:'10px', borderRadius:8, background:C.steel,
              color:C.snow, textDecoration:'none', fontSize:13,
              fontWeight:700, fontFamily:'Syne,sans-serif', marginBottom:6,
            }}>+ New Quote</Link>
            <button onClick={signOut} style={{
              display:'flex', alignItems:'center', gap:8, width:'100%',
              padding:'8px 10px', borderRadius:8, background:'transparent',
              border:'none', cursor:'pointer', color:'rgba(255,255,255,0.3)',
              fontSize:12, fontFamily:'Inter,sans-serif',
            }}>
              <span>🚪</span> Sign Out
            </button>
          </div>
        </aside>
      )}

      {/* ── Mobile: sidebar overlay ── */}
      {isMob && sidebarOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:200 }} onClick={() => setSidebarOpen(false)}>
          <div style={{
            position:'absolute', left:0, top:0, bottom:0, width:260,
            background:C.ink, display:'flex', flexDirection:'column',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:'20px 18px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:800, color:C.snow }}>Q<span style={{ color:C.steel }}>Lekha</span></span>
              <button onClick={() => setSidebarOpen(false)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.5)', fontSize:20, cursor:'pointer' }}>✕</button>
            </div>
            <nav style={{ padding:'10px 8px', flex:1 }}>
              {NAV_ITEMS.map(item => {
                const active = isActive(item.path)
                return (
                  <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)} style={{
                    display:'flex', alignItems:'center', gap:10,
                    padding:'11px 12px', borderRadius:8, marginBottom:3,
                    textDecoration:'none',
                    background: active ? 'rgba(27,79,216,0.18)' : 'transparent',
                    color: active ? C.snow : 'rgba(255,255,255,0.55)',
                    fontSize:14, fontWeight: active ? 600 : 400,
                    borderLeft: active ? '3px solid '+C.steel : '3px solid transparent',
                  }}>
                    <span style={{ fontSize:17, width:22, textAlign:'center' }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
            <div style={{ padding:'12px 8px', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={signOut} style={{
                display:'flex', alignItems:'center', gap:8, width:'100%',
                padding:'10px 12px', borderRadius:8, background:'transparent',
                border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)',
                fontSize:13,
              }}><span>🚪</span> Sign Out</button>
            </div>
          </div>
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.55)', zIndex:-1 }}/>
        </div>
      )}

      {/* ── Main content ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

        {/* Topbar */}
        <header style={{
          height: isMob ? 52 : 56,
          background:C.snow, borderBottom:'1px solid '+C.fog,
          display:'flex', alignItems:'center',
          padding: isMob ? '0 12px' : '0 24px',
          gap:12, flexShrink:0,
          boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
        }}>
          {isMob ? (
            <>
              <button onClick={() => setSidebarOpen(true)} style={{
                background:'none', border:'none', fontSize:20,
                cursor:'pointer', color:C.ink, padding:'4px',
              }}>☰</button>
              <span style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:800, color:C.ink, flex:1, letterSpacing:'-0.5px' }}>
                Q<span style={{ color:C.steel }}>Lekha</span>
              </span>
              <Link to="/quotes/create" style={{
                background:C.steel, color:C.snow, textDecoration:'none',
                padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:700,
                fontFamily:'Syne,sans-serif',
              }}>+ Quote</Link>
              <Link to="/settings" style={{ color:C.mist, textDecoration:'none', fontSize:18, padding:'4px' }}>⚙️</Link>
            </>
          ) : (
            <>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:C.ink, fontFamily:'Inter,sans-serif' }}>
                  {NAV_ITEMS.find(n => isActive(n.path))?.label || 'Dashboard'}
                </div>
              </div>
              <Link to="/quotes/create" style={{
                background:C.steel, color:C.snow, textDecoration:'none',
                padding:'8px 18px', borderRadius:8, fontSize:13,
                fontWeight:600, fontFamily:'Inter,sans-serif',
              }}>+ New Quote</Link>
            </>
          )}
        </header>

        {/* Page */}
        <main style={{
          flex:1, overflowY:'auto',
          padding: isMob ? '16px 12px 76px' : '24px',
          background:C.chalk,
        }}>
          {children}
        </main>
      </div>

      {/* ── Mobile Bottom Tab Bar ── */}
      {isMob && (
        <nav style={{
          position:'fixed', bottom:0, left:0, right:0,
          background:C.snow, borderTop:'1px solid '+C.fog,
          display:'flex', alignItems:'center',
          height:60, zIndex:100, padding:'0 4px',
          boxShadow:'0 -2px 12px rgba(0,0,0,0.08)',
        }}>
          {BOTTOM_NAV.map(item => {
            const active = isActive(item.path)
            return (
              <Link key={item.path} to={item.path} style={{
                display:'flex', flexDirection:'column', alignItems:'center',
                gap:2, textDecoration:'none', padding:'6px 4px',
                flex:1, position:'relative',
              }}>
                {active && <div style={{
                  position:'absolute', top:0, left:'50%',
                  transform:'translateX(-50%)',
                  width:24, height:2.5, background:C.steel, borderRadius:'0 0 2px 2px',
                }}/>}
                <span style={{ fontSize:21, lineHeight:1 }}>{item.icon}</span>
                <span style={{
                  fontSize:9, fontWeight: active ? 700 : 400,
                  color: active ? C.steel : C.mist,
                  fontFamily:'Inter,sans-serif', letterSpacing:'0.3px',
                }}>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      )}
    </div>
  )
}

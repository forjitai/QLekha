import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const C={ink:'#0F1923',steel:'#1B4FD8',steelLt:'#3B6FEA',copper:'#D97941',chalk:'#F7F8FA',glass:'#E8F4FD',mist:'#6B7A8D',fog:'#C4CDD8',snow:'#FFFFFF',green:'#16A34A',red:'#DC2626',amber:'#D97706',purp:'#7C3AED',teal:'#0EA5A0',navy:'#0F1923',blue:'#1B4FD8',blueLt:'#3B6FEA',bg:'#F7F8FA',white:'#FFFFFF',g100:'#E8F4FD',g200:'#C4CDD8',g400:'#6B7A8D',g50:'#F7F8FA',g600:'#374151',bluePale:'rgba(27,79,216,0.08)'}

const fmt = (n) => { const v = Number(n) || 0; return v >= 100000 ? '\u20b9'+(v/100000).toFixed(1)+'L' : v >= 1000 ? '\u20b9'+(v/1000).toFixed(0)+'K' : '\u20b9'+v }
function KPI({ icon, value, label, sub, color }) {
  return (
    <div style={{background:C.snow,borderRadius:14,border:'1px solid '+C.glass,padding:'18px 20px'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
        <div style={{width:36,height:36,borderRadius:10,background:(color||C.steel)+'15',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}
             dangerouslySetInnerHTML={{__html:icon}}/>
        <span style={{fontSize:11,fontWeight:700,color:C.mist,textTransform:'uppercase',letterSpacing:'0.5px'}}>{label}</span>
      </div>
      <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:26,fontWeight:600,color:C.ink,lineHeight:1.1,marginBottom:4}}>{value}</div>
      {sub && <div style={{fontSize:12,color:C.mist}}>{sub}</div>}
    </div>
  )
}

function QuickAction({ icon, label, href, color }) {
  return (
    <a href={href} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:'16px 12px',borderRadius:12,border:'1px solid '+C.glass,background:C.snow,textDecoration:'none',transition:'all 0.15s',cursor:'pointer'}}>
      <div style={{width:40,height:40,borderRadius:10,background:color+'15',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{icon}</div>
      <span style={{fontSize:12,fontWeight:600,color:C.ink}}>{label}</span>
    </a>
  )
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({
    totalQuotes:0, draftQuotes:0, sentQuotes:0, approvedQuotes:0,
    totalInvoices:0, pendingInvoices:0, overdueInvoices:0,
    totalRevenue:0, collected:0, outstanding:0,
    thisMonthRevenue:0, lastMonthRevenue:0,
    totalClients:0, activeLeads:0,
    recentQuotes:[], overdueList:[],
  })

  useEffect(() => { load() }, [])

  async function load() {
    try {
      setLoading(true)
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return setLoading(false)
          const { data: ud } = await supabase.from('users').select('*,companies(*)').eq('id', user.id).single()
          if (!ud) return setLoading(false)
          setProfile(ud)
          const cid = ud.company_id
          const now = new Date()
          const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
          const lastMonthStart = new Date(now.getFullYear(), now.getMonth()-1, 1).toISOString()
          const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      
          const [qr, ir, pr, cr, lr] = await Promise.all([
            supabase.from('quotes').select('id,status,grand_total,created_at,client_name,quote_number').eq('company_id',cid).order('created_at',{ascending:false}).limit(50),
            supabase.from('invoices').select('id,status,grand_total,balance_due,created_at,client_name,invoice_number,due_date').eq('company_id',cid),
            supabase.from('payments').select('amount,payment_date').eq('company_id',cid),
            supabase.from('clients').select('id,name,total_billed').eq('company_id',cid),
            supabase.from('leads').select('id,status').eq('company_id',cid),
          ])
      
          const quotes   = qr.data || []
          const invoices = ir.data || []
          const payments = pr.data || []
          const clients  = cr.data || []
          const leads    = lr.data || []
      
          const totalRevenue    = invoices.filter(i=>i.status!=='cancelled').reduce((s,i)=>s+(i.grand_total||0),0)
          const collected       = payments.reduce((s,p)=>s+(p.amount||0),0)
          const outstanding     = invoices.filter(i=>['pending','partial','overdue'].includes(i.status)).reduce((s,i)=>s+(i.balance_due||0),0)
          const thisMonthRevenue= invoices.filter(i=>i.created_at>=thisMonthStart&&i.status!=='cancelled').reduce((s,i)=>s+(i.grand_total||0),0)
          const lastMonthRevenue= invoices.filter(i=>i.created_at>=lastMonthStart&&i.created_at<lastMonthEnd&&i.status!=='cancelled').reduce((s,i)=>s+(i.grand_total||0),0)
          const revTrend        = lastMonthRevenue>0?Math.round(((thisMonthRevenue-lastMonthRevenue)/lastMonthRevenue)*100):0
          const overdueList     = invoices.filter(i=>i.status==='overdue'||(i.due_date&&new Date(i.due_date)<now&&(i.balance_due||0)>0)).slice(0,5)
      
          setStats({
            totalQuotes: quotes.length,
            draftQuotes: quotes.filter(q=>q.status==='draft').length,
            sentQuotes:  quotes.filter(q=>q.status==='sent').length,
            approvedQuotes: quotes.filter(q=>q.status==='approved').length,
            totalInvoices: invoices.length,
            pendingInvoices: invoices.filter(i=>i.status==='pending').length,
            overdueInvoices: invoices.filter(i=>i.status==='overdue').length,
            totalRevenue, collected, outstanding,
            thisMonthRevenue, lastMonthRevenue, revTrend,
            totalClients: clients.length,
            activeLeads: leads.filter(l=>l.status!=='won'&&l.status!=='lost').length,
            recentQuotes: quotes.slice(0,6),
            overdueList,
          })
          setLoading(false)
    } catch(e) {
      console.error(e)
    }
  }

  const co = profile?.companies || {}
  const trialDays = co.plan_expires_at ? Math.max(0,Math.ceil((new Date(co.plan_expires_at)-new Date())/(864e5))) : 0

  if (loading) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',flexDirection:'column',gap:12}}>
        <div style={{fontSize:32}}>&#128202;</div>
        <div style={{fontSize:13,color:C.mist}}>Loading your dashboard...</div>
      </div>
    )
  }

  const SC = {
    draft:    {bg:C.glass,color:C.mist},
    sent:     {bg:'rgba(26,111,232,0.1)',color:'#1B4FD8'},
    approved: {bg:'rgba(14,165,160,0.1)',color:'#0EA5A0'},
    rejected: {bg:'rgba(239,68,68,0.08)',color:'#EF4444'},
    expired:  {bg:'rgba(255,180,0,0.1)',color:'#FFB400'},
  }

  const noData = stats.totalQuotes === 0 && stats.totalInvoices === 0

  return (
    <div style={{fontFamily:'Inter,sans-serif'}}>
      {/* Welcome header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div>
          <h2 style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,color:C.ink,marginBottom:4}}>
            Good day&#44; {co.owner_name||'there'} &#128075;
          </h2>
          <p style={{fontSize:13,color:C.mist}}>{co.name||'Your business'} &#183; {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</p>
        </div>
        <a href="/quotes/create" style={{display:'inline-flex',alignItems:'center',gap:8,background:'linear-gradient(135deg,'+C.blue+','+C.teal+')',color:'#fff',textDecoration:'none',padding:'10px 20px',borderRadius:10,fontSize:13,fontWeight:700,fontFamily:'Syne,sans-serif',boxShadow:'0 4px 14px rgba(26,111,232,0.3)'}}>
          &#43; New Quote
        </a>
      </div>

      {/* Trial banner */}
      {co.plan === 'trial' && trialDays <= 7 && (
        <div style={{background:'linear-gradient(135deg,#92400E,#b45309)',borderRadius:14,padding:'14px 20px',display:'flex',alignItems:'center',gap:14,marginBottom:20,flexWrap:'wrap'}}>
          <span style={{fontSize:24}}>&#9203;</span>
          <div style={{flex:1}}>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,color:'#fff'}}>{trialDays} days left on your trial</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,0.7)',marginTop:2}}>Upgrade to keep creating unlimited quotes and invoices.</div>
          </div>
          <a href="/settings" style={{padding:'8px 16px',borderRadius:8,background:'rgba(255,255,255,0.2)',border:'1px solid rgba(255,255,255,0.3)',color:'#fff',textDecoration:'none',fontSize:12,fontWeight:600}}>View Plans &#8594;</a>
        </div>
      )}

      {/* Empty onboarding state */}
      {noData && (
        <div style={{background:C.snow,borderRadius:16,border:'1px solid '+C.glass,padding:'48px 32px',marginBottom:24,textAlign:'center'}}>
          <div style={{fontSize:52,marginBottom:16}}>&#128640;</div>
          <h3 style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:700,color:C.ink,marginBottom:8}}>Ready to create your first quote?</h3>
          <p style={{color:C.mist,fontSize:14,maxWidth:400,margin:'0 auto 24px',lineHeight:1.6}}>QLekha makes window quoting fast and professional. Add your first client and create a quote in under 5 minutes.</p>
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
            <a href="/quotes/create" style={{background:C.steel,color:'#fff',textDecoration:'none',padding:'11px 22px',borderRadius:10,fontSize:13,fontWeight:700,fontFamily:'Syne,sans-serif'}}>&#128203; Create Quote</a>
            <a href="/crm" style={{background:'transparent',border:'1px solid '+C.fog,color:C.ink,textDecoration:'none',padding:'11px 22px',borderRadius:10,fontSize:13,fontWeight:600}}>&#128100; Add Client</a>
            <a href="/settings" style={{background:'transparent',border:'1px solid '+C.fog,color:C.ink,textDecoration:'none',padding:'11px 22px',borderRadius:10,fontSize:13,fontWeight:600}}>&#9881;&#65039; Setup Business</a>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="qk-kpi" style={{marginBottom:20}}>
        <KPI icon="&#128176;" value={fmt(stats.thisMonthRevenue)} label="Revenue this month" sub={'Total: '+fmt(stats.totalRevenue)} color={C.steel} trend={stats.revTrend}/>
        <KPI icon="&#9989;" value={fmt(stats.collected)} label="Total collected" sub={'Outstanding: '+fmt(stats.outstanding)} color={C.green}/>
        <KPI icon="&#128203;" value={String(stats.totalQuotes)} label="Total quotes" sub={stats.sentQuotes+' sent, '+stats.approvedQuotes+' approved'} color={C.teal}/>
        <KPI icon="&#128100;" value={String(stats.totalClients)} label="Clients" sub={stats.activeLeads+' open leads'} color={C.amber}/>
      </div>

      {/* Overdue alert */}
      {stats.overdueList.length > 0 && (
        <div style={{background:'linear-gradient(135deg,#7f1d1d,#991b1b)',borderRadius:14,padding:'14px 20px',display:'flex',alignItems:'center',gap:14,marginBottom:20,flexWrap:'wrap'}}>
          <span style={{fontSize:22}}>&#9888;&#65039;</span>
          <div style={{flex:1}}>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,color:'#fff'}}>{stats.overdueList.length} overdue invoice{stats.overdueList.length>1?'s':''} &#8212; {fmt(stats.overdueList.reduce((s,i)=>s+(i.balance_due||0),0))} outstanding</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.6)',marginTop:2}}>{stats.overdueList.map(i=>i.client_name).join(', ')}</div>
          </div>
          <a href="/billing" style={{padding:'7px 14px',borderRadius:8,background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.25)',color:'#fff',textDecoration:'none',fontSize:12,fontWeight:600}}>View Invoices &#8594;</a>
        </div>
      )}

      <div className="qk-split" style={{marginBottom:20}}>
        {/* Recent quotes */}
        <div style={{background:C.snow,borderRadius:16,border:'1px solid '+C.glass,overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid '+C.glass,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700}}>Recent Quotes</div>
            <a href="/quotes" style={{fontSize:12,color:C.steel,textDecoration:'none',fontWeight:600}}>View all &#8594;</a>
          </div>
          {stats.recentQuotes.length === 0 ? (
            <div style={{padding:'40px 20px',textAlign:'center',color:C.mist,fontSize:13}}>No quotes yet. <a href="/quotes/create" style={{color:C.steel,textDecoration:'none',fontWeight:600}}>Create one &#8594;</a></div>
          ) : (
            stats.recentQuotes.map((q, i) => {
              const sc = SC[q.status] || SC.draft
              return (
                <div key={q.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 20px',borderBottom:i<stats.recentQuotes.length-1?'1px solid '+C.chalk:'none'}}>
                  <div style={{width:36,height:36,borderRadius:9,background:C.blue+'15',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:C.steel,flexShrink:0}}>
                    {(q.quote_number||'').slice(-3)}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.ink,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{q.client_name}</div>
                    <div style={{fontSize:11,color:C.mist}}>{new Date(q.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</div>
                  </div>
                  <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:100,...sc}}>{q.status}</span>
                  <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,fontWeight:500,color:C.ink,flexShrink:0}}>{fmt(q.grand_total||0)}</div>
                </div>
              )
            })
          )}
        </div>

        {/* Quick stats + actions */}
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {/* Quote funnel mini */}
          <div style={{background:C.snow,borderRadius:16,border:'1px solid '+C.glass,padding:20}}>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,marginBottom:14}}>Quote Pipeline</div>
            {[
              {label:'Draft', count:stats.draftQuotes, color:C.mist},
              {label:'Sent', count:stats.sentQuotes, color:C.steel},
              {label:'Approved', count:stats.approvedQuotes, color:C.teal},
            ].map(s => (
              <div key={s.label} style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:12,color:C.ink}}>{s.label}</span>
                  <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,fontWeight:600,color:s.color}}>{s.count}</span>
                </div>
                <div style={{height:6,background:C.glass,borderRadius:100,overflow:'hidden'}}>
                  <div style={{height:'100%',width:(stats.totalQuotes>0?(s.count/stats.totalQuotes)*100:0)+'%',background:s.color,borderRadius:100}}/>
                </div>
              </div>
            ))}
          </div>

          {/* Invoice status */}
          <div style={{background:C.snow,borderRadius:16,border:'1px solid '+C.glass,padding:20}}>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,marginBottom:14}}>Invoice Status</div>
            {[
              {label:'Total', count:stats.totalInvoices, color:C.steel},
              {label:'Pending', count:stats.pendingInvoices, color:C.amber},
              {label:'Overdue', count:stats.overdueInvoices, color:C.red},
            ].map(s => (
              <div key={s.label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid '+C.chalk}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:s.color}}/>
                  <span style={{fontSize:12,color:C.ink}}>{s.label}</span>
                </div>
                <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:600,color:s.color}}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{background:C.snow,borderRadius:16,border:'1px solid '+C.glass,padding:20,marginBottom:20}}>
        <div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,marginBottom:14}}>Quick Actions</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))',gap:10}}>
          <QuickAction icon="&#128203;" label="New Quote" href="/quotes/create" color={C.steel}/>
          <QuickAction icon="&#129518;" label="Add Client" href="/crm" color={C.teal}/>
          <QuickAction icon="&#128222;" label="Stock" href="/stock" color={C.amber}/>
          <QuickAction icon="&#128196;" label="PDF Demo" href="/pdf-demo" color={C.red}/>
          <QuickAction icon="&#128202;" label="Analytics" href="/analytics" color={'#6366F1'}/>
          <QuickAction icon="&#9881;&#65039;" label="Settings" href="/settings" color={C.mist}/>
        </div>
      </div>
    </div>
  )
}

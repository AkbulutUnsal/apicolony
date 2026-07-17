import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { useWorker } from '../hooks/useWorker'
import Navbar from '../components/layout/Navbar'
import WeatherWidget from '../components/ui/WeatherWidget'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { PLAN_TIERS } from '../lib/plans'

const GOLD='#f5c518', GREEN='#27ae60', RED='#e74c3c', ORANGE='#e67e22', GRAY='#555'

export default function DashboardPage() {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const { activeWorker } = useWorker()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [harvestData, setHarvestData] = useState([])
  const [urgentHives, setUrgentHives] = useState([])
  const [recentLogs, setRecentLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [adminStats, setAdminStats] = useState(null)
  const [editingPhoneId, setEditingPhoneId] = useState(null)
  const [phoneInput, setPhoneInput] = useState('')
  const [quickFinance, setQuickFinance] = useState({ income: 0, expense: 0, feedCount: 0 })

  const isAdmin = profile?.role === 'admin'
  const displayName = activeWorker?.full_name || profile?.full_name || user?.email?.split('@')[0] || t('who_working.beekeeper')

  useEffect(() => { if (user) fetchAll() }, [user])
  useEffect(() => { if (profile?.role === 'admin') fetchAdminStats() }, [profile])

  async function fetchAll() {
    const [hivesRes, harvestRes, logsRes] = await Promise.all([
      supabase.from('hives').select('*').eq('user_id', user.id).eq('status', 'aktif'),
      supabase.from('honey_harvests').select('*').eq('user_id', user.id).order('harvest_date', { ascending: true }),
      supabase.from('activity_logs').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(8)
    ])
    const hives = hivesRes.data || []
    const harvests = harvestRes.data || []
    const total = hives.length
    const critical = hives.filter(h => h.color_status === 'danger').length
    const needsMaintenance = hives.filter(h => h.color_status === 'warning').length
    const healthy = hives.filter(h => h.color_status === 'healthy').length
    const dormant = hives.filter(h => h.color_status === 'dormant' || h.brood_status === 'Yok').length
    const totalHoney = hives.reduce((s, h) => s + (h.honey_stock_kg || 0), 0)
    const totalHarvest = harvests.reduce((s, h) => s + (h.amount_kg || 0), 0)
    setStats({ total, critical, needsMaintenance, healthy, totalHoney, totalHarvest, dormant })
    setUrgentHives(hives.filter(h => h.color_status === 'danger' || h.color_status === 'warning').slice(0, 5))
    const months = getLast6Months()
    setHarvestData(months.map(({key, label}) => ({
      label,
      kg: harvests.filter(h => h.harvest_date?.startsWith(key)).reduce((s,h) => s+(h.amount_kg||0), 0)
    })))
    setRecentLogs(logsRes.data || [])

    // Finans özet (bu ay)
    const thisMonth = new Date().toISOString().slice(0, 7)
    const [costRes, incRes, feedRes] = await Promise.all([
      supabase.from('cost_records').select('amount').eq('user_id', user.id).like('record_date', `${thisMonth}%`),
      supabase.from('income_records').select('amount').eq('user_id', user.id).like('record_date', `${thisMonth}%`),
      supabase.from('feeding_records').select('id').eq('user_id', user.id).like('feed_date', `${thisMonth}%`),
    ])
    setQuickFinance({
      expense: (costRes.data||[]).reduce((s,c)=>s+(c.amount||0),0),
      income: (incRes.data||[]).reduce((s,i)=>s+(i.amount||0),0),
      feedCount: (feedRes.data||[]).length
    })
    setLoading(false)
  }

  async function fetchAdminStats() {
    const [profilesRes, sessionsRes, paymentsRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, role, avatar_color, email, phone'),
      supabase.from('worker_sessions').select('id').eq('is_active', true),
      supabase.from('payment_requests').select('*, profiles(full_name, email)').eq('status', 'pending').order('requested_at', { ascending: true })
    ])
    const profiles = profilesRes.data || []
    const activeSessions = sessionsRes.data || []
    setAdminStats({
      totalUsers: profiles.length,
      adminCount: profiles.filter(p => p.role === 'admin').length,
      ariciCount: profiles.filter(p => p.role !== 'admin').length,
      onlineSessions: activeSessions.length,
      profiles,
      pendingPayments: paymentsRes.data || []
    })
  }

  async function approvePayment(req) {
    const tier = PLAN_TIERS[req.plan_requested]
    const { error: e1 } = await supabase.from('payment_requests')
      .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user.id }).eq('id', req.id)
    const { error: e2 } = await supabase.from('subscriptions')
      .update({
        plan: req.plan_requested,
        hive_limit: tier.hiveLimit,
        current_period_ends_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        updated_at: new Date().toISOString()
      }).eq('user_id', req.user_id)
    if (e1 || e2) { toast.error(t('common.error_save')); return }
    toast.success(t('dashboard_page.payment_approved'))
    fetchAdminStats()
  }

  async function rejectPayment(req) {
    const { error } = await supabase.from('payment_requests')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user.id }).eq('id', req.id)
    if (error) { toast.error(t('common.error_save')); return }
    toast.success(t('dashboard_page.payment_rejected'))
    fetchAdminStats()
  }

  async function savePhone(userId) {
    const { error } = await supabase.from('profiles').update({ phone: phoneInput.trim() || null }).eq('id', userId)
    if (error) { toast.error(t('common.error_save') + ': ' + error.message); return }
    setAdminStats(prev => ({
      ...prev,
      profiles: prev.profiles.map(p => p.id === userId ? { ...p, phone: phoneInput.trim() || null } : p)
    }))
    setEditingPhoneId(null)
    toast.success(t('dashboard_page.phone_saved'))
  }

  if (loading) return (
    <div className="min-h-screen bg-dark-400 flex flex-col"><Navbar />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin"/>
      </div>
    </div>
  )

  const pieData = [
    { name:t('dashboard.healthy'), value:stats.healthy, color:GREEN },
    { name:t('reports.health_critical'), value:stats.critical, color:RED },
    { name:t('reports.health_maintenance'), value:stats.needsMaintenance, color:ORANGE },
    { name:t('reports.health_dormant'), value:stats.dormant, color:GRAY },
  ].filter(d => d.value > 0)

  return (
    <div className="min-h-screen bg-dark-400 flex flex-col">
      <Navbar />
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black">{t('dashboard.greeting', { name: displayName })} 👋</h1>
            <p className="text-gray-400 text-sm mt-1">
              {new Date().toLocaleDateString('tr-TR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            </p>
          </div>
        </div>

        {/* Admin Paneli */}
        {isAdmin && adminStats && (
          <div className="mb-6 p-4 rounded-2xl" style={{ background: '#1e1a00', border: '1px solid rgba(245,197,24,0.25)' }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">👑</span>
              <h2 className="font-black text-base" style={{ color: '#f5c518' }}>{t('dashboard_page.admin_panel')}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { icon: '👥', label: t('dashboard_page.total_members'), value: adminStats.totalUsers, color: '#f5c518' },
                { icon: '🟢', label: t('dashboard_page.active_sessions'), value: adminStats.onlineSessions, color: '#27ae60' },
                { icon: '👑', label: t('dashboard_page.admin_label'), value: adminStats.adminCount, color: '#e67e22' },
                { icon: '🐝', label: t('who_working.beekeeper'), value: adminStats.ariciCount, color: '#3498db' },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: '#2a2200' }}>
                  <div className="text-xl mb-1">{s.icon}</div>
                  <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            {adminStats.pendingPayments.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-gray-400 mb-2 font-bold">
                  💳 {t('dashboard_page.pending_payments')} ({adminStats.pendingPayments.length})
                </div>
                <div className="space-y-1.5">
                  {adminStats.pendingPayments.map(req => (
                    <div key={req.id} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: '#2a2200' }}>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">{req.profiles?.full_name || req.profiles?.email}</div>
                        <div className="text-[11px] text-gray-500 truncate">
                          {t(PLAN_TIERS[req.plan_requested]?.nameKey || 'plans.tier_starter')} — {req.amount} {req.currency}
                          {req.reference_note ? ` · ${req.reference_note}` : ''}
                        </div>
                      </div>
                      <button onClick={() => approvePayment(req)} className="text-[11px] px-2 py-1 rounded-lg font-bold flex-shrink-0"
                        style={{ background: '#27ae6022', color: '#27ae60' }}>✓ {t('dashboard_page.approve')}</button>
                      <button onClick={() => rejectPayment(req)} className="text-[11px] px-2 py-1 rounded-lg font-bold flex-shrink-0"
                        style={{ background: '#e74c3c22', color: '#e74c3c' }}>✕ {t('dashboard_page.reject')}</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-gray-400 mb-2 font-bold">{t('dashboard_page.registered_users')}</div>
            <div className="space-y-1.5">
              {adminStats.profiles.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: '#2a2200' }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black"
                    style={{ background: p.avatar_color || '#f5c518', color: '#1a1200' }}>
                    {p.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{p.full_name}</div>
                    <div className="text-[11px] text-gray-500 truncate flex items-center gap-1.5">
                      <span>{p.email || '—'}</span>
                      {editingPhoneId === p.id ? (
                        <>
                          <span>·</span>
                          <input
                            autoFocus
                            value={phoneInput}
                            onChange={e => setPhoneInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') savePhone(p.id); if (e.key === 'Escape') setEditingPhoneId(null) }}
                            placeholder="+90 5xx xxx xx xx"
                            className="text-[11px] px-1.5 py-0.5 rounded"
                            style={{ background: '#1a1500', border: '1px solid rgba(245,197,24,0.3)', width: 130 }}
                          />
                          <button onClick={() => savePhone(p.id)} className="text-gold text-xs">✓</button>
                          <button onClick={() => setEditingPhoneId(null)} className="text-gray-500 text-xs">✕</button>
                        </>
                      ) : (
                        <>
                          <span>·</span>
                          <span
                            onClick={() => { setEditingPhoneId(p.id); setPhoneInput(p.phone || '') }}
                            className="cursor-pointer hover:text-gold transition-colors"
                          >
                            {p.phone || t('dashboard_page.add_phone')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0"
                    style={{ background: p.role === 'admin' ? '#e67e2222' : '#27ae6022', color: p.role === 'admin' ? '#e67e22' : '#27ae60' }}>
                    {p.role === 'admin' ? '👑 ' + t('dashboard_page.admin_label') : '🐝 ' + t('who_working.beekeeper')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hava durumu - compact */}
        <div className="mb-6">
          <WeatherWidget compact={true} />
        </div>

        {/* Stat kartları */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon:'🐝', label:t('dashboard.total_hives'), value:stats.total, color:GOLD, onClick:()=>navigate('/panel') },
            { icon:'✅', label:t('dashboard.healthy'), value:stats.healthy, color:GREEN },
            { icon:'⚠️', label:t('dashboard.needs_care'), value:stats.critical+stats.needsMaintenance, color:ORANGE },
            { icon:'🍯', label:t('dashboard.honey_stock'), value:`${stats.totalHoney.toFixed(1)} kg`, color:GOLD },
          ].map(s => (
            <div key={s.label} onClick={s.onClick}
              className={`card flex flex-col gap-2 ${s.onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}>
              <div className="flex justify-between"><span className="text-2xl">{s.icon}</span>
                <div className="w-2 h-2 rounded-full mt-1" style={{ background: s.color }}/></div>
              <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-base">{t('harvest_page.last6_months_title')} (kg)</h2>
              <button onClick={() => navigate('/hasat')} className="text-xs text-gold hover:underline">{t('dashboard_page.see_all')} →</button>
            </div>
            {harvestData.every(d=>d.kg===0) ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-500 text-sm">
                <span className="text-3xl mb-2">🍯</span>{t('harvest.empty_title')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={harvestData} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                  <XAxis dataKey="label" tick={{ fill:'#888', fontSize:11 }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fill:'#888', fontSize:11 }} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{ background:'#2e2e2e', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'#fff' }}
                    formatter={v => [`${v} kg`, t('reports.label_harvest_short')]}/>
                  <Bar dataKey="kg" fill={GOLD} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card">
            <h2 className="font-black text-base mb-4">{t('dashboard_page.hive_statuses')}</h2>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" stroke="none">
                      {pieData.map((e,i) => <Cell key={i} fill={e.color}/>)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background:'#2e2e2e', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'#fff', fontSize:12 }}
                      formatter={(value, name) => [value + ' ' + t('reports.unit_hives'), name]}
                      position={{ x: 10, y: 10 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-2">
                  {pieData.map((d,i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-gray-300">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background:d.color }}/>{d.name} ({d.value})
                    </div>
                  ))}
                </div>
              </>
            ) : <div className="flex items-center justify-center h-40 text-gray-500 text-sm">{t('dashboard_page.no_hives')}</div>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Acil kovanlar */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-base flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/>{t('dashboard_page.needs_attention')}
              </h2>
              <button onClick={() => navigate('/panel')} className="text-xs text-gold hover:underline">{t('dashboard_page.panel_link')} →</button>
            </div>
            {urgentHives.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500 text-sm">
                <span className="text-2xl mb-2">✅</span>{t('dashboard_page.all_hives_good')}
              </div>
            ) : urgentHives.map(h => {
              const reason = getUrgentReason(h, t)
              return (
                <div key={h.id} onClick={() => navigate(`/kovan/${h.id}`)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-dark-100 transition-colors mb-1.5"
                  style={{ background:'#2e2e2e' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black"
                    style={{ background:reason.color+'22', color:reason.color }}>
                    {h.hive_no.replace('A-','')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{h.hive_no}</div>
                    <div className="text-xs mt-0.5" style={{ color:reason.color }}>{reason.text}</div>
                  </div>
                  <span className="text-gray-600 text-xs">→</span>
                </div>
              )
            })}
          </div>

          {/* Son aktiviteler */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-base">{t('dashboard.recent_activity')}</h2>
              <button onClick={() => navigate('/calisanlar')} className="text-xs text-gold hover:underline">{t('common.all')} →</button>
            </div>
            {recentLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500 text-sm">
                <span className="text-2xl mb-2">📋</span>{t('dashboard.no_activity')}
              </div>
            ) : recentLogs.map(log => (
              <div key={log.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg mb-1"
                style={{ background:'#2e2e2e' }}>
                <span>{actionEmoji(log.action)}</span>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-xs text-gold">{log.worker_name} </span>
                  <span className="text-xs text-gray-300">{actionText(log.action, t)}</span>
                  {log.hive_no && <span className="text-xs font-bold"> {log.hive_no}</span>}
                </div>
                <span className="text-[10px] text-gray-600">{timeAgo(log.created_at, t)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              [stats.totalHarvest.toFixed(1), t('dashboard.total_harvest') + ' (kg)', GOLD],
              [stats.total>0 ? Math.round((stats.healthy/stats.total)*100)+'%' : '0%', t('dashboard_page.healthy_ratio'), GREEN],
              [stats.needsMaintenance, t('dashboard_page.pending_maintenance'), ORANGE],
              [stats.dormant, t('dashboard.dormant'), GRAY],
            ].map(([val,label,color]) => (
              <div key={label}>
                <div className="text-2xl font-black" style={{ color }}>{val}</div>
                <div className="text-xs text-gray-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

function getUrgentReason(h, t) {
  if (h.color_status === 'dormant') return { text: t('dashboard_page.reason_dormant'), color: '#555' }
  if (h.color_status === 'danger') return { text: t('dashboard_page.reason_never_inspected'), color: RED }
  if (h.color_status === 'warning') return { text: t('dashboard_page.reason_needs_maintenance'), color: ORANGE }
  if (h.honey_stock_kg <= 3) return { text: `${t('dashboard_page.reason_critical_stock')} (${h.honey_stock_kg} kg)`, color: RED }
  return { text: t('dashboard_page.reason_check_needed'), color: ORANGE }
}
function getLast6Months() {
  return Array.from({length:6},(_,i)=>{
    const d=new Date(); d.setMonth(d.getMonth()-(5-i))
    return { key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, label:d.toLocaleDateString('tr-TR',{month:'short'}) }
  })
}
function actionEmoji(a){ return {kovan_guncellendi:'📝',bakim_eklendi:'🔧',hasat_eklendi:'🍯',hastalik_eklendi:'💊'}[a]||'📌' }
function actionText(a, t){ return {kovan_guncellendi:t('dashboard_page.action_updated'),bakim_eklendi:t('dashboard_page.action_maintenance_added'),hasat_eklendi:t('dashboard_page.action_harvest_logged'),hastalik_eklendi:t('dashboard_page.action_disease')}[a]||a }
function timeAgo(d, t){ const m=Math.floor((Date.now()-new Date(d))/60000); if(m<2)return t('dashboard_page.just_now'); if(m<60)return m+t('dashboard_page.min_short'); const h=Math.floor(m/60); if(h<24)return h+t('dashboard_page.hour_short'); return Math.floor(h/24)+t('dashboard_page.day_short') }

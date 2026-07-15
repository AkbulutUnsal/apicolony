import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/layout/Navbar'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts'

const GOLD = '#f5c518', GREEN = '#27ae60', RED = '#e74c3c', ORANGE = '#e67e22', GRAY = '#666', BLUE = '#3498db'

export default function ReportsPage() {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const printRef = useRef()

  const [loading, setLoading] = useState(true)
  const [hives, setHives] = useState([])
  const [harvests, setHarvests] = useState([])
  const [maintenance, setMaintenance] = useState([])
  const [diseases, setDiseases] = useState([])
  const [feedings, setFeedings] = useState([])
  const [treatments, setTreatments] = useState([])
  const [costs, setCosts] = useState([])
  const [incomes, setIncomes] = useState([])
  const [activeTab, setActiveTab] = useState('ozet')

  useEffect(() => { if (user) fetchAll() }, [user])

  async function fetchAll() {
    // Önce kullanıcının kovan id'lerini al (güvenlik için user_id filtresi)
    const { data: userHives } = await supabase
      .from('hives').select('id').eq('user_id', user.id).eq('status', 'aktif')
    const hiveIds = (userHives || []).map(h => h.id)

    const [hivRes, harRes, mainRes, disRes] = await Promise.all([
      supabase.from('hives').select('*').eq('user_id', user.id).eq('status', 'aktif'),
      supabase.from('honey_harvests').select('*').eq('user_id', user.id).order('harvest_date'),
      hiveIds.length > 0
        ? supabase.from('maintenance_records').select('*, hives(hive_no)')
            .in('hive_id', hiveIds).order('inspection_date', { ascending: false })
        : Promise.resolve({ data: [] }),
      hiveIds.length > 0
        ? supabase.from('disease_records').select('*, hives(hive_no)')
            .in('hive_id', hiveIds).order('detected_date', { ascending: false })
        : Promise.resolve({ data: [] })
    ])
    setHives(hivRes.data || [])
    setHarvests(harRes.data || [])
    setMaintenance(mainRes.data || [])
    setDiseases(disRes.data || [])

    // Besleme, tedavi, finans
    const [feedRes, treatRes, costRes, incRes] = await Promise.all([
      supabase.from('feeding_records').select('*').eq('user_id', user.id).order('feed_date', { ascending: false }),
      supabase.from('treatment_records').select('*, hives(hive_no)').eq('user_id', user.id).order('treatment_date', { ascending: false }),
      supabase.from('cost_records').select('*').eq('user_id', user.id).order('record_date', { ascending: false }),
      supabase.from('income_records').select('*').eq('user_id', user.id).order('record_date', { ascending: false }),
    ])
    setFeedings(feedRes.data || [])
    setTreatments(treatRes.data || [])
    setCosts(costRes.data || [])
    setIncomes(incRes.data || [])
    setLoading(false)
  }

  // ── Hesaplamalar ──────────────────────────────────────────
  const totalHives = hives.length
  const healthyHives = hives.filter(h => h.color_status === 'healthy').length
  const dangerHives = hives.filter(h => h.color_status === 'danger').length
  const warningHives = hives.filter(h => h.color_status === 'warning').length
  const dormantHives = hives.filter(h => h.color_status === 'dormant').length
  const totalHoney = hives.reduce((s, h) => s + (h.honey_stock_kg || 0), 0)
  const totalHarvest = harvests.reduce((s, h) => s + (h.amount_kg || 0), 0)

  // Aylık hasat
  const monthlyHarvest = getLast12Months().map(({ key, label }) => ({
    label,
    kg: harvests.filter(h => h.harvest_date?.startsWith(key)).reduce((s, h) => s + (h.amount_kg || 0), 0)
  }))

  // Bal çeşidi dağılımı
  const honeyTypes = harvests.reduce((acc, h) => {
    const type = h.honey_type || t('reports.honey_type_other')
    acc[type] = (acc[type] || 0) + (h.amount_kg || 0)
    return acc
  }, {})
  const honeyTypeData = Object.entries(honeyTypes).map(([name, value]) => ({ name, value: Math.round(value * 10) / 10 }))
    .sort((a, b) => b.value - a.value)

  // Kovan sağlık dağılımı
  const healthPieData = [
    { name: t('reports.health_healthy'), value: healthyHives, color: GREEN },
    { name: t('reports.health_maintenance'), value: warningHives, color: ORANGE },
    { name: t('reports.health_critical'), value: dangerHives, color: RED },
    { name: t('reports.health_dormant'), value: dormantHives, color: GRAY },
  ].filter(d => d.value > 0)

  // En çok hasat veren kovanlar
  const hiveHarvests = hives.map(h => ({
    hive_no: h.hive_no,
    total: harvests.filter(r => r.hive_id === h.id).reduce((s, r) => s + (r.amount_kg || 0), 0)
  })).filter(h => h.total > 0).sort((a, b) => b.total - a.total).slice(0, 10)

  // Bakım istatistikleri
  const maintenanceByMonth = getLast6Months().map(({ key, label }) => ({
    label,
    count: maintenance.filter(m => m.inspection_date?.startsWith(key)).length
  }))

  // Geciken bakımlar (color_status danger/warning)
  const delayedHives = hives.filter(h => h.color_status === 'danger' || h.color_status === 'warning')

  function handlePrint() {
    window.print()
  }

  if (loading) return (
    <div className="min-h-screen bg-dark-400 flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )

  const TABS = [
    { id: 'ozet',    label: t('reports.tab_summary') },
    { id: 'hasat',   label: t('reports.tab_harvest') },
    { id: 'saglik',  label: t('reports.tab_health') },
    { id: 'bakim',   label: t('reports.tab_maintenance') },
    { id: 'besleme', label: t('reports.tab_feeding') },
    { id: 'tedavi',  label: t('reports.tab_treatment') },
    { id: 'finans',  label: t('reports.tab_finance') },
  ]

  return (
    <div className="min-h-screen bg-dark-400 flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full" ref={printRef}>
        {/* Başlık */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black">{t('reports.title')}</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} · {profile?.full_name}
            </p>
          </div>
          <button onClick={handlePrint}
            className="btn-gold flex items-center gap-2">
            {t('reports.print_btn')}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto mb-6 gap-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`tab-btn whitespace-nowrap ${activeTab === tab.id ? 'active' : ''}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── ÖZET ── */}
        {activeTab === 'ozet' && (
          <div className="space-y-6">
            {/* KPI kartları */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: '🐝', label: t('reports.kpi_total_hives'), value: totalHives, color: GOLD },
                { icon: '✅', label: t('reports.health_healthy'), value: healthyHives, color: GREEN },
                { icon: '⚠️', label: t('reports.kpi_needs_maintenance'), value: warningHives + dangerHives, color: ORANGE },
                { icon: '🍯', label: t('reports.kpi_honey_stock'), value: `${totalHoney.toFixed(1)} kg`, color: GOLD },
                { icon: '📦', label: t('reports.kpi_total_harvest'), value: `${totalHarvest.toFixed(1)} kg`, color: BLUE },
                { icon: '🔧', label: t('reports.kpi_total_maintenance'), value: maintenance.length, color: GREEN },
                { icon: '💊', label: t('reports.kpi_disease_count'), value: diseases.length, color: RED },
                { icon: '⬛', label: t('reports.kpi_dormant_colony'), value: dormantHives, color: GRAY },
              ].map(s => (
                <div key={s.label} className="card flex flex-col gap-2">
                  <span className="text-2xl">{s.icon}</span>
                  <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-gray-400">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Sağlık dağılımı + Hasat özeti */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card">
                <h2 className="font-black text-base mb-4">{t('reports.chart_health_distribution_title')}</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={healthPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" stroke="none">
                      {healthPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#2e2e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 12 }}
                      formatter={(v, n) => [v + ' ' + t('reports.unit_hives'), n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-2">
                  {healthPieData.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-gray-300">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      {d.name} ({d.value})
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h2 className="font-black text-base mb-4">{t('reports.chart_last12_harvest_title')}</h2>
                {harvests.length === 0 ? (
                  <div className="flex items-center justify-center h-40 text-gray-500 text-sm">{t('reports.empty_no_harvest')}</div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={monthlyHarvest} barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="label" tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#2e2e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 12 }}
                        formatter={v => [`${v} kg`, t('reports.label_harvest_short')]} />
                      <Bar dataKey="kg" fill={GOLD} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── HASAT ── */}
        {activeTab === 'hasat' && (
          <div className="space-y-6">
            {/* Özet kartlar */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: t('reports.kpi_total_harvest'), value: `${totalHarvest.toFixed(1)} kg`, color: GOLD },
                { label: t('reports.kpi_harvest_count'), value: harvests.length, color: BLUE },
                { label: t('reports.kpi_avg_per_harvest'), value: harvests.length > 0 ? `${(totalHarvest / harvests.length).toFixed(1)} kg` : '0 kg', color: GREEN },
              ].map(s => (
                <div key={s.label} className="card text-center">
                  <div className="text-2xl font-black mb-1" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-gray-400">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Aylık hasat grafiği */}
              <div className="card">
                <h2 className="font-black text-base mb-4">{t('reports.chart_monthly_harvest_title')}</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyHarvest} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#2e2e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                      formatter={v => [`${v} kg`, t('reports.label_harvest_short')]} />
                    <Bar dataKey="kg" fill={GOLD} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Bal çeşidi */}
              <div className="card">
                <h2 className="font-black text-base mb-4">{t('reports.chart_honey_type_title')}</h2>
                {honeyTypeData.length === 0 ? (
                  <div className="flex items-center justify-center h-40 text-gray-500 text-sm">{t('reports.empty_no_record')}</div>
                ) : (
                  <div className="space-y-2.5">
                    {honeyTypeData.map((h, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-300 font-semibold">{h.name}</span>
                          <span className="text-gold font-black">{h.value} kg</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: '#333' }}>
                          <div className="h-full rounded-full" style={{
                            width: `${(h.value / totalHarvest) * 100}%`,
                            background: [GOLD, GREEN, BLUE, ORANGE, RED, '#9b59b6', '#1abc9c'][i % 7]
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* En çok hasat veren kovanlar */}
            <div className="card">
              <h2 className="font-black text-base mb-4">{t('reports.table_top_harvest_hives_title')}</h2>
              {hiveHarvests.length === 0 ? (
                <div className="text-gray-500 text-sm text-center py-8">{t('reports.empty_no_harvest')}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <th className="text-left py-2 px-3 text-xs text-gray-400 font-bold">#</th>
                        <th className="text-left py-2 px-3 text-xs text-gray-400 font-bold">{t('reports.col_hive')}</th>
                        <th className="text-right py-2 px-3 text-xs text-gray-400 font-bold">{t('reports.kpi_total_harvest')}</th>
                        <th className="text-right py-2 px-3 text-xs text-gray-400 font-bold">{t('reports.col_ratio')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hiveHarvests.map((h, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td className="py-2 px-3 text-gray-500 font-bold">{i + 1}</td>
                          <td className="py-2 px-3 font-bold text-gold">{h.hive_no}</td>
                          <td className="py-2 px-3 text-right font-black">{h.total.toFixed(1)} kg</td>
                          <td className="py-2 px-3 text-right text-gray-400">
                            %{totalHarvest > 0 ? Math.round((h.total / totalHarvest) * 100) : 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SAĞLIK ── */}
        {activeTab === 'saglik' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: t('reports.health_healthy'), value: healthyHives, color: GREEN, icon: '✅' },
                { label: t('reports.kpi_needs_maintenance'), value: warningHives, color: ORANGE, icon: '⚠️' },
                { label: t('reports.health_critical'), value: dangerHives, color: RED, icon: '🚨' },
                { label: t('reports.health_dormant'), value: dormantHives, color: GRAY, icon: '⬛' },
              ].map(s => (
                <div key={s.label} className="card text-center">
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <div className="text-3xl font-black mb-1" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-gray-400">{s.label}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    %{totalHives > 0 ? Math.round((s.value / totalHives) * 100) : 0}
                  </div>
                </div>
              ))}
            </div>

            {/* Sağlık pasta grafik */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card">
                <h2 className="font-black text-base mb-4">{t('reports.chart_health_pie_title')}</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={healthPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none"
                      label={({ name, percent }) => `${name} %${Math.round(percent * 100)}`}
                      labelLine={false}>
                      {healthPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#2e2e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 12 }}
                      formatter={(v, n) => [v + ' ' + t('reports.unit_hives'), n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Hastalık kayıtları */}
              <div className="card">
                <h2 className="font-black text-base mb-4">{t('reports.section_disease_records_title')} ({diseases.length})</h2>
                {diseases.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-500 text-sm">
                    <span className="text-2xl mb-2">✅</span>{t('reports.empty_no_disease')}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {diseases.slice(0, 10).map((d, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: '#2e2e2e' }}>
                        <span className="text-red-400 text-lg">💊</span>
                        <div className="flex-1">
                          <div className="text-sm font-bold">{d.hives?.hive_no || '?'}</div>
                          <div className="text-xs text-gray-400">{d.disease_name || t('reports.unknown')}</div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {d.detected_date ? new Date(d.detected_date).toLocaleDateString('tr-TR') : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bakım bekleyen kovanlar tablosu */}
            <div className="card">
              <h2 className="font-black text-base mb-4">{t('reports.section_pending_maintenance_title')} ({delayedHives.length})</h2>
              {delayedHives.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500 text-sm">
                  <span className="text-2xl mb-2">✅</span>{t('reports.empty_all_maintained')}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <th className="text-left py-2 px-3 text-xs text-gray-400 font-bold">{t('reports.col_hive')}</th>
                        <th className="text-left py-2 px-3 text-xs text-gray-400 font-bold">{t('reports.col_status')}</th>
                        <th className="text-right py-2 px-3 text-xs text-gray-400 font-bold">{t('reports.kpi_honey_stock')}</th>
                        <th className="text-left py-2 px-3 text-xs text-gray-400 font-bold">{t('reports.col_brood')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {delayedHives.map((h, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td className="py-2 px-3 font-bold text-gold">{h.hive_no}</td>
                          <td className="py-2 px-3">
                            <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                              style={{
                                background: h.color_status === 'danger' ? '#e74c3c22' : '#e67e2222',
                                color: h.color_status === 'danger' ? RED : ORANGE
                              }}>
                              {h.color_status === 'danger' ? '🚨 ' + t('reports.health_critical') : '⚠️ ' + t('reports.health_maintenance')}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-bold">{h.honey_stock_kg} kg</td>
                          <td className="py-2 px-3 text-gray-400">{h.brood_status || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── BAKIM ── */}
        {activeTab === 'bakim' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: t('reports.kpi_total_maintenance'), value: maintenance.length, color: GOLD },
                { label: t('reports.kpi_this_month'), value: maintenance.filter(m => m.inspection_date?.startsWith(new Date().toISOString().slice(0, 7))).length, color: GREEN },
                { label: t('reports.kpi_maintained_hives'), value: hives.filter(h => h.color_status === 'healthy').length, color: BLUE },
              ].map(s => (
                <div key={s.label} className="card text-center">
                  <div className="text-2xl font-black mb-1" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-gray-400">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Aylık bakım grafiği */}
            <div className="card">
              <h2 className="font-black text-base mb-4">{t('reports.chart_monthly_maintenance_title')}</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={maintenanceByMonth} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="label" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#2e2e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                    formatter={v => [v + ' ' + t('reports.unit_maintenance'), t('reports.health_maintenance')]} />
                  <Bar dataKey="count" fill={GREEN} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Son bakımlar tablosu */}
            <div className="card">
              <h2 className="font-black text-base mb-4">{t('reports.table_recent_maintenance_title')}</h2>
              {maintenance.length === 0 ? (
                <div className="text-gray-500 text-sm text-center py-8">{t('reports.empty_no_maintenance')}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <th className="text-left py-2 px-3 text-xs text-gray-400 font-bold">{t('reports.col_date')}</th>
                        <th className="text-left py-2 px-3 text-xs text-gray-400 font-bold">{t('reports.col_hive')}</th>
                        <th className="text-left py-2 px-3 text-xs text-gray-400 font-bold">{t('reports.col_season')}</th>
                        <th className="text-left py-2 px-3 text-xs text-gray-400 font-bold">{t('reports.col_colony')}</th>
                        <th className="text-right py-2 px-3 text-xs text-gray-400 font-bold">{t('reports.col_honey_frames')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {maintenance.slice(0, 20).map((m, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td className="py-2 px-3 text-gray-400 text-xs">
                            {m.inspection_date ? new Date(m.inspection_date).toLocaleDateString('tr-TR') : '-'}
                          </td>
                          <td className="py-2 px-3 font-bold text-gold">{m.hives?.hive_no || '-'}</td>
                          <td className="py-2 px-3 text-gray-300">{m.season || '-'}</td>
                          <td className="py-2 px-3">
                            <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                              style={{
                                background: m.colony_strength === 'Güçlü' ? '#27ae6022' : m.colony_strength === 'Zayıf' ? '#e74c3c22' : '#e67e2222',
                                color: m.colony_strength === 'Güçlü' ? GREEN : m.colony_strength === 'Zayıf' ? RED : ORANGE
                              }}>
                              {colonyStrengthLabel(m.colony_strength, t)}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-bold">{m.honey_frames ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
        {/* ── BESLEME ── */}
        {activeTab === 'besleme' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: t('reports.kpi_total_feeding'), value: feedings.length, color: GOLD },
                { label: t('reports.kpi_this_month'), value: feedings.filter(f => f.feed_date?.startsWith(new Date().toISOString().slice(0,7))).length, color: GREEN },
                { label: t('reports.kpi_total_cost'), value: `${feedings.reduce((s,f)=>s+(f.cost||0),0).toLocaleString('tr-TR')} ₺`, color: ORANGE },
              ].map(s => (
                <div key={s.label} className="card text-center">
                  <div className="text-2xl font-black mb-1" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-gray-400">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="card">
              <h2 className="font-black text-base mb-4">{t('reports.chart_feeding_type_title')}</h2>
              {feedings.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">{t('reports.empty_no_feeding')}</div>
              ) : (
                <div className="space-y-2.5">
                  {Object.entries(feedings.reduce((acc,f)=>{ acc[f.feed_type]=(acc[f.feed_type]||0)+1; return acc },{}))
                    .sort((a,b)=>b[1]-a[1]).map(([type, count]) => (
                    <div key={type} className="flex items-center gap-3">
                      <div className="text-xs text-gray-400 w-32 flex-shrink-0">{type}</div>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.08)' }}>
                        <div className="h-full rounded-full" style={{ width:`${(count/feedings.length)*100}%`, background: GOLD }} />
                      </div>
                      <div className="text-xs font-bold w-12 text-right">{count} {t('reports.unit_times')}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card">
              <h2 className="font-black text-base mb-4">{t('reports.table_recent_feeding_title')}</h2>
              {feedings.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">{t('reports.empty_no_record')}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr style={{ borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                      <th className="text-left py-2 px-3 text-xs text-gray-400 font-bold">{t('reports.col_date')}</th>
                      <th className="text-left py-2 px-3 text-xs text-gray-400 font-bold">{t('reports.col_type')}</th>
                      <th className="text-right py-2 px-3 text-xs text-gray-400 font-bold">{t('reports.col_amount')}</th>
                      <th className="text-right py-2 px-3 text-xs text-gray-400 font-bold">{t('reports.col_cost')}</th>
                    </tr></thead>
                    <tbody>
                      {feedings.slice(0,20).map((f,i) => (
                        <tr key={i} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                          <td className="py-2 px-3 text-gray-400 text-xs">{f.feed_date ? new Date(f.feed_date+'T00:00:00').toLocaleDateString('tr-TR') : '-'}</td>
                          <td className="py-2 px-3 font-semibold">{f.feed_type}</td>
                          <td className="py-2 px-3 text-right">{f.amount} {f.unit}</td>
                          <td className="py-2 px-3 text-right text-gold">{f.cost ? `${f.cost} ₺` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TEDAVİ ── */}
        {activeTab === 'tedavi' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: t('reports.kpi_total_treatment'), value: treatments.length, color: RED },
                { label: t('reports.kpi_this_month'), value: treatments.filter(t => t.treatment_date?.startsWith(new Date().toISOString().slice(0,7))).length, color: ORANGE },
                { label: t('reports.kpi_distinct_disease'), value: new Set(treatments.map(t=>t.disease_type)).size, color: GOLD },
              ].map(s => (
                <div key={s.label} className="card text-center">
                  <div className="text-2xl font-black mb-1" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-gray-400">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="card">
              <h2 className="font-black text-base mb-4">{t('reports.chart_disease_pest_title')}</h2>
              {treatments.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm flex flex-col items-center gap-2"><span className="text-2xl">✅</span>{t('reports.empty_no_treatment')}</div>
              ) : (
                <div className="space-y-2.5">
                  {Object.entries(treatments.reduce((acc,t)=>{ acc[t.disease_type]=(acc[t.disease_type]||0)+1; return acc },{}))
                    .sort((a,b)=>b[1]-a[1]).map(([type, count]) => (
                    <div key={type} className="flex items-center gap-3">
                      <div className="text-xs text-gray-400 w-36 flex-shrink-0">{type}</div>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.08)' }}>
                        <div className="h-full rounded-full" style={{ width:`${(count/treatments.length)*100}%`, background: RED }} />
                      </div>
                      <div className="text-xs font-bold w-12 text-right">{count} {t('reports.unit_times')}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card">
              <h2 className="font-black text-base mb-4">{t('reports.table_recent_treatment_title')}</h2>
              {treatments.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">{t('reports.empty_no_record')}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr style={{ borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                      <th className="text-left py-2 px-3 text-xs text-gray-400 font-bold">{t('reports.col_date')}</th>
                      <th className="text-left py-2 px-3 text-xs text-gray-400 font-bold">{t('reports.col_hive')}</th>
                      <th className="text-left py-2 px-3 text-xs text-gray-400 font-bold">{t('reports.col_disease')}</th>
                      <th className="text-left py-2 px-3 text-xs text-gray-400 font-bold">{t('reports.col_product')}</th>
                      <th className="text-left py-2 px-3 text-xs text-gray-400 font-bold">{t('reports.col_severity')}</th>
                    </tr></thead>
                    <tbody>
                      {treatments.slice(0,20).map((tr,i) => (
                        <tr key={i} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                          <td className="py-2 px-3 text-gray-400 text-xs">{tr.treatment_date ? new Date(tr.treatment_date+'T00:00:00').toLocaleDateString('tr-TR') : '-'}</td>
                          <td className="py-2 px-3 font-bold text-gold">{tr.hives?.hive_no || '-'}</td>
                          <td className="py-2 px-3">{tr.disease_type}</td>
                          <td className="py-2 px-3 text-gray-400">{tr.product_name || '-'}</td>
                          <td className="py-2 px-3">
                            <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{
                              background: tr.severity==='Ağır'?'#e74c3c22':tr.severity==='Orta'?'#e67e2222':'#27ae6022',
                              color: tr.severity==='Ağır'?RED:tr.severity==='Orta'?ORANGE:GREEN
                            }}>{severityLabel(tr.severity, t)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── FİNANS ── */}
        {activeTab === 'finans' && (() => {
          const totalExp = costs.reduce((s,c)=>s+(c.amount||0),0)
          const totalInc = incomes.reduce((s,i)=>s+(i.amount||0),0)
          const profit = totalInc - totalExp
          const kgSold = incomes.filter(i=>i.category==='Bal Satışı'&&i.quantity_kg).reduce((s,i)=>s+(i.quantity_kg||0),0)
          const kgPrice = kgSold>0 ? incomes.filter(i=>i.category==='Bal Satışı').reduce((s,i)=>s+(i.amount||0),0)/kgSold : 0
          return (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: t('reports.kpi_total_income'), value: `${totalInc.toLocaleString('tr-TR')} ₺`, color: GREEN },
                  { label: t('reports.kpi_total_expense'), value: `${totalExp.toLocaleString('tr-TR')} ₺`, color: RED },
                  { label: t('reports.kpi_profit_loss'), value: `${profit>=0?'+':''}${profit.toLocaleString('tr-TR')} ₺`, color: profit>=0?GREEN:RED },
                  { label: t('reports.kpi_avg_kg_price'), value: kgPrice>0?`${kgPrice.toFixed(0)} ₺/kg`:'—', color: GOLD },
                ].map(s => (
                  <div key={s.label} className="card text-center">
                    <div className="text-xl font-black mb-1" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-xs text-gray-400">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card">
                  <h2 className="font-black text-sm mb-3">{t('reports.section_recent_expenses')}</h2>
                  {costs.length===0 ? <p className="text-sm text-gray-500 text-center py-4">{t('reports.empty_no_record')}</p> : (
                    <div className="space-y-1.5">
                      {costs.slice(0,8).map((c,i)=>(
                        <div key={i} className="flex justify-between items-center text-sm py-1.5" style={{ borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                          <div>
                            <span className="font-semibold">{c.category}</span>
                            {c.description && <span className="text-gray-500 text-xs ml-2">{c.description}</span>}
                          </div>
                          <span className="font-black text-red-400 flex-shrink-0 ml-3">-{c.amount?.toLocaleString('tr-TR')} ₺</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="card">
                  <h2 className="font-black text-sm mb-3">{t('reports.section_recent_incomes')}</h2>
                  {incomes.length===0 ? <p className="text-sm text-gray-500 text-center py-4">{t('reports.empty_no_record')}</p> : (
                    <div className="space-y-1.5">
                      {incomes.slice(0,8).map((c,i)=>(
                        <div key={i} className="flex justify-between items-center text-sm py-1.5" style={{ borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                          <div>
                            <span className="font-semibold">{c.category}</span>
                            {c.description && <span className="text-gray-500 text-xs ml-2">{c.description}</span>}
                          </div>
                          <span className="font-black text-green-400 flex-shrink-0 ml-3">+{c.amount?.toLocaleString('tr-TR')} ₺</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })()}

      </main>

      {/* Print CSS */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          nav, .btn-gold { display: none !important; }
          .card { border: 1px solid #ddd !important; background: white !important; page-break-inside: avoid; }
          * { color: black !important; }
        }
      `}</style>
    </div>
  )
}

function colonyStrengthLabel(strength, t) {
  if (strength === 'Güçlü') return t('reports.colony_strong')
  if (strength === 'Zayıf') return t('reports.colony_weak')
  if (strength === 'Orta') return t('reports.colony_medium')
  return '-'
}

function severityLabel(severity, t) {
  if (severity === 'Ağır') return t('reports.severity_severe')
  if (severity === 'Orta') return t('reports.severity_moderate')
  if (severity === 'Hafif') return t('reports.severity_mild')
  return '-'
}

function getLast12Months() {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (11 - i))
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('tr-TR', { month: 'short' })
    }
  })
}

function getLast6Months() {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('tr-TR', { month: 'short' })
    }
  })
}

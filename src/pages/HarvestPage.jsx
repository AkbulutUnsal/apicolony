import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useWorker } from '../hooks/useWorker'
import Navbar from '../components/layout/Navbar'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const HONEY_TYPES = ['Çiçek Balı', 'Orman Balı', 'Kestane Balı', 'Kekik Balı', 'Ihlamur Balı', 'Akasya Balı', 'Çam Balı', 'Diğer']
const HONEY_TYPE_KEYS = {
  'Çiçek Balı': 'harvest_page.honey_flower', 'Orman Balı': 'harvest_page.honey_forest',
  'Kestane Balı': 'harvest_page.honey_chestnut', 'Kekik Balı': 'harvest_page.honey_thyme',
  'Ihlamur Balı': 'harvest_page.honey_linden', 'Akasya Balı': 'harvest_page.honey_acacia',
  'Çam Balı': 'harvest_page.honey_pine', 'Diğer': 'reports.honey_type_other',
}

export default function HarvestPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { activeWorker, logActivity } = useWorker()
  const navigate = useNavigate()
  const [harvests, setHarvests] = useState([])
  const [hives, setHives] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all') // all | month | year
  const [form, setForm] = useState({
    hive_id: '',
    harvest_date: new Date().toISOString().slice(0, 10),
    amount_kg: '',
    honey_type: 'Çiçek Balı',
    brix_value: '',
    notes: ''
  })

  useEffect(() => { if (user) fetchAll() }, [user])

  async function fetchAll() {
    const [hRes, hivRes] = await Promise.all([
      supabase.from('honey_harvests').select('*, hives(hive_no)')
        .eq('user_id', user.id).order('harvest_date', { ascending: false }),
      supabase.from('hives').select('id, hive_no').eq('user_id', user.id).eq('status', 'aktif').order('hive_no')
    ])
    setHarvests(hRes.data || [])
    setHives(hivRes.data || [])
    setLoading(false)
  }

  async function saveHarvest() {
    if (!form.amount_kg || parseFloat(form.amount_kg) <= 0) {
      toast.error(t('harvest_page.error_amount')); return
    }
    setSaving(true)
    const { data, error } = await supabase.from('honey_harvests').insert({
      user_id: user.id,
      hive_id: form.hive_id || null,
      harvest_date: form.harvest_date,
      amount_kg: parseFloat(form.amount_kg),
      honey_type: form.honey_type,
      brix_value: form.brix_value ? parseFloat(form.brix_value) : null,
      notes: form.notes || null
    }).select('*, hives(hive_no)').single()

    if (error) { toast.error(t('common.error_save') + ': ' + error.message); setSaving(false); return }

    // Aktivite logu
    const hiveNo = hives.find(h => h.id === form.hive_id)?.hive_no
    await logActivity(user.id, 'hasat_eklendi', form.hive_id || null, hiveNo, `${form.amount_kg} kg ${form.honey_type}`)

    setHarvests(prev => [data, ...prev])
    setShowForm(false)
    setForm({ hive_id: '', harvest_date: new Date().toISOString().slice(0, 10), amount_kg: '', honey_type: 'Çiçek Balı', brix_value: '', notes: '' })
    toast.success(t('harvest_page.saved') + ' 🍯')
    setSaving(false)
  }

  async function deleteHarvest(id) {
    if (!confirm(t('harvest_page.confirm_delete'))) return
    await supabase.from('honey_harvests').delete().eq('id', id)
    setHarvests(prev => prev.filter(h => h.id !== id))
    toast.success(t('common.deleted'))
  }

  // Filtreleme
  const filtered = harvests.filter(h => {
    if (filter === 'month') {
      const d = new Date(h.harvest_date)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }
    if (filter === 'year') return new Date(h.harvest_date).getFullYear() === new Date().getFullYear()
    return true
  })

  // Özet istatistikler
  const totalKg = filtered.reduce((s, h) => s + (h.amount_kg || 0), 0)
  const byType = HONEY_TYPES.map(t => ({
    type: t.replace(' Balı', ''),
    kg: filtered.filter(h => h.honey_type === t).reduce((s, h) => s + (h.amount_kg || 0), 0)
  })).filter(d => d.kg > 0)

  // Aylık grafik
  const monthlyData = getLast6Months().map(({ key, label }) => ({
    label,
    kg: harvests.filter(h => h.harvest_date?.startsWith(key)).reduce((s, h) => s + (h.amount_kg || 0), 0)
  }))

  if (loading) return (
    <div className="min-h-screen bg-dark-400 flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin"/>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-dark-400 flex flex-col">
      <Navbar />
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">

        {/* Başlık */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black">🍯 {t('harvest.title')}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{t('harvest_page.subtitle')}</p>
          </div>
          <button className="btn-gold" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ ' + t('common.cancel') : '+ ' + t('harvest_page.new_harvest_btn')}
          </button>
        </div>

        {/* Hasat ekleme formu */}
        {showForm && (
          <div className="card mb-6" style={{ border: '1px solid rgba(245,197,24,0.3)' }}>
            <h2 className="font-black text-base mb-4">{t('harvest_page.new_record_title')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="field-label">{t('harvest_page.hive_optional')}</label>
                <select value={form.hive_id} onChange={e => setForm(p => ({ ...p, hive_id: e.target.value }))}>
                  <option value="">{t('harvest_page.general_all_apiary')}</option>
                  {hives.map(h => <option key={h.id} value={h.id}>{h.hive_no}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">{t('harvest_page.harvest_date')}</label>
                <input type="date" value={form.harvest_date}
                  onChange={e => setForm(p => ({ ...p, harvest_date: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">{t('harvest.amount_kg')} *</label>
                <input type="number" min="0" step="0.1" placeholder="0.0"
                  value={form.amount_kg} onChange={e => setForm(p => ({ ...p, amount_kg: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">{t('harvest.honey_type')}</label>
                <select value={form.honey_type} onChange={e => setForm(p => ({ ...p, honey_type: e.target.value }))}>
                  {HONEY_TYPES.map(ht => <option key={ht}>{ht}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">{t('harvest.brix')}</label>
                <input type="number" min="0" max="100" step="0.1" placeholder={t('harvest_page.refractometer_placeholder')}
                  value={form.brix_value} onChange={e => setForm(p => ({ ...p, brix_value: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">{t('common.notes')}</label>
                <input placeholder={t('harvest_page.optional_note')} value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button className="btn-gold" onClick={saveHarvest} disabled={saving}>
                {saving ? t('common.saving') : '💾 ' + t('harvest_page.save_harvest_btn')}
              </button>
              <button className="btn-ghost" onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
            </div>
          </div>
        )}

        {/* Özet kartlar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card text-center">
            <div className="text-3xl font-black text-gold">{totalKg.toFixed(1)}</div>
            <div className="text-xs text-gray-400 mt-1">{t('harvest.total_harvest')} (kg)</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-black text-gold">{filtered.length}</div>
            <div className="text-xs text-gray-400 mt-1">{t('harvest.harvest_count')}</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-black text-gold">
              {filtered.length > 0 ? (totalKg / filtered.length).toFixed(1) : '0'}
            </div>
            <div className="text-xs text-gray-400 mt-1">{t('harvest.avg_per_harvest')} (kg)</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-black text-gold">
              {hives.length > 0 ? (totalKg / hives.length).toFixed(1) : '0'}
            </div>
            <div className="text-xs text-gray-400 mt-1">{t('harvest_page.per_hive_kg')}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Aylık grafik */}
          <div className="card lg:col-span-2">
            <h2 className="font-black text-base mb-4">{t('harvest_page.last6_months_title')}</h2>
            {monthlyData.every(d => d.kg === 0) ? (
              <div className="flex flex-col items-center justify-center h-36 text-gray-500 text-sm">
                <span className="text-3xl mb-2">📈</span>
                {t('harvest_page.chart_will_appear')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={monthlyData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                  <XAxis dataKey="label" tick={{ fill:'#888', fontSize:11 }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fill:'#888', fontSize:11 }} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{ background:'#2e2e2e', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'#fff' }}
                    formatter={v => [`${v} kg`, t('reports.label_harvest_short')]}/>
                  <Bar dataKey="kg" fill="#f5c518" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Bal türü dağılımı */}
          <div className="card">
            <h2 className="font-black text-base mb-4">{t('reports.chart_honey_type_title')}</h2>
            {byType.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-36 text-gray-500 text-sm">
                <span className="text-2xl mb-2">🍯</span>
                {t('common.no_records')}
              </div>
            ) : (
              <div className="space-y-2.5">
                {byType.sort((a,b) => b.kg - a.kg).map(({ type, kg }) => (
                  <div key={type}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300">{t(HONEY_TYPE_KEYS[type + ' Balı'] || HONEY_TYPE_KEYS[type] || 'reports.honey_type_other')}</span>
                      <span className="font-bold text-gold">{kg.toFixed(1)} kg</span>
                    </div>
                    <div className="h-2 bg-dark-50 rounded-full overflow-hidden">
                      <div className="h-full bg-gold rounded-full transition-all"
                        style={{ width: `${Math.min(100, (kg / totalKg) * 100)}%` }}/>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Filtreler + liste */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-base">{t('harvest_page.harvest_list_title')}</h2>
            <div className="flex gap-1.5">
              {[['all',t('common.all')],['month',t('common.this_month')],['year',t('harvest_page.this_year')]].map(([val,label]) => (
                <button key={val} onClick={() => setFilter(val)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    filter === val ? 'bg-gold text-yellow-950' : 'bg-dark-50 text-gray-400 hover:text-white'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <span className="text-4xl mb-3">🍯</span>
              <p className="text-sm">{t('harvest.empty_title')}</p>
              <button className="btn-gold mt-4" onClick={() => setShowForm(true)}>{t('harvest_page.add_first_harvest')}</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {[t('common.date'),t('reports.col_hive'),t('harvest.honey_type'),t('common.amount'),'Brix',t('harvest_page.note_col'),''].map(h => (
                      <th key={h} className="text-left py-2.5 px-3 text-xs text-gray-400 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(h => (
                    <tr key={h.id}
                      className="hover:bg-white/3 transition-colors"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="py-3 px-3 text-gray-300">
                        {new Date(h.harvest_date).toLocaleDateString('tr-TR', { day:'2-digit', month:'short', year:'numeric' })}
                      </td>
                      <td className="py-3 px-3">
                        {h.hives?.hive_no
                          ? <span className="px-2 py-0.5 rounded text-xs font-bold text-gold"
                              style={{ background:'rgba(245,197,24,0.12)' }}>{h.hives.hive_no}</span>
                          : <span className="text-gray-500 text-xs">{t('harvest_page.general_label')}</span>}
                      </td>
                      <td className="py-3 px-3 text-gray-300">{h.honey_type ? t(HONEY_TYPE_KEYS[h.honey_type] || 'reports.honey_type_other') : '-'}</td>
                      <td className="py-3 px-3 font-black text-gold">{h.amount_kg} kg</td>
                      <td className="py-3 px-3 text-gray-400">{h.brix_value ? `%${h.brix_value}` : '-'}</td>
                      <td className="py-3 px-3 text-gray-500 text-xs max-w-[150px] truncate">{h.notes || '-'}</td>
                      <td className="py-3 px-3">
                        <button onClick={() => deleteHarvest(h.id)}
                          className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-500/10 transition-colors">
                          {t('common.delete')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
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

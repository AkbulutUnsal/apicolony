import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/layout/Navbar'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

const DISEASE_TYPES = [
  'Varroa', 'Nosema', 'Amerikan Yavru Çürüklüğü', 'Avrupa Yavru Çürüklüğü',
  'Kireç Hastalığı', 'Taş Yavru', 'Güve', 'Küçük Kovan Böceği',
  'Arı Biti (Braula)', 'Genel Zayıflama', 'Bilinmeyen Belirti', 'Diğer'
]
const DISEASE_TYPE_KEYS = {
  'Varroa': 'treatment_page.disease_varroa', 'Nosema': 'treatment_page.disease_nosema',
  'Amerikan Yavru Çürüklüğü': 'treatment_page.disease_afb', 'Avrupa Yavru Çürüklüğü': 'treatment_page.disease_efb',
  'Kireç Hastalığı': 'treatment_page.disease_chalkbrood', 'Taş Yavru': 'treatment_page.disease_stonebrood',
  'Güve': 'treatment_page.disease_wax_moth', 'Küçük Kovan Böceği': 'treatment_page.disease_shb',
  'Arı Biti (Braula)': 'treatment_page.disease_bee_louse', 'Genel Zayıflama': 'treatment_page.disease_weakness',
  'Bilinmeyen Belirti': 'treatment_page.disease_unknown', 'Diğer': 'reports.honey_type_other',
}
const METHOD_KEYS = {
  'Damlama': 'treatment_page.method_drip', 'Buharlaştırma': 'treatment_page.method_vapor',
  'Şerit / Fitil': 'treatment_page.method_strip', 'Toz': 'treatment_page.method_powder',
  'Sprey': 'treatment_page.method_spray', 'Diğer': 'reports.honey_type_other',
}
const SEVERITY_LEVELS = ['Hafif', 'Orta', 'Ağır']
const APPLICATION_METHODS = ['Damlama', 'Buharlaştırma', 'Şerit / Fitil', 'Toz', 'Sprey', 'Diğer']

const EMPTY_FORM = {
  treatment_date: new Date().toISOString().slice(0, 10),
  apiary_id: '',
  hive_ids: [],
  disease_type: 'Varroa',
  severity: 'Orta',
  product_name: '',
  dose: '',
  application_method: 'Damlama',
  withdrawal_days: '',
  repeat_date: '',
  applied_by: '',
  notes: ''
}

export default function TreatmentPage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [records, setRecords] = useState([])
  const [apiaries, setApiaries] = useState([])
  const [hives, setHives] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filterApiary, setFilterApiary] = useState('all')
  const [filterDisease, setFilterDisease] = useState('all')

  useEffect(() => { if (user) fetchAll() }, [user])

  async function fetchAll() {
    setLoading(true)
    const [trRes, apRes, hivRes] = await Promise.all([
      supabase.from('treatment_records')
        .select('*, apiaries(name), hives(hive_no)')
        .eq('user_id', user.id)
        .order('treatment_date', { ascending: false })
        .limit(200),
      supabase.from('apiaries').select('id, name').eq('user_id', user.id).order('name'),
      supabase.from('hives').select('id, hive_no, apiary_id')
        .eq('user_id', user.id).eq('status', 'aktif').order('hive_no')
    ])
    setRecords(trRes.data || [])
    setApiaries(apRes.data || [])
    setHives(hivRes.data || [])
    setLoading(false)
  }

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function toggleHive(hiveId) {
    setForm(p => ({
      ...p,
      hive_ids: p.hive_ids.includes(hiveId)
        ? p.hive_ids.filter(id => id !== hiveId)
        : [...p.hive_ids, hiveId]
    }))
  }

  function selectApiary(id) {
    setForm(p => ({ ...p, apiary_id: id, hive_ids: [] }))
  }

  async function save() {
    if (!form.disease_type) { toast.error(t('treatment.error_type')); return }
    setSaving(true)

    const targetHiveIds = form.hive_ids.length > 0
      ? form.hive_ids
      : form.apiary_id
        ? hives.filter(h => h.apiary_id === form.apiary_id).map(h => h.id)
        : [null]

    const rows = targetHiveIds.map(hiveId => ({
      user_id: user.id,
      hive_id: hiveId,
      apiary_id: form.apiary_id || null,
      treatment_date: form.treatment_date,
      disease_type: form.disease_type,
      severity: form.severity || null,
      product_name: form.product_name.trim() || null,
      dose: form.dose.trim() || null,
      application_method: form.application_method || null,
      withdrawal_days: form.withdrawal_days ? parseInt(form.withdrawal_days) : null,
      repeat_date: form.repeat_date || null,
      applied_by: form.applied_by.trim() || null,
      notes: form.notes.trim() || null
    }))

    const { error } = await supabase.from('treatment_records').insert(rows)
    if (error) toast.error(t('common.error_save') + ': ' + error.message)
    else {
      toast.success(t('treatment.saved_multi', { count: rows.length }))
      setShowForm(false)
      setForm(EMPTY_FORM)
      fetchAll()
    }
    setSaving(false)
  }

  // Yaklaşan tekrar tedaviler (7 gün içinde)
  const today = new Date()
  const upcoming = records.filter(r => {
    if (!r.repeat_date) return false
    const diff = (new Date(r.repeat_date) - today) / 86400000
    return diff >= 0 && diff <= 7
  })

  const filteredRecords = records.filter(r => {
    if (filterApiary !== 'all' && r.apiary_id !== filterApiary) return false
    if (filterDisease !== 'all' && r.disease_type !== filterDisease) return false
    return true
  })

  const filteredHives = form.apiary_id
    ? hives.filter(h => h.apiary_id === form.apiary_id)
    : hives

  const diseaseTypes = [...new Set(records.map(r => r.disease_type).filter(Boolean))]

  return (
    <div className="min-h-screen bg-dark-400 flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full">

        {/* Başlık */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-black">{t('treatment.title')}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{records.length} {t('treatment_page.total_records')}</p>
          </div>
          <button className="btn-gold" onClick={() => { setForm(EMPTY_FORM); setShowForm(true) }}>
            {t('treatment.new_btn')}
          </button>
        </div>

        {/* Yaklaşan tekrar uyarısı */}
        {upcoming.length > 0 && (
          <div className="mb-5 rounded-xl p-4 flex gap-3 items-start"
            style={{ background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)' }}>
            <span className="text-xl flex-shrink-0">⚠️</span>
            <div>
              <div className="font-bold text-sm text-red-400">{t('treatment.upcoming_title')}</div>
              <div className="text-xs text-gray-300 mt-1">
                {upcoming.map(r => {
                  const hiveNo = r.hives?.hive_no || (r.hive_id ? '?' : t('treatment_page.bulk_label'))
                  const days = Math.ceil((new Date(r.repeat_date) - today) / 86400000)
                  return (
                    <div key={r.id}>
                      {hiveNo} — {t(DISEASE_TYPE_KEYS[r.disease_type] || 'reports.honey_type_other')} ({r.product_name || t('treatment_page.product_unspecified')}) · {days === 0 ? t('treatment_page.today_exclaim') : `${days} ${t('treatment_page.days_later')}`}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Özet */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard label={t('reports.kpi_total_treatment')} value={records.length} icon="💊" />
          <StatCard label={t('treatment_page.upcoming_repeat')} value={upcoming.length} icon="🔔" alert={upcoming.length > 0} />
          <StatCard label={t('treatment.diff_diseases')} value={diseaseTypes.length} icon="🔬" />
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto">
            <div className="bg-dark-200 rounded-2xl w-full max-w-lg my-8"
              style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
              <div className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <h2 className="font-black text-base">{t('treatment.add_title')}</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
              </div>

              <div className="p-6 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">{t('hive_tabs.treatment_date')}</label>
                    <input type="date" value={form.treatment_date} onChange={e => set('treatment_date', e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label">{t('treatment.disease_type')}</label>
                    <select value={form.disease_type} onChange={e => set('disease_type', e.target.value)}>
                      {DISEASE_TYPES.map(d => <option key={d} value={d}>{t(DISEASE_TYPE_KEYS[d])}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">{t('treatment.severity')}</label>
                    <select value={form.severity} onChange={e => set('severity', e.target.value)}>
                      {SEVERITY_LEVELS.map(s => <option key={s} value={s}>{severityOptLabel(s, t)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">{t('treatment.product')}</label>
                    <input value={form.product_name} onChange={e => set('product_name', e.target.value)}
                      placeholder={t('treatment_page.product_placeholder')} />
                  </div>
                  <div>
                    <label className="field-label">{t('treatment.dose')}</label>
                    <input value={form.dose} onChange={e => set('dose', e.target.value)}
                      placeholder={t('treatment_page.dose_placeholder')} />
                  </div>
                  <div>
                    <label className="field-label">{t('treatment.method')}</label>
                    <select value={form.application_method} onChange={e => set('application_method', e.target.value)}>
                      {APPLICATION_METHODS.map(m => <option key={m} value={m}>{t(METHOD_KEYS[m])}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">{t('treatment.withdrawal')}</label>
                    <input type="number" min="0" value={form.withdrawal_days}
                      onChange={e => set('withdrawal_days', e.target.value)}
                      placeholder={t('treatment.withdrawal_placeholder')} />
                  </div>
                  <div>
                    <label className="field-label">{t('treatment.repeat_date')}</label>
                    <input type="date" value={form.repeat_date} onChange={e => set('repeat_date', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className="field-label">{t('treatment.applied_by')}</label>
                    <input value={form.applied_by} onChange={e => set('applied_by', e.target.value)}
                      placeholder={t('treatment_page.full_name_placeholder')} />
                  </div>
                </div>

                {/* Arılık seçimi */}
                {apiaries.length > 0 && (
                  <div>
                    <label className="field-label">{t('treatment_page.apiary_optional')}</label>
                    <select value={form.apiary_id} onChange={e => selectApiary(e.target.value)}>
                      <option value="">{t('treatment_page.no_apiary_selected')}</option>
                      {apiaries.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                )}

                {/* Kovan seçimi */}
                {filteredHives.length > 0 && (
                  <div>
                    <label className="field-label">
                      {t('treatment_page.hives_label')} — {form.apiary_id ? t('treatment_page.if_not_selected_apiary') : t('treatment_page.if_not_selected_general')}
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto p-2 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {filteredHives.map(h => (
                        <button key={h.id} type="button" onClick={() => toggleHive(h.id)}
                          className="text-xs font-bold py-1.5 rounded-lg transition-colors"
                          style={{
                            background: form.hive_ids.includes(h.id) ? 'rgba(231,76,60,0.25)' : 'rgba(255,255,255,0.06)',
                            border: form.hive_ids.includes(h.id) ? '1px solid rgba(231,76,60,0.5)' : '1px solid rgba(255,255,255,0.1)',
                            color: form.hive_ids.includes(h.id) ? '#e74c3c' : '#aaa'
                          }}>
                          {h.hive_no}
                        </button>
                      ))}
                    </div>
                    {form.hive_ids.length > 0 && (
                      <p className="text-xs text-red-400 mt-1">{t('feeding.hives_selected', { count: form.hive_ids.length })}</p>
                    )}
                  </div>
                )}

                {/* Bekleme süresi uyarısı */}
                {form.withdrawal_days > 0 && (
                  <div className="rounded-lg p-3 text-xs"
                    style={{ background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.2)', color: '#e74c3c' }}>
                    ⚠️ {t('treatment_page.withdrawal_warning_prefix')} <strong>{form.withdrawal_days} {t('treatment_page.days_unit')}</strong> {t('treatment_page.withdrawal_warning_suffix')}
                    {form.treatment_date && (
                      <span> {t('treatment_page.last_harvest_date')}: <strong>
                        {new Date(new Date(form.treatment_date).getTime() + form.withdrawal_days * 86400000)
                          .toLocaleDateString('tr-TR')}
                      </strong></span>
                    )}
                  </div>
                )}

                <div>
                  <label className="field-label">{t('common.notes')}</label>
                  <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
                    placeholder={t('treatment_page.extra_notes')} className="resize-none" />
                </div>

                <div className="flex gap-2 pt-1">
                  <button className="btn-gold" onClick={save} disabled={saving}>
                    {saving ? t('common.saving') : t('common.save')}
                  </button>
                  <button className="btn-ghost" onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtreler */}
        <div className="flex flex-wrap gap-2 mb-4">
          {apiaries.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              <FilterChip label={t('treatment_page.all_apiaries')} active={filterApiary === 'all'} onClick={() => setFilterApiary('all')} />
              {apiaries.map(a => (
                <FilterChip key={a.id} label={a.name} active={filterApiary === a.id} onClick={() => setFilterApiary(a.id)} />
              ))}
            </div>
          )}
          {diseaseTypes.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              <FilterChip label={t('treatment.all_diseases')} active={filterDisease === 'all'} onClick={() => setFilterDisease('all')} variant="red" />
              {diseaseTypes.map(d => (
                <FilterChip key={d} label={t(DISEASE_TYPE_KEYS[d] || 'reports.honey_type_other')} active={filterDisease === d} onClick={() => setFilterDisease(d)} variant="red" />
              ))}
            </div>
          )}
        </div>

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="card flex flex-col items-center py-14 text-center">
            <div className="text-4xl mb-3">💊</div>
            <p className="font-bold mb-1">{t('treatment.empty_title')}</p>
            <p className="text-sm text-gray-400 mb-5">{t('treatment.empty_subtitle')}</p>
            <button className="btn-gold" onClick={() => { setForm(EMPTY_FORM); setShowForm(true) }}>
              {t('treatment.empty_btn')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredRecords.map(rec => (
              <TreatmentRow key={rec.id} record={rec} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function severityOptLabel(s, t) {
  if (s === 'Ağır') return t('reports.severity_severe')
  if (s === 'Orta') return t('reports.severity_moderate')
  if (s === 'Hafif') return t('reports.severity_mild')
  return s
}

function TreatmentRow({ record }) {
  const { t } = useTranslation()
  const severityColor = { Hafif: '#27ae60', Orta: '#e67e22', Ağır: '#e74c3c' }
  const color = severityColor[record.severity] || '#888'
  const date = record.treatment_date
    ? new Date(record.treatment_date + 'T00:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  const isRepeatSoon = record.repeat_date && (() => {
    const diff = (new Date(record.repeat_date) - new Date()) / 86400000
    return diff >= 0 && diff <= 7
  })()

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{
        background: isRepeatSoon ? 'rgba(231,76,60,0.06)' : 'rgba(255,255,255,0.03)',
        border: isRepeatSoon ? '1px solid rgba(231,76,60,0.25)' : '1px solid rgba(255,255,255,0.06)'
      }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: `${color}15` }}>
        💊
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm">{t(DISEASE_TYPE_KEYS[record.disease_type] || 'reports.honey_type_other')}</span>
          {record.severity && (
            <span className="text-xs px-1.5 py-0.5 rounded-md font-semibold"
              style={{ background: `${color}20`, color }}>
              {severityOptLabel(record.severity, t)}
            </span>
          )}
          {record.hives?.hive_no && (
            <span className="text-xs px-1.5 py-0.5 rounded-md font-semibold"
              style={{ background: 'rgba(245,197,24,0.15)', color: '#f5c518' }}>
              {record.hives.hive_no}
            </span>
          )}
          {isRepeatSoon && <span className="text-xs text-red-400 font-bold">{t('treatment_page.repeat_soon')}</span>}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          {date}
          {record.product_name && ` · ${record.product_name}`}
          {record.dose && ` · ${record.dose}`}
          {record.repeat_date && ` · ${t('treatment_page.repeat_colon')} ${new Date(record.repeat_date + 'T00:00:00').toLocaleDateString('tr-TR')}`}
        </div>
      </div>
      {record.withdrawal_days > 0 && (
        <div className="text-right flex-shrink-0">
          <div className="text-xs font-bold text-red-400">{record.withdrawal_days}{t('treatment_page.days_unit_short')} {t('treatment_page.waiting')}</div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, alert }) {
  return (
    <div className="card py-3 px-4 text-center" style={alert ? { borderColor: 'rgba(231,76,60,0.4)' } : {}}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`font-black text-lg ${alert && value > 0 ? 'text-red-400' : ''}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  )
}

function FilterChip({ label, active, onClick, variant = 'gold' }) {
  const activeStyle = variant === 'red'
    ? { background: 'rgba(231,76,60,0.2)', color: '#e74c3c', border: '1px solid rgba(231,76,60,0.4)' }
    : { background: 'rgba(245,197,24,0.2)', color: '#f5c518', border: '1px solid rgba(245,197,24,0.4)' }
  return (
    <button onClick={onClick}
      className="whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex-shrink-0"
      style={active ? activeStyle : { background: 'rgba(255,255,255,0.06)', color: '#aaa', border: '1px solid rgba(255,255,255,0.1)' }}>
      {label}
    </button>
  )
}

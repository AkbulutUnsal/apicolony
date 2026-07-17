import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'
import { DISEASE_TYPES, DISEASE_TYPE_KEYS, METHOD_KEYS, SEVERITY_LEVELS, APPLICATION_METHODS, severityOptLabel, diseaseTypeLabel } from '../../pages/TreatmentPage'
import { FEED_TYPES, FEED_TYPE_KEYS, UNITS, feedTypeLabel } from '../../pages/FeedingPage'

// ── ANA ARI ─────────────────────────────────────────────
export function TabAnaAri({ hiveId }) {
  const { t } = useTranslation()
  const [queen, setQueen] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('queens').select('*').eq('hive_id', hiveId).eq('is_current', true).single()
      .then(({ data }) => { setQueen(data || {}); setLoading(false) })
  }, [hiveId])

  const set = (f, v) => setQueen(prev => ({ ...prev, [f]: v }))

  async function save() {
    if (queen.id) {
      await supabase.from('queens').update(queen).eq('id', queen.id)
    } else {
      await supabase.from('queens').insert({ ...queen, hive_id: hiveId, is_current: true })
    }
    toast.success(t('hive_tabs.queen_saved'))
  }

  if (loading) return <Loader />

  return (
    <div className="p-6">
      <div className="card">
        <h2 className="text-lg font-black mb-1">{t('hive_tabs.queen_title')}</h2>
        <p className="text-sm text-gray-400 mb-6">{t('hive_tabs.queen_desc')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="field-label">{t('hive_tabs.birth_date')}</label>
            <input type="date" value={queen.birth_date || ''} onChange={e => set('birth_date', e.target.value)} />
          </div>
          <div>
            <label className="field-label">{t('hive_tabs.breed')}</label>
            <select value={queen.breed || 'Anadolu'} onChange={e => set('breed', e.target.value)}>
              <option>Anadolu</option><option>Kafkas</option><option>Karniyol</option>
              <option>İtalyan</option><option>Buckfast</option>
            </select>
          </div>
          <div>
            <label className="field-label">{t('hive_tabs.insemination_type')}</label>
            <select value={queen.insemination_type || 'Doğal'} onChange={e => set('insemination_type', e.target.value)}>
              <option>Doğal</option><option>Suni Tohumlama</option>
            </select>
          </div>
          <div>
            <label className="field-label">{t('hive_tabs.color_mark')}</label>
            <input value={queen.color_mark || ''} onChange={e => set('color_mark', e.target.value)} placeholder={t('hive_tabs.unmarked')} />
          </div>
          <div>
            <label className="field-label">{t('hive_tabs.performance')}</label>
            <input value={queen.performance || ''} onChange={e => set('performance', e.target.value)} placeholder={t('reports.unknown')} />
          </div>
          <div>
            <label className="field-label">{t('hive_tabs.replacement_date')}</label>
            <input type="date" value={queen.replacement_date || ''} onChange={e => set('replacement_date', e.target.value)} />
          </div>
        </div>
        <button className="btn-gold mt-6" onClick={save}>💾 {t('hive_tabs.save_queen_btn')}</button>
      </div>
    </div>
  )
}

// ── BALLIKLAR ─────────────────────────────────────────────
export function TabBallik({ hiveId }) {
  const { t } = useTranslation()
  const [supers, setSupers] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newSuper, setNewSuper] = useState({ super_type: 'Standart', frame_count: 8, added_date: new Date().toISOString().slice(0,10) })

  useEffect(() => {
    supabase.from('supers').select('*').eq('hive_id', hiveId).order('added_date', { ascending: false })
      .then(({ data }) => { setSupers(data || []); setLoading(false) })
  }, [hiveId])

  async function addSuper() {
    const { data, error } = await supabase.from('supers').insert({ ...newSuper, hive_id: hiveId }).select().single()
    if (error) { toast.error(t('hive_tabs.error_add_failed')); return }
    setSupers(prev => [data, ...prev])
    setAdding(false)
    toast.success(t('hive_tabs.super_added'))
  }

  async function deleteSuper(superId) {
    if (!confirm(t('hive_tabs.confirm_delete_super'))) return
    await supabase.from('supers').delete().eq('id', superId)
    setSupers(prev => prev.filter(s => s.id !== superId))
    toast.success(t('hive_tabs.super_deleted'))
  }

  const totalFrames = supers.reduce((s, x) => s + (x.frame_count || 0), 0)
  const karakovan = supers.filter(s => s.super_type === 'Karakovan').length
  const standart = supers.filter(s => s.super_type === 'Standart').length

  if (loading) return <Loader />

  return (
    <div className="p-6">
      <div className="card">
        <h2 className="text-lg font-black mb-1">{t('hive_tabs.super_title')}</h2>
        <p className="text-sm text-gray-400 mb-2">{t('hive_tabs.super_desc')}</p>
        <p className="text-sm text-gray-400 mb-5">
          {t('hive_tabs.super_available')}: <span className="text-gold font-bold">{supers.length} {t('hive_tabs.super_unit')}</span>,{' '}
          <span className="text-gold font-bold">{karakovan} {t('hive_tabs.super_type_karakovan')}</span>,{' '}
          <span className="text-gold font-bold">{totalFrames} {t('hive_tabs.super_type_standard_frame')}</span>.
        </p>

        {supers.map(sup => (
          <div key={sup.id} className="flex items-center justify-between bg-dark-100 border border-white/8 rounded-xl px-4 py-3.5 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-dark-50 rounded-lg flex items-center justify-center text-sm">🍯</div>
              <div>
                <div className="font-bold text-sm">{t('hive_tabs.super_unit')} – {karakovan > 0 ? karakovan + ' ' + t('hive_tabs.super_type_karakovan') : '0 ' + t('hive_tabs.super_type_karakovan')}, {sup.frame_count} {t('hive_tabs.super_type_standard')}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t('hive_tabs.added_date')}: {new Date(sup.added_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
            </div>
            <div className="flex gap-1.5">
              <button className="w-8 h-8 bg-dark-50 border border-white/10 rounded-lg text-xs">✏️</button>
              <button className="w-8 h-8 bg-dark-50 border border-white/10 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors" onClick={() => deleteSuper(sup.id)}>🗑</button>
            </div>
          </div>
        ))}

        {adding ? (
          <div className="bg-dark-100 border border-white/8 rounded-xl p-4 mb-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="field-label">{t('hive_tabs.super_type_label')}</label>
                <select value={newSuper.super_type} onChange={e => setNewSuper(p => ({ ...p, super_type: e.target.value }))}>
                  <option>Standart</option><option>Karakovan</option>
                </select>
              </div>
              <div>
                <label className="field-label">{t('hive_tabs.frame_count')}</label>
                <input type="number" onFocus={e => e.target.select()} value={newSuper.frame_count} onChange={e => setNewSuper(p => ({ ...p, frame_count: parseInt(e.target.value) }))} />
              </div>
              <div>
                <label className="field-label">{t('hive_tabs.added_date')}</label>
                <input type="date" value={newSuper.added_date} onChange={e => setNewSuper(p => ({ ...p, added_date: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-gold" onClick={addSuper}>{t('common.save')}</button>
              <button className="btn-ghost" onClick={() => setAdding(false)}>{t('common.cancel')}</button>
            </div>
          </div>
        ) : (
          <button className="btn-gold mt-1" onClick={() => setAdding(true)}>+ {t('hive_tabs.new_super_btn')}</button>
        )}
      </div>
    </div>
  )
}

// ── HASTALIK / TEDAVİ (treatment_records ile birleşik) ─────────────────────
// Not: Üstteki genel "Tedavi" menüsüyle AYNI tabloyu kullanır (treatment_records).
// Buradan eklenen kayıt Tedavi sayfasında da görünür, tersi de geçerlidir.
const EMPTY_TREATMENT = {
  treatment_date: new Date().toISOString().slice(0, 10),
  disease_type: 'Varroa', severity: 'Orta', product_name: '', dose: '',
  application_method: 'Damlama', withdrawal_days: '', repeat_date: '', notes: ''
}

export function TabHastalik({ hiveId }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null) // null = kapalı, 'new' = yeni ekleme, id = düzenleme
  const [form, setForm] = useState(EMPTY_TREATMENT)

  useEffect(() => { fetchRecords() }, [hiveId])

  async function fetchRecords() {
    const { data } = await supabase.from('treatment_records').select('*').eq('hive_id', hiveId).order('treatment_date', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }

  function startAdd() {
    setForm(EMPTY_TREATMENT)
    setEditingId('new')
  }

  function startEdit(rec) {
    setForm({
      treatment_date: rec.treatment_date || '',
      disease_type: rec.disease_type || 'Varroa',
      severity: rec.severity || 'Orta',
      product_name: rec.product_name || '',
      dose: rec.dose || '',
      application_method: rec.application_method || 'Damlama',
      withdrawal_days: rec.withdrawal_days ?? '',
      repeat_date: rec.repeat_date || '',
      notes: rec.notes || ''
    })
    setEditingId(rec.id)
  }

  async function saveRecord() {
    const payload = {
      hive_id: hiveId,
      user_id: user.id,
      treatment_date: form.treatment_date,
      disease_type: form.disease_type,
      severity: form.severity || null,
      product_name: form.product_name.trim() || null,
      dose: form.dose.trim() || null,
      application_method: form.application_method || null,
      withdrawal_days: form.withdrawal_days ? parseInt(form.withdrawal_days) : null,
      repeat_date: form.repeat_date || null,
      notes: form.notes.trim() || null
    }
    if (editingId === 'new') {
      const { error } = await supabase.from('treatment_records').insert(payload)
      if (error) { toast.error(t('hive_tabs.error_add_failed')); return }
      toast.success(t('hive_tabs.disease_record_added'))
    } else {
      const { error } = await supabase.from('treatment_records').update(payload).eq('id', editingId)
      if (error) { toast.error(t('common.error_save')); return }
      toast.success(t('common.saved'))
    }
    setEditingId(null)
    fetchRecords()
  }

  async function deleteRecord(id) {
    if (!confirm(t('hive_tabs.confirm_delete_treatment'))) return
    await supabase.from('treatment_records').delete().eq('id', id)
    setRecords(prev => prev.filter(r => r.id !== id))
    toast.success(t('common.deleted'))
  }

  if (loading) return <Loader />

  return (
    <div className="p-6">
      <div className="card">
        <h2 className="text-lg font-black mb-1">{t('hive_tabs.disease_title')}</h2>
        <p className="text-sm text-gray-400 mb-1">{t('hive_tabs.disease_desc')}</p>
        <p className="text-xs text-gray-500 mb-5">💊 {t('hive_tabs.disease_unified_note')}</p>

        {records.length === 0 && editingId === null && (
          <p className="text-center text-gray-500 py-8 text-sm">{t('hive_tabs.no_records_yet')}</p>
        )}

        {records.map(rec => (
          editingId === rec.id ? (
            <TreatmentForm key={rec.id} form={form} setForm={setForm} onSave={saveRecord} onCancel={() => setEditingId(null)} t={t} />
          ) : (
            <div key={rec.id} className="bg-dark-100 border border-white/8 rounded-xl px-4 py-3.5 mb-3">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <span className="font-bold text-sm text-red-400">{diseaseTypeLabel(rec.disease_type, t)}</span>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(rec.treatment_date).toLocaleDateString('tr-TR')} · {t('reports.col_severity')}: {severityOptLabel(rec.severity, t)}
                    {rec.product_name && ` · ${rec.product_name}`}
                    {rec.repeat_date && ` · ${t('treatment_page.repeat_colon')} ${new Date(rec.repeat_date).toLocaleDateString('tr-TR')}`}
                  </div>
                  {rec.notes && <p className="text-xs text-gray-500 mt-1">{rec.notes}</p>}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button className="w-7 h-7 bg-dark-50 border border-white/10 rounded-lg text-xs" onClick={() => startEdit(rec)}>✏️</button>
                  <button className="w-7 h-7 bg-dark-50 border border-white/10 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors" onClick={() => deleteRecord(rec.id)}>🗑</button>
                </div>
              </div>
            </div>
          )
        ))}

        {editingId === 'new' ? (
          <TreatmentForm form={form} setForm={setForm} onSave={saveRecord} onCancel={() => setEditingId(null)} t={t} />
        ) : (
          <button className="btn-gold mt-1" onClick={startAdd}>+ {t('hive_tabs.new_record_btn')}</button>
        )}
      </div>
    </div>
  )
}

function TreatmentForm({ form, setForm, onSave, onCancel, t }) {
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))
  return (
    <div className="bg-dark-100 border border-white/8 rounded-xl p-4 mb-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="field-label">{t('hive_tabs.treatment_date')}</label>
          <input type="date" value={form.treatment_date} onChange={e => set('treatment_date', e.target.value)} />
        </div>
        <div>
          <label className="field-label">{t('reports.col_disease')}</label>
          <select value={form.disease_type} onChange={e => set('disease_type', e.target.value)}>
            {DISEASE_TYPES.map(d => <option key={d} value={d}>{t(DISEASE_TYPE_KEYS[d])}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">{t('reports.col_severity')}</label>
          <select value={form.severity} onChange={e => set('severity', e.target.value)}>
            {SEVERITY_LEVELS.map(s => <option key={s} value={s}>{severityOptLabel(s, t)}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">{t('reports.col_product')}</label>
          <input value={form.product_name} onChange={e => set('product_name', e.target.value)} placeholder={t('treatment_page.product_placeholder')} />
        </div>
        <div>
          <label className="field-label">{t('hive_tabs.dose_label')}</label>
          <input value={form.dose} onChange={e => set('dose', e.target.value)} placeholder={t('treatment_page.dose_placeholder')} />
        </div>
        <div>
          <label className="field-label">{t('hive_tabs.application_method')}</label>
          <select value={form.application_method} onChange={e => set('application_method', e.target.value)}>
            {APPLICATION_METHODS.map(m => <option key={m} value={m}>{t(METHOD_KEYS[m])}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">{t('treatment.withdrawal')}</label>
          <input type="number" onFocus={e => e.target.select()} value={form.withdrawal_days} onChange={e => set('withdrawal_days', e.target.value)} placeholder={t('treatment.withdrawal_placeholder')} />
        </div>
        <div>
          <label className="field-label">{t('hive_tabs.repeat_date')}</label>
          <input type="date" value={form.repeat_date} onChange={e => set('repeat_date', e.target.value)} />
        </div>
      </div>
      <div className="mb-3">
        <label className="field-label">{t('common.notes')}</label>
        <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} className="resize-none" placeholder={t('treatment_page.extra_notes')} />
      </div>
      <div className="flex gap-2">
        <button className="btn-gold" onClick={onSave}>{t('common.save')}</button>
        <button className="btn-ghost" onClick={onCancel}>{t('common.cancel')}</button>
      </div>
    </div>
  )
}

// ── BAKIM ─────────────────────────────────────────────
const EMPTY_MAINTENANCE = { inspection_date: new Date().toISOString().slice(0,10), colony_strength: 'Orta', honey_frames: 0, brood_frames: 0, notes: '' }
const EMPTY_FEEDING = { feed_date: new Date().toISOString().slice(0,10), feed_type: 'Şeker Şurubu', amount: '', unit: 'kg', cost: '', notes: '' }

export function TabBakim({ hiveId }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSeason, setActiveSeason] = useState(null)
  const [editingId, setEditingId] = useState(null) // null = kapalı, 'new' = yeni ekleme, id = düzenleme
  const [form, setForm] = useState(EMPTY_MAINTENANCE)

  // Besleme (feeding_records ile birleşik — üstteki "Besleme" menüsüyle aynı tablo)
  const [feedings, setFeedings] = useState([])
  const [editingFeedId, setEditingFeedId] = useState(null)
  const [feedForm, setFeedForm] = useState(EMPTY_FEEDING)

  const SEASONS = ['İlkbahar', 'Yaz', 'Sonbahar', 'Kışlatma']
  const seasonLabel = (s) => ({
    'İlkbahar': t('hive_tabs.season_spring'),
    'Yaz': t('hive_tabs.season_summer'),
    'Sonbahar': t('hive_tabs.season_autumn'),
    'Kışlatma': t('hive_tabs.season_wintering'),
  }[s] || s)

  useEffect(() => { fetchRecords(); fetchFeedings() }, [hiveId])

  async function fetchRecords() {
    const { data } = await supabase.from('maintenance_records').select('*').eq('hive_id', hiveId).order('inspection_date', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }

  async function fetchFeedings() {
    const { data } = await supabase.from('feeding_records').select('*').eq('hive_id', hiveId).order('feed_date', { ascending: false })
    setFeedings(data || [])
  }

  function startAdd(season) {
    setForm(EMPTY_MAINTENANCE)
    setEditingId('new:' + season)
  }

  function startEdit(rec) {
    setForm({
      inspection_date: rec.inspection_date || '',
      colony_strength: rec.colony_strength || 'Orta',
      honey_frames: rec.honey_frames || 0,
      brood_frames: rec.brood_frames || 0,
      notes: rec.notes || ''
    })
    setEditingId(rec.id)
  }

  async function saveRecord(season) {
    if (editingId?.toString().startsWith('new:')) {
      const { error } = await supabase.from('maintenance_records').insert({ ...form, hive_id: hiveId, season })
      if (error) { toast.error(t('hive_tabs.error_add_failed')); return }
      toast.success(t('hive_tabs.maintenance_added'))
      // Hives tablosunu güncelle — bakım yapıldı = healthy
      await supabase.from('hives').update({ color_status: 'healthy', updated_at: new Date().toISOString() }).eq('id', hiveId)
    } else {
      const { error } = await supabase.from('maintenance_records').update(form).eq('id', editingId)
      if (error) { toast.error(t('common.error_save')); return }
      toast.success(t('common.saved'))
    }
    setEditingId(null)
    fetchRecords()
  }

  async function deleteRecord(id) {
    if (!confirm(t('hive_tabs.confirm_delete_maintenance'))) return
    await supabase.from('maintenance_records').delete().eq('id', id)
    setRecords(prev => prev.filter(r => r.id !== id))
    toast.success(t('common.deleted'))
  }

  function startFeedAdd() {
    setFeedForm(EMPTY_FEEDING)
    setEditingFeedId('new')
  }

  function startFeedEdit(rec) {
    setFeedForm({
      feed_date: rec.feed_date || '',
      feed_type: rec.feed_type || 'Şeker Şurubu',
      amount: rec.amount ?? '',
      unit: rec.unit || 'kg',
      cost: rec.cost ?? '',
      notes: rec.notes || ''
    })
    setEditingFeedId(rec.id)
  }

  async function saveFeeding() {
    if (!feedForm.amount || parseFloat(feedForm.amount) <= 0) { toast.error(t('feeding.error_amount')); return }
    const payload = {
      hive_id: hiveId,
      user_id: user.id,
      feed_date: feedForm.feed_date,
      feed_type: feedForm.feed_type,
      amount: parseFloat(feedForm.amount),
      unit: feedForm.unit,
      cost: feedForm.cost ? parseFloat(feedForm.cost) : null,
      notes: feedForm.notes.trim() || null
    }
    if (editingFeedId === 'new') {
      const { error } = await supabase.from('feeding_records').insert(payload)
      if (error) { toast.error(t('hive_tabs.error_add_failed')); return }
      toast.success(t('hive_tabs.feeding_added'))
    } else {
      const { error } = await supabase.from('feeding_records').update(payload).eq('id', editingFeedId)
      if (error) { toast.error(t('common.error_save')); return }
      toast.success(t('common.saved'))
    }
    setEditingFeedId(null)
    fetchFeedings()
  }

  async function deleteFeeding(id) {
    if (!confirm(t('hive_tabs.confirm_delete_feeding'))) return
    await supabase.from('feeding_records').delete().eq('id', id)
    setFeedings(prev => prev.filter(f => f.id !== id))
    toast.success(t('common.deleted'))
  }

  if (loading) return <Loader />

  return (
    <div className="p-6">
      <div className="card">
        <h2 className="text-lg font-black mb-1">{t('hive_tabs.maintenance_title')}</h2>
        <p className="text-sm text-gray-400 mb-5">{t('hive_tabs.maintenance_desc')}</p>

        {SEASONS.map(season => {
          const seasonRecords = records.filter(r => r.season === season)
          const isOpen = activeSeason === season
          return (
            <div key={season} className="mb-4 border-b border-white/8 pb-4 last:border-0">
              <div className="flex justify-between items-center cursor-pointer py-2" onClick={() => setActiveSeason(isOpen ? null : season)}>
                <span className="font-bold text-gold">{seasonLabel(season)} {t('hive_tabs.season_maintenance_suffix')}</span>
                <span className="text-gray-400">{isOpen ? '▲' : '▼'}</span>
              </div>
              {isOpen && (
                <div className="mt-2">
                  {seasonRecords.map(rec => (
                    editingId === rec.id ? (
                      <MaintenanceForm key={rec.id} form={form} setForm={setForm} onSave={() => saveRecord(season)} onCancel={() => setEditingId(null)} t={t} />
                    ) : (
                      <div key={rec.id} className="bg-dark-100 border border-white/8 rounded-lg px-3 py-2.5 mb-2">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm">{new Date(rec.inspection_date).toLocaleDateString('tr-TR')}</span>
                              <span className="text-xs text-gray-400">{t('reports.col_colony')}: {rec.colony_strength}</span>
                            </div>
                            {rec.notes && <p className="text-xs text-gray-400 mt-1">{rec.notes}</p>}
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0">
                            <button className="w-7 h-7 bg-dark-50 border border-white/10 rounded-lg text-xs" onClick={() => startEdit(rec)}>✏️</button>
                            <button className="w-7 h-7 bg-dark-50 border border-white/10 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors" onClick={() => deleteRecord(rec.id)}>🗑</button>
                          </div>
                        </div>
                      </div>
                    )
                  ))}
                  {editingId === 'new:' + season ? (
                    <MaintenanceForm form={form} setForm={setForm} onSave={() => saveRecord(season)} onCancel={() => setEditingId(null)} t={t} />
                  ) : (
                    <button className="btn-gold mt-2" onClick={() => startAdd(season)}>+ {seasonLabel(season)} {t('hive_tabs.new_season_record_suffix')}</button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="card mt-4">
        <h2 className="text-lg font-black mb-1">{t('feeding.title')}</h2>
        <p className="text-xs text-gray-500 mb-5">🫙 {t('hive_tabs.feeding_unified_note')}</p>

        {feedings.length === 0 && editingFeedId === null && (
          <p className="text-center text-gray-500 py-6 text-sm">{t('hive_tabs.no_records_yet')}</p>
        )}

        {feedings.map(rec => (
          editingFeedId === rec.id ? (
            <FeedingForm key={rec.id} form={feedForm} setForm={setFeedForm} onSave={saveFeeding} onCancel={() => setEditingFeedId(null)} t={t} />
          ) : (
            <div key={rec.id} className="bg-dark-100 border border-white/8 rounded-xl px-4 py-3.5 mb-3">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <span className="font-bold text-sm">{feedTypeLabel(rec.feed_type, t)}</span>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(rec.feed_date).toLocaleDateString('tr-TR')} · {rec.amount} {rec.unit}
                    {rec.cost ? ` · ${rec.cost} ₺` : ''}
                  </div>
                  {rec.notes && <p className="text-xs text-gray-500 mt-1">{rec.notes}</p>}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button className="w-7 h-7 bg-dark-50 border border-white/10 rounded-lg text-xs" onClick={() => startFeedEdit(rec)}>✏️</button>
                  <button className="w-7 h-7 bg-dark-50 border border-white/10 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors" onClick={() => deleteFeeding(rec.id)}>🗑</button>
                </div>
              </div>
            </div>
          )
        ))}

        {editingFeedId === 'new' ? (
          <FeedingForm form={feedForm} setForm={setFeedForm} onSave={saveFeeding} onCancel={() => setEditingFeedId(null)} t={t} />
        ) : (
          <button className="btn-gold mt-1" onClick={startFeedAdd}>+ {t('hive_tabs.new_feeding_btn')}</button>
        )}
      </div>
    </div>
  )
}

function FeedingForm({ form, setForm, onSave, onCancel, t }) {
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))
  return (
    <div className="bg-dark-100 border border-white/8 rounded-xl p-4 mb-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="field-label">{t('common.date')}</label>
          <input type="date" value={form.feed_date} onChange={e => set('feed_date', e.target.value)} />
        </div>
        <div>
          <label className="field-label">{t('feeding.feed_type')}</label>
          <select value={form.feed_type} onChange={e => set('feed_type', e.target.value)}>
            {FEED_TYPES.map(f => <option key={f} value={f}>{t(FEED_TYPE_KEYS[f])}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">{t('common.amount')}</label>
          <input type="number" onFocus={e => e.target.select()} value={form.amount} onChange={e => set('amount', e.target.value)} />
        </div>
        <div>
          <label className="field-label">{t('feeding.unit')}</label>
          <select value={form.unit} onChange={e => set('unit', e.target.value)}>
            {UNITS.map(u => <option key={u} value={u}>{t('feeding_page.unit_' + u)}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">{t('reports.col_cost')}</label>
          <input type="number" onFocus={e => e.target.select()} value={form.cost} onChange={e => set('cost', e.target.value)} />
        </div>
      </div>
      <div className="mb-3">
        <label className="field-label">{t('common.notes')}</label>
        <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} className="resize-none" />
      </div>
      <div className="flex gap-2">
        <button className="btn-gold" onClick={onSave}>{t('common.save')}</button>
        <button className="btn-ghost" onClick={onCancel}>{t('common.cancel')}</button>
      </div>
    </div>
  )
}

function MaintenanceForm({ form, setForm, onSave, onCancel, t }) {
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))
  return (
    <div className="bg-dark-100 border border-white/8 rounded-xl p-4 mt-2">
      <div className="flex flex-col gap-3 mb-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">{t('hive_tabs.inspection_date')}</label>
            <input type="date" value={form.inspection_date} onChange={e => set('inspection_date', e.target.value)} />
          </div>
          <div>
            <label className="field-label">{t('hive_tabs.colony_strength')}</label>
            <select value={form.colony_strength} onChange={e => set('colony_strength', e.target.value)}>
              <option>Güçlü</option><option>Orta</option><option>Zayıf</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">{t('reports.col_honey_frames')}</label>
            <input type="number" onFocus={e => e.target.select()} value={form.honey_frames} onChange={e => set('honey_frames', parseInt(e.target.value))} />
          </div>
          <div>
            <label className="field-label">{t('hive_tabs.brood_frames')}</label>
            <input type="number" onFocus={e => e.target.select()} value={form.brood_frames} onChange={e => set('brood_frames', parseInt(e.target.value))} />
          </div>
        </div>
        <div>
          <label className="field-label">{t('hive_tabs.notes_label')}</label>
          <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} className="resize-none" />
        </div>
      </div>
      <div className="flex gap-2">
        <button className="btn-gold" onClick={onSave}>{t('common.save')}</button>
        <button className="btn-ghost" onClick={onCancel}>{t('common.cancel')}</button>
      </div>
    </div>
  )
}

function Loader() {
  return <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-gold border-t-transparent rounded-full animate-spin"/></div>
}

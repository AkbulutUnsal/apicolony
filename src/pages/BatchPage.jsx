import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/layout/Navbar'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { QRCodeCanvas } from 'qrcode.react'

const HONEY_TYPES = ['Çiçek Balı', 'Yayla Balı', 'Orman Balı', 'Kestane Balı', 'Akasya Balı', 'Kekik Balı', 'Ihlamur Balı', 'Çam Balı', 'Kafkas Flora Balı', 'Diğer']
const BATCH_HONEY_TYPE_KEYS = {
  'Çiçek Balı': 'harvest_page.honey_flower', 'Yayla Balı': 'batches_page.honey_plateau',
  'Orman Balı': 'harvest_page.honey_forest', 'Kestane Balı': 'harvest_page.honey_chestnut',
  'Akasya Balı': 'harvest_page.honey_acacia', 'Kekik Balı': 'harvest_page.honey_thyme',
  'Ihlamur Balı': 'harvest_page.honey_linden', 'Çam Balı': 'harvest_page.honey_pine',
  'Kafkas Flora Balı': 'batches_page.honey_caucasus', 'Diğer': 'reports.honey_type_other',
}

const EMPTY_FORM = {
  batch_no: '',
  honey_type: 'Çiçek Balı',
  harvest_date: new Date().toISOString().slice(0, 10),
  apiary_id: '',
  total_kg: '',
  brix_value: '',
  jar_count: '',
  package_date: '',
  producer_name: '',
  region_story: '',
  analysis_note: '',
  notes: ''
}

function generateBatchNo() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `BAL-${y}${m}-${rand}`
}

export default function BatchPage() {
  const { user, profile } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [batches, setBatches] = useState([])
  const [apiaries, setApiaries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [qrModal, setQrModal] = useState(null) // batch object
  const [qrDataUrl, setQrDataUrl] = useState('')

  useEffect(() => { if (user) fetchAll() }, [user])

  async function fetchAll() {
    setLoading(true)
    const [batRes, apRes] = await Promise.all([
      supabase.from('honey_batches').select('*, apiaries(name)')
        .eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('apiaries').select('id, name').eq('user_id', user.id).order('name')
    ])
    setBatches(batRes.data || [])
    setApiaries(apRes.data || [])
    setLoading(false)
  }

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function openNew() {
    setForm({ ...EMPTY_FORM, batch_no: generateBatchNo(), producer_name: profile?.full_name || '' })
    setShowForm(true)
  }

  async function save() {
    if (!form.batch_no.trim()) { toast.error(t('batches.error_no')); return }
    if (!form.total_kg || parseFloat(form.total_kg) <= 0) { toast.error(t('batches.error_kg')); return }
    setSaving(true)
    const payload = {
      user_id: user.id,
      batch_no: form.batch_no.trim(),
      honey_type: form.honey_type,
      harvest_date: form.harvest_date || null,
      apiary_id: form.apiary_id || null,
      total_kg: parseFloat(form.total_kg),
      brix_value: form.brix_value ? parseFloat(form.brix_value) : null,
      jar_count: form.jar_count ? parseInt(form.jar_count) : null,
      package_date: form.package_date || null,
      producer_name: form.producer_name.trim() || null,
      region_story: form.region_story.trim() || null,
      analysis_note: form.analysis_note.trim() || null,
      notes: form.notes.trim() || null,
      is_public: true
    }
    const { error } = await supabase.from('honey_batches').insert(payload)
    if (error) toast.error(t('common.error_save') + ': ' + error.message)
    else { toast.success(t('batches.saved')); setShowForm(false); fetchAll() }
    setSaving(false)
  }

  function openQR(batch) {
    setQrModal(batch)
    setQrDataUrl(`${window.location.origin}/parti/${batch.batch_no}`)
  }

  async function togglePublic(batch) {
    const { error } = await supabase.from('honey_batches')
      .update({ is_public: !batch.is_public }).eq('id', batch.id)
    if (error) toast.error(t('batches_page.update_failed'))
    else { toast.success(batch.is_public ? t('batches.hidden_success') : t('batches.published_success')); fetchAll() }
  }

  async function deleteBatch(id) {
    if (!confirm(t('batches.confirm_delete'))) return
    const { error } = await supabase.from('honey_batches').delete().eq('id', id)
    if (error) toast.error(t('batches_page.delete_failed'))
    else { toast.success(t('batches_page.batch_deleted')); fetchAll() }
  }

  const totalKg = batches.reduce((s, b) => s + (b.total_kg || 0), 0)

  return (
    <div className="min-h-screen bg-dark-400 flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full">

        {/* Başlık */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-black">{t('batches.title')}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {t('batches_page.count_total', { count: batches.length, kg: totalKg.toFixed(1) })}
            </p>
          </div>
          <button className="btn-gold" onClick={openNew}>{t('batches.new_btn')}</button>
        </div>

        {/* Özet */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard icon="🫙" label={t('batches_page.total_batches')} value={batches.length} />
          <StatCard icon="⚖️" label={t('batches_page.total_kg')} value={`${totalKg.toFixed(1)} kg`} />
          <StatCard icon="🌐" label={t('batches_page.published')} value={batches.filter(b => b.is_public).length} />
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto">
            <div className="bg-dark-200 rounded-2xl w-full max-w-lg my-8"
              style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
              <div className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <h2 className="font-black text-base">{t('batches.add_title')}</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
              </div>
              <div className="p-6 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="field-label">{t('batches.batch_no')} *</label>
                    <input value={form.batch_no} onChange={e => set('batch_no', e.target.value)}
                      placeholder="BAL-202605-1234" />
                  </div>
                  <div>
                    <label className="field-label">{t('batches.honey_type')}</label>
                    <select value={form.honey_type} onChange={e => set('honey_type', e.target.value)}>
                      {HONEY_TYPES.map(ht => <option key={ht} value={ht}>{t(BATCH_HONEY_TYPE_KEYS[ht])}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">{t('batches.harvest_date')}</label>
                    <input type="date" value={form.harvest_date} onChange={e => set('harvest_date', e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label">{t('batches.total_kg')} *</label>
                    <input type="number" min="0" step="0.1" value={form.total_kg}
                      onChange={e => set('total_kg', e.target.value)} placeholder="0.0" />
                  </div>
                  <div>
                    <label className="field-label">{t('batches.brix')}</label>
                    <input type="number" min="0" max="100" step="0.1" value={form.brix_value}
                      onChange={e => set('brix_value', e.target.value)} placeholder="örn. 18.5" />
                  </div>
                  <div>
                    <label className="field-label">{t('batches.jar_count')}</label>
                    <input type="number" min="0" value={form.jar_count}
                      onChange={e => set('jar_count', e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <label className="field-label">{t('batches.package_date')}</label>
                    <input type="date" value={form.package_date} onChange={e => set('package_date', e.target.value)} />
                  </div>
                  {apiaries.length > 0 && (
                    <div className="col-span-2">
                      <label className="field-label">{t('finance_page.apiary')}</label>
                      <select value={form.apiary_id} onChange={e => set('apiary_id', e.target.value)}>
                        <option value="">{t('batches_page.not_selected')}</option>
                        {apiaries.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className="field-label">{t('batches.producer')}</label>
                    <input value={form.producer_name} onChange={e => set('producer_name', e.target.value)}
                      placeholder={t('batches_page.producer_placeholder')} />
                  </div>
                  <div className="col-span-2">
                    <label className="field-label">{t('batches.story')}</label>
                    <textarea rows={3} value={form.region_story} onChange={e => set('region_story', e.target.value)}
                      placeholder="örn. Bu bal Ardahan Posof yaylalarında, 1800 metre rakımda Kafkas arılarından hasat edilmiştir..."
                      className="resize-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="field-label">{t('batches.analysis')}</label>
                    <input value={form.analysis_note} onChange={e => set('analysis_note', e.target.value)}
                      placeholder="örn. Tarım Bakanlığı onaylı, antibiyotik bulunmadı" />
                  </div>
                  <div className="col-span-2">
                    <label className="field-label">{t('batches.internal_notes')}</label>
                    <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
                      className="resize-none" placeholder="Depolama yeri, özel notlar..." />
                  </div>
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

        {/* QR Modal */}
        {qrModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-dark-200 rounded-2xl p-6 w-full max-w-sm text-center"
              style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
              <h3 className="font-black text-base mb-1">{qrModal.batch_no}</h3>
              <p className="text-xs text-gray-400 mb-4">{qrModal.honey_type}</p>
              <div className="flex justify-center mb-4">
                <div id="batch-qr-canvas" className="p-3 bg-white rounded-xl">
                  <QRCodeCanvas
                    value={qrDataUrl}
                    size={200}
                    bgColor="#ffffff"
                    fgColor="#1a1a1a"
                    level="M"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-4 break-all">{qrDataUrl}</p>
              <div className="flex gap-2 justify-center flex-wrap">
                <button className="btn-ghost text-sm" onClick={() => {
                  navigator.clipboard.writeText(qrDataUrl)
                  toast.success(t('batches.qr_copied'))
                }}>
                  {t('batches.qr_copy')}
                </button>
                <button className="btn-ghost text-sm px-3" onClick={() => setQrModal(null)}>✕</button>
              </div>
            </div>
          </div>
        )}

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : batches.length === 0 ? (
          <div className="card flex flex-col items-center py-14 text-center">
            <div className="text-4xl mb-3">🫙</div>
            <p className="font-bold mb-1">{t('batches.empty_title')}</p>
            <p className="text-sm text-gray-400 mb-5">{t('batches.empty_subtitle')}</p>
            <button className="btn-gold" onClick={openNew}>{t('batches.empty_btn')}</button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {batches.map(batch => (
              <BatchCard
                key={batch.id}
                batch={batch}
                onQR={() => openQR(batch)}
                onTogglePublic={() => togglePublic(batch)}
                onDelete={() => deleteBatch(batch.id)}
                onPreview={() => navigate(`/parti/${batch.batch_no}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function BatchCard({ batch, onQR, onTogglePublic, onDelete, onPreview }) {
  const { t } = useTranslation()
  const date = batch.harvest_date
    ? new Date(batch.harvest_date + 'T00:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  return (
    <div className="card flex flex-col sm:flex-row sm:items-center gap-4"
      style={{ borderColor: batch.is_public ? 'rgba(245,197,24,0.2)' : 'rgba(255,255,255,0.08)' }}>
      {/* Sol: bilgi */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: 'rgba(245,197,24,0.12)', border: '1px solid rgba(245,197,24,0.25)' }}>
          🍯
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-sm">{batch.batch_no}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'rgba(245,197,24,0.15)', color: '#f5c518' }}>
              {t(BATCH_HONEY_TYPE_KEYS[batch.honey_type] || 'reports.honey_type_other')}
            </span>
            {batch.is_public && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'rgba(39,174,96,0.15)', color: '#27ae60', border: '1px solid rgba(39,174,96,0.3)' }}>
                🌐 {t('batches_page.published')}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {date} · {batch.total_kg} kg
            {batch.apiaries?.name && ` · ${batch.apiaries.name}`}
            {batch.brix_value && ` · ${t('batches_page.humidity_short')}: ${batch.brix_value}%`}
          </div>
        </div>
      </div>
      {/* Sağ: aksiyonlar */}
      <div className="flex gap-2 flex-shrink-0 flex-wrap">
        <button className="btn-gold text-xs px-3 py-1.5" onClick={onQR}>{t('batches.qr_btn')}</button>
        <button className="btn-ghost text-xs px-3 py-1.5" onClick={onPreview}>{t('batches.preview_btn')}</button>
        <button
          className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
          style={batch.is_public
            ? { background: 'rgba(39,174,96,0.15)', color: '#27ae60', border: '1px solid rgba(39,174,96,0.3)' }
            : { background: 'rgba(255,255,255,0.06)', color: '#888', border: '1px solid rgba(255,255,255,0.1)' }}
          onClick={onTogglePublic}>
          {batch.is_public ? t('batches.published') : t('batches.publish_btn')}
        </button>
        <button className="btn-ghost text-xs px-3 py-1.5" style={{ color: '#e74c3c' }} onClick={onDelete}>🗑️</button>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }) {
  return (
    <div className="card text-center py-3 px-4">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="font-black text-lg">{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  )
}

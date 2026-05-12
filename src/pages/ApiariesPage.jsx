import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/layout/Navbar'
import toast from 'react-hot-toast'

const FLORA_TYPES = ['Çiçek / Karma', 'Orman / Çam', 'Kestane', 'Akasya', 'Kekik', 'Ihlamur', 'Yayla', 'Narenciye', 'Diğer']
const APIARY_TYPES = ['Sabit', 'Gezginci']

const EMPTY_FORM = {
  name: '',
  location: '',
  region: '',
  altitude_m: '',
  flora_type: 'Çiçek / Karma',
  apiary_type: 'Sabit',
  latitude: '',
  longitude: '',
  notes: ''
}

export default function ApiariesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [apiaries, setApiaries] = useState([])
  const [hiveCounts, setHiveCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null) // apiary id
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => { if (user) fetchAll() }, [user])

  async function fetchAll() {
    setLoading(true)
    const [apiRes, hivRes] = await Promise.all([
      supabase.from('apiaries').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('hives').select('id, apiary_id').eq('user_id', user.id).eq('status', 'aktif')
    ])
    setApiaries(apiRes.data || [])
    // kovan sayıları arılık bazında
    const counts = {}
    for (const h of (hivRes.data || [])) {
      if (h.apiary_id) counts[h.apiary_id] = (counts[h.apiary_id] || 0) + 1
    }
    setHiveCounts(counts)
    setLoading(false)
  }

  function openNew() {
    setForm(EMPTY_FORM)
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(ap) {
    setForm({
      name: ap.name || '',
      location: ap.location || '',
      region: ap.region || '',
      altitude_m: ap.altitude_m || '',
      flora_type: ap.flora_type || 'Çiçek / Karma',
      apiary_type: ap.apiary_type || 'Sabit',
      latitude: ap.latitude || '',
      longitude: ap.longitude || '',
      notes: ap.notes || ''
    })
    setEditing(ap.id)
    setShowForm(true)
  }

  async function save() {
    if (!form.name.trim()) { toast.error('Arılık adı gerekli'); return }
    setSaving(true)
    const payload = {
      user_id: user.id,
      name: form.name.trim(),
      location: form.location.trim() || null,
      region: form.region.trim() || null,
      altitude_m: form.altitude_m ? parseInt(form.altitude_m) : null,
      flora_type: form.flora_type || null,
      apiary_type: form.apiary_type || 'Sabit',
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      notes: form.notes.trim() || null
    }
    let error
    if (editing) {
      ;({ error } = await supabase.from('apiaries').update(payload).eq('id', editing))
    } else {
      ;({ error } = await supabase.from('apiaries').insert(payload))
    }
    if (error) toast.error('Kaydedilemedi: ' + error.message)
    else {
      toast.success(editing ? 'Arılık güncellendi' : 'Arılık eklendi')
      setShowForm(false)
      fetchAll()
    }
    setSaving(false)
  }

  async function deleteApiary(id) {
    if (!confirm('Bu arılığı silmek istiyor musunuz? Bağlı kovanların arılık bağlantısı kaldırılır.')) return
    setDeleting(id)
    const { error } = await supabase.from('apiaries').delete().eq('id', id)
    if (error) toast.error('Silinemedi: ' + error.message)
    else { toast.success('Arılık silindi'); fetchAll() }
    setDeleting(null)
  }

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  const totalHives = Object.values(hiveCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="min-h-screen bg-dark-400 flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full">

        {/* Başlık */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-black">Arılıklar</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {apiaries.length} arılık · {totalHives} aktif kovan
            </p>
          </div>
          <button className="btn-gold" onClick={openNew}>+ Yeni Arılık</button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto">
            <div className="bg-dark-200 rounded-2xl w-full max-w-lg my-8"
              style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
              <div className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <h2 className="font-black text-base">
                  {editing ? 'Arılığı Düzenle' : 'Yeni Arılık Ekle'}
                </h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
              </div>

              <div className="p-6 flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="field-label">Arılık Adı *</label>
                    <input value={form.name} onChange={e => set('name', e.target.value)}
                      placeholder="örn. Kuzey Arılığı, Yayladağ 1" autoFocus />
                  </div>
                  <div>
                    <label className="field-label">Köy / Mevki</label>
                    <input value={form.location} onChange={e => set('location', e.target.value)}
                      placeholder="örn. Sevimli Köyü" />
                  </div>
                  <div>
                    <label className="field-label">İlçe / Bölge</label>
                    <input value={form.region} onChange={e => set('region', e.target.value)}
                      placeholder="örn. Posof / Ardahan" />
                  </div>
                  <div>
                    <label className="field-label">Flora Tipi</label>
                    <select value={form.flora_type} onChange={e => set('flora_type', e.target.value)}>
                      {FLORA_TYPES.map(f => <option key={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Arılık Tipi</label>
                    <select value={form.apiary_type} onChange={e => set('apiary_type', e.target.value)}>
                      {APIARY_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Rakım (metre)</label>
                    <input type="number" min="0" max="4000" value={form.altitude_m}
                      onChange={e => set('altitude_m', e.target.value)} placeholder="örn. 1200" />
                  </div>
                  <div /> {/* spacer */}
                  <div>
                    <label className="field-label">Enlem (Latitude)</label>
                    <input type="number" step="0.0001" value={form.latitude}
                      onChange={e => set('latitude', e.target.value)} placeholder="41.1234" />
                  </div>
                  <div>
                    <label className="field-label">Boylam (Longitude)</label>
                    <input type="number" step="0.0001" value={form.longitude}
                      onChange={e => set('longitude', e.target.value)} placeholder="43.5678" />
                  </div>
                  {/* GPS yardım notu */}
                  {(form.latitude || form.longitude) && (
                    <div className="sm:col-span-2">
                      <a
                        href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                        target="_blank" rel="noreferrer"
                        className="text-xs text-gold hover:underline">
                        📍 Google Maps'te görüntüle →
                      </a>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <label className="field-label">Notlar</label>
                    <textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)}
                      placeholder="Arılık hakkında notlar..." className="resize-none" />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button className="btn-gold" onClick={save} disabled={saving}>
                    {saving ? '⏳ Kaydediliyor...' : '💾 Kaydet'}
                  </button>
                  <button className="btn-ghost" onClick={() => setShowForm(false)}>İptal</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : apiaries.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-4">🌿</div>
            <p className="text-lg font-bold mb-1">Henüz arılık yok</p>
            <p className="text-sm text-gray-400 mb-6">İlk arılığını ekleyerek başla</p>
            <button className="btn-gold" onClick={openNew}>+ İlk Arılığı Ekle</button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {apiaries.map(ap => (
              <ApiaryCard
                key={ap.id}
                apiary={ap}
                hiveCount={hiveCounts[ap.id] || 0}
                onEdit={() => openEdit(ap)}
                onDelete={() => deleteApiary(ap.id)}
                onViewHives={() => navigate(`/panel?arılik=${ap.id}`)}
                deleting={deleting === ap.id}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function ApiaryCard({ apiary, hiveCount, onEdit, onDelete, onViewHives, deleting }) {
  const floraEmoji = {
    'Çiçek / Karma': '🌸', 'Orman / Çam': '🌲', 'Kestane': '🌰',
    'Akasya': '🤍', 'Kekik': '🌿', 'Ihlamur': '🍃',
    'Yayla': '⛰️', 'Narenciye': '🍊', 'Diğer': '🌾'
  }
  const emoji = floraEmoji[apiary.flora_type] || '🌾'

  return (
    <div className="card flex flex-col gap-3 hover:border-gold/30 transition-colors"
      style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      {/* Başlık */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: 'rgba(245,197,24,0.12)', border: '1px solid rgba(245,197,24,0.25)' }}>
            {emoji}
          </div>
          <div>
            <div className="font-black text-sm leading-tight">{apiary.name}</div>
            {(apiary.location || apiary.region) && (
              <div className="text-xs text-gray-400 mt-0.5">
                📍 {[apiary.location, apiary.region].filter(Boolean).join(', ')}
              </div>
            )}
          </div>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
          style={{
            background: apiary.apiary_type === 'Gezginci' ? 'rgba(52,152,219,0.15)' : 'rgba(39,174,96,0.15)',
            color: apiary.apiary_type === 'Gezginci' ? '#3498db' : '#27ae60',
            border: `1px solid ${apiary.apiary_type === 'Gezginci' ? 'rgba(52,152,219,0.3)' : 'rgba(39,174,96,0.3)'}`
          }}>
          {apiary.apiary_type || 'Sabit'}
        </span>
      </div>

      {/* Bilgiler */}
      <div className="grid grid-cols-2 gap-2">
        <InfoChip label="Kovan" value={`${hiveCount} adet`} />
        {apiary.altitude_m && <InfoChip label="Rakım" value={`${apiary.altitude_m} m`} />}
        {apiary.flora_type && <InfoChip label="Flora" value={apiary.flora_type} />}
        {apiary.latitude && apiary.longitude && (
          <InfoChip label="GPS" value="Kayıtlı ✓" color="#27ae60" />
        )}
      </div>

      {apiary.notes && (
        <p className="text-xs text-gray-400 leading-relaxed border-t border-white/5 pt-2 line-clamp-2">
          {apiary.notes}
        </p>
      )}

      {/* Aksiyonlar */}
      <div className="flex gap-2 mt-auto pt-1">
        <button
          className="flex-1 text-xs font-bold py-2 rounded-lg transition-colors"
          style={{ background: 'rgba(245,197,24,0.12)', color: '#f5c518', border: '1px solid rgba(245,197,24,0.25)' }}
          onClick={onViewHives}>
          🐝 Kovanları Gör
        </button>
        <button className="btn-ghost px-3 text-xs" onClick={onEdit}>✏️</button>
        <button
          className="btn-ghost px-3 text-xs"
          style={{ color: deleting ? '#888' : '#e74c3c' }}
          onClick={onDelete} disabled={deleting}>
          {deleting ? '⏳' : '🗑️'}
        </button>
      </div>
    </div>
  )
}

function InfoChip({ label, value, color }) {
  return (
    <div className="rounded-lg px-2.5 py-1.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-xs font-bold mt-0.5" style={{ color: color || '#e0e0e0' }}>{value}</div>
    </div>
  )
}

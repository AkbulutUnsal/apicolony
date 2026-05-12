import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/layout/Navbar'
import toast from 'react-hot-toast'

const FEED_TYPES = ['Şeker Şurubu', 'Kandı / Şeker Hamuru', 'Polen Keki', 'Arı Ekmeği', 'Hazır Kek', 'Diğer']
const UNITS = ['kg', 'litre', 'adet']

const EMPTY_FORM = {
  feed_date: new Date().toISOString().slice(0, 10),
  apiary_id: '',
  hive_ids: [],        // boş = toplu (tüm arılık)
  feed_type: 'Şeker Şurubu',
  amount: '',
  unit: 'kg',
  cost: '',
  notes: ''
}

export default function FeedingPage() {
  const { user } = useAuth()
  const [records, setRecords] = useState([])
  const [apiaries, setApiaries] = useState([])
  const [hives, setHives] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filterApiary, setFilterApiary] = useState('all')

  useEffect(() => { if (user) fetchAll() }, [user])

  async function fetchAll() {
    setLoading(true)
    const [feedRes, apRes, hivRes] = await Promise.all([
      supabase.from('feeding_records')
        .select('*, apiaries(name), hives(hive_no)')
        .eq('user_id', user.id)
        .order('feed_date', { ascending: false })
        .limit(200),
      supabase.from('apiaries').select('id, name').eq('user_id', user.id).order('name'),
      supabase.from('hives').select('id, hive_no, apiary_id')
        .eq('user_id', user.id).eq('status', 'aktif').order('hive_no')
    ])
    setRecords(feedRes.data || [])
    setApiaries(apRes.data || [])
    setHives(hivRes.data || [])
    setLoading(false)
  }

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  // Arılık seçilince hive_ids sıfırla
  function selectApiary(id) {
    setForm(p => ({ ...p, apiary_id: id, hive_ids: [] }))
  }

  function toggleHive(hiveId) {
    setForm(p => ({
      ...p,
      hive_ids: p.hive_ids.includes(hiveId)
        ? p.hive_ids.filter(id => id !== hiveId)
        : [...p.hive_ids, hiveId]
    }))
  }

  async function save() {
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Miktar gerekli'); return }
    if (!form.feed_type) { toast.error('Besleme türü seçin'); return }
    setSaving(true)

    // Toplu besleme: seçili kovan yoksa arılığın tüm kovanlarına ayrı kayıt
    const targetHiveIds = form.hive_ids.length > 0
      ? form.hive_ids
      : form.apiary_id
        ? hives.filter(h => h.apiary_id === form.apiary_id).map(h => h.id)
        : [null] // arılık da seçilmemişse genel kayıt

    const rows = targetHiveIds.map(hiveId => ({
      user_id: user.id,
      hive_id: hiveId,
      apiary_id: form.apiary_id || null,
      feed_date: form.feed_date,
      feed_type: form.feed_type,
      amount: parseFloat(form.amount),
      unit: form.unit,
      cost: form.cost ? parseFloat(form.cost) : null,
      notes: form.notes.trim() || null
    }))

    const { error } = await supabase.from('feeding_records').insert(rows)
    if (error) toast.error('Kaydedilemedi: ' + error.message)
    else {
      toast.success(`${rows.length} kovana besleme kaydedildi`)
      setShowForm(false)
      setForm(EMPTY_FORM)
      fetchAll()
    }
    setSaving(false)
  }

  const filteredRecords = filterApiary === 'all'
    ? records
    : records.filter(r => r.apiary_id === filterApiary)

  const filteredHives = form.apiary_id
    ? hives.filter(h => h.apiary_id === form.apiary_id)
    : hives

  // İstatistikler
  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthRecords = records.filter(r => r.feed_date?.startsWith(thisMonth))
  const monthCost = monthRecords.reduce((s, r) => s + (r.cost || 0), 0)

  return (
    <div className="min-h-screen bg-dark-400 flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full">

        {/* Başlık */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-black">Besleme Kayıtları</h1>
            <p className="text-sm text-gray-400 mt-0.5">Bu ay {monthRecords.length} kayıt · {monthCost > 0 ? `${monthCost.toFixed(0)} ₺ maliyet` : ''}</p>
          </div>
          <button className="btn-gold" onClick={() => { setForm(EMPTY_FORM); setShowForm(true) }}>
            + Yeni Besleme
          </button>
        </div>

        {/* Özet Kartları */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard label="Toplam Kayıt" value={records.length} icon="📋" />
          <StatCard label="Bu Ay" value={monthRecords.length} icon="📅" />
          <StatCard label="Bu Ay Maliyet" value={monthCost > 0 ? `${monthCost.toFixed(0)} ₺` : '—'} icon="💰" />
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto">
            <div className="bg-dark-200 rounded-2xl w-full max-w-lg my-8"
              style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
              <div className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <h2 className="font-black text-base">Besleme Kaydı Ekle</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
              </div>

              <div className="p-6 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">Tarih</label>
                    <input type="date" value={form.feed_date} onChange={e => set('feed_date', e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label">Besleme Türü</label>
                    <select value={form.feed_type} onChange={e => set('feed_type', e.target.value)}>
                      {FEED_TYPES.map(f => <option key={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Miktar</label>
                    <input type="number" min="0" step="0.1" value={form.amount}
                      onChange={e => set('amount', e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <label className="field-label">Birim</label>
                    <select value={form.unit} onChange={e => set('unit', e.target.value)}>
                      {UNITS.map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="field-label">Maliyet (₺) — opsiyonel</label>
                    <input type="number" min="0" step="0.01" value={form.cost}
                      onChange={e => set('cost', e.target.value)} placeholder="0.00" />
                  </div>
                </div>

                {/* Arılık seçimi */}
                {apiaries.length > 0 && (
                  <div>
                    <label className="field-label">Arılık (opsiyonel)</label>
                    <select value={form.apiary_id} onChange={e => selectApiary(e.target.value)}>
                      <option value="">— Genel kayıt (arılık seçilmedi) —</option>
                      {apiaries.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                )}

                {/* Kovan seçimi - çoklu */}
                {filteredHives.length > 0 && (
                  <div>
                    <label className="field-label">
                      Kovanlar — Seçilmezse {form.apiary_id ? 'tüm arılık kovanlarına' : 'genel olarak'} kaydedilir
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto p-2 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {filteredHives.map(h => (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => toggleHive(h.id)}
                          className="text-xs font-bold py-1.5 rounded-lg transition-colors"
                          style={{
                            background: form.hive_ids.includes(h.id)
                              ? 'rgba(245,197,24,0.25)'
                              : 'rgba(255,255,255,0.06)',
                            border: form.hive_ids.includes(h.id)
                              ? '1px solid rgba(245,197,24,0.5)'
                              : '1px solid rgba(255,255,255,0.1)',
                            color: form.hive_ids.includes(h.id) ? '#f5c518' : '#aaa'
                          }}>
                          {h.hive_no}
                        </button>
                      ))}
                    </div>
                    {form.hive_ids.length > 0 && (
                      <p className="text-xs text-gold mt-1">{form.hive_ids.length} kovan seçili</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="field-label">Notlar</label>
                  <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
                    placeholder="Hava durumu, ek notlar..." className="resize-none" />
                </div>

                <div className="flex gap-2 pt-1">
                  <button className="btn-gold" onClick={save} disabled={saving}>
                    {saving ? '⏳ Kaydediliyor...' : '💾 Kaydet'}
                  </button>
                  <button className="btn-ghost" onClick={() => setShowForm(false)}>İptal</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtre */}
        {apiaries.length > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            <FilterChip label="Tümü" active={filterApiary === 'all'} onClick={() => setFilterApiary('all')} />
            {apiaries.map(a => (
              <FilterChip key={a.id} label={a.name} active={filterApiary === a.id} onClick={() => setFilterApiary(a.id)} />
            ))}
          </div>
        )}

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="card flex flex-col items-center py-14 text-center">
            <div className="text-4xl mb-3">🍯</div>
            <p className="font-bold mb-1">Henüz besleme kaydı yok</p>
            <p className="text-sm text-gray-400 mb-5">İlk besleme kaydını ekleyin</p>
            <button className="btn-gold" onClick={() => { setForm(EMPTY_FORM); setShowForm(true) }}>
              + Besleme Ekle
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredRecords.map(rec => (
              <FeedingRow key={rec.id} record={rec} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function FeedingRow({ record }) {
  const feedEmoji = {
    'Şeker Şurubu': '🫙', 'Kandı / Şeker Hamuru': '🍬', 'Polen Keki': '🌼',
    'Arı Ekmeği': '🍞', 'Hazır Kek': '🧁', 'Diğer': '📦'
  }
  const emoji = feedEmoji[record.feed_type] || '📦'
  const date = record.feed_date
    ? new Date(record.feed_date + 'T00:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: 'rgba(245,197,24,0.1)' }}>
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm">{record.feed_type}</span>
          {record.hives?.hive_no && (
            <span className="text-xs px-1.5 py-0.5 rounded-md font-semibold"
              style={{ background: 'rgba(245,197,24,0.15)', color: '#f5c518' }}>
              {record.hives.hive_no}
            </span>
          )}
          {record.apiaries?.name && !record.hive_id && (
            <span className="text-xs text-gray-500">{record.apiaries.name} (toplu)</span>
          )}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          {date}
          {record.notes && ` · ${record.notes}`}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="font-bold text-sm">{record.amount} {record.unit}</div>
        {record.cost > 0 && <div className="text-xs text-gray-400">{record.cost} ₺</div>}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon }) {
  return (
    <div className="card py-3 px-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="font-black text-lg">{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  )
}

function FilterChip({ label, active, onClick }) {
  return (
    <button onClick={onClick} className="whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex-shrink-0"
      style={{
        background: active ? 'rgba(245,197,24,0.2)' : 'rgba(255,255,255,0.06)',
        color: active ? '#f5c518' : '#aaa',
        border: active ? '1px solid rgba(245,197,24,0.4)' : '1px solid rgba(255,255,255,0.1)'
      }}>
      {label}
    </button>
  )
}

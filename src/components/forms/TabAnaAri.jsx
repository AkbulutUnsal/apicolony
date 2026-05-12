import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

// ── ANA ARI ─────────────────────────────────────────────
export function TabAnaAri({ hiveId }) {
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
    toast.success('Ana arı kaydedildi')
  }

  if (loading) return <Loader />

  return (
    <div className="p-6">
      <div className="card">
        <h2 className="text-lg font-black mb-1">Ana Arı Bilgileri</h2>
        <p className="text-sm text-gray-400 mb-6">Kovanın ana arısına ait detaylı bilgiler.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="field-label">Doğum Tarihi</label>
            <input type="date" value={queen.birth_date || ''} onChange={e => set('birth_date', e.target.value)} />
          </div>
          <div>
            <label className="field-label">Ana Irkı</label>
            <select value={queen.breed || 'Anadolu'} onChange={e => set('breed', e.target.value)}>
              <option>Anadolu</option><option>Kafkas</option><option>Karniyol</option>
              <option>İtalyan</option><option>Buckfast</option>
            </select>
          </div>
          <div>
            <label className="field-label">Suni/Doğal</label>
            <select value={queen.insemination_type || 'Doğal'} onChange={e => set('insemination_type', e.target.value)}>
              <option>Doğal</option><option>Suni Tohumlama</option>
            </select>
          </div>
          <div>
            <label className="field-label">Rengi / İşareti</label>
            <input value={queen.color_mark || ''} onChange={e => set('color_mark', e.target.value)} placeholder="İşaretsiz" />
          </div>
          <div>
            <label className="field-label">Performans</label>
            <input value={queen.performance || ''} onChange={e => set('performance', e.target.value)} placeholder="Bilinmiyor" />
          </div>
          <div>
            <label className="field-label">Değişim Tarihi</label>
            <input type="date" value={queen.replacement_date || ''} onChange={e => set('replacement_date', e.target.value)} />
          </div>
        </div>
        <button className="btn-gold mt-6" onClick={save}>💾 Ana Arıyı Kaydet</button>
      </div>
    </div>
  )
}

// ── BALLIKLAR ─────────────────────────────────────────────
export function TabBallik({ hiveId }) {
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
    if (error) { toast.error('Eklenemedi'); return }
    setSupers(prev => [data, ...prev])
    setAdding(false)
    toast.success('Ballık eklendi')
  }

  async function deleteSuper(superId) {
    if (!confirm('Bu ballığı silmek istediğinize emin misiniz?')) return
    await supabase.from('supers').delete().eq('id', superId)
    setSupers(prev => prev.filter(s => s.id !== superId))
    toast.success('Ballık silindi')
  }

  const totalFrames = supers.reduce((s, x) => s + (x.frame_count || 0), 0)
  const karakovan = supers.filter(s => s.super_type === 'Karakovan').length
  const standart = supers.filter(s => s.super_type === 'Standart').length

  if (loading) return <Loader />

  return (
    <div className="p-6">
      <div className="card">
        <h2 className="text-lg font-black mb-1">Ballık Yönetimi</h2>
        <p className="text-sm text-gray-400 mb-2">Kovana eklenen ballıkların ve çerçevelerin takibi.</p>
        <p className="text-sm text-gray-400 mb-5">
          Mevcut: <span className="text-gold font-bold">{supers.length} ballık</span>,{' '}
          <span className="text-gold font-bold">{karakovan} karakovan</span>,{' '}
          <span className="text-gold font-bold">{totalFrames} standart çerçeve</span>.
        </p>

        {supers.map(sup => (
          <div key={sup.id} className="flex items-center justify-between bg-dark-100 border border-white/8 rounded-xl px-4 py-3.5 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-dark-50 rounded-lg flex items-center justify-center text-sm">🍯</div>
              <div>
                <div className="font-bold text-sm">Ballık – {karakovan > 0 ? karakovan + ' Karakovan' : '0 Karakovan'}, {sup.frame_count} Standart</div>
                <div className="text-xs text-gray-400 mt-0.5">Eklenme Tarihi: {new Date(sup.added_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
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
                <label className="field-label">Tip</label>
                <select value={newSuper.super_type} onChange={e => setNewSuper(p => ({ ...p, super_type: e.target.value }))}>
                  <option>Standart</option><option>Karakovan</option>
                </select>
              </div>
              <div>
                <label className="field-label">Çerçeve Sayısı</label>
                <input type="number" value={newSuper.frame_count} onChange={e => setNewSuper(p => ({ ...p, frame_count: parseInt(e.target.value) }))} />
              </div>
              <div>
                <label className="field-label">Ekleme Tarihi</label>
                <input type="date" value={newSuper.added_date} onChange={e => setNewSuper(p => ({ ...p, added_date: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-gold" onClick={addSuper}>Kaydet</button>
              <button className="btn-ghost" onClick={() => setAdding(false)}>İptal</button>
            </div>
          </div>
        ) : (
          <button className="btn-gold mt-1" onClick={() => setAdding(true)}>+ Yeni Ballık Ekle</button>
        )}
      </div>
    </div>
  )
}

// ── HASTALIK ─────────────────────────────────────────────
export function TabHastalik({ hiveId }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ disease_name: '', severity: 'Orta', treatment: '', treatment_date: new Date().toISOString().slice(0,10) })

  useEffect(() => {
    supabase.from('disease_records').select('*').eq('hive_id', hiveId).order('created_at', { ascending: false })
      .then(({ data }) => { setRecords(data || []); setLoading(false) })
  }, [hiveId])

  async function addRecord() {
    const { data, error } = await supabase.from('disease_records').insert({ ...form, hive_id: hiveId }).select().single()
    if (error) { toast.error('Eklenemedi'); return }
    setRecords(prev => [data, ...prev])
    setAdding(false)
    toast.success('Kayıt eklendi')
  }

  if (loading) return <Loader />

  return (
    <div className="p-6">
      <div className="card">
        <h2 className="text-lg font-black mb-1">Hastalıkla Mücadele Kayıtları</h2>
        <p className="text-sm text-gray-400 mb-5">Yapılan hastalık mücadelelerinin geçmişi.</p>

        {records.length === 0 && !adding && (
          <p className="text-center text-gray-500 py-8 text-sm">Henüz kayıt yok.</p>
        )}

        {records.map(rec => (
          <div key={rec.id} className="bg-dark-100 border border-white/8 rounded-xl px-4 py-3.5 mb-3">
            <div className="flex justify-between">
              <span className="font-bold text-sm text-red-400">{rec.disease_name}</span>
              <span className="text-xs text-gray-400">{new Date(rec.treatment_date).toLocaleDateString('tr-TR')}</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">Şiddet: {rec.severity} · Tedavi: {rec.treatment || '-'}</div>
          </div>
        ))}

        {adding ? (
          <div className="bg-dark-100 border border-white/8 rounded-xl p-4 mb-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="field-label">Hastalık Adı</label>
                <input value={form.disease_name} onChange={e => setForm(p => ({ ...p, disease_name: e.target.value }))} placeholder="Varroa, Nosema..." />
              </div>
              <div>
                <label className="field-label">Şiddet</label>
                <select value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value }))}>
                  <option>Hafif</option><option>Orta</option><option>Ağır</option>
                </select>
              </div>
              <div>
                <label className="field-label">Uygulanan Tedavi</label>
                <input value={form.treatment} onChange={e => setForm(p => ({ ...p, treatment: e.target.value }))} placeholder="Api Life Var, Okzalik asit..." />
              </div>
              <div>
                <label className="field-label">Tedavi Tarihi</label>
                <input type="date" value={form.treatment_date} onChange={e => setForm(p => ({ ...p, treatment_date: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-gold" onClick={addRecord}>Kaydet</button>
              <button className="btn-ghost" onClick={() => setAdding(false)}>İptal</button>
            </div>
          </div>
        ) : (
          <button className="btn-gold mt-1" onClick={() => setAdding(true)}>+ Yeni Kayıt Ekle</button>
        )}
      </div>
    </div>
  )
}

// ── BAKIM ─────────────────────────────────────────────
export function TabBakim({ hiveId }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSeason, setActiveSeason] = useState(null)
  const [adding, setAdding] = useState(null) // season name
  const [form, setForm] = useState({ inspection_date: new Date().toISOString().slice(0,10), colony_strength: 'Orta', honey_frames: 0, brood_frames: 0, feed_given: false, feed_type: '', notes: '' })

  const SEASONS = ['İlkbahar', 'Yaz', 'Sonbahar', 'Kışlatma']

  useEffect(() => {
    supabase.from('maintenance_records').select('*').eq('hive_id', hiveId).order('inspection_date', { ascending: false })
      .then(({ data }) => { setRecords(data || []); setLoading(false) })
  }, [hiveId])

  async function addRecord(season) {
    const { data, error } = await supabase.from('maintenance_records').insert({ ...form, hive_id: hiveId, season }).select().single()
    if (error) { toast.error('Eklenemedi'); return }
    setRecords(prev => [data, ...prev])
    setAdding(null)
    toast.success('Bakım kaydı eklendi')

    // Hives tablosunu güncelle — bakım yapıldı = healthy
    await supabase.from('hives').update({
      color_status: 'healthy',
      updated_at: new Date().toISOString()
    }).eq('id', hiveId)
  }

  if (loading) return <Loader />

  return (
    <div className="p-6">
      <div className="card">
        <h2 className="text-lg font-black mb-1">Bakım Kayıtları</h2>
        <p className="text-sm text-gray-400 mb-5">İlkbahar, Yaz, Sonbahar ve Kışlatma bakım geçmişi.</p>

        {SEASONS.map(season => {
          const seasonRecords = records.filter(r => r.season === season)
          const isOpen = activeSeason === season
          return (
            <div key={season} className="mb-4 border-b border-white/8 pb-4 last:border-0">
              <div className="flex justify-between items-center cursor-pointer py-2" onClick={() => setActiveSeason(isOpen ? null : season)}>
                <span className="font-bold text-gold">{season} Bakımları</span>
                <span className="text-gray-400">{isOpen ? '▲' : '▼'}</span>
              </div>
              {isOpen && (
                <div className="mt-2">
                  {seasonRecords.map(rec => (
                    <div key={rec.id} className="bg-dark-100 border border-white/8 rounded-lg px-3 py-2.5 mb-2">
                      <div className="flex justify-between">
                        <span className="font-bold text-sm">{new Date(rec.inspection_date).toLocaleDateString('tr-TR')}</span>
                        <span className="text-xs text-gray-400">Koloni: {rec.colony_strength}</span>
                      </div>
                      {rec.notes && <p className="text-xs text-gray-400 mt-1">{rec.notes}</p>}
                    </div>
                  ))}
                  {adding === season ? (
                    <div className="bg-dark-100 border border-white/8 rounded-xl p-4 mt-2">
                      <div className="flex flex-col gap-3 mb-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="field-label">İnceleme Tarihi</label>
                            <input type="date" value={form.inspection_date} onChange={e => setForm(p => ({ ...p, inspection_date: e.target.value }))} />
                          </div>
                          <div>
                            <label className="field-label">Koloni Gücü</label>
                            <select value={form.colony_strength} onChange={e => setForm(p => ({ ...p, colony_strength: e.target.value }))}>
                              <option>Güçlü</option><option>Orta</option><option>Zayıf</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="field-label">Bal Çerçevesi</label>
                            <input type="number" value={form.honey_frames} onChange={e => setForm(p => ({ ...p, honey_frames: parseInt(e.target.value) }))} />
                          </div>
                          <div>
                            <label className="field-label">Kuluçka Çerçevesi</label>
                            <input type="number" value={form.brood_frames} onChange={e => setForm(p => ({ ...p, brood_frames: parseInt(e.target.value) }))} />
                          </div>
                        </div>
                        <div>
                          <label className="field-label">Notlar</label>
                          <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="resize-none" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn-gold" onClick={() => addRecord(season)}>Kaydet</button>
                        <button className="btn-ghost" onClick={() => setAdding(null)}>İptal</button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn-gold mt-2" onClick={() => setAdding(season)}>+ Yeni {season} Kaydı</button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Loader() {
  return <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-gold border-t-transparent rounded-full animate-spin"/></div>
}

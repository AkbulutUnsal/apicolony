import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

const roleLabel = { yardimci: 'Yardımcı Arıcı', cirak: 'Çırak', sofor: 'Şoför' }
const roleColor = { yardimci: '#27ae60', cirak: '#3498db', sofor: '#e67e22' }

export default function WorkersPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [workers, setWorkers] = useState([])
  const [sessions, setSessions] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) fetchAll() }, [user])

  async function fetchAll() {
    const [w, s, l] = await Promise.all([
      supabase.from('workers').select('*').eq('owner_id', user.id).order('created_at'),
      supabase.from('worker_sessions').select('*, workers(full_name, avatar_emoji)')
        .eq('owner_id', user.id).eq('is_active', true),
      supabase.from('activity_logs').select('*').eq('owner_id', user.id)
        .order('created_at', { ascending: false }).limit(30)
    ])
    setWorkers(w.data || [])
    setSessions(s.data || [])
    setLogs(l.data || [])
    setLoading(false)
  }

  async function toggleWorker(worker) {
    await supabase.from('workers').update({ is_active: !worker.is_active }).eq('id', worker.id)
    setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, is_active: !w.is_active } : w))
    toast.success(worker.is_active ? 'Çalışan pasife alındı' : 'Çalışan aktifleştirildi')
  }

  async function deleteWorker(id) {
    if (!confirm('Bu çalışanı silmek istediğinize emin misiniz?')) return
    await supabase.from('workers').delete().eq('id', id)
    setWorkers(prev => prev.filter(w => w.id !== id))
    toast.success('Çalışan silindi')
  }

  if (loading) return (
    <div className="min-h-screen bg-dark-400 flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-gold border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  const activeWorkerIds = sessions.map(s => s.worker_id)

  return (
    <div className="min-h-screen bg-dark-400">
      <div className="bg-dark-200 px-6 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button className="btn-ghost" onClick={() => navigate('/panel')}>← Panele Dön</button>
        <h1 className="font-black text-lg">Çalışan Yönetimi</h1>
        <button className="btn-gold" onClick={() => navigate('/kim-calisiyor')}>+ Çalışan Ekle</button>
      </div>

      <div className="p-6 max-w-4xl mx-auto space-y-6">

        {/* Şu an çalışanlar */}
        {sessions.length > 0 && (
          <div className="card">
            <h2 className="font-black text-base mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse inline-block"/>
              Şu An Çalışıyor ({sessions.length})
            </h2>
            <div className="flex flex-wrap gap-3">
              {sessions.map(s => (
                <div key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: '#2e2e2e', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="text-xl">{s.workers?.avatar_emoji || '👤'}</span>
                  <div>
                    <div className="text-sm font-bold">{s.workers?.full_name}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(s.started_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} başladı
                    </div>
                  </div>
                  <span className="w-2 h-2 bg-green-400 rounded-full ml-1"/>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Çalışan listesi */}
        <div className="card">
          <h2 className="font-black text-base mb-4">Tüm Çalışanlar</h2>
          {workers.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Henüz çalışan yok.</p>
          ) : (
            <div className="space-y-2">
              {workers.map(w => {
                const isOnline = activeWorkerIds.includes(w.id)
                return (
                  <div key={w.id} className="flex items-center justify-between px-4 py-3 rounded-xl"
                    style={{ background: '#2e2e2e', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                          style={{ background: w.avatar_color + '22', border: `2px solid ${w.avatar_color}` }}>
                          {w.avatar_emoji}
                        </div>
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-dark-100"/>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-sm flex items-center gap-2">
                          {w.full_name}
                          {!w.is_active && <span className="text-xs text-gray-500">(Pasif)</span>}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: roleColor[w.role] || '#888' }}>
                          {roleLabel[w.role] || w.role}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {w.last_seen_at && (
                        <span className="text-xs text-gray-500 hidden sm:block">
                          {isOnline ? '🟢 Online' : `Son: ${formatLastSeen(w.last_seen_at)}`}
                        </span>
                      )}
                      <button onClick={() => toggleWorker(w)}
                        className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                        style={{ background: w.is_active ? 'rgba(231,76,60,0.15)' : 'rgba(39,174,96,0.15)',
                                 color: w.is_active ? '#e74c3c' : '#27ae60',
                                 border: `1px solid ${w.is_active ? 'rgba(231,76,60,0.3)' : 'rgba(39,174,96,0.3)'}` }}>
                        {w.is_active ? 'Pasife Al' : 'Aktifleştir'}
                      </button>
                      <button onClick={() => deleteWorker(w.id)}
                        className="text-xs px-3 py-1.5 rounded-lg text-red-400 transition-colors hover:bg-red-500/10"
                        style={{ border: '1px solid rgba(231,76,60,0.2)' }}>
                        Sil
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Aktivite logu */}
        <div className="card">
          <h2 className="font-black text-base mb-4">Son Aktiviteler</h2>
          {logs.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Henüz aktivite yok.</p>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg"
                  style={{ background: '#2e2e2e' }}>
                  <div className="text-lg mt-0.5">{actionEmoji(log.action)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      <span className="font-bold text-gold">{log.worker_name}</span>
                      {' '}<span className="text-gray-300">{actionText(log.action)}</span>
                      {log.hive_no && <span className="font-bold text-white"> {log.hive_no}</span>}
                    </div>
                    {log.detail && <div className="text-xs text-gray-500 mt-0.5 truncate">{log.detail}</div>}
                    <div className="text-[10px] text-gray-600 mt-0.5">
                      {new Date(log.created_at).toLocaleString('tr-TR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function actionEmoji(action) {
  const map = { kovan_guncellendi:'📝', bakim_eklendi:'🔧', hasat_eklendi:'🍯', hastalik_eklendi:'💊', ana_ari_guncellendi:'👑' }
  return map[action] || '📌'
}
function actionText(action) {
  const map = { kovan_guncellendi:'güncelledi:', bakim_eklendi:'bakım ekledi:', hasat_eklendi:'hasat kaydetti:', hastalik_eklendi:'hastalık kaydetti:', ana_ari_guncellendi:'ana arı güncelledi:' }
  return map[action] || action + ':'
}
function formatLastSeen(d) {
  const m = Math.floor((Date.now() - new Date(d)) / 60000)
  if (m < 2) return 'Az önce'
  if (m < 60) return `${m}dk önce`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}sa önce`
  return `${Math.floor(h/24)}g önce`
}

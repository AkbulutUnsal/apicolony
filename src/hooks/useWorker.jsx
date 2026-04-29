import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const WorkerContext = createContext(null)

export function WorkerProvider({ children }) {
  const [activeWorker, setActiveWorker] = useState(null)
  const [sessionId, setSessionId] = useState(null)

  // localStorage'dan aktif çalışanı yükle
  useEffect(() => {
    const saved = localStorage.getItem('apicolony_worker')
    if (saved) {
      try { setActiveWorker(JSON.parse(saved)) } catch {}
    }
  }, [])

  async function selectWorker(worker, password) {
    if (worker.pin_or_pass !== password) throw new Error('Şifre hatalı')
    
    // Önceki session'ı kapat
    if (sessionId) await endSession()

    // Yeni session başlat
    const { data: session } = await supabase.from('worker_sessions').insert({
      worker_id: worker.id,
      owner_id: worker.owner_id,
      is_active: true
    }).select().single()

    // Son görülme güncelle
    await supabase.from('workers').update({ last_seen_at: new Date().toISOString() }).eq('id', worker.id)

    setActiveWorker(worker)
    setSessionId(session?.id)
    localStorage.setItem('apicolony_worker', JSON.stringify(worker))
    return true
  }

  async function endSession() {
    if (sessionId) {
      await supabase.from('worker_sessions')
        .update({ ended_at: new Date().toISOString(), is_active: false })
        .eq('id', sessionId)
    }
    setActiveWorker(null)
    setSessionId(null)
    localStorage.removeItem('apicolony_worker')
  }

  async function logActivity(ownerId, action, hiveId, hiveNo, detail) {
    await supabase.from('activity_logs').insert({
      owner_id: ownerId,
      worker_id: activeWorker?.id || null,
      worker_name: activeWorker?.full_name || 'Hesap Sahibi',
      action,
      hive_id: hiveId || null,
      hive_no: hiveNo || null,
      detail: detail || null
    })
  }

  return (
    <WorkerContext.Provider value={{ activeWorker, selectWorker, endSession, logActivity }}>
      {children}
    </WorkerContext.Provider>
  )
}

export const useWorker = () => useContext(WorkerContext)

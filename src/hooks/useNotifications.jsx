import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const NotifContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const readIds = JSON.parse(localStorage.getItem('apicolony_read_notifs') || '[]')

  useEffect(() => { if (user) generateNotifications() }, [user])

  async function generateNotifications() {
    const { data: hives } = await supabase
      .from('hives').select('*').eq('user_id', user.id).eq('status', 'aktif')
    const { data: queens } = await supabase
      .from('queens').select('*, hives(hive_no)').eq('is_current', true)
      .in('hive_id', (hives || []).map(h => h.id))

    const notifs = []
    const now = Date.now()

    for (const hive of hives || []) {
      // Hiç bakım yapılmamış
      if (!hive.last_inspection_date) {
        notifs.push({
          id: `no-inspection-${hive.id}`,
          type: 'critical',
          icon: '🔴',
          title: `${hive.hive_no} hiç incelenmedi`,
          desc: 'Bu kovana henüz bakım kaydı girilmedi.',
          hive_id: hive.id,
          hive_no: hive.hive_no,
          created_at: new Date().toISOString(),
        })
        continue
      }

      const daysSince = Math.floor((now - new Date(hive.last_inspection_date)) / 86400000)

      // 30+ gün bakım yapılmamış
      if (daysSince >= 30) {
        notifs.push({
          id: `overdue-${hive.id}`,
          type: 'warning',
          icon: '🟡',
          title: `${hive.hive_no} bakım zamanı geçti`,
          desc: `Son bakımdan bu yana ${daysSince} gün geçti.`,
          hive_id: hive.id,
          hive_no: hive.hive_no,
          created_at: new Date().toISOString(),
        })
      }

      // Bal stoğu kritik
      if (hive.honey_stock_kg !== null && hive.honey_stock_kg <= 3) {
        notifs.push({
          id: `honey-low-${hive.id}`,
          type: 'critical',
          icon: '🍯',
          title: `${hive.hive_no} bal stoğu kritik`,
          desc: `Bal stoğu ${hive.honey_stock_kg} kg — besleme gerekebilir.`,
          hive_id: hive.id,
          hive_no: hive.hive_no,
          created_at: new Date().toISOString(),
        })
      }

      // Koloni sönmüş
      if (hive.brood_status === 'Yok') {
        notifs.push({
          id: `dormant-${hive.id}`,
          type: 'critical',
          icon: '💀',
          title: `${hive.hive_no} koloni sönmüş`,
          desc: 'Kuluçka yok. Kovanı kontrol et.',
          hive_id: hive.id,
          hive_no: hive.hive_no,
          created_at: new Date().toISOString(),
        })
      }
    }

    // Ana arı değişim zamanı (1 yıl+)
    for (const q of queens || []) {
      if (!q.replacement_date) continue
      const daysUntil = Math.floor((new Date(q.replacement_date) - now) / 86400000)
      if (daysUntil <= 14 && daysUntil >= 0) {
        notifs.push({
          id: `queen-change-${q.id}`,
          type: 'info',
          icon: '👑',
          title: `${q.hives?.hive_no} ana arı değişimi yaklaşıyor`,
          desc: `${daysUntil} gün içinde ana arı değişimi planlandı.`,
          hive_id: q.hive_id,
          hive_no: q.hives?.hive_no,
          created_at: new Date().toISOString(),
        })
      } else if (daysUntil < 0) {
        notifs.push({
          id: `queen-overdue-${q.id}`,
          type: 'warning',
          icon: '👑',
          title: `${q.hives?.hive_no} ana arı değişimi gecikti`,
          desc: `Ana arı değişimi ${Math.abs(daysUntil)} gün gecikmeli.`,
          hive_id: q.hive_id,
          hive_no: q.hives?.hive_no,
          created_at: new Date().toISOString(),
        })
      }
    }

    // Max 20 bildirim, critical önce
    const sorted = notifs.sort((a,b) => {
      const order = { critical:0, warning:1, info:2 }
      return (order[a.type]||3) - (order[b.type]||3)
    }).slice(0, 20)

    setNotifications(sorted)
    setUnreadCount(sorted.filter(n => !readIds.includes(n.id)).length)
  }

  function markAllRead() {
    const allIds = notifications.map(n => n.id)
    localStorage.setItem('apicolony_read_notifs', JSON.stringify(allIds))
    setUnreadCount(0)
  }

  function markRead(id) {
    const newIds = [...readIds, id]
    localStorage.setItem('apicolony_read_notifs', JSON.stringify(newIds))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  return (
    <NotifContext.Provider value={{ notifications, unreadCount, markAllRead, markRead, refresh: generateNotifications }}>
      {children}
    </NotifContext.Provider>
  )
}

export const useNotifications = () => useContext(NotifContext)

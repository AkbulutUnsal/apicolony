import { createContext, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const NotifContext = createContext(null)

export function NotificationProvider({ children }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const readIds = JSON.parse(localStorage.getItem('apicolony_read_notifs') || '[]')

  useEffect(() => { if (user) generateNotifications() }, [user])

  async function generateNotifications() {
    const { data: hives } = await supabase
      .from('hives').select('*').eq('user_id', user.id).eq('status', 'aktif')
    const hiveIds = (hives || []).map(h => h.id)
    const [queensRes, treatmentRes] = await Promise.all([
      supabase.from('queens').select('*, hives(hive_no)').eq('is_current', true)
        .in('hive_id', hiveIds.length > 0 ? hiveIds : ['none']),
      hiveIds.length > 0
        ? supabase.from('treatment_records').select('*, hives(hive_no)')
            .in('hive_id', hiveIds).not('repeat_date', 'is', null)
            .gte('repeat_date', new Date().toISOString().slice(0, 10))
            .lte('repeat_date', new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10))
        : Promise.resolve({ data: [] })
    ])
    const queens = queensRes.data || []
    const upcomingTreatments = treatmentRes.data || []

    const notifs = []
    const now = Date.now()

    for (const hive of hives || []) {
      // Hiç bakım yapılmamış
      if (!hive.last_inspection_date) {
        notifs.push({
          id: `no-inspection-${hive.id}`,
          type: 'critical',
          icon: '🔴',
          title: t('notif.no_inspection_title', { hive: hive.hive_no }),
          desc: t('notif.no_inspection_desc'),
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
          title: t('notif.overdue_title', { hive: hive.hive_no }),
          desc: t('notif.overdue_desc', { days: daysSince }),
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
          title: t('notif.honey_low_title', { hive: hive.hive_no }),
          desc: t('notif.honey_low_desc', { kg: hive.honey_stock_kg }),
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
          title: t('notif.dormant_title', { hive: hive.hive_no }),
          desc: t('notif.dormant_desc'),
          hive_id: hive.id,
          hive_no: hive.hive_no,
          created_at: new Date().toISOString(),
        })
      }
    }

    // Yaklaşan tekrar tedaviler
    for (const tr of upcomingTreatments) {
      const daysUntil = Math.ceil((new Date(tr.repeat_date) - Date.now()) / 86400000)
      notifs.push({
        id: `treatment-repeat-${t.id}`,
        type: daysUntil <= 2 ? 'critical' : 'warning',
        icon: '💊',
        title: t('notif.treatment_repeat_title', { hive: tr.hives?.hive_no || t('reports.col_hive') }),
        desc: `${tr.disease_type} — ${tr.product_name || t('notif.treatment_word')} ${daysUntil <= 0 ? t('notif.today_excl') : t('notif.within_days', { days: daysUntil })}`,
        hive_id: tr.hive_id,
        hive_no: tr.hives?.hive_no,
        created_at: new Date().toISOString(),
      })
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
          title: t('notif.queen_change_title', { hive: q.hives?.hive_no }),
          desc: t('notif.queen_change_desc', { days: daysUntil }),
          hive_id: q.hive_id,
          hive_no: q.hives?.hive_no,
          created_at: new Date().toISOString(),
        })
      } else if (daysUntil < 0) {
        notifs.push({
          id: `queen-overdue-${q.id}`,
          type: 'warning',
          icon: '👑',
          title: t('notif.queen_overdue_title', { hive: q.hives?.hive_no }),
          desc: t('notif.queen_overdue_desc', { days: Math.abs(daysUntil) }),
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

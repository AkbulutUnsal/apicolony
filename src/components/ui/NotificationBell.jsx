import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '../../hooks/useNotifications'

const typeColors = {
  critical: { bg: 'rgba(231,76,60,0.12)', border: 'rgba(231,76,60,0.3)', dot: '#e74c3c' },
  warning:  { bg: 'rgba(230,126,34,0.12)', border: 'rgba(230,126,34,0.3)', dot: '#e67e22' },
  info:     { bg: 'rgba(52,152,219,0.12)', border: 'rgba(52,152,219,0.3)', dot: '#3498db' },
}

export default function NotificationBell() {
  const { t } = useTranslation()
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const readIds = JSON.parse(localStorage.getItem('apicolony_read_notifs') || '[]')

  function handleClick(notif) {
    markRead(notif.id)
    setOpen(false)
    if (notif.hive_id) navigate(`/kovan/${notif.hive_id}`)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-dark-50"
        style={{ background: '#2e2e2e', border: '1px solid rgba(255,255,255,0.1)' }}>
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-black text-white flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}/>
          <div className="absolute right-0 top-11 w-80 max-h-[480px] flex flex-col rounded-xl z-50 shadow-2xl overflow-hidden"
            style={{ background: '#242424', border: '1px solid rgba(255,255,255,0.12)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <span className="font-black text-sm">{t('notif_bell.title')}</span>
                {unreadCount > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-red-500 rounded text-[10px] font-bold text-white">
                    {t('notif_bell.new_count', { count: unreadCount })}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllRead}
                  className="text-xs text-gold hover:underline">
                  {t('notif_bell.mark_all_read')}
                </button>
              )}
            </div>

            {/* Liste */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <span className="text-3xl mb-2">✅</span>
                  <span className="text-sm">{t('notif_bell.no_notifications')}</span>
                </div>
              ) : (
                notifications.map(notif => {
                  const isRead = readIds.includes(notif.id)
                  const colors = typeColors[notif.type] || typeColors.info
                  return (
                    <div key={notif.id}
                      onClick={() => handleClick(notif)}
                      className="px-4 py-3 cursor-pointer transition-colors hover:bg-white/5 flex gap-3 items-start"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)',
                               opacity: isRead ? 0.55 : 1 }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base mt-0.5"
                        style={{ background: colors.bg, border: `1px solid ${colors.border}` }}>
                        {notif.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-bold leading-tight">{notif.title}</span>
                          {!isRead && (
                            <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                              style={{ background: colors.dot }}/>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{notif.desc}</p>
                        {notif.hive_no && (
                          <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded font-bold"
                            style={{ background: colors.bg, color: colors.dot }}>
                            {notif.hive_no} →
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 flex-shrink-0 text-center"
                style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-xs text-gray-500">
                  {t('notif_bell.footer_count', { count: notifications.length })}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

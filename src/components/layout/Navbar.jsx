import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { useWorker } from '../../hooks/useWorker'
import HexLogo from '../ui/HexLogo'
import NotificationBell from '../ui/NotificationBell'

const LANGUAGES = [
  { code: 'tr', label: 'TR 🇹🇷' },
  { code: 'ka', label: 'GE 🇬🇪' },
]

export default function Navbar({ onAddHive, addingHive }) {
  const { profile, signOut } = useAuth()
  const { activeWorker, endSession } = useWorker()
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)

  const displayName = activeWorker?.full_name || profile?.full_name || 'Kullanıcı'
  const displayRole = activeWorker
    ? ({ yardimci: 'Yardımcı', cirak: 'Çırak', sofor: 'Şoför' }[activeWorker.role] || activeWorker.role)
    : 'Arıcı'

  const navLinks = [
    { path: '/dashboard', label: t('nav.dashboard') },
    { path: '/panel', label: t('nav.hives') },
    { path: '/arliklar', label: t('nav.apiaries') },
    { path: '/besleme', label: t('nav.feeding') },
    { path: '/tedavi', label: t('nav.treatment') },
    { path: '/hasat', label: t('nav.harvest') },
    { path: '/partiler', label: t('nav.batches') },
    { path: '/finans', label: t('nav.finance') },
    { path: '/raporlar', label: t('nav.reports') },
    { path: '/ai', label: t('nav.ai') },
    { path: '/calisanlar', label: t('nav.workers') },
  ]

  async function handleSignOut() {
    if (activeWorker) await endSession()
    await signOut()
    navigate('/giris')
  }

  function switchLang(code) {
    i18n.changeLanguage(code)
    localStorage.setItem('apicolony_lang', code)
  }

  const currentLang = i18n.language || 'tr'

  return (
    <nav className="bg-dark-200 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="h-[60px] flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5 text-lg font-black cursor-pointer"
            onClick={() => navigate('/dashboard')}>
            <HexLogo size={30} />
            ApiColony
          </div>
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <button key={link.path} onClick={() => navigate(link.path)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  location.pathname === link.path
                    ? 'bg-gold/15 text-gold'
                    : 'text-gray-400 hover:text-white hover:bg-dark-50'
                }`}>
                {link.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onAddHive && (
            <button className="btn-gold text-sm flex" onClick={onAddHive} disabled={addingHive}>
              {addingHive ? '⏳' : '+'} Yeni Kovan
            </button>
          )}
          <button className="btn-ghost text-sm hidden sm:flex" onClick={() => navigate('/tara')}>
            📷 Tara
          </button>
          <button className="md:hidden btn-ghost px-2.5" onClick={() => setOpen(!open)}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <rect y="3" width="20" height="2" rx="1" />
              <rect y="9" width="20" height="2" rx="1" />
              <rect y="15" width="20" height="2" rx="1" />
            </svg>
          </button>

          <NotificationBell />

          <div className="relative">
            <button onClick={() => setOpen(!open)}
              className="flex items-center gap-2 bg-dark-100 rounded-lg px-3 py-1.5 hover:bg-dark-50 transition-colors cursor-pointer"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="relative">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black"
                  style={{
                    background: activeWorker?.avatar_color ? activeWorker.avatar_color + '33' : '#f5c51822',
                    border: `2px solid ${activeWorker?.avatar_color || '#f5c518'}`
                  }}>
                  {activeWorker?.avatar_emoji || profile?.full_name?.charAt(0) || '🐝'}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full"
                  style={{ border: '2px solid #242424' }} />
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold leading-tight">{displayName}</div>
                <div className="text-[10px] text-gray-400 leading-tight">{displayRole}</div>
              </div>
            </button>

            {open && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                <div className="absolute right-0 top-12 bg-dark-100 rounded-xl min-w-[220px] z-50 overflow-hidden shadow-2xl"
                  style={{ border: '1px solid rgba(255,255,255,0.15)' }}>

                  <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="font-bold text-sm">{displayName}</div>
                    <div className="text-xs text-gold mt-0.5">{displayRole} · 🟢 Aktif</div>
                  </div>

                  {/* Dil Seçici */}
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Dil / Language</div>
                    <div className="flex gap-2">
                      {LANGUAGES.map(lang => (
                        <button
                          key={lang.code}
                          onClick={() => switchLang(lang.code)}
                          className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
                          style={currentLang === lang.code
                            ? { background: 'rgba(245,197,24,0.2)', color: '#f5c518', border: '1px solid rgba(245,197,24,0.4)' }
                            : { background: 'rgba(255,255,255,0.06)', color: '#888', border: '1px solid rgba(255,255,255,0.1)' }
                          }>
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="py-1">
                    <button onClick={() => { navigate('/kim-calisiyor'); setOpen(false) }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-dark-50 hover:text-white flex items-center gap-2 transition-colors">
                      🔄 Çalışan Değiştir
                    </button>
                    <button onClick={handleSignOut}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-dark-50 flex items-center gap-2 transition-colors">
                      ↩ Çıkış Yap
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

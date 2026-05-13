import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  {
    code: 'tr',
    label: 'TR',
    flag: (
      <svg viewBox="0 0 30 20" width="22" height="15" xmlns="http://www.w3.org/2000/svg">
        <rect width="30" height="20" fill="#E30A17"/>
        <circle cx="10" cy="10" r="6" fill="white"/>
        <circle cx="11.5" cy="10" r="4.8" fill="#E30A17"/>
        <polygon points="16,10 19.5,8.2 18.5,10 19.5,11.8" fill="white"/>
      </svg>
    )
  },
  {
    code: 'ka',
    label: 'GE',
    flag: (
      <svg viewBox="0 0 30 20" width="22" height="15" xmlns="http://www.w3.org/2000/svg">
        <rect width="30" height="20" fill="white"/>
        <rect x="13" y="0" width="4" height="20" fill="#FF0000"/>
        <rect x="0" y="8" width="30" height="4" fill="#FF0000"/>
        <rect x="2" y="2" width="4" height="4" fill="#FF0000"/>
        <rect x="24" y="2" width="4" height="4" fill="#FF0000"/>
        <rect x="2" y="14" width="4" height="4" fill="#FF0000"/>
        <rect x="24" y="14" width="4" height="4" fill="#FF0000"/>
      </svg>
    )
  }
]

export default function LanguageSwitcher({ compact = false }) {
  const { i18n } = useTranslation()
  const current = i18n.language || 'tr'

  function switchTo(code) {
    i18n.changeLanguage(code)
  }

  if (compact) {
    // Navbar'da tek buton — mevcut dili göster, tıklayınca diğerine geç
    const next = LANGUAGES.find(l => l.code !== current) || LANGUAGES[0]
    return (
      <button
        onClick={() => switchTo(next.code)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        title={`Switch to ${next.label}`}
      >
        {LANGUAGES.find(l => l.code === current)?.flag}
        <span className="text-xs font-bold text-gray-300">{current.toUpperCase()}</span>
      </button>
    )
  }

  // Tam liste (settings sayfası için)
  return (
    <div className="flex gap-2">
      {LANGUAGES.map(lang => (
        <button
          key={lang.code}
          onClick={() => switchTo(lang.code)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all font-semibold text-sm"
          style={current === lang.code
            ? { background: 'rgba(245,197,24,0.2)', border: '1px solid rgba(245,197,24,0.4)', color: '#f5c518' }
            : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#888' }
          }
        >
          {lang.flag}
          {lang.label}
          {current === lang.code && <span className="text-xs">✓</span>}
        </button>
      ))}
    </div>
  )
}

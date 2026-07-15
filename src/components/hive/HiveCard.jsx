export default function HiveCard({ hive, onClick }) {
  const status = getStatus(hive)
  const superCount = hive.super_count || 0
  const supersToShow = Math.min(superCount, 3)

  const themes = {
    new:      { body: '#c0392b', shade: '#962d22', dark: '#7b2418', entry: '#5c1a10', wood: '#6b4226', woodDark: '#4a2e14', text: '#ffd5d0' },
    critical: { body: '#c0392b', shade: '#962d22', dark: '#7b2418', entry: '#5c1a10', wood: '#6b4226', woodDark: '#4a2e14', text: '#ffd5d0' },
    warning:  { body: '#d4820a', shade: '#a8660a', dark: '#7a4a06', entry: '#5a3504', wood: '#6b4226', woodDark: '#4a2e14', text: '#fff0c0' },
    healthy:  { body: '#27814a', shade: '#1e6338', dark: '#154d2b', entry: '#0e3a1f', wood: '#6b4226', woodDark: '#4a2e14', text: '#c8ffd8' },
    dormant:  { body: '#555555', shade: '#404040', dark: '#2e2e2e', entry: '#1e1e1e', wood: '#4a4a4a', woodDark: '#333333', text: '#cccccc' },
  }
  const t = themes[status] || themes.new

  // Ballık (süper) kutuları: gerçek kovanlarda olduğu gibi gövdeyle aynı
  // genişlikte, çatının altına, ana gövdenin üstüne oturan kutular.
  const gold = { body: '#fbbf24', shade: '#d69e0a', dark: '#a16207', line: '#78350f' }
  const superHeight = 17
  const roofShift = supersToShow * superHeight // çatıyı bu kadar yukarı kaydırıyoruz
  const bodyTop = 28 // ana gövdenin sabit üst noktası
  const minY = -roofShift
  const viewBoxHeight = 86 - minY

  return (
    <div className="hive-card group" onClick={onClick}>
      <svg viewBox={`0 ${minY} 80 ${viewBoxHeight}`} xmlns="http://www.w3.org/2000/svg"
        className="w-full transition-transform duration-150 group-hover:scale-105"
        style={{ maxWidth: 88 }}>

        {/* ── ÇATI + KAPAK (yukarı kaymış) ── */}
        <g transform={`translate(0, ${-roofShift})`}>
          {/* Çatı gölge */}
          <rect x="1" y="11" width="78" height="13" rx="3" fill={t.dark}/>
          {/* Çatı ana */}
          <rect x="1" y="9" width="78" height="11" rx="3" fill={t.shade}/>
          {/* Çatı üst parlak şerit */}
          <rect x="1" y="9" width="78" height="4" rx="3" fill={t.body}/>
          {/* Çatı yan çıtalar */}
          <rect x="1"  y="9" width="6" height="11" rx="1" fill={t.dark}/>
          <rect x="73" y="9" width="6" height="11" rx="1" fill={t.dark}/>

          {/* Üçüncü kat (kapak) */}
          <rect x="3" y="20" width="74" height="9" rx="2" fill={t.shade}/>
          <rect x="3" y="20" width="74" height="3" rx="2" fill={t.body}/>
          <rect x="3" y="20" width="4" height="9" rx="1" fill={t.dark}/>
          <rect x="73" y="20" width="4" height="9" rx="1" fill={t.dark}/>
        </g>

        {/* ── BALLIKLAR (Süper kutuları) ── */}
        {Array.from({ length: supersToShow }).map((_, i) => {
          const y = bodyTop - (supersToShow - i) * superHeight
          const isLast = i === supersToShow - 1
          return (
            <g key={i}>
              {/* Arka panel */}
              <rect x="3" y={y} width="74" height={superHeight} rx="2" fill={gold.dark}/>
              {/* Sol / sağ çıta */}
              <rect x="3"  y={y} width="6" height={superHeight} rx="1" fill={gold.shade}/>
              <rect x="71" y={y} width="6" height={superHeight} rx="1" fill={gold.shade}/>
              {/* Orta panel */}
              <rect x="9" y={y} width="62" height={superHeight} rx="1" fill={gold.shade}/>
              {/* Üst parlak kenar */}
              <rect x="3" y={y} width="74" height="3" rx="1" fill={gold.body}/>
              {/* Ayraç çizgisi (kutular arası) */}
              {!isLast && <rect x="3" y={y + superHeight - 1} width="74" height="1" fill={gold.line} opacity="0.6"/>}
            </g>
          )
        })}
        {superCount > 3 && (
          <g>
            <circle cx="71" cy={-roofShift + 6} r="7" fill={gold.body} stroke={gold.line} strokeWidth="1"/>
            <text x="71" y={-roofShift + 9} textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#3b2400">
              +{superCount - 3}
            </text>
          </g>
        )}

        {/* ── ANA GÖVDE ── */}
        {/* Arka panel */}
        <rect x="3" y="28" width="74" height="38" rx="2" fill={t.dark}/>
        {/* Sol çıta */}
        <rect x="3"  y="28" width="7" height="38" rx="1" fill={t.shade}/>
        {/* Sağ çıta */}
        <rect x="70" y="28" width="7" height="38" rx="1" fill={t.shade}/>
        {/* Orta panel (çerçeve alanı) */}
        <rect x="10" y="28" width="60" height="38" rx="1" fill={t.shade}/>
        {/* Langstroth yatay çerçeve çizgileri */}
        <rect x="10" y="37" width="60" height="2" rx="1" fill={t.dark} opacity="0.7"/>
        <rect x="10" y="47" width="60" height="2" rx="1" fill={t.dark} opacity="0.7"/>
        <rect x="10" y="57" width="60" height="2" rx="1" fill={t.dark} opacity="0.7"/>
        {/* Üst parlak kenar */}
        <rect x="3" y="28" width="74" height="3" rx="1" fill={t.body} opacity="0.5"/>

        {/* ── KOVAN NO ETİKETİ ── */}
        <rect x="12" y="31" width="56" height="16" rx="2" fill="rgba(0,0,0,0.3)"/>
        <text x="40" y="43" textAnchor="middle" fill={t.text}
          fontSize="9.5" fontWeight="800" fontFamily="Nunito,sans-serif" letterSpacing="0.3">
          {hive.hive_no}
        </text>

        {/* ── GİRİŞ / UÇUŞ TAHTASI ── */}
        {/* Giriş deliği arka fon */}
        <rect x="10" y="62" width="60" height="6" rx="1" fill={t.dark}/>
        {/* Giriş deliği */}
        <rect x="18" y="63" width="44" height="4" rx="1" fill="#0d0703"/>
        {/* Uçuş tahtası */}
        <rect x="6" y="67" width="68" height="4" rx="1" fill={t.entry}/>
        {/* Tahtanın alt şeridi */}
        <rect x="6" y="69" width="68" height="2" rx="1" fill={t.dark}/>

        {/* ── PLATFORM / AYAKLAR ── */}
        <rect x="4" y="71" width="72" height="5" rx="1.5" fill={t.wood}/>
        <rect x="0" y="76" width="80" height="3" rx="1" fill={t.woodDark}/>
        {/* Sol ayak */}
        <rect x="6"  y="79" width="16" height="7" rx="1.5" fill={t.wood}/>
        <rect x="7"  y="84" width="14" height="2" rx="1" fill={t.woodDark}/>
        {/* Sağ ayak */}
        <rect x="58" y="79" width="16" height="7" rx="1.5" fill={t.wood}/>
        <rect x="59" y="84" width="14" height="2" rx="1" fill={t.woodDark}/>
      </svg>
      <span className="hive-label-text mt-1">{hive.hive_no}</span>
    </div>
  )
}

function getStatus(hive) {
  // brood_status kontrolü
  if (hive.brood_status === 'Yok') return 'dormant'

  // color_status DB değerlerine göre
  if (hive.color_status === 'dormant') return 'dormant'
  if (hive.color_status === 'danger')  return 'critical'
  if (hive.color_status === 'warning') return 'warning'
  if (hive.color_status === 'healthy') return 'healthy'

  // color_status 'normal' veya boş ise otomatik hesapla
  if (!hive.last_inspection_date && !hive.inspection_date) return 'new'
  if (hive.honey_stock_kg <= 3) return 'critical'

  const inspDate = hive.last_inspection_date || hive.inspection_date
  const daysSince = inspDate
    ? Math.floor((Date.now() - new Date(inspDate)) / 86400000)
    : 999

  if (daysSince >= 30 || hive.honey_stock_kg <= 6) return 'warning'
  return 'healthy'
}

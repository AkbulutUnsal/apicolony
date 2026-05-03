import { useWeather } from '../../hooks/useWeather'

function ScoreBar({ score }) {
  const color = score >= 70 ? '#27ae60' : score >= 40 ? '#e67e22' : '#e74c3c'
  const label = score >= 70 ? 'İdeal' : score >= 40 ? 'Dikkatli ol' : 'Bakım Yapma!'
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-gray-400 font-semibold">🐝 Arıcılık Skoru</span>
        <span className="font-black" style={{ color }}>{score}/100 · {label}</span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#333' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: color }}/>
      </div>
    </div>
  )
}

const DAY_NAMES = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt']
const WMO_EMOJI = {
  0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',
  51:'🌦️',53:'🌦️',55:'🌧️',61:'🌧️',63:'🌧️',65:'🌧️',
  71:'❄️',73:'❄️',75:'❄️',80:'🌦️',81:'🌧️',82:'⛈️',
  95:'⛈️',96:'⛈️',99:'⛈️'
}

export default function WeatherWidget({ compact = false }) {
  const { weather, loading, error, locationDenied, retryLocation } = useWeather()

  if (loading) return (
    <div className="card animate-pulse" style={{ minHeight: compact ? 56 : 200 }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-dark-50"/>
        <div className="flex-1">
          <div className="h-3 bg-dark-50 rounded w-24 mb-2"/>
          <div className="h-2 bg-dark-50 rounded w-16"/>
        </div>
      </div>
    </div>
  )

  if (locationDenied) return (
    <div className="card flex items-center gap-3 py-3">
      <span className="text-2xl">📍</span>
      <div className="flex-1">
        <div className="text-sm font-bold" style={{ color: '#e67e22' }}>Konum izni gerekli</div>
        <div className="text-xs text-gray-400 mt-0.5">Doğru hava durumu için tarayıcıdan konum izni verin</div>
      </div>
      <button onClick={retryLocation}
        className="text-xs font-bold px-3 py-1.5 rounded-lg"
        style={{ background: 'rgba(245,197,24,0.15)', color: '#f5c518', border: '1px solid rgba(245,197,24,0.3)' }}>
        İzin Ver →
      </button>
    </div>
  )

  if (error || !weather) return (
    <div className="card text-sm text-gray-500 flex items-center gap-2">
      🌤️ <span>Hava durumu alınamadı</span>
    </div>
  )

  if (compact) return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ background: '#2a2a2a', border: '1px solid rgba(255,255,255,0.07)' }}>
      <span className="text-2xl">{weather.emoji}</span>
      <div className="flex-1">
        <div className="font-bold text-sm">
          {weather.temp}°C
          <span className="text-gray-400 font-normal text-xs ml-2">{weather.city}</span>
        </div>
        <div className="text-xs text-gray-400">{weather.description}</div>
      </div>
      <div className="text-right">
        <div className="text-xs font-black" style={{
          color: weather.beekeepingScore >= 70 ? '#27ae60' : weather.beekeepingScore >= 40 ? '#e67e22' : '#e74c3c'
        }}>
          {weather.beekeepingScore >= 70 ? '✅ İdeal' : weather.beekeepingScore >= 40 ? '⚠️ Dikkat' : '🚫 Dur'}
        </div>
        <div className="text-[10px] text-gray-500">💨 {weather.wind} km/h · 💧 {weather.humidity}%</div>
      </div>
    </div>
  )

  return (
    <div className="card">
      {/* Başlık */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="font-black text-base flex items-center gap-2">
            {weather.emoji} Hava Durumu
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">📍 {weather.city}</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-black">{weather.temp}°C</div>
          <div className="text-xs text-gray-400">Hissedilen {weather.feelsLike}°C</div>
        </div>
      </div>

      {/* Detay kartları */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          ['💨', 'Rüzgar', `${weather.wind} km/h`],
          ['💧', 'Nem', `%${weather.humidity}`],
          ['🌧️', 'Yağış', `${weather.rain} mm`],
        ].map(([icon, label, value]) => (
          <div key={label} className="text-center p-2.5 rounded-xl"
            style={{ background: '#2a2a2a' }}>
            <div className="text-xl mb-0.5">{icon}</div>
            <div className="text-[10px] text-gray-400 mb-0.5">{label}</div>
            <div className="text-sm font-black">{value}</div>
          </div>
        ))}
      </div>

      {/* Arıcılık skoru */}
      <div className="mb-4">
        <ScoreBar score={weather.beekeepingScore} />
      </div>

      {/* İpuçları */}
      <div className="space-y-1.5 mb-5 p-3 rounded-xl" style={{ background: '#2a2a2a' }}>
        {weather.tips.map((tip, i) => (
          <div key={i} className="text-xs text-gray-300 leading-relaxed">{tip}</div>
        ))}
      </div>

      {/* 5 günlük tahmin */}
      <div className="grid grid-cols-5 gap-1"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12 }}>
        {weather.daily.map((d, i) => {
          const date = new Date(d.date)
          return (
            <div key={i} className="text-center">
              <div className="text-[10px] text-gray-500 mb-1">
                {i === 0 ? 'Bugün' : DAY_NAMES[date.getDay()]}
              </div>
              <div className="text-lg">{WMO_EMOJI[d.code] || '🌤️'}</div>
              <div className="text-[11px] font-black text-white">{d.temp_max}°</div>
              <div className="text-[10px] text-gray-500">{d.temp_min}°</div>
            </div>
          )
        })}
      </div>

      <div className="text-[10px] text-gray-600 text-right mt-3">
        Open-Meteo · {weather.updatedAt.toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit' })} güncellendi
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

// Open-Meteo - tamamen ücretsiz, API key yok!
// https://open-meteo.com/

const WMO_KEYS = {
  0:'weather.wmo_0',1:'weather.wmo_1',2:'weather.wmo_2',3:'weather.wmo_3',
  45:'weather.wmo_45',48:'weather.wmo_48',
  51:'weather.wmo_51',53:'weather.wmo_53',55:'weather.wmo_55',
  61:'weather.wmo_61',63:'weather.wmo_63',65:'weather.wmo_65',
  71:'weather.wmo_71',73:'weather.wmo_73',75:'weather.wmo_75',77:'weather.wmo_77',
  80:'weather.wmo_80',81:'weather.wmo_81',82:'weather.wmo_82',
  85:'weather.wmo_85',86:'weather.wmo_86',
  95:'weather.wmo_95',96:'weather.wmo_96',99:'weather.wmo_99'
}

const WMO_EMOJI = {
  0:'☀️',1:'🌤️',2:'⛅',3:'☁️',
  45:'🌫️',48:'🌫️',
  51:'🌦️',53:'🌦️',55:'🌧️',
  61:'🌧️',63:'🌧️',65:'🌧️',
  71:'❄️',73:'❄️',75:'❄️',77:'❄️',
  80:'🌦️',81:'🌧️',82:'⛈️',
  95:'⛈️',96:'⛈️',99:'⛈️'
}

export function useWeather() {
  const { t, i18n } = useTranslation()
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [locationDenied, setLocationDenied] = useState(false)

  useEffect(() => { getLocationAndFetch() }, [])

  async function getLocationAndFetch() {
    setLoading(true)
    setLocationDenied(false)

    // GPS dene, 5 saniyede gelmezse IP konumuna geç
    const gpsResult = await new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return }
      const timer = setTimeout(() => resolve(null), 5000)
      navigator.geolocation.getCurrentPosition(
        pos => { clearTimeout(timer); resolve(pos) },
        () => { clearTimeout(timer); resolve(null) },
        { timeout: 5000, maximumAge: 60000, enableHighAccuracy: false }
      )
    })

    if (gpsResult) {
      await fetchWeather(gpsResult.coords.latitude, gpsResult.coords.longitude)
      return
    }

    // GPS olmadı — IP tabanlı konuma geç
    try {
      const ipRes = await fetch('https://ipapi.co/json/')
      const ipData = await ipRes.json()
      if (ipData.latitude && ipData.longitude) {
        await fetchWeather(ipData.latitude, ipData.longitude, ipData.city || ipData.region)
      } else {
        setError(t('weather.location_error'))
        setLoading(false)
      }
    } catch {
      setError(t('weather.location_error'))
      setLoading(false)
    }
  }

  function retryLocation() {
    getLocationAndFetch()
  }

  async function fetchWeather(lat, lon, fallbackCity = null) {
    try {
      // Open-Meteo API - ücretsiz, key yok
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,weather_code` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset` +
        `&timezone=auto&forecast_days=5`

      const res = await fetch(url)
      const data = await res.json()

      if (!data.current) throw new Error(t('weather.data_error'))

      // Şehir adı için reverse geocoding (ücretsiz)
      let city = fallbackCity || t('weather.your_location')
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=${i18n.language}`
        )
        const geoData = await geoRes.json()
        city = geoData.address?.city || geoData.address?.town || geoData.address?.village || city
      } catch {}

      const temp = Math.round(data.current.temperature_2m)
      const feelsLike = Math.round(data.current.apparent_temperature)
      const humidity = data.current.relative_humidity_2m
      const wind = Math.round(data.current.wind_speed_10m)
      const rain = data.current.precipitation
      const code = data.current.weather_code

      // Arıcılık skoru hesapla
      let score = 100
      const tips = []

      if (temp < 10) { score -= 40; tips.push('❄️ ' + t('weather.tip_cold')) }
      else if (temp < 15) { score -= 20; tips.push('🧥 ' + t('weather.tip_cool')) }
      else if (temp > 35) { score -= 15; tips.push('🌡️ ' + t('weather.tip_hot')) }
      else if (temp >= 18 && temp <= 28) tips.push('🌡️ ' + t('weather.tip_ideal_temp'))

      if (wind > 20) { score -= 25; tips.push('💨 ' + t('weather.tip_strong_wind')) }
      else if (wind > 10) { score -= 10; tips.push('💨 ' + t('weather.tip_medium_wind')) }

      if (rain > 0.5) { score -= 50; tips.push('🌧️ ' + t('weather.tip_rain')) }
      else if (rain > 0) { score -= 20; tips.push('🌦️ ' + t('weather.tip_light_rain')) }

      if ([95,96,99].includes(code)) { score -= 60; tips.push('⛈️ ' + t('weather.tip_storm')) }
      if (humidity > 85) { score -= 10; tips.push('💧 ' + t('weather.tip_high_humidity')) }

      if (tips.length === 0 || (tips.length === 1 && tips[0].includes(t('weather.tip_ideal_temp')))) {
        tips.push('✅ ' + t('weather.tip_perfect'))
      }

      score = Math.max(0, Math.min(100, score))

      // 5 günlük tahmin
      const daily = data.daily.time.map((date, i) => ({
        date,
        temp_max: Math.round(data.daily.temperature_2m_max[i]),
        temp_min: Math.round(data.daily.temperature_2m_min[i]),
        code: data.daily.weather_code[i],
        rain: data.daily.precipitation_sum[i],
        sunrise: data.daily.sunrise[i],
        sunset: data.daily.sunset[i],
      }))

      setWeather({
        city,
        temp,
        feelsLike,
        humidity,
        wind,
        rain,
        code,
        description: t(WMO_KEYS[code] || 'reports.unknown'),
        emoji: WMO_EMOJI[code] || '🌤️',
        beekeepingScore: score,
        tips,
        daily,
        updatedAt: new Date()
      })
    } catch (err) {
      setError(t('weather.fetch_error'))
    } finally {
      setLoading(false)
    }
  }

  return { weather, loading, error, locationDenied, retryLocation }
}

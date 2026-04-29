import { useState, useEffect } from 'react'

// Open-Meteo - tamamen ücretsiz, API key yok!
// https://open-meteo.com/

const WMO_CODES = {
  0:'Açık',1:'Az bulutlu',2:'Parçalı bulutlu',3:'Bulutlu',
  45:'Sisli',48:'Buzlu sis',
  51:'Hafif çisenti',53:'Orta çisenti',55:'Yoğun çisenti',
  61:'Hafif yağmur',63:'Orta yağmur',65:'Şiddetli yağmur',
  71:'Hafif kar',73:'Orta kar',75:'Yoğun kar',77:'Kar taneleri',
  80:'Hafif sağanak',81:'Orta sağanak',82:'Şiddetli sağanak',
  85:'Hafif kar sağanağı',86:'Yoğun kar sağanağı',
  95:'Gök gürültülü fırtına',96:'Dolu ile fırtına',99:'Şiddetli dolu ile fırtına'
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
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { getLocationAndFetch() }, [])

  async function getLocationAndFetch() {
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 6000 })
      )
      await fetchWeather(pos.coords.latitude, pos.coords.longitude)
    } catch {
      // Konum alınamazsa Kayseri (senin şehrin)
      await fetchWeather(38.7225, 35.4875, 'Kayseri')
    }
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

      if (!data.current) throw new Error('Veri alınamadı')

      // Şehir adı için reverse geocoding (ücretsiz)
      let city = fallbackCity || 'Konumunuz'
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=tr`
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

      if (temp < 10) { score -= 40; tips.push('❄️ Soğuk hava — kovanlara girme') }
      else if (temp < 15) { score -= 20; tips.push('🧥 Serin — bakımı kısa tut') }
      else if (temp > 35) { score -= 15; tips.push('🌡️ Çok sıcak — sabah erken çalış') }
      else if (temp >= 18 && temp <= 28) tips.push('🌡️ Sıcaklık ideal')

      if (wind > 20) { score -= 25; tips.push('💨 Kuvvetli rüzgar — arılar huzursuz') }
      else if (wind > 10) { score -= 10; tips.push('💨 Orta rüzgar — dikkatli ol') }

      if (rain > 0.5) { score -= 50; tips.push('🌧️ Yağmur var — bakım yapma!') }
      else if (rain > 0) { score -= 20; tips.push('🌦️ Hafif yağmur — dikkat et') }

      if ([95,96,99].includes(code)) { score -= 60; tips.push('⛈️ Fırtına — kesinlikle çalışma!') }
      if (humidity > 85) { score -= 10; tips.push('💧 Nem çok yüksek') }

      if (tips.length === 0 || (tips.length === 1 && tips[0].includes('ideal'))) {
        tips.push('✅ Bakım için mükemmel koşullar!')
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
        description: WMO_CODES[code] || 'Bilinmiyor',
        emoji: WMO_EMOJI[code] || '🌤️',
        beekeepingScore: score,
        tips,
        daily,
        updatedAt: new Date()
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return { weather, loading, error }
}

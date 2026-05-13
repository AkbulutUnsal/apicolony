import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function PublicBatchPage() {
  const { batchNo } = useParams()
  const [batch, setBatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => { fetchBatch() }, [batchNo])

  async function fetchBatch() {
    const { data, error } = await supabase
      .from('honey_batches')
      .select('*, apiaries(name, location, region, flora_type, altitude_m)')
      .eq('batch_no', batchNo)
      .eq('is_public', true)
      .single()
    if (error || !data) setNotFound(true)
    else setBatch(data)
    setLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
      <div className="w-10 h-10 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6" style={{ background: '#0f0f0f' }}>
      <div className="text-6xl mb-4">🍯</div>
      <h1 className="text-2xl font-black text-white mb-2">Parti Bulunamadı</h1>
      <p className="text-gray-400 text-sm">Bu QR kodu geçersiz veya yayından kaldırılmış.</p>
      <p className="text-gray-600 text-xs mt-2">{batchNo}</p>
    </div>
  )

  const harvestDate = batch.harvest_date
    ? new Date(batch.harvest_date + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null
  const packageDate = batch.package_date
    ? new Date(batch.package_date + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const apiary = batch.apiaries

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #0f0f0f 0%, #1a1400 50%, #0f0f0f 100%)' }}>
      {/* Header */}
      <div className="px-6 pt-10 pb-6 text-center">
        <div className="text-5xl mb-3">🍯</div>
        <h1 className="text-3xl font-black text-white mb-1">{batch.honey_type}</h1>
        <p className="text-yellow-400 text-sm font-semibold tracking-widest uppercase">
          {batch.producer_name || 'Doğal Bal'}
        </p>
      </div>

      {/* Altın çizgi */}
      <div className="mx-6 mb-6 h-px" style={{ background: 'linear-gradient(to right, transparent, #f5c518, transparent)' }} />

      {/* Ana içerik */}
      <div className="px-6 max-w-md mx-auto pb-16 flex flex-col gap-5">

        {/* Ürün Hikayesi */}
        {batch.region_story && (
          <div className="rounded-2xl p-5" style={{ background: 'rgba(245,197,24,0.06)', border: '1px solid rgba(245,197,24,0.15)' }}>
            <p className="text-sm text-gray-200 leading-relaxed italic">"{batch.region_story}"</p>
          </div>
        )}

        {/* Temel Bilgiler */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="px-4 py-2.5 text-xs font-bold tracking-widest text-yellow-400 uppercase"
            style={{ background: 'rgba(245,197,24,0.08)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            Ürün Bilgileri
          </div>
          <div className="divide-y" style={{ divideColor: 'rgba(255,255,255,0.05)' }}>
            <InfoRow icon="🏷️" label="Parti No" value={batch.batch_no} mono />
            <InfoRow icon="🍯" label="Bal Türü" value={batch.honey_type} />
            {harvestDate && <InfoRow icon="📅" label="Hasat Tarihi" value={harvestDate} />}
            {packageDate && <InfoRow icon="📦" label="Ambalaj Tarihi" value={packageDate} />}
            {batch.total_kg && <InfoRow icon="⚖️" label="Miktar" value={`${batch.total_kg} kg`} />}
            {batch.brix_value && <InfoRow icon="💧" label="Nem Oranı" value={`%${batch.brix_value}`} />}
          </div>
        </div>

        {/* Arılık Bilgisi */}
        {apiary && (
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="px-4 py-2.5 text-xs font-bold tracking-widest text-yellow-400 uppercase"
              style={{ background: 'rgba(245,197,24,0.08)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              Üretim Bölgesi
            </div>
            <div className="divide-y" style={{ divideColor: 'rgba(255,255,255,0.05)' }}>
              {apiary.name && <InfoRow icon="🌿" label="Arılık" value={apiary.name} />}
              {(apiary.location || apiary.region) && (
                <InfoRow icon="📍" label="Lokasyon" value={[apiary.location, apiary.region].filter(Boolean).join(', ')} />
              )}
              {apiary.flora_type && <InfoRow icon="🌸" label="Flora" value={apiary.flora_type} />}
              {apiary.altitude_m && <InfoRow icon="⛰️" label="Rakım" value={`${apiary.altitude_m} m`} />}
            </div>
          </div>
        )}

        {/* Analiz / Kalite */}
        {batch.analysis_note && (
          <div className="rounded-2xl p-4 flex gap-3 items-start"
            style={{ background: 'rgba(39,174,96,0.08)', border: '1px solid rgba(39,174,96,0.2)' }}>
            <span className="text-xl flex-shrink-0">✅</span>
            <div>
              <div className="text-xs font-bold text-green-400 mb-1 uppercase tracking-wide">Kalite & Analiz</div>
              <p className="text-sm text-gray-200">{batch.analysis_note}</p>
            </div>
          </div>
        )}

        {/* Üretici */}
        {batch.producer_name && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                style={{ background: 'rgba(245,197,24,0.15)', border: '1px solid rgba(245,197,24,0.3)' }}>
                🐝
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">Üretici</div>
                <div className="font-bold text-white">{batch.producer_name}</div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4">
          <div className="text-xs text-gray-600 mb-2">Dijital izlenebilirlik ile doğrulanan doğal bal</div>
          <div className="text-yellow-600 text-sm font-black tracking-wider">🐝 ApiColony</div>
          <div className="text-xs text-gray-700 mt-1">Kovandan Kavanoza</div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value, mono }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <span className={`text-sm font-semibold text-white text-right max-w-[55%] ${mono ? 'font-mono text-yellow-400' : ''}`}>
        {value}
      </span>
    </div>
  )
}

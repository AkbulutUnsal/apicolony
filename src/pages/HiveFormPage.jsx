import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import TabGenel from '../components/forms/TabGenel'
import { TabAnaAri, TabBallik, TabHastalik, TabBakim } from '../components/forms/TabAnaAri'
import HiveQRCode from '../components/hive/HiveQRCode'
import HivePhotos from '../components/hive/HivePhotos'

const TABS = ['Genel', 'Ana Arı', 'Ballıklar', 'Hastalık', 'Bakımlar', 'Fotoğraflar', 'QR Kod']

export default function HiveFormPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(0)
  const [hive, setHive] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchHive() }, [id])

  async function fetchHive() {
    const { data, error } = await supabase.from('hives').select('*').eq('id', id).single()
    if (error) { toast.error('Kovan bulunamadı'); navigate('/panel') }
    else { setHive(data); setLoading(false) }
  }

  async function saveHive() {
    setSaving(true)

    // color_status otomatik hesapla
    let color_status = 'normal'
    if (hive.brood_status === 'Yok') {
      color_status = 'dormant'
    } else if (hive.honey_stock_kg <= 3) {
      color_status = 'danger'
    } else if (hive.honey_stock_kg <= 6) {
      color_status = 'warning'
    } else {
      color_status = 'healthy'
    }

    const { error } = await supabase
      .from('hives').update({ ...hive, color_status, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) toast.error('Kaydedilemedi: ' + error.message)
    else { toast.success('Kovan kaydedildi!'); setHive(prev => ({ ...prev, color_status })) }
    setSaving(false)
  }

  async function archiveHive() {
    if (!confirm('Bu kovanı arşivlemek istediğinize emin misiniz?')) return
    await supabase.from('hives').update({ status: 'arsiv' }).eq('id', id)
    toast.success('Kovan arşivlendi')
    navigate('/panel')
  }

  if (loading) return (
    <div className="min-h-screen bg-dark-400 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  const isWarning = hive.honey_stock_kg < 5

  return (
    <div className="min-h-screen bg-dark-400 flex flex-col">
      <div className="bg-dark-200 px-6 py-3 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button className="btn-ghost" onClick={() => navigate('/panel')}>← Panele Geri Dön</button>
        <h1 className="text-gold font-black text-lg">{hive.hive_no} Kovan Bilgi Formu</h1>
        <div className="flex gap-2.5">
          <button className="btn-gold" onClick={saveHive} disabled={saving}>
            💾 {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
          <button className="btn-ghost" onClick={archiveHive}>📋 Arşivle</button>
        </div>
      </div>

      {isWarning && (
        <div className="warn-banner">
          <div className="text-gold font-bold text-sm">⚠ Bakım Gerekli</div>
          <p className="text-gray-300 text-xs mt-1">Bal stoğu kritik ({hive.honey_stock_kg} kg). Besleme gerekebilir.</p>
        </div>
      )}

      <div className="flex mx-6 mt-4 overflow-x-auto flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {TABS.map((tab, i) => (
          <button key={tab}
            className={`tab-btn whitespace-nowrap ${activeTab === i ? 'active' : ''}`}
            onClick={() => setActiveTab(i)}>
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-12">
        {activeTab === 0 && <TabGenel hive={hive} setHive={setHive} />}
        {activeTab === 1 && <TabAnaAri hiveId={id} />}
        {activeTab === 2 && <TabBallik hiveId={id} />}
        {activeTab === 3 && <TabHastalik hiveId={id} />}
        {activeTab === 4 && <TabBakim hiveId={id} />}
        {activeTab === 5 && (
          <div className="p-6">
            <HivePhotos hiveId={id} hiveNo={hive.hive_no} />
          </div>
        )}
        {activeTab === 6 && (
          <div className="p-6 max-w-sm">
            <HiveQRCode hive={hive} />
          </div>
        )}
      </div>
    </div>
  )
}

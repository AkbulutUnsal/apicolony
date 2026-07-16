import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import TabGenel from '../components/forms/TabGenel'
import { TabAnaAri, TabBallik, TabHastalik, TabBakim } from '../components/forms/TabAnaAri'
import HiveQRCode from '../components/hive/HiveQRCode'
import HivePhotos from '../components/hive/HivePhotos'

const TAB_KEYS = ['hive_form.tab_general', 'hive_form.tab_queen', 'hive_form.tab_supers', 'hive_form.tab_disease', 'hive_form.tab_maintenance', 'hive_form.tab_photos', 'hive_form.tab_qr']

export default function HiveFormPage() {
  const { t } = useTranslation()
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
    if (error) { toast.error(t('hive_form_page.hive_not_found')); navigate('/panel') }
    else { setHive(data); setLoading(false) }
  }

  async function saveHive() {
    setSaving(true)

    // Son bakım kaydına bak
    const { data: maintenance } = await supabase
      .from('maintenance_records')
      .select('inspection_date')
      .eq('hive_id', id)
      .order('inspection_date', { ascending: false })
      .limit(1)

    const lastInspection = maintenance?.[0]?.inspection_date

    // color_status hesapla
    let color_status = 'danger' // varsayılan: bakım yok = kırmızı
    if (hive.brood_status === 'Yok') {
      color_status = 'dormant'
    } else if (!lastInspection) {
      color_status = 'danger' // hiç bakım yok
    } else {
      const daysSince = Math.floor((Date.now() - new Date(lastInspection)) / 86400000)
      if (hive.honey_stock_kg <= 3) {
        color_status = 'danger'
      } else if (daysSince >= 30 || hive.honey_stock_kg <= 6) {
        color_status = 'warning'
      } else {
        color_status = 'healthy'
      }
    }

    const { error } = await supabase
      .from('hives').update({ ...hive, color_status, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) toast.error(t('common.error_save') + ': ' + error.message)
    else { toast.success(t('hive_form.saved')); setHive(prev => ({ ...prev, color_status })) }
    setSaving(false)
  }

  async function archiveHive() {
    if (!confirm(t('hive_form_page.confirm_archive'))) return
    await supabase.from('hives').update({ status: 'arsiv' }).eq('id', id)
    toast.success(t('hive_form.archived'))
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
      <div className="bg-dark-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button className="btn-ghost" onClick={() => navigate('/panel')}>{t('hive_form.back')}</button>
        <h1 className="text-gold font-black text-base">{hive.hive_no} {t('hive_form.title')}</h1>
        <div className="flex gap-2.5">
          <button className="btn-gold" onClick={saveHive} disabled={saving}>
            💾 {saving ? t('hive_form_page.saving_short') : t('hive_form_page.save_short')}
          </button>
          <button className="btn-ghost" onClick={archiveHive}>📋 {t('hive_form_page.archive_short')}</button>
        </div>
      </div>

      {isWarning && (
        <div className="warn-banner">
          <div className="text-gold font-bold text-sm">⚠ {t('reports.kpi_needs_maintenance')}</div>
          <p className="text-gray-300 text-xs mt-1">{t('hive_form_page.honey_critical_warning', { kg: hive.honey_stock_kg })}</p>
        </div>
      )}

      <div className="flex mx-6 mt-4 overflow-x-auto flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {TAB_KEYS.map((key, i) => (
          <button key={key}
            className={`tab-btn whitespace-nowrap ${activeTab === i ? 'active' : ''}`}
            onClick={() => setActiveTab(i)}>
            {t(key)}
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

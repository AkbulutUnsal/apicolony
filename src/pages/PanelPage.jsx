import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useSubscription } from '../hooks/useSubscription'
import Navbar from '../components/layout/Navbar'
import HiveCard from '../components/hive/HiveCard'
import toast from 'react-hot-toast'

export default function PanelPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { isReadOnly, hiveLimit } = useSubscription() || {}
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [hives, setHives] = useState([])
  const [apiaries, setApiaries] = useState([])
  const [filterApiary, setFilterApiary] = useState(searchParams.get('arılik') || 'all')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  useEffect(() => { fetchHives() }, [user])

  async function fetchHives() {
    if (!user) return
    const [hivRes, apRes] = await Promise.all([
      supabase.from('hives').select('*').eq('user_id', user.id).eq('status', 'aktif').order('created_at'),
      supabase.from('apiaries').select('id, name').eq('user_id', user.id).order('name')
    ])
    if (hivRes.error) {
      toast.error(t('panel_page.hives_load_error'))
      setApiaries(apRes.data || [])
      setLoading(false)
      return
    }

    const hiveList = hivRes.data || []
    const hiveIds = hiveList.map(h => h.id)

    let superCounts = {}
    if (hiveIds.length > 0) {
      const { data: supersData, error: supersError } = await supabase
        .from('supers')
        .select('hive_id')
        .in('hive_id', hiveIds)
      if (supersError) {
        toast.error(t('panel_page.supers_load_error'))
      } else {
        (supersData || []).forEach(s => {
          superCounts[s.hive_id] = (superCounts[s.hive_id] || 0) + 1
        })
      }
    }

    const hivesWithSupers = hiveList.map(h => ({ ...h, super_count: superCounts[h.id] || 0 }))
    setHives(hivesWithSupers)
    setApiaries(apRes.data || [])
    setLoading(false)
  }

  async function addHive() {
    if (!user || adding) return
    if (isReadOnly) {
      toast.error(t('panel_page.readonly_block'))
      navigate('/abonelik')
      return
    }
    if (hiveLimit != null && hives.length >= hiveLimit) {
      toast.error(t('panel_page.hive_limit_reached', { limit: hiveLimit }))
      navigate('/abonelik')
      return
    }
    setAdding(true)
    try {
      const { data: existing } = await supabase
        .from('hives').select('hive_no')
        .eq('user_id', user.id).eq('status', 'aktif')
      const existingNos = (existing || []).map(h => {
        const match = h.hive_no.match(/A-(\d+)/)
        return match ? parseInt(match[1]) : 0
      })
      const nextNo = existingNos.length > 0 ? Math.max(...existingNos) + 1 : 1
      const hiveNo = `A-${nextNo}`
      const { data, error } = await supabase.from('hives').insert({
        user_id: user.id,
        hive_no: hiveNo,
        hive_type: 'Langstroth',
        frame_count: 10,
        honey_stock_kg: 10,
        brood_status: 'İyi',
        status: 'aktif',
        color_status: 'danger'
      }).select().single()
      if (error) toast.error(t('panel_page.hive_add_error'))
      else { setHives(prev => [...prev, data]); toast.success(t('panel_page.hive_added', { hive: hiveNo })) }
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-400 flex flex-col">
      <Navbar onAddHive={addHive} addingHive={adding} />
      <main className="flex-1 p-6">
        <h1 className="text-center text-xl font-black mb-1 tracking-wide">{t('panel_page.title')}</h1>
        {hiveLimit != null && (
          <p className="text-center text-xs text-gray-500 mb-6">
            {t('panel_page.hive_usage', { count: hives.length, limit: hiveLimit })}
          </p>
        )}
        {hiveLimit == null && <div className="mb-6" />}
        {/* Arılık filtresi */}
        {apiaries.length > 0 && (
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            <FilterChip label={t('common.all')} active={filterApiary === 'all'} onClick={() => setFilterApiary('all')} />
            {apiaries.map(a => (
              <FilterChip key={a.id} label={a.name} active={filterApiary === a.id} onClick={() => setFilterApiary(a.id)} />
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (() => {
          const filtered = filterApiary === 'all' ? hives : hives.filter(h => h.apiary_id === filterApiary)
          return filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <p className="text-lg mb-4">{hives.length === 0 ? t('panel_page.no_hives_yet') : t('panel_page.no_hives_in_apiary')}</p>
              {hives.length === 0 && (
                <button className="btn-gold" onClick={addHive} disabled={adding}>
                  + {t('panel_page.add_first_hive')}
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))' }}>
              {filtered.map(hive => (
                <HiveCard key={hive.id} hive={hive} onClick={() => navigate(`/kovan/${hive.id}`)} />
              ))}
            </div>
          )
        })()}
      </main>
    </div>
  )
}

function FilterChip({ label, active, onClick }) {
  return (
    <button onClick={onClick}
      className="whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex-shrink-0"
      style={active
        ? { background: 'rgba(245,197,24,0.2)', color: '#f5c518', border: '1px solid rgba(245,197,24,0.4)' }
        : { background: 'rgba(255,255,255,0.06)', color: '#aaa', border: '1px solid rgba(255,255,255,0.1)' }
      }>
      {label}
    </button>
  )
}

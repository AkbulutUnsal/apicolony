import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/layout/Navbar'
import HiveCard from '../components/hive/HiveCard'
import toast from 'react-hot-toast'

export default function PanelPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [hives, setHives] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  useEffect(() => { fetchHives() }, [user])

  async function fetchHives() {
    if (!user) return
    const { data, error } = await supabase
      .from('hives').select('*')
      .eq('user_id', user.id).eq('status', 'aktif')
      .order('created_at')
    if (error) toast.error('Kovanlar yüklenemedi')
    else setHives(data || [])
    setLoading(false)
  }

  async function addHive() {
    if (!user || adding) return
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
        color_status: 'normal'
      }).select().single()
      if (error) toast.error('Kovan eklenemedi')
      else { setHives(prev => [...prev, data]); toast.success(`${hiveNo} kovanı eklendi`) }
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-400 flex flex-col">
      <Navbar onAddHive={addHive} addingHive={adding} />
      <main className="flex-1 p-6">
        <h1 className="text-center text-xl font-black mb-6 tracking-wide">Kovan Paneli</h1>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : hives.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <p className="text-lg mb-4">Henüz kovan yok.</p>
            <button className="btn-gold" onClick={addHive} disabled={adding}>
              + İlk Kovanı Ekle
            </button>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))' }}>
            {hives.map(hive => (
              <HiveCard key={hive.id} hive={hive} onClick={() => navigate(`/kovan/${hive.id}`)} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

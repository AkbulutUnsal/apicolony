import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useWorker } from '../hooks/useWorker'
import HexLogo from '../components/ui/HexLogo'
import toast from 'react-hot-toast'

const EMOJIS = ['👤','👨‍🌾','👩‍🌾','🧑‍🌾','👨‍💼','👩‍💼','🧑‍💼','👨‍🔬','👩‍🔬']
const COLORS = ['#f5c518','#27ae60','#3498db','#e74c3c','#9b59b6','#e67e22','#1abc9c','#e91e8c']

export default function WhoIsWorkingPage() {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const { selectWorker, activeWorker } = useWorker()
  const navigate = useNavigate()
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [password, setPassword] = useState('')
  const [checking, setChecking] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newWorker, setNewWorker] = useState({ full_name: '', role: 'yardimci', pin_or_pass: '', avatar_emoji: '👤', avatar_color: '#f5c518' })

  const isAdmin = profile?.role === 'admin'

  useEffect(() => { if (user) fetchWorkers() }, [user])

  async function fetchWorkers() {
    const { data } = await supabase.from('workers')
      .select('*').eq('owner_id', user.id).eq('is_active', true).order('created_at')
    setWorkers(data || [])
    setLoading(false)
  }

  // Hesap sahibi olarak devam et (şifresiz)
  function continueAsOwner() {
    navigate('/dashboard')
  }

  // Çalışan seç → şifre sor
  function handleSelectWorker(w) {
    setSelected(w)
    setPassword('')
  }

  async function handleWorkerLogin(e) {
    e.preventDefault()
    setChecking(true)
    try {
      await selectWorker(selected, password)
      toast.success(`${t('who_working.welcome')}, ${selected.full_name}!`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message || t('who_working.wrong_password'))
    } finally {
      setChecking(false)
    }
  }

  async function addWorker() {
    if (!newWorker.full_name || !newWorker.pin_or_pass) {
      toast.error(t('who_working.error_name_pass_required'))
      return
    }
    const { data, error } = await supabase.from('workers').insert({
      ...newWorker,
      owner_id: user.id
    }).select().single()
    if (error) { toast.error(t('hive_tabs.error_add_failed')); return }
    setWorkers(prev => [...prev, data])
    setShowAdd(false)
    setNewWorker({ full_name: '', role: 'yardimci', pin_or_pass: '', avatar_emoji: '👤', avatar_color: '#f5c518' })
    toast.success(`${data.full_name} ${t('who_working.added_suffix')}`)
  }

  const roleLabel = { yardimci: t('who_working.role_assistant'), cirak: t('who_working.role_apprentice'), sofor: t('who_working.role_driver') }

  return (
    <div className="min-h-screen bg-dark-400 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <HexLogo size={52} className="mx-auto mb-4" />
          <h1 className="text-2xl font-black text-gold">{t('who_working.title')}</h1>
          <p className="text-sm text-gray-400 mt-1">{t('who_working.subtitle')}</p>
        </div>

        {/* Şifre modal */}
        {selected && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-200 rounded-2xl p-8 w-full max-w-sm text-center"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="text-5xl mb-3">{selected.avatar_emoji}</div>
              <h2 className="text-xl font-black mb-1">{selected.full_name}</h2>
              <p className="text-sm text-gray-400 mb-6">{roleLabel[selected.role] || selected.role}</p>
              <form onSubmit={handleWorkerLogin}>
                <input
                  type="password"
                  placeholder={t('who_working.enter_password')}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="mb-4 text-center text-lg tracking-widest"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button type="button" className="btn-ghost flex-1 justify-center"
                    onClick={() => setSelected(null)}>{t('common.cancel')}</button>
                  <button type="submit" className="btn-gold flex-1 justify-center" disabled={checking}>
                    {checking ? t('who_working.checking') : t('who_working.login_btn')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Profil grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-2 border-gold border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            {/* Hesap sahibi kartı */}
            <button onClick={continueAsOwner}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl transition-all hover:scale-105 cursor-pointer group"
              style={{ background: '#242424', border: '2px solid rgba(245,197,24,0.4)' }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black"
                style={{ background: '#f5c518', color: '#1a1200' }}>
                {profile?.full_name?.charAt(0) || 'A'}
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-white truncate max-w-[90px]">
                  {profile?.full_name || t('who_working.account_owner')}
                </div>
                <div className="text-[10px] text-gold mt-0.5">{t('who_working.beekeeper')}</div>
              </div>
            </button>

            {/* Çalışan kartları */}
            {workers.map(w => (
              <button key={w.id} onClick={() => handleSelectWorker(w)}
                className="flex flex-col items-center gap-3 p-5 rounded-2xl transition-all hover:scale-105 cursor-pointer"
                style={{ background: '#242424', border: '2px solid rgba(255,255,255,0.08)' }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                  style={{ background: w.avatar_color + '22', border: `2px solid ${w.avatar_color}` }}>
                  {w.avatar_emoji}
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-white truncate max-w-[90px]">{w.full_name}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{roleLabel[w.role] || w.role}</div>
                  {w.last_seen_at && (
                    <div className="text-[9px] text-gray-500 mt-0.5">
                      {formatLastSeen(w.last_seen_at, t)}
                    </div>
                  )}
                </div>
              </button>
            ))}

            {/* Yeni çalışan ekle - sadece admin */}
            {isAdmin && (
              <button onClick={() => setShowAdd(true)}
                className="flex flex-col items-center gap-3 p-5 rounded-2xl transition-all hover:scale-105 cursor-pointer"
                style={{ background: '#1e1e1e', border: '2px dashed rgba(255,255,255,0.15)' }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl text-gray-500"
                  style={{ background: '#2e2e2e' }}>+</div>
                <div className="text-sm font-bold text-gray-500">{t('who_working.add_worker')}</div>
              </button>
            )}
          </div>
        )}

        {/* Çalışan ekle formu - sadece admin */}
        {isAdmin && showAdd && (
          <div className="card mb-6">
            <h3 className="font-black mb-4">{t('who_working.new_worker')}</h3>
            <div className="space-y-3">
              <div>
                <label className="field-label">{t('who_working.full_name')}</label>
                <input placeholder="Ahmet Yılmaz" value={newWorker.full_name}
                  onChange={e => setNewWorker(p => ({ ...p, full_name: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">{t('who_working.role_label')}</label>
                <select value={newWorker.role} onChange={e => setNewWorker(p => ({ ...p, role: e.target.value }))}>
                  <option value="yardimci">{t('who_working.role_assistant')}</option>
                  <option value="cirak">{t('who_working.role_apprentice')}</option>
                  <option value="sofor">{t('who_working.role_driver')}</option>
                </select>
              </div>
              <div>
                <label className="field-label">{t('who_working.password')}</label>
                <input type="password" placeholder={t('who_working.min_4_chars')} value={newWorker.pin_or_pass}
                  onChange={e => setNewWorker(p => ({ ...p, pin_or_pass: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">{t('who_working.avatar_emoji')}</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {EMOJIS.map(e => (
                    <button key={e} onClick={() => setNewWorker(p => ({ ...p, avatar_emoji: e }))}
                      className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all
                        ${newWorker.avatar_emoji === e ? 'ring-2 ring-gold scale-110' : 'bg-dark-100 hover:bg-dark-50'}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="field-label">{t('who_working.color')}</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setNewWorker(p => ({ ...p, avatar_color: c }))}
                      className={`w-7 h-7 rounded-full transition-all ${newWorker.avatar_color === c ? 'ring-2 ring-white scale-110' : ''}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button className="btn-ghost flex-1 justify-center" onClick={() => setShowAdd(false)}>{t('common.cancel')}</button>
                <button className="btn-gold flex-1 justify-center" onClick={addWorker}>{t('common.save')}</button>
              </div>
            </div>
          </div>
        )}

        {/* Alt butonlar - sadece admin */}
        {isAdmin && (
          <div className="text-center">
            <button onClick={() => navigate('/calisanlar')}
              className="text-sm text-gray-400 hover:text-gold transition-colors">
              ⚙️ {t('who_working.manage_workers')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function formatLastSeen(dateStr, t) {
  const diff = Date.now() - new Date(dateStr)
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return t('who_working.active_now')
  if (mins < 60) return `${mins}${t('who_working.min_ago_suffix')}`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}${t('who_working.hour_ago_suffix')}`
  return `${Math.floor(hrs / 24)}${t('who_working.day_ago_suffix')}`
}

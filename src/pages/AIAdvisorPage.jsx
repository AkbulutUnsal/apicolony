import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/layout/Navbar'
import HexLogo from '../components/ui/HexLogo'

const LANG_NAMES = { tr: 'Türkçe', ka: 'ქართული (Georgian)', en: 'English', ru: 'Русский' }

export default function AIAdvisorPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const QUICK_QUESTIONS = t('ai_advisor.quick_questions', { returnObjects: true })
  const [messages, setMessages] = useState([
    { role: 'assistant', content: t('ai_advisor.welcome_message') }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hiveContext, setHiveContext] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => { if (user) loadHiveContext() }, [user])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function loadHiveContext() {
    const [hivesRes, harvestRes] = await Promise.all([
      supabase.from('hives').select('hive_no, honey_stock_kg, brood_status, hive_type, last_inspection_date, frame_count')
        .eq('user_id', user.id).eq('status', 'aktif'),
      supabase.from('honey_harvests').select('amount_kg, honey_type, harvest_date')
        .eq('user_id', user.id).order('harvest_date', { ascending: false }).limit(10)
    ])

    const hives = hivesRes.data || []
    const harvests = harvestRes.data || []
    const now = Date.now()

    const critical = hives.filter(h => !h.last_inspection_date || h.honey_stock_kg <= 3)
    const overdue = hives.filter(h => h.last_inspection_date &&
      Math.floor((now - new Date(h.last_inspection_date)) / 86400000) >= 30)
    const totalHoney = hives.reduce((s, h) => s + (h.honey_stock_kg || 0), 0)
    const totalHarvest = harvests.reduce((s, h) => s + (h.amount_kg || 0), 0)

    setHiveContext({
      totalHives: hives.length,
      criticalCount: critical.length,
      criticalHives: critical.slice(0,5).map(h => h.hive_no).join(', '),
      overdueCount: overdue.length,
      overdueHives: overdue.slice(0,5).map(h => h.hive_no).join(', '),
      totalHoneyStock: totalHoney.toFixed(1),
      totalHarvest: totalHarvest.toFixed(1),
      month: new Date().toLocaleDateString('tr-TR', { month: 'long' }),
      season: getSeason(),
      hiveList: hives.slice(0, 20).map(h =>
        `${h.hive_no}: bal=${h.honey_stock_kg}kg, kuluçka=${h.brood_status}`
      ).join('\n'),
    })
  }

  function buildSystemPrompt(ctx) {
    const langName = LANG_NAMES[i18n.language] || 'Türkçe'
    if (!ctx || ctx.totalHives === 0) {
      return `Sen ApiColony arı yönetim sisteminin yapay zeka danışmanısın.
Kullanıcının henüz kovan verisi yok. Genel arıcılık tavsiyeleri ver. Yanıtı ${langName} dilinde ver.`
    }
    return `Sen ApiColony arı yönetim sisteminin yapay zeka danışmanısın. Kullanıcı bir arıcı.

KULLANICININ KOVAN VERİLERİ (${ctx.month}, ${ctx.season} mevsimi):
- Toplam aktif kovan: ${ctx.totalHives}
- Kritik kovan: ${ctx.criticalCount} ${ctx.criticalHives ? `(${ctx.criticalHives})` : ''}
- 30+ gün bakım bekleyen: ${ctx.overdueCount} ${ctx.overdueHives ? `(${ctx.overdueHives})` : ''}
- Toplam bal stoğu: ${ctx.totalHoneyStock} kg
- Toplam hasat: ${ctx.totalHarvest} kg

KOVAN DETAYLARI:
${ctx.hiveList}

KURALLAR:
- Yanıtı ${langName} dilinde ver, sıcak ve profesyonel ol
- Verilere atıfta bulun (örn. "A-3 kovanınız için...")
- Pratik ve uygulanabilir öneriler ver
- Gerektiğinde madde madde listele
- Özlü tut, çok uzun olmasın`
  }

  async function sendMessage(text) {
    const userMsg = text || input.trim()
    if (!userMsg || loading) return
    setInput('')
    setLoading(true)

    const newMessages = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)

    try {
      // Supabase Edge Function üzerinden çağır
      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: {
          system: buildSystemPrompt(hiveContext),
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        }
      })

      if (error) throw new Error(error.message)
      const reply = data?.content?.[0]?.text || t('ai_advisor.no_reply')
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ ${t('ai_advisor.error_label')}: ${err.message}\n\n${t('ai_advisor.edge_function_hint')}`
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className="min-h-screen bg-dark-400 flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full p-4 gap-4" style={{ height: 'calc(100vh - 60px)' }}>

        {/* Başlık */}
        <div className="flex items-center gap-3 pt-2 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(245,197,24,0.15)', border: '1px solid rgba(245,197,24,0.3)' }}>
            🤖
          </div>
          <div>
            <h1 className="text-lg font-black">{t('ai_advisor.title')}</h1>
            <p className="text-xs text-gray-400">
              {hiveContext
                ? `${hiveContext.totalHives} ${t('ai_advisor.hive_data_loaded')} · ${seasonLabel(hiveContext.season, t)}`
                : t('ai_advisor.loading_data')}
            </p>
          </div>
          {hiveContext && (
            <div className="ml-auto flex gap-2">
              {hiveContext.criticalCount > 0 && (
                <span className="text-xs px-2 py-1 rounded-lg font-bold"
                  style={{ background: 'rgba(231,76,60,0.15)', color: '#e74c3c', border: '1px solid rgba(231,76,60,0.3)' }}>
                  🔴 {hiveContext.criticalCount} {t('reports.health_critical')}
                </span>
              )}
              {hiveContext.overdueCount > 0 && (
                <span className="text-xs px-2 py-1 rounded-lg font-bold"
                  style={{ background: 'rgba(230,126,34,0.15)', color: '#e67e22', border: '1px solid rgba(230,126,34,0.3)' }}>
                  🟡 {hiveContext.overdueCount} {t('reports.health_maintenance')}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Hızlı sorular */}
        {messages.length <= 1 && (
          <div className="grid grid-cols-2 gap-2 flex-shrink-0">
            {QUICK_QUESTIONS.map((q, i) => (
              <button key={i} onClick={() => sendMessage(q)}
                className="text-left p-3 rounded-xl text-sm text-gray-300 hover:text-white transition-all hover:scale-[1.02]"
                style={{ background: '#2e2e2e', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-gold mr-1.5">→</span>{q}
              </button>
            ))}
          </div>
        )}

        {/* Mesajlar */}
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto min-h-0">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
                  style={{ background: 'rgba(245,197,24,0.15)', border: '1px solid rgba(245,197,24,0.2)' }}>
                  <HexLogo size={18}/>
                </div>
              )}
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'
              }`}
                style={{
                  background: msg.role === 'user' ? '#f5c518' : '#2e2e2e',
                  color: msg.role === 'user' ? '#1a1200' : '#e5e5e5',
                  fontWeight: msg.role === 'user' ? 600 : 400,
                  border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.08)' : 'none'
                }}>
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
                  style={{ background: '#383838', border: '1px solid rgba(255,255,255,0.1)' }}>
                  👤
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
                style={{ background: 'rgba(245,197,24,0.15)', border: '1px solid rgba(245,197,24,0.2)' }}>
                <HexLogo size={18}/>
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-bl-sm"
                style={{ background: '#2e2e2e', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex gap-1.5 items-center h-5">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-2 h-2 bg-gold rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}/>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        <div className="flex gap-2 pb-2 flex-shrink-0">
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('ai_advisor.input_placeholder')}
            rows={1} disabled={loading}
            className="flex-1 resize-none"
            style={{ minHeight: 44, maxHeight: 120 }}/>
          <button onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="btn-gold px-4 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ alignSelf: 'flex-end', height: 44 }}>
            ➤
          </button>
        </div>
      </main>
    </div>
  )
}

function getSeason() {
  const m = new Date().getMonth() + 1
  if (m >= 3 && m <= 5) return 'İlkbahar'
  if (m >= 6 && m <= 8) return 'Yaz'
  if (m >= 9 && m <= 11) return 'Sonbahar'
  return 'Kış'
}

function seasonLabel(season, t) {
  const map = {
    'İlkbahar': t('hive_tabs.season_spring'),
    'Yaz': t('hive_tabs.season_summer'),
    'Sonbahar': t('hive_tabs.season_autumn'),
    'Kış': t('ai_advisor.season_winter'),
  }
  return map[season] || season
}

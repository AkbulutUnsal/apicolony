import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

export default function VoiceRecorder({ hive, onFieldsDetected, onClose }) {
  const [phase, setPhase] = useState('idle')
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [detectedFields, setDetectedFields] = useState(null)
  const [seconds, setSeconds] = useState(0)
  const [supported, setSupported] = useState(!!SpeechRecognition)
  const recognitionRef = useRef(null)
  const timerRef = useRef(null)
  const transcriptRef = useRef('')

  useEffect(() => {
    return () => { recognitionRef.current?.stop(); clearInterval(timerRef.current) }
  }, [])

  function startRecording() {
    if (!SpeechRecognition) { toast.error('Tarayıcınız ses tanımayı desteklemiyor'); return }
    const recognition = new SpeechRecognition()
    recognition.lang = 'tr-TR'
    recognition.continuous = true
    recognition.interimResults = true
    transcriptRef.current = ''

    recognition.onresult = (e) => {
      let interim = ''
      let final = transcriptRef.current
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t + ' '
        else interim = t
      }
      transcriptRef.current = final
      setTranscript(final)
      setInterimText(interim)
    }
    recognition.onerror = (e) => { if (e.error !== 'no-speech') toast.error('Hata: ' + e.error) }
    recognition.start()
    recognitionRef.current = recognition
    setPhase('recording')
    setSeconds(0)
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
  }

  function stopRecording() {
    recognitionRef.current?.stop()
    clearInterval(timerRef.current)
    setPhase('processing')
    setInterimText('')
    setTimeout(() => {
      const final = transcriptRef.current.trim()
      if (final.length < 5) { toast.error('Ses algılanamadı, tekrar deneyin'); setPhase('idle') }
      else analyzeWithAI(final)
    }, 500)
  }

  async function analyzeWithAI(text) {
    try {
      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: {
          system: `Sen bir arıcılık asistanısın. Kullanıcının sesli notunu analiz edip sadece JSON döndür. Başka hiçbir şey yazma.
Format:
{"honey_stock_kg":number|null,"brood_status":"İyi"|"Orta"|"Zayıf"|"Yok"|null,"aggressiveness":"Sakin"|"Normal"|"Hırçın"|"Çok Hırçın"|null,"frame_count":number|null,"queen_seen":true|false|null,"disease_signs":true|false|null,"disease_name":string|null,"feed_given":true|false|null,"feed_type":string|null,"colony_strength":"Güçlü"|"Orta"|"Zayıf"|null,"notes":string|null}`,
          messages: [{ role: 'user', content: `Kovan: ${hive?.hive_no || '?'}\nNot: "${text}"` }]
        }
      })
      if (error) throw new Error(error.message)
      const raw = data?.content?.[0]?.text || ''
      const match = raw.match(/\{[\s\S]*\}/)
      const fields = match ? JSON.parse(match[0]) : { notes: text }
      setDetectedFields(fields)
    } catch {
      setDetectedFields({ notes: text })
    }
    setPhase('preview')
  }

  function applyFields() {
    onFieldsDetected(detectedFields)
    toast.success('Bilgiler forma aktarıldı! ✅')
    onClose()
  }

  function reset() {
    setPhase('idle'); setTranscript(''); setInterimText('')
    setDetectedFields(null); setSeconds(0); transcriptRef.current = ''
  }

  const fmt = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.12)' }}>

        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <h2 className="font-black text-base">🎙️ Sesli Bakım Kaydı</h2>
            {hive && <p className="text-xs text-gray-400 mt-0.5">{hive.hive_no} kovana kayıt</p>}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="p-5">

          {!supported && (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">⚠️</div>
              <p className="text-sm text-gray-300 mb-1">Tarayıcınız ses tanımayı desteklemiyor.</p>
              <p className="text-xs text-gray-500">Chrome veya Edge kullanın.</p>
            </div>
          )}

          {supported && phase === 'idle' && (
            <div className="text-center py-4">
              <div className="text-xs text-gray-500 mb-5 p-3 rounded-xl text-left leading-relaxed"
                style={{ background: '#2a2a2a' }}>
                💡 <strong className="text-gray-300">Örnek konuşma:</strong><br/>
                <span className="italic">"Bal stoğu iyi yaklaşık 8 kilo. Kuluçka güçlü, ana arı görüldü. Hırçınlık yok. Varroa belirtisi gözlemlenmedi. Şeker şurubu verdim."</span>
              </div>
              <button onClick={startRecording}
                className="w-24 h-24 rounded-full flex items-center justify-center mx-auto text-4xl transition-all hover:scale-110 active:scale-95"
                style={{ background: 'rgba(245,197,24,0.15)', border: '3px solid #f5c518' }}>
                🎙️
              </button>
              <p className="text-xs text-gray-500 mt-3">Başlatmak için dokun</p>
            </div>
          )}

          {phase === 'recording' && (
            <div className="text-center py-2">
              <div className="relative w-24 h-24 mx-auto mb-3">
                <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: '#e74c3c' }}/>
                <button onClick={stopRecording}
                  className="relative w-24 h-24 rounded-full flex items-center justify-center text-4xl transition-all hover:scale-105"
                  style={{ background: 'rgba(231,76,60,0.2)', border: '3px solid #e74c3c' }}>
                  ⏹️
                </button>
              </div>
              <div className="text-red-400 font-black text-xl mb-3">{fmt(seconds)}</div>
              <div className="rounded-xl p-3 min-h-[70px] text-left"
                style={{ background: '#2a2a2a', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-sm text-gray-200 leading-relaxed">
                  {transcript}
                  <span className="text-gray-500 italic">{interimText}</span>
                  {!transcript && !interimText && <span className="text-gray-600 animate-pulse">Dinleniyor...</span>}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-2">Durdurmak için butona bas</p>
            </div>
          )}

          {phase === 'processing' && (
            <div className="text-center py-12">
              <div className="flex gap-1.5 justify-center mb-4">
                {[0,1,2].map(i => (
                  <div key={i} className="w-3 h-3 bg-gold rounded-full animate-bounce"
                    style={{ animationDelay: `${i*0.15}s` }}/>
                ))}
              </div>
              <p className="text-sm text-gray-300 font-semibold">AI analiz ediyor...</p>
              <p className="text-xs text-gray-500 mt-1">Kovan bilgileri çıkarılıyor</p>
            </div>
          )}

          {phase === 'preview' && detectedFields && (
            <div>
              <div className="rounded-xl p-3 mb-4" style={{ background: '#2a2a2a' }}>
                <p className="text-[10px] text-gray-500 mb-1 font-bold uppercase tracking-wide">Ses kaydı</p>
                <p className="text-xs text-gray-300 italic leading-relaxed">"{transcript}"</p>
              </div>

              <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wide">Tespit Edilen Bilgiler</p>
              <div className="space-y-1.5 mb-5">
                {[
                  ['🍯','Bal Stoğu', detectedFields.honey_stock_kg != null ? `${detectedFields.honey_stock_kg} kg` : null],
                  ['🥚','Kuluçka', detectedFields.brood_status],
                  ['💪','Koloni', detectedFields.colony_strength],
                  ['😤','Hırçınlık', detectedFields.aggressiveness],
                  ['🖼️','Çerçeve', detectedFields.frame_count != null ? `${detectedFields.frame_count} adet` : null],
                  ['👑','Ana Arı', detectedFields.queen_seen != null ? (detectedFields.queen_seen ? 'Görüldü ✓' : 'Görülmedi ✗') : null],
                  ['💊','Hastalık', detectedFields.disease_signs != null ? (detectedFields.disease_signs ? (detectedFields.disease_name || 'Belirti var') : 'Yok ✓') : null],
                  ['🌿','Besleme', detectedFields.feed_given != null ? (detectedFields.feed_given ? (detectedFields.feed_type || 'Verildi') : 'Verilmedi') : null],
                  ['📝','Notlar', detectedFields.notes],
                ].filter(([,,v]) => v != null).map(([icon, label, value]) => (
                  <div key={label} className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                    style={{ background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.18)' }}>
                    <span className="text-base">{icon}</span>
                    <span className="text-xs text-gray-400 w-16 flex-shrink-0">{label}</span>
                    <span className="text-sm font-semibold text-white">{value}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button onClick={reset} className="btn-ghost flex-1 justify-center text-sm">🔄 Tekrar</button>
                <button onClick={applyFields} className="btn-gold flex-1 justify-center text-sm">✅ Forma Uygula</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

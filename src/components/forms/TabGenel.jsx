import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import VoiceRecorder from '../voice/VoiceRecorder'
import { Html5Qrcode } from 'html5-qrcode'

export default function TabGenel({ hive, setHive }) {
  const { t } = useTranslation()
  const [showVoice, setShowVoice] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const scannerRef = useRef(null)
  const scannerInstanceRef = useRef(null)
  const set = (field, val) => setHive(prev => ({ ...prev, [field]: val }))

  useEffect(() => {
    if (showScanner) {
      setTimeout(() => {
        const html5QrCode = new Html5Qrcode('barcode-reader')
        scannerInstanceRef.current = html5QrCode
        html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 100 } },
          (decodedText) => {
            set('barcode', decodedText)
            stopScanner()
          },
          () => {}
        ).catch(err => {
          console.error('Kamera başlatılamadı:', err)
        })
      }, 300)
    }
    return () => {
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.stop().catch(() => {})
        scannerInstanceRef.current = null
      }
    }
  }, [showScanner])

  function stopScanner() {
    if (scannerInstanceRef.current) {
      scannerInstanceRef.current.stop().then(() => {
        scannerInstanceRef.current = null
        setShowScanner(false)
      }).catch(() => {
        scannerInstanceRef.current = null
        setShowScanner(false)
      })
    } else {
      setShowScanner(false)
    }
  }

  function handleVoiceFields(fields) {
    setHive(prev => ({
      ...prev,
      ...(fields.honey_stock_kg != null && { honey_stock_kg: fields.honey_stock_kg }),
      ...(fields.brood_status != null && { brood_status: fields.brood_status }),
      ...(fields.aggressiveness != null && { aggressiveness: fields.aggressiveness }),
      ...(fields.frame_count != null && { frame_count: fields.frame_count }),
      ...(fields.notes != null && { notes: (prev.notes ? prev.notes + '\n' : '') + fields.notes }),
    }))
  }

  return (
    <div className="p-6">
      {showVoice && (
        <VoiceRecorder
          hive={hive}
          onFieldsDetected={handleVoiceFields}
          onClose={() => setShowVoice(false)}
        />
      )}

      {/* Barkod Tarayıcı Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-dark-200 rounded-2xl p-5 w-full max-w-sm" style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-base">{t('hive_form_tab.scan_barcode')}</h3>
              <button onClick={stopScanner} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
            </div>
            <div id="barcode-reader" className="w-full rounded-xl overflow-hidden" style={{ minHeight: 220 }} />
            <p className="text-xs text-gray-400 text-center mt-3">{t('hive_form_tab.align_barcode')}</p>
            <button onClick={stopScanner} className="btn-ghost w-full mt-3">{t('common.cancel')}</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-black">{t('hive_form.general_title')}</h2>
          <button onClick={() => setShowVoice(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
            style={{ background: 'rgba(245,197,24,0.15)', border: '1px solid rgba(245,197,24,0.4)', color: '#f5c518' }}>
            🎙️ {t('hive_form_tab.voice_record_short')}
          </button>
        </div>
        <p className="text-sm text-gray-400 mb-6">{t('hive_form.general_desc')}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="field-label">{t('hive_form.hive_no')}</label>
            <input value={hive.hive_no} onChange={e => set('hive_no', e.target.value)} />
          </div>
          <div>
            <label className="field-label">{t('hive_form.barcode')}</label>
            <div className="flex gap-1.5">
              <input value={hive.barcode || ''} onChange={e => set('barcode', e.target.value)}
                placeholder="TR-34-1001" className="flex-1" style={{ width: 'auto' }} />
              <button className="bg-dark-50 border border-white/10 rounded-lg px-2.5 text-lg flex-shrink-0" onClick={() => setShowScanner(true)} title={t('hive_form_tab.scan_barcode')}>📷</button>
            </div>
          </div>
          <div>
            <label className="field-label">{t('hive_form.source')}</label>
            <select value={hive.source || 'Kendi Arım'} onChange={e => set('source', e.target.value)}>
              <option value="Kendi Arım">{t('hive_form_tab.source_own')}</option><option value="Satın Alınan">{t('hive_form_tab.source_purchased')}</option>
              <option value="Oğul">{t('hive_form_tab.source_swarm')}</option><option value="Bağış">{t('hive_form_tab.source_donation')}</option>
            </select>
          </div>
          <div>
            <label className="field-label">{t('hive_form.hive_type')}</label>
            <select value={hive.hive_type || 'Langstroth'} onChange={e => set('hive_type', e.target.value)}>
              <option>Langstroth</option><option>Dadant</option>
              <option>Nijemce</option><option value="Kare Kovan">{t('hive_form_tab.hive_type_square')}</option>
            </select>
          </div>
          <div>
            <label className="field-label">{t('hive_form_tab.frame_count')}</label>
            <input type="number" min="0" max="20"
              value={hive.frame_count || 10} onChange={e => set('frame_count', parseInt(e.target.value))} />
          </div>
          <div>
            <label className="field-label">{t('hive_form.honey_stock')}</label>
            <input type="number" min="0" step="0.5"
              value={hive.honey_stock_kg || 0} onChange={e => set('honey_stock_kg', parseFloat(e.target.value))} />
          </div>
          <div>
            <label className="field-label">{t('hive_form.brood_status')}</label>
            <select value={hive.brood_status || 'İyi'} onChange={e => set('brood_status', e.target.value)}>
              <option value="İyi">{t('hive_form_tab.brood_good')}</option><option value="Orta">{t('reports.colony_medium')}</option><option value="Zayıf">{t('reports.colony_weak')}</option><option value="Yok">{t('hive_form_tab.brood_none')}</option>
            </select>
          </div>
          <div>
            <label className="field-label">{t('hive_form.aggression')}</label>
            <select value={hive.aggressiveness || ''} onChange={e => set('aggressiveness', e.target.value)}>
              <option value="">{t('hive_form_tab.please_select')}</option>
              <option value="Sakin">{t('hive_form_tab.agg_calm')}</option><option value="Normal">{t('hive_form_tab.agg_normal')}</option><option value="Hırçın">{t('hive_form_tab.agg_aggressive')}</option><option value="Çok Hırçın">{t('hive_form_tab.agg_very_aggressive')}</option>
            </select>
          </div>
          <div className="flex items-center pt-5">
            <Toggle label={t('hive_form_tab.ventilated_bottom')} checked={hive.has_ventilated_bottom}
              onChange={v => set('has_ventilated_bottom', v)} />
          </div>
        </div>

        <div className="flex flex-wrap gap-6 mt-2 pt-4 border-t border-white/8">
          <Toggle label={t('hive_form_tab.pollen_trap')} checked={hive.has_pollen_trap}
            onChange={v => set('has_pollen_trap', v)} />
        </div>

        <div className="mt-4">
          <label className="field-label">{t('hive_form.notes')}</label>
          <textarea rows={3} value={hive.notes || ''}
            onChange={e => set('notes', e.target.value)}
            placeholder={t('hive_form_tab.notes_placeholder')} className="resize-none" />
        </div>
      </div>
    </div>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onChange(!checked)}>
      <div className={`toggle-switch ${checked ? 'on' : ''}`}/>
      <span className="text-sm font-semibold text-gray-300">{label}</span>
    </div>
  )
}

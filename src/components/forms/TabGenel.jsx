import { useState } from 'react'
import VoiceRecorder from '../voice/VoiceRecorder'

export default function TabGenel({ hive, setHive }) {
  const [showVoice, setShowVoice] = useState(false)
  const set = (field, val) => setHive(prev => ({ ...prev, [field]: val }))

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

      <div className="card">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-black">Genel Kovan Bilgileri</h2>
          <button onClick={() => setShowVoice(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
            style={{ background: 'rgba(245,197,24,0.15)', border: '1px solid rgba(245,197,24,0.4)', color: '#f5c518' }}>
            🎙️ Sesli Kayıt
          </button>
        </div>
        <p className="text-sm text-gray-400 mb-6">Kovanın temel kimlik ve özellik bilgileri.</p>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="field-label">Kovan No</label>
            <input value={hive.hive_no} onChange={e => set('hive_no', e.target.value)} />
          </div>
          <div>
            <label className="field-label">Birlik Barkod No</label>
            <div className="flex gap-1.5">
              <input value={hive.barcode || ''} onChange={e => set('barcode', e.target.value)}
                placeholder="TR-34-1001" className="flex-1" style={{ width: 'auto' }} />
              <button className="bg-dark-50 border border-white/10 rounded-lg px-2.5 text-lg flex-shrink-0">📷</button>
            </div>
          </div>
          <div>
            <label className="field-label">Kaynak</label>
            <select value={hive.source || 'Kendi Arım'} onChange={e => set('source', e.target.value)}>
              <option>Kendi Arım</option><option>Satın Alınan</option>
              <option>Oğul</option><option>Bağış</option>
            </select>
          </div>
          <div>
            <label className="field-label">Kovan Tipi</label>
            <select value={hive.hive_type || 'Langstroth'} onChange={e => set('hive_type', e.target.value)}>
              <option>Langstroth</option><option>Dadant</option>
              <option>Nijemce</option><option>Kare Kovan</option>
            </select>
          </div>
          <div>
            <label className="field-label">Çerçeve Sayısı</label>
            <input type="number" min="0" max="20"
              value={hive.frame_count || 10} onChange={e => set('frame_count', parseInt(e.target.value))} />
          </div>
          <div>
            <label className="field-label">Bal Stoğu (KG)</label>
            <input type="number" min="0" step="0.5"
              value={hive.honey_stock_kg || 0} onChange={e => set('honey_stock_kg', parseFloat(e.target.value))} />
          </div>
          <div>
            <label className="field-label">Kuluçka Durumu</label>
            <select value={hive.brood_status || 'İyi'} onChange={e => set('brood_status', e.target.value)}>
              <option>İyi</option><option>Orta</option><option>Zayıf</option><option>Yok</option>
            </select>
          </div>
          <div>
            <label className="field-label">Hırçınlık</label>
            <select value={hive.aggressiveness || ''} onChange={e => set('aggressiveness', e.target.value)}>
              <option value="">Seçiniz</option>
              <option>Sakin</option><option>Normal</option><option>Hırçın</option><option>Çok Hırçın</option>
            </select>
          </div>
          <div className="flex items-center pt-5">
            <Toggle label="Taban Delikli?" checked={hive.has_ventilated_bottom}
              onChange={v => set('has_ventilated_bottom', v)} />
          </div>
        </div>

        <div className="flex flex-wrap gap-6 mt-2 pt-4 border-t border-white/8">
          <Toggle label="Polen Tuzağı Var mı?" checked={hive.has_pollen_trap}
            onChange={v => set('has_pollen_trap', v)} />
        </div>

        <div className="mt-4">
          <label className="field-label">Notlar</label>
          <textarea rows={3} value={hive.notes || ''}
            onChange={e => set('notes', e.target.value)}
            placeholder="Kovan hakkında notlar..." className="resize-none" />
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

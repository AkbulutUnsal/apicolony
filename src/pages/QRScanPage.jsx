import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import HexLogo from '../components/ui/HexLogo'

export default function QRScanPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const scannerRef = useRef(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    startScanner()
    return () => stopScanner()
  }, [])

  async function startScanner() {
    try {
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner
      setScanning(true)
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await stopScanner()
          await handleScan(decodedText)
        },
        () => {} // hata sessizce yoksay
      )
    } catch (err) {
      setError(t('qr_scan.camera_error'))
      setScanning(false)
    }
  }

  async function stopScanner() {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop()
        scannerRef.current = null
        setScanning(false)
      }
    } catch {}
  }

  async function handleScan(text) {
    setResult(text)
    // QR içeriği: hive UUID ya da URL içindeki UUID
    let hiveId = text
    // Eğer URL formatındaysa UUID'yi çıkar
    const match = text.match(/\/kovan\/([a-f0-9-]{36})/)
    if (match) hiveId = match[1]

    // UUID formatını doğrula
    const isUUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(hiveId)
    if (!isUUID) {
      toast.error(t('qr_scan.invalid_qr'))
      return
    }

    // Kovanı DB'de ara
    const { data, error } = await supabase.from('hives').select('id, hive_no').eq('id', hiveId).single()
    if (error || !data) {
      toast.error(t('qr_scan.hive_not_found'))
      return
    }

    toast.success(t('qr_scan.hive_found', { hive: data.hive_no }))
    navigate(`/kovan/${data.id}`)
  }

  return (
    <div className="min-h-screen bg-dark-400 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <HexLogo size={44} className="mx-auto mb-3" />
          <h1 className="text-xl font-black text-white">{t('qr_scan.title')}</h1>
          <p className="text-sm text-gray-400 mt-1">{t('qr_scan.subtitle')}</p>
        </div>

        {/* Scanner */}
        <div className="relative">
          <div id="qr-reader" className="w-full rounded-2xl overflow-hidden" style={{ minHeight: 300 }} />

          {/* Tarama çerçevesi overlay */}
          {scanning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-56 h-56">
                {/* Köşe çizgileri */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-gold rounded-tl-lg"/>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-gold rounded-tr-lg"/>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-gold rounded-bl-lg"/>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-gold rounded-br-lg"/>
                {/* Tarama çizgisi animasyonu */}
                <div className="absolute left-0 right-0 h-0.5 bg-gold opacity-80 animate-scan-line"/>
              </div>
            </div>
          )}
        </div>

        {/* Hata mesajı */}
        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Butonlar */}
        <div className="flex gap-3 mt-6">
          <button className="btn-ghost flex-1 justify-center" onClick={() => navigate('/panel')}>
            ← {t('workers_page.back_to_panel')}
          </button>
          {!scanning && !error && (
            <button className="btn-gold flex-1 justify-center" onClick={startScanner}>
              🔄 {t('qr_scan.scan_again')}
            </button>
          )}
        </div>

        {/* Yardım */}
        <p className="text-center text-xs text-gray-500 mt-6">
          {t('qr_scan.help_text_1')}<br/>
          <span className="text-gold cursor-pointer" onClick={() => navigate('/panel')}>{t('qr_scan.help_link')}</span> {t('qr_scan.help_text_2')}
        </p>
      </div>
    </div>
  )
}

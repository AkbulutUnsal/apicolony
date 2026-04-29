import { useRef } from 'react'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'
import toast from 'react-hot-toast'

export default function HiveQRCode({ hive }) {
  const canvasRef = useRef(null)
  const qrValue = `${window.location.origin}/kovan/${hive.id}`

  function downloadQR() {
    const canvas = canvasRef.current?.querySelector('canvas')
    if (!canvas) { toast.error('QR oluşturulamadı'); return }

    // Kovan no'yu da ekleyerek yeni canvas oluştur
    const out = document.createElement('canvas')
    out.width = 320
    out.height = 380
    const ctx = out.getContext('2d')

    // Beyaz arka plan
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, out.width, out.height)

    // QR'ı ortala
    ctx.drawImage(canvas, 40, 20, 240, 240)

    // Kovan no
    ctx.fillStyle = '#1a1a1a'
    ctx.font = 'bold 28px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(hive.hive_no, 160, 300)

    ctx.fillStyle = '#888888'
    ctx.font = '16px Arial'
    ctx.fillText('ApiColony', 160, 330)

    const link = document.createElement('a')
    link.download = `${hive.hive_no}-qr.png`
    link.href = out.toDataURL('image/png')
    link.click()
    toast.success('QR kod indirildi!')
  }

  function printQR() {
    const canvas = canvasRef.current?.querySelector('canvas')
    if (!canvas) { toast.error('QR oluşturulamadı'); return }

    const dataUrl = canvas.toDataURL('image/png')
    const w = window.open('', '_blank', 'width=400,height=500')
    if (!w) { toast.error('Popup engellendi, tarayıcı ayarlarını kontrol et'); return }

    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${hive.hive_no} QR Kodu</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      display: flex; align-items: center; justify-content: center; 
      min-height: 100vh; background: #fff; font-family: Arial, sans-serif;
    }
    .wrap { 
      text-align: center; padding: 32px; 
      border: 2px solid #eee; border-radius: 16px;
      display: inline-block;
    }
    img { width: 240px; height: 240px; display: block; margin: 0 auto; }
    h2 { margin-top: 16px; font-size: 24px; color: #1a1a1a; letter-spacing: 1px; }
    p  { margin-top: 6px; font-size: 13px; color: #999; }
    @media print {
      body { margin: 0; }
      .wrap { border: none; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <img src="${dataUrl}" alt="QR Kod"/>
    <h2>${hive.hive_no}</h2>
    <p>ApiColony – Arı Koloni Takip</p>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 500);
    }
  <\/script>
</body>
</html>`)
    w.document.close()
  }

  return (
    <div className="card mt-4">
      <h3 className="font-black text-base mb-1">QR Kod</h3>
      <p className="text-xs text-gray-400 mb-4">
        Bu kodu kovana yapıştır, telefonla tara, hızlıca forma ulaş.
      </p>

      <div className="flex flex-col items-center gap-4">
        {/* Canvas QR - download/print için */}
        <div ref={canvasRef} className="bg-white p-3 rounded-xl shadow-lg">
          <QRCodeCanvas
            value={qrValue}
            size={180}
            level="M"
            bgColor="#ffffff"
            fgColor="#1a1200"
          />
        </div>

        <div className="text-center">
          <div className="font-black text-lg text-gold">{hive.hive_no}</div>
          <div className="text-xs text-gray-500 font-mono mt-0.5 max-w-[220px] truncate">{hive.id}</div>
        </div>

        <div className="flex gap-2 w-full">
          <button className="btn-gold flex-1 justify-center text-xs py-2.5" onClick={downloadQR}>
            ⬇ İndir (PNG)
          </button>
          <button className="btn-ghost flex-1 justify-center text-xs py-2.5" onClick={printQR}>
            🖨 Yazdır
          </button>
        </div>
      </div>
    </div>
  )
}

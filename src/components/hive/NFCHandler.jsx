import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function NFCHandler() {
  const navigate = useNavigate()
  const [scanning, setScanning] = useState(false)
  const supported = 'NDEFReader' in window

  async function startNFCScan() {
    if (!supported) {
      toast.error('Bu tarayıcı NFC desteklemiyor. Android Chrome gerekli.')
      return
    }
    try {
      setScanning(true)
      toast('NFC etiketi kovana yaklaştır...', { icon: '📡', duration: 5000 })
      const ndef = new window.NDEFReader()
      await ndef.scan()
      ndef.onreading = ({ message }) => {
        for (const record of message.records) {
          if (record.recordType === 'url') {
            const decoder = new TextDecoder()
            const url = decoder.decode(record.data)
            const match = url.match(/\/kovan\/([a-f0-9-]{36})/)
            if (match) {
              navigate(`/kovan/${match[1]}`)
              setScanning(false)
              return
            }
          }
          if (record.recordType === 'text') {
            const decoder = new TextDecoder()
            const text = decoder.decode(record.data)
            toast.success('NFC: ' + text)
          }
        }
        toast.error('Geçersiz NFC etiketi')
        setScanning(false)
      }
      ndef.onerror = () => { toast.error('NFC okuma hatası'); setScanning(false) }
    } catch (err) {
      toast.error('NFC: ' + err.message)
      setScanning(false)
    }
  }

  if (!supported) return null

  return (
    <button onClick={startNFCScan} disabled={scanning}
      className="btn-ghost text-sm"
      title="NFC Etiket Tara">
      {scanning ? '📡 Taranıyor...' : '📡 NFC'}
    </button>
  )
}

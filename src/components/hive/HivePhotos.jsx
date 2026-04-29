import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'

export default function HivePhotos({ hiveId, hiveNo }) {
  const { user } = useAuth()
  const [photos, setPhotos] = useState([])
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const inputRef = useRef()

  useEffect(() => { fetchPhotos() }, [hiveId])

  async function fetchPhotos() {
    const { data } = await supabase.storage
      .from('hive-photos')
      .list(`${user.id}/${hiveId}`, { sortBy: { column: 'created_at', order: 'desc' } })
    if (data) {
      const withUrls = await Promise.all(data.map(async (file) => {
        const { data: url } = supabase.storage
          .from('hive-photos')
          .getPublicUrl(`${user.id}/${hiveId}/${file.name}`)
        return { ...file, url: url.publicUrl }
      }))
      setPhotos(withUrls)
    }
  }

  async function uploadPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Maksimum 5MB'); return }

    setUploading(true)
    const ext = file.name.split('.').pop()
    const fileName = `${Date.now()}.${ext}`
    const path = `${user.id}/${hiveId}/${fileName}`

    const { error } = await supabase.storage
      .from('hive-photos')
      .upload(path, file, { cacheControl: '3600', upsert: false })

    if (error) {
      toast.error('Yükleme hatası: ' + error.message)
    } else {
      toast.success('Fotoğraf yüklendi!')
      await fetchPhotos()
    }
    setUploading(false)
    e.target.value = ''
  }

  async function deletePhoto(fileName) {
    if (!confirm('Bu fotoğrafı silmek istediğinize emin misiniz?')) return
    await supabase.storage
      .from('hive-photos')
      .remove([`${user.id}/${hiveId}/${fileName}`])
    setPhotos(prev => prev.filter(p => p.name !== fileName))
    toast.success('Silindi')
  }

  return (
    <div className="card mt-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-black text-base">📸 Fotoğraflar</h3>
          <p className="text-xs text-gray-400 mt-0.5">{hiveNo} kovanına ait görseller</p>
        </div>
        <div className="flex gap-2">
          {/* Kamera - mobilde direkt açar */}
          <button onClick={() => {
            inputRef.current.accept = 'image/*'
            inputRef.current.capture = 'environment'
            inputRef.current.click()
          }}
            className="btn-ghost text-sm py-1.5 px-3"
            disabled={uploading}>
            📷 Çek
          </button>
          <button onClick={() => {
            inputRef.current.removeAttribute('capture')
            inputRef.current.click()
          }}
            className="btn-gold text-sm py-1.5 px-3"
            disabled={uploading}>
            {uploading ? '⏳' : '+ Ekle'}
          </button>
        </div>
        <input ref={inputRef} type="file" accept="image/*"
          className="hidden" onChange={uploadPhoto} />
      </div>

      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-500 cursor-pointer"
          onClick={() => inputRef.current.click()}
          style={{ border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 12 }}>
          <span className="text-4xl mb-2">📷</span>
          <span className="text-sm">Fotoğraf eklemek için tıkla</span>
          <span className="text-xs text-gray-600 mt-1">Maks 5MB · JPG, PNG, WEBP</span>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map(photo => (
            <div key={photo.name} className="relative group aspect-square rounded-xl overflow-hidden cursor-pointer"
              onClick={() => setPreview(photo.url)}>
              <img src={photo.url} alt="Kovan fotoğrafı"
                className="w-full h-full object-cover transition-transform group-hover:scale-105"/>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                style={{ background: 'rgba(0,0,0,0.5)' }}>
                <button onClick={e => { e.stopPropagation(); setPreview(photo.url) }}
                  className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm">
                  🔍
                </button>
                <button onClick={e => { e.stopPropagation(); deletePhoto(photo.name) }}
                  className="w-8 h-8 bg-red-500/60 rounded-full flex items-center justify-center text-sm">
                  🗑
                </button>
              </div>
            </div>
          ))}
          {/* Yeni ekle butonu */}
          <div onClick={() => inputRef.current.click()}
            className="aspect-square rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-dark-50 transition-colors"
            style={{ border: '2px dashed rgba(255,255,255,0.12)' }}>
            <span className="text-2xl text-gray-600">+</span>
          </div>
        </div>
      )}

      {/* Önizleme modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.9)' }}
          onClick={() => setPreview(null)}>
          <img src={preview} alt="Önizleme"
            className="max-w-full max-h-full rounded-xl object-contain"
            style={{ maxHeight: '85vh' }}/>
          <button className="absolute top-4 right-4 w-10 h-10 bg-dark-200 rounded-full flex items-center justify-center text-lg"
            onClick={() => setPreview(null)}>✕</button>
        </div>
      )}
    </div>
  )
}

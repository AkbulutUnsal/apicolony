import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import HexLogo from '../components/ui/HexLogo'

export default function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await signUp(email, password, fullName)
      toast.success('Hesap oluşturuldu! Giriş yapabilirsiniz.')
      navigate('/giris')
    } catch (err) {
      toast.error(err.message || 'Kayıt başarısız')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-400 flex items-center justify-center p-4">
      <div className="bg-dark-200 border border-white/10 rounded-2xl p-10 w-full max-w-sm text-center shadow-2xl">
        <HexLogo size={52} className="mx-auto mb-5" />
        <h1 className="text-2xl font-black mb-2">Hesap Oluştur</h1>
        <p className="text-sm text-gray-400 mb-8">ApiColony'e ücretsiz kayıt olun.</p>

        <form onSubmit={handleSubmit} className="text-left space-y-4">
          <div>
            <label className="field-label">Ad Soyad</label>
            <input type="text" placeholder="Ünsal Akbulut" value={fullName} onChange={e => setFullName(e.target.value)} required />
          </div>
          <div>
            <label className="field-label">E-posta</label>
            <input type="email" placeholder="m@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="field-label">Şifre</label>
            <input type="password" placeholder="En az 6 karakter" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          <button type="submit" disabled={loading}
            className="btn-gold w-full justify-center py-3 text-base mt-2">
            {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
          </button>
        </form>
        <p className="mt-5 text-sm text-gray-400">
          Zaten hesabınız var mı?{' '}
          <Link to="/giris" className="text-gold hover:underline font-semibold">Giriş yap</Link>
        </p>
      </div>
    </div>
  )
}

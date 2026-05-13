import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import HexLogo from '../components/ui/HexLogo'

export default function LoginPage() {
  const { signIn } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/kim-calisiyor')
    } catch (err) {
      toast.error(err.message || t('auth.login_error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-400 flex items-center justify-center p-4">
      <div className="bg-dark-200 border border-white/10 rounded-2xl p-10 w-full max-w-sm text-center shadow-2xl">
        <HexLogo size={52} className="mx-auto mb-5" />
        <h1 className="text-2xl font-black mb-2">{t('auth.login_title')}</h1>
        <p className="text-sm text-gray-400 mb-8">{t('auth.login_subtitle')}</p>

        <form onSubmit={handleSubmit} className="text-left space-y-4">
          <div>
            <label className="field-label">{t('auth.email')}</label>
            <input type="email" placeholder="m@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="field-label">{t('auth.password')}</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" disabled={loading}
            className="btn-gold w-full justify-center py-3 text-base mt-2">
            {loading ? t('auth.logging_in') : t('auth.login_btn')}
          </button>
        </form>
        <p className="mt-5 text-sm text-gray-400">
          {t('auth.no_account')}{' '}
          <Link to="/kayit" className="text-gold hover:underline font-semibold">{t('auth.register_link')}</Link>
        </p>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useSubscription } from '../hooks/useSubscription'
import Navbar from '../components/layout/Navbar'
import toast from 'react-hot-toast'
import { PLAN_TIERS, PLAN_ORDER, PAYMENT_INSTRUCTIONS } from '../lib/plans'

export default function BillingPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { sub, inTrial, hasActivePaid, isReadOnly, trialDaysLeft, plan, refresh } = useSubscription()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [country, setCountry] = useState('TR')
  const [refNote, setRefNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { if (user) fetchRequests() }, [user])

  async function fetchRequests() {
    const { data } = await supabase.from('payment_requests').select('*').eq('user_id', user.id).order('requested_at', { ascending: false })
    setRequests(data || [])
    setLoading(false)
  }

  async function submitPaymentNotice() {
    if (!selectedPlan) return
    setSubmitting(true)
    const tier = PLAN_TIERS[selectedPlan]
    const { error } = await supabase.from('payment_requests').insert({
      user_id: user.id,
      plan_requested: selectedPlan,
      amount: tier.priceTRY,
      currency: country === 'TR' ? 'TRY' : 'GEL',
      reference_note: refNote.trim() || null,
    })
    if (error) { toast.error(t('billing.submit_error') + ': ' + error.message); setSubmitting(false); return }
    toast.success(t('billing.submit_success'))
    setSelectedPlan(null)
    setRefNote('')
    setSubmitting(false)
    fetchRequests()
  }

  const statusLabel = (s) => ({
    pending: t('billing.status_pending'),
    approved: t('billing.status_approved'),
    rejected: t('billing.status_rejected'),
  }[s] || s)

  const statusColor = { pending: '#e67e22', approved: '#27ae60', rejected: '#e74c3c' }

  return (
    <div className="min-h-screen bg-dark-400 flex flex-col">
      <Navbar />
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <h1 className="text-2xl font-black mb-1">{t('billing.title')}</h1>
        <p className="text-gray-400 text-sm mb-6">{t('billing.subtitle')}</p>

        {/* Mevcut durum */}
        <div className="card mb-6" style={{
          border: isReadOnly ? '1px solid rgba(231,76,60,0.4)' : inTrial ? '1px solid rgba(245,197,24,0.4)' : '1px solid rgba(39,174,96,0.4)',
          background: isReadOnly ? 'rgba(231,76,60,0.06)' : inTrial ? 'rgba(245,197,24,0.06)' : 'rgba(39,174,96,0.06)'
        }}>
          {isReadOnly && (
            <>
              <div className="font-black text-red-400 mb-1">🔒 {t('billing.status_readonly_title')}</div>
              <p className="text-sm text-gray-300">{t('billing.status_readonly_desc')}</p>
            </>
          )}
          {inTrial && (
            <>
              <div className="font-black text-gold mb-1">⏳ {t('billing.status_trial_title', { days: trialDaysLeft })}</div>
              <p className="text-sm text-gray-300">{t('billing.status_trial_desc')}</p>
            </>
          )}
          {!inTrial && hasActivePaid && (
            <>
              <div className="font-black text-green-400 mb-1">✅ {t('billing.status_active_title', { plan: t(PLAN_TIERS[plan]?.nameKey || 'plans.tier_starter') })}</div>
              <p className="text-sm text-gray-300">
                {t('billing.status_active_desc', { date: new Date(sub.current_period_ends_at).toLocaleDateString('tr-TR') })}
              </p>
            </>
          )}
        </div>

        {/* Plan kartları */}
        <h2 className="font-black text-lg mb-3">{t('billing.choose_plan')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {PLAN_ORDER.map(id => {
            const tier = PLAN_TIERS[id]
            const isCurrent = plan === id && hasActivePaid
            return (
              <div key={id} className="card flex flex-col" style={isCurrent ? { border: '1px solid rgba(245,197,24,0.5)' } : {}}>
                <div className="font-black text-base mb-1">{t(tier.nameKey)}</div>
                <div className="text-2xl font-black text-gold mb-1">
                  {tier.priceTRY ? `${tier.priceTRY} ₺` : t('billing.contact_us')}
                  {tier.priceTRY && <span className="text-xs text-gray-400 font-normal"> /{t('billing.per_month')}</span>}
                </div>
                <div className="text-sm text-gray-400 mb-4">
                  {tier.hiveLimit ? t('billing.up_to_hives', { count: tier.hiveLimit }) : t('billing.unlimited_hives')}
                </div>
                {isCurrent ? (
                  <div className="btn-ghost mt-auto text-center text-sm">{t('billing.current_plan')}</div>
                ) : (
                  <button className="btn-gold mt-auto" onClick={() => setSelectedPlan(id)}>{t('billing.select_plan')}</button>
                )}
              </div>
            )
          })}
        </div>

        {/* Ödeme bildirimi formu */}
        {selectedPlan && (
          <div className="card mb-8">
            <h2 className="font-black text-lg mb-1">{t('billing.pay_title', { plan: t(PLAN_TIERS[selectedPlan].nameKey) })}</h2>
            <p className="text-sm text-gray-400 mb-4">{t('billing.pay_desc')}</p>

            <div className="flex gap-2 mb-4">
              <button className={`tab-btn ${country === 'TR' ? 'active' : ''}`} onClick={() => setCountry('TR')}>🇹🇷 Türkiye</button>
              <button className={`tab-btn ${country === 'GE' ? 'active' : ''}`} onClick={() => setCountry('GE')}>🇬🇪 Georgia</button>
            </div>

            <div className="bg-dark-100 border border-white/8 rounded-xl p-4 mb-4 text-sm">
              <div className="flex justify-between py-1"><span className="text-gray-400">{t('billing.bank_name')}</span><span className="font-bold">{PAYMENT_INSTRUCTIONS[country].bankName}</span></div>
              <div className="flex justify-between py-1"><span className="text-gray-400">IBAN</span><span className="font-bold">{PAYMENT_INSTRUCTIONS[country].iban}</span></div>
              <div className="flex justify-between py-1"><span className="text-gray-400">{t('billing.account_holder')}</span><span className="font-bold">{PAYMENT_INSTRUCTIONS[country].accountHolder}</span></div>
              <div className="flex justify-between py-1"><span className="text-gray-400">{t('billing.amount')}</span><span className="font-bold text-gold">{PLAN_TIERS[selectedPlan].priceTRY} ₺</span></div>
            </div>

            <label className="field-label">{t('billing.reference_label')}</label>
            <textarea rows={2} value={refNote} onChange={e => setRefNote(e.target.value)} className="resize-none mb-4"
              placeholder={t('billing.reference_placeholder')} />

            <div className="flex gap-2">
              <button className="btn-gold" onClick={submitPaymentNotice} disabled={submitting}>
                {submitting ? t('common.saving') : t('billing.submit_notice')}
              </button>
              <button className="btn-ghost" onClick={() => setSelectedPlan(null)}>{t('common.cancel')}</button>
            </div>
          </div>
        )}

        {/* Geçmiş ödeme bildirimleri */}
        <h2 className="font-black text-lg mb-3">{t('billing.history_title')}</h2>
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin"/></div>
        ) : requests.length === 0 ? (
          <p className="text-gray-500 text-sm">{t('billing.no_history')}</p>
        ) : (
          <div className="space-y-2">
            {requests.map(r => (
              <div key={r.id} className="bg-dark-100 border border-white/8 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm">{t(PLAN_TIERS[r.plan_requested]?.nameKey || 'plans.tier_starter')} — {r.amount} {r.currency}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{new Date(r.requested_at).toLocaleDateString('tr-TR')}</div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ background: statusColor[r.status] + '22', color: statusColor[r.status] }}>
                  {statusLabel(r.status)}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

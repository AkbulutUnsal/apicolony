import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/layout/Navbar'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const EXPENSE_CATS = ['Şeker / Kek', 'İlaç / Tedavi', 'Kovan / Ekipman', 'Ana Arı', 'Nakliye', 'İşçilik', 'Ambalaj', 'Diğer']
const INCOME_CATS = ['Bal Satışı', 'Oğul Satışı', 'Ana Arı Satışı', 'Diğer']
const EXPENSE_CAT_KEYS = {
  'Şeker / Kek': 'finance_page.exp_sugar', 'İlaç / Tedavi': 'finance_page.exp_medicine',
  'Kovan / Ekipman': 'finance_page.exp_equipment', 'Ana Arı': 'finance_page.exp_queen',
  'Nakliye': 'finance_page.exp_transport', 'İşçilik': 'finance_page.exp_labor',
  'Ambalaj': 'finance_page.exp_packaging', 'Diğer': 'reports.honey_type_other',
}
const INCOME_CAT_KEYS = {
  'Bal Satışı': 'finance_page.inc_honey_sale', 'Oğul Satışı': 'finance_page.inc_swarm_sale',
  'Ana Arı Satışı': 'finance_page.inc_queen_sale', 'Diğer': 'reports.honey_type_other',
}

const EMPTY_EXPENSE = {
  record_date: new Date().toISOString().slice(0, 10),
  category: 'Şeker / Kek',
  description: '',
  amount: '',
  apiary_id: ''
}
const EMPTY_INCOME = {
  record_date: new Date().toISOString().slice(0, 10),
  category: 'Bal Satışı',
  description: '',
  amount: '',
  quantity_kg: '',
  apiary_id: ''
}

export default function FinancePage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [expenses, setExpenses] = useState([])
  const [incomes, setIncomes] = useState([])
  const [apiaries, setApiaries] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ozet') // ozet | gider | gelir
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showIncomeForm, setShowIncomeForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE)
  const [incomeForm, setIncomeForm] = useState(EMPTY_INCOME)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())

  useEffect(() => { if (user) fetchAll() }, [user])

  async function fetchAll() {
    setLoading(true)
    const [expRes, incRes, apRes] = await Promise.all([
      supabase.from('cost_records').select('*, apiaries(name)').eq('user_id', user.id).order('record_date', { ascending: false }),
      supabase.from('income_records').select('*, apiaries(name)').eq('user_id', user.id).order('record_date', { ascending: false }),
      supabase.from('apiaries').select('id, name').eq('user_id', user.id).order('name')
    ])
    setExpenses(expRes.data || [])
    setIncomes(incRes.data || [])
    setApiaries(apRes.data || [])
    setLoading(false)
  }

  async function saveExpense() {
    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) { toast.error(t('finance.error_amount')); return }
    setSaving(true)
    const { error } = await supabase.from('cost_records').insert({
      user_id: user.id,
      record_date: expenseForm.record_date,
      category: expenseForm.category,
      description: expenseForm.description.trim() || null,
      amount: parseFloat(expenseForm.amount),
      apiary_id: expenseForm.apiary_id || null
    })
    if (error) toast.error(t('common.error_save') + ': ' + error.message)
    else { toast.success(t('finance.expense_added')); setShowExpenseForm(false); setExpenseForm(EMPTY_EXPENSE); fetchAll() }
    setSaving(false)
  }

  async function saveIncome() {
    if (!incomeForm.amount || parseFloat(incomeForm.amount) <= 0) { toast.error(t('finance.error_amount')); return }
    setSaving(true)
    const { error } = await supabase.from('income_records').insert({
      user_id: user.id,
      record_date: incomeForm.record_date,
      category: incomeForm.category,
      description: incomeForm.description.trim() || null,
      amount: parseFloat(incomeForm.amount),
      quantity_kg: incomeForm.quantity_kg ? parseFloat(incomeForm.quantity_kg) : null,
      apiary_id: incomeForm.apiary_id || null
    })
    if (error) toast.error(t('common.error_save') + ': ' + error.message)
    else { toast.success(t('finance.income_added')); setShowIncomeForm(false); setIncomeForm(EMPTY_INCOME); fetchAll() }
    setSaving(false)
  }

  async function deleteRecord(table, id) {
    if (!confirm(t('finance_page.confirm_delete'))) return
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) toast.error(t('finance_page.delete_failed'))
    else { toast.success(t('common.deleted')); fetchAll() }
  }

  // Yıl filtresi
  const yearStr = String(filterYear)
  const filteredExpenses = expenses.filter(e => e.record_date?.startsWith(yearStr))
  const filteredIncomes = incomes.filter(i => i.record_date?.startsWith(yearStr))

  // Hesaplamalar
  const totalExpense = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0)
  const totalIncome = filteredIncomes.reduce((s, i) => s + (i.amount || 0), 0)
  const profit = totalIncome - totalExpense
  const totalKgSold = filteredIncomes.filter(i => i.category === 'Bal Satışı' && i.quantity_kg).reduce((s, i) => s + (i.quantity_kg || 0), 0)
  const kgPrice = totalKgSold > 0 ? (filteredIncomes.filter(i => i.category === 'Bal Satışı').reduce((s, i) => s + (i.amount || 0), 0) / totalKgSold) : 0

  // Aylık grafik
  const months = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0')
    const key = `${yearStr}-${m}`
    const label = new Date(filterYear, i, 1).toLocaleDateString('tr-TR', { month: 'short' })
    return {
      label,
      Gider: filteredExpenses.filter(e => e.record_date?.startsWith(key)).reduce((s, e) => s + (e.amount || 0), 0),
      Gelir: filteredIncomes.filter(i => i.record_date?.startsWith(key)).reduce((s, i) => s + (i.amount || 0), 0)
    }
  })

  // Kategori dağılımı
  const expenseByCat = EXPENSE_CATS.map(cat => ({
    cat,
    total: filteredExpenses.filter(e => e.category === cat).reduce((s, e) => s + (e.amount || 0), 0)
  })).filter(x => x.total > 0).sort((a, b) => b.total - a.total)

  const years = [...new Set([...expenses, ...incomes].map(r => r.record_date?.slice(0, 4)).filter(Boolean))].sort().reverse()
  if (!years.includes(String(filterYear))) years.unshift(String(filterYear))

  return (
    <div className="min-h-screen bg-dark-400 flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full">

        {/* Başlık */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-black">{t('finance.title')}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{t('finance.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <select value={filterYear} onChange={e => setFilterYear(parseInt(e.target.value))}
              className="text-sm px-3 py-2 rounded-lg" style={{ width: 'auto' }}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="btn-ghost text-sm" onClick={() => { setIncomeForm(EMPTY_INCOME); setShowIncomeForm(true) }}>
              {t('finance.add_income')}
            </button>
            <button className="btn-gold text-sm" onClick={() => { setExpenseForm(EMPTY_EXPENSE); setShowExpenseForm(true) }}>
              {t('finance.add_expense')}
            </button>
          </div>
        </div>

        {/* Özet kartlar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <SummaryCard label={t('reports.kpi_total_income')} value={`${totalIncome.toLocaleString('tr-TR')} ₺`} color="#27ae60" icon="📈" />
          <SummaryCard label={t('reports.kpi_total_expense')} value={`${totalExpense.toLocaleString('tr-TR')} ₺`} color="#e74c3c" icon="📉" />
          <SummaryCard label={t('reports.kpi_profit_loss')} value={`${profit >= 0 ? '+' : ''}${profit.toLocaleString('tr-TR')} ₺`}
            color={profit >= 0 ? '#27ae60' : '#e74c3c'} icon={profit >= 0 ? '✅' : '⚠️'} />
          <SummaryCard label={t('reports.kpi_avg_kg_price')} value={kgPrice > 0 ? `${kgPrice.toFixed(0)} ₺/kg` : '—'} color="#f5c518" icon="⚖️" />
        </div>

        {/* Sekmeler */}
        <div className="flex mb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {[['ozet', '📊 ' + t('reports.tab_summary')], ['gider', '📉 ' + t('finance_page.expenses_tab')], ['gelir', '📈 ' + t('finance_page.incomes_tab')]].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`tab-btn ${activeTab === key ? 'active' : ''}`}>{label}</button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeTab === 'ozet' ? (
          <div className="flex flex-col gap-6">
            {/* Grafik */}
            {months.some(m => m.Gelir > 0 || m.Gider > 0) ? (
              <div className="card">
                <h3 className="font-bold text-sm mb-4">{filterYear} {t('finance_page.monthly_income_expense')}</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={months} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" tick={{ fill: '#888', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#888', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#2e2e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Gelir" name={t('finance_page.income')} fill="#27ae60" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Gider" name={t('finance_page.expense')} fill="#e74c3c" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="card text-center py-8 text-gray-500">
                <p>{t('finance_page.enter_records_for_chart')}</p>
              </div>
            )}

            {/* Gider kategorileri */}
            {expenseByCat.length > 0 && (
              <div className="card">
                <h3 className="font-bold text-sm mb-4">{t('finance_page.expense_categories')}</h3>
                <div className="flex flex-col gap-2">
                  {expenseByCat.map(({ cat, total }) => (
                    <div key={cat} className="flex items-center gap-3">
                      <div className="text-xs text-gray-400 w-28 flex-shrink-0">{t(EXPENSE_CAT_KEYS[cat] || 'reports.honey_type_other')}</div>
                      <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div className="h-full rounded-full" style={{
                          width: `${(total / totalExpense) * 100}%`,
                          background: 'linear-gradient(to right, #e74c3c, #e67e22)'
                        }} />
                      </div>
                      <div className="text-xs font-bold text-right w-20 flex-shrink-0">{total.toLocaleString('tr-TR')} ₺</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'gider' ? (
          <RecordList
            records={filteredExpenses}
            type="expense"
            onDelete={id => deleteRecord('cost_records', id)}
            emptyText={t('finance_page.no_expense_records')}
            onAdd={() => { setExpenseForm(EMPTY_EXPENSE); setShowExpenseForm(true) }}
          />
        ) : (
          <RecordList
            records={filteredIncomes}
            type="income"
            onDelete={id => deleteRecord('income_records', id)}
            emptyText={t('finance_page.no_income_records')}
            onAdd={() => { setIncomeForm(EMPTY_INCOME); setShowIncomeForm(true) }}
          />
        )}

        {/* Gider Form Modal */}
        {showExpenseForm && (
          <FormModal title={t('finance.expense_title')} onClose={() => setShowExpenseForm(false)}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">{t('common.date')}</label>
                <input type="date" value={expenseForm.record_date} onChange={e => setExpenseForm(p => ({ ...p, record_date: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">{t('finance_page.category')}</label>
                <select value={expenseForm.category} onChange={e => setExpenseForm(p => ({ ...p, category: e.target.value }))}>
                  {EXPENSE_CATS.map(c => <option key={c} value={c}>{t(EXPENSE_CAT_KEYS[c])}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="field-label">{t('finance_page.description')}</label>
                <input value={expenseForm.description} onChange={e => setExpenseForm(p => ({ ...p, description: e.target.value }))}
                  placeholder={t('finance_page.expense_placeholder')} />
              </div>
              <div>
                <label className="field-label">{t('finance_page.amount_try')} *</label>
                <input type="number" min="0" step="0.01" value={expenseForm.amount}
                  onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
              </div>
              {apiaries.length > 0 && (
                <div>
                  <label className="field-label">{t('finance_page.apiary')}</label>
                  <select value={expenseForm.apiary_id} onChange={e => setExpenseForm(p => ({ ...p, apiary_id: e.target.value }))}>
                    <option value="">{t('harvest_page.general_label')}</option>
                    {apiaries.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button className="btn-gold" onClick={saveExpense} disabled={saving}>{saving ? '⏳' : t('common.save')}</button>
              <button className="btn-ghost" onClick={() => setShowExpenseForm(false)}>{t('common.cancel')}</button>
            </div>
          </FormModal>
        )}

        {/* Gelir Form Modal */}
        {showIncomeForm && (
          <FormModal title={t('finance.income_title')} onClose={() => setShowIncomeForm(false)}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">{t('common.date')}</label>
                <input type="date" value={incomeForm.record_date} onChange={e => setIncomeForm(p => ({ ...p, record_date: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">{t('finance_page.category')}</label>
                <select value={incomeForm.category} onChange={e => setIncomeForm(p => ({ ...p, category: e.target.value }))}>
                  {INCOME_CATS.map(c => <option key={c} value={c}>{t(INCOME_CAT_KEYS[c])}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="field-label">{t('finance_page.description')}</label>
                <input value={incomeForm.description} onChange={e => setIncomeForm(p => ({ ...p, description: e.target.value }))}
                  placeholder={t('finance_page.income_placeholder')} />
              </div>
              <div>
                <label className="field-label">{t('finance_page.amount_try')} *</label>
                <input type="number" min="0" step="0.01" value={incomeForm.amount}
                  onChange={e => setIncomeForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <label className="field-label">{t('finance_page.kg_for_honey_sale')}</label>
                <input type="number" min="0" step="0.1" value={incomeForm.quantity_kg}
                  onChange={e => setIncomeForm(p => ({ ...p, quantity_kg: e.target.value }))} placeholder="0.0" />
              </div>
              {apiaries.length > 0 && (
                <div className="col-span-2">
                  <label className="field-label">{t('finance_page.apiary')}</label>
                  <select value={incomeForm.apiary_id} onChange={e => setIncomeForm(p => ({ ...p, apiary_id: e.target.value }))}>
                    <option value="">{t('harvest_page.general_label')}</option>
                    {apiaries.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button className="btn-gold" onClick={saveIncome} disabled={saving}>{saving ? '⏳' : t('common.save')}</button>
              <button className="btn-ghost" onClick={() => setShowIncomeForm(false)}>{t('common.cancel')}</button>
            </div>
          </FormModal>
        )}
      </main>
    </div>
  )
}

function RecordList({ records, type, onDelete, emptyText, onAdd }) {
  const { t } = useTranslation()
  const catKeys = type === 'expense' ? EXPENSE_CAT_KEYS : INCOME_CAT_KEYS
  if (records.length === 0) return (
    <div className="card flex flex-col items-center py-12 text-center">
      <div className="text-4xl mb-3">{type === 'expense' ? '📉' : '📈'}</div>
      <p className="font-bold mb-4">{emptyText}</p>
      <button className="btn-gold" onClick={onAdd}>+ {t('common.add')}</button>
    </div>
  )
  return (
    <div className="flex flex-col gap-2">
      {records.map(rec => {
        const date = rec.record_date
          ? new Date(rec.record_date + 'T00:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
          : '—'
        return (
          <div key={rec.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: type === 'expense' ? 'rgba(231,76,60,0.1)' : 'rgba(39,174,96,0.1)' }}>
              {type === 'expense' ? '📉' : '📈'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm">{t(catKeys[rec.category] || 'reports.honey_type_other')}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {date}{rec.description && ` · ${rec.description}`}
                {rec.apiaries?.name && ` · ${rec.apiaries.name}`}
                {rec.quantity_kg && ` · ${rec.quantity_kg} kg`}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className={`font-black text-sm ${type === 'expense' ? 'text-red-400' : 'text-green-400'}`}>
                {type === 'expense' ? '-' : '+'}{rec.amount?.toLocaleString('tr-TR')} ₺
              </span>
              <button className="text-gray-600 hover:text-red-400 transition-colors text-sm" onClick={() => onDelete(rec.id)}>🗑️</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SummaryCard({ label, value, color, icon }) {
  return (
    <div className="card text-center py-3 px-3">
      <div className="text-xl mb-1">{icon}</div>
      <div className="font-black text-base leading-tight" style={{ color }}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  )
}

function FormModal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="bg-dark-200 rounded-2xl w-full max-w-lg my-8" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 className="font-black text-base">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div className="p-6 flex flex-col gap-4">{children}</div>
      </div>
    </div>
  )
}

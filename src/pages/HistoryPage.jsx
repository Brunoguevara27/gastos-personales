import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { HistorySkeleton } from '../components/Skeleton'

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const fmt = (n) => {
  if (n === null || n === undefined) return '-'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n)
}

const fmtShort = (n) =>
  new Intl.NumberFormat('es-AR', {
    notation: 'compact', style: 'currency', currency: 'ARS', minimumFractionDigits: 0,
  }).format(n || 0)

export default function HistoryPage() {
  const { user } = useAuth()
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const [categories, setCategories] = useState([])
  const [allExpenses, setAllExpenses] = useState([])
  const [allTransactions, setAllTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [{ data: cats }, { data: exps }, { data: txns }] = await Promise.all([
        supabase.from('categories').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('expenses').select('*').eq('user_id', user.id).order('year', { ascending: false }).order('month', { ascending: false }),
        supabase.from('transactions').select('*').eq('user_id', user.id).order('year', { ascending: false }).order('month', { ascending: false }),
      ])
      setCategories(cats || [])
      setAllExpenses(exps || [])
      setAllTransactions(txns || [])
      setLoading(false)
    }
    load()
  }, [user.id])

  // Combine month keys from both tables
  const monthKeys = [...new Set([
    ...allExpenses.map(e => `${e.year}-${String(e.month).padStart(2, '0')}`),
    ...allTransactions.map(t => `${t.year}-${String(t.month).padStart(2, '0')}`),
  ])].sort((a, b) => b.localeCompare(a))

  // Amount per category per month (fixed from expenses, variable from transactions)
  const getAmount = (year, month, cat) => {
    if (cat.is_variable) {
      const total = allTransactions
        .filter(t => t.category_id === cat.id && t.year === year && t.month === month)
        .reduce((s, t) => s + parseFloat(t.amount || 0), 0)
      return total > 0 ? total : null
    }
    const e = allExpenses.find(e => e.year === year && e.month === month && e.category_id === cat.id)
    return e ? parseFloat(e.amount) : null
  }

  const getTotal = (year, month) => {
    const fixed = allExpenses.filter(e => e.year === year && e.month === month).reduce((s, e) => s + parseFloat(e.amount || 0), 0)
    const variable = allTransactions.filter(t => t.year === year && t.month === month).reduce((s, t) => s + parseFloat(t.amount || 0), 0)
    return fixed + variable
  }

  if (loading) return <HistorySkeleton />

  if (monthKeys.length === 0) return (
    <div className="text-center py-20 text-gray-400 px-4">
      <p className="text-5xl mb-4">📋</p>
      <p className="font-medium text-gray-500">Todavía no hay gastos registrados.</p>
      <p className="text-sm mt-1">Empezá ingresando los gastos del mes actual desde Inicio.</p>
    </div>
  )

  // Average monthly total
  const allTotals = monthKeys.map(key => { const [y, m] = key.split('-').map(Number); return getTotal(y, m) })
  const avgTotal = allTotals.reduce((s, v) => s + v, 0) / allTotals.length

  // Group month keys by year
  const byYear = {}
  monthKeys.forEach(key => {
    const year = key.split('-')[0]
    if (!byYear[year]) byYear[year] = []
    byYear[year].push(key)
  })
  const years = Object.keys(byYear).sort((a, b) => b - a)

  // For desktop: only show categories that have at least one value across all months
  const sortedCats = [...categories].sort((a, b) => {
    const aSum = monthKeys.reduce((s, key) => { const [y, m] = key.split('-').map(Number); return s + (getAmount(y, m, a) || 0) }, 0)
    const bSum = monthKeys.reduce((s, key) => { const [y, m] = key.split('-').map(Number); return s + (getAmount(y, m, b) || 0) }, 0)
    return bSum - aSum
  })
  const activeCats = sortedCats.filter(cat =>
    monthKeys.some(key => { const [y, m] = key.split('-').map(Number); return getAmount(y, m, cat) !== null })
  )

  return (
    <div className="p-4 max-w-2xl mx-auto pb-8">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Historial</h2>

      {/* Average banner */}
      {monthKeys.length >= 2 && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-indigo-400 font-medium">Promedio mensual</p>
            <p className="text-lg font-bold text-indigo-700">{fmt(Math.round(avgTotal))}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-indigo-400 font-medium">{monthKeys.length} meses registrados</p>
            <p className="text-sm text-indigo-500 font-medium">
              Total: {fmtShort(allTotals.reduce((s, v) => s + v, 0))}
            </p>
          </div>
        </div>
      )}

      {/* Mobile: cards grouped by year */}
      <div className="md:hidden space-y-1">
        {years.map(year => (
          <div key={year}>
            {/* Year separator */}
            <div className="flex items-center gap-3 py-2 px-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{year}</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <div className="space-y-2">
              {byYear[year].map(key => {
                const [y, m] = key.split('-').map(Number)
                const total = getTotal(y, m)
                const isCurrentMonth = y === currentYear && m === currentMonth
                const catsWithAmount = categories
                  .map(cat => ({ cat, amount: getAmount(y, m, cat) }))
                  .filter(({ amount }) => amount !== null)
                  .sort((a, b) => b.amount - a.amount)

                return (
                  <div key={key} className={`rounded-2xl shadow-sm border overflow-hidden ${
                    isCurrentMonth
                      ? 'bg-white border-indigo-300 ring-1 ring-indigo-200'
                      : 'bg-white border-gray-100'
                  }`}>
                    <div className={`flex items-center justify-between px-4 py-3 border-b ${
                      isCurrentMonth
                        ? 'bg-indigo-600 border-indigo-500'
                        : 'bg-indigo-50 border-indigo-100'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${isCurrentMonth ? 'text-white' : 'text-indigo-900'}`}>
                          {MONTHS[m - 1]}
                        </span>
                        {isCurrentMonth && (
                          <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">
                            Este mes
                          </span>
                        )}
                      </div>
                      <span className={`font-bold ${isCurrentMonth ? 'text-white' : 'text-indigo-600'}`}>
                        {fmt(total)}
                      </span>
                    </div>
                    <div className="px-4 py-2 divide-y divide-gray-50">
                      {catsWithAmount.length === 0 ? (
                        <p className="text-xs text-gray-400 py-2">Sin gastos cargados</p>
                      ) : (
                        catsWithAmount.map(({ cat, amount }) => (
                          <div key={cat.id} className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                              <span className="text-sm text-gray-600">{cat.name}</span>
                              {cat.is_variable && (
                                <span className="text-xs text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded-md">var</span>
                              )}
                            </div>
                            <span className="text-sm font-medium text-gray-800">{fmt(amount)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200 shadow-sm bg-white">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600 sticky left-0 bg-gray-50 min-w-[120px]">Mes</th>
              {activeCats.map(cat => (
                <th key={cat.id} className="text-right px-4 py-3 font-semibold text-gray-500 min-w-[120px]">
                  <div className="flex items-center justify-end gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                    {cat.is_variable && <span className="text-indigo-400 font-normal text-xs">(v)</span>}
                  </div>
                </th>
              ))}
              <th className="text-right px-4 py-3 font-bold text-indigo-600 min-w-[130px]">Total</th>
            </tr>
          </thead>
          <tbody>
            {years.map(year => (
              <>
                {/* Year group header row */}
                <tr key={`year-${year}`} className="bg-gray-100/80">
                  <td colSpan={activeCats.length + 2} className="px-4 py-1.5">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{year}</span>
                  </td>
                </tr>
                {byYear[year].map((key, idx) => {
                  const [y, m] = key.split('-').map(Number)
                  const total = getTotal(y, m)
                  const isCurrentMonth = y === currentYear && m === currentMonth
                  return (
                    <tr key={key} className={`border-b border-gray-100 transition-colors ${
                      isCurrentMonth
                        ? 'bg-indigo-50/60 font-medium'
                        : idx % 2 !== 0 ? 'bg-gray-50/50 hover:bg-indigo-50/20' : 'hover:bg-indigo-50/20'
                    }`}>
                      <td className="px-4 py-3 sticky left-0 bg-inherit">
                        <div className="flex items-center gap-2">
                          <span className={isCurrentMonth ? 'text-indigo-700 font-bold' : 'text-gray-700 font-semibold'}>
                            {MONTHS_SHORT[m - 1]}
                          </span>
                          {isCurrentMonth && (
                            <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">este mes</span>
                          )}
                        </div>
                      </td>
                      {activeCats.map(cat => (
                        <td key={cat.id} className="px-4 py-3 text-right text-gray-600">
                          {fmt(getAmount(y, m, cat))}
                        </td>
                      ))}
                      <td className={`px-4 py-3 text-right font-bold ${isCurrentMonth ? 'text-indigo-700' : 'text-indigo-600'}`}>
                        {fmt(total)}
                      </td>
                    </tr>
                  )
                })}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

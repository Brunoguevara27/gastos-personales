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
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

export default function HistoryPage() {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [allExpenses, setAllExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const [{ data: cats }, { data: exps }] = await Promise.all([
        supabase.from('categories').select('*').eq('user_id', user.id).order('created_at'),
        supabase
          .from('expenses')
          .select('*')
          .eq('user_id', user.id)
          .order('year', { ascending: false })
          .order('month', { ascending: false }),
      ])
      setCategories(cats || [])
      setAllExpenses(exps || [])
      setLoading(false)
    }
    fetch()
  }, [user.id])

  const monthKeys = [...new Set(allExpenses.map(e => `${e.year}-${String(e.month).padStart(2, '0')}`))]
    .sort((a, b) => b.localeCompare(a))

  const getAmount = (year, month, catId) => {
    const e = allExpenses.find(e => e.year === year && e.month === month && e.category_id === catId)
    return e ? parseFloat(e.amount) : null
  }

  const getTotal = (year, month) =>
    allExpenses
      .filter(e => e.year === year && e.month === month)
      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)

  if (loading) return <HistorySkeleton />

  if (monthKeys.length === 0) return (
    <div className="text-center py-20 text-gray-400 px-4">
      <p className="text-5xl mb-4">📋</p>
      <p className="font-medium text-gray-500">Todavía no hay gastos registrados.</p>
      <p className="text-sm mt-1">Empezá ingresando los gastos del mes actual desde Inicio.</p>
    </div>
  )

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Historial</h2>

      {/* Mobile: cards */}
      <div className="md:hidden space-y-3">
        {monthKeys.map(key => {
          const [y, m] = key.split('-').map(Number)
          const total = getTotal(y, m)
          const catWithAmount = categories
            .filter(cat => getAmount(y, m, cat.id) !== null)
            .sort((a, b) => (getAmount(y, m, b.id) ?? 0) - (getAmount(y, m, a.id) ?? 0))
          return (
            <div key={key} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 border-b border-indigo-100">
                <span className="font-bold text-indigo-900">{MONTHS[m - 1]} {y}</span>
                <span className="font-bold text-indigo-600">{fmt(total)}</span>
              </div>
              <div className="px-4 py-2 divide-y divide-gray-50">
                {catWithAmount.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">Sin gastos cargados</p>
                ) : (
                  catWithAmount.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-sm text-gray-600">{cat.name}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-800">{fmt(getAmount(y, m, cat.id))}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200 shadow-sm bg-white">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600 sticky left-0 bg-gray-50 min-w-[110px]">Mes</th>
              {[...categories]
                .sort((a, b) => {
                  const aTotal = allExpenses.filter(e => e.category_id === a.id).reduce((s, e) => s + parseFloat(e.amount || 0), 0)
                  const bTotal = allExpenses.filter(e => e.category_id === b.id).reduce((s, e) => s + parseFloat(e.amount || 0), 0)
                  return bTotal - aTotal
                })
                .map(cat => (
                <th key={cat.id} className="text-right px-4 py-3 font-semibold text-gray-500 min-w-[120px]">
                  <div className="flex items-center justify-end gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </div>
                </th>
              ))}
              <th className="text-right px-4 py-3 font-bold text-indigo-600 min-w-[130px]">Total</th>
            </tr>
          </thead>
          <tbody>
            {monthKeys.map((key, idx) => {
              const [y, m] = key.split('-').map(Number)
              const total = getTotal(y, m)
              return (
                <tr key={key} className={`border-b border-gray-100 hover:bg-indigo-50/30 transition-colors ${idx % 2 !== 0 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-4 py-3 font-semibold text-gray-700 sticky left-0 bg-inherit">
                    {MONTHS_SHORT[m - 1]} {y}
                  </td>
                  {[...categories]
                    .sort((a, b) => {
                      const aTotal = allExpenses.filter(e => e.category_id === a.id).reduce((s, e) => s + parseFloat(e.amount || 0), 0)
                      const bTotal = allExpenses.filter(e => e.category_id === b.id).reduce((s, e) => s + parseFloat(e.amount || 0), 0)
                      return bTotal - aTotal
                    })
                    .map(cat => (
                    <td key={cat.id} className="px-4 py-3 text-right text-gray-600">
                      {fmt(getAmount(y, m, cat.id))}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right font-bold text-indigo-600">{fmt(total)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

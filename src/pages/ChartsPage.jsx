import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ChartsSkeleton } from '../components/Skeleton'
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const fmtShort = (n) =>
  new Intl.NumberFormat('es-AR', {
    notation: 'compact', style: 'currency', currency: 'ARS', minimumFractionDigits: 0,
  }).format(n || 0)

const fmtFull = (n) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n || 0)

// Donut center label
function DonutLabel({ viewBox, total }) {
  const { cx, cy } = viewBox
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-0.4em" fontSize="13" fill="#6b7280">Total</tspan>
      <tspan x={cx} dy="1.5em" fontSize="15" fontWeight="bold" fill="#111827">
        {fmtShort(total)}
      </tspan>
    </text>
  )
}

export default function ChartsPage() {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [allExpenses, setAllExpenses] = useState([])
  const [allTransactions, setAllTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [{ data: cats }, { data: exps }, { data: txns }] = await Promise.all([
        supabase.from('categories').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('expenses').select('*').eq('user_id', user.id).order('year').order('month'),
        supabase.from('transactions').select('*').eq('user_id', user.id).order('year').order('month'),
      ])
      setCategories(cats || [])
      setAllExpenses(exps || [])
      setAllTransactions(txns || [])
      setLoading(false)
    }
    load()
  }, [user.id])

  if (loading) return <ChartsSkeleton />

  // Build total per month combining expenses (fixed) + transactions (variable)
  const allMonthKeys = [
    ...new Set([
      ...allExpenses.map(e => `${e.year}-${String(e.month).padStart(2, '0')}`),
      ...allTransactions.map(t => `${t.year}-${String(t.month).padStart(2, '0')}`),
    ])
  ].sort()

  if (allMonthKeys.length === 0) return (
    <div className="text-center py-20 text-gray-400 px-4">
      <p className="text-5xl mb-4">📊</p>
      <p className="font-medium text-gray-500">No hay datos suficientes aún.</p>
      <p className="text-sm mt-1">Ingresá gastos desde Inicio para ver los gráficos.</p>
    </div>
  )

  const getTotalForMonth = (y, m) => {
    const fixedTotal = allExpenses
      .filter(e => e.year === y && e.month === m)
      .reduce((s, e) => s + parseFloat(e.amount || 0), 0)
    const varTotal = allTransactions
      .filter(t => t.year === y && t.month === m)
      .reduce((s, t) => s + parseFloat(t.amount || 0), 0)
    return fixedTotal + varTotal
  }

  const getCatTotalForMonth = (catId, y, m, isVariable) => {
    if (isVariable) {
      return allTransactions
        .filter(t => t.category_id === catId && t.year === y && t.month === m)
        .reduce((s, t) => s + parseFloat(t.amount || 0), 0)
    }
    const exp = allExpenses.find(e => e.category_id === catId && e.year === y && e.month === m)
    return exp ? parseFloat(exp.amount) : 0
  }

  // Line chart — total per month
  const lineData = allMonthKeys.map(key => {
    const [y, m] = key.split('-').map(Number)
    return { name: `${MONTHS_SHORT[m - 1]} ${y}`, total: getTotalForMonth(y, m) }
  })

  const totals = lineData.map(d => d.total)
  const maxVal = Math.max(...totals)
  const minVal = Math.min(...totals)
  const maxMonth = lineData[totals.indexOf(maxVal)]?.name
  const minMonth = lineData[totals.indexOf(minVal)]?.name

  // Y axis domain: pad 10% below min and above max
  const yPad = (maxVal - minVal) * 0.3 || maxVal * 0.1
  const yMin = Math.max(0, Math.floor((minVal - yPad) / 10000) * 10000)
  const yMax = Math.ceil((maxVal + yPad) / 10000) * 10000

  // Donut — last month with data
  const lastKey = allMonthKeys[allMonthKeys.length - 1]
  const [ly, lm] = lastKey.split('-').map(Number)
  const donutData = categories
    .map(cat => ({
      name: cat.name,
      value: getCatTotalForMonth(cat.id, ly, lm, cat.is_variable),
      color: cat.color,
    }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)
  const donutTotal = donutData.reduce((s, d) => s + d.value, 0)

  // Horizontal bars — category totals for most recent month
  const barData = [...categories]
    .map(cat => ({
      name: cat.name,
      color: cat.color,
      value: getCatTotalForMonth(cat.id, ly, lm, cat.is_variable),
    }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)
  const barMax = barData[0]?.value || 1

  return (
    <div className="p-4 space-y-5 max-w-2xl mx-auto pb-8">
      <h2 className="text-lg font-bold text-gray-900">Gráficos</h2>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-xs text-gray-400 mb-2">Mes más caro</p>
          <p className="font-bold text-gray-800 text-base">{maxMonth}</p>
          <p className="font-bold text-red-500 text-sm mt-0.5">{fmtShort(maxVal)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-xs text-gray-400 mb-2">Mes más barato</p>
          <p className="font-bold text-gray-800 text-base">{minMonth}</p>
          <p className="font-bold text-green-500 text-sm mt-0.5">{fmtShort(minVal)}</p>
        </div>
      </div>

      {/* Donut — distribución último mes */}
      {donutData.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-1 text-sm">
            Distribución — {MONTHS_SHORT[lm - 1]} {ly}
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                paddingAngle={donutData.length > 1 ? 2 : 0}
              >
                {donutData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
                <DonutLabel total={donutTotal} />
              </Pie>
              <Tooltip
                formatter={(v, name) => [fmtFull(v), name]}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-2">
            {donutData.map((entry, i) => {
              const pct = donutTotal > 0 ? ((entry.value / donutTotal) * 100).toFixed(0) : 0
              return (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-gray-600">{entry.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-800 font-medium">{fmtFull(entry.value)}</span>
                    <span className="text-gray-400 text-xs w-8 text-right">{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Line chart — evolución */}
      {lineData.length >= 2 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4 text-sm">Evolución total</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={lineData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis
                tickFormatter={fmtShort}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                width={58}
                domain={[yMin, yMax]}
              />
              <Tooltip
                formatter={(v) => [fmtFull(v), 'Total']}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ fill: '#6366f1', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Horizontal bars — desglose último mes */}
      {barData.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4 text-sm">
            Desglose — {MONTHS_SHORT[lm - 1]} {ly}
          </h3>
          <div className="space-y-3">
            {barData.map((item, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-gray-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-800">{fmtFull(item.value)}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(item.value / barMax) * 100}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ChartsSkeleton } from '../components/Skeleton'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const fmtShort = (n) =>
  new Intl.NumberFormat('es-AR', {
    notation: 'compact',
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(n || 0)

const fmtFull = (n) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n || 0)


export default function ChartsPage() {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [allExpenses, setAllExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const [{ data: cats }, { data: exps }] = await Promise.all([
        supabase.from('categories').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('expenses').select('*').eq('user_id', user.id).order('year').order('month'),
      ])
      setCategories(cats || [])
      setAllExpenses(exps || [])
      setLoading(false)
    }
    fetch()
  }, [user.id])

  if (loading) return <ChartsSkeleton />

  const monthKeys = [...new Set(allExpenses.map(e => `${e.year}-${String(e.month).padStart(2, '0')}`))]
    .sort()

  if (monthKeys.length === 0) return (
    <div className="text-center py-20 text-gray-400 px-4">
      <p className="text-5xl mb-4">📊</p>
      <p className="font-medium text-gray-500">No hay datos suficientes aún.</p>
      <p className="text-sm mt-1">Ingresá gastos desde Inicio para ver los gráficos.</p>
    </div>
  )

  // Line chart data (total per month)
  const lineData = monthKeys.map(key => {
    const [y, m] = key.split('-').map(Number)
    const total = allExpenses
      .filter(e => e.year === y && e.month === m)
      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
    return { name: `${MONTHS_SHORT[m - 1]} ${String(y).slice(2)}`, total }
  })

  // Stacked bar chart data (categories per month)
  const barData = monthKeys.map(key => {
    const [y, m] = key.split('-').map(Number)
    const row = { name: `${MONTHS_SHORT[m - 1]} ${String(y).slice(2)}` }
    categories.forEach(cat => {
      const exp = allExpenses.find(e => e.year === y && e.month === m && e.category_id === cat.id)
      row[cat.name] = exp ? parseFloat(exp.amount) : 0
    })
    return row
  })

  // Pie chart data (last month that has data)
  const lastKey = monthKeys[monthKeys.length - 1]
  const [ly, lm] = lastKey.split('-').map(Number)
  const pieData = categories
    .map((cat, i) => {
      const exp = allExpenses.find(e => e.year === ly && e.month === lm && e.category_id === cat.id)
      return { name: cat.name, value: exp ? parseFloat(exp.amount) : 0, color: cat.color }
    })
    .filter(d => d.value > 0)

  const totals = lineData.map(d => d.total)
  const maxVal = Math.max(...totals)
  const minVal = Math.min(...totals)
  const maxMonth = lineData[totals.indexOf(maxVal)]?.name
  const minMonth = lineData[totals.indexOf(minVal)]?.name

  return (
    <div className="p-4 space-y-5 max-w-2xl mx-auto">
      <h2 className="text-lg font-bold text-gray-900">Gráficos</h2>

      {/* Stats summary */}
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

      {/* Line chart: total evolution */}
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
                width={56}
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

      {/* Stacked bar chart: categories per month */}
      {barData.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4 text-sm">Desglose por categoría</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis
                tickFormatter={fmtShort}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                width={56}
              />
              <Tooltip
                formatter={(v, name) => [fmtFull(v), name]}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {categories.map(cat => (
                <Bar key={cat.id} dataKey={cat.name} stackId="a" fill={cat.color} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Pie chart: last month breakdown */}
      {pieData.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-1 text-sm">
            Distribución — {MONTHS_SHORT[lm - 1]} {ly}
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={85}
                dataKey="value"
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v, name) => [fmtFull(v), name]}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Custom legend */}
          <div className="mt-3 space-y-2">
            {[...pieData].sort((a, b) => b.value - a.value).map((entry, i) => {
              const total = pieData.reduce((s, d) => s + d.value, 0)
              const pct = total > 0 ? ((entry.value / total) * 100).toFixed(0) : 0
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
    </div>
  )
}

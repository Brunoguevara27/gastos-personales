import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ChevronLeft, ChevronRight, Edit2, Save, X } from 'lucide-react'

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const fmt = (n) => {
  if (!n && n !== 0) return '-'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

export default function DashboardPage() {
  const { user } = useAuth()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [categories, setCategories] = useState([])
  const [expenses, setExpenses] = useState({})
  const [editing, setEditing] = useState(false)
  const [editValues, setEditValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: cats }, { data: exps }] = await Promise.all([
      supabase.from('categories').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('expenses').select('*').eq('user_id', user.id).eq('year', year).eq('month', month),
    ])
    setCategories(cats || [])
    const map = {}
    ;(exps || []).forEach(e => { map[e.category_id] = parseFloat(e.amount) })
    setExpenses(map)
    setLoading(false)
  }, [user.id, year, month])

  useEffect(() => { fetchData() }, [fetchData])

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const startEdit = () => {
    const initial = {}
    categories.forEach(c => {
      initial[c.id] = expenses[c.id] !== undefined ? String(Math.round(expenses[c.id])) : ''
    })
    setEditValues(initial)
    setEditing(true)
  }

  const handleInputChange = (catId, raw) => {
    const digits = raw.replace(/\D/g, '')
    setEditValues(v => ({ ...v, [catId]: digits }))
  }

  const displayValue = (raw) => {
    if (!raw) return ''
    const num = parseInt(raw, 10)
    return isNaN(num) ? '' : num.toLocaleString('es-AR')
  }

  const cancelEdit = () => {
    setEditing(false)
    setEditValues({})
  }

  const saveExpenses = async () => {
    setSaving(true)

    const toUpsert = []
    const toDelete = []

    categories.forEach(cat => {
      const raw = editValues[cat.id]
      if (raw === '' || raw === undefined) {
        if (expenses[cat.id] !== undefined) toDelete.push(cat.id)
      } else {
        const amount = parseFloat(raw)
        if (!isNaN(amount)) {
          toUpsert.push({
            user_id: user.id,
            year,
            month,
            category_id: cat.id,
            amount,
            updated_at: new Date().toISOString(),
          })
        }
      }
    })

    await Promise.all([
      toUpsert.length > 0
        ? supabase.from('expenses').upsert(toUpsert, { onConflict: 'user_id,year,month,category_id' })
        : Promise.resolve(),
      ...toDelete.map(catId =>
        supabase.from('expenses')
          .delete()
          .eq('user_id', user.id)
          .eq('year', year)
          .eq('month', month)
          .eq('category_id', catId)
      ),
    ])

    setSaving(false)
    setEditing(false)
    fetchData()
  }

  const total = Object.values(expenses).reduce((sum, v) => sum + (v || 0), 0)

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      {/* Month navigator */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={prevMonth}
          className="p-2 rounded-xl hover:bg-gray-200 transition-colors text-gray-600"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900">{MONTHS[month - 1]}</p>
          <p className="text-sm text-gray-400">{year}</p>
        </div>
        <button
          onClick={nextMonth}
          className="p-2 rounded-xl hover:bg-gray-200 transition-colors text-gray-600"
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {/* Total card */}
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-6 mb-5 text-white shadow-lg">
        <p className="text-indigo-200 text-sm font-medium">Total del mes</p>
        <p className="text-4xl font-bold mt-1 tracking-tight">{fmt(total)}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : categories.length === 0 ? (
        <p className="text-center text-gray-400 py-8">No tenés categorías. Creá una en la sección Categorías.</p>
      ) : (
        <>
          <div className="space-y-2.5 mb-6">
            {categories.map(cat => (
              <div
                key={cat.id}
                className="bg-white rounded-xl px-4 py-3.5 shadow-sm border border-gray-100 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="font-medium text-gray-700 text-sm">{cat.name}</span>
                </div>
                {editing ? (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={displayValue(editValues[cat.id])}
                    onChange={e => handleInputChange(cat.id, e.target.value)}
                    placeholder="0"
                    className="w-36 text-right px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                ) : (
                  <span className={`font-semibold text-sm ${expenses[cat.id] ? 'text-gray-900' : 'text-gray-300'}`}>
                    {expenses[cat.id] ? fmt(expenses[cat.id]) : '-'}
                  </span>
                )}
              </div>
            ))}
          </div>

          {editing ? (
            <div className="flex gap-3">
              <button
                onClick={cancelEdit}
                className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-300 rounded-xl font-medium text-gray-600 hover:bg-gray-50 text-sm transition-colors"
              >
                <X size={17} /> Cancelar
              </button>
              <button
                onClick={saveExpenses}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 text-sm transition-colors"
              >
                <Save size={17} /> {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          ) : (
            <button
              onClick={startEdit}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 text-sm transition-colors shadow-sm"
            >
              <Edit2 size={17} /> Editar gastos
            </button>
          )}
        </>
      )}
    </div>
  )
}

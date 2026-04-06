import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ChevronLeft, ChevronRight, Check, X } from 'lucide-react'

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

const displayValue = (raw) => {
  if (!raw) return ''
  const num = parseInt(raw, 10)
  return isNaN(num) ? '' : num.toLocaleString('es-AR')
}

export default function DashboardPage() {
  const { user } = useAuth()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [categories, setCategories] = useState([])
  const [expenses, setExpenses] = useState({})
  const [loading, setLoading] = useState(true)
  // inline edit state
  const [editingCatId, setEditingCatId] = useState(null)
  const [editingValue, setEditingValue] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

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

  // focus input when a row enters edit mode
  useEffect(() => {
    if (editingCatId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingCatId])

  const prevMonth = () => {
    setEditingCatId(null)
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    setEditingCatId(null)
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const startInlineEdit = (cat) => {
    if (saving) return
    setEditingCatId(cat.id)
    setEditingValue(expenses[cat.id] !== undefined ? String(Math.round(expenses[cat.id])) : '')
  }

  const cancelInlineEdit = () => {
    setEditingCatId(null)
    setEditingValue('')
  }

  const saveInlineEdit = async (catId) => {
    setSaving(true)
    const digits = editingValue.replace(/\D/g, '')

    if (digits === '') {
      // delete if existed
      if (expenses[catId] !== undefined) {
        await supabase.from('expenses')
          .delete()
          .eq('user_id', user.id)
          .eq('year', year)
          .eq('month', month)
          .eq('category_id', catId)
      }
    } else {
      await supabase.from('expenses').upsert(
        [{
          user_id: user.id,
          year,
          month,
          category_id: catId,
          amount: parseFloat(digits),
          updated_at: new Date().toISOString(),
        }],
        { onConflict: 'user_id,year,month,category_id' }
      )
    }

    setSaving(false)
    setEditingCatId(null)
    setEditingValue('')
    fetchData()
  }

  const handleKeyDown = (e, catId) => {
    if (e.key === 'Enter') saveInlineEdit(catId)
    if (e.key === 'Escape') cancelInlineEdit()
  }

  const total = Object.values(expenses).reduce((sum, v) => sum + (v || 0), 0)

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      {/* Month navigator */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-gray-200 transition-colors text-gray-600">
          <ChevronLeft size={22} />
        </button>
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900">{MONTHS[month - 1]}</p>
          <p className="text-sm text-gray-400">{year}</p>
        </div>
        <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-gray-200 transition-colors text-gray-600">
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
        <div className="space-y-2.5">
          {categories.map(cat => {
            const isEditing = editingCatId === cat.id
            return (
              <div
                key={cat.id}
                className={`bg-white rounded-xl shadow-sm border transition-all ${
                  isEditing ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-gray-100'
                }`}
              >
                {isEditing ? (
                  /* Edit state */
                  <div className="flex items-center gap-2 px-4 py-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="font-medium text-gray-700 text-sm flex-1">{cat.name}</span>
                    <input
                      ref={inputRef}
                      type="text"
                      inputMode="numeric"
                      value={displayValue(editingValue)}
                      onChange={e => setEditingValue(e.target.value.replace(/\D/g, ''))}
                      onKeyDown={e => handleKeyDown(e, cat.id)}
                      placeholder="0"
                      className="w-28 text-right px-2 py-1 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                    <button
                      onClick={() => saveInlineEdit(cat.id)}
                      disabled={saving}
                      className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      <Check size={15} />
                    </button>
                    <button
                      onClick={cancelInlineEdit}
                      className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  /* Display state — tap anywhere to edit */
                  <button
                    onClick={() => startInlineEdit(cat)}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="font-medium text-gray-700 text-sm">{cat.name}</span>
                    </div>
                    <span className={`font-semibold text-sm ${expenses[cat.id] ? 'text-gray-900' : 'text-gray-300'}`}>
                      {expenses[cat.id] ? fmt(expenses[cat.id]) : 'Tocar para agregar'}
                    </span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

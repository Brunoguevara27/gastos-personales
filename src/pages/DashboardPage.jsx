import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ChevronLeft, ChevronRight, Check, X, TrendingUp, TrendingDown, Minus, Plus } from 'lucide-react'
import { DashboardSkeleton } from '../components/Skeleton'

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

const getPrevYearMonth = (year, month) =>
  month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }

function Variation({ current, prev }) {
  if (!prev || prev <= 0) return null
  if (!current || current <= 0) return null

  const diff = current - prev

  if (diff === 0) return (
    <span className="flex items-center gap-0.5 text-xs text-gray-400">
      <Minus size={11} /> igual
    </span>
  )

  const isUp = diff > 0
  const absDiff = Math.abs(diff)
  const pct = prev > 0 ? Math.round((absDiff / prev) * 100) : null

  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${isUp ? 'text-red-400' : 'text-green-500'}`}>
      {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {isUp ? '+' : '-'}{fmt(absDiff)}
      {pct !== null && <span className="text-gray-300 font-normal">({pct}%)</span>}
    </span>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [categories, setCategories] = useState([])
  const [expenses, setExpenses] = useState({})
  const [prevExpenses, setPrevExpenses] = useState({})
  const [loading, setLoading] = useState(true)
  const [editingCatId, setEditingCatId] = useState(null)
  const [editingValue, setEditingValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedCatId, setSavedCatId] = useState(null)
  const [visible, setVisible] = useState(true)
  const [addingCatId, setAddingCatId] = useState(null)
  const [addingValue, setAddingValue] = useState('')
  const inputRef = useRef(null)
  const addInputRef = useRef(null)
  const touchStartX = useRef(null)

  const fetchData = useCallback(async (opts = {}) => {
    if (!opts.silent) setLoading(true)
    const prev = getPrevYearMonth(year, month)

    const [{ data: cats }, { data: exps }, { data: prevExps }] = await Promise.all([
      supabase.from('categories').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('expenses').select('*').eq('user_id', user.id).eq('year', year).eq('month', month),
      supabase.from('expenses').select('*').eq('user_id', user.id).eq('year', prev.year).eq('month', prev.month),
    ])

    setCategories(cats || [])

    const map = {}
    ;(exps || []).forEach(e => { map[e.category_id] = parseFloat(e.amount) })
    setExpenses(map)

    const prevMap = {}
    ;(prevExps || []).forEach(e => { prevMap[e.category_id] = parseFloat(e.amount) })
    setPrevExpenses(prevMap)

    if (!opts.silent) {
      setLoading(false)
      setTimeout(() => setVisible(true), 10)
    }
  }, [user.id, year, month])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (editingCatId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingCatId])

  const changeMonth = (dir) => {
    setEditingCatId(null)
    setVisible(false)
    setTimeout(() => {
      if (dir === 'prev') {
        if (month === 1) { setMonth(12); setYear(y => y - 1) }
        else setMonth(m => m - 1)
      } else {
        if (month === 12) { setMonth(1); setYear(y => y + 1) }
        else setMonth(m => m + 1)
      }
    }, 120)
  }

  // Touch swipe handlers
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < 50) return // too short
    changeMonth(dx < 0 ? 'next' : 'prev')
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
    const newAmount = digits === '' || parseInt(digits, 10) === 0 ? null : parseFloat(digits)

    // Optimistic update
    setEditingCatId(null)
    setEditingValue('')
    setExpenses(prev => {
      const next = { ...prev }
      if (newAmount === null) delete next[catId]
      else next[catId] = newAmount
      return next
    })

    // Flash green feedback
    setSavedCatId(catId)
    setTimeout(() => setSavedCatId(null), 1000)

    // Persist to DB
    if (newAmount === null) {
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
          amount: newAmount,
          updated_at: new Date().toISOString(),
        }],
        { onConflict: 'user_id,year,month,category_id' }
      )
    }

    setSaving(false)
    // Silent background refresh to sync
    fetchData({ silent: true })
  }

  const handleKeyDown = (e, catId) => {
    if (e.key === 'Enter') saveInlineEdit(catId)
    if (e.key === 'Escape') cancelInlineEdit()
  }

  const startAdding = (e, cat) => {
    e.stopPropagation()
    if (saving) return
    setEditingCatId(null)
    setAddingCatId(cat.id)
    setAddingValue('')
    setTimeout(() => addInputRef.current?.focus(), 10)
  }

  const cancelAdding = () => {
    setAddingCatId(null)
    setAddingValue('')
  }

  const saveAdding = async (catId) => {
    const digits = addingValue.replace(/\D/g, '')
    if (!digits || parseInt(digits, 10) === 0) { cancelAdding(); return }
    setSaving(true)
    const toAdd = parseFloat(digits)
    const existing = expenses[catId] || 0
    const newAmount = existing + toAdd

    // Optimistic update
    setAddingCatId(null)
    setAddingValue('')
    setExpenses(prev => ({ ...prev, [catId]: newAmount }))
    setSavedCatId(catId)
    setTimeout(() => setSavedCatId(null), 1000)

    await supabase.from('expenses').upsert(
      [{ user_id: user.id, year, month, category_id: catId, amount: newAmount, updated_at: new Date().toISOString() }],
      { onConflict: 'user_id,year,month,category_id' }
    )

    setSaving(false)
    fetchData({ silent: true })
  }

  const handleAddKeyDown = (e, catId) => {
    if (e.key === 'Enter') saveAdding(catId)
    if (e.key === 'Escape') cancelAdding()
  }

  const total = Object.values(expenses).reduce((sum, v) => sum + (v || 0), 0)
  const prevTotal = Object.values(prevExpenses).reduce((sum, v) => sum + (v || 0), 0)
  const hasData = total > 0

  if (loading) return <DashboardSkeleton />

  return (
    <div
      className="max-w-lg mx-auto px-4 pt-4"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Month navigator */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => changeMonth('prev')} className="p-2 rounded-xl hover:bg-gray-200 transition-colors text-gray-600">
          <ChevronLeft size={22} />
        </button>
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900">{MONTHS[month - 1]}</p>
          <p className="text-sm text-gray-400">{year}</p>
        </div>
        <button onClick={() => changeMonth('next')} className="p-2 rounded-xl hover:bg-gray-200 transition-colors text-gray-600">
          <ChevronRight size={22} />
        </button>
      </div>

      {/* Content with fade transition */}
      <div
        className="transition-opacity duration-150"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {/* Total card */}
        {hasData ? (
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-6 mb-5 text-white shadow-lg">
            <p className="text-indigo-200 text-sm font-medium">Total del mes</p>
            <p className="text-4xl font-bold mt-1 tracking-tight">{fmt(total)}</p>
            {prevTotal > 0 && (
              <div className="mt-2 flex items-center gap-1.5">
                {total === prevTotal ? (
                  <span className="text-indigo-200 text-xs flex items-center gap-1">
                    <Minus size={11} /> igual al mes anterior
                  </span>
                ) : total > prevTotal ? (
                  <span className="text-red-300 text-xs flex items-center gap-1">
                    <TrendingUp size={11} />
                    +{fmt(total - prevTotal)} vs mes anterior
                  </span>
                ) : (
                  <span className="text-green-300 text-xs flex items-center gap-1">
                    <TrendingDown size={11} />
                    -{fmt(prevTotal - total)} vs mes anterior
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 mb-5 text-center">
            <p className="text-gray-400 text-sm">Sin gastos registrados</p>
            <p className="text-gray-300 text-xs mt-1">Tocá una categoría para agregar</p>
          </div>
        )}

        {categories.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No tenés categorías. Creá una en la sección Categorías.</p>
        ) : (
          <div className="space-y-2.5">
            {[...categories]
              .sort((a, b) => {
                const aVal = expenses[a.id] ?? -1
                const bVal = expenses[b.id] ?? -1
                return bVal - aVal
              })
              .map(cat => {
              const isEditing = editingCatId === cat.id
              const isAdding = addingCatId === cat.id
              const current = expenses[cat.id]
              const prev = prevExpenses[cat.id]
              const justSaved = savedCatId === cat.id

              return (
                <div
                  key={cat.id}
                  className={`bg-white rounded-xl shadow-sm border transition-all duration-300 ${
                    justSaved
                      ? 'border-green-300 ring-1 ring-green-200 bg-green-50'
                      : isEditing || isAdding
                      ? 'border-indigo-300 ring-1 ring-indigo-200'
                      : 'border-gray-100'
                  }`}
                >
                  {isEditing ? (
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
                  ) : isAdding ? (
                    <div className="flex items-center gap-2 px-4 py-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="font-medium text-gray-700 text-sm flex-1">{cat.name}</span>
                      <span className="text-xs text-gray-400">+</span>
                      <input
                        ref={addInputRef}
                        type="text"
                        inputMode="numeric"
                        value={displayValue(addingValue)}
                        onChange={e => setAddingValue(e.target.value.replace(/\D/g, ''))}
                        onKeyDown={e => handleAddKeyDown(e, cat.id)}
                        placeholder="0"
                        className="w-28 text-right px-2 py-1 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <button
                        onClick={() => saveAdding(cat.id)}
                        disabled={saving}
                        className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        <Check size={15} />
                      </button>
                      <button
                        onClick={cancelAdding}
                        className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center px-4 py-3 active:bg-gray-50">
                      <div
                        className="flex-1 flex items-center justify-between cursor-pointer"
                        onClick={() => startInlineEdit(cat)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="font-medium text-gray-700 text-sm">{cat.name}</span>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 mr-2">
                          {current ? (
                            <span className={`text-sm font-semibold transition-colors duration-300 ${justSaved ? 'text-green-600' : 'text-gray-900'}`}>
                              {fmt(current)}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-gray-300 border border-dashed border-gray-200 rounded-lg px-2 py-0.5">
                              <Plus size={10} /> agregar
                            </span>
                          )}
                          <Variation current={current} prev={prev} />
                        </div>
                      </div>
                      {cat.is_variable && (
                        <button
                          onClick={(e) => startAdding(e, cat)}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-indigo-100 text-gray-400 hover:text-indigo-600 transition-colors flex-shrink-0"
                        >
                          <Plus size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

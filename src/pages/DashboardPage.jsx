import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ChevronLeft, ChevronRight, ChevronDown, Check, X, TrendingUp, TrendingDown, Minus, Plus, CheckCircle2, Circle } from 'lucide-react'
import { DashboardSkeleton } from '../components/Skeleton'
import BottomSheet from '../components/BottomSheet'

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const fmt = (n) => {
  if (!n && n !== 0) return '-'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
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
  if (!prev || prev <= 0 || !current || current <= 0) return null
  const diff = current - prev
  if (diff === 0) return (
    <span className="flex items-center gap-0.5 text-xs text-gray-400"><Minus size={11} /> igual</span>
  )
  const isUp = diff > 0
  const pct = Math.round((Math.abs(diff) / prev) * 100)
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${isUp ? 'text-red-400' : 'text-green-500'}`}>
      {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {isUp ? '+' : '-'}{fmt(Math.abs(diff))}
      <span className="text-gray-300 font-normal">({pct}%)</span>
    </span>
  )
}

function FixedRow({ cat, expenses, prevExpenses, editingCatId, editingValue, setEditingValue, savedCatId, saving, inputRef, onEdit, onSave, onCancel, onKeyDown }) {
  const isEditing = editingCatId === cat.id
  const current = expenses[cat.id]
  const prev = prevExpenses[cat.id]
  const justSaved = savedCatId === cat.id
  const isPaid = !!current
  return (
    <div className={`bg-white rounded-xl shadow-sm border transition-all duration-300 ${
      justSaved ? 'border-green-300 ring-1 ring-green-200 bg-green-50'
      : isEditing ? 'border-indigo-300 ring-1 ring-indigo-200'
      : 'border-gray-100'
    }`}>
      {isEditing ? (
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
          <span className="font-medium text-gray-700 text-sm flex-1">{cat.name}</span>
          <input
            ref={inputRef}
            type="text" inputMode="numeric"
            value={editingValue ? parseInt(editingValue, 10).toLocaleString('es-AR') : ''}
            onChange={e => setEditingValue(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => onKeyDown(e, cat.id)}
            placeholder="0"
            className="w-28 text-right px-2 py-1 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
          <button onClick={() => onSave(cat.id)} disabled={saving}
            className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            <Check size={15} />
          </button>
          <button onClick={onCancel}
            className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors">
            <X size={15} />
          </button>
        </div>
      ) : (
        <div className="flex items-center px-4 py-3 cursor-pointer active:bg-gray-50 rounded-xl"
          onClick={() => onEdit(cat)}>
          {isPaid
            ? <CheckCircle2 size={18} className="text-green-500 flex-shrink-0 mr-3" />
            : <Circle size={18} className="text-amber-400 flex-shrink-0 mr-3" />
          }
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mr-2" style={{ backgroundColor: cat.color }} />
          <span className="font-medium text-gray-700 text-sm flex-1">{cat.name}</span>
          <div className="flex flex-col items-end gap-0.5">
            {current
              ? <span className={`text-sm font-semibold transition-colors duration-300 ${justSaved ? 'text-green-600' : 'text-gray-900'}`}>{new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(current)}</span>
              : <span className="text-xs text-amber-500 font-medium">Sin pagar</span>
            }
            <Variation current={current} prev={prev} />
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [categories, setCategories] = useState([])
  const [expenses, setExpenses] = useState({})       // fixed: { catId: amount }
  const [transactions, setTransactions] = useState([]) // variable: array of rows
  const [prevExpenses, setPrevExpenses] = useState({})
  const [prevTransactions, setPrevTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingCatId, setEditingCatId] = useState(null)
  const [editingValue, setEditingValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedCatId, setSavedCatId] = useState(null)
  const [visible, setVisible] = useState(true)
  const [sheetCat, setSheetCat] = useState(null)
  const [paidOpen, setPaidOpen] = useState(false)
  const inputRef = useRef(null)
  const touchStartX = useRef(null)

  const fetchData = useCallback(async (opts = {}) => {
    if (!opts.silent) setLoading(true)
    const prev = getPrevYearMonth(year, month)

    const [{ data: cats }, { data: exps }, { data: prevExps }, { data: txns }, { data: prevTxns }] = await Promise.all([
      supabase.from('categories').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('expenses').select('*').eq('user_id', user.id).eq('year', year).eq('month', month),
      supabase.from('expenses').select('*').eq('user_id', user.id).eq('year', prev.year).eq('month', prev.month),
      supabase.from('transactions').select('*').eq('user_id', user.id).eq('year', year).eq('month', month).order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').eq('user_id', user.id).eq('year', prev.year).eq('month', prev.month),
    ])

    setCategories(cats || [])
    const map = {}
    ;(exps || []).forEach(e => { map[e.category_id] = parseFloat(e.amount) })
    setExpenses(map)
    const prevMap = {}
    ;(prevExps || []).forEach(e => { prevMap[e.category_id] = parseFloat(e.amount) })
    setPrevExpenses(prevMap)
    setTransactions(txns || [])
    setPrevTransactions(prevTxns || [])

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
    setSheetCat(null)
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

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < 50) return
    changeMonth(dx < 0 ? 'next' : 'prev')
  }

  // Fixed category edit
  const startInlineEdit = (cat) => {
    if (saving) return
    setEditingCatId(cat.id)
    setEditingValue(expenses[cat.id] !== undefined ? String(Math.round(expenses[cat.id])) : '')
  }
  const cancelInlineEdit = () => { setEditingCatId(null); setEditingValue('') }

  const saveInlineEdit = async (catId) => {
    setSaving(true)
    const digits = editingValue.replace(/\D/g, '')
    const newAmount = digits === '' || parseInt(digits, 10) === 0 ? null : parseFloat(digits)
    setEditingCatId(null)
    setEditingValue('')
    setExpenses(prev => {
      const next = { ...prev }
      if (newAmount === null) delete next[catId]
      else next[catId] = newAmount
      return next
    })
    setSavedCatId(catId)
    setTimeout(() => setSavedCatId(null), 1200)
    if (newAmount === null) {
      if (expenses[catId] !== undefined) {
        await supabase.from('expenses').delete()
          .eq('user_id', user.id).eq('year', year).eq('month', month).eq('category_id', catId)
      }
    } else {
      await supabase.from('expenses').upsert(
        [{ user_id: user.id, year, month, category_id: catId, amount: newAmount, updated_at: new Date().toISOString() }],
        { onConflict: 'user_id,year,month,category_id' }
      )
    }
    setSaving(false)
    fetchData({ silent: true })
  }

  const handleKeyDown = (e, catId) => {
    if (e.key === 'Enter') saveInlineEdit(catId)
    if (e.key === 'Escape') cancelInlineEdit()
  }

  // Variable category — add transaction
  const addTransaction = async (cat, amount, note = '') => {
    const { data } = await supabase.from('transactions').insert({
      user_id: user.id, year, month,
      category_id: cat.id, amount, note,
    }).select().single()
    if (data) {
      setTransactions(prev => [data, ...prev])
      setSavedCatId(cat.id)
      setTimeout(() => setSavedCatId(null), 1200)
    }
    fetchData({ silent: true })
  }

  // Variable category — delete transaction
  const deleteTransaction = async (txnId) => {
    setTransactions(prev => prev.filter(t => t.id !== txnId))
    await supabase.from('transactions').delete().eq('id', txnId)
    fetchData({ silent: true })
  }

  // Computed totals from transactions per category
  const txnTotalByCat = {}
  transactions.forEach(t => {
    txnTotalByCat[t.category_id] = (txnTotalByCat[t.category_id] || 0) + parseFloat(t.amount)
  })
  const prevTxnTotalByCat = {}
  prevTransactions.forEach(t => {
    prevTxnTotalByCat[t.category_id] = (prevTxnTotalByCat[t.category_id] || 0) + parseFloat(t.amount)
  })

  const fixed = categories.filter(c => !c.is_variable)
  const variable = categories.filter(c => c.is_variable)
  const fixedPaid = fixed.filter(c => expenses[c.id] > 0)
  const fixedPending = fixed.filter(c => !expenses[c.id])
  const totalFixed = fixed.reduce((s, c) => s + (expenses[c.id] || 0), 0)
  const totalVariable = variable.reduce((s, c) => s + (txnTotalByCat[c.id] || 0), 0)
  const total = totalFixed + totalVariable
  const prevTotal = fixed.reduce((s, c) => s + (prevExpenses[c.id] || 0), 0)
               + variable.reduce((s, c) => s + (prevTxnTotalByCat[c.id] || 0), 0)
  const hasData = total > 0

  if (loading) return <DashboardSkeleton />

  return (
    <div
      className="max-w-lg mx-auto px-4 pt-4 pb-6"
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

      <div className="transition-opacity duration-150 space-y-5" style={{ opacity: visible ? 1 : 0 }}>

        {/* Total card */}
        {hasData ? (
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-5 text-white shadow-lg">
            <p className="text-indigo-200 text-sm font-medium">Total del mes</p>
            <p className="text-4xl font-bold mt-1 tracking-tight">{fmt(total)}</p>
            <div className="flex gap-4 mt-3">
              {totalFixed > 0 && (
                <div>
                  <p className="text-indigo-300 text-xs">Fijos</p>
                  <p className="text-white font-semibold text-sm">{fmt(totalFixed)}</p>
                </div>
              )}
              {totalVariable > 0 && (
                <div>
                  <p className="text-indigo-300 text-xs">Variables</p>
                  <p className="text-white font-semibold text-sm">{fmt(totalVariable)}</p>
                </div>
              )}
            </div>
            {prevTotal > 0 && (
              <div className="mt-2 pt-2 border-t border-indigo-400/40">
                {total === prevTotal
                  ? <span className="text-indigo-200 text-xs flex items-center gap-1"><Minus size={11} /> igual al mes anterior</span>
                  : total > prevTotal
                  ? <span className="text-red-300 text-xs flex items-center gap-1"><TrendingUp size={11} />+{fmt(total - prevTotal)} vs mes anterior</span>
                  : <span className="text-green-300 text-xs flex items-center gap-1"><TrendingDown size={11} />-{fmt(prevTotal - total)} vs mes anterior</span>
                }
              </div>
            )}
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center">
            <p className="text-gray-400 text-sm">Sin gastos registrados</p>
            <p className="text-gray-300 text-xs mt-1">Tocá una categoría para agregar</p>
          </div>
        )}

        {/* GASTOS FIJOS */}
        {fixed.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gastos fijos</p>
              {fixedPending.length > 0
                ? <span className="text-xs text-gray-400 font-medium">{fixedPaid.length}/{fixed.length} pagados</span>
                : <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full animate-pulse">✓ todos pagados</span>
              }
            </div>

            {/* Pending rows */}
            <div className="space-y-2">
              {fixedPending.map(cat => <FixedRow key={cat.id} cat={cat} expenses={expenses} prevExpenses={prevExpenses} editingCatId={editingCatId} editingValue={editingValue} setEditingValue={setEditingValue} savedCatId={savedCatId} saving={saving} inputRef={inputRef} onEdit={startInlineEdit} onSave={saveInlineEdit} onCancel={cancelInlineEdit} onKeyDown={handleKeyDown} />)}
            </div>

            {/* Paid collapsible section */}
            {fixedPaid.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => setPaidOpen(o => !o)}
                  className="flex items-center gap-1.5 w-full px-1 py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ChevronDown size={13} className={`transition-transform duration-200 ${paidOpen ? 'rotate-180' : ''}`} />
                  <span className="font-medium">{paidOpen ? 'Ocultar' : 'Ver'} pagados ({fixedPaid.length})</span>
                  {!paidOpen && <span className="ml-auto font-semibold text-gray-500">{fmt(fixedPaid.reduce((s, c) => s + (expenses[c.id] || 0), 0))}</span>}
                </button>
                {paidOpen && (
                  <div className="space-y-2 mt-1">
                    {fixedPaid.map(cat => <FixedRow key={cat.id} cat={cat} expenses={expenses} prevExpenses={prevExpenses} editingCatId={editingCatId} editingValue={editingValue} setEditingValue={setEditingValue} savedCatId={savedCatId} saving={saving} inputRef={inputRef} onEdit={startInlineEdit} onSave={saveInlineEdit} onCancel={cancelInlineEdit} onKeyDown={handleKeyDown} />)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* GASTOS VARIABLES */}
        {variable.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gastos variables</p>
              {totalVariable > 0 && <span className="text-xs text-indigo-600 font-medium">{fmt(totalVariable)}</span>}
            </div>
            <div className="space-y-2">
              {[...variable].sort((a, b) => (txnTotalByCat[b.id] || -1) - (txnTotalByCat[a.id] || -1)).map(cat => {
                const current = txnTotalByCat[cat.id] || 0
                const prev = prevTxnTotalByCat[cat.id] || 0
                const justSaved = savedCatId === cat.id
                const catTxns = transactions.filter(t => t.category_id === cat.id)
                return (
                  <div key={cat.id} className={`bg-white rounded-xl shadow-sm border transition-all duration-300 ${
                    justSaved ? 'border-green-300 ring-1 ring-green-200 bg-green-50' : 'border-gray-100'
                  }`}>
                    <div className="flex items-center px-4 py-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0 mr-3" style={{ backgroundColor: cat.color }} />
                      <span className="font-medium text-gray-700 text-sm flex-1">{cat.name}</span>
                      <div className="flex flex-col items-end gap-0.5 mr-3">
                        {current > 0
                          ? <span className={`text-sm font-semibold transition-colors duration-300 ${justSaved ? 'text-green-600' : 'text-gray-900'}`}>{fmt(current)}</span>
                          : <span className="text-xs text-gray-400">$0</span>
                        }
                        {catTxns.length > 0 && (
                          <span className="text-xs text-gray-400">{catTxns.length} gasto{catTxns.length > 1 ? 's' : ''}</span>
                        )}
                        <Variation current={current || null} prev={prev || null} />
                      </div>
                      <button
                        onClick={() => setSheetCat(cat)}
                        className="w-8 h-8 rounded-full border-2 border-indigo-400 hover:bg-indigo-50 active:bg-indigo-100 text-indigo-500 flex items-center justify-center flex-shrink-0 transition-colors"
                      >
                        <Plus size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {categories.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">No tenés categorías. Creá una en la sección Categorías.</p>
        )}
      </div>

      {sheetCat && (
        <BottomSheet
          cat={sheetCat}
          transactions={transactions.filter(t => t.category_id === sheetCat.id)}
          onAdd={(amount, note) => addTransaction(sheetCat, amount, note)}
          onDelete={deleteTransaction}
          onClose={() => setSheetCat(null)}
        />
      )}
    </div>
  )
}

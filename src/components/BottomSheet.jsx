import { useEffect, useRef, useState } from 'react'
import { X, Trash2, Plus } from 'lucide-react'

const fmt = (n) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n || 0)

const displayValue = (raw) => {
  if (!raw) return ''
  const num = parseInt(raw, 10)
  return isNaN(num) ? '' : num.toLocaleString('es-AR')
}

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `Hace ${mins} min`
  if (hours < 24) return `Hace ${hours}h`
  if (days === 1) return 'Ayer'
  return `Hace ${days} días`
}

export default function BottomSheet({ cat, transactions = [], onAdd, onDelete, onClose }) {
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [visible, setVisible] = useState(false)
  const inputRef = useRef(null)

  const total = transactions.reduce((s, t) => s + parseFloat(t.amount), 0)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    setTimeout(() => inputRef.current?.focus(), 200)
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 250)
  }

  const handleAdd = () => {
    const digits = value.replace(/\D/g, '')
    if (!digits || parseInt(digits, 10) === 0) return
    onAdd(parseFloat(digits), note.trim())
    setValue('')
    setNote('')
    inputRef.current?.focus()
  }

  const handleDelete = async (txnId) => {
    setDeleting(txnId)
    await onDelete(txnId)
    setDeleting(null)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd()
    if (e.key === 'Escape') handleClose()
  }

  const digits = value.replace(/\D/g, '')
  const canAdd = digits && parseInt(digits, 10) > 0

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity duration-250"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className="relative bg-white rounded-t-3xl shadow-2xl transition-transform duration-250 flex flex-col max-h-[85vh]"
        style={{ transform: visible ? 'translateY(0)' : 'translateY(100%)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
            <span className="font-bold text-gray-900 text-lg">{cat.name}</span>
          </div>
          <div className="flex items-center gap-3">
            {total > 0 && (
              <span className="text-sm font-semibold text-indigo-600">{fmt(total)}</span>
            )}
            <button onClick={handleClose} className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Transaction list */}
        {transactions.length > 0 && (
          <div className="overflow-y-auto flex-1 px-6 pb-2">
            <p className="text-xs text-gray-400 font-medium mb-2">Gastos registrados</p>
            <div className="space-y-2">
              {transactions.map(t => (
                <div key={t.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-800">{fmt(parseFloat(t.amount))}</span>
                    <span className="text-xs text-gray-400">{timeAgo(t.created_at)}{t.note ? ` · ${t.note}` : ''}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(t.id)}
                    disabled={deleting === t.id}
                    className="p-1.5 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add new */}
        <div className="px-6 pt-3 pb-6 flex-shrink-0 border-t border-gray-100 mt-2">
          <p className="text-xs text-gray-400 font-medium mb-2">
            {transactions.length === 0 ? 'Primer gasto' : 'Agregar gasto'}
          </p>
          <div className="relative mb-3">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-lg">$</span>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={displayValue(value)}
              onChange={e => setValue(e.target.value.replace(/\D/g, ''))}
              onKeyDown={handleKeyDown}
              placeholder="0"
              className="w-full pl-9 pr-4 py-3.5 border-2 border-gray-200 focus:border-indigo-400 rounded-2xl text-2xl font-bold text-gray-900 focus:outline-none transition-colors text-right"
            />
          </div>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Nota (opcional)"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 focus:outline-none focus:border-indigo-300 mb-3"
          />
          <button
            onClick={handleAdd}
            disabled={!canAdd}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-2xl text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            {canAdd ? `Agregar ${fmt(parseInt(digits, 10))}` : 'Ingresar monto'}
          </button>
        </div>
      </div>
    </div>
  )
}

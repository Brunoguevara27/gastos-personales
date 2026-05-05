import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

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

export default function BottomSheet({ cat, current = 0, onSave, onClose }) {
  const [value, setValue] = useState('')
  const inputRef = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger slide-in after mount
    requestAnimationFrame(() => setVisible(true))
    setTimeout(() => inputRef.current?.focus(), 200)
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 250)
  }

  const handleSave = () => {
    const digits = value.replace(/\D/g, '')
    if (!digits || parseInt(digits, 10) === 0) { handleClose(); return }
    onSave(parseFloat(digits))
    handleClose()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') handleClose()
  }

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
        className="relative bg-white rounded-t-3xl px-6 pt-5 shadow-2xl transition-transform duration-250"
        style={{ transform: visible ? 'translateY(0)' : 'translateY(100%)', paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
            <span className="font-bold text-gray-900 text-lg">{cat.name}</span>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Current total */}
        {current > 0 && (
          <div className="bg-gray-50 rounded-2xl px-4 py-3 mb-5 flex items-center justify-between">
            <span className="text-sm text-gray-500">Total acumulado</span>
            <span className="font-semibold text-gray-800">{fmt(current)}</span>
          </div>
        )}

        {/* Input */}
        <div className="mb-5">
          <label className="text-xs text-gray-400 font-medium mb-2 block">
            {current > 0 ? 'Nuevo gasto a sumar' : 'Primer gasto'}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-lg">$</span>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={displayValue(value)}
              onChange={e => setValue(e.target.value.replace(/\D/g, ''))}
              onKeyDown={handleKeyDown}
              placeholder="0"
              className="w-full pl-9 pr-4 py-4 border-2 border-gray-200 focus:border-indigo-400 rounded-2xl text-2xl font-bold text-gray-900 focus:outline-none transition-colors text-right"
            />
          </div>
          {current > 0 && value && parseInt(value.replace(/\D/g, ''), 10) > 0 && (
            <p className="text-xs text-indigo-500 mt-2 text-right">
              Nuevo total: {fmt(current + parseInt(value.replace(/\D/g, ''), 10))}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-4 border-2 border-gray-200 rounded-2xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!value || parseInt(value.replace(/\D/g, ''), 10) === 0}
            className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-2xl text-sm font-semibold text-white transition-colors"
          >
            {current > 0 ? 'Sumar' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

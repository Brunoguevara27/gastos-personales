import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Plus, Trash2, Pencil, Check } from 'lucide-react'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4',
  '#10b981', '#6366f1',
]

function CategoryForm({ title, initialName = '', initialColor = '#6366f1', initialVariable = false, saving, error, onSave, onCancel }) {
  const [name, setName] = useState(initialName)
  const [color, setColor] = useState(initialColor)
  const [isVariable, setIsVariable] = useState(initialVariable)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-indigo-200 mb-3">
      <h3 className="font-semibold text-gray-700 mb-4 text-sm">{title}</h3>
      <div className="space-y-4">
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSave(name, color, isVariable)}
          placeholder="Nombre (ej: Supermercado)"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          maxLength={30}
        />

        {/* Color picker */}
        <div>
          <p className="text-xs text-gray-500 mb-2.5">Color</p>
          <div className="flex flex-wrap gap-3">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-9 h-9 rounded-full transition-all hover:scale-110 flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : 'none' }}
              >
                {color === c && <Check size={14} color="white" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>

        {/* Segmented control */}
        <div>
          <p className="text-xs text-gray-500 mb-2">Tipo de gasto</p>
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setIsVariable(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                !isVariable ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Fijo
            </button>
            <button
              type="button"
              onClick={() => setIsVariable(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                isVariable ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Variable
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5 px-1">
            {isVariable ? 'Podés sumar montos durante el mes' : 'Se ingresa un monto único por mes'}
          </p>
        </div>

        {error && <p className="text-red-600 text-xs">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(name, color, isVariable)}
            disabled={saving || !name.trim()}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CategorySection({ title, cats, savedId, deletingId, confirmDeleteId, onEdit, onDelete, onConfirmDelete, onCancelDelete }) {
  if (cats.length === 0) return null
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 mb-2">{title}</p>
      <div className="space-y-2">
        {cats.map(cat => (
          <div
            key={cat.id}
            className={`bg-white rounded-xl px-4 py-3.5 shadow-sm border transition-all duration-300 ${
              savedId === cat.id ? 'border-green-300 ring-1 ring-green-200 bg-green-50'
              : confirmDeleteId === cat.id ? 'border-red-200 bg-red-50'
              : 'border-gray-100'
            }`}
          >
            {confirmDeleteId === cat.id ? (
              <div className="flex items-center justify-between">
                <p className="text-sm text-red-600 font-medium">¿Eliminar "{cat.name}"?</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onCancelDelete}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => onDelete(cat)}
                    disabled={deletingId === cat.id}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    {deletingId === cat.id ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className={`font-medium text-sm transition-colors duration-300 ${savedId === cat.id ? 'text-green-700' : 'text-gray-700'}`}>
                    {cat.name}
                  </span>
                  {cat.is_variable && (
                    <span className="text-xs text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">variable</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(cat)}
                    className="p-1.5 text-gray-400 hover:text-indigo-500 transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => onConfirmDelete(cat.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CategoriesPage() {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState(null)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at')
    setCategories(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchCategories() }, [user.id])

  const flashSaved = (id) => {
    setSavedId(id)
    setTimeout(() => setSavedId(null), 1500)
  }

  const addCategory = async (name, color, isVariable) => {
    if (!name.trim()) return
    setSaving(true)
    setError('')
    const { error } = await supabase.from('categories').insert({
      user_id: user.id,
      name: name.trim(),
      color,
      is_default: false,
      is_variable: isVariable,
    })
    setSaving(false)
    if (error) {
      setError('No se pudo guardar la categoría.')
    } else {
      setAdding(false)
      await fetchCategories()
    }
  }

  const editCategory = async (name, color, isVariable) => {
    if (!name.trim()) return
    setSaving(true)
    setError('')
    const { error } = await supabase
      .from('categories')
      .update({ name: name.trim(), color, is_variable: isVariable })
      .eq('id', editingId)
    setSaving(false)
    if (error) {
      setError('No se pudo guardar.')
    } else {
      const id = editingId
      setEditingId(null)
      await fetchCategories()
      flashSaved(id)
    }
  }

  const deleteCategory = async (cat) => {
    setDeletingId(cat.id)
    await supabase.from('categories').delete().eq('id', cat.id)
    setDeletingId(null)
    setConfirmDeleteId(null)
    fetchCategories()
  }

  const startEdit = (cat) => {
    setAdding(false)
    setConfirmDeleteId(null)
    setError('')
    setEditingId(cat.id)
  }

  const fixed = categories.filter(c => !c.is_variable)
  const variable = categories.filter(c => c.is_variable)

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  )

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold text-gray-900">Categorías</h2>
        {!adding && !editingId && (
          <button
            onClick={() => { setAdding(true); setConfirmDeleteId(null) }}
            className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} /> Nueva
          </button>
        )}
      </div>

      {/* Summary */}
      {categories.length > 0 && (
        <p className="text-xs text-gray-400 mb-5 px-0.5">
          {fixed.length > 0 && `${fixed.length} fija${fixed.length !== 1 ? 's' : ''}`}
          {fixed.length > 0 && variable.length > 0 && ' · '}
          {variable.length > 0 && `${variable.length} variable${variable.length !== 1 ? 's' : ''}`}
        </p>
      )}

      {/* New category form */}
      {adding && (
        <CategoryForm
          title="Nueva categoría"
          saving={saving}
          error={error}
          onSave={addCategory}
          onCancel={() => { setAdding(false); setError('') }}
        />
      )}

      {/* Edit form (shown above the list) */}
      {editingId && (() => {
        const cat = categories.find(c => c.id === editingId)
        return cat ? (
          <CategoryForm
            title={`Editar — ${cat.name}`}
            initialName={cat.name}
            initialColor={cat.color}
            initialVariable={cat.is_variable || false}
            saving={saving}
            error={error}
            onSave={editCategory}
            onCancel={() => { setEditingId(null); setError('') }}
          />
        ) : null
      })()}

      {/* Grouped list */}
      <div className="space-y-5">
        <CategorySection
          title="Fijas"
          cats={fixed}
          savedId={savedId}
          deletingId={deletingId}
          confirmDeleteId={confirmDeleteId}
          onEdit={startEdit}
          onDelete={deleteCategory}
          onConfirmDelete={(id) => { setConfirmDeleteId(id); setEditingId(null) }}
          onCancelDelete={() => setConfirmDeleteId(null)}
        />
        <CategorySection
          title="Variables"
          cats={variable}
          savedId={savedId}
          deletingId={deletingId}
          confirmDeleteId={confirmDeleteId}
          onEdit={startEdit}
          onDelete={deleteCategory}
          onConfirmDelete={(id) => { setConfirmDeleteId(id); setEditingId(null) }}
          onCancelDelete={() => setConfirmDeleteId(null)}
        />
      </div>

      {categories.length === 0 && !adding && (
        <p className="text-center text-gray-400 text-sm py-8">
          No hay categorías. Creá la primera usando el botón Nueva.
        </p>
      )}
    </div>
  )
}

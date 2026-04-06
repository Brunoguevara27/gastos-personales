import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Plus, Trash2, Lock } from 'lucide-react'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4',
  '#10b981', '#6366f1',
]

export default function CategoriesPage() {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6366f1')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(null)

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

  const addCategory = async () => {
    if (!newName.trim()) return
    setSaving(true)
    setError('')
    const { error } = await supabase.from('categories').insert({
      user_id: user.id,
      name: newName.trim(),
      color: newColor,
      is_default: false,
    })
    setSaving(false)
    if (error) {
      setError('No se pudo guardar la categoría.')
    } else {
      setNewName('')
      setNewColor('#6366f1')
      setAdding(false)
      fetchCategories()
    }
  }

  const deleteCategory = async (cat) => {
    if (!window.confirm(`¿Eliminar "${cat.name}"? Se borrarán todos los gastos asociados.`)) return
    setDeleting(cat.id)
    await supabase.from('categories').delete().eq('id', cat.id)
    setDeleting(null)
    fetchCategories()
  }

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  )

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-gray-900">Categorías</h2>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} /> Nueva
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 mb-4">
          <h3 className="font-semibold text-gray-700 mb-4 text-sm">Nueva categoría</h3>
          <div className="space-y-4">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCategory()}
              placeholder="Nombre (ej: Teléfono)"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
              maxLength={30}
            />
            <div>
              <p className="text-xs text-gray-500 mb-2">Color</p>
              <div className="flex flex-wrap gap-2.5">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewColor(color)}
                    className={`w-8 h-8 rounded-full transition-all ${newColor === color ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            {error && <p className="text-red-600 text-xs">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setAdding(false); setNewName(''); setError('') }}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={addCategory}
                disabled={saving || !newName.trim()}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {categories.map(cat => (
          <div
            key={cat.id}
            className="bg-white rounded-xl px-4 py-3.5 shadow-sm border border-gray-100 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
              <span className="font-medium text-gray-700 text-sm">{cat.name}</span>
              {cat.is_default && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Default</span>
              )}
            </div>
            {cat.is_default ? (
              <Lock size={15} className="text-gray-300" />
            ) : (
              <button
                onClick={() => deleteCategory(cat)}
                disabled={deleting === cat.id}
                className="text-red-300 hover:text-red-500 p-1 transition-colors disabled:opacity-50"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-8">
          No hay categorías. Creá la primera usando el botón Nueva.
        </p>
      )}
    </div>
  )
}

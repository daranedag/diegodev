import { useState } from 'react'
import { insforge } from '../../lib/insforge'
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline'
import PropTypes from 'prop-types'

export default function CardModal({ card, onClose, onUpdate, onDelete }) {
    const [title, setTitle] = useState(card.title)
    const [description, setDescription] = useState(card.description ?? '')
    const [priority, setPriority] = useState(card.priority ?? 'medium')
    const [dueDate, setDueDate] = useState(card.due_date ?? '')
    const [saving, setSaving] = useState(false)

    async function handleSave(e) {
        e.preventDefault()
        setSaving(true)
        const updates = {
            title: title.trim(),
            description: description.trim() || null,
            priority,
            due_date: dueDate || null,
        }
        const { data } = await insforge.database
            .from('kanban_cards')
            .update(updates)
            .eq('id', card.id)
            .select()
        if (data) onUpdate(data[0])
        setSaving(false)
        onClose()
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Editar tarjeta</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="px-5 py-4 flex flex-col gap-4">
                    {/* Title */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Título</label>
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Descripción</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Añade una descripción..."
                        />
                    </div>

                    <div className="flex gap-3">
                        {/* Priority */}
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Prioridad</label>
                            <select
                                value={priority}
                                onChange={e => setPriority(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="low">Baja</option>
                                <option value="medium">Media</option>
                                <option value="high">Alta</option>
                            </select>
                        </div>

                        {/* Due date */}
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Fecha límite</label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                        <button
                            type="submit"
                            disabled={saving || !title.trim()}
                            className="flex-1 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                        >
                            {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                            type="button"
                            onClick={onDelete}
                            className="px-3 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

CardModal.propTypes = {
    card: PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        description: PropTypes.string,
        priority: PropTypes.string,
        due_date: PropTypes.string,
    }).isRequired,
    onClose: PropTypes.func.isRequired,
    onUpdate: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
}

import { useState, useEffect } from 'react'
import { DragDropContext } from '@hello-pangea/dnd'
import { useAuth } from '../../context/AuthContext'
import { insforge } from '../../lib/insforge'
import Column from './Column'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import PropTypes from 'prop-types'

export default function Board({ boardId, onDeleteBoard }) {
    const { user } = useAuth()
    const [columns, setColumns] = useState([])
    // cards grouped by column id: { [colId]: Card[] }
    const [cards, setCards] = useState({})
    const [newColTitle, setNewColTitle] = useState('')
    const [addingCol, setAddingCol] = useState(false)

    useEffect(() => {
        loadAll()
    }, [boardId])

    async function loadAll() {
        const { data: cols } = await insforge.database
            .from('kanban_columns')
            .select('id, title, position, color')
            .eq('board_id', boardId)
            .order('position', { ascending: true })

        const loadedCols = cols || []
        setColumns(loadedCols)

        if (loadedCols.length === 0) {
            setCards({})
            return
        }

        const colIds = loadedCols.map(c => c.id)
        const { data: allCards } = await insforge.database
            .from('kanban_cards')
            .select('id, title, description, position, due_date, priority, column_id')
            .in('column_id', colIds)
            .order('position', { ascending: true })

        const grouped = {}
        loadedCols.forEach(col => { grouped[col.id] = [] })
        ;(allCards || []).forEach(card => {
            if (grouped[card.column_id]) grouped[card.column_id].push(card)
        })
        setCards(grouped)
    }

    async function handleDragEnd(result) {
        const { source, destination, draggableId } = result
        if (!destination) return
        if (source.droppableId === destination.droppableId && source.index === destination.index) return

        const srcId = source.droppableId
        const dstId = destination.droppableId
        const srcCards = Array.from(cards[srcId] || [])
        const [moved] = srcCards.splice(source.index, 1)

        if (srcId === dstId) {
            srcCards.splice(destination.index, 0, moved)
            setCards(prev => ({ ...prev, [srcId]: srcCards }))
            await Promise.all(
                srcCards.map((c, i) =>
                    insforge.database.from('kanban_cards').update({ position: i }).eq('id', c.id)
                )
            )
        } else {
            const dstCards = Array.from(cards[dstId] || [])
            dstCards.splice(destination.index, 0, { ...moved, column_id: dstId })
            setCards(prev => ({ ...prev, [srcId]: srcCards, [dstId]: dstCards }))
            await insforge.database
                .from('kanban_cards')
                .update({ column_id: dstId, position: destination.index })
                .eq('id', draggableId)
            await Promise.all([
                ...srcCards.map((c, i) =>
                    insforge.database.from('kanban_cards').update({ position: i }).eq('id', c.id)
                ),
                ...dstCards.map((c, i) =>
                    insforge.database.from('kanban_cards').update({ position: i }).eq('id', c.id)
                ),
            ])
        }
    }

    // Card callbacks (lifted from Column)
    function onCardAdded(colId, card) {
        setCards(prev => ({ ...prev, [colId]: [...(prev[colId] || []), card] }))
    }

    function onCardDeleted(colId, cardId) {
        setCards(prev => ({ ...prev, [colId]: (prev[colId] || []).filter(c => c.id !== cardId) }))
    }

    function onCardUpdated(colId, updated) {
        setCards(prev => ({
            ...prev,
            [colId]: (prev[colId] || []).map(c => c.id === updated.id ? updated : c),
        }))
    }

    // Column CRUD
    async function addColumn(e) {
        e.preventDefault()
        if (!newColTitle.trim()) return
        setAddingCol(true)
        const { data } = await insforge.database
            .from('kanban_columns')
            .insert([{ board_id: boardId, user_id: user.id, title: newColTitle.trim(), position: columns.length }])
            .select()
        if (data) {
            setColumns(prev => [...prev, data[0]])
            setCards(prev => ({ ...prev, [data[0].id]: [] }))
        }
        setNewColTitle('')
        setAddingCol(false)
    }

    async function deleteColumn(colId) {
        await insforge.database.from('kanban_columns').delete().eq('id', colId)
        setColumns(prev => prev.filter(c => c.id !== colId))
        setCards(prev => { const n = { ...prev }; delete n[colId]; return n })
    }

    async function updateColumnTitle(colId, title) {
        await insforge.database.from('kanban_columns').update({ title }).eq('id', colId)
        setColumns(prev => prev.map(c => c.id === colId ? { ...c, title } : c))
    }

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex-1 overflow-hidden">
                <div className="flex items-start gap-4 p-4 h-full overflow-x-auto">
                    {columns.map(col => (
                        <Column
                            key={col.id}
                            column={col}
                            userId={user.id}
                            cards={cards[col.id] || []}
                            onDelete={() => deleteColumn(col.id)}
                            onUpdateTitle={title => updateColumnTitle(col.id, title)}
                            onCardAdded={card => onCardAdded(col.id, card)}
                            onCardDeleted={cardId => onCardDeleted(col.id, cardId)}
                            onCardUpdated={updated => onCardUpdated(col.id, updated)}
                        />
                    ))}

                    {/* Add column panel */}
                    <form
                        onSubmit={addColumn}
                        className="flex-shrink-0 w-64 bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 flex flex-col gap-2"
                    >
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nueva columna</p>
                        <input
                            value={newColTitle}
                            onChange={e => setNewColTitle(e.target.value)}
                            placeholder="Nombre de la columna..."
                            className="text-sm px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        <button
                            type="submit"
                            disabled={addingCol || !newColTitle.trim()}
                            className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
                        >
                            <PlusIcon className="w-4 h-4" />
                            Agregar
                        </button>
                        <button
                            type="button"
                            onClick={onDeleteBoard}
                            className="flex items-center justify-center gap-1 py-1 text-xs text-red-400 hover:text-red-500 transition-colors"
                        >
                            <TrashIcon className="w-3.5 h-3.5" />
                            Eliminar tablero
                        </button>
                    </form>
                </div>
            </div>
        </DragDropContext>
    )
}

Board.propTypes = {
    boardId: PropTypes.string.isRequired,
    onDeleteBoard: PropTypes.func.isRequired,
}

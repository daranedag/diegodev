import { useState } from 'react'
import { Droppable, Draggable } from '@hello-pangea/dnd'
import { insforge } from '../../lib/insforge'
import Card from './Card'
import CardModal from './CardModal'
import { PlusIcon, TrashIcon, PencilIcon, CheckIcon } from '@heroicons/react/24/outline'
import PropTypes from 'prop-types'

export default function Column({ column, userId, cards, onDelete, onUpdateTitle, onCardAdded, onCardDeleted, onCardUpdated }) {
    const [newCardTitle, setNewCardTitle] = useState('')
    const [addingCard, setAddingCard] = useState(false)
    const [editingTitle, setEditingTitle] = useState(false)
    const [titleInput, setTitleInput] = useState(column.title)
    const [selectedCard, setSelectedCard] = useState(null)

    async function addCard(e) {
        e.preventDefault()
        if (!newCardTitle.trim()) return
        setAddingCard(true)
        const { data } = await insforge.database
            .from('kanban_cards')
            .insert([{
                column_id: column.id,
                user_id: userId,
                title: newCardTitle.trim(),
                position: cards.length,
            }])
            .select()
        if (data) onCardAdded(data[0])
        setNewCardTitle('')
        setAddingCard(false)
    }

    async function deleteCard(cardId) {
        await insforge.database.from('kanban_cards').delete().eq('id', cardId)
        onCardDeleted(cardId)
    }

    async function saveTitle() {
        if (titleInput.trim() && titleInput !== column.title) {
            await onUpdateTitle(titleInput.trim())
        }
        setEditingTitle(false)
    }

    return (
        <>
            <div className="flex-shrink-0 w-64 bg-gray-100 dark:bg-gray-800 rounded-xl flex flex-col max-h-[calc(100vh-12rem)]">
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-2.5">
                    {editingTitle ? (
                        <div className="flex items-center gap-1 flex-1">
                            <input
                                value={titleInput}
                                onChange={e => setTitleInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && saveTitle()}
                                autoFocus
                                className="flex-1 text-sm font-semibold bg-white dark:bg-gray-700 border border-purple-500 rounded px-1.5 py-0.5 text-gray-800 dark:text-gray-200 focus:outline-none"
                            />
                            <button onClick={saveTitle} className="text-green-500 hover:text-green-600">
                                <CheckIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <>
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex-1 truncate">
                                {column.title}
                                <span className="ml-1.5 text-xs font-normal text-gray-400">({cards.length})</span>
                            </h3>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setEditingTitle(true)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5">
                                    <PencilIcon className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={onDelete} className="text-gray-400 hover:text-red-500 p-0.5">
                                    <TrashIcon className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Droppable card list */}
                <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-2 min-h-[4rem] transition-colors rounded-lg ${
                                snapshot.isDraggingOver
                                    ? 'bg-purple-50 dark:bg-purple-900/20'
                                    : ''
                            }`}
                        >
                            {cards.map((card, index) => (
                                <Draggable key={card.id} draggableId={card.id} index={index}>
                                    {(dragProvided, dragSnapshot) => (
                                        <div
                                            ref={dragProvided.innerRef}
                                            {...dragProvided.draggableProps}
                                            {...dragProvided.dragHandleProps}
                                            style={dragProvided.draggableProps.style}
                                            className={`${dragSnapshot.isDragging ? 'rotate-1 shadow-xl' : ''} transition-transform`}
                                        >
                                            <Card
                                                card={card}
                                                onDelete={() => deleteCard(card.id)}
                                                onClick={() => setSelectedCard(card)}
                                            />
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>

                {/* Add card */}
                <form onSubmit={addCard} className="px-2 pb-2 flex gap-1">
                    <input
                        value={newCardTitle}
                        onChange={e => setNewCardTitle(e.target.value)}
                        placeholder="Agregar tarjeta..."
                        className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <button
                        type="submit"
                        disabled={addingCard || !newCardTitle.trim()}
                        className="p-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                        <PlusIcon className="w-3.5 h-3.5" />
                    </button>
                </form>
            </div>

            {selectedCard && (
                <CardModal
                    card={selectedCard}
                    onClose={() => setSelectedCard(null)}
                    onUpdate={updated => { onCardUpdated(updated); setSelectedCard(updated) }}
                    onDelete={() => { deleteCard(selectedCard.id); setSelectedCard(null) }}
                />
            )}
        </>
    )
}

Column.propTypes = {
    column: PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        position: PropTypes.number,
        color: PropTypes.string,
    }).isRequired,
    userId: PropTypes.string.isRequired,
    cards: PropTypes.array.isRequired,
    onDelete: PropTypes.func.isRequired,
    onUpdateTitle: PropTypes.func.isRequired,
    onCardAdded: PropTypes.func.isRequired,
    onCardDeleted: PropTypes.func.isRequired,
    onCardUpdated: PropTypes.func.isRequired,
}

import { TrashIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import PropTypes from 'prop-types'

const PRIORITY_STYLES = {
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const PRIORITY_LABELS = { low: 'Baja', medium: 'Media', high: 'Alta' }

export default function Card({ card, onClick, onDelete }) {
    function handleDelete(e) {
        e.stopPropagation()
        onDelete()
    }

    return (
        <div
            onClick={onClick}
            className="bg-white dark:bg-gray-700 rounded-lg px-3 py-2.5 shadow-sm border border-gray-200 dark:border-gray-600 cursor-pointer hover:border-purple-400 dark:hover:border-purple-500 transition-colors group"
        >
            <div className="flex items-start justify-between gap-1">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 flex-1 leading-snug">
                    {card.title}
                </p>
                <button
                    onClick={handleDelete}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-0.5 flex-shrink-0"
                >
                    <TrashIcon className="w-3.5 h-3.5" />
                </button>
            </div>

            {card.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {card.description}
                </p>
            )}

            <div className="flex items-center gap-2 mt-2 flex-wrap">
                {card.priority && (
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PRIORITY_STYLES[card.priority]}`}>
                        {PRIORITY_LABELS[card.priority]}
                    </span>
                )}
                {card.due_date && (
                    <span className="flex items-center gap-0.5 text-xs text-gray-500 dark:text-gray-400">
                        <CalendarIcon className="w-3 h-3" />
                        {format(new Date(card.due_date), 'dd/MM/yy')}
                    </span>
                )}
            </div>
        </div>
    )
}

Card.propTypes = {
    card: PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        description: PropTypes.string,
        priority: PropTypes.string,
        due_date: PropTypes.string,
    }).isRequired,
    onClick: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
}

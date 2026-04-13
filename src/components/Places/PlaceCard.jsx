import PropTypes from 'prop-types'
import { TrashIcon, PencilIcon, MapPinIcon, PhoneIcon, GlobeAltIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

const TYPE_STYLES = {
    restaurant: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    bar: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    cafe: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    otro: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

export default function PlaceCard({ place, itemCount, onClick, onEdit, onDelete }) {
    const { t } = useTranslation()

    function handleEdit(e) {
        e.stopPropagation()
        onEdit()
    }

    function handleDelete(e) {
        e.stopPropagation()
        onDelete()
    }

    return (
        <div
            onClick={onClick}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md transition-all cursor-pointer group p-4 flex flex-col gap-2"
        >
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                        {place.name}
                    </h3>
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLES[place.type] ?? TYPE_STYLES.otro}`}>
                        {t(`places.types.${place.type}`)}
                    </span>
                </div>
                {/* Action buttons — visible on hover */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                        onClick={handleEdit}
                        aria-label={t('places.edit')}
                        className="p-1 rounded text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                    >
                        <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleDelete}
                        aria-label={t('places.delete')}
                        className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Notes excerpt */}
            {place.notes && (
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {place.notes}
                </p>
            )}

            {/* Contact/links row */}
            <div className="flex flex-wrap items-center gap-3 mt-1">
                {place.google_maps_url && (
                    <a
                        href={place.google_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:underline"
                    >
                        <MapPinIcon className="w-3.5 h-3.5" />
                        Maps
                    </a>
                )}
                {place.phone && (
                    <a
                        href={`tel:${place.phone}`}
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                        <PhoneIcon className="w-3.5 h-3.5" />
                        {place.phone}
                    </a>
                )}
                {place.instagram && (
                    <a
                        href={`https://instagram.com/${place.instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-xs text-pink-500 hover:underline"
                    >
                        {place.instagram.startsWith('@') ? place.instagram : `@${place.instagram}`}
                    </a>
                )}
                {place.website && (
                    <a
                        href={place.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                        <GlobeAltIcon className="w-3.5 h-3.5" />
                        {t('places.website')}
                    </a>
                )}
            </div>

            {/* Footer: item count */}
            <div className="mt-1 pt-2 border-t border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                    {itemCount === 1
                        ? t('places.itemCount_one', { count: itemCount })
                        : t('places.itemCount_other', { count: itemCount })}
                </span>
            </div>
        </div>
    )
}

PlaceCard.propTypes = {
    place: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        type: PropTypes.string.isRequired,
        google_maps_url: PropTypes.string,
        phone: PropTypes.string,
        instagram: PropTypes.string,
        website: PropTypes.string,
        notes: PropTypes.string,
    }).isRequired,
    itemCount: PropTypes.number.isRequired,
    onClick: PropTypes.func.isRequired,
    onEdit: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
}

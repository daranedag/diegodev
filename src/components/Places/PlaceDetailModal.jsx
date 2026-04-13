import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
    XMarkIcon,
    TrashIcon,
    PencilIcon,
    PlusIcon,
    MapPinIcon,
    PhoneIcon,
    GlobeAltIcon,
    CheckIcon,
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { PlacesService } from '../../services/PlacesService'
import { useAuth } from '../../context/AuthContext'

const EMPTY_ITEM = { name: '', price: '', notes: '', visited_date: '' }

const TYPE_STYLES = {
    restaurant: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    bar: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    cafe: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    otro: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

function formatDate(dateStr) {
    if (!dateStr) return null
    try {
        return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: es })
    } catch {
        return dateStr
    }
}

export default function PlaceDetailModal({ place, onClose }) {
    const { t } = useTranslation()
    const { user } = useAuth()
    const [items, setItems] = useState([])
    const [loadingItems, setLoadingItems] = useState(true)
    const [showItemForm, setShowItemForm] = useState(false)
    const [editingItem, setEditingItem] = useState(null) // item object or null
    const [itemForm, setItemForm] = useState({ ...EMPTY_ITEM })
    const [savingItem, setSavingItem] = useState(false)

    useEffect(() => {
        loadItems()
    }, [place.id])

    async function loadItems() {
        setLoadingItems(true)
        try {
            const data = await PlacesService.getPlaceItems(place.id)
            setItems(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoadingItems(false)
        }
    }

    function openAddItem() {
        setEditingItem(null)
        setItemForm({ ...EMPTY_ITEM })
        setShowItemForm(true)
    }

    function openEditItem(item) {
        setEditingItem(item)
        setItemForm({
            name: item.name ?? '',
            price: item.price ?? '',
            notes: item.notes ?? '',
            visited_date: item.visited_date ?? '',
        })
        setShowItemForm(true)
    }

    function cancelItemForm() {
        setShowItemForm(false)
        setEditingItem(null)
        setItemForm({ ...EMPTY_ITEM })
    }

    function handleItemFormChange(e) {
        const { name, value } = e.target
        setItemForm(prev => ({ ...prev, [name]: value }))
    }

    async function handleItemSubmit(e) {
        e.preventDefault()
        setSavingItem(true)
        try {
            const payload = {
                name: itemForm.name.trim(),
                price: itemForm.price.trim() || null,
                notes: itemForm.notes.trim() || null,
                visited_date: itemForm.visited_date || null,
            }
            if (editingItem) {
                const updated = await PlacesService.updatePlaceItem(editingItem.id, payload)
                setItems(prev => prev.map(i => (i.id === editingItem.id ? updated : i)))
            } else {
                const created = await PlacesService.createPlaceItem({
                    ...payload,
                    place_id: place.id,
                    user_id: user.id,
                })
                setItems(prev => [created, ...prev])
            }
            cancelItemForm()
        } catch (err) {
            console.error(err)
        } finally {
            setSavingItem(false)
        }
    }

    async function handleDeleteItem(itemId) {
        try {
            await PlacesService.deletePlaceItem(itemId)
            setItems(prev => prev.filter(i => i.id !== itemId))
        } catch (err) {
            console.error(err)
        }
    }

    const inputClass =
        'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500'
    const labelClass = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                                {place.name}
                            </h2>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLES[place.type] ?? TYPE_STYLES.otro}`}>
                                {t(`places.types.${place.type}`)}
                            </span>
                        </div>
                        {/* Contact links */}
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                            {place.google_maps_url && (
                                <a
                                    href={place.google_maps_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:underline"
                                >
                                    <MapPinIcon className="w-3.5 h-3.5" />
                                    Google Maps
                                </a>
                            )}
                            {place.phone && (
                                <a
                                    href={`tel:${place.phone}`}
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
                                    className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                >
                                    <GlobeAltIcon className="w-3.5 h-3.5" />
                                    {t('places.website')}
                                </a>
                            )}
                        </div>
                        {place.notes && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{place.notes}</p>
                        )}
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 ml-2">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Items section */}
                <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                    {/* Section title + add button */}
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {t('places.items.title')}
                        </h3>
                        {!showItemForm && (
                            <button
                                onClick={openAddItem}
                                className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
                            >
                                <PlusIcon className="w-4 h-4" />
                                {t('places.items.add')}
                            </button>
                        )}
                    </div>

                    {/* Inline item form */}
                    {showItemForm && (
                        <form
                            onSubmit={handleItemSubmit}
                            className="bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 p-4 flex flex-col gap-3"
                        >
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                {editingItem ? t('places.items.editItem') : t('places.items.newItem')}
                            </p>
                            {/* Name */}
                            <div>
                                <label className={labelClass}>{t('places.items.form.name')} *</label>
                                <input
                                    name="name"
                                    value={itemForm.name}
                                    onChange={handleItemFormChange}
                                    required
                                    className={inputClass}
                                    placeholder={t('places.items.form.namePlaceholder')}
                                />
                            </div>
                            {/* Price + Date */}
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className={labelClass}>{t('places.items.form.price')}</label>
                                    <input
                                        name="price"
                                        value={itemForm.price}
                                        onChange={handleItemFormChange}
                                        className={inputClass}
                                        placeholder={t('places.items.form.pricePlaceholder')}
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className={labelClass}>{t('places.items.form.visitedDate')}</label>
                                    <input
                                        name="visited_date"
                                        type="date"
                                        value={itemForm.visited_date}
                                        onChange={handleItemFormChange}
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                            {/* Notes */}
                            <div>
                                <label className={labelClass}>{t('places.items.form.notes')}</label>
                                <textarea
                                    name="notes"
                                    value={itemForm.notes}
                                    onChange={handleItemFormChange}
                                    rows={2}
                                    className={`${inputClass} resize-none`}
                                    placeholder={t('places.items.form.notesPlaceholder')}
                                />
                            </div>
                            {/* Form actions */}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={cancelItemForm}
                                    className="flex-1 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    {t('places.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingItem || !itemForm.name.trim()}
                                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                                >
                                    <CheckIcon className="w-3.5 h-3.5" />
                                    {savingItem ? t('places.saving') : t('places.save')}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Items list */}
                    {loadingItems ? (
                        <p className="text-sm text-gray-400 text-center py-4">{t('places.loading')}</p>
                    ) : items.length === 0 && !showItemForm ? (
                        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                            {t('places.items.empty')}
                        </p>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {items.map(item => {
                                const dateLabel = item.visited_date
                                    ? formatDate(item.visited_date)
                                    : formatDate(item.created_at)
                                const datePrefix = item.visited_date
                                    ? t('places.items.visitedOn')
                                    : t('places.items.addedOn')

                                return (
                                    <li
                                        key={item.id}
                                        className="flex items-start justify-between gap-2 bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2.5 group"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                                    {item.name}
                                                </span>
                                                {item.price && (
                                                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-1.5 py-0.5 rounded">
                                                        {item.price}
                                                    </span>
                                                )}
                                            </div>
                                            {item.notes && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                    {item.notes}
                                                </p>
                                            )}
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                {datePrefix} {dateLabel}
                                            </p>
                                        </div>
                                        {/* Item actions */}
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                            <button
                                                onClick={() => openEditItem(item)}
                                                aria-label={t('places.edit')}
                                                className="p-1 rounded text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                            >
                                                <PencilIcon className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteItem(item.id)}
                                                aria-label={t('places.delete')}
                                                className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <TrashIcon className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    )
}

PlaceDetailModal.propTypes = {
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
    onClose: PropTypes.func.isRequired,
}

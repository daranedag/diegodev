import { useState } from 'react'
import PropTypes from 'prop-types'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

const EMPTY_FORM = {
    name: '',
    type: 'restaurant',
    google_maps_url: '',
    phone: '',
    instagram: '',
    website: '',
    notes: '',
}

export default function PlaceFormModal({ place, onSave, onClose }) {
    const { t } = useTranslation()
    const [form, setForm] = useState(
        place
            ? {
                name: place.name ?? '',
                type: place.type ?? 'restaurant',
                google_maps_url: place.google_maps_url ?? '',
                phone: place.phone ?? '',
                instagram: place.instagram ?? '',
                website: place.website ?? '',
                notes: place.notes ?? '',
            }
            : { ...EMPTY_FORM }
    )
    const [saving, setSaving] = useState(false)

    function handleChange(e) {
        const { name, value } = e.target
        setForm(prev => ({ ...prev, [name]: value }))
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setSaving(true)
        const payload = {
            name: form.name.trim(),
            type: form.type,
            google_maps_url: form.google_maps_url.trim() || null,
            phone: form.phone.trim() || null,
            instagram: form.instagram.trim() || null,
            website: form.website.trim() || null,
            notes: form.notes.trim() || null,
        }
        await onSave(payload)
        setSaving(false)
    }

    const inputClass =
        'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500'
    const labelClass = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
                    <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                        {place ? t('places.editPlace') : t('places.addPlace')}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-5 py-4 flex flex-col gap-4 overflow-y-auto">
                    {/* Name + Type */}
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className={labelClass}>{t('places.form.name')} *</label>
                            <input
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                required
                                className={inputClass}
                                placeholder={t('places.form.namePlaceholder')}
                            />
                        </div>
                        <div className="w-36">
                            <label className={labelClass}>{t('places.form.type')}</label>
                            <select name="type" value={form.type} onChange={handleChange} className={inputClass}>
                                <option value="restaurant">{t('places.types.restaurant')}</option>
                                <option value="bar">{t('places.types.bar')}</option>
                                <option value="cafe">{t('places.types.cafe')}</option>
                                <option value="otro">{t('places.types.otro')}</option>
                            </select>
                        </div>
                    </div>

                    {/* Google Maps URL */}
                    <div>
                        <label className={labelClass}>{t('places.form.googleMapsUrl')}</label>
                        <input
                            name="google_maps_url"
                            value={form.google_maps_url}
                            onChange={handleChange}
                            type="url"
                            className={inputClass}
                            placeholder="https://maps.google.com/..."
                        />
                    </div>

                    {/* Contact row */}
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className={labelClass}>{t('places.form.phone')}</label>
                            <input
                                name="phone"
                                value={form.phone}
                                onChange={handleChange}
                                type="tel"
                                className={inputClass}
                                placeholder="+56 9 0000 0000"
                            />
                        </div>
                        <div className="flex-1">
                            <label className={labelClass}>{t('places.form.instagram')}</label>
                            <input
                                name="instagram"
                                value={form.instagram}
                                onChange={handleChange}
                                className={inputClass}
                                placeholder="@usuario"
                            />
                        </div>
                    </div>

                    {/* Website */}
                    <div>
                        <label className={labelClass}>{t('places.form.website')}</label>
                        <input
                            name="website"
                            value={form.website}
                            onChange={handleChange}
                            type="url"
                            className={inputClass}
                            placeholder="https://..."
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className={labelClass}>{t('places.form.notes')}</label>
                        <textarea
                            name="notes"
                            value={form.notes}
                            onChange={handleChange}
                            rows={3}
                            className={`${inputClass} resize-none`}
                            placeholder={t('places.form.notesPlaceholder')}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            {t('places.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !form.name.trim()}
                            className="flex-1 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                        >
                            {saving ? t('places.saving') : t('places.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

PlaceFormModal.propTypes = {
    place: PropTypes.object,
    onSave: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
}

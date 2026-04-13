import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import { PlusIcon } from '@heroicons/react/24/outline'
import PropTypes from 'prop-types'
import Header from '../components/Header'
import Footer from '../components/Footer'
import PlaceCard from '../components/Places/PlaceCard'
import PlaceFormModal from '../components/Places/PlaceFormModal'
import PlaceDetailModal from '../components/Places/PlaceDetailModal'
import { PlacesService } from '../services/PlacesService'

export default function Places({ isDark, toggleTheme }) {
    const { user, loading } = useAuth()
    const navigate = useNavigate()
    const { t } = useTranslation()

    const [places, setPlaces] = useState([])
    const [itemCounts, setItemCounts] = useState({}) // { placeId: count }
    const [loadingPlaces, setLoadingPlaces] = useState(true)

    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingPlace, setEditingPlace] = useState(null)

    const [selectedPlace, setSelectedPlace] = useState(null)
    const [isDetailOpen, setIsDetailOpen] = useState(false)

    // Auth guard
    useEffect(() => {
        if (!loading && !user) navigate('/')
    }, [user, loading, navigate])

    // Load places when user is ready
    useEffect(() => {
        if (user) loadPlaces()
    }, [user])

    async function loadPlaces() {
        setLoadingPlaces(true)
        try {
            const data = await PlacesService.getPlaces()
            setPlaces(data)
            // Fetch item counts for each place in parallel
            const counts = await Promise.all(
                data.map(async p => {
                    const items = await PlacesService.getPlaceItems(p.id)
                    return { id: p.id, count: items.length }
                })
            )
            const countsMap = {}
            counts.forEach(({ id, count }) => { countsMap[id] = count })
            setItemCounts(countsMap)
        } catch (err) {
            console.error(err)
        } finally {
            setLoadingPlaces(false)
        }
    }

    function openAddPlace() {
        setEditingPlace(null)
        setIsFormOpen(true)
    }

    function openEditPlace(place) {
        setEditingPlace(place)
        setIsFormOpen(true)
    }

    function openDetail(place) {
        setSelectedPlace(place)
        setIsDetailOpen(true)
    }

    function closeDetail() {
        setIsDetailOpen(false)
        setSelectedPlace(null)
        // Refresh counts in case items were added/removed inside the modal
        loadPlaces()
    }

    async function handleSavePlace(payload) {
        if (editingPlace) {
            const updated = await PlacesService.updatePlace(editingPlace.id, payload)
            setPlaces(prev => prev.map(p => (p.id === editingPlace.id ? updated : p)))
        } else {
            const created = await PlacesService.createPlace({ ...payload, user_id: user.id })
            setPlaces(prev => [created, ...prev])
            setItemCounts(prev => ({ ...prev, [created.id]: 0 }))
        }
        setIsFormOpen(false)
        setEditingPlace(null)
    }

    async function handleDeletePlace(placeId) {
        try {
            await PlacesService.deletePlace(placeId)
            setPlaces(prev => prev.filter(p => p.id !== placeId))
            setItemCounts(prev => {
                const next = { ...prev }
                delete next[placeId]
                return next
            })
        } catch (err) {
            console.error(err)
        }
    }

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
            <Header isDark={isDark} toggleTheme={toggleTheme} />

            <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Page header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                            {t('places.title')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {t('places.subtitle')}
                        </p>
                    </div>
                    <button
                        onClick={openAddPlace}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
                    >
                        <PlusIcon className="w-4 h-4" />
                        {t('places.addPlace')}
                    </button>
                </div>

                {/* Content */}
                {loadingPlaces ? (
                    <div className="flex justify-center items-center h-48">
                        <span className="text-gray-400 dark:text-gray-500 text-sm">{t('places.loading')}</span>
                    </div>
                ) : places.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
                        <p className="text-gray-400 dark:text-gray-500 text-sm">{t('places.empty')}</p>
                        <button
                            onClick={openAddPlace}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-purple-400 text-purple-600 dark:text-purple-400 text-sm hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                        >
                            <PlusIcon className="w-4 h-4" />
                            {t('places.addPlace')}
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {places.map(place => (
                            <PlaceCard
                                key={place.id}
                                place={place}
                                itemCount={itemCounts[place.id] ?? 0}
                                onClick={() => openDetail(place)}
                                onEdit={() => openEditPlace(place)}
                                onDelete={() => handleDeletePlace(place.id)}
                            />
                        ))}
                    </div>
                )}
            </main>

            <Footer />

            {/* Modals */}
            {isFormOpen && (
                <PlaceFormModal
                    place={editingPlace}
                    onSave={handleSavePlace}
                    onClose={() => { setIsFormOpen(false); setEditingPlace(null) }}
                />
            )}

            {isDetailOpen && selectedPlace && (
                <PlaceDetailModal
                    place={selectedPlace}
                    onClose={closeDetail}
                />
            )}
        </div>
    )
}

Places.propTypes = {
    isDark: PropTypes.bool.isRequired,
    toggleTheme: PropTypes.func.isRequired,
}

import { useState, useEffect, useRef, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { insforge } from '../lib/insforge'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Board from '../components/Kanban/Board'
import { PlusIcon, PencilIcon, CheckIcon, XMarkIcon, SwatchIcon } from '@heroicons/react/24/outline'
import PropTypes from 'prop-types'

const BOARD_COLORS = [
    '#7c3aed', // purple
    '#2563eb', // blue
    '#0891b2', // cyan
    '#059669', // emerald
    '#65a30d', // lime
    '#d97706', // amber
    '#ea580c', // orange
    '#dc2626', // red
    '#db2777', // pink
    '#7c3aed', // violet (duplicate removed below — kept for clarity)
    '#0f172a', // slate dark
    '#6b7280', // gray
    '#0284c7', // sky
    '#16a34a', // green
]
// dedupe
const PALETTE = [...new Set(BOARD_COLORS)].slice(0, 12)

/** Returns a hex color with reduced opacity (20%) for inactive state */
function dimColor(hex) {
    return hex + '33' // 0x33 = ~20% opacity
}

export default function Kanban({ isDark, toggleTheme }) {
    const { user, loading } = useAuth()
    const navigate = useNavigate()
    const [boards, setBoards] = useState([])
    const [activeBoardId, setActiveBoardId] = useState(null)
    const [newBoardTitle, setNewBoardTitle] = useState('')
    const [creatingBoard, setCreatingBoard] = useState(false)
    const [editingBoardId, setEditingBoardId] = useState(null)
    const [editingBoardTitle, setEditingBoardTitle] = useState('')
    const [colorPicker, setColorPicker] = useState(null) // { boardId, x, y }
    const editInputRef = useRef(null)
    const colorPickerRef = useRef(null)

    useEffect(() => {
        if (!colorPicker) return
        function handleOutside(e) {
            if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) {
                setColorPicker(null)
            }
        }
        document.addEventListener('mousedown', handleOutside)
        return () => document.removeEventListener('mousedown', handleOutside)
    }, [colorPicker])

    useEffect(() => {
        if (!loading && !user) navigate('/')
    }, [user, loading, navigate])

    useEffect(() => {
        if (user) loadBoards()
    }, [user])

    async function loadBoards() {
        const { data } = await insforge.database
            .from('kanban_boards')
            .select('id, title, color, created_at')
            .order('created_at', { ascending: true })
        const loaded = data || []
        setBoards(loaded)
        if (loaded.length > 0 && !activeBoardId) {
            setActiveBoardId(loaded[0].id)
        }
    }

    async function createBoard(e) {
        e.preventDefault()
        if (!newBoardTitle.trim()) return
        setCreatingBoard(true)
        const { data } = await insforge.database
            .from('kanban_boards')
            .insert([{ title: newBoardTitle.trim(), user_id: user.id, color: '#7c3aed' }])
            .select()
        if (data) {
            setBoards(prev => [...prev, data[0]])
            setActiveBoardId(data[0].id)
            setNewBoardTitle('')
        }
        setCreatingBoard(false)
    }

    async function deleteBoard(boardId) {
        await insforge.database.from('kanban_boards').delete().eq('id', boardId)
        const remaining = boards.filter(b => b.id !== boardId)
        setBoards(remaining)
        setActiveBoardId(remaining[0]?.id ?? null)
    }

    function startEditingBoard(board, e) {
        e.stopPropagation()
        setEditingBoardId(board.id)
        setEditingBoardTitle(board.title)
        setTimeout(() => editInputRef.current?.focus(), 0)
    }

    async function saveBoardTitle() {
        if (!editingBoardTitle.trim() || !editingBoardId) {
            setEditingBoardId(null)
            return
        }
        await insforge.database
            .from('kanban_boards')
            .update({ title: editingBoardTitle.trim() })
            .eq('id', editingBoardId)
        setBoards(prev =>
            prev.map(b => b.id === editingBoardId ? { ...b, title: editingBoardTitle.trim() } : b)
        )
        setEditingBoardId(null)
    }

    function cancelEditingBoard() {
        setEditingBoardId(null)
    }

    async function saveBoardColor(boardId, color) {
        setColorPicker(null)
        await insforge.database.from('kanban_boards').update({ color }).eq('id', boardId)
        setBoards(prev => prev.map(b => b.id === boardId ? { ...b, color } : b))
    }

    function openColorPicker(e, board) {
        e.stopPropagation()
        if (colorPicker?.boardId === board.id) {
            setColorPicker(null)
            return
        }
        const rect = e.currentTarget.getBoundingClientRect()
        setColorPicker({ boardId: board.id, x: rect.left, y: rect.top })
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
            <Header isDark={isDark} toggleTheme={toggleTheme} />

            <main className="flex-1 flex flex-col overflow-hidden pt-4">
                {loading ? (
                    <div className="flex items-center justify-center flex-1">
                        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
                    </div>
                ) : !user ? null : (
                    <>
                        {/* Board selector toolbar */}
                        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center gap-2 overflow-x-auto flex-shrink-0">
                            {boards.map((board, index) => {
                                const isActive = activeBoardId === board.id
                                const color = board.color || '#7c3aed'
                                return (
                                    <Fragment key={board.id}>
                                        <div className="flex items-center gap-0.5 flex-shrink-0 relative">
                                            {editingBoardId === board.id ? (
                                                <>
                                                    <input
                                                        ref={editInputRef}
                                                        value={editingBoardTitle}
                                                        onChange={e => setEditingBoardTitle(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') saveBoardTitle()
                                                            if (e.key === 'Escape') cancelEditingBoard()
                                                        }}
                                                        className="text-sm px-2 py-1 rounded-lg border border-purple-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 w-32 focus:outline-none"
                                                    />
                                                    <button onClick={saveBoardTitle} className="p-1 text-green-500 hover:text-green-600">
                                                        <CheckIcon className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={cancelEditingBoard} className="p-1 text-gray-400 hover:text-gray-600">
                                                        <XMarkIcon className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => setActiveBoardId(board.id)}
                                                        style={isActive
                                                            ? { backgroundColor: color, color: '#fff' }
                                                            : { backgroundColor: dimColor(color), color }
                                                        }
                                                        className="px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
                                                    >
                                                        {board.title}
                                                    </button>
                                                    <button
                                                        onClick={e => startEditingBoard(board, e)}
                                                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                                        title="Renombrar tablero"
                                                    >
                                                        <PencilIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={e => openColorPicker(e, board)}
                                                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                                        title="Cambiar color"
                                                    >
                                                        <SwatchIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>

                                        {/* Separator between boards */}
                                        {index < boards.length - 1 && (
                                            <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1 flex-shrink-0" />
                                        )}
                                    </Fragment>
                                )
                            })}

                            {/* Separator before new board form */}
                            {boards.length > 0 && (
                                <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1 flex-shrink-0" />
                            )}

                            <form onSubmit={createBoard} className="flex items-center gap-1 ml-2">
                                <input
                                    value={newBoardTitle}
                                    onChange={e => setNewBoardTitle(e.target.value)}
                                    placeholder="Nuevo tablero..."
                                    className="text-sm px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 w-36 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                />
                                <button
                                    type="submit"
                                    disabled={creatingBoard || !newBoardTitle.trim()}
                                    className="p-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                </button>
                            </form>
                        </div>

                        {/* Board content */}
                        {activeBoardId ? (
                            <Board
                                boardId={activeBoardId}
                                onDeleteBoard={() => deleteBoard(activeBoardId)}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center flex-1 gap-4 text-gray-400 dark:text-gray-600">
                                <p className="text-lg">Crea tu primer tablero</p>
                            </div>
                        )}
                    </>
                )}
            </main>

            <Footer />

            {/* Color picker — fixed, above the swatch button */}
            {colorPicker && (() => {
                const board = boards.find(b => b.id === colorPicker.boardId)
                const currentColor = board?.color || '#7c3aed'
                return (
                    <div
                        ref={colorPickerRef}
                        style={{
                            position: 'fixed',
                            left: colorPicker.x,
                            top: colorPicker.y,
                            transform: 'translateY(calc(-100% - 8px))',
                            zIndex: 9999,
                        }}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-2.5"
                    >
                        <div className="grid grid-cols-6 gap-1.5">
                            {PALETTE.map(c => (
                                <button
                                    key={c}
                                    onClick={() => saveBoardColor(colorPicker.boardId, c)}
                                    title={c}
                                    style={{ backgroundColor: c }}
                                    className={`w-6 h-6 rounded-full transition-transform hover:scale-110 focus:outline-none ${currentColor === c ? 'ring-2 ring-offset-1 ring-gray-500' : ''
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                )
            })()}
        </div>
    )
}

Kanban.propTypes = {
    isDark: PropTypes.bool.isRequired,
    toggleTheme: PropTypes.func.isRequired,
}

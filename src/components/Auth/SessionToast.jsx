import { useEffect, useState } from 'react'
import { ArrowPathIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'

export default function SessionToast({ status, onSignIn, onDismiss }) {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (status === 'refreshing' || status === 'expired') {
            setVisible(true)
        }
        if (status === 'idle') {
            const t = setTimeout(() => setVisible(false), 2000)
            return () => clearTimeout(t)
        }
    }, [status])

    if (!visible) return null

    return (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium
            bg-white dark:bg-gray-800
            border-gray-200 dark:border-gray-700
            text-gray-700 dark:text-gray-200">
            {status === 'refreshing' && (
                <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin text-blue-500" />
                    <span>Renovando sesión...</span>
                </>
            )}
            {status === 'idle' && (
                <>
                    <span className="text-green-500">✓</span>
                    <span>Sesión activa renovada</span>
                </>
            )}
            {status === 'expired' && (
                <>
                    <ExclamationCircleIcon className="w-5 h-5 text-red-500 shrink-0" />
                    <div className="flex flex-col gap-1">
                        <span className="text-red-500 font-semibold">Sesión expirada</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            Vuelve a iniciar sesión para continuar
                        </span>
                    </div>
                    <button
                        onClick={onSignIn}
                        className="ml-2 px-3 py-1 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700 transition-colors"
                    >
                        Iniciar sesión
                    </button>
                    <button
                        onClick={onDismiss}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs"
                    >
                        ✕
                    </button>
                </>
            )}
        </div>
    )
}

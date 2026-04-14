import { createContext, useContext, useEffect, useState } from 'react'
import { insforge } from '../lib/insforge'
import SessionToast from '../components/Auth/SessionToast'

const AuthContext = createContext(null)

const REFRESH_INTERVAL = 10 * 60 * 1000 // 10 minutos

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [sessionStatus, setSessionStatus] = useState('idle') // 'idle' | 'refreshing' | 'expired'

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const code = params.get('insforge_code')

        if (code) {
            // Clean the code from the URL immediately so it's not reused
            const cleanUrl = window.location.pathname
            window.history.replaceState({}, '', cleanUrl)

            insforge.auth.exchangeCodeForSession(code)
                .then(({ data }) => {
                    setUser(data?.user ?? null)
                })
                .catch(() => {
                    // If exchange fails, fall back to getCurrentUser
                    return insforge.auth.getCurrentUser().then(({ data }) => {
                        setUser(data?.user ?? null)
                    })
                })
                .finally(() => setLoading(false))
        } else {
            insforge.auth.getCurrentUser().then(({ data }) => {
                setUser(data?.user ?? null)
                setLoading(false)
            })
        }
    }, [])

    // Polling de refresco de sesión cada 10 minutos
    useEffect(() => {
        if (!user) return

        const interval = setInterval(async () => {
            setSessionStatus('refreshing')
            try {
                const { data } = await insforge.auth.getCurrentUser()
                if (data?.user) {
                    setUser(data.user)
                    setSessionStatus('idle')
                } else {
                    setUser(null)
                    setSessionStatus('expired')
                }
            } catch {
                setUser(null)
                setSessionStatus('expired')
            }
        }, REFRESH_INTERVAL)

        return () => clearInterval(interval)
    }, [user])

    async function signInWithGoogle() {
        await insforge.auth.signInWithOAuth({
            provider: 'google',
            redirectTo: window.location.origin + '/kanban',
        })
    }

    async function signOut() {
        await insforge.auth.signOut()
        setUser(null)
        setSessionStatus('idle')
    }

    return (
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
            {children}
            <SessionToast
                status={sessionStatus}
                onSignIn={signInWithGoogle}
                onDismiss={() => setSessionStatus('idle')}
            />
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}

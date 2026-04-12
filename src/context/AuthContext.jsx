import { createContext, useContext, useEffect, useState } from 'react'
import { insforge } from '../lib/insforge'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

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

    async function signInWithGoogle() {
        await insforge.auth.signInWithOAuth({
            provider: 'google',
            redirectTo: window.location.origin + '/kanban',
        })
    }

    async function signOut() {
        await insforge.auth.signOut()
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}

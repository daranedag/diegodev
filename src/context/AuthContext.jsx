import { createContext, useContext, useEffect, useState } from 'react'
import { hasPendingInsforgeOAuthCallback, insforge } from '../lib/insforge'

const AuthContext = createContext(null)

function hasInsforgeCsrfToken() {
    return document.cookie
        .split(';')
        .some((cookie) => cookie.trim().startsWith('insforge_csrf_token='))
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false

        async function restoreSession() {
            // Browser-mode InsForge stores the refresh token in an httpOnly
            // cookie and leaves this CSRF cookie as the client-side marker.
            // Without either marker, refresh can only return the expected 401
            // "No refresh token provided" for an anonymous visitor.
            if (!hasPendingInsforgeOAuthCallback && !hasInsforgeCsrfToken()) {
                if (!cancelled) setLoading(false)
                return
            }

            // The SDK automatically exchanges insforge_code (PKCE) and waits
            // for that work here. Do not exchange it a second time.
            const { data } = await insforge.auth.getCurrentUser()
            if (!cancelled) {
                setUser(data?.user ?? null)
                setLoading(false)
            }
        }

        restoreSession()

        return () => {
            cancelled = true
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

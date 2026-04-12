import { createContext, useContext, useEffect, useState } from 'react'
import { insforge } from '../lib/insforge'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        insforge.auth.getCurrentUser().then(({ data }) => {
            setUser(data?.user ?? null)
            setLoading(false)
        })
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

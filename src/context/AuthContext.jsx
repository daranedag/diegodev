import { createContext, useContext, useEffect, useState } from 'react';
import { neon } from '../lib/neon';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        async function restoreSession() {
            try {
                const { data, error } = await neon.auth.getSession();
                if (error) throw error;
                if (data?.user) {
                    const result = await neon.rpc('ensure_app_user');
                    if (result.error) throw result.error;
                    if (!cancelled) setUser(result.data);
                } else if (!cancelled) {
                    setUser(null);
                }
            } catch (error) {
                if (!cancelled) {
                    setUser(null);
                    setAuthError(error.message || 'No se pudo recuperar tu sesión.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        restoreSession();
        const refresh = () => restoreSession();
        window.addEventListener('focus', refresh);
        return () => {
            cancelled = true;
            window.removeEventListener('focus', refresh);
        };
    }, []);

    async function signInWithGoogle() {
        setAuthError(null);
        try {
            const { error } = await neon.auth.signIn.social({
                provider: 'google',
                callbackURL: window.location.origin + '/kanban',
            });
            if (error) throw error;
        } catch (error) {
            setAuthError(error.message || 'No se pudo iniciar sesión con Google.');
        }
    }

    async function signOut() {
        try {
            const { error } = await neon.auth.signOut();
            if (error) throw error;
            setUser(null);
            setAuthError(null);
        } catch (error) {
            setAuthError(error.message || 'No se pudo cerrar la sesión.');
        }
    }

    return (
        <AuthContext.Provider value={{ user, loading, authError, signInWithGoogle, signOut }}>
            {children}
            {authError && (
                <div role="alert" className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border border-red-300 bg-white p-4 text-sm text-red-700 shadow-lg dark:bg-gray-800 dark:text-red-300">
                    {authError}
                    <button type="button" onClick={() => setAuthError(null)} className="ml-3 underline">Cerrar</button>
                </div>
            )}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}

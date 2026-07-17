import { createClient } from '@insforge/sdk'

// The SDK consumes this query parameter as soon as the client is created. Keep
// a record first so the app can wait for the automatic OAuth exchange.
export const hasPendingInsforgeOAuthCallback =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('insforge_code')

export const insforge = createClient({
    baseUrl: import.meta.env.VITE_INSFORGE_URL,
    anonKey: import.meta.env.VITE_INSFORGE_ANON_KEY,
})

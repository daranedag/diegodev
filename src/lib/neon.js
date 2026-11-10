import { createClient } from '@neon/neon-js';

export const neon = createClient({
    auth: {
        url: import.meta.env.VITE_NEON_AUTH_URL,
        allowAnonymous: true,
    },
    dataApi: {
        url: import.meta.env.VITE_NEON_DATA_API_URL,
    },
});

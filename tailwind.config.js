/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                'background-light': '#f8f9fa',
                'background-dark': '#121212',
                'surface-light': '#ffffff',
                'surface-dark': '#1e1e1e',
                'on-surface-light': '#1a1a1a',
                'on-surface-dark': '#e0e0e0',
                'on-surface-variant-light': '#6c757d',
                'on-surface-variant-dark': '#9e9e9e',
                primary: '#6200ea',
                'primary-variant': '#3700b3',
                accent: '#03dac6',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            borderRadius: {
                DEFAULT: '0.5rem',
                lg: '0.75rem',
                full: '9999px',
            },
        },
    },
    plugins: [],
};

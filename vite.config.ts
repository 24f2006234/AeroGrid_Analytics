import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // Standalone `npm run dev`: forward API calls to the local Express backend.
    // (`vercel dev` routes /api itself via vercel.json.)
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})

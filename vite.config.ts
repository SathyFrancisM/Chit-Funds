import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { whatsappApiPlugin } from './server/whatsappPlugin.ts'

const useSsl = process.env.VITE_USE_SSL === 'true'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(useSsl ? [basicSsl()] : []),
    whatsappApiPlugin(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
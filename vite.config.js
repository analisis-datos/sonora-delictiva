import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'plotly': ['plotly.js', 'react-plotly.js'],
          'd3': ['d3'],
          'vendor': ['react', 'react-dom', 'papaparse', 'lucide-react'],
        }
      }
    }
  }
})

